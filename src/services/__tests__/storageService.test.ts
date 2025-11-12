/**
 * StorageService のテスト
 */

import { StorageService } from '../storageService';
import { IStorageService } from '../interfaces/IStorageService';
import { Issue } from '../../models/issue';
import * as fs from 'fs/promises';
import * as path from 'path';

// fsモジュールをモック
jest.mock('fs/promises');

describe('StorageService', () => {
  let storageService: IStorageService;
  const mockStorageDir = '/test/storage';

  beforeEach(() => {
    jest.clearAllMocks();
    storageService = new StorageService();
  });

  const mockIssue: Issue = {
    id: 1,
    number: 123,
    title: 'Test Issue',
    body: 'This is a test issue body.',
    state: 'open',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    author: {
      login: 'testuser',
      id: 100,
      avatar_url: 'https://example.com/avatar.png',
      url: 'https://api.github.com/users/testuser',
    },
    assignees: [
      {
        login: 'assignee1',
        id: 200,
        avatar_url: 'https://example.com/assignee1.png',
        url: 'https://api.github.com/users/assignee1',
      },
    ],
    labels: [
      {
        id: 1,
        name: 'bug',
        color: 'red',
        description: 'Bug label',
      },
    ],
    milestone: {
      id: 1,
      number: 1,
      title: 'v1.0',
      state: 'open',
      url: 'https://api.github.com/repos/test/repo/milestones/1',
    },
    comments: [
      {
        id: 1,
        user: {
          login: 'commenter',
          id: 300,
          avatar_url: 'https://example.com/commenter.png',
          url: 'https://api.github.com/users/commenter',
        },
        body: 'Test comment',
        created_at: '2023-01-03T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z',
        url: 'https://api.github.com/repos/test/repo/issues/comments/1',
      },
    ],
    url: 'https://api.github.com/repos/test/repo/issues/123',
    html_url: 'https://github.com/test/repo/issues/123',
  };

  describe('toMarkdown', () => {
    it('IssueをMarkdown形式に変換できる', () => {
      const markdown = storageService.toMarkdown(mockIssue);

      expect(markdown).toContain('---');
      expect(markdown).toContain('number: 123');
      expect(markdown).toContain('title: Test Issue');
      expect(markdown).toContain('state: open');
      expect(markdown).toContain('# Test Issue');
      expect(markdown).toContain('This is a test issue body.');
    });

    it('コメントがMarkdownに含まれる', () => {
      const markdown = storageService.toMarkdown(mockIssue);

      expect(markdown).toContain('## Comments');
      expect(markdown).toContain('### @commenter');
      expect(markdown).toContain('Test comment');
    });

    it('ラベルとマイルストーンがfront matterに含まれる', () => {
      const markdown = storageService.toMarkdown(mockIssue);

      expect(markdown).toContain('labels:');
      expect(markdown).toContain('- bug');
      expect(markdown).toContain('milestone: v1.0');
    });
  });

  describe('fromMarkdown', () => {
    it('MarkdownからIssueに変換できる', () => {
      const markdown = storageService.toMarkdown(mockIssue);
      const issue = storageService.fromMarkdown(markdown);

      expect(issue.number).toBe(123);
      expect(issue.title).toBe('Test Issue');
      expect(issue.state).toBe('open');
      expect(issue.author.login).toBe('testuser');
      expect(issue.labels).toHaveLength(1);
      expect(issue.labels[0].name).toBe('bug');
    });

    it('往復変換が正しく動作する', () => {
      const markdown = storageService.toMarkdown(mockIssue);
      const issue = storageService.fromMarkdown(markdown);
      const markdown2 = storageService.toMarkdown(issue);

      expect(markdown).toBe(markdown2);
    });
  });

  describe('saveIssue', () => {
    it('Issueをファイルに保存できる', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await storageService.saveIssue(mockIssue, mockStorageDir);

      expect(fs.mkdir).toHaveBeenCalledWith(mockStorageDir, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(mockStorageDir, 'issue-123.md'),
        expect.any(String),
        'utf-8'
      );
    });
  });

  describe('saveIssues', () => {
    it('複数のIssueをバッチ保存できる', async () => {
      const issues = [
        { ...mockIssue, number: 1 },
        { ...mockIssue, number: 2 },
        { ...mockIssue, number: 3 },
      ];

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await storageService.saveIssues(issues, mockStorageDir);

      expect(fs.writeFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('loadIssue', () => {
    it('保存されているIssueを読み込める', async () => {
      const markdown = storageService.toMarkdown(mockIssue);
      (fs.readFile as jest.Mock).mockResolvedValue(markdown);

      const issue = await storageService.loadIssue(123, mockStorageDir);

      expect(issue).not.toBeNull();
      expect(issue?.number).toBe(123);
      expect(issue?.title).toBe('Test Issue');
    });

    it('存在しないIssueの場合nullを返す', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const issue = await storageService.loadIssue(999, mockStorageDir);

      expect(issue).toBeNull();
    });
  });

  describe('loadAllIssues', () => {
    it('保存されている全Issueを読み込める', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['issue-1.md', 'issue-2.md', 'sync-state.json']);

      const markdown1 = storageService.toMarkdown({ ...mockIssue, number: 1 });
      const markdown2 = storageService.toMarkdown({ ...mockIssue, number: 2 });

      (fs.readFile as jest.Mock).mockResolvedValueOnce(markdown1).mockResolvedValueOnce(markdown2);

      const issues = await storageService.loadAllIssues(mockStorageDir);

      expect(issues).toHaveLength(2);
      expect(issues[0].number).toBe(1);
      expect(issues[1].number).toBe(2);
    });

    it('ディレクトリが存在しない場合空配列を返す', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const issues = await storageService.loadAllIssues(mockStorageDir);

      expect(issues).toEqual([]);
    });
  });

  describe('deleteIssue', () => {
    it('Issueファイルを削除できる', async () => {
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await storageService.deleteIssue(123, mockStorageDir);

      expect(fs.unlink).toHaveBeenCalledWith(path.join(mockStorageDir, 'issue-123.md'));
    });
  });

  describe('saveSyncState', () => {
    it('同期状態を保存できる', async () => {
      const syncState = {
        lastSyncTime: '2023-01-01T00:00:00Z',
        lastETag: 'test-etag',
        syncedIssueIds: [1, 2, 3],
      };

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await storageService.saveSyncState(syncState, mockStorageDir);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(mockStorageDir, 'sync-state.json'),
        JSON.stringify(syncState, null, 2),
        'utf-8'
      );
    });
  });

  describe('loadSyncState', () => {
    it('同期状態を読み込める', async () => {
      const syncState = {
        lastSyncTime: '2023-01-01T00:00:00Z',
        lastETag: 'test-etag',
        syncedIssueIds: [1, 2, 3],
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(syncState));

      const loaded = await storageService.loadSyncState(mockStorageDir);

      expect(loaded).toEqual(syncState);
    });

    it('同期状態が存在しない場合nullを返す', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const loaded = await storageService.loadSyncState(mockStorageDir);

      expect(loaded).toBeNull();
    });
  });

  describe('hasChanged', () => {
    it('Issueが変更されている場合trueを返す', async () => {
      const oldMarkdown = storageService.toMarkdown(mockIssue);
      const newIssue = { ...mockIssue, title: 'Updated Title' };

      (fs.readFile as jest.Mock).mockResolvedValue(oldMarkdown);

      const changed = await storageService.hasChanged(newIssue, mockStorageDir);

      expect(changed).toBe(true);
    });

    it('Issueが変更されていない場合falseを返す', async () => {
      const markdown = storageService.toMarkdown(mockIssue);

      (fs.readFile as jest.Mock).mockResolvedValue(markdown);

      const changed = await storageService.hasChanged(mockIssue, mockStorageDir);

      expect(changed).toBe(false);
    });

    it('Issueが存在しない場合trueを返す', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const changed = await storageService.hasChanged(mockIssue, mockStorageDir);

      expect(changed).toBe(true);
    });
  });
});
