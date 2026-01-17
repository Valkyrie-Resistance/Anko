export function KeyboardShortcutsHelp() {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
  const mod = isMac ? '\u2318' : 'Ctrl'
  const shift = isMac ? '\u21E7' : 'Shift'

  const shortcuts = [
    { action: 'Quick Search', keys: [mod, 'P'] },
    { action: 'Autocomplete', keys: ['Ctrl', 'Space'] },
    { action: 'Run', keys: [mod, 'Enter'] },
    { action: 'Run Current', keys: [mod, shift, 'Enter'] },
    { action: 'New Window', keys: [mod, shift, 'N'] },
    { action: 'New Tab', keys: [mod, 'T'] },
    { action: 'Reopen Closed Tabs', keys: [mod, shift, 'T'] },
    { action: 'Close Tab', keys: [mod, 'W'] },
    { action: 'Find', keys: [mod, 'F'] },
    { action: 'Find and Replace', keys: [mod, 'R'] },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black">
      <div className="space-y-2">
        {shortcuts.map(({ action, keys }) => (
          <div key={action} className="flex items-center gap-8">
            <span className="text-zinc-500 text-sm text-right w-40">{action}</span>
            <div className="flex gap-1">
              {keys.map((key, i) => (
                <kbd
                  key={`${action}-${key}-${i}`}
                  className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-400 font-medium min-w-6 text-center"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
