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

const CHANGELOG_URL = 'https://raw.githubusercontent.com/Valkyrie-Resistance/Anko/main/CHANGELOG.md'

/**
 * Fetch changelog content for a specific version from CHANGELOG.md
 */
export async function fetchChangelogForVersion(version: string): Promise<string | undefined> {
  try {
    const response = await fetch(CHANGELOG_URL)
    if (!response.ok) return undefined

    const changelog = await response.text()
    return parseChangelogForVersion(changelog, version)
  } catch (error) {
    console.error('Failed to fetch changelog:', error)
    return undefined
  }
}

export interface LatestChangelog {
  version: string
  body: string
  date: string
}

/**
 * Fetch the latest changelog entry from CHANGELOG.md
 */
export async function fetchLatestChangelog(): Promise<LatestChangelog | undefined> {
  try {
    const response = await fetch(CHANGELOG_URL)
    if (!response.ok) return undefined

    const changelog = await response.text()
    return parseLatestChangelog(changelog)
  } catch (error) {
    console.error('Failed to fetch changelog:', error)
    return undefined
  }
}

/**
 * Parse the latest version entry from changelog
 */
function parseLatestChangelog(changelog: string): LatestChangelog | undefined {
  // Find the first version header: ## [v0.2.1] - 2026-01-18
  const versionMatch = changelog.match(/## \[v?(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})/)
  if (!versionMatch) return undefined

  const version = versionMatch[1]
  const date = versionMatch[2]

  // Find the content between this version header and the next
  const versionHeaderStart = changelog.indexOf(versionMatch[0])
  const contentStart = versionHeaderStart + versionMatch[0].length

  // Find next version header or end of file
  const nextVersionMatch = changelog.slice(contentStart).match(/\n## \[v?\d+\.\d+\.\d+\]/)
  const contentEnd = nextVersionMatch
    ? contentStart + (nextVersionMatch.index ?? changelog.length)
    : changelog.length

  const body = changelog.slice(contentStart, contentEnd).trim()

  return { version, body, date }
}

/**
 * Parse changelog content for a specific version
 */
function parseChangelogForVersion(changelog: string, targetVersion: string): string | undefined {
  // Normalize version (remove 'v' prefix if present)
  const normalizedTarget = targetVersion.replace(/^v/, '')

  // Find the version header: ## [v0.2.1] - 2026-01-18 or ## [0.2.1] - 2026-01-18
  const versionRegex = new RegExp(
    `## \\[v?${normalizedTarget.replace(/\./g, '\\.')}\\] - \\d{4}-\\d{2}-\\d{2}`,
  )
  const versionMatch = changelog.match(versionRegex)
  if (!versionMatch) return undefined

  // Find the content between this version header and the next
  const versionHeaderStart = changelog.indexOf(versionMatch[0])
  const contentStart = versionHeaderStart + versionMatch[0].length

  // Find next version header or end of file
  const nextVersionMatch = changelog.slice(contentStart).match(/\n## \[v?\d+\.\d+\.\d+\]/)
  const contentEnd = nextVersionMatch
    ? contentStart + (nextVersionMatch.index ?? changelog.length)
    : changelog.length

  return changelog.slice(contentStart, contentEnd).trim()
}
