/**
 * IssuesTreeProvider のテスト
 */

import { IssuesTreeProvider, IssueTreeItem } from '../issuesTreeProvider';
import { IStorageService } from '../../services/interfaces/IStorageService';
import { Issue } from '../../models/issue';
import * as vscode from 'vscode';

describe('IssuesTreeProvider', () => {
  let treeProvider: IssuesTreeProvider;
  let mockStorageService: jest.Mocked<IStorageService>;
  const mockStoragePath = '/test/storage';

  const mockIssue1: Issue = {
    id: 1,
    number: 123,
    title: 'Test Issue 1',
    body: 'Test body 1',
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
    labels: [{ id: 1, name: 'bug', color: 'red' }],
    url: 'https://api.github.com/repos/test/repo/issues/123',
    html_url: 'https://github.com/test/repo/issues/123',
  };

  const mockIssue2: Issue = {
    id: 2,
    number: 456,
    title: 'Test Issue 2',
    body: 'Test body 2',
    state: 'closed',
    created_at: '2023-02-01T00:00:00Z',
    updated_at: '2023-02-02T00:00:00Z',
    closed_at: '2023-02-03T00:00:00Z',
    author: {
      login: 'testuser2',
      id: 200,
      avatar_url: 'https://example.com/avatar2.png',
      url: 'https://api.github.com/users/testuser2',
    },
    assignees: [],
    labels: [],
    url: 'https://api.github.com/repos/test/repo/issues/456',
    html_url: 'https://github.com/test/repo/issues/456',
  };

  beforeEach(() => {
    jest.clearAllMocks();

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

    treeProvider = new IssuesTreeProvider(mockStorageService, mockStoragePath);
  });

  describe('loadIssues', () => {
    it('Issueを読み込める', async () => {
      mockStorageService.loadAllIssues.mockResolvedValue([mockIssue1, mockIssue2]);

      await treeProvider.loadIssues();

      expect(mockStorageService.loadAllIssues).toHaveBeenCalledWith(mockStoragePath);
    });
  });

  describe('getChildren', () => {
    it('全Issueを取得できる', async () => {
      mockStorageService.loadAllIssues.mockResolvedValue([mockIssue1, mockIssue2]);

      const children = await treeProvider.getChildren();

      expect(children).toHaveLength(2);
      expect(children[0].issue.number).toBe(456); // 降順ソート
      expect(children[1].issue.number).toBe(123);
    });

    it('Issueがない場合空配列を返す', async () => {
      mockStorageService.loadAllIssues.mockResolvedValue([]);

      const children = await treeProvider.getChildren();

      expect(children).toHaveLength(0);
    });

    it('子要素がない場合空配列を返す', async () => {
      mockStorageService.loadAllIssues.mockResolvedValue([mockIssue1]);

      const parent = new IssueTreeItem(
        mockIssue1,
        vscode.TreeItemCollapsibleState.None,
        mockStoragePath
      );
      const children = await treeProvider.getChildren(parent);

      expect(children).toHaveLength(0);
    });
  });

  describe('getOpenIssues', () => {
    it('Open Issueのみ取得できる', async () => {
      mockStorageService.loadAllIssues.mockResolvedValue([mockIssue1, mockIssue2]);

      const openIssues = await treeProvider.getOpenIssues();

      expect(openIssues).toHaveLength(1);
      expect(openIssues[0].issue.state).toBe('open');
    });
  });

  describe('getClosedIssues', () => {
    it('Closed Issueのみ取得できる', async () => {
      mockStorageService.loadAllIssues.mockResolvedValue([mockIssue1, mockIssue2]);

      const closedIssues = await treeProvider.getClosedIssues();

      expect(closedIssues).toHaveLength(1);
      expect(closedIssues[0].issue.state).toBe('closed');
    });
  });

  describe('searchIssues', () => {
    it('タイトルで検索できる', async () => {
      mockStorageService.loadAllIssues.mockResolvedValue([mockIssue1, mockIssue2]);

      const results = await treeProvider.searchIssues('Issue 1');

      expect(results).toHaveLength(1);
      expect(results[0].issue.title).toBe('Test Issue 1');
    });

    it('本文で検索できる', async () => {
      mockStorageService.loadAllIssues.mockResolvedValue([mockIssue1, mockIssue2]);

      const results = await treeProvider.searchIssues('body 2');

      expect(results).toHaveLength(1);
      expect(results[0].issue.body).toBe('Test body 2');
    });

    it('大文字小文字を区別しない', async () => {
      mockStorageService.loadAllIssues.mockResolvedValue([mockIssue1, mockIssue2]);

      const results = await treeProvider.searchIssues('TEST ISSUE');

      expect(results).toHaveLength(2);
    });
  });

  describe('getStatistics', () => {
    it('統計情報を取得できる', async () => {
      mockStorageService.loadAllIssues.mockResolvedValue([mockIssue1, mockIssue2]);

      await treeProvider.loadIssues();
      const stats = treeProvider.getStatistics();

      expect(stats.total).toBe(2);
      expect(stats.open).toBe(1);
      expect(stats.closed).toBe(1);
    });
  });

  describe('IssueTreeItem', () => {
    it('正しく初期化される', () => {
      const treeItem = new IssueTreeItem(
        mockIssue1,
        vscode.TreeItemCollapsibleState.None,
        mockStoragePath
      );

      expect(treeItem.label).toBe('Test Issue 1');
      expect(treeItem.description).toBe('#123');
      expect(treeItem.contextValue).toBe('issue');
      expect(treeItem.command).toBeDefined();
      expect(treeItem.command?.command).toBe('vscode.open');
    });

    it('Open Issueのアイコンが正しい', () => {
      const treeItem = new IssueTreeItem(
        mockIssue1,
        vscode.TreeItemCollapsibleState.None,
        mockStoragePath
      );

      expect(treeItem.iconPath).toBeInstanceOf(vscode.ThemeIcon);
      expect((treeItem.iconPath as vscode.ThemeIcon).id).toBe('issue-opened');
    });

    it('Closed Issueのアイコンが正しい', () => {
      const treeItem = new IssueTreeItem(
        mockIssue2,
        vscode.TreeItemCollapsibleState.None,
        mockStoragePath
      );

      expect(treeItem.iconPath).toBeInstanceOf(vscode.ThemeIcon);
      expect((treeItem.iconPath as vscode.ThemeIcon).id).toBe('issue-closed');
    });
  });
});
