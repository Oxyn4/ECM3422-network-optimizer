/* Node failure simulation

Removes one node, and every edge into or out of it, from a copy of the
network and re-runs Edmonds-Karp. The original network is never modified.

If the failed node is the source or the sink, no flow can be delivered, so
the new max flow is 0 and the result carries a warning. */

import { cloneNetwork, percentage, solveMaxFlow, validateTerminals } from './networkUtils.js';

export function simulateNodeFailure(graph, nodeId, source = graph?.source, sink = graph?.sink) {
    if (!graph || !(graph.list instanceof Map)) return { error: 'No network provided' };
    if (nodeId === undefined || nodeId === null) return { error: 'No node selected' };
    if (!graph.exists(nodeId)) return { error: `Node "${nodeId}" does not exist` };

    const terminalError = validateTerminals(graph, source, sink);
    if (terminalError) return { error: terminalError };

    const original = solveMaxFlow(graph, source, sink);

    const removedEdges = graph
        .allEdges()
        .filter((edge) => edge.source === nodeId || edge.target === nodeId)
        .map((edge) => edge.id);

    let newMaxFlow = 0;
    let flows = {};
    let warning = null;

    if (nodeId === source || nodeId === sink) {
        warning = `Node "${nodeId}" is the ${nodeId === source ? 'source' : 'sink'}; with it removed no flow can reach the sink`;
    } else {
        // removeNode refuses the FlowNet's own source, so delete directly on the copy
        const modified = cloneNetwork(graph);
        modified.list.delete(nodeId);
        modified.nodePositions.delete(nodeId);
        for (const neighbours of modified.list.values()) neighbours.delete(nodeId);

        const updated = solveMaxFlow(modified, source, sink);
        newMaxFlow = updated.maxFlow;
        flows = updated.flows;
    }

    const flowReduction = original.maxFlow - newMaxFlow;

    return {
        failedNode: nodeId,
        removedEdges,
        originalMaxFlow: original.maxFlow,
        newMaxFlow,
        flowReduction,
        percentageReduction: percentage(flowReduction, original.maxFlow),
        affectsMaxFlow: flowReduction > 0,
        flows,
        warning,
        highlight: { nodeIds: [nodeId], edgeIds: removedEdges },
    };
}
