// Lightweight frontmatter + markdown parser — no external dependencies required.
// Handles exactly the subset of markdown produced by Decap CMS's markdown widget
// for this site's use case: paragraphs, ## / ### headings, numbered lists with
// optional **bold** lead-ins, and inline **bold** / *italic* / [links](url).

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { data: {}, content: raw };
  const [, fmBlock, body] = m;
  const data = {};
  for (const line of fmBlock.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    // strip matching quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    data[key] = val;
  }
  return { data, content: body };
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Inline formatting: **bold**, *italic*, [text](url). Input should already be HTML-escaped.
function inline(text) {
  let out = escapeHtml(text);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, '$1<em>$2</em>$3');
  return out;
}

// Converts a markdown body into the site's block structure: an array of
// { type: 'p' | 'h3' | 'list', ... } objects, matching the existing renderer.
function markdownToBlocks(md) {
  const lines = md.replace(/\r\n/g, '\n').split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  const blocks = [];
  let currentList = null;

  function flushList() {
    if (currentList) { blocks.push(currentList); currentList = null; }
  }

  for (const para of lines) {
    const headingMatch = para.match(/^(#{2,3})\s+(.*)$/);
    const listItemMatch = para.match(/^\d+\.\s+(?:\*\*([^*]+)\*\*\s*)?(.*)$/s);
    if (headingMatch) {
      flushList();
      blocks.push({ type: 'h3', text: inline(headingMatch[2].trim()) });
    } else if (listItemMatch) {
      // A paragraph may itself contain multiple numbered lines separated by single newlines
      const itemLines = para.split(/\n/).filter(Boolean);
      if (!currentList) currentList = { type: 'list', items: [] };
      for (const itemLine of itemLines) {
        const im = itemLine.match(/^\d+\.\s+(?:\*\*([^*]+)\*\*\s*)?(.*)$/);
        if (im) {
          currentList.items.push({
            lead: im[1] ? inline(im[1].trim()) : '',
            text: inline((im[2] || '').trim())
          });
        }
      }
    } else {
      flushList();
      blocks.push({ type: 'p', text: inline(para) });
    }
  }
  flushList();
  return blocks;
}

module.exports = { parseFrontmatter, markdownToBlocks, inline, escapeHtml };
