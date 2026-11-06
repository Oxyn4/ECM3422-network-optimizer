
/* Shared functions for network analysis
   Used for min cut, bottlenecks and node/edge failure simualtions.

   We use copies of the network so the orginal graph
   isnt changed when running the algorithms.
*/

import { FlowNet } from '../data/sampleNetwork.js';
import { edmondsKarp } from './ek.js';

// Make a copy of the network with all nodes, edges and positions
// Keeps the same ids but should only be used for analysis
export function cloneNetwork(network) {
    const copy = Object.create(FlowNet.prototype);

    copy.nodeGenerator = network.nodeGenerator;
    copy.edgeGenerator = network.edgeGenerator;
    copy.source = network.source;
    copy.sink = network.sink;

    copy.nodePositions = new Map(network.nodePositions);
    copy.list = new Map();

    for (const [nodeId, neighbours] of network.list) {
        const edges = new Map();

        for (const [target, edge] of neighbours) {
            edges.set(target, {
                id: edge.id,
                flow: edge.flow,
                capacity: edge.capacity
            });
        }

        copy.list.set(nodeId, edges);
    }

    return copy;
}


// The UI uses edge-A but the network just stores A
// Allow both formats
export function normaliseEdgeId(edgeId) {
    if (typeof edgeId !== 'string') return null;

    return edgeId.startsWith('edge-') ? edgeId.slice(5) : edgeId;
}


// Search through the network to find an edge with the given id
export function locateEdge(network, edgeId) {
    const id = normaliseEdgeId(edgeId);

    if (id === null) return null;

    for (const [source, neighbours] of network.list) {
        for (const [target, edge] of neighbours) {
            if (edge.id === id) {
                return { source, target, edge };
            }
        }
    }

    return null;
}


// Build the residual graph used for finding the min cut
// Forward = capacity minus flow, backwards = current flow
export function buildResidualGraph(network) {
    const residual = {};

    for (const nodeId of network.list.keys()) {
        residual[nodeId] = {};
    }

    for (const [u, neighbours] of network.list) {
        for (const [v, edge] of neighbours) {

            residual[u][v] = (residual[u][v] ?? 0) + (edge.capacity - edge.flow);
            residual[v][u] = (residual[v][u] ?? 0) + edge.flow;
        }
    }

    return residual;
}


// Check that source and sink are both valid nodes
// Return an error if theres a problem
export function validateTerminals(network, source, sink) {
    if (source === undefined || source === null) return 'No source node selected';
    if (sink === undefined || sink === null) return 'No sink node selected';

    if (!network.exists(source)) return `Source node "${source}" does not exist`;
    if (!network.exists(sink)) return `Sink node "${sink}" does not exist`;

    if (source === sink) return 'Source and sink must be different nodes';

    return null;
}


// Run Edmonds Karp on a copy so we dont change the main network
export function solveMaxFlow(network, source = network.source, sink = network.sink) {
    const graphCopy = cloneNetwork(network);

    graphCopy.source = source;
    graphCopy.sink = sink;

    const { maxFlow, flows } = edmondsKarp(graphCopy);

    return { maxFlow, flows, network: graphCopy };
}


// Work out the percentage change
export function percentage(part, whole) {
    if (whole === 0) return 0;

    return Math.round((part / whole) * 10000) / 100;
}

