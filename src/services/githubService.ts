/**
 * GitHub API サービス
 */

import { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
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
   *
   * @note トークンローテーション時の対応：
   * トークンが更新される場合は、このサービスインスタンスを再作成するか、
   * clearOctokitメソッドを呼び出してキャッシュをクリアしてください
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
   * キャッシュされたOctokitインスタンスをクリア
   * トークンローテーション時に呼び出してください
   */
  clearOctokit(): void {
    this.octokit = undefined;
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
      per_page: 30, // GitHub APIの標準ページサイズ
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

    // ページネーションループで全データを取得
    type IssueDataItem = Awaited<
      ReturnType<typeof octokit.rest.issues.listForRepo>
    >['data'][number];
    const allIssues: IssueDataItem[] = [];
    let currentPage = 1;
    let hasMore = true;
    let latestEtag = options.etag;
    let latestRateLimit: RateLimitInfo = {
      limit: 5000,
      remaining: 0,
      reset: new Date(),
    };

    while (hasMore && allIssues.length < options.syncOptions.maxIssues) {
      try {
        params.page = currentPage;

        const response = await octokit.rest.issues.listForRepo(params);

        // ETag は最初のページでのみ使用し、以降のページでは削除
        if (params.headers && 'If-None-Match' in params.headers) {
          delete params.headers['If-None-Match'];
        }

        // レスポンスヘッダーからRate Limit情報を抽出（毎回更新）
        latestRateLimit = {
          limit: parseInt(response.headers['x-ratelimit-limit'] || '5000', 10),
          remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0', 10),
          reset: new Date(parseInt(response.headers['x-ratelimit-reset'] || '0', 10) * 1000),
        };

        latestEtag = response.headers.etag || latestEtag;

        // Pull Requestを除外してフィルタリング
        const filteredIssues = response.data.filter((issue) => !('pull_request' in issue));
        allIssues.push(...filteredIssues);

        // 次ページがあるかをLink ヘッダーで判定
        hasMore = Boolean(response.headers.link && response.headers.link.includes('rel="next"'));

        // maxIssuesに達したら停止
        if (allIssues.length >= options.syncOptions.maxIssues) {
          break;
        }

        currentPage++;

        // データがない場合は終了
        if (response.data.length === 0) {
          hasMore = false;
        }
      } catch (error) {
        // 304 Not Modifiedエラーを処理（Octokitが例外をスロー）
        // キャッシュされたデータが有効な場合は、ETagを保持して空の結果を返す
        if (error instanceof RequestError && error.status === 304) {
          // 304 レスポンスのレート制限ヘッダーを抽出
          const headers = error.response?.headers ?? {};
          return {
            issues: [],
            etag: latestEtag,
            rateLimit: {
              limit: parseInt(headers['x-ratelimit-limit'] ?? '5000', 10),
              remaining: parseInt(headers['x-ratelimit-remaining'] ?? '0', 10),
              reset: new Date(parseInt(headers['x-ratelimit-reset'] ?? '0', 10) * 1000),
            },
            hasMore: false,
          };
        }
        throw error;
      }
    }

    // GitHubのIssueデータを内部モデルに変換
    const issues: Issue[] = allIssues
      .slice(0, options.syncOptions.maxIssues)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((issue) => this.convertToIssue(issue as any));

    return {
      issues,
      etag: latestEtag,
      rateLimit: latestRateLimit,
      hasMore,
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

    // すべてのコメントを取得（pagination対応）
    const allComments = await octokit.paginate(octokit.rest.issues.listComments, {
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
    });

    const issue = this.convertToIssue(issueResponse.data);
    issue.comments = allComments.map((comment) => ({
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
   *
   * @note 月末日の問題を回避：new Date() で新しい日時オブジェクトを作成してから
   * 年月を計算することで、setMonth()での月末ロールオーバーを防止
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

    // 月末日のバグを避けるため、手動で年月を計算
    let targetMonth = now.getMonth() - months;
    let targetYear = now.getFullYear();

    // 月が負になった場合は年をデクリメント
    while (targetMonth < 0) {
      targetMonth += 12;
      targetYear--;
    }

    const result = new Date(now);
    result.setFullYear(targetYear);
    result.setMonth(targetMonth);

    return result.toISOString();
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
