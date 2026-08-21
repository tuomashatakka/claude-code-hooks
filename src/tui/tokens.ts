export const TUI_TOKENS = {
  width: {
    fallbackContent:   96,
    maximumLayout:     100,
    outerIndentMargin: 6,
    divider:           60,
  },
  card: {
    background:        '#302f32',
    commandBackground: '#272629',
    ruleFallback:      '#4a4a4a',
    border:            '#5a595c',
    horizontalPadding: 2,
    minimumHairline:   4,
    // Cards keep only their top rule. Content spans the whole measured width.
    chromeColumns:     0,
  },
} as const
