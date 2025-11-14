/**
 * Convert a subset of Markdown (as used by an LLM) into WhatsApp formatting.
 *
 * Supported conversions:
 * - **bold**, __bold__    → *bold*
 * - _italic_              → _italic_ (already WhatsApp style)
 * - ~~strike~~            → ~strike~
 * - ```lang\ncode```      → ```code``` (strip language)
 *
 * Lists, numbered lists, blockquotes, inline code, and code fences
 * are already compatible with WhatsApp and are preserved.
 */
export function markdownToWhatsapp(input: string): string {
  // 1. Split into code-block and non-code-block segments
  type Segment = { type: "code" | "text"; content: string };
  const segments: Segment[] = [];

  const codeBlockRegex = /```([a-zA-Z0-9#+-]+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(input)) !== null) {
    const [fullMatch, _lang, codeContent] = match;
    const matchIndex = match.index;

    // Text before this code block
    if (matchIndex > lastIndex) {
      segments.push({
        type: "text",
        content: input.slice(lastIndex, matchIndex),
      });
    }

    // The code block itself (strip optional language)
    segments.push({
      type: "code",
      content: codeContent ?? "",
    });

    lastIndex = matchIndex + fullMatch.length;
  }

  // Trailing text after last code block
  if (lastIndex < input.length) {
    segments.push({
      type: "text",
      content: input.slice(lastIndex),
    });
  }

  // 2. Process only the text segments (leave code segments alone)
  const processed = segments
    .map((seg) => {
      if (seg.type === "code") {
        // Rebuild WhatsApp-style code fence: ```code```
        return "```" + seg.content + "```";
      }

      let text = seg.content;

      // BOLD: **text** or __text__ → *text*
      text = text.replace(/(\*\*|__)([\s\S]+?)\1/g, (_m, _wrapper, inner) => {
        // Collapse any newlines on the edges
        return `*${inner.trim()}*`;
      });

      // ITALIC: _text_ (Markdown and WhatsApp both use underscores)
      // Keep as-is but normalize to avoid nested underscores weirdness.
      text = text.replace(/_([^_]+?)_/g, (_m, inner) => `_${inner}_`);

      // STRIKETHROUGH: ~~text~~ → ~text~
      text = text.replace(/~~([^~]+?)~~/g, (_m, inner) => `~${inner}~`);

      // Inline code: `code`
      // Markdown and WhatsApp both use single backticks; keep but normalize.
      text = text.replace(/`([^`]+?)`/g, (_m, inner) => "`" + inner + "`");

      // Lists, quotes, etc are already compatible, so we leave them:
      // - "* item", "- item", "1. item", "> text" are fine.

      return text;
    })
    .join("");

  return processed;
}
