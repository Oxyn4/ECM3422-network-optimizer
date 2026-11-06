
/* Bottleneck detection

Finds the edges that are limiting the max flow in the network.
These are the edges found from the min cut and are fully used.

Returns the bottleneck edges along with info for the UI
to highlight them on the graph.

If sensitivity is true it also checks how much the flow
increases when we increase the capacity of each edge.
Sometimes increasing one edge doesnt help if theres
another bottleneck in the network.
*/

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

    // Find the min cut edges
    const result = minCutOfNetwork(network, source, sink);

    if (result.error) return { error: result.error };

    // Edges we dont want to include
    const excluded = new Set(excludeEdgeIds);

    const bottlenecks = result.cutEdges
        .filter(edge => !excluded.has(edge.id))
        .map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            capacity: edge.capacity,
            flow: result.flows[edge.id] ?? 0,
            isBottleneck: true,
        }));

    // Check if increasing the edge capacity improves max flow
    if (sensitivity) {

        for (const edge of bottlenecks) {

            // Use a copy so the orginal isnt changed
            const copy = cloneNetwork(network);

            copy.setCapacity(edge.source, edge.target, edge.capacity + increase);

            const { maxFlow } = solveMaxFlow(copy, source, sink);

            edge.maxFlowIfIncreased = maxFlow;
            edge.improvement = maxFlow - result.maxFlow;
        }
    }

    // Get all nodes connected to the bottleneck edges
    const nodeIds = [...new Set(bottlenecks.flatMap(edge => [edge.source, edge.target]))];

    return {
        maxFlow: result.maxFlow,
        totalCutCapacity: bottlenecks.reduce((total, edge) => total + edge.capacity, 0),
        bottlenecks,
        bottleneckEdgeIds: bottlenecks.map(edge => edge.id),
        sourceSide: result.reachable,

        // Node and edge ids used for highlighting on the UI
        highlight: {
            nodeIds,
            edgeIds: bottlenecks.map(edge => edge.id)
        },
    };
}
