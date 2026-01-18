/**
 * Minimal debug app to isolate performance issues.
 * Tests components incrementally to find the freeze culprit.
 *
 * TEST 10: Actual TableTabContent component
 */
import { useEffect } from 'react'
import { TableTabContent } from '@/components/layout/tabs/TableTabContent'
import { connect } from '@/lib/tauri'
import { useConnectionStore } from '@/stores/connection'

// MySQL 8 connection config
const MYSQL_CONFIG = {
  name: 'Debug MySQL',
  host: 'localhost',
  port: 3306,
  username: 'anko',
  password: 'anko123',
  database: 'testdb',
  driver: 'mysql' as const,
}

let debugRenderCount = 0

export function DebugApp() {
  debugRenderCount++
  console.log('[DebugApp] render #', debugRenderCount)

  const queryTabs = useConnectionStore((s) => s.queryTabs)
  const activeTabId = useConnectionStore((s) => s.activeTabId)
  const addTableTab = useConnectionStore((s) => s.addTableTab)
  const addActiveConnection = useConnectionStore((s) => s.addActiveConnection)

  // Connect and create table tab on mount
  useEffect(() => {
    async function init() {
      try {
        console.log('[DebugApp] Connecting to MySQL...')
        const connId = await connect(MYSQL_CONFIG)
        console.log('[DebugApp] Connected:', connId)

        // Add connection to store
        const connectionInfoId = `conn-${Date.now()}`
        addActiveConnection({
          id: connectionInfoId,
          connectionId: connId,
          info: MYSQL_CONFIG,
        })

        // Create table tab (this will trigger TableTabContent to load data)
        addTableTab(connectionInfoId, connId, 'testdb', undefined, 'products')
        console.log('[DebugApp] Table tab created')
      } catch (e) {
        console.error('[DebugApp] Error:', e)
      }
    }
    init()
  }, [addActiveConnection, addTableTab])

  console.log('[DebugApp] render', { activeTabId, tabCount: queryTabs.length })

  return (
    <div className="bg-black min-h-screen text-white flex flex-col">
      <div className="p-4">
        <h1 className="text-xl mb-4">Debug App - TEST 10: TableTabContent</h1>
        <div className="mb-4 p-3 bg-zinc-900 rounded text-sm">
          <div>Active Tab: {activeTabId || 'none'}</div>
        </div>
      </div>

      {/* Render actual TableTabContent */}
      {activeTabId && (
        <div className="flex-1 min-h-0">
          <TableTabContent tabId={activeTabId} />
        </div>
      )}
    </div>
  )
}

export default DebugApp
