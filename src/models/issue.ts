/**
 * GitHub Issue のモデル定義
 */

export interface Label {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface User {
  login: string;
  id: number;
  avatar_url: string;
  url: string;
}

export interface Milestone {
  id: number;
  number: number;
  title: string;
  description?: string;
  state: 'open' | 'closed';
  due_on?: string;
  url: string;
}

export interface Comment {
  id: number;
  user: User;
  body: string;
  created_at: string;
  updated_at: string;
  url: string;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  closed_at?: string;
  author: User;
  assignees: User[];
  labels: Label[];
  milestone?: Milestone;
  comments?: Comment[];
  url: string;
  html_url: string;
}

export interface RepositoryInfo {
  owner: string;
  repo: string;
  remoteUrl: string;
}

export interface SyncOptions {
  maxIssues: number;
  syncPeriod: '3months' | '6months' | '1year' | 'all';
  includeClosedIssues: boolean;
  syncStrategy: 'full' | 'incremental' | 'lazy';
  labelFilter: string[];
  milestoneFilter: string[];
}

export interface SyncState {
  lastSyncTime?: string;
  lastETag?: string;
  syncedIssueIds: number[];
}
