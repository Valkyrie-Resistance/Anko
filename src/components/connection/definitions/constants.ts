import type { DatabaseDriver } from '@/entities'

export const DEFAULT_PORTS: Record<DatabaseDriver, number> = {
  mysql: 3306,
  postgresql: 5432,
}

export const DEFAULT_USERS: Record<DatabaseDriver, string> = {
  mysql: 'root',
  postgresql: 'postgres',
}
