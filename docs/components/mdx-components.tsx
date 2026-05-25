'use client';

import { Mermaid } from './mermaid';

function isMermaidCodeBlock(node: React.ReactNode): boolean {
  if (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    node.type === 'code'
  ) {
    const props = (node as any).props || {};
    const className = props.className || '';
    return className.includes('language-mermaid');
  }
  return false;
}

function getMermaidChart(node: React.ReactNode): string | null {
  if (
    typeof node === 'object' &&
    node !== null &&
    'props' in node
  ) {
    const props = (node as any).props || {};
    return typeof props.children === 'string' ? props.children : null;
  }
  return null;
}

export function PreWithMermaid({ children, ...props }: React.ComponentProps<'pre'>) {
  // Check if the pre contains a single code block with language-mermaid
  const childArray = Array.isArray(children) ? children : [children];

  if (childArray.length === 1 && isMermaidCodeBlock(childArray[0])) {
    const chart = getMermaidChart(childArray[0]);
    if (chart) {
      return <Mermaid chart={chart} />;
    }
  }

  return <pre {...props}>{children}</pre>;
}
