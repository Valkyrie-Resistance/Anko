import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const CLOSE_APP_PREFERENCE_KEY = 'anko-close-app-preference'

export type CloseAppPreference = 'ask' | 'always-close' | 'never-close'

export function getCloseAppPreference(): CloseAppPreference {
  const stored = localStorage.getItem(CLOSE_APP_PREFERENCE_KEY)
  if (stored === 'always-close' || stored === 'never-close') {
    return stored
  }
  return 'ask'
}

export function setCloseAppPreference(preference: CloseAppPreference) {
  if (preference === 'ask') {
    localStorage.removeItem(CLOSE_APP_PREFERENCE_KEY)
  } else {
    localStorage.setItem(CLOSE_APP_PREFERENCE_KEY, preference)
  }
}

interface CloseAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel: () => void
}

export function CloseAppDialog({ open, onOpenChange, onConfirm, onCancel }: CloseAppDialogProps) {
  const [rememberChoice, setRememberChoice] = useState(false)

  const handleClose = () => {
    if (rememberChoice) {
      setCloseAppPreference('always-close')
    }
    onConfirm()
  }

  const handleCancel = () => {
    if (rememberChoice) {
      setCloseAppPreference('never-close')
    }
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-100" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Close Application?</DialogTitle>
          <DialogDescription>
            Are you sure you want to close Anko? Any unsaved changes will be lost.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 py-2">
          <Checkbox
            id="remember-choice"
            checked={rememberChoice}
            onCheckedChange={(checked) => setRememberChoice(checked === true)}
          />
          <label
            htmlFor="remember-choice"
            className="text-sm text-muted-foreground cursor-pointer select-none"
          >
            Remember this choice
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleClose}>Close App</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
