/**
 * ローカルストレージサービスのインターフェース
 */

import { Issue, SyncState } from '../../models/issue';

export interface IStorageService {
  /**
   * Issueをローカルに保存
   * @param issue 保存するIssue
   * @param storageDir 保存先ディレクトリ
   */
  saveIssue(issue: Issue, storageDir: string): Promise<void>;

  /**
   * 複数のIssueをバッチ保存
   * @param issues 保存するIssueの配列
   * @param storageDir 保存先ディレクトリ
   */
  saveIssues(issues: Issue[], storageDir: string): Promise<void>;

  /**
   * 保存されているIssueを読み込み
   * @param issueNumber Issue番号
   * @param storageDir 保存先ディレクトリ
   */
  loadIssue(issueNumber: number, storageDir: string): Promise<Issue | null>;

  /**
   * 保存されている全Issueを読み込み
   * @param storageDir 保存先ディレクトリ
   */
  loadAllIssues(storageDir: string): Promise<Issue[]>;

  /**
   * Issueを削除
   * @param issueNumber Issue番号
   * @param storageDir 保存先ディレクトリ
   */
  deleteIssue(issueNumber: number, storageDir: string): Promise<void>;

  /**
   * 同期状態を保存
   * @param state 同期状態
   * @param storageDir 保存先ディレクトリ
   */
  saveSyncState(state: SyncState, storageDir: string): Promise<void>;

  /**
   * 同期状態を読み込み
   * @param storageDir 保存先ディレクトリ
   */
  loadSyncState(storageDir: string): Promise<SyncState | null>;

  /**
   * IssueをMarkdown形式に変換
   * @param issue 変換するIssue
   */
  toMarkdown(issue: Issue): string;

  /**
   * MarkdownからIssueに変換
   * @param markdown Markdownテキスト
   */
  fromMarkdown(markdown: string): Issue;

  /**
   * Issueが変更されたかチェック（ハッシュ比較）
   * @param issue チェックするIssue
   * @param storageDir 保存先ディレクトリ
   */
  hasChanged(issue: Issue, storageDir: string): Promise<boolean>;
}
