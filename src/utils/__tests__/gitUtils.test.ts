/**
 * GitUtils のテスト
 */

import { GitUtils } from '../gitUtils';
import { IGitUtils } from '../interfaces/IGitUtils';

// fs/promisesをモック
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readFile: jest.fn(),
  },
}));

import { promises as fs } from 'fs';

describe('GitUtils', () => {
  let gitUtils: IGitUtils;

  beforeEach(() => {
    gitUtils = new GitUtils();
    jest.clearAllMocks();
  });

  describe('parseRemoteUrl', () => {
    it('SSH形式のGitHub URLをパースできる', () => {
      const result = gitUtils.parseRemoteUrl(
        'git@github.com:hiroyannnn/vscode-github-issues-sync.git'
      );
      expect(result).toEqual({
        owner: 'hiroyannnn',
        repo: 'vscode-github-issues-sync',
      });
    });

    it('HTTPS形式のGitHub URLをパースできる', () => {
      const result = gitUtils.parseRemoteUrl(
        'https://github.com/hiroyannnn/vscode-github-issues-sync.git'
      );
      expect(result).toEqual({
        owner: 'hiroyannnn',
        repo: 'vscode-github-issues-sync',
      });
    });

    it('.git拡張子なしのHTTPS URLをパースできる', () => {
      const result = gitUtils.parseRemoteUrl(
        'https://github.com/hiroyannnn/vscode-github-issues-sync'
      );
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
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      const result = await gitUtils.isGitRepository('/path/to/git/repo');
      expect(result).toBe(true);
    });

    it('Gitリポジトリでない場合falseを返す', async () => {
      (fs.stat as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      const result = await gitUtils.isGitRepository('/path/to/non/git/dir');
      expect(result).toBe(false);
    });
  });

  describe('getRepositoryInfo', () => {
    it('Gitリポジトリでない場合nullを返す', async () => {
      (fs.stat as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      const result = await gitUtils.getRepositoryInfo('/path/to/non/git/dir');
      expect(result).toBeNull();
    });

    it('リモートが設定されていない場合nullを返す', async () => {
      // .gitディレクトリは存在するがリモートなし
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      const result = await gitUtils.getRepositoryInfo('/path/to/local/git/repo');
      expect(result).toBeNull();
    });

    it('GitHubリポジトリの情報を取得できる', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readFile as jest.Mock).mockResolvedValue(
        '[remote "origin"]\n\turl = git@github.com:test/repo.git'
      );
      const result = await gitUtils.getRepositoryInfo('/path/to/git/repo');
      expect(result).toEqual({
        owner: 'test',
        repo: 'repo',
        remoteUrl: 'git@github.com:test/repo.git',
      });
    });
  });
});
