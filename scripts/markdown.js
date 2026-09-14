/**
 * Minimal Markdown -> HTML renderer for FluffyJaws answers.
 *
 * FluffyJaws's system prompt tells the model to "always respond in
 * well-structured Markdown" — confirmed live 2026-09-14, answers use
 * headers, bold, links, and bullet lists. Rendering that as plain text
 * (via `textContent`) showed the raw `###`/`**`/`-` syntax literally, so
 * this converts the common subset actually observed into real HTML.
 *
 * Not a general-purpose Markdown parser — just headers, bold/italic,
 * links, and bullet lists, which is what these answers actually use.
 * HTML-escapes the input FIRST, so nothing in a model's answer can inject
 * raw markup — only the limited tags this module itself adds ever appear.
 */

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(text) {
  return text
    // Links: [text](url) — escaped already, so href can only be http(s).
    // The text group also allows one level of nested [...] , since
    // FluffyJaws citations often embed a session title that itself starts
    // with a bracketed prefix (e.g. "[[AI CoC] Some Session](url)" —
    // confirmed live 2026-09-14).
    .replace(/\[((?:[^[\]]|\[[^[\]]*\])*)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
}

export default function markdownToHtml(rawText) {
  const escaped = escapeHtml(rawText);
  const blocks = escaped.split(/\n{2,}/);

  const html = blocks.map((block) => {
    const headerMatch = block.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      return `<h${level}>${renderInline(headerMatch[2])}</h${level}>`;
    }

    const lines = block.split('\n').filter((line) => line.trim());
    const isList = lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line.trim()));
    if (isList) {
      const items = lines.map((line) => `<li>${renderInline(line.trim().replace(/^[-*]\s+/, ''))}</li>`).join('');
      return `<ul>${items}</ul>`;
    }

    return `<p>${lines.map(renderInline).join('<br>')}</p>`;
  });

  return html.join('\n');
}
