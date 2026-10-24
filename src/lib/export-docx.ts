import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import {
  inlineToPlainText,
  parseMarkdown,
  type InlineNode,
} from '@/lib/markdown-parse';

const FONT_BODY = '微软雅黑';
const FONT_HEADING = '微软雅黑';
const INK = '2B2620';
const ACCENT = '9A4A2E';

function runsFromInline(
  inlines: InlineNode[],
  options?: { bold?: boolean; size?: number; color?: string },
): TextRun[] {
  return inlines.map((node) => {
    const base = {
      font: FONT_BODY,
      size: options?.size ?? 21, // half-point: 21 => 10.5pt
      color: options?.color ?? INK,
    };
    switch (node.type) {
      case 'strong':
        return new TextRun({ ...base, text: node.value, bold: true });
      case 'em':
        return new TextRun({ ...base, text: node.value, italics: true });
      case 'code':
        return new TextRun({
          ...base,
          text: node.value,
          font: 'Consolas',
          shading: { type: 'clear', fill: 'F2EEE7' },
        });
      case 'link':
        return new TextRun({
          ...base,
          text: node.value,
          color: ACCENT,
          underline: {},
        });
      default:
        return new TextRun({ ...base, text: node.value, bold: options?.bold });
    }
  });
}

export function buildDocx(markdown: string, title = '定制简历'): Document {
  const blocks = parseMarkdown(markdown);
  const children: Paragraph[] = [];

  blocks.forEach((block) => {
    switch (block.type) {
      case 'heading': {
        if (block.level === 1) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: runsFromInline(block.inlines, {
                bold: true,
                size: 36,
                color: INK,
              }),
            }),
          );
        } else if (block.level === 2) {
          children.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 280, after: 100 },
              border: {
                bottom: { color: 'E3DDD2', space: 4, style: BorderStyle.SINGLE, size: 6 },
              },
              children: [
                new TextRun({
                  text: inlineToPlainText(block.inlines),
                  font: FONT_HEADING,
                  bold: true,
                  size: 26,
                  color: ACCENT,
                }),
              ],
            }),
          );
        } else {
          children.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 180, after: 60 },
              children: runsFromInline(block.inlines, {
                bold: true,
                size: 23,
                color: INK,
              }),
            }),
          );
        }
        break;
      }
      case 'paragraph':
        children.push(
          new Paragraph({
            spacing: { after: 80, line: 300 },
            children: runsFromInline(block.inlines),
          }),
        );
        break;
      case 'quote':
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            indent: { left: 240 },
            children: runsFromInline(block.inlines, { color: '5C554B' }),
          }),
        );
        break;
      case 'hr':
        children.push(
          new Paragraph({
            spacing: { before: 80, after: 80 },
            border: {
              bottom: { color: 'E3DDD2', space: 1, style: BorderStyle.SINGLE, size: 6 },
            },
            children: [],
          }),
        );
        break;
      case 'list':
        block.items.forEach((item, i) => {
          children.push(
            new Paragraph({
              spacing: { after: 50, line: 290 },
              bullet: block.ordered ? undefined : { level: 0 },
              numbering: block.ordered
                ? { reference: 'resume-numbering', level: 0 }
                : undefined,
              indent: block.ordered ? { left: 360, hanging: 260 } : undefined,
              children: block.ordered
                ? [
                    new TextRun({ text: `${i + 1}. `, font: FONT_BODY, size: 21, color: ACCENT, bold: true }),
                    ...runsFromInline(item),
                  ]
                : runsFromInline(item),
            }),
          );
        });
        break;
    }
  });

  return new Document({
    creator: '职墨 AI',
    title,
    description: '由职墨 AI 生成的定制简历',
    numbering: {
      config: [
        {
          reference: 'resume-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: { indent: { left: 360, hanging: 260 } },
                run: { color: ACCENT, bold: true },
              },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: FONT_BODY, size: 21, color: INK },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 800, right: 900, bottom: 800, left: 900 },
          },
        },
        children,
      },
    ],
  });
}

/** 触发浏览器下载 .docx */
export async function downloadDocx(markdown: string, filename: string, title?: string): Promise<void> {
  const doc = buildDocx(markdown, title);
  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function downloadTextFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
