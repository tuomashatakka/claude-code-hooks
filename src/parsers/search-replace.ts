export interface SearchReplaceBlock {
  search:  string;
  replace: string;
}

export function parseSearchReplaceBlocks (content: unknown): SearchReplaceBlock[] {
  if (typeof content !== 'string')
    return []

  const blocks: SearchReplaceBlock[] = []
  const re                           = /<<<<<<< SEARCH\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> REPLACE/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null)
    blocks.push({ search: m[1] ?? '', replace: m[2] ?? '' })
  return blocks
}
