/**
 * 同期サービス
 */

import { ISyncService, SyncResult, ProgressCallback } from './interfaces/ISyncService';
import { IGitHubService } from './interfaces/IGitHubService';
import { IStorageService } from './interfaces/IStorageService';
import { Issue, RepositoryInfo, SyncOptions, SyncState } from '../models/issue';

/**
 * GitHub IssueをGitHubからローカルストレージに同期するサービス
 * フル同期とインクリメンタル同期をサポートし、
 * 同期進捗の報告、キャンセル機能、エラーハンドリングを提供する
 */
export class SyncService implements ISyncService {
  private syncing = false;
  private cancelled = false;

  /**
   * SyncServiceのコンストラクタ
   *
   * @param githubService GitHub APIアクセス用サービス
   * @param storageService ローカルストレージサービス
   * @param storageDir Issueを保存するディレクトリパス
   */
  constructor(
    private readonly githubService: IGitHubService,
    private readonly storageService: IStorageService,
    private readonly storageDir: string
  ) {}



  /**
   * Issueを同期
   */
  /**
   * Issueを同期
   */
  async sync(
    repoInfo: RepositoryInfo,
    options: SyncOptions,
    onProgress?: ProgressCallback
  ): Promise<SyncResult> {
    const startTime = Date.now();
    this.syncing = true;
    this.cancelled = false;

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: [],
      duration: 0,
    };

