/* Bottleneck detection

The min-cut edges are the edges that limit the maximum flow: together they
carry all the flow that reaches the sink and they are all saturated.

findBottlenecks returns them (id, source, target, capacity, flow) plus
highlight data the UI can feed straight into NetworkGraph.

With { sensitivity: true } it also checks each edge individually: how much
the max flow grows if that edge's capacity is increased by `increase`.
An edge in one min cut may not help on its own if another min cut exists. */

import { minCutOfNetwork } from './minCut.js';
import { cloneNetwork, solveMaxFlow } from './networkUtils.js';

export function findBottlenecks(network, options = {}) {
    const {
        source = network.source,
        sink = network.sink,
        sensitivity = false,
        increase = 1,
        excludeEdgeIds = [],
    } = options;

    const cut = minCutOfNetwork(network, source, sink);
    if (cut.error) return { error: cut.error };

    const excluded = new Set(excludeEdgeIds);

    const bottlenecks = cut.cutEdges
        .filter((edge) => !excluded.has(edge.id))
        .map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            capacity: edge.capacity,
            flow: cut.flows[edge.id] ?? 0,
            isBottleneck: true,
        }));

    if (sensitivity) {
        for (const b of bottlenecks) {
            const copy = cloneNetwork(network);
            copy.setCapacity(b.source, b.target, b.capacity + increase);
            const { maxFlow } = solveMaxFlow(copy, source, sink);
            b.maxFlowIfIncreased = maxFlow;
            b.improvement = maxFlow - cut.maxFlow;
        }
    }

    const nodeIds = [...new Set(bottlenecks.flatMap((b) => [b.source, b.target]))];

    return {
        maxFlow: cut.maxFlow,
        totalCutCapacity: bottlenecks.reduce((sum, b) => sum + b.capacity, 0),
        bottlenecks,
        bottleneckEdgeIds: bottlenecks.map((b) => b.id),
        sourceSide: cut.reachable,
        // same shape as the EK panel's highlights: { nodeIds, edgeIds }
        highlight: { nodeIds, edgeIds: bottlenecks.map((b) => b.id) },
    };
}
