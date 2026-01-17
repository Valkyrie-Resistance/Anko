import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

// Light theme colors
const lightColors = {
  background: '#ffffff',
  foreground: '#1f2937',
  cursor: '#1f2937',
  selection: '#add6ff',
  selectionMatch: '#add6ff80',
  lineHighlight: '#f3f4f6',
  gutterBackground: '#f9fafb',
  gutterForeground: '#9ca3af',
  gutterBorder: '#e5e7eb',
}

// Dark theme colors - true black background
const darkColors = {
  background: '#000000',
  foreground: '#d4d4d4',
  cursor: '#d4d4d4',
  selection: '#264f78',
  selectionMatch: '#264f7880',
  lineHighlight: '#0a0a0a',
  gutterBackground: '#000000',
  gutterForeground: '#525252',
  gutterBorder: '#18181b',
}

// Create editor theme based on mode
function createEditorTheme(isDark: boolean): Extension {
  const colors = isDark ? darkColors : lightColors

  return EditorView.theme(
    {
      '&': {
        color: colors.foreground,
        backgroundColor: colors.background,
        fontSize: '13px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      },
      '.cm-content': {
        caretColor: colors.cursor,
        padding: '8px 0',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: colors.cursor,
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: colors.selection,
      },
      '.cm-selectionMatch': {
        backgroundColor: colors.selectionMatch,
      },
      '.cm-activeLine': {
        backgroundColor: colors.lineHighlight,
      },
      '.cm-gutters': {
        backgroundColor: colors.gutterBackground,
        color: colors.gutterForeground,
        border: 'none',
        borderRight: `1px solid ${colors.gutterBorder}`,
      },
      '.cm-activeLineGutter': {
        backgroundColor: colors.lineHighlight,
      },
      '.cm-foldPlaceholder': {
        backgroundColor: 'transparent',
        border: 'none',
        color: colors.gutterForeground,
      },
      '.cm-tooltip': {
        border: `1px solid ${colors.gutterBorder}`,
        backgroundColor: colors.background,
      },
      '.cm-tooltip .cm-tooltip-arrow:before': {
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
      },
      '.cm-tooltip .cm-tooltip-arrow:after': {
        borderTopColor: colors.background,
        borderBottomColor: colors.background,
      },
      '.cm-tooltip-autocomplete': {
        '& > ul': {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '12px',
        },
        '& > ul > li[aria-selected]': {
          backgroundColor: colors.selection,
          color: colors.foreground,
        },
      },
      '.cm-searchMatch': {
        backgroundColor: '#fef08a',
        outline: '1px solid #eab308',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: '#fde047',
      },
      '.cm-panels': {
        backgroundColor: colors.gutterBackground,
        color: colors.foreground,
      },
      '.cm-panels.cm-panels-top': {
        borderBottom: `1px solid ${colors.gutterBorder}`,
      },
      '.cm-panels.cm-panels-bottom': {
        borderTop: `1px solid ${colors.gutterBorder}`,
      },
      '.cm-panel.cm-search': {
        padding: '4px 8px',
      },
      '.cm-panel.cm-search input, .cm-panel.cm-search button': {
        margin: '0 4px',
      },
      '.cm-panel.cm-search input': {
        border: `1px solid ${colors.gutterBorder}`,
        borderRadius: '4px',
        padding: '2px 6px',
      },
      '.cm-panel.cm-search button': {
        border: `1px solid ${colors.gutterBorder}`,
        borderRadius: '4px',
        padding: '2px 8px',
        cursor: 'pointer',
      },
    },
    { dark: isDark },
  )
}

// Light theme syntax highlighting
const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#0000ff' },
  { tag: tags.operatorKeyword, color: '#0000ff' },
  { tag: tags.modifier, color: '#0000ff' },
  { tag: tags.color, color: '#098658' },
  { tag: tags.comment, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.function(tags.variableName), color: '#795e26' },
  { tag: tags.string, color: '#a31515' },
  { tag: tags.number, color: '#098658' },
  { tag: tags.bool, color: '#0000ff' },
  { tag: tags.null, color: '#0000ff' },
  { tag: tags.className, color: '#267f99' },
  { tag: tags.typeName, color: '#267f99' },
  { tag: tags.definition(tags.typeName), color: '#267f99' },
  { tag: tags.definition(tags.variableName), color: '#001080' },
  { tag: tags.variableName, color: '#001080' },
  { tag: tags.propertyName, color: '#001080' },
  { tag: tags.operator, color: '#000000' },
  { tag: tags.punctuation, color: '#000000' },
  { tag: tags.bracket, color: '#000000' },
  { tag: tags.special(tags.variableName), color: '#795e26' },
])

// Dark theme syntax highlighting
const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#569cd6' },
  { tag: tags.operatorKeyword, color: '#569cd6' },
  { tag: tags.modifier, color: '#569cd6' },
  { tag: tags.color, color: '#b5cea8' },
  { tag: tags.comment, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.function(tags.variableName), color: '#dcdcaa' },
  { tag: tags.string, color: '#ce9178' },
  { tag: tags.number, color: '#b5cea8' },
  { tag: tags.bool, color: '#569cd6' },
  { tag: tags.null, color: '#569cd6' },
  { tag: tags.className, color: '#4ec9b0' },
  { tag: tags.typeName, color: '#4ec9b0' },
  { tag: tags.definition(tags.typeName), color: '#4ec9b0' },
  { tag: tags.definition(tags.variableName), color: '#9cdcfe' },
  { tag: tags.variableName, color: '#9cdcfe' },
  { tag: tags.propertyName, color: '#9cdcfe' },
  { tag: tags.operator, color: '#d4d4d4' },
  { tag: tags.punctuation, color: '#d4d4d4' },
  { tag: tags.bracket, color: '#d4d4d4' },
  { tag: tags.special(tags.variableName), color: '#dcdcaa' },
])

// Export theme creators
export function createLightTheme(): Extension[] {
  return [createEditorTheme(false), syntaxHighlighting(lightHighlightStyle)]
}

export function createDarkTheme(): Extension[] {
  return [createEditorTheme(true), syntaxHighlighting(darkHighlightStyle)]
}

// Create theme based on current mode
export function createSqlTheme(isDark: boolean): Extension[] {
  return isDark ? createDarkTheme() : createLightTheme()
}
