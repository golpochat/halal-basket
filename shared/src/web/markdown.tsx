/**
 * Minimal safe Markdown → React nodes (no raw HTML).
 * Supports: AT2 headings, paragraphs, unordered/ordered lists, links, bold, italic, inline code.
 */
import { createElement, type ReactNode } from 'react';

function escapeText(s: string): string {
  return s;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // bold, italic, code, links — single pass with regex split
  const re =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(escapeText(text.slice(last, m.index)));
    }
    const token = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        createElement('strong', { key }, token.slice(2, -2)),
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(createElement('em', { key }, token.slice(1, -1)));
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        createElement(
          'code',
          {
            key,
            className: 'rounded bg-[rgba(26,92,58,0.08)] px-1 py-0.5 text-[0.9em]',
          },
          token.slice(1, -1),
        ),
      );
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        const href = linkMatch[2];
        const safe =
          href.startsWith('/') ||
          href.startsWith('https://') ||
          href.startsWith('http://') ||
          href.startsWith('mailto:');
        if (safe) {
          nodes.push(
            createElement(
              'a',
              {
                key,
                href,
                className: 'font-semibold text-[var(--hb-green)] underline-offset-2 hover:underline',
                ...(href.startsWith('http')
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {}),
              },
              linkMatch[1],
            ),
          );
        } else {
          nodes.push(linkMatch[1]);
        }
      }
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(escapeText(text.slice(last)));
  return nodes;
}

export function renderMarkdownToReact(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const tag = level === 1 ? 'h2' : level === 2 ? 'h2' : 'h3';
      const className =
        level <= 2
          ? 'font-display text-xl font-semibold text-[var(--hb-ink)]'
          : 'font-display text-lg font-semibold text-[var(--hb-ink)]';
      blocks.push(
        createElement(
          tag,
          {
            key: `h-${blockKey++}`,
            className: `${className} ${blockKey > 1 ? 'mt-8' : ''}`,
          },
          ...renderInline(heading[2].trim(), `hi-${blockKey}`),
        ),
      );
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*]\s+/, '');
        items.push(
          createElement(
            'li',
            { key: `li-${blockKey}-${items.length}`, className: 'mt-1' },
            ...renderInline(itemText, `liu-${blockKey}-${items.length}`),
          ),
        );
        i += 1;
      }
      blocks.push(
        createElement(
          'ul',
          {
            key: `ul-${blockKey++}`,
            className: 'mt-3 list-disc space-y-1 pl-5',
          },
          items,
        ),
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s+/, '');
        items.push(
          createElement(
            'li',
            { key: `oli-${blockKey}-${items.length}`, className: 'mt-1' },
            ...renderInline(itemText, `lio-${blockKey}-${items.length}`),
          ),
        );
        i += 1;
      }
      blocks.push(
        createElement(
          'ol',
          {
            key: `ol-${blockKey++}`,
            className: 'mt-3 list-decimal space-y-1 pl-5',
          },
          items,
        ),
      );
      continue;
    }

    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push(
      createElement(
        'p',
        {
          key: `p-${blockKey++}`,
          className: 'mt-3 text-sm leading-relaxed text-[var(--hb-ink)]/75',
        },
        ...renderInline(para.join(' '), `p-${blockKey}`),
      ),
    );
  }

  return blocks;
}
