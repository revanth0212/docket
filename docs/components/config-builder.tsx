'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type ReactFlowInstance
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import styles from './config-builder.module.css';

import {
  getAdapterById,
  getAdaptersByCategory,
  getCategories,
  CATEGORY_LABELS,
  CATEGORY_COLORS
} from '@/lib/config-builder/registry';
import {
  generateArtifacts,
  parseConfig,
  downloadFile,
  copyToClipboard
} from '@/lib/config-builder/engine';
import { validateCanvas, canConnectToPort, hasPlatformConnection } from '@/lib/config-builder/rules';
import type { BuilderNode, BuilderEdge, AdapterCategory } from '@/lib/config-builder/types';

function toReactFlowNode(builderNode: BuilderNode): Node {
  const adapter = getAdapterById(builderNode.adapterId);
  return {
    id: builderNode.id,
    type: 'adapterNode',
    position: builderNode.position,
    data: {
      adapterId: builderNode.adapterId,
      label: adapter?.label ?? builderNode.adapterId,
      category: adapter?.category ?? 'platform',
      icon: adapter?.icon ?? '⬡',
      color: adapter ? CATEGORY_COLORS[adapter.category] : '#94a3b8',
      config: builderNode.config
    }
  };
}

function toReactFlowEdge(builderEdge: BuilderEdge): Edge {
  return {
    id: builderEdge.id,
    source: builderEdge.source,
    target: builderEdge.target,
    sourceHandle: builderEdge.sourcePort,
    targetHandle: builderEdge.targetPort,
    animated: true,
    style: { stroke: '#38bdf8', strokeWidth: 2 }
  };
}

