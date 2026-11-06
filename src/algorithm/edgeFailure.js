/* Edge failure simulation

Removes one edge from a copy of the network and re-runs Edmonds-Karp to see
how much the maximum flow drops. The original network is never modified. */

import { cloneNetwork, locateEdge, percentage, solveMaxFlow, validateTerminals } from './networkUtils.js';

export function simulateEdgeFailure(graph, edgeId, source = graph?.source, sink = graph?.sink) {
    if (!graph || !(graph.list instanceof Map)) return { error: 'No network provided' };

    const terminalError = validateTerminals(graph, source, sink);
    if (terminalError) return { error: terminalError };

    const found = locateEdge(graph, edgeId);
    if (!found) return { error: `Edge "${edgeId}" does not exist` };

    const original = solveMaxFlow(graph, source, sink);

    const modified = cloneNetwork(graph);
    modified.removeEdge(found.source, found.target);
    const updated = solveMaxFlow(modified, source, sink);

    const flowReduction = original.maxFlow - updated.maxFlow;

    return {
        failedEdge: {
            id: `edge-${found.edge.id}`,
            source: found.source,
            target: found.target,
            capacity: found.edge.capacity,
            flowBeforeFailure: original.flows[`edge-${found.edge.id}`] ?? 0,
        },
        originalMaxFlow: original.maxFlow,
        newMaxFlow: updated.maxFlow,
        flowReduction,
        percentageReduction: percentage(flowReduction, original.maxFlow),
        affectsMaxFlow: flowReduction > 0,
        flows: updated.flows,
        highlight: { nodeIds: [], edgeIds: [`edge-${found.edge.id}`] },
    };
}
