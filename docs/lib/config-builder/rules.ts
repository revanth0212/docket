// docs/lib/config-builder/rules.ts
// Wiring rules for the Config Builder canvas.

import { AdapterCategory, AdapterEntry, BuilderEdge, BuilderNode } from './types';
import { getAdapterById } from './registry';

export interface ConnectionCheck {
  valid: boolean;
  reason?: string;
}

/**
 * Check whether a proposed edge is valid.
 * First version: only Platform output -> adapter input is allowed,
 * and the platform port category must match the adapter category.
 */
export function isValidConnection(
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string,
  nodes: BuilderNode[]
): ConnectionCheck {
  const sourceNode = nodes.find((n) => n.id === sourceNodeId);
  const targetNode = nodes.find((n) => n.id === targetNodeId);
  if (!sourceNode || !targetNode) {
    return { valid: false, reason: 'Source or target node not found' };
  }

  const sourceAdapter = getAdapterById(sourceNode.adapterId);
  const targetAdapter = getAdapterById(targetNode.adapterId);
  if (!sourceAdapter || !targetAdapter) {
    return { valid: false, reason: 'Unknown adapter' };
  }

  const sourcePort = sourceAdapter.ports.out.find((p) => p.id === sourcePortId);
  const targetPort = targetAdapter.ports.in.find((p) => p.id === targetPortId);
  if (!sourcePort || !targetPort) {
    return { valid: false, reason: 'Unknown port' };
  }

  // Only platform can be a source in v1.
  if (sourceAdapter.category !== 'platform') {
    return { valid: false, reason: 'Only Platform can drive adapters in this version' };
  }

  // Target must not be another platform.
  if (targetAdapter.category === 'platform') {
    return { valid: false, reason: 'Platform cannot connect to Platform' };
  }

  // Port category must match adapter category.
  if (sourcePort.provides && sourcePort.provides !== targetAdapter.category) {
    return { valid: false, reason: `Port ${sourcePort.label} cannot connect to ${targetAdapter.category}` };
  }

  if (targetPort.accepts && !targetPort.accepts.includes(sourceAdapter.category)) {
    return { valid: false, reason: `Target port does not accept ${sourceAdapter.category}` };
  }

  // One connection per category target in v1.
  const existing = nodes.find((n) => {
    if (n.id === targetNodeId) return false;
    const a = getAdapterById(n.adapterId);
    return a?.category === targetAdapter.category;
  });
  // We allow multiple adapters of same category, but each adapter node can only have one incoming platform edge.
  const existingIncoming = nodes.some((n) => {
    // handled in edge list below; placeholder
    return false;
  });

  return { valid: true };
}

/**
 * Return true if the edge list already contains an incoming platform edge for a node.
 */
export function hasPlatformConnection(nodeId: string, edges: BuilderEdge[]): boolean {
  return edges.some((e) => e.target === nodeId);
}

/**
 * Validate a full canvas and return any errors.
 */
export interface ValidationError {
  message: string;
  nodeId?: string;
}

export function validateCanvas(nodes: BuilderNode[], edges: BuilderEdge[]): ValidationError[] {
  const errors: ValidationError[] = [];

  const platformNodes = nodes.filter((n) => getAdapterById(n.adapterId)?.category === 'platform');
  if (platformNodes.length === 0) {
    errors.push({ message: 'Add a Platform node to define your deployment mode.' });
  }
  if (platformNodes.length > 1) {
    errors.push({ message: 'Only one Platform node is allowed.' });
  }

  const requiredCategories: AdapterCategory[] = ['llm', 'embedder', 'store', 'blob', 'queue'];
  for (const category of requiredCategories) {
    const adapters = nodes.filter((n) => getAdapterById(n.adapterId)?.category === category);
    if (adapters.length === 0) {
      errors.push({ message: `Add at least one ${category} adapter.` });
    }
  }

  // Ensure every non-platform node has a platform connection.
  for (const node of nodes) {
    const adapter = getAdapterById(node.adapterId);
    if (!adapter || adapter.category === 'platform') continue;
    if (!hasPlatformConnection(node.id, edges)) {
      errors.push({ message: `${adapter.label} is not connected to a Platform.`, nodeId: node.id });
    }
  }

  return errors;
}

/**
 * Determine whether a source port can legally start a connection to any target.
 * Used by React Flow to decide if a dragged connection is allowed.
 */
export function canStartConnectionFromPort(
  sourceNodeId: string,
  sourcePortId: string,
  nodes: BuilderNode[]
): ConnectionCheck {
  const sourceNode = nodes.find((n) => n.id === sourceNodeId);
  if (!sourceNode) return { valid: false, reason: 'Source node not found' };
  const sourceAdapter = getAdapterById(sourceNode.adapterId);
  if (!sourceAdapter) return { valid: false, reason: 'Unknown adapter' };
  const sourcePort = sourceAdapter.ports.out.find((p) => p.id === sourcePortId);
  if (!sourcePort) return { valid: false, reason: 'Unknown port' };
  if (sourceAdapter.category !== 'platform') {
    return { valid: false, reason: 'Only Platform outputs can be wired in this version' };
  }
  return { valid: true };
}

/**
 * Determine whether a target port can accept a connection from a given source.
 */
export function canConnectToPort(
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string,
  nodes: BuilderNode[]
): ConnectionCheck {
  return isValidConnection(sourceNodeId, sourcePortId, targetNodeId, targetPortId, nodes);
}
