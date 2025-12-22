# GitHub Issues Sync for VS Code

[English](README.md) | 日本語

VS Code拡張機能で、GitHubのIssueをローカルに同期し、AIコードエージェントやオフライン環境での参照を可能にします。

## 特徴

- **自動同期**: 設定可能な間隔（5〜1440分）でGitHub Issuesを自動的にローカルに同期
- **手動同期**: コマンドパレットから即座に同期を実行
- **Markdown形式**: IssueをYAMLフロントマター付きMarkdownで保存（AI/LLMに最適）
- **Tree View**: VS CodeのサイドバーでIssueを一覧表示、クリックで詳細を開く
- **認証**: VS Code標準のGitHub認証をサポート（PATフォールバック対応）
- **オフライン対応**: 同期後はネットワーク接続なしでIssueを参照可能
- **フィルタリング**: Issue状態、ラベル、マイルストーン、期間での柔軟なフィルタリング

## インストール

### VS Code Marketplaceから（公開後）

1. VS Codeを開く
2. 拡張機能ビュー（`Ctrl+Shift+X` / `Cmd+Shift+X`）を開く
3. "GitHub Issues Sync"を検索
4. "Install"をクリック

### 開発版のインストール

```bash
git clone https://github.com/hiroyannnn/vscode-github-issues-sync.git
cd vscode-github-issues-sync
npm install
npm run compile
```

F5キーを押してExtension Development Hostを起動します。

## 使い方

### 初期設定

1. GitHubリポジトリのワークスペースを開く
2. コマンドパレット（`Ctrl+Shift+P` / `Cmd+Shift+P`）を開く
3. "GitHub Issues Sync: Configure"を実行
4. 必要に応じて設定を変更：
   - `enableAutoSync`: 自動同期を有効化（デフォルト: false）
   - `syncInterval`: 同期間隔（分、デフォルト: 60）
   - `maxIssues`: 最大同期Issue数（デフォルト: 100）
   - `includeClosedIssues`: Closed Issueも同期（デフォルト: false）
   - `repositoryFilter`: 同期するリポジトリを制限（デフォルト: 空配列）
   - `organizationFilter`: 同期するOrganization/Userを制限（デフォルト: 空配列）

### 手動同期

1. コマンドパレットを開く
2. "GitHub Issues Sync: Sync Now"を実行
3. 進捗通知が表示され、完了後に結果が通知されます

### Tree Viewでの閲覧

1. アクティビティバーの"GitHub Issues"アイコンをクリック
2. Issueリストが表示されます
3. Issueをクリックすると、Markdownファイルが開きます

### 同期されたファイル

同期されたIssueはデフォルトで `.vscode/github-issues/` ディレクトリに保存されます（設定で変更可能）：

```
.vscode/github-issues/
├── issue-1.md
├── issue-2.md
└── ...
```

各Issueファイルの形式：

```markdown
---
id: 123
number: 456
title: "Issue Title"
state: open
created_at: "2024-01-01T00:00:00Z"
updated_at: "2024-01-02T00:00:00Z"
author:
  login: username
  id: 12345
labels:
  - bug
  - enhancement
---

# Issue Title

Issue本文がここに表示されます。

## Comments

### @commenter1

コメント内容...
```

## 設定

### `githubIssuesSync.enableAutoSync`

- **型**: `boolean`
- **デフォルト**: `false`
- **説明**: 自動同期を有効化

### `githubIssuesSync.syncInterval`

- **型**: `number`
- **デフォルト**: `60`
- **範囲**: `5` 〜 `1440`（分）
- **説明**: 自動同期の間隔

### `githubIssuesSync.maxIssues`

- **型**: `number`
- **デフォルト**: `100`
- **範囲**: `1` 〜 `1000`
- **説明**: 同期するIssueの最大数

### `githubIssuesSync.includeClosedIssues`

- **型**: `boolean`
- **デフォルト**: `false`
- **説明**: Closed Issueも同期対象に含める

### `githubIssuesSync.syncPeriod`

