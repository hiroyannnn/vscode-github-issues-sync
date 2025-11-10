# TODO: GitHub Issues Sync 拡張機能の実装

## 完了した項目
- [x] Phase 1: プロジェクト基本セットアップ
  - [x] package.json作成
  - [x] tsconfig.json作成
  - [x] webpack.config.js作成
  - [x] .eslintrc.json作成
  - [x] .prettierrc作成
  - [x] jest.config.js作成
  - [x] .gitignore作成
  - [x] VS Code設定ファイル作成
  - [x] 基本的なextension.ts作成
  - [x] npm install実行
  - [x] ビルド・リント・フォーマット確認

## 実装予定の項目

### Phase 2: インターフェース設計
- [ ] 認証サービスのインターフェース設計
- [ ] GitHubクライアントのインターフェース設計
- [ ] ストレージサービスのインターフェース設計
- [ ] 同期コントローラーのインターフェース設計
- [ ] モデル型定義（Issue, Label, Milestone等）

### Phase 3: Git情報取得ユーティリティ
- [ ] リポジトリ情報取得機能（owner/repo名）
- [ ] リモートURL解析機能
- [ ] テスト作成

### Phase 4: GitHub認証機能
- [ ] VS Code標準GitHub認証の実装
- [ ] Personal Access Tokenフォールバックの実装
- [ ] SecretStorageでのトークン管理
- [ ] テスト作成

### Phase 5: GitHub APIクライアント
- [ ] Octokitクライアントのラッパー実装
- [ ] Issue取得機能（ページネーション対応）
- [ ] Rate Limit管理機能
- [ ] ETAGキャッシュ対応
- [ ] フィルタリング機能（ラベル、マイルストーン、期間）
- [ ] テスト作成

### Phase 6: ストレージサービス
- [ ] Markdown変換機能
- [ ] Frontmatter生成機能
- [ ] ファイル書き込み機能（workspace.fs使用）
- [ ] ハッシュ比較による差分検出
- [ ] テスト作成

### Phase 7: 同期サービス
- [ ] 全体同期ロジック
- [ ] 差分同期ロジック
- [ ] 進捗報告機能
- [ ] エラーハンドリング
- [ ] テスト作成

### Phase 8: Tree Viewプロバイダー
- [ ] IssueツリービューのUI実装
- [ ] Open/Closedグループ化
- [ ] クリック時のファイルオープン処理
- [ ] リフレッシュ機能
- [ ] テスト作成

### Phase 9: コマンド実装
- [ ] syncNowコマンドの実装
- [ ] configureコマンドの実装
- [ ] ステータスバー表示機能
- [ ] テスト作成

### Phase 10: 自動同期機能
- [ ] 定期同期タイマー実装
- [ ] 設定読み込み機能
- [ ] テスト作成

### Phase 11: 統合テスト・最適化
- [ ] 統合テスト実施
- [ ] エラーハンドリング改善
- [ ] パフォーマンス最適化
- [ ] セキュリティチェック

## 設計方針
- TDD（Test-Driven Development）方式で実装
- 依存性注入によるテスト容易性の確保
- VS Code APIのベストプラクティスに準拠
- セキュリティ重視（トークン管理、入力検証）
