/**
 * SyncService のテスト
 */

import { SyncService } from '../syncService';
import { ISyncService } from '../interfaces/ISyncService';
import { IGitHubService } from '../interfaces/IGitHubService';
import { IStorageService } from '../interfaces/IStorageService';
import { Issue, RepositoryInfo, SyncOptions } from '../../models/issue';

describe('SyncService', () => {
  let syncService: ISyncService;
  let mockGitHubService: jest.Mocked<IGitHubService>;
  let mockStorageService: jest.Mocked<IStorageService>;

  const mockRepoInfo: RepositoryInfo = {
    owner: 'test',
    repo: 'repo',
    remoteUrl: 'git@github.com:test/repo.git',
  };

  const mockOptions: SyncOptions = {
    maxIssues: 100,
    syncPeriod: '6months',
    includeClosedIssues: true,
    syncStrategy: 'full',
    labelFilter: [],
    milestoneFilter: [],
  };

  const mockIssue: Issue = {
    id: 1,
    number: 123,
    title: 'Test Issue',
    body: 'Test body',
    state: 'open',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    author: {
      login: 'testuser',
      id: 100,
      avatar_url: 'https://example.com/avatar.png',
      url: 'https://api.github.com/users/testuser',
    },
    assignees: [],
    labels: [],
    url: 'https://api.github.com/repos/test/repo/issues/123',
    html_url: 'https://github.com/test/repo/issues/123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // GitHubServiceのモック
    mockGitHubService = {
      fetchIssues: jest.fn(),
      fetchIssueDetails: jest.fn(),
      getRateLimit: jest.fn(),
    } as jest.Mocked<IGitHubService>;

    // StorageServiceのモック
    mockStorageService = {
      saveIssue: jest.fn(),
      saveIssues: jest.fn(),
      loadIssue: jest.fn(),
      loadAllIssues: jest.fn(),
      deleteIssue: jest.fn(),
      saveSyncState: jest.fn(),
      loadSyncState: jest.fn(),
      toMarkdown: jest.fn(),
      fromMarkdown: jest.fn(),
      hasChanged: jest.fn(),
    } as jest.Mocked<IStorageService>;

    syncService = new SyncService(mockGitHubService, mockStorageService, '/test/storage');
  });

  describe('sync', () => {
    it('Issueを同期できる（基本ケース）', async () => {
      mockGitHubService.fetchIssues.mockResolvedValue({
        issues: [mockIssue],
        etag: 'test-etag',
        rateLimit: {
          limit: 5000,
          remaining: 4999,
          reset: new Date(),
        },
        hasMore: false,
      });

      mockStorageService.hasChanged.mockResolvedValue(true);

      const result = await syncService.sync(mockRepoInfo, mockOptions);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect(result.skippedCount).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(mockStorageService.saveIssues).toHaveBeenCalledWith([mockIssue], '/test/storage');
      expect(mockStorageService.saveSyncState).toHaveBeenCalled();
    });

    it('変更がないIssueをスキップする', async () => {
      mockGitHubService.fetchIssues.mockResolvedValue({
        issues: [mockIssue],
        etag: 'test-etag',
        rateLimit: {
          limit: 5000,
          remaining: 4999,
          reset: new Date(),
        },
        hasMore: false,
      });

      mockStorageService.hasChanged.mockResolvedValue(false);

      const result = await syncService.sync(mockRepoInfo, mockOptions);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(mockStorageService.saveIssues).not.toHaveBeenCalled();
    });

    it('進捗コールバックを呼び出す', async () => {
      const issues = [
        { ...mockIssue, number: 1 },
        { ...mockIssue, number: 2 },
        { ...mockIssue, number: 3 },
      ];

      mockGitHubService.fetchIssues.mockResolvedValue({
        issues,
        etag: 'test-etag',
        rateLimit: {
          limit: 5000,
          remaining: 4999,
          reset: new Date(),
        },
        hasMore: false,
      });

      mockStorageService.hasChanged.mockResolvedValue(true);

      const progressCallback = jest.fn();
      await syncService.sync(mockRepoInfo, mockOptions, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 3,
          current: expect.any(Number),
          message: expect.any(String),
        })
      );
    });

    it('エラーが発生しても続行する', async () => {
      const issues = [
        { ...mockIssue, number: 1 },
        { ...mockIssue, number: 2 },
        { ...mockIssue, number: 3 },
      ];

      mockGitHubService.fetchIssues.mockResolvedValue({
        issues,
        etag: 'test-etag',
        rateLimit: {
          limit: 5000,
          remaining: 4999,
          reset: new Date(),
        },
        hasMore: false,
      });

      mockStorageService.hasChanged
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Storage error'))
        .mockResolvedValueOnce(true);

      const result = await syncService.sync(mockRepoInfo, mockOptions);

      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('キャンセルできる', async () => {
      const issues = Array.from({ length: 100 }, (_, i) => ({
        ...mockIssue,
        number: i + 1,
      }));

      mockGitHubService.fetchIssues.mockResolvedValue({
        issues,
        etag: 'test-etag',
        rateLimit: {
          limit: 5000,
          remaining: 4999,
          reset: new Date(),
        },
        hasMore: false,
      });

      mockStorageService.hasChanged.mockResolvedValue(true);

      // 同期開始後すぐにキャンセル
      const syncPromise = syncService.sync(mockRepoInfo, mockOptions);
      syncService.cancel();

      const result = await syncPromise;

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBeLessThan(100);
    });
  });

  describe('incrementalSync', () => {
    it('前回同期以降のIssueのみ同期する', async () => {
      mockStorageService.loadSyncState.mockResolvedValue({
        lastSyncTime: '2023-01-01T00:00:00Z',
        lastETag: 'old-etag',
        syncedIssueIds: [123],
      });

      mockGitHubService.fetchIssues.mockResolvedValue({
        issues: [{ ...mockIssue, number: 456 }],
        etag: 'new-etag',
        rateLimit: {
          limit: 5000,
          remaining: 4999,
          reset: new Date(),
        },
        hasMore: false,
      });

      mockStorageService.hasChanged.mockResolvedValue(true);

      const result = await syncService.incrementalSync(mockRepoInfo, mockOptions);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect(mockGitHubService.fetchIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          since: '2023-01-01T00:00:00Z',
          etag: 'old-etag',
        })
      );
    });

    it('同期状態がない場合はフル同期する', async () => {
      mockStorageService.loadSyncState.mockResolvedValue(null);

      mockGitHubService.fetchIssues.mockResolvedValue({
        issues: [mockIssue],
        etag: 'test-etag',
        rateLimit: {
          limit: 5000,
          remaining: 4999,
          reset: new Date(),
        },
        hasMore: false,
      });

      mockStorageService.hasChanged.mockResolvedValue(true);

      const result = await syncService.incrementalSync(mockRepoInfo, mockOptions);

      expect(result.success).toBe(true);
      expect(mockGitHubService.fetchIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          since: undefined,
        })
      );
    });
  });

  describe('syncIssueDetails', () => {
    it('特定のIssueの詳細を同期できる', async () => {
      mockGitHubService.fetchIssueDetails.mockResolvedValue(mockIssue);

      const result = await syncService.syncIssueDetails(mockRepoInfo, 123);

      expect(result).toEqual(mockIssue);
      expect(mockStorageService.saveIssue).toHaveBeenCalledWith(mockIssue, '/test/storage');
    });
  });

  describe('isSyncing', () => {
    it('同期中の状態を返す', () => {
      expect(syncService.isSyncing()).toBe(false);
    });

    it('同期中はtrueを返す', async () => {
      const issues = Array.from({ length: 10 }, (_, i) => ({
        ...mockIssue,
        number: i + 1,
      }));

      mockGitHubService.fetchIssues.mockResolvedValue({
        issues,
        etag: 'test-etag',
        rateLimit: {
          limit: 5000,
          remaining: 4999,
          reset: new Date(),
        },
        hasMore: false,
      });

      mockStorageService.hasChanged.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(true), 10);
          })
      );

      const syncPromise = syncService.sync(mockRepoInfo, mockOptions);

      // 同期開始直後
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(syncService.isSyncing()).toBe(true);

      await syncPromise;

      // 同期完了後
      expect(syncService.isSyncing()).toBe(false);
    });
  });
});
