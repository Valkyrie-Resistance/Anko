import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface UnsavedChangesDialogProps {
  open: boolean
  changesCount: number
  onDiscard: () => void
  onCancel: () => void
}

export function UnsavedChangesDialog({
  open,
  changesCount,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="bg-zinc-950 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-100">Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            You have {changesCount} uncommitted change{changesCount !== 1 ? 's' : ''}. Are you sure
            you want to discard them?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onCancel}
            className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onDiscard} className="bg-red-600 text-white hover:bg-red-700">
            Discard Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
