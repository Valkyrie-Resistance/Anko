import { Plus, X } from 'lucide-react'
import { memo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { filterLogger } from '@/lib/debug'
import type { ColumnInfo, FilterCondition, FilterOperator } from '@/types'

interface FilterBarProps {
  columns: ColumnInfo[]
  filters: FilterCondition[]
  onFiltersChange: (filters: FilterCondition[]) => void
}

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '!=' },
  { value: 'like', label: 'LIKE' },
  { value: 'not_like', label: 'NOT LIKE' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'is_null', label: 'IS NULL' },
  { value: 'is_not_null', label: 'IS NOT NULL' },
]

export const FilterBar = memo(function FilterBar({ columns, filters, onFiltersChange }: FilterBarProps) {
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [selectedOperator, setSelectedOperator] = useState<FilterOperator>('equals')
  const [filterValue, setFilterValue] = useState('')

  const isNullOperator = selectedOperator === 'is_null' || selectedOperator === 'is_not_null'

  const handleAddFilter = () => {
    if (!selectedColumn) return
    if (!isNullOperator && !filterValue) return

    const newFilter: FilterCondition = {
      column: selectedColumn,
      operator: selectedOperator,
      value: isNullOperator ? '' : filterValue,
    }

    filterLogger.debug('filter added', { column: selectedColumn, operator: selectedOperator, value: isNullOperator ? null : filterValue })
    onFiltersChange([...filters, newFilter])
    setSelectedColumn('')
    setSelectedOperator('equals')
    setFilterValue('')
  }

  const handleRemoveFilter = (index: number) => {
    const removedFilter = filters[index]
    filterLogger.debug('filter removed', { column: removedFilter.column, operator: removedFilter.operator })
    onFiltersChange(filters.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddFilter()
    }
  }

  const getOperatorLabel = (op: FilterOperator) => {
    return OPERATORS.find((o) => o.value === op)?.label || op
  }

  if (columns.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-900 bg-zinc-950">
      {/* Add filter controls - takes remaining space */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <Select value={selectedColumn} onValueChange={(v) => setSelectedColumn(v ?? '')}>
          <SelectTrigger className="h-7 w-32 text-xs bg-zinc-900 border-zinc-800 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-950 border-zinc-800">
            {columns.map((col) => (
              <SelectItem key={col.name} value={col.name} className="text-xs">
                {col.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedOperator}
          onValueChange={(v) => setSelectedOperator(v as FilterOperator)}
        >
          <SelectTrigger className="h-7 w-24 text-xs bg-zinc-900 border-zinc-800 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-950 border-zinc-800">
            {OPERATORS.map((op) => (
              <SelectItem key={op.value} value={op.value} className="text-xs">
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!isNullOperator && (
          <Input
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Value"
            className="h-7 flex-1 min-w-24 text-xs bg-zinc-900 border-zinc-800"
          />
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddFilter}
          disabled={!selectedColumn || (!isNullOperator && !filterValue)}
          className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 disabled:opacity-30 shrink-0"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Active filters */}
      {filters.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          {filters.map((filter, index) => (
            <div
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs"
            >
              <span className="text-zinc-300">{filter.column}</span>
              <span className="text-zinc-500">{getOperatorLabel(filter.operator)}</span>
              {filter.value && <span className="text-primary">'{filter.value}'</span>}
              <button
                type="button"
                onClick={() => handleRemoveFilter(index)}
                className="ml-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
