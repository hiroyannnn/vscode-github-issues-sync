/**
 * GitHub Issues Tree View Provider
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { Issue } from '../models/issue';
import { IStorageService } from '../services/interfaces/IStorageService';

export class IssueTreeItem extends vscode.TreeItem {
  constructor(
    public readonly issue: Issue,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly storagePath: string
  ) {
    super(issue.title, collapsibleState);

    this.description = `#${issue.number}`;
    this.tooltip = this.createTooltip();
    this.contextValue = 'issue';
    this.iconPath = this.getIconPath();

    // Issueファイルへのコマンド設定
    this.command = {
      command: 'vscode.open',
      title: 'Open Issue',
      arguments: [vscode.Uri.file(path.join(storagePath, `issue-${issue.number}.md`))],
    };
  }

  private createTooltip(): string {
    const lines = [
      `**#${this.issue.number}: ${this.issue.title}**`,
      '',
      `State: ${this.issue.state}`,
      `Author: @${this.issue.author.login}`,
      `Created: ${new Date(this.issue.created_at).toLocaleDateString()}`,
      `Updated: ${new Date(this.issue.updated_at).toLocaleDateString()}`,
    ];

    if (this.issue.labels.length > 0) {
      lines.push(`Labels: ${this.issue.labels.map((l) => l.name).join(', ')}`);
    }

    if (this.issue.milestone) {
      lines.push(`Milestone: ${this.issue.milestone.title}`);
    }

    if (this.issue.assignees.length > 0) {
      lines.push(`Assignees: ${this.issue.assignees.map((a) => a.login).join(', ')}`);
    }

    return lines.join('\n');
  }

  private getIconPath(): vscode.ThemeIcon {
    if (this.issue.state === 'closed') {
      return new vscode.ThemeIcon('issue-closed', new vscode.ThemeColor('issues.closed'));
    }
    return new vscode.ThemeIcon('issue-opened', new vscode.ThemeColor('issues.open'));
  }
}

export class IssuesTreeProvider implements vscode.TreeDataProvider<IssueTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<IssueTreeItem | undefined | null | void> =
    new vscode.EventEmitter<IssueTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<IssueTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private issues: Issue[] = [];

  constructor(
    private readonly storageService: IStorageService,
    private readonly storagePath: string
  ) {}

  /**
   * Tree Viewをリフレッシュ
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Issueを読み込み
   */
  async loadIssues(): Promise<void> {
    this.issues = await this.storageService.loadAllIssues(this.storagePath);
    this.refresh();
  }

  /**
   * Tree Itemを取得
   */
  getTreeItem(element: IssueTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * 子要素を取得
   */
  async getChildren(element?: IssueTreeItem): Promise<IssueTreeItem[]> {
    if (element) {
      // Issueの子要素は現在なし（将来的にコメントなどを表示可能）
      return [];
    }

    // ルート要素：全Issueを返す
    if (this.issues.length === 0) {
      await this.loadIssues();
    }

    // Issueを番号順（降順）でソート
    const sortedIssues = [...this.issues].sort((a, b) => b.number - a.number);

    return sortedIssues.map(
      (issue) => new IssueTreeItem(issue, vscode.TreeItemCollapsibleState.None, this.storagePath)
    );
  }

  /**
   * フィルタリング：Open Issuesのみ
   */
  async getOpenIssues(): Promise<IssueTreeItem[]> {
    const allItems = await this.getChildren();
    return allItems.filter((item) => item.issue.state === 'open');
  }

  /**
   * フィルタリング：Closed Issuesのみ
   */
  async getClosedIssues(): Promise<IssueTreeItem[]> {
    const allItems = await this.getChildren();
    return allItems.filter((item) => item.issue.state === 'closed');
  }

  /**
   * 検索：タイトルまたは本文で検索
   */
  async searchIssues(query: string): Promise<IssueTreeItem[]> {
    const allItems = await this.getChildren();
    const lowerQuery = query.toLowerCase();

    return allItems.filter(
      (item) =>
        item.issue.title.toLowerCase().includes(lowerQuery) ||
        item.issue.body?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): { total: number; open: number; closed: number } {
    const open = this.issues.filter((issue) => issue.state === 'open').length;
    const closed = this.issues.filter((issue) => issue.state === 'closed').length;

    return {
      total: this.issues.length,
      open,
      closed,
    };
  }
}
