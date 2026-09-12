/**
 * Links that leave the site, plus the resume PDF — a document rather than a
 * page, so it should not replace the site in the tab either. mailto: and tel:
 * hand off to another app and never open a tab, so they are not external here.
 */
export const isExternal = (href: string) => /^https?:\/\//.test(href) || href.endsWith('.pdf');

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Inline markup for content strings: **emphasis**, [text](url), and line breaks. */
export function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_, label, href) =>
        `<a class="text-link" href="${href}"${isExternal(href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`,
    )
    .replace(/\n/g, '<br>');
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** 1 → "01" */
export const pad = (n: number) => String(n).padStart(2, '0');
