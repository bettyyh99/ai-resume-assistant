/** 极简 Markdown 解析器，仅支持简历/面试文案需要的语法 */

export interface InlineNode {
  type: 'text' | 'strong' | 'em' | 'code' | 'link';
  value: string;
  href?: string;
}

export type BlockNode =
  | { type: 'heading'; level: 1 | 2 | 3; inlines: InlineNode[] }
  | { type: 'paragraph'; inlines: InlineNode[] }
  | { type: 'list'; ordered: boolean; items: InlineNode[][] }
  | { type: 'quote'; inlines: InlineNode[] }
  | { type: 'hr' };

/** 解析行内：**粗体** *斜体* `代码` [链接](url) */
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const regex =
    /(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    if (match[2] !== undefined) {
      nodes.push({ type: 'strong', value: match[2] });
    } else if (match[4] !== undefined) {
      nodes.push({ type: 'strong', value: match[4] });
    } else if (match[6] !== undefined) {
      nodes.push({ type: 'em', value: match[6] });
    } else if (match[8] !== undefined) {
      nodes.push({ type: 'code', value: match[8] });
    } else if (match[9] !== undefined) {
      nodes.push({ type: 'link', value: match[10] ?? '', href: match[11] });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return nodes;
}

function flushParagraph(
  paragraph: string[],
  blocks: BlockNode[],
): void {
  const text = paragraph.join(' ').trim();
  if (text) blocks.push({ type: 'paragraph', inlines: parseInline(text) });
  paragraph.length = 0;
}

export function parseMarkdown(markdown: string): BlockNode[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: BlockNode[] = [];
  const paragraph: string[] = [];

  let list: Extract<BlockNode, { type: 'list' }> | null = null;

  const closeList = () => {
    const current = list;
    if (current && current.items.length > 0) blocks.push(current);
    list = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      flushParagraph(paragraph, blocks);
      continue;
    }

    const hr = /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed);
    if (hr) {
      closeList();
      flushParagraph(paragraph, blocks);
      blocks.push({ type: 'hr' });
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      closeList();
      flushParagraph(paragraph, blocks);
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        inlines: parseInline(heading[2].trim()),
      });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(trimmed);
    if (quote) {
      closeList();
      flushParagraph(paragraph, blocks);
      blocks.push({ type: 'quote', inlines: parseInline(quote[1]) });
      continue;
    }

    const unordered = /^[-*•]\s+(.+)$/.exec(trimmed);
    const ordered = /^\d+[.)]\s+(.+)$/.exec(trimmed);
    if (unordered || ordered) {
      flushParagraph(paragraph, blocks);
      const isOrdered = Boolean(ordered);
      const content = (ordered ? ordered[1] : unordered?.[1]) ?? '';
      if (!list || list.ordered !== isOrdered) {
        closeList();
        list = { type: 'list', ordered: isOrdered, items: [] };
      }
      const activeList = list;
      activeList.items.push(parseInline(content.trim()));
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  closeList();
  flushParagraph(paragraph, blocks);
  return blocks;
}

export function inlineToPlainText(inlines: InlineNode[]): string {
  return inlines.map((node) => node.value).join('');
}
