/* Shared helpers for the network analysis modules (min cut, bottlenecks,
   failure simulations, multi source/sink).

   All analysis works on a copy of the FlowNet, so the network the UI is
   showing is never modified. */

import { FlowNet } from '../data/sampleNetwork.js';
import { edmondsKarp } from './ek.js';

// Deep copy of a FlowNet: nodes, edges (with their ids), positions, source and sink.
// The copy is meant for analysis only: it shares the id generators with the
// original, so do not add nodes or edges to it through add()/connect().
export function cloneNetwork(network) {
    const copy = Object.create(FlowNet.prototype);
    copy.nodeGenerator = network.nodeGenerator;
    copy.edgeGenerator = network.edgeGenerator;
    copy.source = network.source;
    copy.sink = network.sink;
    copy.nodePositions = new Map(network.nodePositions);
    copy.list = new Map();
    for (const [nodeId, neighbours] of network.list) {
        const inner = new Map();
        for (const [target, edge] of neighbours) {
            inner.set(target, { id: edge.id, flow: edge.flow, capacity: edge.capacity });
        }
        copy.list.set(nodeId, inner);
    }
    return copy;
}

// The UI refers to edges as "edge-A"; the FlowNet stores them as "A". Accept both.
export function normaliseEdgeId(edgeId) {
    if (typeof edgeId !== 'string') return null;
    return edgeId.startsWith('edge-') ? edgeId.slice(5) : edgeId;
}

// Find an edge by id. Returns { source, target, edge } or null.
export function locateEdge(network, edgeId) {
    const id = normaliseEdgeId(edgeId);
    if (id === null) return null;
    for (const [source, neighbours] of network.list) {
        for (const [target, edge] of neighbours) {
            if (edge.id === id) return { source, target, edge };
        }
    }
    return null;
}

// Residual graph in the format findMinCut expects:
//   { S: { A: 0, B: 5 }, A: { S: 10, T: 0 } }
// forward entry = capacity - flow, backward entry = flow.
export function buildResidualGraph(network) {
    const residual = {};
    for (const nodeId of network.list.keys()) residual[nodeId] = {};

    for (const [u, neighbours] of network.list) {
        for (const [v, edge] of neighbours) {
            residual[u][v] = (residual[u][v] ?? 0) + (edge.capacity - edge.flow);
            residual[v][u] = (residual[v][u] ?? 0) + edge.flow;
        }
    }
    return residual;
}

// Check a source/sink pair against a network. Returns an error string or null.
export function validateTerminals(network, source, sink) {
    if (source === undefined || source === null) return 'No source node selected';
    if (sink === undefined || sink === null) return 'No sink node selected';
    if (!network.exists(source)) return `Source node "${source}" does not exist`;
    if (!network.exists(sink)) return `Sink node "${sink}" does not exist`;
    if (source === sink) return 'Source and sink must be different nodes';
    return null;
}

// Run Edmonds-Karp on a copy of the network with the given source and sink.
// Returns { maxFlow, flows, network } where network is the solved copy.
export function solveMaxFlow(network, source = network.source, sink = network.sink) {
    const copy = cloneNetwork(network);
    copy.source = source;
    copy.sink = sink;
    const { maxFlow, flows } = edmondsKarp(copy);
    return { maxFlow, flows, network: copy };
}

export function percentage(part, whole) {
    if (whole === 0) return 0;
    return Math.round((part / whole) * 10000) / 100;
}
