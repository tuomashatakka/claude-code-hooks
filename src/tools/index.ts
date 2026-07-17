// Side-effect imports register every tool strategy with the central registry.
// Import order matters only insofar as `defineGenericTool` should run; the
// registry checks specific matchers first regardless of order.
import './bash.ts';
import './read.ts';
import './edit.ts';
import './wcgw-file.ts';
import './wcgw-read.ts';
import './wcgw-init.ts';
import './wcgw-ctx.ts';
import './agent.ts';
import './exit-plan.ts';
import './task-create.ts';
import './task-update.ts';
import './generic.ts';
