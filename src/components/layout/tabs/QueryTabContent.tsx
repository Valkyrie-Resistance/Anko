import { QueryEditor } from '@/components/editor/QueryEditor'
import { ResultsFooter } from '@/components/results/ResultsFooter'
import { ResultsTable } from '@/components/results/ResultsTable'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useConnectionStore } from '@/stores/connection'

interface QueryTabContentProps {
  tabId: string
}

export function QueryTabContent({ tabId }: QueryTabContentProps) {
  const tab = useConnectionStore((s) => s.queryTabs.find((t) => t.id === tabId))

  if (!tab) return null

  return (
    <div className="flex flex-col h-full">
      <ResizablePanelGroup orientation="vertical" className="flex-1 min-h-0">
        <ResizablePanel defaultSize={40} minSize={10}>
          <QueryEditor tabId={tabId} />
        </ResizablePanel>

        <ResizableHandle className="h-px w-full cursor-row-resize" />

        <ResizablePanel defaultSize={60} minSize={10}>
          <ResultsTable result={tab.result} error={tab.error} isExecuting={tab.isExecuting} />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Footer Status Bar */}
      <ResultsFooter result={tab.result} isExecuting={tab.isExecuting} />
    </div>
  )
}