- **型**: `string`
- **デフォルト**: `6months`
- **選択肢**: `3months` | `6months` | `1year` | `all`
- **説明**: 同期対象のIssue期間を指定

### `githubIssuesSync.syncStrategy`

- **型**: `string`
- **デフォルト**: `incremental`
- **選択肢**: `full` | `incremental` | `lazy`
- **説明**:
  - `full`: 毎回すべてのIssueを同期
  - `incremental`: 前回同期以降の変更のみを同期
  - `lazy`: メタデータのみ同期、詳細は必要時に取得

### `githubIssuesSync.labelFilter`

- **型**: `array<string>`
- **デフォルト**: `[]`
- **説明**: 特定のラベルを持つIssueのみを同期（空配列で全ラベル）

### `githubIssuesSync.milestoneFilter`

- **型**: `array<string>`
- **デフォルト**: `[]`
- **説明**: 特定のマイルストーンを持つIssueのみを同期（空配列で全マイルストーン）

### `githubIssuesSync.repositoryFilter`

- **型**: `array<string>`
- **デフォルト**: `[]`
- **説明**: 同期対象のリポジトリを制限。`owner/repo` で完全一致、`repo` で任意のownerに一致（空配列で全リポジトリ）。repositoryFilterとorganizationFilterの両方を設定した場合は両方に一致したものだけ同期します。

### `githubIssuesSync.organizationFilter`

- **型**: `array<string>`
- **デフォルト**: `[]`
- **説明**: 同期対象のOrganization/Userを制限（空配列で全owner）

### `githubIssuesSync.storageDirectory`

- **型**: `string`
- **デフォルト**: `.vscode/github-issues`
- **説明**: Issueを保存するディレクトリ（相対パスはワークスペース基準、`~`で展開可能）

### `githubIssuesSync.personalAccessToken`

- **型**: `string`
- **デフォルト**: `` (空文字)
- **説明**: GitHub Personal Access Token（VS Code認証失敗時のフォールバック）

## コマンド

### `GitHub Issues Sync: Sync Now`

手動で即座にIssueを同期します。進捗通知が表示され、完了後に結果が通知されます。

### `GitHub Issues Sync: Configure`

拡張機能の設定画面を開きます。

## 認証

この拡張機能は以下の順序で認証を試みます：

1. **VS Code標準のGitHub認証**（推奨）
   - 初回起動時に自動的にプロンプトが表示されます
   - `repo`スコープが必要です

2. **Personal Access Token（PAT）from 設定**
   - 設定 → `githubIssuesSync.personalAccessToken`

3. **Personal Access Token（PAT）from SecretStorage**
   - VS CodeのSecretStorageに保存されたPAT

PATを使用する場合、以下のスコープが必要です：
- `repo` (プライベートリポジトリの場合)
- `public_repo` (パブリックリポジトリのみの場合)

## トラブルシューティング

### 認証に失敗する

- VS CodeのGitHub認証を再認証してください
- または、PATを設定に追加してください

### Issueが同期されない

- ワークスペースがGitHubリポジトリのルートであることを確認
- `.git/config`に`origin`リモートが設定されていることを確認
- `githubIssuesSync.repositoryFilter` と `githubIssuesSync.organizationFilter` を確認
- GitHubのAPI Rate Limitに達していないか確認（コンソールログを参照）

### 自動同期が動作しない

- `githubIssuesSync.enableAutoSync`が`true`になっているか確認
- VS Codeを再起動してみてください

## 開発

### 必要環境

- Node.js 18以上
- npm 8以上

### セットアップ

```bash
npm install
```

### ビルド

```bash
npm run compile
```

### テスト

```bash
npm test
```

### Lint & Format

```bash
npm run lint
npm run format
```

### デバッグ

1. VS Codeでプロジェクトを開く
2. F5キーを押してExtension Development Hostを起動
3. ブレークポイントを設定してデバッグ

## ライセンス

MIT

## 作者

hiroyannnn

## 貢献

貢献を歓迎します！詳細は[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

## サポート

問題や機能リクエストは[GitHub Issues](https://github.com/hiroyannnn/vscode-github-issues-sync/issues)で報告してください。
