# @tuomashatakka/image-to-ascii

High-fidelity ANSI image previews for PNG, JPEG, and WebP buffers, extracted from
[claude-code-hooks](https://github.com/tuomashatakka/claude-code-hooks).

```ts
import { imageToAscii } from '@tuomashatakka/image-to-ascii';

const preview = imageToAscii(buffer, '.png', 86);
```

## How it works

Each terminal cell is a least-squares problem: pick the character whose ink
pattern, filled with one foreground and one background colour, best matches the
source over that cell. Candidates come from several families at once — 2x3
sextants (or 2x4 octants), eighth-height and eighth-width bars for thin rules,
and the shade characters when the colour codec cannot name a colour exactly.

Families are scored against each other without resampling onto a shared grid.
Writing the displayed colour as `w*fg + (1-w)*bg`, the error decomposes into a
term that is the same for every candidate plus one that needs only the sub-cell
means the candidate's own shape is constant on — so a 2x3 mosaic and a 1x8 bar
are directly comparable. That same quantity, summed over the cell grid, is
comparable *between renders of different widths*, which is how the width is
chosen.

Sampling is an exact area average via a summed-area table, including fractional
cell edges.

## The budget is the constraint

The output has to fit a display limit of about 10,000 characters, and roughly
four fifths of it is SGR escape sequences rather than glyphs. Every escape saved
buys resolution, so the encoder:

- leaves the background pen alone under a full block, and the foreground pen
  alone under a space, where that colour cannot be seen anyway;
- draws the complementary glyph with the colours swapped when that matches the
  pen already set;
- reuses the current pen for a colour close enough that the difference is not
  worth an escape, weighted by the area the colour actually covers;
- requires a two-colour glyph to beat a flat cell by a margin before it earns
  the second pen colour it costs.

Widths are searched by fidelity rather than by "widest that fits": whether the
cell grid lands on the image's own edges swings the character count by over 20%
between adjacent widths, so the widest render that fits is often a couple of dB
worse than one a few columns narrower.

## Glyph modes

`CLAUDE_HOOKS_IMAGE_MODE` selects `sextant`, `octant`, or `half`. Left unset,
the mode follows the terminal: Ghostty, kitty and WezTerm synthesise these
glyphs from the cell metrics and are immune to font coverage, so they get
octants — a third more vertical detail for the same one-code-point cost, with
square sub-samples on a 1:2 cell. Everywhere else, sextants, because octants are
Unicode 16 and most monospace fonts do not have them yet. `TERM=dumb` selects
the half-block fallback.

`CLAUDE_HOOKS_IMAGE_CELL_ASPECT` (default `2`) is the height-to-width ratio of a
terminal cell. A terminal configured with a generous line height is nearer 2.9,
and getting this wrong stretches the preview.

`CLAUDE_HOOKS_IMAGE_COLOR` forces `truecolor` or `palette`.
