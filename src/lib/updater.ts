import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'

const SKIPPED_VERSIONS_KEY = 'anko-skipped-versions'
const REMIND_LATER_KEY = 'anko-remind-later'
const REMIND_LATER_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export interface UpdateInfo {
  version: string
  currentVersion: string
  body: string | undefined
  date: string | undefined
}

export async function checkForUpdate(): Promise<{
  available: boolean
  update: Update | null
  info: UpdateInfo | null
}> {
  try {
    const update = await check()
    if (update) {
      return {
        available: true,
        update,
        info: {
          version: update.version,
          currentVersion: update.currentVersion,
          body: update.body,
          date: update.date,
        },
      }
    }
    return { available: false, update: null, info: null }
  } catch (error) {
    console.error('Failed to check for updates:', error)
    return { available: false, update: null, info: null }
  }
}

export async function downloadAndInstall(
  update: Update,
  onProgress?: (progress: number, total: number) => void,
): Promise<void> {
  let downloaded = 0
  let contentLength = 0

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        contentLength = event.data.contentLength ?? 0
        break
      case 'Progress':
        downloaded += event.data.chunkLength
        onProgress?.(downloaded, contentLength)
        break
      case 'Finished':
        break
    }
  })
}

export async function restartApp(): Promise<void> {
  await relaunch()
}

export function skipVersion(version: string): void {
  const skipped = getSkippedVersions()
  if (!skipped.includes(version)) {
    skipped.push(version)
    localStorage.setItem(SKIPPED_VERSIONS_KEY, JSON.stringify(skipped))
  }
}

export function isVersionSkipped(version: string): boolean {
  return getSkippedVersions().includes(version)
}

function getSkippedVersions(): string[] {
  try {
    const stored = localStorage.getItem(SKIPPED_VERSIONS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function setRemindLater(): void {
  localStorage.setItem(REMIND_LATER_KEY, Date.now().toString())
}

export function shouldRemindLater(): boolean {
  const stored = localStorage.getItem(REMIND_LATER_KEY)
  if (!stored) return false

  const timestamp = Number.parseInt(stored, 10)
  return Date.now() - timestamp < REMIND_LATER_DURATION
}

export function clearRemindLater(): void {
  localStorage.removeItem(REMIND_LATER_KEY)
}
