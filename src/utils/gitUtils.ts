/**
 * Git情報取得ユーティリティ
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { RepositoryInfo } from '../models/issue';
import { IGitUtils } from './interfaces/IGitUtils';

export class GitUtils implements IGitUtils {
  /**
   * GitリモートURLからowner/repo情報を抽出
   */
  parseRemoteUrl(remoteUrl: string): { owner: string; repo: string } | null {
    if (!remoteUrl || remoteUrl.trim() === '') {
      return null;
    }

    // SSH形式: git@github.com:owner/repo.git
    const sshPattern = /git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/;
    const sshMatch = remoteUrl.match(sshPattern);
    if (sshMatch) {
      return {
        owner: sshMatch[1],
        // 正規表現で既に.gitを除外しているが、安全のため明示的に削除（防御的プログラミング）
        repo: sshMatch[2].replace(/\.git$/, ''),
      };
    }

    // HTTPS形式: https://github.com/owner/repo.git
    const httpsPattern = /https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/;
    const httpsMatch = remoteUrl.match(httpsPattern);
    if (httpsMatch) {
      return {
        owner: httpsMatch[1],
        // 正規表現で既に.gitを除外しているが、安全のため明示的に削除（防御的プログラミング）
        repo: httpsMatch[2].replace(/\.git$/, ''),
      };
    }

    return null;
  }

  /**
   * 指定されたパスがGitリポジトリかチェック
   */
  async isGitRepository(dirPath: string): Promise<boolean> {
    try {
      const gitDir = path.join(dirPath, '.git');
      const stats = await fs.stat(gitDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Gitリポジトリからリモート情報を取得
   */
  private async getRemoteUrl(repoPath: string): Promise<string | null> {
    try {
      const configPath = path.join(repoPath, '.git', 'config');
      const configContent = await fs.readFile(configPath, 'utf-8');

      // [remote "origin"] セクションからURLを取得（改行を跨いでマッチ）
      const remotePattern = /\[remote "origin"\][^[]*?url\s*=\s*(.+?)(?:\n|$)/s;
      const match = configContent.match(remotePattern);

      if (match && match[1]) {
        // コメント（#以降）を除外してトリム
        const url = match[1].split('#')[0].trim();
        return url || null;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 現在のワークスペースからGitHubリポジトリ情報を取得
   */
  async getRepositoryInfo(workspacePath: string): Promise<RepositoryInfo | null> {
    // Gitリポジトリかチェック
    const isGitRepo = await this.isGitRepository(workspacePath);
    if (!isGitRepo) {
      return null;
    }

    // リモートURLを取得
    const remoteUrl = await this.getRemoteUrl(workspacePath);
    if (!remoteUrl) {
      return null;
    }

    // URLをパース
    const parsed = this.parseRemoteUrl(remoteUrl);
    if (!parsed) {
      return null;
    }

    return {
      owner: parsed.owner,
      repo: parsed.repo,
      remoteUrl: remoteUrl,
    };
  }
}
