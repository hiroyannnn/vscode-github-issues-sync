/**
 * 同期サービスのインターフェース
 */

import { Issue, RepositoryInfo, SyncOptions } from '../../models/issue';

export interface SyncProgress {
  total: number;
  current: number;
  message: string;
}

export type ProgressCallback = (progress: SyncProgress) => void;

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Error[];
  duration: number; // milliseconds
}

export interface ISyncService {
  /**
   * Issueを同期
   * @param repoInfo リポジトリ情報
   * @param options 同期オプション
   * @param onProgress 進捗コールバック
   */
  sync(
    repoInfo: RepositoryInfo,
    options: SyncOptions,
    onProgress?: ProgressCallback
  ): Promise<SyncResult>;

  /**
   * 差分同期（前回同期以降の変更のみ）
   * @param repoInfo リポジトリ情報
   * @param options 同期オプション
   * @param onProgress 進捗コールバック
   */
  incrementalSync(
    repoInfo: RepositoryInfo,
    options: SyncOptions,
    onProgress?: ProgressCallback
  ): Promise<SyncResult>;

  /**
   * 特定のIssueの詳細を同期（lazy戦略用）
   * @param repoInfo リポジトリ情報
   * @param issueNumber Issue番号
   */
  syncIssueDetails(repoInfo: RepositoryInfo, issueNumber: number): Promise<Issue>;

  /**
   * 同期をキャンセル
   */
  cancel(): void;

  /**
   * 同期中かどうか
   */
  isSyncing(): boolean;
}
