#!/usr/bin/env node

import { runHook } from './hooks/lib/primitives.mjs';
import { renderAnsiShadowText, randomFiller } from './hooks/utils.mjs';
import { Renderer } from './hooks/lib/renderer.mjs';

const renderer = new Renderer({ renderAnsiShadowText, randomFiller });
const EVENT    = process.argv[2];

runHook(EVENT, (data) => renderer.render(EVENT, data));
