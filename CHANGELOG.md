# Changelog

All notable changes to Anko will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- CHANGELOG_INSERT_MARKER -->
## [v0.2.1] - 2026-01-18

### Bug Fixes

- Resolve TypeScript errors in release build

## [v0.2.0] - 2026-01-18

### Highlights
Major redesign of the right sidebar with persistent context and new query management features. Anko now saves your query history and lets you organize frequently-used queries in your workspace.

### New Features
- **Right Sidebar Redesign**: View table details, row information, and Zod schema in organized tabs with resizable panels
- **Saved Queries**: Save and organize your frequently-used queries within your workspace
- **Query History**: Automatic 30-day query history retention for easy access to past queries
- **Workspace Management**: Add context menu with edit and delete options for your saved queries and workspaces
- **Persistent Context**: Table selections now persist when navigating between rows and cells

### Bug Fixes
- Fix MySQL type handling for TIMESTAMP, DECIMAL, and JSON columns
- Fix row details duplication and implement proper custom tabs layout
- Fix nested button error and simplify tabs layout
- Fix 'Open in Editor' functionality and add Save Query button
- Hide Developer Tools in production builds
- Disable right-click and reload actions in production

## [v0.1.2] - 2026-01-18

### Highlights

This release focuses on improving our development and release processes to ensure more reliable updates.

### Under the Hood

Improve CI/CD pipeline with automated checks on pull requests and enhanced release validation process.

## [v0.1.1] - 2026-01-18

### Highlights
This patch release resolves critical TypeScript compilation errors to ensure stable production builds.

### Bug Fixes
- Fix TypeScript errors in production build

## [v0.1.0] - 2026-01-18

### Highlights
Anko's initial release brings a fully functional SQL desktop client with core database management capabilities. This version establishes the foundation for efficient SQL query execution and database exploration.

### New Features
- Auto-update functionality to keep Anko current with the latest improvements
- Commitlint integration for maintaining code quality standards

