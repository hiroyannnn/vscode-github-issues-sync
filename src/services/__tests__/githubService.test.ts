/**
 * GitHubService のテスト
 */

import { GitHubService } from '../githubService';
import { IGitHubService, FetchOptions } from '../interfaces/IGitHubService';
import { IAuthService } from '../interfaces/IAuthService';
import { Octokit } from '@octokit/rest';

// Octokitをモック
jest.mock('@octokit/rest');

describe('GitHubService', () => {
  let githubService: IGitHubService;
  let mockAuthService: jest.Mocked<IAuthService>;
  let mockListForRepo: jest.Mock;
  let mockGet: jest.Mock;
  let mockListComments: jest.Mock;
  let mockGetRateLimit: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // AuthServiceのモック
    mockAuthService = {
      getToken: jest.fn(),
      validateToken: jest.fn(),
      clearToken: jest.fn(),
      storeToken: jest.fn(),
    } as jest.Mocked<IAuthService>;

    // Octokitメソッドのモック
    mockListForRepo = jest.fn();
    mockGet = jest.fn();
    mockListComments = jest.fn();
    mockGetRateLimit = jest.fn();

    // Octokitコンストラクタのモック
    (Octokit as jest.MockedClass<typeof Octokit>).mockImplementation(() => {
      return {
        rest: {
          issues: {
            listForRepo: mockListForRepo,
            get: mockGet,
            listComments: mockListComments,
          },
          rateLimit: {
            get: mockGetRateLimit,
          },
        },
        paginate: jest.fn(async (fn, options) => {
          // paginateの第1引数がメソッドの場合、直接呼び出して結果を返す
          const result = await fn(options);
          return Array.isArray(result) ? result : result.data || [];
        }),
      } as unknown as Octokit;
    });

    githubService = new GitHubService(mockAuthService);
  });

  describe('fetchIssues', () => {
    it('Issueを取得できる（基本ケース）', async () => {
      mockAuthService.getToken.mockResolvedValue({
        token: 'test-token',
        type: 'vscode',
      });

      const mockIssuesResponse = {
        data: [
          {
            id: 1,
            number: 1,
            title: 'Test Issue',
            body: 'Test body',
            state: 'open',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-02T00:00:00Z',
            closed_at: null,
            user: {
              login: 'testuser',
              id: 100,
              avatar_url: 'https://example.com/avatar.png',
              url: 'https://api.github.com/users/testuser',
            },
            assignees: [],
            labels: [],
            milestone: null,
            url: 'https://api.github.com/repos/test/repo/issues/1',
            html_url: 'https://github.com/test/repo/issues/1',
          },
        ],
        headers: {
          etag: 'test-etag-123',
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1640000000',
        },
      };

      mockListForRepo.mockResolvedValue(mockIssuesResponse);

      const options: FetchOptions = {
        owner: 'test',
        repo: 'repo',
        syncOptions: {
          maxIssues: 100,
          syncPeriod: '6months',
          includeClosedIssues: true,
          syncStrategy: 'full',
          labelFilter: [],
          milestoneFilter: [],
        },
      };

      const result = await githubService.fetchIssues(options);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toEqual({
        id: 1,
        number: 1,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        closed_at: undefined,
        author: {
          login: 'testuser',
          id: 100,
          avatar_url: 'https://example.com/avatar.png',
          url: 'https://api.github.com/users/testuser',
        },
        assignees: [],
        labels: [],
        milestone: undefined,
        url: 'https://api.github.com/repos/test/repo/issues/1',
        html_url: 'https://github.com/test/repo/issues/1',
      });
      expect(result.etag).toBe('test-etag-123');
      expect(result.rateLimit.limit).toBe(5000);
      expect(result.rateLimit.remaining).toBe(4999);
    });

    it('maxIssuesを超えない範囲でIssueを取得する', async () => {
      mockAuthService.getToken.mockResolvedValue({
        token: 'test-token',
        type: 'vscode',
      });

      // 最初のページ: 30個のIssue（per_page=30で1ページ目）
      const firstPageIssues = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        number: i + 1,
        title: `Issue ${i + 1}`,
        body: 'Test body',
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        closed_at: null,
        user: {
          login: 'testuser',
          id: 100,
          avatar_url: 'https://example.com/avatar.png',
          url: 'https://api.github.com/users/testuser',
        },
        assignees: [],
        labels: [],
        milestone: null,
        url: `https://api.github.com/repos/test/repo/issues/${i + 1}`,
        html_url: `https://github.com/test/repo/issues/${i + 1}`,
      }));

      // 2ページ目: 20個のIssue（rel="next"リンク付き）
      const secondPageIssues = Array.from({ length: 20 }, (_, i) => ({
        id: i + 31,
        number: i + 31,
        title: `Issue ${i + 31}`,
        body: 'Test body',
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        closed_at: null,
        user: {
          login: 'testuser',
          id: 100,
          avatar_url: 'https://example.com/avatar.png',
          url: 'https://api.github.com/users/testuser',
        },
        assignees: [],
        labels: [],
        milestone: null,
        url: `https://api.github.com/repos/test/repo/issues/${i + 31}`,
        html_url: `https://github.com/test/repo/issues/${i + 31}`,
      }));

      // 1ページ目の応答（rel="next"リンク付き）
      mockListForRepo.mockResolvedValueOnce({
        data: firstPageIssues,
        headers: {
          etag: 'test-etag-123',
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1640000000',
          link: '<https://api.github.com/repos/test/repo/issues?page=2>; rel="next"',
        },
      });

      // 2ページ目の応答（rel="next"リンクなし）
      mockListForRepo.mockResolvedValueOnce({
        data: secondPageIssues,
        headers: {
          etag: 'test-etag-124',
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4998',
          'x-ratelimit-reset': '1640000000',
        },
      });

      const options: FetchOptions = {
        owner: 'test',
        repo: 'repo',
        syncOptions: {
          maxIssues: 30,
          syncPeriod: '6months',
          includeClosedIssues: true,
          syncStrategy: 'full',
          labelFilter: [],
          milestoneFilter: [],
        },
      };

      const result = await githubService.fetchIssues(options);

      expect(result.issues).toHaveLength(30);
      expect(result.hasMore).toBe(true);
      // linkヘッダーのrel="next"から次ページが存在することを確認
      expect(result.etag).toBe('test-etag-123');
    });

    it('Pull Request を除外できる', async () => {
      mockAuthService.getToken.mockResolvedValue({
        token: 'test-token',
        type: 'vscode',
      });

      const mockIssuesWithPR = [
        {
          id: 1,
          number: 1,
          title: 'Regular Issue',
          body: 'Test body',
          state: 'open',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          closed_at: null,
          user: {
            login: 'testuser',
            id: 100,
            avatar_url: 'https://example.com/avatar.png',
            url: 'https://api.github.com/users/testuser',
          },
          assignees: [],
          labels: [],
          milestone: null,
          url: 'https://api.github.com/repos/test/repo/issues/1',
          html_url: 'https://github.com/test/repo/issues/1',
        },
        {
          id: 2,
          number: 2,
          title: 'Pull Request',
          body: 'PR body',
          state: 'open',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          closed_at: null,
          pull_request: {
            url: 'https://api.github.com/repos/test/repo/pulls/2',
            html_url: 'https://github.com/test/repo/pull/2',
            diff_url: 'https://github.com/test/repo/pull/2.diff',
            patch_url: 'https://github.com/test/repo/pull/2.patch',
          },
          user: {
            login: 'testuser',
            id: 100,
            avatar_url: 'https://example.com/avatar.png',
            url: 'https://api.github.com/users/testuser',
          },
          assignees: [],
          labels: [],
          milestone: null,
          url: 'https://api.github.com/repos/test/repo/issues/2',
          html_url: 'https://github.com/test/repo/pull/2',
        },
      ];

      mockListForRepo.mockResolvedValue({
        data: mockIssuesWithPR,
        headers: {
          etag: 'test-etag-123',
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1640000000',
        },
      });

      const options: FetchOptions = {
        owner: 'test',
        repo: 'repo',
        syncOptions: {
          maxIssues: 100,
          syncPeriod: '6months',
          includeClosedIssues: true,
          syncStrategy: 'full',
          labelFilter: [],
          milestoneFilter: [],
        },
      };

      const result = await githubService.fetchIssues(options);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].title).toBe('Regular Issue');
      expect(result.issues[0].number).toBe(1);
    });

    it('since パラメータを使用して増分同期できる', async () => {
      mockAuthService.getToken.mockResolvedValue({
        token: 'test-token',
        type: 'vscode',
      });

      mockListForRepo.mockResolvedValue({
        data: [],
        headers: {
          etag: 'test-etag-456',
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4998',
          'x-ratelimit-reset': '1640000000',
        },
      });

      const options: FetchOptions = {
        owner: 'test',
        repo: 'repo',
        syncOptions: {
          maxIssues: 100,
          syncPeriod: '6months',
          includeClosedIssues: true,
          syncStrategy: 'incremental',
          labelFilter: [],
          milestoneFilter: [],
        },
        since: '2023-01-01T00:00:00Z',
      };

      await githubService.fetchIssues(options);

      expect(mockListForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          since: '2023-01-01T00:00:00Z',
        })
      );
    });

    it('認証トークンの取得に失敗した場合エラーをスローする', async () => {
      mockAuthService.getToken.mockRejectedValue(new Error('Authentication failed'));

      const options: FetchOptions = {
        owner: 'test',
        repo: 'repo',
        syncOptions: {
          maxIssues: 100,
          syncPeriod: '6months',
          includeClosedIssues: true,
          syncStrategy: 'full',
          labelFilter: [],
          milestoneFilter: [],
        },
      };

      await expect(githubService.fetchIssues(options)).rejects.toThrow('Authentication failed');
    });
  });

  describe('fetchIssueDetails', () => {
    it('Issue詳細とコメントを取得できる', async () => {
      mockAuthService.getToken.mockResolvedValue({
        token: 'test-token',
        type: 'vscode',
      });

      const mockIssue = {
        data: {
          id: 1,
          number: 1,
          title: 'Test Issue',
          body: 'Test body',
          state: 'open',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          closed_at: null,
          user: {
            login: 'testuser',
            id: 100,
            avatar_url: 'https://example.com/avatar.png',
            url: 'https://api.github.com/users/testuser',
          },
          assignees: [],
          labels: [],
          milestone: null,
          url: 'https://api.github.com/repos/test/repo/issues/1',
          html_url: 'https://github.com/test/repo/issues/1',
        },
      };

      const mockComments = {
        data: [
          {
            id: 1,
            user: {
              login: 'commenter',
              id: 200,
              avatar_url: 'https://example.com/commenter.png',
              url: 'https://api.github.com/users/commenter',
            },
            body: 'Test comment',
            created_at: '2023-01-03T00:00:00Z',
            updated_at: '2023-01-03T00:00:00Z',
            url: 'https://api.github.com/repos/test/repo/issues/comments/1',
          },
        ],
      };

      mockGet.mockResolvedValue(mockIssue);
      mockListComments.mockResolvedValue(mockComments);

      const result = await githubService.fetchIssueDetails('test', 'repo', 1);

      expect(result.id).toBe(1);
      expect(result.comments).toHaveLength(1);
      expect(result.comments?.[0].body).toBe('Test comment');
    });
  });

  describe('getRateLimit', () => {
    it('Rate Limit情報を取得できる', async () => {
      mockAuthService.getToken.mockResolvedValue({
        token: 'test-token',
        type: 'vscode',
      });

      mockGetRateLimit.mockResolvedValue({
        data: {
          resources: {
            core: {
              limit: 5000,
              remaining: 4500,
              reset: 1640000000,
            },
          },
        },
      });

      const result = await githubService.getRateLimit();

      expect(result.limit).toBe(5000);
      expect(result.remaining).toBe(4500);
      expect(result.reset).toEqual(new Date(1640000000 * 1000));
    });
  });
});
