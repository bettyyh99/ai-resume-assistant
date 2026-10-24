import { Fragment, type ReactNode } from 'react';
import {
  parseMarkdown,
  type BlockNode,
  type InlineNode,
} from '@/lib/markdown-parse';

function renderInline(nodes: InlineNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (node.type) {
      case 'strong':
        return <strong key={key}>{node.value}</strong>;
      case 'em':
        return <em key={key}>{node.value}</em>;
      case 'code':
        return <code key={key}>{node.value}</code>;
      case 'link':
        return (
          <a
            key={key}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {node.value}
          </a>
        );
      default:
        return <Fragment key={key}>{node.value}</Fragment>;
    }
  });
}

function Block({ node, index }: { node: BlockNode; index: number }) {
  const key = `b-${index}`;
  switch (node.type) {
    case 'heading': {
      const Tag = (`h${node.level}`) as 'h1' | 'h2' | 'h3';
      return <Tag>{renderInline(node.inlines, key)}</Tag>;
    }
    case 'paragraph':
      return <p>{renderInline(node.inlines, key)}</p>;
    case 'quote':
      return <blockquote>{renderInline(node.inlines, key)}</blockquote>;
    case 'hr':
      return <hr />;
    case 'list':
      return node.ordered ? (
        <ol>
          {node.items.map((item, i) => (
            <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
          ))}
        </ol>
      ) : (
        <ul>
          {node.items.map((item, i) => (
            <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
          ))}
        </ul>
      );
  }
}

export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseMarkdown(content);
  return (
    <div className="md-body">
      {blocks.map((node, i) => (
        <Block key={i} node={node} index={i} />
      ))}
    </div>
  );
}
