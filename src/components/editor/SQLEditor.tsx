import { autocompletion } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { MySQL, PostgreSQL, sql } from '@codemirror/lang-sql'
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { Compartment, EditorState } from '@codemirror/state'
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTheme } from '@/components/theme/ThemeProvider'
import { editorLogger } from '@/lib/debug'
import type { SQLEditorProps } from './definitions'
import { createBasicSqlAutocomplete, createSqlAutocomplete } from './sql-autocomplete'
import { createSqlTheme } from './sql-theme'

export function SQLEditor({
  value,
  onChange,
  onExecute,
  driver = 'mysql',
  selectedDatabase,
  schema,
  placeholder = '-- Write your SQL query here...\n-- Press Cmd/Ctrl+Enter to execute',
  readOnly = false,
}: SQLEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { theme } = useTheme()

  // Compartments for dynamic reconfiguration
  const themeCompartment = useRef(new Compartment())
  const autocompleteCompartment = useRef(new Compartment())
  const languageCompartment = useRef(new Compartment())

  // Determine if dark mode
  const isDark = useMemo(() => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    // System theme
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  // Get SQL dialect based on driver
  const getDialect = useCallback(() => {
    return driver === 'postgresql' ? PostgreSQL : MySQL
  }, [driver])

  // Create autocomplete extension
  const getAutocompleteExtension = useCallback(() => {
    if (schema && Object.keys(schema.tables).length > 0) {
      return autocompletion({
        override: [createSqlAutocomplete(schema, selectedDatabase)],
        activateOnTyping: true,
        maxRenderedOptions: 50,
      })
    }
    return autocompletion({
      override: [createBasicSqlAutocomplete()],
      activateOnTyping: true,
      maxRenderedOptions: 50,
    })
  }, [schema, selectedDatabase])

  // Execute handler for keymap
  const executeHandler = useCallback(() => {
    if (onExecute) {
      onExecute()
      return true
    }
    return false
  }, [onExecute])

  // Store refs to callbacks to avoid recreating the editor
  const onChangeRef = useRef(onChange)
  const executeHandlerRef = useRef(executeHandler)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    executeHandlerRef.current = executeHandler
  }, [executeHandler])

  // Initialize editor - only runs once on mount
  useEffect(() => {
    if (!editorRef.current) return

    editorLogger.debug('initializing SQL editor', { driver, readOnly })

    const startState = EditorState.create({
      doc: value,
      extensions: [
        // Basic editor setup
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        foldGutter(),
        indentOnInput(),
        highlightSelectionMatches(),
        EditorView.lineWrapping,

        // Read-only state
        EditorState.readOnly.of(readOnly),

        // Placeholder
        EditorView.contentAttributes.of({
          'data-placeholder': placeholder,
        }),

        // Theme (dynamic)
        themeCompartment.current.of(createSqlTheme(isDark)),

        // SQL language (dynamic)
        languageCompartment.current.of(sql({ dialect: getDialect() })),

        // Autocomplete (dynamic)
        autocompleteCompartment.current.of(getAutocompleteExtension()),

        // Keymaps
        keymap.of([
          // Execute query: Cmd/Ctrl+Enter
          {
            key: 'Mod-Enter',
            run: () => executeHandlerRef.current(),
          },
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
        ]),

        // Update listener
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
      ],
    })

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Only run on mount - use refs for callbacks to avoid recreation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update value from outside
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentValue = view.state.doc.toString()
    if (currentValue !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      })
    }
  }, [value])

  // Update theme
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    editorLogger.debug('reconfiguring theme', { isDark })
    view.dispatch({
      effects: themeCompartment.current.reconfigure(createSqlTheme(isDark)),
    })
  }, [isDark])

  // Update SQL dialect
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    view.dispatch({
      effects: languageCompartment.current.reconfigure(sql({ dialect: getDialect() })),
    })
  }, [getDialect])

  // Update autocomplete
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    view.dispatch({
      effects: autocompleteCompartment.current.reconfigure(getAutocompleteExtension()),
    })
  }, [getAutocompleteExtension])

  return (
    <div
      ref={editorRef}
      className="h-full w-full overflow-auto [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto"
    />
  )
}
