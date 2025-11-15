/**
 * ローカルストレージサービス
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import matter from 'gray-matter';
import { IStorageService } from './interfaces/IStorageService';
import { Issue, SyncState } from '../models/issue';

export class StorageService implements IStorageService {
  /**
   * Issueをローカルに保存
   */
  async saveIssue(issue: Issue, storageDir: string): Promise<void> {
    await fs.mkdir(storageDir, { recursive: true });

    const markdown = this.toMarkdown(issue);
    const filePath = path.join(storageDir, `issue-${issue.number}.md`);

    await fs.writeFile(filePath, markdown, 'utf-8');
  }

  /**
   * 複数のIssueをバッチ保存
   */
  async saveIssues(issues: Issue[], storageDir: string): Promise<void> {
    await fs.mkdir(storageDir, { recursive: true });

    await Promise.all(issues.map((issue) => this.saveIssue(issue, storageDir)));
  }

  /**
   * 保存されているIssueを読み込み
   */
  async loadIssue(issueNumber: number, storageDir: string): Promise<Issue | null> {
    try {
      const filePath = path.join(storageDir, `issue-${issueNumber}.md`);
      const markdown = await fs.readFile(filePath, 'utf-8');

      return this.fromMarkdown(markdown);
    } catch {
      return null;
    }
  }

  /**
   * 保存されている全Issueを読み込み
   */
  async loadAllIssues(storageDir: string): Promise<Issue[]> {
    try {
      const files = await fs.readdir(storageDir);
      const issueFiles = files.filter((file) => file.startsWith('issue-') && file.endsWith('.md'));

      const issues = await Promise.all(
        issueFiles.map(async (file) => {
          const filePath = path.join(storageDir, file);
          const markdown = await fs.readFile(filePath, 'utf-8');
          return this.fromMarkdown(markdown);
        })
      );

      return issues;
    } catch {
      return [];
    }
  }

  /**
   * Issueを削除
   */
  async deleteIssue(issueNumber: number, storageDir: string): Promise<void> {
    const filePath = path.join(storageDir, `issue-${issueNumber}.md`);
    await fs.unlink(filePath);
  }

  /**
   * 同期状態を保存
   */
  async saveSyncState(state: SyncState, storageDir: string): Promise<void> {
    await fs.mkdir(storageDir, { recursive: true });

    const filePath = path.join(storageDir, 'sync-state.json');
    await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  /**
   * 同期状態を読み込み
   */
  async loadSyncState(storageDir: string): Promise<SyncState | null> {
    try {
      const filePath = path.join(storageDir, 'sync-state.json');
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * IssueをMarkdown形式に変換
   */
  toMarkdown(issue: Issue): string {
    // ラベル情報を完全形式で保存
    const labelsData = issue.labels.map((label) => ({
      id: label.id,
      name: label.name,
      color: label.color,
      ...(label.description ? { description: label.description } : {}),
    }));

    // マイルストーン情報を完全形式で保存
    const milestoneData = issue.milestone
      ? {
          id: issue.milestone.id,
          number: issue.milestone.number,
          title: issue.milestone.title,
          ...(issue.milestone.description ? { description: issue.milestone.description } : {}),
          state: issue.milestone.state,
          ...(issue.milestone.due_on ? { due_on: issue.milestone.due_on } : {}),
          url: issue.milestone.url,
        }
      : undefined;

    // Front matterデータを構築（undefinedを除外）
    const frontMatter: Record<string, unknown> = {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      state: issue.state,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      author: issue.author,
      assignees: issue.assignees,
      labels: labelsData,
      url: issue.url,
      html_url: issue.html_url,
    };

    // オプショナルフィールドを追加（undefinedでない場合のみ）
    if (issue.closed_at) {
      frontMatter.closed_at = issue.closed_at;
    }
    if (milestoneData) {
      frontMatter.milestone = milestoneData;
    }

    // Markdownボディを構築
    let body = `# ${issue.title}\n\n`;

    // Issue本文
    if (issue.body) {
      body += `${issue.body}\n\n`;
    }

    // メタ情報
    body += `---\n\n`;
    body += `**Author:** @${issue.author.login}\n`;
    body += `**Created:** ${issue.created_at}\n`;
    body += `**Updated:** ${issue.updated_at}\n`;

    if (issue.closed_at) {
      body += `**Closed:** ${issue.closed_at}\n`;
    }

    if (issue.assignees.length > 0) {
      body += `**Assignees:** ${issue.assignees.map((a) => `@${a.login}`).join(', ')}\n`;
    }

    if (issue.labels.length > 0) {
      body += `**Labels:** ${issue.labels.map((l) => l.name).join(', ')}\n`;
    }

    if (issue.milestone) {
      body += `**Milestone:** ${issue.milestone.title}\n`;
    }

    // コメント
    if (issue.comments && issue.comments.length > 0) {
      body += `\n---\n\n## Comments\n\n`;

      for (const comment of issue.comments) {
        body += `### @${comment.user.login} - ${comment.created_at}\n\n`;
        body += `${comment.body}\n\n`;
      }
    }

    // gray-matterでfront matterとボディを結合
    return matter.stringify(body, frontMatter);
  }

  /**
   * MarkdownからIssueに変換
   */
  fromMarkdown(markdown: string): Issue {
    const { data, content } = matter(markdown);

    // ラベル情報を復元（完全なオブジェクト形式に対応）
    let labels: Issue['labels'] = [];
    if (data.labels) {
      if (Array.isArray(data.labels)) {
        labels = data.labels.map((label: Record<string, unknown> | string) => {
          if (typeof label === 'string') {
            return {
              id: 0,
              name: label,
              color: '',
              description: undefined,
            };
          }
          return {
            id: (label.id as number) || 0,
            name: (label.name as string) || '',
            color: (label.color as string) || '',
            description: (label.description as string) || undefined,
          };
        });
      }
    }

    // マイルストーン情報を復元（完全なオブジェクト形式に対応）
    let milestone: Issue['milestone'] = undefined;
    if (data.milestone) {
      if (typeof data.milestone === 'string') {
        milestone = {
          id: 0,
          number: 0,
          title: data.milestone,
          state: 'open',
          url: '',
        };
      } else {
        const m = data.milestone as Record<string, unknown>;
        milestone = {
          id: (m.id as number) || 0,
          number: (m.number as number) || 0,
          title: (m.title as string) || '',
          description: (m.description as string) || undefined,
          state: (m.state as 'open' | 'closed') || 'open',
          due_on: (m.due_on as string) || undefined,
          url: (m.url as string) || '',
        };
      }
    }

    // Front matterから基本情報を復元
    const issue: Issue = {
      id: data.id as number,
      number: data.number as number,
      title: data.title as string,
      state: data.state as 'open' | 'closed',
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
      closed_at: data.closed_at as string | undefined,
      author: data.author as Issue['author'],
      assignees: data.assignees as Issue['assignees'],
      labels,
      milestone,
      url: data.url as string,
      html_url: data.html_url as string,
    };

    // コメントをボディから抽出
    // GitHub のユーザー名規則: 英数字と単一のハイフン、数字で始まることはできない
    const commentPattern =
      /### @([A-Za-z0-9](?:-?[A-Za-z0-9])*) - ([\d-T:Z]+)\n\n([\s\S]*?)(?=\n### @|\n\n$|$)/g;
    const comments: Issue['comments'] = [];
    let match;

    while ((match = commentPattern.exec(content)) !== null) {
      comments.push({
        id: 0,
        user: {
          login: match[1],
          id: 0,
          avatar_url: '',
          url: '',
        },
        body: match[3].trim(),
        created_at: match[2],
        updated_at: match[2],
        url: '',
      });
    }

    if (comments.length > 0) {
      issue.comments = comments;
    }

    // ボディテキストを抽出（タイトル以降、メタ情報の前まで）
    const bodyMatch = content.match(/# .+?\n\n([\s\S]*?)(?=\n---\n|$)/);
    if (bodyMatch && bodyMatch[1].trim()) {
      issue.body = bodyMatch[1].trim();
    }

    return issue;
  }

  /**
   * Issueが変更されたかチェック（ハッシュ比較）
   */
  async hasChanged(issue: Issue, storageDir: string): Promise<boolean> {
    try {
      const existingIssue = await this.loadIssue(issue.number, storageDir);
      if (!existingIssue) {
        return true;
      }

      // 新旧のMarkdownをハッシュ化して比較
      const newHash = this.calculateHash(this.toMarkdown(issue));
      const oldHash = this.calculateHash(this.toMarkdown(existingIssue));

      return newHash !== oldHash;
    } catch {
      return true;
    }
  }

  /**
   * 文字列のハッシュを計算
   */
  private calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
