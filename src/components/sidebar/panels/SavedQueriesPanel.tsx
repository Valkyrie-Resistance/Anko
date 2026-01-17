import { IconPlus } from '@tabler/icons-react'

export function SavedQueriesPanel() {
  return (
    <>
      <div className="flex flex-col gap-3.5 border-b p-4">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground text-base font-medium">Saved Queries</div>
          <button
            type="button"
            className="size-7 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-colors"
            title="New Saved Query"
          >
            <IconPlus className="size-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-4 text-center text-sm text-muted-foreground">No saved queries yet</div>
      </div>
    </>
  )
}
