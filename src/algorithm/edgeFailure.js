
/* Edge failure simualtion

Removes an edge from a copy of the network and then
runs Edmonds Karp again to see how much the flow drops.
The orginal network isnt changed.
*/

import { cloneNetwork, locateEdge, percentage, solveMaxFlow, validateTerminals } from './networkUtils.js';

export function simulateEdgeFailure(graph, edgeId, source = graph?.source, sink = graph?.sink) {

    if (!graph || !(graph.list instanceof Map)) return { error: 'No network provided' };

    const terminalError = validateTerminals(graph, source, sink);
    if (terminalError) return { error: terminalError };

    // Find the edge we want to remove
    const edgeFound = locateEdge(graph, edgeId);

    if (!edgeFound) return { error: `Edge "${edgeId}" does not exist` };

    // Calculate the max flow before removing anything
    const before = solveMaxFlow(graph, source, sink);

    // Make a copy so the main network isnt affected
    const copy = cloneNetwork(graph);
    copy.removeEdge(edgeFound.source, edgeFound.target);

    // Run max flow again after removing the edge
    const result = solveMaxFlow(copy, source, sink);

    // Work out how much flow was lost
    const flowReduction = before.maxFlow - result.maxFlow;

    return {
        failedEdge: {
            id: `edge-${edgeFound.edge.id}`,
            source: edgeFound.source,
            target: edgeFound.target,
            capacity: edgeFound.edge.capacity,
            flowBeforeFailure: before.flows[`edge-${edgeFound.edge.id}`] ?? 0,
        },

        originalMaxFlow: before.maxFlow,
        newMaxFlow: result.maxFlow,
        flowReduction,
        percentageReduction: percentage(flowReduction, before.maxFlow),
        affectsMaxFlow: flowReduction > 0,
        flows: result.flows,
        highlight: { nodeIds: [], edgeIds: [`edge-${edgeFound.edge.id}`] },
    };
}
