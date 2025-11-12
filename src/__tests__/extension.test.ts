/**
 * Extension のテスト
 */

import * as vscode from 'vscode';
import { activate } from '../extension';
import { AuthService } from '../services/authService';
import { GitHubService } from '../services/githubService';
import { StorageService } from '../services/storageService';
import { IssuesTreeProvider } from '../views/issuesTreeProvider';

// サービスをモック化
jest.mock('../services/authService');
jest.mock('../services/githubService');
jest.mock('../services/storageService');
jest.mock('../services/syncService');
jest.mock('../views/issuesTreeProvider');
jest.mock('../utils/gitUtils');

describe('Extension', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    // モックコンテキスト
    mockContext = {
      subscriptions: [],
      secrets: {
        get: jest.fn(),
        store: jest.fn(),
        delete: jest.fn(),
        onDidChange: jest.fn(),
      },
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn(),
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn(),
        setKeysForSync: jest.fn(),
      },
      extensionPath: '/test/path',
      storagePath: '/test/storage',
      globalStoragePath: '/test/global-storage',
      logPath: '/test/log',
      extensionUri: vscode.Uri.file('/test/path'),
      storageUri: vscode.Uri.file('/test/storage'),
      globalStorageUri: vscode.Uri.file('/test/global-storage'),
      logUri: vscode.Uri.file('/test/log'),
      extensionMode: 3, // vscode.ExtensionMode.Test
      environmentVariableCollection: {} as unknown as vscode.EnvironmentVariableCollection,
      extension: {} as unknown as vscode.Extension<unknown>,
      asAbsolutePath: jest.fn((path: string) => `/test/path/${path}`),
      languageModelAccessInformation: {} as unknown as vscode.LanguageModelAccessInformation,
    } as unknown as vscode.ExtensionContext;

    // workspaceFoldersのモック設定
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [
        {
          uri: vscode.Uri.file('/test/repo'),
          name: 'test-repo',
          index: 0,
        },
      ],
      configurable: true,
    });

    // IssuesTreeProviderのモック設定
    const mockTreeProvider = IssuesTreeProvider as jest.MockedClass<typeof IssuesTreeProvider>;
    mockTreeProvider.prototype.loadIssues = jest.fn().mockResolvedValue(undefined);

    // workspace.getConfigurationのモック設定
    const mockConfig = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'enableAutoSync') return false;
        if (key === 'syncInterval') return 15;
        if (key === 'maxIssues') return 100;
        if (key === 'includeClosedIssues') return false;
        return defaultValue;
      }),
    };
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
  });

  describe('activate', () => {
    it('拡張機能が正しく起動する', async () => {
      await activate(mockContext);

      // サービスが初期化されているか確認
      expect(AuthService).toHaveBeenCalledWith(mockContext);
      expect(StorageService).toHaveBeenCalled();
      expect(GitHubService).toHaveBeenCalled();
      expect(IssuesTreeProvider).toHaveBeenCalled();
    });

    it('コマンドとTree Viewが登録される', async () => {
      await activate(mockContext);

      // commands.registerCommandが3回呼ばれる（syncNow, configure）
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'githubIssuesSync.syncNow',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'githubIssuesSync.configure',
        expect.any(Function)
      );

      // Tree Viewが登録される
      expect(vscode.window.registerTreeDataProvider).toHaveBeenCalledWith(
        'githubIssuesView',
        expect.any(Object)
      );
    });

    it('サブスクリプションに登録される', async () => {
      await activate(mockContext);

      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });
  });

  describe('syncNow command', () => {
    it('ワークスペースフォルダーがない場合エラーを表示', async () => {
      // workspaceFoldersをundefinedに設定
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: undefined,
        configurable: true,
      });

      await activate(mockContext);

      // syncNowコマンドのハンドラーを取得
      const registerCommandCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const syncNowCall = registerCommandCalls.find(
        (call) => call[0] === 'githubIssuesSync.syncNow'
      );
      expect(syncNowCall).toBeDefined();
      const syncNowHandler = syncNowCall[1];

      // syncNowハンドラーを実行
      await syncNowHandler();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('workspace folder')
      );
    });
  });

  describe('configure command', () => {
    it('設定画面が開く', async () => {
      await activate(mockContext);

      // configureコマンドのハンドラーを取得
      const registerCommandCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const configureCall = registerCommandCalls.find(
        (call) => call[0] === 'githubIssuesSync.configure'
      );
      expect(configureCall).toBeDefined();
      const configureHandler = configureCall[1];

      // configureハンドラーを実行
      await configureHandler();

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.openSettings',
        'githubIssuesSync'
      );
    });
  });

  describe('auto sync', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('自動同期が有効な場合、タイマーが開始される', async () => {
      // enableAutoSyncをtrueに設定
      const mockConfig = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'enableAutoSync') return true;
          if (key === 'syncInterval') return 15;
          return defaultValue;
        }),
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      await activate(mockContext);

      // setIntervalが呼ばれたことを確認
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('自動同期が無効な場合、タイマーが開始されない', async () => {
      // enableAutoSyncをfalseに設定
      const mockConfig = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'enableAutoSync') return false;
          return defaultValue;
        }),
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      await activate(mockContext);

      // setIntervalが呼ばれていないことを確認
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
