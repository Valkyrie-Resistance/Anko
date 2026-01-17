/**
 * Ensures a minimum display time for toast notifications to prevent visual glitches
 * when operations complete very quickly.
 *
 * @param startTime - The timestamp when the operation started (from Date.now())
 * @param minDuration - Minimum duration in milliseconds (default: 300ms)
 * @returns Promise that resolves after the minimum duration has elapsed
 *
 * @example
 * const startTime = Date.now()
 * const toastId = toast.loading('Processing...')
 * try {
 *   await someOperation()
 *   await ensureMinimumToastDuration(startTime)
 *   toast.success('Done!', { id: toastId })
 * } catch (e) {
 *   toast.error('Failed', { id: toastId })
 * }
 */
export async function ensureMinimumToastDuration(
  startTime: number,
  minDuration = 300,
): Promise<void> {
  const elapsed = Date.now() - startTime
  if (elapsed < minDuration) {
    await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed))
  }
}
