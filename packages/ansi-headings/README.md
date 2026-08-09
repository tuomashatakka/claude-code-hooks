# @tuomashatakka/ansi-headings

ANSI block-letter headings and matching block-weight checkbox headings,
extracted from
[claude-code-hooks](https://github.com/tuomashatakka/claude-code-hooks).

**Live examples →** the [session banner](https://tuomashatakka.github.io/claude-code-hooks/#session-start),
the [sign-off](https://tuomashatakka.github.io/claude-code-hooks/#stop) and
[leaving plan mode](https://tuomashatakka.github.io/claude-code-hooks/#exit-plan),
all rendered by this package.

```ts
import { renderCheckboxHeading, renderHeading } from '@tuomashatakka/ansi-headings';

renderHeading({ word: 'BEGIN', color: 'cyan', event: 'start' });

renderCheckboxHeading({
  caption: 'ADDED TASK',
  checked: false,
  color: 'cyan',
  description: 'The description wraps beneath the caption beside the checkbox.',
});
```

Pass `checked: true` to draw the completed-state checkmark. The older
`renderCheckboxHeading(caption, color)` signature remains available as a
deprecated checked-state compatibility shim.
