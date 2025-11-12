# VS Code Marketplace への公開手順

このドキュメントでは、GitHub Issues Sync 拡張機能をVS Code Marketplaceに公開する手順を説明します。

## 目次

1. [事前準備](#事前準備)
2. [パッケージングの準備](#パッケージングの準備)
3. [Publisher アカウントの作成](#publisher-アカウントの作成)
4. [拡張機能のパッケージング](#拡張機能のパッケージング)
5. [Marketplace への公開](#marketplace-への公開)
6. [公開後の更新](#公開後の更新)
7. [トラブルシューティング](#トラブルシューティング)

---

## 事前準備

### 1. 必要なツールのインストール

VS Code Extension Manager (vsce) をインストールします：

```bash
npm install -g @vscode/vsce
```

### 2. 拡張機能の完成度チェック

公開前に以下を確認してください：

- [ ] すべてのテストが通る (`npm test`)
- [ ] Lintエラーがない (`npm run lint`)
- [ ] コードがフォーマットされている (`npm run format`)
- [ ] README.md が充実している
- [ ] CHANGELOG.md が更新されている
- [ ] package.json のメタデータが正しい
- [ ] ライセンスファイルが存在する (LICENSE)

```bash
# テストとビルドを実行
npm test
npm run lint
npm run compile
```

### 3. package.json の必須フィールド確認

以下のフィールドが正しく設定されているか確認：

```json
{
  "name": "vscode-github-issues-sync",
  "displayName": "GitHub Issues Sync",
  "description": "Sync GitHub Issues to local Markdown files for AI agents and offline access",
  "version": "0.1.0",
  "publisher": "あなたのpublisher名",
  "repository": {
    "type": "git",
    "url": "https://github.com/hiroyannnn/vscode-github-issues-sync.git"
  },
  "bugs": {
    "url": "https://github.com/hiroyannnn/vscode-github-issues-sync/issues"
  },
  "license": "MIT",
  "icon": "images/icon.png",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Other"
  ],
  "keywords": [
    "github",
    "issues",
    "sync",
    "markdown",
    "ai",
    "offline"
  ]
}
```

---

## パッケージングの準備

### 1. アイコンの準備

拡張機能のアイコンを用意します（推奨: 128x128 PNG）：

```bash
mkdir -p images
# images/icon.png を配置
```

アイコンのガイドライン：
- サイズ: 128x128 ピクセル以上
- フォーマット: PNG、SVG
- 背景: 透過推奨
- シンプルで認識しやすいデザイン

### 2. README.md のブラッシュアップ

Marketplace に表示される README.md を整備：

- スクリーンショットやGIFを追加
- インストール手順を明確に
- 主要機能をビジュアルで説明
- バッジを追加（ビルド状態、バージョンなど）

### 3. .vscodeignore の設定

パッケージに含めないファイルを指定：

```
.vscode/**
.vscode-test/**
src/**
.gitignore
.yarnrc
vsc-extension-quickstart.md
**/tsconfig.json
**/.eslintrc.json
**/*.map
**/*.ts
!dist/**/*.js
node_modules/**
.github/**
*.vsix
**/__tests__/**
**/__mocks__/**
coverage/**
jest.config.js
.prettierrc
webpack.config.js
```

### 4. LICENSE ファイルの確認

MIT ライセンスファイルが存在することを確認：

```bash
# LICENSE ファイルを確認
cat LICENSE
```

存在しない場合は作成：

```bash
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2024 hiroyannnn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

---

## Publisher アカウントの作成

### 1. Azure DevOps アカウントの作成

VS Code Marketplace は Azure DevOps を使用します。

1. [Azure DevOps](https://dev.azure.com/) にアクセス
2. Microsoft アカウントでサインイン（なければ作成）
3. 組織を作成（例: hiroyannnn-vscode）

### 2. Personal Access Token (PAT) の作成

1. Azure DevOps で右上のユーザーアイコン → **Personal access tokens**
2. **+ New Token** をクリック
3. 以下を設定：
   - **Name**: VS Code Marketplace Publishing
   - **Organization**: All accessible organizations
   - **Expiration**: カスタム（例: 90日、1年）
   - **Scopes**: **Custom defined** → **Marketplace** → **Manage** にチェック
4. **Create** をクリックしてトークンをコピー（後で使用するので保存）

### 3. Publisher の作成

```bash
# vsce でログイン
vsce login <publisher名>
```

例:
```bash
vsce login hiroyannnn
```

プロンプトで Personal Access Token を入力します。

または、[VS Code Marketplace Publisher Management](https://marketplace.visualstudio.com/manage) で直接作成：

1. **Create publisher** をクリック
2. Publisher ID（例: hiroyannnn）を入力
3. 表示名とメールアドレスを入力
4. **Create** をクリック

### 4. package.json に Publisher を追加

```json
{
  "publisher": "hiroyannnn"
}
```

---

## 拡張機能のパッケージング

### 1. ビルド

```bash
# 依存関係のインストール
npm install

# コンパイル
npm run compile

# または webpack でバンドル
npm run package  # package.json に "package": "webpack --mode production" を追加
```

### 2. ローカルでパッケージング

```bash
# .vsix ファイルを生成
vsce package
```

成功すると `vscode-github-issues-sync-0.1.0.vsix` が生成されます。

### 3. ローカルでテスト

生成した .vsix ファイルをローカルにインストールしてテスト：

```bash
# コマンドラインから
code --install-extension vscode-github-issues-sync-0.1.0.vsix

# または VS Code の UI から
# 1. 拡張機能ビューを開く
# 2. ... メニュー → "Install from VSIX..."
# 3. .vsix ファイルを選択
```

動作確認：
1. VS Code を再起動
2. GitHub リポジトリを開く
3. コマンドパレットで「GitHub Issues Sync: Sync Now」を実行
4. 期待通り動作するか確認

---

## Marketplace への公開

### 1. 初回公開

```bash
# Marketplace に公開
vsce publish
```

または、バージョンを指定して公開：

```bash
# パッチバージョンを上げて公開
vsce publish patch

# マイナーバージョンを上げて公開
vsce publish minor

# メジャーバージョンを上げて公開
vsce publish major
```

### 2. 公開の確認

公開後、以下で確認できます：

- **Marketplace**: https://marketplace.visualstudio.com/items?itemName=<publisher>.<name>
- **管理画面**: https://marketplace.visualstudio.com/manage/publishers/<publisher>

例:
- https://marketplace.visualstudio.com/items?itemName=hiroyannnn.vscode-github-issues-sync

### 3. 公開オプション

特定のファイルを追加で含める場合：

```bash
vsce publish --baseContentUrl https://github.com/hiroyannnn/vscode-github-issues-sync/raw/main/ --baseImagesUrl https://github.com/hiroyannnn/vscode-github-issues-sync/raw/main/
```

---

## 公開後の更新

### 1. バージョンアップの流れ

1. **コード修正**: 機能追加やバグ修正
2. **テスト**: `npm test` で全テストを実行
3. **CHANGELOG.md 更新**: 変更内容を記録
4. **バージョン更新**: package.json の version を更新
5. **コミット**: 変更をコミット

```bash
# バージョン更新例
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.1 → 0.2.0
npm version major  # 0.2.0 → 1.0.0
```

6. **タグ作成**: Git タグを作成

```bash
git tag v0.1.1
git push && git push --tags
```

7. **公開**: Marketplace に公開

```bash
vsce publish
```

### 2. 自動公開（GitHub Actions）

`.github/workflows/publish.yml` を作成して自動化：

```yaml
name: Publish Extension

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm test
      - run: npm run compile
      - name: Publish to VS Code Marketplace
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
        run: |
          npm install -g @vscode/vsce
          vsce publish -p $VSCE_PAT
```

GitHub Secrets に `VSCE_PAT` を追加：
1. GitHub リポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `VSCE_PAT`, Value: Azure DevOps の Personal Access Token

---

## トラブルシューティング

### パッケージングエラー

#### `ERROR  Missing publisher name`

**原因**: package.json に publisher フィールドがない

**解決**:
```json
{
  "publisher": "your-publisher-name"
}
```

#### `ERROR  Make sure to edit the README.md file before you publish your extension`

**原因**: README.md がデフォルトのままか、内容が不十分

**解決**: README.md を充実させる（スクリーンショット、詳細な説明など）

#### `WARNING  Missing 'repository' field in package.json`

**原因**: repository フィールドがない

**解決**:
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/hiroyannnn/vscode-github-issues-sync.git"
  }
}
```

### 公開エラー

#### `ERROR  Failed request: (401) Unauthorized`

**原因**: Personal Access Token が無効または期限切れ

**解決**:
1. Azure DevOps で新しい PAT を作成
2. `vsce login <publisher>` で再ログイン

#### `ERROR  Extension '<publisher>.<name>' already exists`

**原因**: 同じ名前の拡張機能が既に存在

**解決**:
1. package.json の name を変更
2. または既存の拡張機能を更新（バージョンアップ）

### バンドルサイズの警告

#### `WARNING  This extension consists of N files, out of which N are JavaScript files. For performance reasons, you should bundle your extension`

**原因**: ファイル数が多すぎる（webpack でバンドルすべき）

**解決**: webpack でバンドル
```bash
npm install --save-dev webpack webpack-cli ts-loader
npm run package  # webpack --mode production
```

---

## ベストプラクティス

### 1. バージョニング

Semantic Versioning (semver) に従う：
- **Major (1.0.0)**: 破壊的変更
- **Minor (0.1.0)**: 新機能追加（後方互換性あり）
- **Patch (0.0.1)**: バグ修正

### 2. CHANGELOG の管理

リリースごとに CHANGELOG.md を更新：

```markdown
## [0.1.1] - 2024-01-15

### Fixed
- Issue #123: 同期エラーの修正

### Changed
- パフォーマンス改善
```

### 3. プレリリース版

ベータ版を公開する場合：

```bash
vsce publish --pre-release
```

package.json:
```json
{
  "version": "0.1.0-beta.1"
}
```

### 4. ドキュメントの充実

- README.md: スクリーンショット、GIF、詳細な説明
- CHANGELOG.md: 各バージョンの変更履歴
- LICENSE: ライセンス情報
- CONTRIBUTING.md: 貢献ガイド

### 5. CI/CD の活用

GitHub Actions で自動テスト・公開：
- Pull Request: テスト自動実行
- Release: 自動公開

---

## リソース

### 公式ドキュメント

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)

### ツール

- [vsce (VS Code Extension Manager)](https://github.com/microsoft/vscode-vsce)
- [Azure DevOps](https://dev.azure.com/)
- [VS Code Marketplace](https://marketplace.visualstudio.com/)

### コミュニティ

- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [VS Code Extension Development Community](https://github.com/microsoft/vscode-discussions)

---

## チェックリスト: 公開前の最終確認

- [ ] すべてのテストがパス
- [ ] Lint エラーなし
- [ ] README.md が充実（スクリーンショット、詳細な説明）
- [ ] CHANGELOG.md が更新されている
- [ ] LICENSE ファイルが存在
- [ ] package.json のメタデータが正確（name, displayName, description, version, publisher, repository, keywords）
- [ ] アイコンが設定されている（128x128 PNG）
- [ ] .vscodeignore が適切に設定されている
- [ ] ローカルで .vsix をインストールして動作確認
- [ ] Publisher アカウントが作成されている
- [ ] Personal Access Token が有効
- [ ] バージョン番号が適切（semver）
- [ ] Git タグが作成されている
- [ ] GitHub Release が作成されている（オプション）

---

## まとめ

VS Code Marketplace への公開手順：

1. **準備**: テスト、Lint、ドキュメント整備
2. **Publisher 作成**: Azure DevOps でアカウントと PAT 作成
3. **パッケージング**: `vsce package` で .vsix 生成
4. **ローカルテスト**: .vsix をインストールして動作確認
5. **公開**: `vsce publish` で Marketplace に公開
6. **更新**: バージョンアップして再公開

公開後は Marketplace で検索可能になり、ユーザーが VS Code から直接インストールできるようになります。

Happy Publishing! 🚀
