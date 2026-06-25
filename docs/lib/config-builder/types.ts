// docs/lib/config-builder/types.ts
// Shared types for the interactive Config Builder.

export type AdapterCategory = 'platform' | 'store' | 'blob' | 'queue' | 'llm' | 'embedder';

export type ConfigFieldType = 'string' | 'number' | 'boolean' | 'select';

export interface SelectOption {
  value: string;
  label: string;
}

export interface ConfigField {
  key: string;
  label: string;
  description?: string;
  type: ConfigFieldType;
  default?: unknown;
  options?: SelectOption[];
  placeholder?: string;
  envVar: string; // environment variable name used in .env.example and YAML interpolation
  secret?: boolean; // if true, value is masked in the UI
}

export interface PortDef {
  id: string;
  label: string;
  accepts?: AdapterCategory[]; // for input ports: which source categories are valid
  provides?: AdapterCategory; // for output ports: which category this port represents
}

export interface AdapterEntry {
  id: string;                    // unique registry key (may include category disambiguation, e.g. "ollama-llm")
  providerKey: string;           // key used inside docket.yaml providers map (e.g. "ollama")
  category: AdapterCategory;
  label: string;                 // display name
  description: string;
  adapterPackage: string;        // e.g. "@docket/llm-ollama"
  icon: string; // single emoji or short string
  defaultConfig: Record<string, unknown>;
  configSchema: ConfigField[];
  installCommand?: string;
  requires?: string[];
  ports: {
    in: PortDef[];
    out: PortDef[];
  };
}

export interface BuilderNode {
  id: string;
  adapterId: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface BuilderEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  sourcePort: string;
  targetPort: string;
}

export interface GeneratedArtifacts {
  configYaml: string;
  envExample: string;
  installCommands: string;
  setupSteps: SetupStep[];
}

export interface SetupStep {
  order: number;
  title: string;
  description: string;
  command?: string;
}
