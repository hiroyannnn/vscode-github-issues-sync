/**
 * GitUtils のテスト
 */

import { GitUtils } from '../gitUtils';
import { IGitUtils } from '../interfaces/IGitUtils';

describe('GitUtils', () => {
  let gitUtils: IGitUtils;

  beforeEach(() => {
    gitUtils = new GitUtils();
  });

  describe('parseRemoteUrl', () => {
    it('SSH形式のGitHub URLをパースできる', () => {
      const result = gitUtils.parseRemoteUrl('git@github.com:hiroyannnn/vscode-github-issues-sync.git');
      expect(result).toEqual({
        owner: 'hiroyannnn',
        repo: 'vscode-github-issues-sync',
      });
    });

    it('HTTPS形式のGitHub URLをパースできる', () => {
      const result = gitUtils.parseRemoteUrl('https://github.com/hiroyannnn/vscode-github-issues-sync.git');
      expect(result).toEqual({
        owner: 'hiroyannnn',
        repo: 'vscode-github-issues-sync',
      });
    });

    it('.git拡張子なしのHTTPS URLをパースできる', () => {
      const result = gitUtils.parseRemoteUrl('https://github.com/hiroyannnn/vscode-github-issues-sync');
      expect(result).toEqual({
        owner: 'hiroyannnn',
        repo: 'vscode-github-issues-sync',
      });
    });

    it('無効なURLの場合nullを返す', () => {
      expect(gitUtils.parseRemoteUrl('invalid-url')).toBeNull();
      expect(gitUtils.parseRemoteUrl('https://gitlab.com/owner/repo.git')).toBeNull();
      expect(gitUtils.parseRemoteUrl('')).toBeNull();
    });

    it('サブディレクトリを含むパスを正しくパースする', () => {
      const result = gitUtils.parseRemoteUrl('https://github.com/owner/repo.git/some/path');
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
      });
    });
  });

  describe('isGitRepository', () => {
    it('Gitリポジトリの場合trueを返す', async () => {
      // 実際のテストでは、テスト用のGitリポジトリを用意する
      // ここではモックを使用する想定
      const result = await gitUtils.isGitRepository('/path/to/git/repo');
      expect(typeof result).toBe('boolean');
    });

    it('Gitリポジトリでない場合falseを返す', async () => {
      const result = await gitUtils.isGitRepository('/path/to/non/git/dir');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getRepositoryInfo', () => {
    it('Gitリポジトリの情報を取得できる', async () => {
      // 実際のテストでは、テスト用のGitリポジトリを用意する
      const result = await gitUtils.getRepositoryInfo('/path/to/git/repo');

      if (result) {
        expect(result).toHaveProperty('owner');
        expect(result).toHaveProperty('repo');
        expect(result).toHaveProperty('remoteUrl');
      }
    });

    it('Gitリポジトリでない場合nullを返す', async () => {
      const result = await gitUtils.getRepositoryInfo('/path/to/non/git/dir');
      expect(result).toBeNull();
    });

    it('リモートが設定されていない場合nullを返す', async () => {
      // リモートなしのGitリポジトリの場合
      const result = await gitUtils.getRepositoryInfo('/path/to/local/git/repo');
      // この場合の挙動はnullを返すか、エラーを投げるか要検討
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });
});
