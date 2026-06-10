export const CHUNK_SIZE = 500;
export const CHUNK_OVERLAP = 100;

export function splitIntoChunks(content: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const clean = content.replace(/\s+/g, " ").trim();
  if (!clean) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    chunks.push(clean.slice(start, end));

    if (end === clean.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