    try {
      // 進捗通知
      onProgress?.({
        total: 0,
        current: 0,
        message: 'Fetching issues from GitHub...',
      });

      // GitHubからIssueを取得
      const fetchResult = await this.githubService.fetchIssues({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        syncOptions: options,
      });

      const issues = fetchResult.issues;
      const total = issues.length;

      onProgress?.({
        total,
        current: 0,
        message: `Processing ${total} issues...`,
      });

      // 各Issueを処理
      const issuesToSave: Issue[] = [];

      for (let i = 0; i < issues.length; i++) {
        if (this.cancelled) {
          result.success = false;
          break;
        }

        const issue = issues[i];

        try {
          // ローカルのIssueを読み込んで変更チェック
          // APIから取得した一覧データにはコメントが含まれていないため、
          // updated_atの比較で変更検知を行う
          const existingIssue = await this.storageService.loadIssue(issue.number, this.storageDir);

          const isNew = !existingIssue;
          const isUpdated = existingIssue && existingIssue.updated_at !== issue.updated_at;

          if (isNew || isUpdated) {
            // 新規または更新がある場合は詳細（コメント含む）を取得
            const detailedIssue = await this.githubService.fetchIssueDetails(
              repoInfo.owner,
              repoInfo.repo,
              issue.number
            );

            issuesToSave.push(detailedIssue);
            result.syncedCount++;
          } else {
            result.skippedCount++;
          }

          onProgress?.({
            total,
            current: i + 1,
            message: `Processing issue #${issue.number}...`,
          });
        } catch (error) {
          result.errorCount++;
          result.errors.push(error as Error);
        }
      }

      // 変更があったIssueを一括保存
      if (issuesToSave.length > 0 && !this.cancelled) {
        onProgress?.({
          total,
          current: total,
          message: `Saving ${issuesToSave.length} issues...`,
        });

        await this.storageService.saveIssues(issuesToSave, this.storageDir);
      }

      // 同期状態を保存
      if (!this.cancelled) {
        const syncState: SyncState = {
          lastSyncTime: new Date().toISOString(),
          lastETag: fetchResult.etag,
          syncedIssueIds: issues.map((issue) => issue.id),
        };

        await this.storageService.saveSyncState(syncState, this.storageDir);

        onProgress?.({
          total,
          current: total,
          message: 'Sync completed',
        });
      }
    } catch (error) {
      result.success = false;
      result.errorCount++;
      result.errors.push(error as Error);
    } finally {
      this.syncing = false;
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * 差分同期（前回同期以降の変更のみ）
   */
  /**
   * 差分同期（前回同期以降の変更のみ）
   */
  async incrementalSync(
    repoInfo: RepositoryInfo,
    options: SyncOptions,
    onProgress?: ProgressCallback
  ): Promise<SyncResult> {
    const startTime = Date.now();
    this.syncing = true;
    this.cancelled = false;

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: [],
      duration: 0,
    };

    try {
      // 前回の同期状態を読み込み
      const syncState = await this.storageService.loadSyncState(this.storageDir);

      onProgress?.({
        total: 0,
        current: 0,
        message: 'Fetching updated issues from GitHub...',
      });

      // GitHubから差分を取得
      const fetchResult = await this.githubService.fetchIssues({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        syncOptions: options,
        since: syncState?.lastSyncTime,
        etag: syncState?.lastETag,
      });

      const issues = fetchResult.issues;
      const total = issues.length;

      onProgress?.({
        total,
        current: 0,
        message: `Processing ${total} updated issues...`,
      });

      // 各Issueを処理
      const issuesToSave: Issue[] = [];

      for (let i = 0; i < issues.length; i++) {
        if (this.cancelled) {
          result.success = false;
          break;
        }

        const issue = issues[i];

        try {
          // ローカルのIssueを読み込んで変更チェック
          const existingIssue = await this.storageService.loadIssue(issue.number, this.storageDir);

          const isNew = !existingIssue;
          const isUpdated = existingIssue && existingIssue.updated_at !== issue.updated_at;

          if (isNew || isUpdated) {
            // 新規または更新がある場合は詳細（コメント含む）を取得
            const detailedIssue = await this.githubService.fetchIssueDetails(
              repoInfo.owner,
              repoInfo.repo,
              issue.number
            );

            issuesToSave.push(detailedIssue);
            result.syncedCount++;
          } else {
            result.skippedCount++;
          }

          onProgress?.({
            total,
            current: i + 1,
            message: `Processing issue #${issue.number}...`,
          });
        } catch (error) {
          result.errorCount++;
          result.errors.push(error as Error);
        }
      }

      // 変更があったIssueを一括保存
      if (issuesToSave.length > 0 && !this.cancelled) {
        onProgress?.({
          total,
          current: total,
          message: `Saving ${issuesToSave.length} issues...`,
        });

        await this.storageService.saveIssues(issuesToSave, this.storageDir);
      }

      // 同期状態を更新
      if (!this.cancelled) {
        const mergedSyncIds = new Set([
          ...(syncState?.syncedIssueIds ?? []),
          ...issues.map((issue) => issue.id),
        ]);

        const newSyncState: SyncState = {
          lastSyncTime: new Date().toISOString(),
          lastETag: fetchResult.etag,
          syncedIssueIds: Array.from(mergedSyncIds),
        };

        await this.storageService.saveSyncState(newSyncState, this.storageDir);

        onProgress?.({
          total,
          current: total,
          message: 'Incremental sync completed',
        });
      }
    } catch (error) {
      result.success = false;
      result.errorCount++;
      result.errors.push(error as Error);
    } finally {
      this.syncing = false;
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * 特定のIssueの詳細を同期（lazy戦略用）
   */
  async syncIssueDetails(repoInfo: RepositoryInfo, issueNumber: number): Promise<Issue> {
    const issue = await this.githubService.fetchIssueDetails(
      repoInfo.owner,
      repoInfo.repo,
      issueNumber
    );

    await this.storageService.saveIssue(issue, this.storageDir);

    return issue;
  }

  /**
   * 同期戦略に応じて同期を実行
   */
  async syncWithStrategy(
    repoInfo: RepositoryInfo,
    options: SyncOptions,
    onProgress?: ProgressCallback
  ): Promise<SyncResult> {
    const strategy = options.syncStrategy;

    switch (strategy) {
      case 'full':
        return this.sync(repoInfo, options, onProgress);
      case 'incremental':
        return this.incrementalSync(repoInfo, options, onProgress);
      case 'lazy':
        // lazy戦略は軽量同期（メタデータのみ）
        onProgress?.({
          total: 0,
          current: 0,
          message: 'Lazy sync (metadata only)',
        });
        // メタデータのみの同期を実行
        return this.incrementalSync(
          repoInfo,
          { ...options, syncStrategy: 'incremental' },
          onProgress
        );
      default:
        return this.sync(repoInfo, options, onProgress);
    }
  }

  /**
   * 同期をキャンセル
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * 同期中かどうか
   */
  isSyncing(): boolean {
    return this.syncing;
  }
}
