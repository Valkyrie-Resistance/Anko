import type { Cell } from '@tanstack/react-table'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { editLogger } from '@/lib/debug'
import { cn } from '@/lib/utils'
import { formatCellValue } from './utils'

interface EditableCellProps {
  cell: Cell<Record<string, unknown>, unknown>
  isModified: boolean
  isPrimaryKey: boolean
  isNewRow?: boolean
  onValueChange: (newValue: unknown) => void
}

export function EditableCell({
  cell,
  isModified,
  isPrimaryKey,
  isNewRow = false,
  onValueChange,
}: EditableCellProps) {
  const value = cell.getValue()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // For new rows, allow editing all columns (including primary keys)
  const canEdit = isNewRow || !isPrimaryKey

  const startEditing = useCallback(() => {
    if (!canEdit) return
    const columnName = cell.column.id
    editLogger.debug('cell edit started', { column: columnName, currentValue: value })
    setEditValue(value === null ? '' : String(value))
    setIsEditing(true)
  }, [value, canEdit, cell.column.id])

  const cancelEditing = useCallback(() => {
    setIsEditing(false)
    setEditValue('')
  }, [])

  const commitEdit = useCallback(() => {
    setIsEditing(false)

    // Determine the new value
    let newValue: unknown = editValue
    let coercedType: string | undefined

    // Handle NULL - empty string becomes NULL if original was NULL or if explicitly cleared
    if (editValue === '' && value === null) {
      newValue = null
    } else if (editValue === '') {
      // Empty string stays as empty string for non-null originals
      newValue = ''
    } else if (!Number.isNaN(Number(editValue)) && editValue.trim() !== '') {
      // Try to preserve number types
      const num = Number(editValue)
      if (typeof value === 'number' || (value === null && editValue.match(/^-?\d+\.?\d*$/))) {
        newValue = num
        coercedType = 'number'
      }
    }

    // Only trigger change if value actually changed
    if (newValue !== value) {
      const columnName = cell.column.id
      editLogger.debug('cell edit committed', { column: columnName, oldValue: value, newValue, coercedType })
      onValueChange(newValue)
    } else {
      editLogger.debug('cell edit cancelled (no change)', { column: cell.column.id })
    }
  }, [editValue, value, onValueChange, cell.column.id])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditing()
    } else if (e.key === 'Tab') {
      commitEdit()
    }
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={handleKeyDown}
        className={cn(
          'h-6 px-1 py-0 text-xs font-mono bg-zinc-900 rounded-none',
          isNewRow
            ? 'border-emerald-500 focus:ring-emerald-500'
            : 'border-amber-500 focus:ring-amber-500',
        )}
        placeholder="NULL"
      />
    )
  }

  return (
    <div
      className={cn(
        'cursor-text min-h-[1.5rem] flex items-center',
        isModified && 'bg-amber-500/10',
        !canEdit && 'cursor-not-allowed opacity-75',
      )}
      onDoubleClick={startEditing}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'F2') {
          e.preventDefault()
          startEditing()
        }
      }}
      tabIndex={canEdit ? 0 : -1}
      role="gridcell"
      aria-readonly={!canEdit}
    >
      {formatCellValue(value)}
    </div>
  )
}
