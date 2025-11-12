# Changelog

All notable changes to the "GitHub Issues Sync" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Phase 1: Project Setup
- Initial project structure with TypeScript, webpack, Jest, ESLint, and Prettier configuration
- Package.json with extension manifest and dependencies
- VS Code extension configuration with views and commands
- Build and test infrastructure

#### Phase 2: Interface Definitions
- Core type definitions for Issue, Label, User, Milestone, Comment
- RepositoryInfo interface for Git repository information
- SyncOptions and SyncState interfaces for sync configuration and progress tracking
- Service interfaces (IAuthService, IGitHubService, IStorageService, ISyncService)

#### Phase 3: Git Utilities
- GitUtils class for parsing GitHub repository information from .git/config
- Support for SSH and HTTPS remote URL formats
- Cross-platform temporary directory handling with os.tmpdir()
- Comprehensive unit and integration tests (13 tests)

#### Phase 4: GitHub Authentication
- AuthService with three-tier authentication fallback:
  1. VS Code built-in GitHub authentication (recommended)
  2. Personal Access Token from VS Code configuration
  3. Personal Access Token from SecretStorage
- Secure token storage and retrieval
- Unit tests with VS Code API mocking (19 tests)

#### Phase 5: GitHub API Client
- GitHubService for GitHub API integration using @octokit/rest
- Type-safe API calls with full TypeScript type inference (no `any` types)
- fetchIssues: Fetch issues with pagination and filtering
- fetchIssueDetails: Fetch issue comments
- getRateLimit: Check GitHub API rate limit status
- Comprehensive unit tests (19 tests)

#### Phase 6: Storage Service
- StorageService for local issue storage in Markdown format
- YAML front matter generation using gray-matter
- SHA-256 based change detection for incremental sync
- Markdown conversion with proper metadata handling
- Unit tests for Markdown conversion and file operations (37 tests)

#### Phase 7: Sync Service
- SyncService orchestrating GitHubService and StorageService
- Full synchronization strategy
- Incremental synchronization with change detection
- Progress callback support for UI updates
- Cancellation support for long-running sync operations
- Error handling and reporting
- Unit tests for sync scenarios (47 tests)

#### Phase 8: Tree View Provider
- IssuesTreeProvider implementing VS Code TreeDataProvider interface
- Issue list display in VS Code Explorer sidebar
- Tree item with icons, tooltips, and click-to-open functionality
- Issue filtering and search capabilities
- Statistics display (open/closed issue counts)
- Unit tests for tree view functionality (60 tests)

#### Phase 9: Command Integration
- Extension activation with service initialization
- `githubIssuesSync.syncNow` command for manual synchronization
- `githubIssuesSync.configure` command to open settings
- Progress notification with cancellation support
- Error handling and user feedback
- Tree View registration and refresh
- Comprehensive integration tests (71 tests)

#### Phase 10: Auto Sync
- Automatic synchronization with configurable interval (5-1440 minutes)
- `githubIssuesSync.enableAutoSync` setting (default: false)
- `githubIssuesSync.syncInterval` setting (default: 15 minutes)
- Configuration change monitoring with hot reload
- Timer management with proper cleanup on deactivation
- Background sync without progress notifications
- Unit tests for auto sync timer behavior (73 tests)

#### Phase 11: Documentation
- Comprehensive README.md with:
  - Feature overview and installation instructions
  - Usage guide for manual and automatic sync
  - Configuration reference
  - Authentication setup
  - Troubleshooting section
  - Development setup
- CONTRIBUTING.md with:
  - Development environment setup
  - Branch strategy and workflow
  - Commit message conventions (Conventional Commits)
  - TDD workflow and testing guidelines
  - Code style guidelines
  - Pull request checklist
  - Architecture overview
  - Bug reporting guidelines
- CHANGELOG.md for version history tracking

### Changed

- Activation events changed from `onStartupFinished` to command-based for better performance
- syncInterval maximum constraint added (1440 minutes = 24 hours)
- Git config regex improved to handle newlines with `/s` flag
- TypeScript strict mode enabled throughout the project
- All `any` types eliminated in favor of type inference

### Fixed

- Git config parsing now handles URLs on separate lines
- Cross-platform compatibility using os.tmpdir() instead of hardcoded /tmp
- YAML front matter generation properly filters undefined values
- VS Code API mocking comprehensive coverage for all used APIs
- Label.name undefined handling with fallback to empty string
- ExtensionContext mock includes all required properties

### Security

- Secure token storage using VS Code SecretStorage
- GitHub PAT handling with multiple secure fallback mechanisms
- No hardcoded credentials or sensitive information

## [0.0.1] - TBD

### Added

- Initial release (pending)

---

## Development Notes

### Testing

- All 73 tests passing
- Test coverage includes:
  - Unit tests for all services
  - Integration tests for Git utilities
  - Extension activation and command tests
  - Auto sync timer tests with fake timers
  - Tree view provider tests

### Architecture

```
Models (Issue, SyncOptions, SyncState)
    ↓
Utils (GitUtils)
    ↓
Services Layer:
  - AuthService (authentication)
  - GitHubService (API client)
  - StorageService (local persistence)
  - SyncService (orchestration)
    ↓
Views Layer:
  - IssuesTreeProvider (UI)
    ↓
Commands Layer (extension.ts):
  - syncNow (manual sync with progress)
  - configure (open settings)
  - Auto sync timer
```

### Technology Stack

- TypeScript 5.x with strict mode
- VS Code Extension API
- @octokit/rest for GitHub API
- gray-matter for Markdown/YAML processing
- Jest for testing
- ESLint and Prettier for code quality
- webpack for bundling

### Development Workflow

- Test-Driven Development (TDD) approach throughout
- Interface-driven design with dependency injection
- Comprehensive mocking for VS Code APIs
- Cross-platform compatibility (Windows, macOS, Linux)
