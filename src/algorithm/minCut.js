/* Minimum cut

Finds the set of edges that limits how much flow can reach the sink.
After max flow has been found, every node still reachable from the source in
the residual graph is on the source side of the cut; every original edge
from that side to the other side is a cut edge. By the max-flow min-cut
theorem, the total capacity of those edges equals the maximum flow.

Inputs:
 - originalGraph: original nodes/edges with capacities
 - residualGraph: remaining capacities after max flow
 - source: selected source node ID

   originalGraph edge format:
      { edges: [{ id: "edge-A", source: "S", target: "A", capacity: 10 }] }

   residualGraph format:
    {
      S: { A: 0, B: 5 },
      A: { S: 10, T: 0 }
    }
*/

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

    // BFS over edges that still have spare residual capacity
    const reachable = new Set([source]);
    const queue = [source];

    while (queue.length > 0) {
        const current = queue.shift();
        const neighbours = residualGraph[current] || {};

        for (const [next, capacity] of Object.entries(neighbours)) {
            if (capacity > 0 && !reachable.has(next)) {
                reachable.add(next);
                queue.push(next);
            }
        }
    }

    // original edges from the reachable side to the unreachable side
    const cutEdges = originalGraph.edges.filter(
        (edge) => reachable.has(edge.source) && !reachable.has(edge.target)
    );

    const totalCutCapacity = cutEdges.reduce((sum, edge) => sum + edge.capacity, 0);

    return {
        cutEdges,
        totalCutCapacity,
        reachable: [...reachable],
    };
}

// Convenience wrapper for a FlowNet: runs max flow on a copy, then finds the min cut.
export function minCutOfNetwork(network, source = network.source, sink = network.sink) {
    const error = validateTerminals(network, source, sink);
    if (error) return { error };

    const solved = solveMaxFlow(network, source, sink);
    const originalGraph = { edges: network.allEdges() };
    const residualGraph = buildResidualGraph(solved.network);
    const cut = findMinCut(originalGraph, residualGraph, source);

    return { maxFlow: solved.maxFlow, flows: solved.flows, ...cut };
}
