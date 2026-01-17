import { IconDownload, IconRefresh, IconX } from '@tabler/icons-react'
import { useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { downloadAndInstall, restartApp, setRemindLater, skipVersion } from '@/lib/updater'
import { useUpdateStore } from '@/stores/update'

export function UpdateModal() {
  const isModalOpen = useUpdateStore((s) => s.isModalOpen)
  const setModalOpen = useUpdateStore((s) => s.setModalOpen)
  const updateInfo = useUpdateStore((s) => s.updateInfo)
  const update = useUpdateStore((s) => s.update)
  const isDownloading = useUpdateStore((s) => s.isDownloading)
  const setDownloading = useUpdateStore((s) => s.setDownloading)
  const downloadProgress = useUpdateStore((s) => s.downloadProgress)
  const downloadTotal = useUpdateStore((s) => s.downloadTotal)
  const setDownloadProgress = useUpdateStore((s) => s.setDownloadProgress)
  const isInstalled = useUpdateStore((s) => s.isInstalled)
  const setInstalled = useUpdateStore((s) => s.setInstalled)
  const reset = useUpdateStore((s) => s.reset)

  const progressPercent = useMemo(() => {
    if (downloadTotal === 0) return 0
    return Math.round((downloadProgress / downloadTotal) * 100)
  }, [downloadProgress, downloadTotal])

  const handleDownload = useCallback(async () => {
    if (!update) return

    setDownloading(true)
    setDownloadProgress(0, 0)

    try {
      await downloadAndInstall(update, (progress, total) => {
        setDownloadProgress(progress, total)
      })
      setInstalled(true)
    } catch (error) {
      console.error('Failed to download update:', error)
      setDownloading(false)
    }
  }, [update, setDownloading, setDownloadProgress, setInstalled])

  const handleRestart = useCallback(async () => {
    await restartApp()
  }, [])

  const handleRemindLater = useCallback(() => {
    setRemindLater()
    setModalOpen(false)
    reset()
  }, [setModalOpen, reset])

  const handleSkipVersion = useCallback(() => {
    if (updateInfo?.version) {
      skipVersion(updateInfo.version)
    }
    setModalOpen(false)
    reset()
  }, [updateInfo?.version, setModalOpen, reset])

  if (!updateInfo) return null

  return (
    <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isDownloading}>
        <DialogHeader>
          <DialogTitle>Update Available</DialogTitle>
          <DialogDescription>
            Version {updateInfo.version} is available (current: {updateInfo.currentVersion})
          </DialogDescription>
        </DialogHeader>

        {updateInfo.body && (
          <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/50 p-3">
            <p className="mb-2 text-xs font-medium text-foreground">What's New</p>
            <div
              className="prose prose-sm prose-invert max-w-none text-xs text-muted-foreground"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: GitHub release body is trusted
              // biome-ignore lint/style/useNamingConvention: GitHub release body is trusted
              dangerouslySetInnerHTML={{ __html: formatChangelog(updateInfo.body) }}
            />
          </div>
        )}

        {isDownloading && !isInstalled && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Downloading...</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {isInstalled ? (
            <Button onClick={handleRestart} className="w-full sm:w-auto">
              <IconRefresh className="mr-1" />
              Restart Now
            </Button>
          ) : isDownloading ? (
            <Button disabled className="w-full sm:w-auto">
              <IconDownload className="mr-1 animate-pulse" />
              Downloading...
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleSkipVersion}>
                <IconX className="mr-1" />
                Skip Version
              </Button>
              <Button variant="outline" size="sm" onClick={handleRemindLater}>
                Remind Later
              </Button>
              <Button onClick={handleDownload}>
                <IconDownload className="mr-1" />
                Download Now
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatChangelog(body: string): string {
  // Convert markdown-style formatting to HTML
  return body
    .replace(/^### (.+)$/gm, '<h4 class="font-medium mt-2 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="font-bold mt-3 mb-2">$1</h2>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 rounded">$1</code>')
    .replace(/\n/g, '<br />')
}
