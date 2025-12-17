# GitHub Issues Sync for VS Code

English | [日本語](README.ja.md)

A VS Code extension that syncs GitHub Issues to local Markdown files so you can reference them offline and use them as context for AI code agents.

## Features

- **Auto sync**: Sync GitHub Issues at a configurable interval (5–1440 minutes)
- **Manual sync**: Run a sync instantly from the Command Palette
- **Markdown output**: Saves issues as Markdown with YAML front matter (AI/LLM-friendly)
- **Tree View**: Browse issues in the VS Code sidebar and open details on click
- **Authentication**: Uses VS Code GitHub authentication (with PAT fallback)
- **Offline friendly**: Read synced issues without a network connection
- **Filtering**: Flexible filters by state, labels, milestones, and time range

## Installation

### From the VS Code Marketplace (once published)

1. Open VS Code
2. Open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "GitHub Issues Sync"
4. Click "Install"

### Install from source (development)

```bash
git clone https://github.com/hiroyannnn/vscode-github-issues-sync.git
cd vscode-github-issues-sync
npm install
npm run compile
```

Press `F5` to start the Extension Development Host.

## Usage

### Initial setup

1. Open a workspace that contains your GitHub repository
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run "GitHub Issues Sync: Configure"
4. Adjust settings as needed:
   - `enableAutoSync`: Enable auto sync (default: false)
   - `syncInterval`: Sync interval in minutes (default: 60)
   - `maxIssues`: Max number of issues to sync (default: 100)
   - `includeClosedIssues`: Include closed issues (default: false)

### Manual sync

1. Open the Command Palette
2. Run "GitHub Issues Sync: Sync Now"
3. You’ll see progress notifications and a completion message

### Browse in the Tree View

1. Click the "GitHub Issues" icon in the Activity Bar
2. The issue list appears
3. Click an issue to open its Markdown file

### Synced files

Synced issues are stored in `.vscode/github-issues/` by default (configurable):

```
.vscode/github-issues/
├── issue-1.md
├── issue-2.md
└── ...
```

Each issue is saved like this:

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

Issue body goes here.

## Comments

### @commenter1

Comment text...
```

## Settings

### `githubIssuesSync.enableAutoSync`

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Enable automatic synchronization

### `githubIssuesSync.syncInterval`

- **Type**: `number`
- **Default**: `60`
- **Range**: `5`–`1440` (minutes)
- **Description**: Auto-sync interval

### `githubIssuesSync.maxIssues`

- **Type**: `number`
- **Default**: `100`
- **Range**: `1`–`1000`
- **Description**: Maximum number of issues to sync

### `githubIssuesSync.includeClosedIssues`

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Include closed issues in synchronization

### `githubIssuesSync.syncPeriod`

- **Type**: `string`
- **Default**: `6months`
- **Options**: `3months` | `6months` | `1year` | `all`
- **Description**: Time period for issue synchronization

### `githubIssuesSync.syncStrategy`

- **Type**: `string`
- **Default**: `incremental`
- **Options**: `full` | `incremental` | `lazy`
- **Description**:
  - `full`: Full sync every time
  - `incremental`: Only sync changes since the last sync
  - `lazy`: Sync metadata only and load details on demand

### `githubIssuesSync.labelFilter`

- **Type**: `array<string>`
- **Default**: `[]`
- **Description**: Sync only issues with specific labels (empty = all labels)

### `githubIssuesSync.milestoneFilter`

- **Type**: `array<string>`
- **Default**: `[]`
- **Description**: Sync only issues with specific milestones (empty = all milestones)

### `githubIssuesSync.storageDirectory`

- **Type**: `string`
- **Default**: `.vscode/github-issues`
- **Description**: Directory to store synced issues (relative paths are workspace-based; `~` is expanded)

### `githubIssuesSync.personalAccessToken`

- **Type**: `string`
- **Default**: `` (empty string)
- **Description**: GitHub Personal Access Token (fallback if VS Code authentication fails)

## Commands

### `GitHub Issues Sync: Sync Now`

Sync issues immediately. Progress and results are shown in notifications.

### `GitHub Issues Sync: Configure`

Open the extension settings.

## Authentication

The extension tries authentication in this order:

1. **VS Code GitHub authentication** (recommended)
   - You’ll be prompted on first use
   - Requires the `repo` scope

2. **Personal Access Token (PAT) from settings**
   - `githubIssuesSync.personalAccessToken`

3. **Personal Access Token (PAT) from SecretStorage**
   - A PAT stored in VS Code SecretStorage

If you use a PAT, you typically need:
- `repo` (for private repositories)
- `public_repo` (for public repositories only)

## Troubleshooting

### Authentication fails

- Re-authenticate GitHub in VS Code
- Or add a PAT in settings

### Issues don’t sync

- Ensure the workspace is the root of a GitHub repository
- Ensure `origin` is configured in `.git/config`
- Check if you’ve hit GitHub API rate limits (see console logs)

### Auto sync doesn’t run

- Ensure `githubIssuesSync.enableAutoSync` is set to `true`
- Try restarting VS Code

## Development

### Requirements

- Node.js 18+
- npm 8+

### Setup

```bash
npm install
```

### Build

```bash
npm run compile
```

### Test

```bash
npm test
```

### Lint & format

```bash
npm run lint
npm run format
```

### Debug

1. Open the project in VS Code
2. Press `F5` to start the Extension Development Host
3. Set breakpoints and debug

## License

MIT

## Author

hiroyannnn

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Support

Please report issues and feature requests via GitHub Issues:
https://github.com/hiroyannnn/vscode-github-issues-sync/issues
