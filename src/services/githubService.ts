/**
 * GitHub API サービス
 */

import { Octokit } from '@octokit/rest';
import {
  IGitHubService,
  FetchOptions,
  FetchResult,
  RateLimitInfo,
} from './interfaces/IGitHubService';
import { IAuthService } from './interfaces/IAuthService';
import { Issue } from '../models/issue';

export class GitHubService implements IGitHubService {
  private octokit?: Octokit;

  constructor(private readonly authService: IAuthService) {}

  /**
   * Octokitインスタンスを取得（遅延初期化）
   */
  private async getOctokit(): Promise<Octokit> {
    if (!this.octokit) {
      const authToken = await this.authService.getToken();
      this.octokit = new Octokit({
        auth: authToken.token,
      });
    }
    return this.octokit;
  }

  /**
   * Issueを取得
   */
  async fetchIssues(options: FetchOptions): Promise<FetchResult> {
    const octokit = await this.getOctokit();

    // 同期期間に基づいてsinceパラメータを計算
    const since = options.since || this.calculateSince(options.syncOptions.syncPeriod);

    // GitHub APIのパラメータを構築
    type ListForRepoParams = Parameters<typeof octokit.rest.issues.listForRepo>[0];
    const params: ListForRepoParams = {
      owner: options.owner,
      repo: options.repo,
      state: options.syncOptions.includeClosedIssues ? 'all' : 'open',
      sort: 'updated',
      direction: 'desc',
      per_page: Math.min(options.syncOptions.maxIssues, 100), // GitHub APIの最大値は100
    };

    if (since) {
      params.since = since;
    }

    // ETagがある場合は条件付きリクエスト
    if (options.etag) {
      params.headers = {
        'If-None-Match': options.etag,
      };
    }

    const response = await octokit.rest.issues.listForRepo(params);

    // レスポンスヘッダーからRate Limit情報を抽出
    const rateLimit: RateLimitInfo = {
      limit: parseInt(response.headers['x-ratelimit-limit'] || '5000', 10),
      remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0', 10),
      reset: new Date(parseInt(response.headers['x-ratelimit-reset'] || '0', 10) * 1000),
    };

    // GitHubのIssueデータを内部モデルに変換
    type IssueData = (typeof response.data)[number];
    const filteredIssues = response.data.filter((issue: IssueData) => !('pull_request' in issue)); // Pull Requestを除外
    const issues: Issue[] = filteredIssues
      .slice(0, options.syncOptions.maxIssues) // maxIssuesでカット
      .map((issue: IssueData) => this.convertToIssue(issue));

    // linkヘッダーから次ページの存在を判定（rel="next"が存在しているか）
    const linkHeader = response.headers.link || '';
    const hasNextPage = linkHeader.includes('rel="next"');

    return {
      issues,
      etag: response.headers.etag,
      rateLimit,
      hasMore: hasNextPage || filteredIssues.length > options.syncOptions.maxIssues,
    };
  }

  /**
   * 特定のIssueの詳細（コメント含む）を取得
   */
  async fetchIssueDetails(owner: string, repo: string, issueNumber: number): Promise<Issue> {
    const octokit = await this.getOctokit();

    // Issue本体を取得
    const issueResponse = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    // コメントを取得
    const commentsResponse = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
    });

    const issue = this.convertToIssue(issueResponse.data);
    type CommentData = (typeof commentsResponse.data)[number];
    issue.comments = commentsResponse.data.map((comment: CommentData) => ({
      id: comment.id,
      user: {
        login: comment.user?.login || 'unknown',
        id: comment.user?.id || 0,
        avatar_url: comment.user?.avatar_url || '',
        url: comment.user?.url || '',
      },
      body: comment.body || '',
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      url: comment.url,
    }));

    return issue;
  }

  /**
   * Rate Limit情報を取得
   */
  async getRateLimit(): Promise<RateLimitInfo> {
    const octokit = await this.getOctokit();

    const response = await octokit.rest.rateLimit.get();

    return {
      limit: response.data.resources.core.limit,
      remaining: response.data.resources.core.remaining,
      reset: new Date(response.data.resources.core.reset * 1000),
    };
  }

  /**
   * 同期期間からsinceパラメータを計算
   */
  private calculateSince(period: '3months' | '6months' | '1year' | 'all'): string | undefined {
    if (period === 'all') {
      return undefined;
    }

    const now = new Date();
    const monthsMap = {
      '3months': 3,
      '6months': 6,
      '1year': 12,
    };

    const months = monthsMap[period];
    now.setMonth(now.getMonth() - months);

    return now.toISOString();
  }

  /**
   * GitHub APIのIssueレスポンスを内部モデルに変換
   */
  private convertToIssue(
    issue: Awaited<ReturnType<Octokit['rest']['issues']['get']>>['data']
  ): Issue {
    type AssigneeType = NonNullable<typeof issue.assignees>[number];
    type LabelType = NonNullable<typeof issue.labels>[number];

    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body || undefined,
      state: issue.state as 'open' | 'closed',
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      closed_at: issue.closed_at || undefined,
      author: {
        login: issue.user?.login || 'unknown',
        id: issue.user?.id || 0,
        avatar_url: issue.user?.avatar_url || '',
        url: issue.user?.url || '',
      },
      assignees: (issue.assignees || []).map((assignee: AssigneeType) => ({
        login: assignee.login,
        id: assignee.id,
        avatar_url: assignee.avatar_url,
        url: assignee.url,
      })),
      labels: (issue.labels || []).map((label: LabelType) => {
        if (typeof label === 'string') {
          return {
            id: 0,
            name: label,
            color: '',
            description: undefined,
          };
        }
        return {
          id: label.id || 0,
          name: label.name || '',
          color: label.color || '',
          description: label.description || undefined,
        };
      }),
      milestone: issue.milestone
        ? {
            id: issue.milestone.id,
            number: issue.milestone.number,
            title: issue.milestone.title,
            description: issue.milestone.description || undefined,
            state: issue.milestone.state as 'open' | 'closed',
            due_on: issue.milestone.due_on || undefined,
            url: issue.milestone.url,
          }
        : undefined,
      url: issue.url,
      html_url: issue.html_url,
    };
  }
}
