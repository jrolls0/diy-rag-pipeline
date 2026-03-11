import { getDocumentProxy, extractText } from "unpdf";

/**
 * Generate a short random ID (URL-safe).
 * Uses crypto.randomUUID under the hood and strips dashes for compactness.
 */
export function generateId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/**
 * Rough token count estimate — splits on whitespace.
 * Good enough for chunking; not a tokenizer replacement.
 */
export function estimateTokens(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

/** Extract plain text from a raw file buffer based on MIME type. */
export async function extractTextFromFile(
  buffer: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  if (mimeType === "application/pdf") {
    return extractTextFromPdf(buffer);
  }
  // For text/plain, text/markdown, and anything else text-ish, decode as UTF-8
  return new TextDecoder().decode(buffer);
}

/** Use unpdf to pull text out of a PDF. */
async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

export interface TextChunk {
  index: number;
  text: string;
  tokenCount: number;
}

/**
 * Split text into overlapping chunks of roughly `maxTokens` words.
 *
 * Strategy:
 *  1. Split into sentences (period / newline boundaries).
 *  2. Greedily pack sentences into a chunk until the token budget is reached.
 *  3. Overlap the last `overlapTokens` worth of sentences into the next chunk
 *     so that context is not lost across boundaries.
 */
export function chunkText(
  text: string,
  maxTokens = 500,
  overlapTokens = 50,
): TextChunk[] {
  // Split on sentence-like boundaries — periods, newlines, or double-newlines.
  const sentences = text
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: TextChunk[] = [];
  let current: string[] = [];
  let currentLen = 0;
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const sentenceLen = estimateTokens(sentence);

    if (currentLen + sentenceLen > maxTokens && current.length > 0) {
      // Flush current chunk
      const chunkText = current.join(" ");
      chunks.push({
        index: chunkIndex++,
        text: chunkText,
        tokenCount: estimateTokens(chunkText),
      });

      // Build overlap: walk backwards through current sentences
      let overlapLen = 0;
      const overlap: string[] = [];
      for (let i = current.length - 1; i >= 0; i--) {
        const len = estimateTokens(current[i]);
        if (overlapLen + len > overlapTokens) break;
        overlap.unshift(current[i]);
        overlapLen += len;
      }

      current = overlap;
      currentLen = overlapLen;
    }

    current.push(sentence);
    currentLen += sentenceLen;
  }

  // Don't forget the last chunk
  if (current.length > 0) {
    const chunkTextFinal = current.join(" ");
    chunks.push({
      index: chunkIndex,
      text: chunkTextFinal,
      tokenCount: estimateTokens(chunkTextFinal),
    });
  }

  return chunks;
}
