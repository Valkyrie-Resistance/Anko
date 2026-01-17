/**
 * Formats an unknown error into a readable string message.
 * Handles Error objects, strings, Tauri error objects, and other types safely.
 *
 * @param error - The error to format (unknown type from catch blocks)
 * @returns Formatted error message string
 */
export function formatErrorMessage(error: unknown): string {
  // Handle Error instances (standard JavaScript errors)
  if (error instanceof Error) return error.message

  // Handle string errors
  if (typeof error === 'string') return error

  // Handle Tauri error objects: {message: "error text"}
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const errorObj = error as { message: unknown }
    if (typeof errorObj.message === 'string') {
      return errorObj.message
    }
  }

  // Fallback for unknown error types
  return 'An unexpected error occurred'
}
