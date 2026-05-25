// source.config.ts
import { defineDocs, defineConfig } from "fumadocs-mdx/config";

// lib/remark-mermaid.ts
import { visit } from "unist-util-visit";
var remarkMermaid = () => {
  return (tree) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "mermaid" || !parent || typeof index !== "number") return;
      const jsxNode = {
        type: "mdxJsxFlowElement",
        name: "Mermaid",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "chart",
            value: node.value
          }
        ],
        children: []
      };
      parent.children[index] = jsxNode;
    });
  };
};

// source.config.ts
var docs = defineDocs({
  dir: "content/docs"
});
var source_config_default = defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMermaid]
  }
});
export {
  source_config_default as default,
  docs
};
