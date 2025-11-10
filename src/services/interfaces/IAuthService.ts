/**
 * GitHub認証サービスのインターフェース
 */

export interface AuthToken {
  token: string;
  type: 'vscode' | 'pat'; // VS Code authentication or Personal Access Token
}

export interface IAuthService {
  /**
   * GitHub認証トークンを取得
   * VS Code標準認証を優先し、失敗時はPATにフォールバック
   * @throws Error 認証に失敗した場合
   */
  getToken(): Promise<AuthToken>;

  /**
   * 現在のトークンが有効かチェック
   */
  validateToken(token: string): Promise<boolean>;

  /**
   * トークンをクリア（ログアウト）
   */
  clearToken(): Promise<void>;
}
