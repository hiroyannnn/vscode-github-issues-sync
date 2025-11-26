import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { AuthService } from './services/authService';
import { GitHubService } from './services/githubService';
import { StorageService } from './services/storageService';
import { SyncService } from './services/syncService';
import { IssuesTreeProvider } from './views/issuesTreeProvider';
import { GitUtils } from './utils/gitUtils';
import { SyncOptions } from './models/issue';

/** 自動同期タイマーを保持するグローバル変数 */
let autoSyncTimer: NodeJS.Timeout | undefined;

/**
 * VS Code拡張機能の活性化時に呼び出される
 * 認証、ストレージ、GitHub API、同期サービスの初期化を行い、
 * UI（Tree View）コマンド、自動同期タイマーをセットアップする
 *
 * @param context 拡張機能のコンテキスト
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('GitHub Issues Sync extension is now active');

  // サービスの初期化
  const authService = new AuthService(context);
  const storageService = new StorageService();
  const githubService = new GitHubService(authService);
  const gitUtils = new GitUtils();

  // ストレージパスを解決するヘルパー関数
  const resolveStoragePath = (
    workspaceFolder: vscode.WorkspaceFolder,
    config: vscode.WorkspaceConfiguration
  ): string => {
    const raw = config.get<string>('storageDirectory', '.vscode/github-issues').trim();
    const expanded =
      raw.startsWith('~') && (raw.length === 1 || raw[1] === '/' || raw[1] === '\\')
        ? path.join(os.homedir(), raw.slice(1))
        : raw;
    return path.isAbsolute(expanded)
      ? expanded
      : path.join(workspaceFolder.uri.fsPath, expanded);
  };

  // Tree View Providerの初期化
  let treeProvider: IssuesTreeProvider | undefined;
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const workspaceFolder = vscode.workspace.workspaceFolders[0];
    const config = vscode.workspace.getConfiguration('githubIssuesSync');
    const storagePath = resolveStoragePath(workspaceFolder, config);
    treeProvider = new IssuesTreeProvider(storageService, storagePath);

    // Tree Viewの登録
    const treeView = vscode.window.registerTreeDataProvider('githubIssuesView', treeProvider);
    context.subscriptions.push(treeView);

    // 初期ロード
    await treeProvider.loadIssues();
  }

  /**
   * GitHub Issuesの同期を実行する共通ロジック
   * ワークスペースのGitリポジトリ情報を取得し、GitHubから最新のIssueを同期する
   *
   * @param showProgress 進捗表示を表示するか（true: 手動同期時、false: 自動同期時）
   */
  const performSync = async (showProgress = true): Promise<void> => {
    try {
      // ワークスペースフォルダーの確認
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        if (showProgress) {
          vscode.window.showErrorMessage('GitHub Issues Sync: No workspace folder opened');
        }
        return;
      }

      const workspaceFolder = workspaceFolders[0];
      const workspacePath = workspaceFolder.uri.fsPath;
      const config = vscode.workspace.getConfiguration('githubIssuesSync');
      const storagePath = resolveStoragePath(workspaceFolder, config);

      // Git情報を取得
      const repoInfo = await gitUtils.getRepositoryInfo(workspacePath);
      if (!repoInfo) {
        if (showProgress) {
          vscode.window.showErrorMessage(
            'GitHub Issues Sync: Not a valid GitHub repository. Please open a workspace with a GitHub repository.'
          );
        }
        return;
      }

      // 認証
      const token = await authService.getToken();
      console.log(`GitHub Issues Sync: Authenticated with ${token.type}`);

      // 同期オプションの取得
      const syncPeriodStr = config.get<string>('syncPeriod', '6months');
      const syncStrategyStr = config.get<string>('syncStrategy', 'incremental');
      const syncOptions: SyncOptions = {
        maxIssues: config.get<number>('maxIssues', 100),
        syncPeriod: (syncPeriodStr as '6months' | '3months' | '1year' | 'all') || '6months',
        includeClosedIssues: config.get<boolean>('includeClosedIssues', false),
        syncStrategy: (syncStrategyStr as 'incremental' | 'full' | 'lazy') || 'incremental',
        labelFilter: (config.get<string[]>('labelFilter', []) ?? []).filter((label) => !!label?.trim()),
        milestoneFilter: (config.get<string[]>('milestoneFilter', []) ?? []).filter((m) => !!m?.trim()),
      };

      // SyncServiceの初期化
      const syncService = new SyncService(githubService, storageService, storagePath);

      // 進捗表示付きで同期実行
      if (showProgress) {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'GitHub Issues Sync',
            cancellable: true,
          },
          async (progress, token) => {
            // キャンセルハンドラー
            token.onCancellationRequested(() => {
              syncService.cancel();
            });

            // 同期実行
            const result = await syncService.syncWithStrategy(repoInfo, syncOptions, (progressInfo) => {
              progress.report({
                message: progressInfo.message,
                increment: progressInfo.total > 0 ? 100 / progressInfo.total : 0,
              });
            });

            // 結果表示
            if (result.success) {
              const message = `GitHub Issues Sync completed: synced: ${result.syncedCount}, skipped: ${result.skippedCount}, errors: ${result.errorCount} (${result.duration}ms)`;
              vscode.window.showInformationMessage(message);

              // Tree Viewをリフレッシュ
              if (treeProvider) {
                await treeProvider.loadIssues();
              }
            } else {
              const errorMessages = result.errors.map((e) => e.message).join(', ');
              vscode.window.showErrorMessage(`GitHub Issues Sync failed: ${errorMessages}`);
            }
          }
        );
      } else {
        // 自動同期時は進捗表示なし
        const result = await syncService.syncWithStrategy(repoInfo, syncOptions);

        console.log(
          `GitHub Issues Sync (auto): synced: ${result.syncedCount}, skipped: ${result.skippedCount}, errors: ${result.errorCount}`
        );

        // Tree Viewをリフレッシュ
        if (result.success && treeProvider) {
          await treeProvider.loadIssues();
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (showProgress) {
        vscode.window.showErrorMessage(`GitHub Issues Sync error: ${errorMessage}`);
      } else {
        console.error(`GitHub Issues Sync (auto) error: ${errorMessage}`);
      }
    }
  };

  // syncNowコマンド
  const syncCommand = vscode.commands.registerCommand('githubIssuesSync.syncNow', async () => {
    await performSync(true);
  });

  // configureコマンド
  const configCommand = vscode.commands.registerCommand('githubIssuesSync.configure', async () => {
    // 設定画面を開く
    await vscode.commands.executeCommand('workbench.action.openSettings', 'githubIssuesSync');
  });

  /**
   * 自動同期タイマーを開始する
   * 設定値に基づいて指定した間隔でperformSyncを実行するタイマーを設定する
   * 既存のタイマーがあればクリアしてから新しいタイマーを開始する
   */
  const startAutoSync = () => {
    stopAutoSync(); // 既存のタイマーをクリア

    const config = vscode.workspace.getConfiguration('githubIssuesSync');
    const enableAutoSync = config.get<boolean>('enableAutoSync', false);
    const syncInterval = config.get<number>('syncInterval', 15); // デフォルト15分

    if (enableAutoSync) {
      const intervalMs = syncInterval * 60 * 1000; // 分をミリ秒に変換
      console.log(`GitHub Issues Sync: Auto sync enabled (interval: ${syncInterval} minutes)`);

      autoSyncTimer = setInterval(async () => {
        console.log('GitHub Issues Sync: Running auto sync');
        await performSync(false); // 自動同期時は進捗表示なし
      }, intervalMs);
    } else {
      console.log('GitHub Issues Sync: Auto sync disabled');
    }
  };

  /**
   * 自動同期タイマーを停止する
   * アクティブなタイマーがあれば解放して停止する
   */
  const stopAutoSync = () => {
    if (autoSyncTimer) {
      clearInterval(autoSyncTimer);
      autoSyncTimer = undefined;
      console.log('GitHub Issues Sync: Auto sync timer stopped');
    }
  };

  // 設定変更時の処理
  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
    if (
      e.affectsConfiguration('githubIssuesSync.enableAutoSync') ||
      e.affectsConfiguration('githubIssuesSync.syncInterval')
    ) {
      console.log('GitHub Issues Sync: Configuration changed, restarting auto sync');
      startAutoSync();
    }
    // storageDirectory が変更された場合、Tree Providerを再初期化
    if (e.affectsConfiguration('githubIssuesSync.storageDirectory')) {
      console.log('GitHub Issues Sync: Storage directory changed, reinitializing tree provider');
      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const workspaceFolder = vscode.workspace.workspaceFolders[0];
        const config = vscode.workspace.getConfiguration('githubIssuesSync');
        const storagePath = resolveStoragePath(workspaceFolder, config);
        treeProvider = new IssuesTreeProvider(storageService, storagePath);
        const treeView = vscode.window.registerTreeDataProvider('githubIssuesView', treeProvider);
        context.subscriptions.push(treeView);
        treeProvider.loadIssues().catch((e) => console.error('Failed to load issues:', e));
      }
    }
  });

  // 自動同期を開始
  startAutoSync();

  context.subscriptions.push(syncCommand, configCommand, configChangeDisposable, {
    dispose: stopAutoSync,
  });
}

/**
 * VS Code拡張機能の非活性化時に呼び出される
 * 自動同期タイマーをクリーンアップし、リソースを解放する
 */
export function deactivate() {
  console.log('GitHub Issues Sync extension is now deactivated');

  // 自動同期タイマーを停止
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = undefined;
  }
}
