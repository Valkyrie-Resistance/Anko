export interface TreeState {
  // Expansion state
  isExpanded: boolean
  expandedDatabases: Set<string>
  expandedSchemas: Set<string>
  expandedTables: Set<string>

  // Loading state
  loadingDatabases: boolean
  loadingSchemas: Set<string>
  loadingTables: Set<string>
  loadingColumns: Set<string>

  // Loaded state (to prevent duplicate fetches)
  loadedDatabases: boolean
  loadedSchemas: Set<string>
  loadedTables: Set<string>
  loadedColumns: Set<string>
}

export const initialTreeState: TreeState = {
  isExpanded: false,
  expandedDatabases: new Set(),
  expandedSchemas: new Set(),
  expandedTables: new Set(),
  loadingDatabases: false,
  loadingSchemas: new Set(),
  loadingTables: new Set(),
  loadingColumns: new Set(),
  loadedDatabases: false,
  loadedSchemas: new Set(),
  loadedTables: new Set(),
  loadedColumns: new Set(),
}

export type TreeAction =
  | { type: 'TOGGLE_CONNECTION' }
  | { type: 'TOGGLE_DATABASE'; database: string }
  | { type: 'TOGGLE_SCHEMA'; schemaKey: string }
  | { type: 'TOGGLE_TABLE'; tableKey: string }
  | { type: 'SET_LOADING_DATABASES'; loading: boolean }
  | { type: 'SET_LOADING_SCHEMAS'; database: string; loading: boolean }
  | { type: 'SET_LOADING_TABLES'; cacheKey: string; loading: boolean }
  | { type: 'SET_LOADING_COLUMNS'; key: string; loading: boolean }
  | { type: 'SET_LOADED_DATABASES' }
  | { type: 'SET_LOADED_SCHEMAS'; database: string }
  | { type: 'SET_LOADED_TABLES'; cacheKey: string }
  | { type: 'SET_LOADED_COLUMNS'; key: string }

export function treeReducer(state: TreeState, action: TreeAction): TreeState {
  switch (action.type) {
    case 'TOGGLE_CONNECTION':
      return { ...state, isExpanded: !state.isExpanded }

    case 'TOGGLE_DATABASE': {
      const newExpanded = new Set(state.expandedDatabases)
      if (newExpanded.has(action.database)) {
        newExpanded.delete(action.database)
      } else {
        newExpanded.add(action.database)
      }
      return { ...state, expandedDatabases: newExpanded }
    }

    case 'TOGGLE_SCHEMA': {
      const newExpanded = new Set(state.expandedSchemas)
      if (newExpanded.has(action.schemaKey)) {
        newExpanded.delete(action.schemaKey)
      } else {
        newExpanded.add(action.schemaKey)
      }
      return { ...state, expandedSchemas: newExpanded }
    }

    case 'TOGGLE_TABLE': {
      const newExpanded = new Set(state.expandedTables)
      if (newExpanded.has(action.tableKey)) {
        newExpanded.delete(action.tableKey)
      } else {
        newExpanded.add(action.tableKey)
      }
      return { ...state, expandedTables: newExpanded }
    }

    case 'SET_LOADING_DATABASES':
      return { ...state, loadingDatabases: action.loading }

    case 'SET_LOADING_SCHEMAS': {
      const newLoading = new Set(state.loadingSchemas)
      if (action.loading) {
        newLoading.add(action.database)
      } else {
        newLoading.delete(action.database)
      }
      return { ...state, loadingSchemas: newLoading }
    }

    case 'SET_LOADING_TABLES': {
      const newLoading = new Set(state.loadingTables)
      if (action.loading) {
        newLoading.add(action.cacheKey)
      } else {
        newLoading.delete(action.cacheKey)
      }
      return { ...state, loadingTables: newLoading }
    }

    case 'SET_LOADING_COLUMNS': {
      const newLoading = new Set(state.loadingColumns)
      if (action.loading) {
        newLoading.add(action.key)
      } else {
        newLoading.delete(action.key)
      }
      return { ...state, loadingColumns: newLoading }
    }

    case 'SET_LOADED_DATABASES':
      return { ...state, loadedDatabases: true }

    case 'SET_LOADED_SCHEMAS': {
      const newLoaded = new Set(state.loadedSchemas)
      newLoaded.add(action.database)
      return { ...state, loadedSchemas: newLoaded }
    }

    case 'SET_LOADED_TABLES': {
      const newLoaded = new Set(state.loadedTables)
      newLoaded.add(action.cacheKey)
      return { ...state, loadedTables: newLoaded }
    }

    case 'SET_LOADED_COLUMNS': {
      const newLoaded = new Set(state.loadedColumns)
      newLoaded.add(action.key)
      return { ...state, loadedColumns: newLoaded }
    }

    default:
      return state
  }
}
