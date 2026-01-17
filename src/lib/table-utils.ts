/**
 * Creates a deterministic hash string from primary key values.
 * This is significantly faster than JSON.stringify for equality comparisons.
 *
 * @param pkValues - Record of primary key column names to their values
 * @returns Hash string in format "col1:val1|col2:val2" (sorted by key)
 */
export function createPrimaryKeyHash(pkValues: Record<string, unknown>): string {
  return Object.keys(pkValues)
    .sort()
    .map((k) => `${k}:${pkValues[k]}`)
    .join('|')
}
