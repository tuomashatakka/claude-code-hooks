export const TUI_TOKENS = {
  width: {
    fallbackContent: 96,
    outerIndentMargin: 6,
    divider: 60,
  },
  card: {
    background: '#302f32',
    ruleFallback: '#4a4a4a',
    border: '#5a595c',
    shadow: '#1b1a1c',
    horizontalPadding: 2,
    minimumHairline: 4,
    /**
     * Columns a card spends on chrome rather than content: `▏` + `▕`, plus the
     * one `░` column a shadowed card hangs off its right edge. Reserved for
     * every card so a shadow can be switched on without reflowing the layout.
     */
    chromeColumns: 3,
  },
  columns: {
    gap: 3,
    comfortMargin: 4,
  },
} as const;
