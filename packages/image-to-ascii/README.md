# @tuomashatakka/image-to-ascii

High-fidelity ANSI sextant image previews for PNG, JPEG, and WebP buffers,
extracted from
[claude-code-hooks](https://github.com/tuomashatakka/claude-code-hooks).

Each terminal cell samples a 2x3 pixel region, finds its best two-colour split,
and renders the matching Unicode block sextant. Transparent edge cells use the
separated-sextant range through U+1CE86 when available. This packs three image
rows into one terminal row, improving edge and shape fidelity over half blocks.

```ts
import { imageToAscii } from '@tuomashatakka/image-to-ascii';

const preview = imageToAscii(buffer, '.png', 80);
```

Set `CLAUDE_HOOKS_IMAGE_MODE=half` to use the legacy 1x2 half-block renderer for
terminal fonts without sextant coverage. `TERM=dumb` selects that fallback too.
