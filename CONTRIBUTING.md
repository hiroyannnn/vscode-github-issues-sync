# Contributing to GitHub Issues Sync

GitHub Issues Sync への貢献を歓迎します！このドキュメントは、プロジェクトへの貢献方法をガイドします。

## 行動規範

このプロジェクトでは、すべての参加者に対して敬意と建設的な態度を期待します。

## 開発環境のセットアップ

### 必要環境

- Node.js 18以上
- npm 8以上
- VS Code

### セットアップ手順

1. リポジトリをフォーク

```bash
# あなたのGitHubアカウントでフォーク後
git clone https://github.com/<your-username>/vscode-github-issues-sync.git
cd vscode-github-issues-sync
```

2. 依存関係のインストール

```bash
npm install
```

3. ビルド

```bash
npm run compile
```

4. テスト実行

```bash
npm test
```

5. 拡張機能のデバッグ

VS Codeでプロジェクトを開き、F5キーを押してExtension Development Hostを起動します。

## 開発ワークフロー

### ブランチ戦略

- `main`: 安定版（本番リリース用）
- `feature/*`: 新機能開発
- `fix/*`: バグ修正
- `docs/*`: ドキュメント更新

### コミットメッセージ

Conventional Commitsスタイルを使用してください：

```
<type>: <subject>

<body>

<footer>
```

**Type**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（フォーマット、セミコロンなど）
- `refactor`: バグ修正や機能追加を行わないコード変更
- `test`: テストの追加または修正
- `chore`: ビルドプロセスやツールの変更

**例**:
```
feat: 自動同期機能を追加

設定可能な間隔でGitHub Issuesを自動的に同期する機能を実装。
enableAutoSyncとsyncInterval設定を追加。

Closes #123
```

## テスト駆動開発（TDD）

このプロジェクトではTDDを採用しています：

1. **テストを先に書く**（Red）
   ```bash
   # 新しいテストファイルを作成
   touch src/services/__tests__/newService.test.ts
   ```

2. **最小限の実装でテストを通す**（Green）
   ```bash
   npm test
   ```

3. **リファクタリング**（Refactor）
   - コードの可読性を向上
   - 重複を削除
   - 再度テストを実行

### テストの実行

```bash
# 全テスト
npm test

# 特定のテストファイル
npm test -- src/services/__tests__/syncService.test.ts

# カバレッジ
npm test -- --coverage
```

## コードスタイル

### ESLint

```bash
npm run lint
```

### Prettier

```bash
npm run format
```

コミット前に必ず実行してください。

## Pull Requestの作成

1. **フォークからブランチを作成**

```bash
git checkout -b feature/my-new-feature
```

2. **変更をコミット**

```bash
git add .
git commit -m "feat: 新機能の説明"
```

3. **テストを実行**

```bash
npm test
npm run lint
```

4. **プッシュ**

```bash
git push origin feature/my-new-feature
```

5. **Pull Requestを作成**

GitHubでPull Requestを作成し、以下を含めてください：
- 変更の概要
- 関連するIssue番号
- テスト結果のスクリーンショット（該当する場合）
- 破壊的変更の説明（該当する場合）

### Pull Requestのチェックリスト

- [ ] テストが全て通る
- [ ] Lintエラーがない
- [ ] コードがフォーマットされている
- [ ] コミットメッセージがConventional Commitsに従っている
- [ ] ドキュメントが更新されている（必要な場合）
- [ ] CHANGELOGが更新されている（必要な場合）

## アーキテクチャ

### ディレクトリ構造

```
src/
├── extension.ts           # エントリーポイント
├── models/                # データモデル
│   └── issue.ts
├── services/              # ビジネスロジック
│   ├── authService.ts
│   ├── githubService.ts
│   ├── storageService.ts
│   ├── syncService.ts
│   ├── interfaces/        # インターフェース定義
│   └── __tests__/         # テスト
├── utils/                 # ユーティリティ
│   ├── gitUtils.ts
│   └── __tests__/
└── views/                 # UI関連
    ├── issuesTreeProvider.ts
    └── __tests__/
```

### 設計原則

1. **依存性注入**: テスタビリティのため、サービス間の依存はコンストラクタ注入
2. **インターフェース駆動**: 実装の前にインターフェースを定義
3. **単一責任の原則**: 各クラスは1つの責任のみを持つ
4. **テスト可能性**: モックしやすい設計

## 新機能の追加

新機能を追加する場合の推奨手順：

1. **Issue作成**: まず機能リクエストのIssueを作成
2. **設計**: インターフェースを先に設計
3. **テスト**: 機能のテストケースを先に作成
4. **実装**: TDDサイクルに従って実装
5. **ドキュメント**: README.mdとCHANGELOG.mdを更新
6. **Pull Request**: レビューを依頼

## バグ報告

バグを発見した場合：

1. **既存のIssueを検索**: 同じバグが報告されていないか確認
2. **Issue作成**: 以下の情報を含める
   - バグの説明
   - 再現手順
   - 期待される動作
   - 実際の動作
   - 環境情報（OS、VS Codeバージョンなど）
   - スクリーンショットやログ（該当する場合）

## リリースプロセス

1. バージョン番号を更新（package.json）
2. CHANGELOG.mdを更新
3. コミットとタグ作成
```bash
git commit -m "chore: release v1.0.0"
git tag v1.0.0
git push && git push --tags
```
4. GitHub Releaseを作成
5. VS Code Marketplaceに公開（メンテナ権限が必要）

## サポート

質問がある場合：
- GitHub Issuesで質問を作成
- ディスカッションタブで議論

## ライセンス

コントリビューションをsubmitすることで、あなたの貢献がMITライセンスの下でライセンスされることに同意したことになります。
