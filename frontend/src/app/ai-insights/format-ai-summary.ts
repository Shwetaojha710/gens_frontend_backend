export function formatAiSummary(text: string): string {
  if (!text) return '';
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = escaped
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
      if (heading) return `<h6 class="ai-summary-heading">${heading[1]}</h6>`;
      if (trimmed.startsWith('- ')) return `<div class="ai-summary-bullet">${trimmed.slice(2)}</div>`;
      if (!trimmed) return '';
      return `<p class="ai-summary-line">${trimmed}</p>`;
    })
    .join('');
  return html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
