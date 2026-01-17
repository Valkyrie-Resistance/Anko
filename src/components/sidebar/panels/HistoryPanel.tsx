export function HistoryPanel() {
  return (
    <>
      <div className="flex flex-col gap-3.5 border-b p-4">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground text-base font-medium">History</div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-4 text-center text-sm text-muted-foreground">No query history yet</div>
      </div>
    </>
  )
}
