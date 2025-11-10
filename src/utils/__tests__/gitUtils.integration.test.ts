/**
 * GitUtils の統合テスト（実際のGitリポジトリを使用）
 */

import { GitUtils } from '../gitUtils';
import * as path from 'path';
import * as os from 'os';

describe('GitUtils Integration Tests', () => {
  let gitUtils: GitUtils;
  const currentRepoPath = path.resolve(__dirname, '../../..');

  beforeEach(() => {
    gitUtils = new GitUtils();
  });

  it('現在のリポジトリ情報を取得できる', async () => {
    const repoInfo = await gitUtils.getRepositoryInfo(currentRepoPath);

    expect(repoInfo).not.toBeNull();
    if (repoInfo) {
      expect(repoInfo.owner).toBe('hiroyannnn');
      expect(repoInfo.repo).toBe('vscode-github-issues-sync');
      expect(repoInfo.remoteUrl).toContain('github.com');
      expect(repoInfo.remoteUrl).toContain('hiroyannnn/vscode-github-issues-sync');
    }
  });

  it('現在のディレクトリがGitリポジトリであることを確認', async () => {
    const isGitRepo = await gitUtils.isGitRepository(currentRepoPath);
    expect(isGitRepo).toBe(true);
  });

  it('非Gitディレクトリの場合falseを返す', async () => {
    const nonGitPath = os.tmpdir();
    const isGitRepo = await gitUtils.isGitRepository(nonGitPath);
    expect(isGitRepo).toBe(false);
  });
});
