
/* Node failure simualtion

Removes a node and all the edges connected to it then
runs Edmonds Karp again to see how much the flow changes.
Doesnt change the orginal network.

If the node is the source or sink then the max flow is 0.
*/

import { cloneNetwork, percentage, solveMaxFlow, validateTerminals } from './networkUtils.js';

export function simulateNodeFailure(graph, nodeId, source = graph?.source, sink = graph?.sink) {
    if (!graph || !(graph.list instanceof Map)) return { error: 'No network provided' };
    if (nodeId === undefined || nodeId === null) return { error: 'No node selected' };
    if (!graph.exists(nodeId)) return { error: `Node "${nodeId}" does not exist` };

    const terminalError = validateTerminals(graph, source, sink);
    if (terminalError) return { error: terminalError };

    const before = solveMaxFlow(graph, source, sink);

    // Finding all edges connected to the failed node
    const removedEdges = graph.allEdges()
        .filter(edge => edge.source === nodeId || edge.target === nodeId)
        .map(edge => edge.id);

    let newMaxFlow = 0;
    let flows = {};
    let warning = null;

    if (nodeId === source || nodeId === sink) {
        warning = `Node "${nodeId}" is the ${nodeId === source ? 'source' : 'sink'}; with it removed no flow can reach the sink`;
    } else {
        // Make a copy so the orginal graph isnt changed
        const copy = cloneNetwork(graph);

        // Removing the node and its connections
        copy.list.delete(nodeId);
        copy.nodePositions.delete(nodeId);

        for (const neighbours of copy.list.values()) {
            neighbours.delete(nodeId);
        }

        // Calculate the max flow again
        const result = solveMaxFlow(copy, source, sink);

        newMaxFlow = result.maxFlow;
        flows = result.flows;
    }

    // Work out how much flow was lost
    const flowReduction = before.maxFlow - newMaxFlow;

    return {
        failedNode: nodeId,
        removedEdges,
        originalMaxFlow: before.maxFlow,
        newMaxFlow,
        flowReduction,
        percentageReduction: percentage(flowReduction, before.maxFlow),
        affectsMaxFlow: flowReduction > 0,
        flows,
        warning,
        highlight: { nodeIds: [nodeId], edgeIds: removedEdges },
    };
}

