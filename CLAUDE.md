# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Anko is a cross-platform SQL desktop client built with Tauri 2, Rust, React, and shadcn/ui. It currently supports MySQL with an architecture designed for adding additional database connectors.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS v4
- **Backend**: Rust (Tauri 2)
- **Package Manager**: Bun
- **Database Drivers**: sqlx (async, compile-time queries)
- **Local Storage**: SQLite (encrypted connection storage)
- **State Management**: Zustand

## Common Commands

```bash
# Install dependencies
bun install

# Run in development mode (launches Tauri app with hot reload)
bun run tauri:dev

# Build for production
bun run tauri:build

# Type check frontend only
bun run tsc --noEmit

# Build frontend only (for testing)
bun run build

# Check Rust code
cd src-tauri && cargo check

# Run Rust tests
cd src-tauri && cargo test

# Add shadcn/ui component
bunx --bun shadcn@latest add <component-name>
```

## Architecture

### Directory Structure

```
anko/
├── src/                          # React frontend
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── connection/           # Connection manager UI
│   │   ├── editor/               # Query editor
│   │   ├── schema/               # Schema browser (database tree)
│   │   ├── results/              # Query results table
│   │   └── layout/               # App layout components
│   ├── stores/                   # Zustand state stores
│   ├── types/                    # TypeScript interfaces
│   ├── lib/                      # Utilities and Tauri invoke wrappers
│   └── App.tsx
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs                # App entry, command registration
│   │   ├── commands/             # Tauri commands (exposed to frontend)
│   │   ├── db/                   # Database abstraction layer
│   │   │   ├── connector.rs      # DatabaseConnector trait
│   │   │   └── mysql.rs          # MySQL implementation
│   │   ├── storage/              # Local SQLite for saved connections
│   │   │   ├── connections.rs    # CRUD operations
│   │   │   └── encryption.rs     # AES-GCM password encryption
│   │   ├── state.rs              # AppState management
│   │   └── error.rs              # Error types
│   ├── Cargo.toml
│   └── tauri.conf.json
```

### Frontend-Backend Communication

The frontend communicates with Rust via Tauri commands using `invoke()`. Type-safe wrappers are in `src/lib/tauri.ts`:

```typescript
// Example: Execute a query
import { executeQuery } from "@/lib/tauri";
const result = await executeQuery(connectionId, "SELECT * FROM users");
```

### Adding a New Database Connector

1. Create a new file in `src-tauri/src/db/` (e.g., `postgres.rs`)
2. Implement the `DatabaseConnector` trait from `connector.rs`
3. Add the driver variant to `DatabaseDriver` enum in `connector.rs`
4. Update connection logic in `state.rs` to handle the new driver
5. Update frontend types in `src/types/index.ts`

### State Management

- **Rust side**: `AppState` in `state.rs` manages active connections (RwLock<HashMap>) and storage
- **React side**: Zustand store in `stores/connection-store.ts` manages UI state (tabs, connections, query results)

### Key Patterns

- All database operations are async using sqlx
- Passwords are encrypted with AES-256-GCM before storage
- Each active connection has a UUID identifier for frontend reference
- Query tabs are associated with connection IDs

## Critical Coding Patterns

### Zustand Selector Best Practices

**NEVER call store functions during render** - this causes infinite re-render loops:

```typescript
// BAD - causes infinite loops
const hasPendingChanges = useStore((s) => s.hasPendingChanges)
const getPendingChanges = useStore((s) => s.getPendingChanges)
const result = getPendingChanges(tabId)  // Called during render!
const hasChanges = hasPendingChanges(tabId)  // Called during render!

// GOOD - derive state using useMemo from a stable selector
const tab = useStore((s) => s.queryTabs.find((t) => t.id === tabId))
const pendingChanges = useMemo(
  () => tab?.editState?.pendingChanges ?? [],
  [tab?.editState?.pendingChanges]
)
const hasChanges = pendingChanges.length > 0
```

**Why this matters**: Function selectors return new references each time. When used in `useCallback` dependencies, they cause callbacks to be recreated, which triggers `useEffect` re-runs, causing infinite loops.

### Stabilizing useCallback Dependencies

When using object properties from state in `useCallback`, extract primitive values first:

```typescript
// BAD - tab object changes reference on every store update
const loadPage = useCallback(async () => {
  if (!tab || !connection) return
  await executeQuery(connection.connectionId, tab.tableName)
}, [tab, connection])  // These change every render!

// GOOD - extract stable primitive values
const tableName = tab?.tableName
const connectionId = connection?.connectionId

const loadPage = useCallback(async () => {
  if (!connectionId || !tableName) return
  await executeQuery(connectionId, tableName)
}, [connectionId, tableName])  // Only changes when actual values change
```

### useEffect Dependencies with Refs

Use refs for values you need to access but don't want to react to:

```typescript
// Use ref for values that shouldn't trigger re-renders
const filtersRef = useRef(filters)
useEffect(() => {
  filtersRef.current = filters
}, [filters])

// In callbacks, use the ref instead of the value directly
const loadPage = useCallback(async (page: number) => {
  const activeFilters = filtersRef.current
  // ... use activeFilters
}, [/* no filters dependency needed */])
```

### Table Edit State Pattern

Table editing uses a pending changes pattern:
- `PendingRowChange` tracks inserts, updates, and deletes
- Changes are stored in `tab.editState.pendingChanges`
- Commit executes SQL statements: DELETE first, then UPDATE, then INSERT
- New rows are displayed at top of table with green styling
- Modified cells show amber styling

## Configuration Files

- `src-tauri/tauri.conf.json` - Tauri configuration (window size, app identifier)
- `components.json` - shadcn/ui configuration
- `vite.config.ts` - Vite configuration with Tailwind and path aliases

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.