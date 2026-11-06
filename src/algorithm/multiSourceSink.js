/* Multiple sources and sinks

Adds a virtual super-source with an edge to every source and a virtual
super-sink with an edge from every sink, then runs Edmonds-Karp between
them. Each artificial edge's capacity is the total capacity leaving that
source (or entering that sink), so it can never be the limiting edge on its
own. Artificial nodes/edges are left out of the user-facing results. */

import { findMinCut } from './minCut.js';
import { buildResidualGraph, cloneNetwork, solveMaxFlow } from './networkUtils.js';

export const SUPER_SOURCE = '__SUPER_SOURCE__';
export const SUPER_SINK = '__SUPER_SINK__';

const isArtificialNode = (id) => id === SUPER_SOURCE || id === SUPER_SINK;

export function buildSuperNetwork(network, sources, sinks) {
    const copy = cloneNetwork(network);
    copy.list.set(SUPER_SOURCE, new Map());
    copy.list.set(SUPER_SINK, new Map());

    const all = network.allEdges();

    for (const s of sources) {
        const capacity = all.filter((e) => e.source === s).reduce((sum, e) => sum + e.capacity, 0);
        copy.list.get(SUPER_SOURCE).set(s, { id: `super-source-${s}`, flow: 0, capacity });
    }
    for (const t of sinks) {
        const capacity = all.filter((e) => e.target === t).reduce((sum, e) => sum + e.capacity, 0);
        copy.list.get(t).set(SUPER_SINK, { id: `super-sink-${t}`, flow: 0, capacity });
    }

    copy.source = SUPER_SOURCE;
    copy.sink = SUPER_SINK;
    return copy;
}

export function multiSourceSinkMaxFlow(network, sources, sinks) {
    if (!Array.isArray(sources) || sources.length === 0) return { error: 'Select at least one source' };
    if (!Array.isArray(sinks) || sinks.length === 0) return { error: 'Select at least one sink' };

    for (const id of [...sources, ...sinks]) {
        if (!network.exists(id)) return { error: `Node "${id}" does not exist` };
    }
    const overlap = sources.filter((s) => sinks.includes(s));
    if (overlap.length > 0) return { error: `Node(s) ${overlap.join(', ')} cannot be both a source and a sink` };

    const superNet = buildSuperNetwork(network, [...new Set(sources)], [...new Set(sinks)]);
    const solved = solveMaxFlow(superNet);

    const cut = findMinCut(
        { edges: superNet.allEdges() },
        buildResidualGraph(solved.network),
        SUPER_SOURCE
    );

    const isArtificialEdge = (e) => isArtificialNode(e.source) || isArtificialNode(e.target);

    const flows = Object.fromEntries(
        Object.entries(solved.flows).filter(([id]) => !id.startsWith('edge-super-'))
    );
    const bottlenecks = cut.cutEdges
        .filter((e) => !isArtificialEdge(e))
        .map((e) => ({ id: e.id, source: e.source, target: e.target, capacity: e.capacity, flow: flows[e.id] ?? 0 }));

    return {
        sources,
        sinks,
        maxFlow: solved.maxFlow,
        flows,
        bottlenecks,
        bottleneckEdgeIds: bottlenecks.map((b) => b.id),
        // true when a super edge is in the cut, i.e. a source's total out-capacity
        // (or a sink's in-capacity) is itself the limit
        limitedByTerminals: cut.cutEdges.some(isArtificialEdge),
    };
}
