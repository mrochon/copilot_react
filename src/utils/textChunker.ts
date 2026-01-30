
/**
 * Splits long text into smaller chunks based on sentence boundaries to prevent API limits or timeouts.
 * 
 * @param text The full text to be chunked
 * @param maxLength Maximum length of each chunk (default: 1000 characters)
 * @returns Array of text chunks
 */
export const chunkText = (text: string, maxLength: number = 1000): string[] => {
    // Return empty array for empty input
    if (!text || text.trim().length === 0) {
        return [];
    }

    // Split by sentence boundaries while keeping punctuation
    // Matches sequence of non-sentence-ending chars, followed by sentence-ending chars (.!?),
    // followed by space or end of string.
    // OR matches remaining non-sentence-ending chars at the end of string.
    const sentencePattern = /[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g;
    const matches = text.match(sentencePattern);
    const sentences = matches || [text];

    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
        // If adding the next sentence exceeds max length, push current chunk and start new
        // We trim the sentence to avoid accumulating leading/trailing whitespace issues logic,
        // but we generally want to preserve natural spacing if possible. 
        // The previous implementation used clean string connection.
        if ((currentChunk + sentence).length > maxLength && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = "";
        }
        currentChunk += sentence;
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
};