const AdapterNode = React.memo(function AdapterNode({ data, selected }: { data: any; selected?: boolean }) {
  const adapter = getAdapterById(data.adapterId);
  const isPlatform = data.category === 'platform';

  return (
    <div className={`${styles.adapterNode} ${selected ? styles.adapterNodeSelected : ''}`}>
      {!isPlatform && (
        <Handle
          type="target"
          position={Position.Left}
          id="from-platform"
          style={{ background: '#94a3b8', width: 10, height: 10 }}
        />
      )}
      <div
        className={styles.adapterNodeHeader}
        style={{ borderLeft: `3px solid ${data.color}` }}
      >
        <span className={styles.adapterNodeIcon}>{data.icon}</span>
        <div>
          <div className={styles.adapterNodeLabel}>{data.label}</div>
          <div className={styles.adapterNodeCategory}>{CATEGORY_LABELS[data.category]}</div>
        </div>
      </div>
      <div className={styles.adapterNodeBody}>{adapter?.description ?? ''}</div>
      {isPlatform && adapter && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="to-llm"
            style={{ top: 20, background: CATEGORY_COLORS.llm, width: 10, height: 10 }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="to-embedder"
            style={{ top: 44, background: CATEGORY_COLORS.embedder, width: 10, height: 10 }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="to-store"
            style={{ top: 68, background: CATEGORY_COLORS.store, width: 10, height: 10 }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="to-blob"
            style={{ top: 92, background: CATEGORY_COLORS.blob, width: 10, height: 10 }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="to-queue"
            style={{ top: 116, background: CATEGORY_COLORS.queue, width: 10, height: 10 }}
          />
        </>
      )}
    </div>
  );
});

const nodeTypes = {
  adapterNode: AdapterNode
};

function Inspector({
  node,
  onChange
}: {
  node: BuilderNode | null;
  onChange: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  if (!node) {
    return (
      <div className={styles.emptyState}>
        Select an adapter on the canvas to configure it.
      </div>
    );
  }

  const adapter = getAdapterById(node.adapterId);
  if (!adapter) return null;

  const handleChange = (key: string, value: unknown) => {
    onChange(node.id, { ...node.config, [key]: value });
  };

  return (
    <>
      <div className={styles.inspectorTitle}>{adapter.label}</div>
      <div className={styles.inspectorDescription}>{adapter.description}</div>
      {adapter.configSchema.map((field) => (
        <div key={field.key} className={styles.field}>
          <label className={styles.fieldLabel}>{field.label}</label>
          {field.description && (
            <div className={styles.fieldHint}>{field.description}</div>
          )}
          {field.type === 'boolean' ? (
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem' }}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={Boolean(node.config[field.key])}
                onChange={(e) => handleChange(field.key, e.target.checked)}
              />
              Enable
            </label>
          ) : field.type === 'select' ? (
            <select
              className={styles.select}
              value={String(node.config[field.key] ?? field.default ?? '')}
              onChange={(e) => handleChange(field.key, e.target.value)}
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.secret ? 'password' : field.type === 'number' ? 'number' : 'text'}
              className={styles.input}
              value={String(node.config[field.key] ?? '')}
              placeholder={field.placeholder || field.envVar}
              onChange={(e) => {
                const raw = e.target.value;
                const value = field.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw;
                handleChange(field.key, value);
              }}
            />
          )}
        </div>
      ))}
    </>
  );
}

function OutputPanel({
  nodes,
  edges,
  selectedNodeId,
  onNodeConfigChange
}: {
  nodes: BuilderNode[];
  edges: BuilderEdge[];
  selectedNodeId: string | null;
  onNodeConfigChange: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const [activeTab, setActiveTab] = useState<'configure' | 'config' | 'env' | 'install' | 'steps'>('config');
  const artifacts = useMemo(() => generateArtifacts(nodes, edges), [nodes, edges]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'configure':
        return <Inspector node={selectedNode} onChange={onNodeConfigChange} />;
      case 'config':
        return <pre className={styles.codeBlock}>{artifacts.configYaml}</pre>;
      case 'env':
        return <pre className={styles.codeBlock}>{artifacts.envExample}</pre>;
      case 'install':
        return <pre className={styles.codeBlock}>{artifacts.installCommands}</pre>;
      case 'steps':
        return (
          <div>
            {artifacts.setupSteps.map((step) => (
              <div key={step.order} className={styles.step}>
                <div className={styles.stepTitle}>
                  {step.order}. {step.title}
                </div>
                <div className={styles.stepDescription}>{step.description}</div>
                {step.command && (
                  <div className={styles.stepCommand}>{step.command}</div>
                )}
              </div>
            ))}
          </div>
        );
    }
  };

  const handleCopy = async () => {
    let text = '';
    switch (activeTab) {
      case 'config':
        text = artifacts.configYaml;
        break;
      case 'env':
        text = artifacts.envExample;
        break;
      case 'install':
        text = artifacts.installCommands;
        break;
      case 'steps':
        text = artifacts.setupSteps
          .map((s) => `${s.order}. ${s.title}\n${s.description}${s.command ? '\n' + s.command : ''}`)
          .join('\n\n');
        break;
      case 'configure':
        text = 'Switch to an output tab to copy content.';
        break;
    }
    await copyToClipboard(text);
  };

  const handleDownload = () => {
    switch (activeTab) {
      case 'config':
        downloadFile('docket.yaml', artifacts.configYaml, 'text/yaml');
        break;
      case 'env':
        downloadFile('.env.example', artifacts.envExample, 'text/plain');
        break;
      case 'install':
        downloadFile('install.sh', artifacts.installCommands, 'text/x-shellscript');
        break;
      case 'steps':
        const stepsText = artifacts.setupSteps
          .map((s) => `${s.order}. ${s.title}\n${s.description}${s.command ? '\n' + s.command : ''}`)
          .join('\n\n');
        downloadFile('SETUP.md', stepsText, 'text/markdown');
        break;
    }
  };

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'configure', label: 'Configure' },
    { key: 'config', label: 'Config' },
    { key: 'env', label: 'Env' },
    { key: 'install', label: 'Install' },
    { key: 'steps', label: 'Steps' }
  ];

  return (
    <div className={styles.sidebar}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.panel}>{renderContent()}</div>
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', borderTop: '1px solid var(--fd-border)' }}>
        <button className={styles.button} onClick={handleCopy}>
          Copy
        </button>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={handleDownload}
          disabled={activeTab === 'configure'}
        >
          Download
        </button>
      </div>
    </div>
  );
}

