/**
 * Git情報取得ユーティリティのインターフェース
 */

import { RepositoryInfo } from '../../models/issue';

export interface IGitUtils {
  /**
   * 現在のワークスペースからGitHubリポジトリ情報を取得
   * @param workspacePath ワークスペースのパス
   * @returns リポジトリ情報、Gitリポジトリでない場合はnull
   */
  getRepositoryInfo(workspacePath: string): Promise<RepositoryInfo | null>;

  /**
   * GitリモートURLからowner/repo情報を抽出
   * @param remoteUrl リモートURL (例: git@github.com:owner/repo.git)
   * @returns owner/repo情報、解析失敗時はnull
   */
  parseRemoteUrl(remoteUrl: string): { owner: string; repo: string } | null;

  /**
   * 指定されたパスがGitリポジトリかチェック
   * @param path チェックするパス
   */
  isGitRepository(path: string): Promise<boolean>;
}
