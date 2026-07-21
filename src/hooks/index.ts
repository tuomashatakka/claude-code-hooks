// Side-effect imports register every hook handler with the central registry.
import './pre-tool-use.ts';
import './post-tool-use.ts';
import './post-tool-use-failure.ts';
import './post-tool-batch.ts';
import './session-start.ts';
import './session-end.ts';
import './pre-compact.ts';
import './post-compact.ts';
import './instructions-loaded.ts';
import './user-prompt-submit.ts';
import './user-prompt-expansion.ts';
import './subagent-start.ts';
import './subagent-stop.ts';
import './stop.ts';
