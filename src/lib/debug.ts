/**
 * Structured logging utility with namespace filtering and log levels.
 * In production builds, debug/info calls are no-ops.
 */

const IS_DEV = import.meta.env.DEV

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * Gets enabled namespaces from localStorage.
 * Format: comma-separated list (e.g., "tauri,store,app")
 * Special value "*" enables all namespaces.
 */
function getEnabledNamespaces(): Set<string> | 'all' {
  if (typeof window === 'undefined') return new Set()
  const value = localStorage.getItem('anko-debug')
  if (!value) return new Set()
  if (value === '*' || value === 'true') return 'all'
  return new Set(
    value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
}

/**
 * Checks if a namespace is enabled for logging.
 */
function isNamespaceEnabled(namespace: string): boolean {
  const enabled = getEnabledNamespaces()
  if (enabled === 'all') return true
  return enabled.has(namespace)
}

/**
 * Structured Logger class with namespace and log level support.
 */
export class Logger {
  constructor(private namespace: string) {}

  private log(level: LogLevel, ...args: unknown[]): void {
    // In production, only warn and error are logged
    if (!IS_DEV && LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY.warn) {
      return
    }

    // Check namespace filtering (always allow warn/error in dev)
    if (IS_DEV && LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY.warn) {
      if (!isNamespaceEnabled(this.namespace)) {
        return
      }
    }

    const prefix = `[${this.namespace}]`
    const consoleMethod = console[level] || console.log

    consoleMethod(prefix, ...args)
  }

  debug(...args: unknown[]): void {
    this.log('debug', ...args)
  }

  info(...args: unknown[]): void {
    this.log('info', ...args)
  }

  warn(...args: unknown[]): void {
    this.log('warn', ...args)
  }

  error(...args: unknown[]): void {
    this.log('error', ...args)
  }
}

/**
 * Creates a namespaced logger instance.
 * @param namespace - The namespace for log messages (e.g., 'tauri', 'store', 'app')
 */
export function createLogger(namespace: string): Logger {
  return new Logger(namespace)
}

// Pre-configured loggers for common namespaces
export const tauriLogger = createLogger('tauri')
export const storeLogger = createLogger('store')
export const appLogger = createLogger('app')

// Component-specific loggers
export const editorLogger = createLogger('editor') // SQL editor
export const tableLogger = createLogger('table') // DataTable/results
export const filterLogger = createLogger('filter') // FilterBar
export const tabLogger = createLogger('tab') // Tab management
export const treeLogger = createLogger('tree') // DatabaseTree
export const editLogger = createLogger('edit') // Cell editing

/**
 * Creates a timer for measuring operation duration.
 * @param logger - The logger instance to use
 * @param operation - Description of the operation being timed
 */
export function createTimer(logger: Logger, operation: string) {
  const start = performance.now()
  return {
    end: (extra?: Record<string, unknown>) => {
      const duration = Math.round(performance.now() - start)
      logger.debug(`${operation} completed`, { duration, ...extra })
    },
    fail: (error: unknown) => {
      const duration = Math.round(performance.now() - start)
      logger.error(`${operation} failed`, { duration, error })
    },
  }
}

/**
 * Legacy debug function for backwards compatibility.
 * Logs to the 'app' namespace at debug level.
 */
export const debug = IS_DEV
  ? (...args: unknown[]) => {
      if (isNamespaceEnabled('app') || getEnabledNamespaces() === 'all') {
        console.log('[app]', ...args)
      }
    }
  : () => {}

// Keep console.error available for error logging in production
export type { console }