export default function ConfigBuilder() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const builderNodes = useMemo<BuilderNode[]>(
    () =>
      nodes.map((n) => ({
        id: n.id,
        adapterId: n.data.adapterId,
        config: n.data?.config || {},
        position: n.position
      })),
    [nodes]
  );

  const builderEdges = useMemo<BuilderEdge[]>(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourcePort: e.sourceHandle || '',
        targetPort: e.targetHandle || ''
      })),
    [edges]
  );

  const validationErrors = useMemo(
    () => validateCanvas(builderNodes, builderEdges),
    [builderNodes, builderEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return;

      const check = canConnectToPort(
        connection.source,
        connection.sourceHandle,
        connection.target,
        connection.targetHandle,
        builderNodes
      );
      if (!check.valid) return;

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: '#38bdf8', strokeWidth: 2 }
          },
          eds
        )
      );
    },
    [builderNodes, setEdges]
  );

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
        return false;
      }
      const targetHasConnection = hasPlatformConnection(connection.target, builderEdges);
      if (targetHasConnection) return false;
      const check = canConnectToPort(
        connection.source,
        connection.sourceHandle,
        connection.target,
        connection.targetHandle,
        builderNodes
      );
      return check.valid;
    },
    [builderNodes, builderEdges]
  );

  const onDragStart = (event: React.DragEvent, adapterId: string) => {
    event.dataTransfer.setData('application/docket-adapter', adapterId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const adapterId = event.dataTransfer.getData('application/docket-adapter');
      if (!adapterId || !reactFlowInstance) return;

      const adapter = getAdapterById(adapterId);
      if (!adapter) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      const newNode: Node = {
        id: `${adapter.category}-${adapter.id}-${Date.now()}`,
        type: 'adapterNode',
        position,
        data: {
          adapterId: adapter.id,
          label: adapter.label,
          category: adapter.category,
          icon: adapter.icon,
          color: CATEGORY_COLORS[adapter.category],
          config: { ...adapter.defaultConfig }
        }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeConfig = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, config } } : n))
      );
    },
    [setNodes]
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const { nodes: parsedNodes, edges: parsedEdges } = parseConfig(text);
      setNodes(parsedNodes.map(toReactFlowNode));
      setEdges(parsedEdges.map(toReactFlowEdge));
      setSelectedNodeId(null);
    },
    [setNodes, setEdges]
  );

  const handleReset = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
  }, [setNodes, setEdges]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Docket Config Builder</div>
        <div className={styles.actions}>
          <label className={styles.button} style={{ cursor: 'pointer' }}>
            Import YAML
            <input type="file" accept=".yaml,.yml" style={{ display: 'none' }} onChange={handleImport} />
          </label>
          <button className={styles.button} onClick={handleReset}>
            Reset
          </button>
          <button className={styles.button} onClick={handleDeleteSelected} disabled={!selectedNodeId}>
            Delete
          </button>
        </div>
      </div>
      <div className={styles.workspace}>
        <div className={styles.palette}>
          {getCategories().map((category) => (
            <div key={category} className={styles.category}>
              <div className={styles.categoryTitle}>{CATEGORY_LABELS[category as AdapterCategory]}</div>
              {getAdaptersByCategory(category as AdapterCategory).map((adapter) => (
                <div
                  key={adapter.id}
                  className={styles.paletteItem}
                  draggable
                  onDragStart={(e) => onDragStart(e, adapter.id)}
                  title={adapter.description}
                >
                  <span className={styles.paletteIcon}>{adapter.icon}</span>
                  <span>{adapter.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className={styles.canvasWrapper} ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onInit={onInit}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={null}
          >
            <Background gap={24} size={1} color="#334155" />
            <Controls />
            <MiniMap
              nodeColor={(n) => String(n.data.color ?? '#94a3b8')}
              maskColor="rgba(15, 23, 42, 0.7)"
              style={{ background: 'var(--fd-card)' }}
            />
          </ReactFlow>
        </div>
        <OutputPanel nodes={builderNodes} edges={builderEdges} selectedNodeId={selectedNodeId} onNodeConfigChange={updateNodeConfig} />
      </div>
      {validationErrors.length > 0 && (
        <div className={styles.validation}>
          {validationErrors.map((err, idx) => (
            <div key={idx} className={styles.validationError}>
              • {err.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
