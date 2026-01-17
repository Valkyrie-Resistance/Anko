export interface SchemaInfo {
  name: string
}

export interface TableInfo {
  name: string
  schema: string
  table_type: string
  row_count?: number
}

export interface ColumnDetail {
  name: string
  data_type: string
  nullable: boolean
  key?: string
  default_value?: string
  extra?: string
}
