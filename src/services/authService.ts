/**
 * GitHub認証サービス
 */

import * as vscode from 'vscode';
import { IAuthService, AuthToken } from './interfaces/IAuthService';
import { Octokit } from '@octokit/rest';

export class AuthService implements IAuthService {
  private readonly SECRET_KEY = 'github-pat';

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * GitHub認証トークンを取得
   * VS Code標準認証を優先し、失敗時はPATにフォールバック
   */
  async getToken(): Promise<AuthToken> {
    // 1. VS Code標準のGitHub認証を試みる
    try {
      const session = await vscode.authentication.getSession('github', ['repo'], {
        createIfNone: true,
      });

      if (session) {
        return {
          token: session.accessToken,
          type: 'vscode',
        };
      }
    } catch {
      console.log('VS Code GitHub authentication failed, falling back to PAT');
    }

    // 2. 設定からPersonal Access Tokenを取得
    const config = vscode.workspace.getConfiguration('githubIssuesSync');
    const configToken = config.get<string>('personalAccessToken');

    if (configToken && configToken.trim() !== '') {
      return {
        token: configToken.trim(),
        type: 'pat',
      };
    }

    // 3. SecretStorageからPATを取得
    const secretToken = await this.context.secrets.get(this.SECRET_KEY);
    if (secretToken && secretToken.trim() !== '') {
      return {
        token: secretToken.trim(),
        type: 'pat',
      };
    }

    // すべての認証方法が失敗
    throw new Error(
      'GitHub authentication failed. Please configure GitHub authentication or set a Personal Access Token.'
    );
  }

  /**
   * 現在のトークンが有効かチェック
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const octokit = new Octokit({ auth: token });
      // 認証されたユーザー情報を取得して検証
      await octokit.rest.users.getAuthenticated();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * トークンをクリア（ログアウト）
   */
  async clearToken(): Promise<void> {
    await this.context.secrets.delete(this.SECRET_KEY);
  }

  /**
   * Personal Access TokenをSecretStorageに保存
   */
  async storeToken(token: string): Promise<void> {
    await this.context.secrets.store(this.SECRET_KEY, token);
  }
}
