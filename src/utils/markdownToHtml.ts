const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function inlineMarkdownToHtml(value: string) {
  return escapeHtml(value)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

const isBlockStart = (line: string) =>
  /^(#{1,6}\s+|\s*[-*+]\s+|\s*\d+[.)]\s+|\s*>\s?|\s*\x60{3}|\s*([-*_]\s*){3,}$)/.test(line);

export function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index++; continue; }

    if (line.startsWith('\x60\x60\x60')) {
      index++;
      const codeLines: string[] = [];
      while (index < lines.length && !lines[index].trim().startsWith('\x60\x60\x60')) codeLines.push(lines[index++]);
      if (index < lines.length) index++;
      html.push('<pre><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      html.push('<h' + level + '>' + inlineMarkdownToHtml(heading[2]) + '</h' + level + '>');
      index++;
      continue;
    }

    if (/^([-*_]\s*){3,}$/.test(line)) {
      html.push('<hr>');
      index++;
      continue;
    }

    const listItem = line.match(/^(?:[-*+]\s+|\d+[.)]\s+)/);
    if (listItem) {
      const ordered = /^\d/.test(line);
      const tag = ordered ? 'ol' : 'ul';
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        const match = current.match(/^(?:[-*+]\s+|\d+[.)]\s+)/);
        if (!match || /^\d/.test(current) !== ordered) break;
        items.push('<li>' + inlineMarkdownToHtml(current.slice(match[0].length)) + '</li>');
        index++;
      }
      html.push('<' + tag + '>' + items.join('') + '</' + tag + '>');
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(inlineMarkdownToHtml(lines[index++].replace(/^\s*>\s?/, '')));
      }
      html.push('<blockquote><p>' + quote.join('<br>') + '</p></blockquote>');
      continue;
    }

    const paragraph = [line];
    index++;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index].trim())) {
      paragraph.push(lines[index++].trim());
    }
    html.push('<p>' + inlineMarkdownToHtml(paragraph.join(' ')) + '</p>');
  }
  return html.join('');
}

export function repairInlineMarkdownHtml(contentHtml: string) {
  const parsed = new DOMParser().parseFromString(contentHtml, 'text/html');
  parsed.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote').forEach((element) => {
    const text = element.textContent || '';
    if (/\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~/.test(text)) {
      element.innerHTML = inlineMarkdownToHtml(text);
    }
  });
  return parsed.body.innerHTML;
}
