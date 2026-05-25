import type { Plugin } from 'unified';
import type { Root, Code } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * Remark plugin that converts ` ```mermaid ` code blocks into MDX JSX
 * `<Mermaid chart="..." />` nodes. This runs before rehype-pretty-code
 * (Shiki) so the block never gets syntax-highlighted.
 */
export const remarkMermaid: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || typeof index !== 'number') return;

      // Replace the code node with an MDX JSX node
      const jsxNode = {
        type: 'mdxJsxFlowElement',
        name: 'Mermaid',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'chart',
            value: node.value
          }
        ],
        children: []
      } as any;

      parent.children[index] = jsxNode;
    });
  };
};
