/**
 * GitHub API サービスのインターフェース
 */

import { Issue, SyncOptions } from '../../models/issue';

export interface FetchOptions {
  owner: string;
  repo: string;
  syncOptions: SyncOptions;
  since?: string; // ISO 8601 timestamp for incremental sync
  etag?: string; // ETag for HTTP caching
}

export interface FetchResult {
  issues: Issue[];
  etag?: string;
  rateLimit: RateLimitInfo;
  hasMore: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

export interface IGitHubService {
  /**
   * Issueを取得
   * @param options 取得オプション
   * @returns 取得結果
   */
  fetchIssues(options: FetchOptions): Promise<FetchResult>;

  /**
   * 特定のIssueの詳細（コメント含む）を取得
   * @param owner リポジトリオーナー
   * @param repo リポジトリ名
   * @param issueNumber Issue番号
   */
  fetchIssueDetails(owner: string, repo: string, issueNumber: number): Promise<Issue>;

  /**
   * Rate Limit情報を取得
   */
  getRateLimit(): Promise<RateLimitInfo>;
}
