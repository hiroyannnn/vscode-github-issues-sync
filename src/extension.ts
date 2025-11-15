import * as vscode from 'vscode';
import * as path from 'path';
import { AuthService } from './services/authService';
import { GitHubService } from './services/githubService';
import { StorageService } from './services/storageService';
import { SyncService } from './services/syncService';
import { IssuesTreeProvider } from './views/issuesTreeProvider';
import { GitUtils } from './utils/gitUtils';
import { SyncOptions } from './models/issue';

export async function activate(context: vscode.ExtensionContext) {
  console.log('GitHub Issues Sync extension is now active');

  // サービスの初期化
  const authService = new AuthService(context);
  const storageService = new StorageService();
  const githubService = new GitHubService(authService);
  const gitUtils = new GitUtils();

  // ストレージパスを取得（workspace内の.github-issuesディレクトリ）
  const getStoragePath = (workspaceFolder: vscode.WorkspaceFolder): string => {
    return path.join(workspaceFolder.uri.fsPath, '.github-issues');
  };

  // Tree View Providerの初期化
  let treeProvider: IssuesTreeProvider | undefined;
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const storagePath = getStoragePath(vscode.workspace.workspaceFolders[0]);
    treeProvider = new IssuesTreeProvider(storageService, storagePath);

    // Tree Viewの登録
    const treeView = vscode.window.registerTreeDataProvider('githubIssuesView', treeProvider);
    context.subscriptions.push(treeView);

    // 初期ロード
    await treeProvider.loadIssues();
  }

  // syncNowコマンド
  const syncCommand = vscode.commands.registerCommand('githubIssuesSync.syncNow', async () => {
    try {
      // ワークスペースフォルダーの確認
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('GitHub Issues Sync: No workspace folder opened');
        return;
      }

      const workspaceFolder = workspaceFolders[0];
      const workspacePath = workspaceFolder.uri.fsPath;
      const storagePath = getStoragePath(workspaceFolder);

      // Git情報を取得
      const repoInfo = await gitUtils.getRepositoryInfo(workspacePath);
      if (!repoInfo) {
        vscode.window.showErrorMessage(
          'GitHub Issues Sync: Not a valid GitHub repository. Please open a workspace with a GitHub repository.'
        );
        return;
      }

      // 認証
      const token = await authService.getToken();
      console.log(`GitHub Issues Sync: Authenticated with ${token.type}`);

      // 同期オプションの取得
      const config = vscode.workspace.getConfiguration('githubIssuesSync');
      const syncOptions: SyncOptions = {
        maxIssues: config.get<number>('maxIssues', 100),
        syncPeriod: '6months',
        includeClosedIssues: config.get<boolean>('includeClosedIssues', false),
        syncStrategy: 'full',
        labelFilter: [],
        milestoneFilter: [],
      };

      // SyncServiceの初期化
      const syncService = new SyncService(githubService, storageService, storagePath);

      // 進捗表示付きで同期実行
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
          const result = await syncService.sync(repoInfo, syncOptions, (progressInfo) => {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`GitHub Issues Sync error: ${errorMessage}`);
    }
  });

  // configureコマンド
  const configCommand = vscode.commands.registerCommand('githubIssuesSync.configure', async () => {
    // 設定画面を開く
    await vscode.commands.executeCommand('workbench.action.openSettings', 'githubIssuesSync');
  });

  context.subscriptions.push(syncCommand, configCommand);
}

export function deactivate() {
  console.log('GitHub Issues Sync extension is now deactivated');
}
