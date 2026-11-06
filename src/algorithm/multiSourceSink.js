
/* Multiple sources and sinks

Adds a super source connected to all the sources and a
super sink connected to all the sinks.

Then runs Edmonds Karp to find the max flow between them.
The extra edges use the total capacity of the sources and sinks
so they dont restrict the flow themselves.

The artifical nodes and edges arent included in the results.
*/

import { findMinCut } from './minCut.js';
import { buildResidualGraph, cloneNetwork, solveMaxFlow } from './networkUtils.js';

export const SUPER_SOURCE = '__SUPER_SOURCE__';
export const SUPER_SINK = '__SUPER_SINK__';

const isArtificialNode = (id) => id === SUPER_SOURCE || id === SUPER_SINK;


// Build the network with extra source and sink nodes
export function buildSuperNetwork(network, sources, sinks) {
    const copy = cloneNetwork(network);

    copy.list.set(SUPER_SOURCE, new Map());
    copy.list.set(SUPER_SINK, new Map());

    const edges = network.allEdges();

    // Connect the super source to each source
    for (const s of sources) {
        const capacity = edges.filter(e => e.source === s)
            .reduce((total, e) => total + e.capacity, 0);

        copy.list.get(SUPER_SOURCE).set(s, {
            id: `super-source-${s}`,
            flow: 0,
            capacity
        });
    }

    // Connect each sink to the super sink
    for (const t of sinks) {
        const capacity = edges.filter(e => e.target === t)
            .reduce((total, e) => total + e.capacity, 0);

        copy.list.get(t).set(SUPER_SINK, {
            id: `super-sink-${t}`,
            flow: 0,
            capacity
        });
    }

    copy.source = SUPER_SOURCE;
    copy.sink = SUPER_SINK;

    return copy;
}


// Find max flow when theres multiple sources or sinks
export function multiSourceSinkMaxFlow(network, sources, sinks) {
    if (!Array.isArray(sources) || sources.length === 0) return { error: 'Select at least one source' };
    if (!Array.isArray(sinks) || sinks.length === 0) return { error: 'Select at least one sink' };

    // Check all selected nodes actually exist
    for (const id of [...sources, ...sinks]) {
        if (!network.exists(id)) return { error: `Node "${id}" does not exist` };
    }

    // A node cant be a source and sink at the same time
    const duplicates = sources.filter(s => sinks.includes(s));

    if (duplicates.length > 0) {
        return { error: `Node(s) ${duplicates.join(', ')} cannot be both a source and a sink` };
    }

    const newNetwork = buildSuperNetwork(network, [...new Set(sources)], [...new Set(sinks)]);

    // Run max flow on the new network
    const result = solveMaxFlow(newNetwork);

    // Find min cut using the residual graph
    const cut = findMinCut(
        { edges: newNetwork.allEdges() },
        buildResidualGraph(result.network),
        SUPER_SOURCE
    );

    const isArtificialEdge = (e) => isArtificialNode(e.source) || isArtificialNode(e.target);

    // Remove the fake edges from the flow results
    const flows = Object.fromEntries(
        Object.entries(result.flows).filter(([id]) => !id.startsWith('edge-super-'))
    );

    // Only keep bottlenecks from the orginal network
    const bottlenecks = cut.cutEdges
        .filter(e => !isArtificialEdge(e))
        .map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            capacity: e.capacity,
            flow: flows[e.id] ?? 0
        }));

    return {
        sources,
        sinks,
        maxFlow: result.maxFlow,
        flows,
        bottlenecks,
        bottleneckEdgeIds: bottlenecks.map(b => b.id),

        // Check if the source or sink capacity is limiting the flow
        limitedByTerminals: cut.cutEdges.some(isArtificialEdge),
    };
}

