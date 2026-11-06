
/* Minimum cut

Finds the edges that are limiting the max flow in the network.

After running max flow we use the residual graph to find
which nodes can still be reached from the source.
Any edge going from a reachable node to an unreachable node
is part of the min cut.

The total capacity of these edges should equal the max flow.
*/

// Helper functions
import { buildResidualGraph, solveMaxFlow, validateTerminals } from './networkUtils.js';

export function findMinCut(originalGraph, residualGraph, source) {

    if (!originalGraph || !Array.isArray(originalGraph.edges)) {
        throw new Error('findMinCut: originalGraph must have an edges array');
    }

    if (!residualGraph || typeof residualGraph !== 'object') {
        throw new Error('findMinCut: residualGraph must be an object');
    }

    if (source === undefined || source === null) {
        throw new Error('findMinCut: a source node is required');
    }

    // Find all nodes that can still be reached from the source
    const reachable = new Set([source]);
    const queue = [source];

    // BFS through the residual network
    while (queue.length > 0) {

        const node = queue.shift();
        const neighbours = residualGraph[node] || {};

        for (const [next, capacity] of Object.entries(neighbours)) {

            if (capacity > 0 && !reachable.has(next)) {
                reachable.add(next);
                queue.push(next);
            }
        }
    }

    // Find edges going from reachable to unreachable nodes
    const cutEdges = originalGraph.edges.filter(
        edge => reachable.has(edge.source) && !reachable.has(edge.target)
    );

    // Add up the capacities of all the cut edges
    const totalCutCapacity = cutEdges.reduce((total, edge) => total + edge.capacity, 0);

    return {
        cutEdges,
        totalCutCapacity,
        reachable: [...reachable],
    };
}


// Runs the max flow algorithum then calculates the min cut
// Uses a copy so the orginal graph isnt changed
export function minCutOfNetwork(network, source = network.source, sink = network.sink) {

    const error = validateTerminals(network, source, sink);

    if (error) return { error };

    // Work out the max flow first
    const result = solveMaxFlow(network, source, sink);

    const originalGraph = { edges: network.allEdges() };
    const residualGraph = buildResidualGraph(result.network);

    // Find the cut using the residual graph
    const cut = findMinCut(originalGraph, residualGraph, source);

    return {
        maxFlow: result.maxFlow,
        flows: result.flows,
        ...cut
    };
}
