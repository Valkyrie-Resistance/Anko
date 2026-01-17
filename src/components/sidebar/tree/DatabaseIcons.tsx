export function MySQLIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.178 10.641v4.002h-.04c-.255-.422-.498-.836-.745-1.258l-1.436-2.744h-.916v5.329h.637v-4.039h.04l.792 1.33 1.457 2.709h.849v-5.329h-.638zm-4.927 5.329h.702v-4.622h1.152v-.707H6.131v.707h1.12v4.622zm11.436-.707c-.227.158-.492.245-.8.245-.373 0-.653-.115-.853-.353-.196-.234-.296-.557-.296-.963 0-.432.105-.779.327-1.04.218-.262.506-.395.858-.395.305 0 .541.066.716.2v-.768c-.228-.104-.492-.157-.793-.157-.551 0-.994.181-1.333.544-.335.363-.502.844-.502 1.443 0 .552.153 1.005.455 1.345.303.34.705.511 1.205.511.343 0 .659-.084.945-.248l-.201-.632-.728.268zm-2.88-3.706a1.16 1.16 0 0 0-.437-.085c-.363 0-.686.165-.969.499h-.033v-.415h-.654v4.414h.674v-2.378c0-.346.08-.638.252-.874.167-.235.376-.353.63-.353.141 0 .26.025.36.073l.177-.881z" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function PostgreSQLIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3C7.58 3 4 5.69 4 9c0 1.54.81 2.94 2.11 4.04-.31.87-.81 1.94-1.5 2.72-.25.28-.07.71.29.75 1.87.19 3.58-.48 4.76-1.23.78.15 1.55.22 2.34.22 4.42 0 8-2.69 8-6s-3.58-6-8-6z" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function DatabaseTypeIcon({ driver, className }: { driver: string; className?: string }) {
  if (driver === 'postgresql') {
    return <PostgreSQLIcon className={className} />
  }
  return <MySQLIcon className={className} />
}
