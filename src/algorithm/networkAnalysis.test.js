import { describe, it, expect } from 'vitest';

import { FlowNet, makeRandomNetwork } from '../data/sampleNetwork.js';
import { edmondsKarp } from './ek.js';
import { findMinCut, minCutOfNetwork } from './minCut.js';
import { findBottlenecks } from './bottleneck.js';
import { simulateEdgeFailure } from './edgeFailure.js';
import { simulateNodeFailure } from './nodeFailure.js';
import { multiSourceSinkMaxFlow, SUPER_SOURCE, SUPER_SINK } from './multiSourceSink.js';
import { buildResidualGraph, cloneNetwork, locateEdge, solveMaxFlow } from './networkUtils.js';

// Build a FlowNet from a list of [from, to, capacity]. Node "A" is the source.
// Returns the network and a map of "from->to" to UI edge id.
function build(edges, nodeCount, sink) {
    const net = new FlowNet();
    for (let i = 1; i < nodeCount; i++) net.addNode();
    for (const [from, to, capacity] of edges) net.connect(from, to, 0, capacity);
    net.setSink(sink);
    const ids = {};
    for (const e of net.allEdges()) ids[`${e.source}->${e.target}`] = e.id;
    return { net, ids };
}

// Snapshot of everything an analysis could accidentally change
function snapshot(net) {
    return JSON.stringify({ edges: net.allEdges(), nodes: net.nodes(), source: net.source, sink: net.sink });
}

// Classic CLRS-style network: A=source, F=sink, max flow 23
//   A->B 16, A->C 13, B->C 10, C->B 4, B->D 12, D->C 9, C->E 14, E->D 7, D->F 20, E->F 4
const clrs = () => build([
    ['A', 'B', 16], ['A', 'C', 13], ['B', 'C', 10], ['C', 'B', 4], ['B', 'D', 12],
    ['D', 'C', 9], ['C', 'E', 14], ['E', 'D', 7], ['D', 'F', 20], ['E', 'F', 4],
], 6, 'F');

describe('Edmonds-Karp', () => {
    it('finds the known max flow, including paths that need backward edges', () => {
        expect(edmondsKarp(clrs().net).maxFlow).toBe(23);

        // A->B->D->F first saturates B->D; the only way to reach 2 is to undo flow on C->D
        const { net } = build([['A', 'B', 1], ['A', 'C', 1], ['B', 'C', 1], ['B', 'D', 1], ['C', 'D', 1]], 4, 'D');
        expect(edmondsKarp(net).maxFlow).toBe(2);
    });

    it('gives the same answer when run twice', () => {
        const { net } = clrs();
        edmondsKarp(net);
        expect(edmondsKarp(net).maxFlow).toBe(23);
    });
});

describe('Minimum cut', () => {
    it('finds the min cut of a small graph with a known answer', () => {
        // A->B 3, B->C 1, C->D 5 : the 1 edge is the cut
        const { net, ids } = build([['A', 'B', 3], ['B', 'C', 1], ['C', 'D', 5]], 4, 'D');
        const result = minCutOfNetwork(net);

        expect(result.maxFlow).toBe(1);
        expect(result.totalCutCapacity).toBe(1);
        expect(result.cutEdges.map((e) => e.id)).toEqual([ids['B->C']]);
    });

    it('works directly from an original graph and residual graph', () => {
        const original = { edges: [
            { id: 'e1', source: 'S', target: 'A', capacity: 10 },
            { id: 'e2', source: 'S', target: 'B', capacity: 5 },
            { id: 'e3', source: 'A', target: 'T', capacity: 10 },
            { id: 'e4', source: 'B', target: 'T', capacity: 3 },
        ] };
        // after max flow 13: S->A full, S->B has 2 left, B->T full
        const residual = {
            S: { A: 0, B: 2 },
            A: { S: 10, T: 0 },
            B: { S: 3, T: 0 },
            T: { A: 10, B: 3 },
        };
        const { cutEdges, totalCutCapacity } = findMinCut(original, residual, 'S');
        expect(cutEdges.map((e) => e.id).sort()).toEqual(['e1', 'e4']);
        expect(totalCutCapacity).toBe(13);
    });

    it('handles a network with multiple min-cut edges', () => {
        const { net, ids } = clrs();
        const result = minCutOfNetwork(net);

        expect(result.totalCutCapacity).toBe(23);
        expect(result.cutEdges.map((e) => e.id).sort()).toEqual(
            [ids['B->D'], ids['E->D'], ids['E->F']].sort()
        );
    });

    it('min-cut capacity equals max-flow value on random networks', () => {
        for (let i = 0; i < 25; i++) {
            const net = makeRandomNetwork(15, 0.6, 1, 20, 2);
            const result = minCutOfNetwork(net);
            expect(result.totalCutCapacity).toBe(result.maxFlow);
            expect(result.maxFlow).toBe(edmondsKarp(cloneNetwork(net)).maxFlow);
        }
    });

    it('returns an empty cut with zero capacity for a disconnected network', () => {
        const { net } = build([['A', 'B', 5], ['C', 'D', 5]], 4, 'D');
        const result = minCutOfNetwork(net);
        expect(result.maxFlow).toBe(0);
        expect(result.cutEdges).toEqual([]);
        expect(result.totalCutCapacity).toBe(0);
    });

    it('treats zero-capacity edges as a cut of capacity zero', () => {
        const { net, ids } = build([['A', 'B', 5], ['B', 'C', 0]], 3, 'C');
        const result = minCutOfNetwork(net);
        expect(result.maxFlow).toBe(0);
        expect(result.totalCutCapacity).toBe(0);
        expect(result.cutEdges.map((e) => e.id)).toEqual([ids['B->C']]);
    });

    it('rejects bad input with clear errors', () => {
        expect(() => findMinCut(null, {}, 'A')).toThrow(/edges/);
        expect(() => findMinCut({ edges: [] }, null, 'A')).toThrow(/residualGraph/);
        const { net } = build([['A', 'B', 1]], 2, 'B');
        net.sink = null;
        expect(minCutOfNetwork(net).error).toMatch(/sink/);
    });

    it('builds a residual graph with forward and backward capacities', () => {
        const { net } = build([['A', 'B', 5]], 2, 'B');
        const solved = solveMaxFlow(net);
        expect(buildResidualGraph(solved.network)).toEqual({ A: { B: 0 }, B: { A: 5 } });
    });
});

describe('Bottleneck detection', () => {
    it('returns the min-cut edges with source, target and capacity', () => {
        const { net, ids } = clrs();
        const result = findBottlenecks(net);

        expect(result.maxFlow).toBe(23);
        expect(result.bottleneckEdgeIds.sort()).toEqual([ids['B->D'], ids['E->D'], ids['E->F']].sort());
        const bd = result.bottlenecks.find((b) => b.id === ids['B->D']);
        expect(bd).toMatchObject({ source: 'B', target: 'D', capacity: 12, flow: 12, isBottleneck: true });
        expect(result.highlight.edgeIds).toEqual(result.bottleneckEdgeIds);
    });

    it('reports how much each bottleneck would help if widened', () => {
        // two edges in series both limit to 5; widening only one does nothing
        const { net, ids } = build([['A', 'B', 5], ['B', 'C', 5], ['A', 'C', 2]], 3, 'C');
        const result = findBottlenecks(net, { sensitivity: true, increase: 3 });

        expect(result.maxFlow).toBe(7);
        for (const b of result.bottlenecks) {
            expect(b).toHaveProperty('improvement');
            expect(b.maxFlowIfIncreased).toBe(7 + b.improvement);
        }
        const ac = result.bottlenecks.find((b) => b.id === ids['A->C']);
        expect(ac.improvement).toBe(3);
    });

    it('does not modify the original network', () => {
        const { net } = clrs();
        const before = snapshot(net);
        findBottlenecks(net, { sensitivity: true });
        expect(snapshot(net)).toBe(before);
    });
});

describe('Edge failure simulation', () => {
    it('reduces max flow when a used edge fails', () => {
        const { net, ids } = clrs();
        const result = simulateEdgeFailure(net, ids['D->F']);

        expect(result.originalMaxFlow).toBe(23);
        expect(result.newMaxFlow).toBe(4);
        expect(result.flowReduction).toBe(19);
        expect(result.percentageReduction).toBeCloseTo(82.61, 2);
        expect(result.affectsMaxFlow).toBe(true);
        expect(result.failedEdge).toMatchObject({ id: ids['D->F'], source: 'D', target: 'F', capacity: 20 });
    });

    it('does not reduce max flow when a spare edge fails', () => {
        // two parallel routes, only one needed because the sink edge limits it
        const { net, ids } = build([['A', 'B', 5], ['A', 'C', 5], ['B', 'D', 5], ['C', 'D', 5], ['D', 'E', 5]], 5, 'E');
        const result = simulateEdgeFailure(net, ids['A->C']);

        expect(result.originalMaxFlow).toBe(5);
        expect(result.newMaxFlow).toBe(5);
        expect(result.flowReduction).toBe(0);
        expect(result.percentageReduction).toBe(0);
        expect(result.affectsMaxFlow).toBe(false);
    });

    it('accepts edge ids with or without the "edge-" prefix', () => {
        const { net, ids } = clrs();
        const bare = ids['D->F'].replace('edge-', '');
        expect(simulateEdgeFailure(net, bare).newMaxFlow).toBe(4);
    });

    it('does not modify the original network', () => {
        const { net, ids } = clrs();
        const before = snapshot(net);
        simulateEdgeFailure(net, ids['D->F']);
        expect(snapshot(net)).toBe(before);
        expect(locateEdge(net, ids['D->F'])).not.toBeNull();
    });

    it('handles a zero-capacity edge and a disconnected network', () => {
        const zero = build([['A', 'B', 5], ['B', 'C', 0]], 3, 'C');
        const r1 = simulateEdgeFailure(zero.net, zero.ids['B->C']);
        expect(r1).toMatchObject({ originalMaxFlow: 0, newMaxFlow: 0, flowReduction: 0, percentageReduction: 0 });

        const split = build([['A', 'B', 5], ['C', 'D', 5]], 4, 'D');
        const r2 = simulateEdgeFailure(split.net, split.ids['C->D']);
        expect(r2).toMatchObject({ originalMaxFlow: 0, newMaxFlow: 0, flowReduction: 0 });
    });

    it('returns clear errors for invalid input', () => {
        const { net } = clrs();
        expect(simulateEdgeFailure(net, 'edge-ZZZ').error).toMatch(/does not exist/);
        expect(simulateEdgeFailure(net, undefined).error).toMatch(/does not exist/);
        expect(simulateEdgeFailure(null, 'edge-A').error).toMatch(/No network/);
        expect(simulateEdgeFailure(net, 'edge-A', 'A', 'A').error).toMatch(/different/);
    });
});

describe('Node failure simulation', () => {
    it('reduces max flow when a used node fails', () => {
        const { net, ids } = clrs();
        const result = simulateNodeFailure(net, 'D');

        expect(result.originalMaxFlow).toBe(23);
        expect(result.newMaxFlow).toBe(4);
        expect(result.flowReduction).toBe(19);
        expect(result.failedNode).toBe('D');
        expect(result.removedEdges.sort()).toEqual(
            [ids['B->D'], ids['D->C'], ids['E->D'], ids['D->F']].sort()
        );
        expect(result.highlight.nodeIds).toEqual(['D']);
    });

    it('does not reduce max flow when a spare node fails', () => {
        const { net } = build([['A', 'B', 5], ['A', 'C', 5], ['B', 'D', 5], ['C', 'D', 5], ['D', 'E', 5]], 5, 'E');
        const result = simulateNodeFailure(net, 'C');
        expect(result).toMatchObject({ originalMaxFlow: 5, newMaxFlow: 5, flowReduction: 0, affectsMaxFlow: false });
    });

    it('reports zero flow with a warning when the source or sink fails', () => {
        const { net } = clrs();
        const src = simulateNodeFailure(net, 'A');
        expect(src).toMatchObject({ newMaxFlow: 0, flowReduction: 23, percentageReduction: 100 });
        expect(src.warning).toMatch(/source/);

        const sink = simulateNodeFailure(net, 'F');
        expect(sink).toMatchObject({ newMaxFlow: 0, flowReduction: 23 });
        expect(sink.warning).toMatch(/sink/);
    });

    it('returns clear errors for invalid nodes', () => {
        const { net } = clrs();
        expect(simulateNodeFailure(net, 'ZZ').error).toMatch(/does not exist/);
        expect(simulateNodeFailure(net, null).error).toMatch(/No node/);
        net.sink = null;
        expect(simulateNodeFailure(net, 'B').error).toMatch(/sink/);
    });

    it('does not modify the original network', () => {
        const { net } = clrs();
        const before = snapshot(net);
        simulateNodeFailure(net, 'D');
        simulateNodeFailure(net, 'A');
        expect(snapshot(net)).toBe(before);
        expect(net.exists('D')).toBe(true);
    });

    it('handles a disconnected network', () => {
        const { net } = build([['A', 'B', 5], ['C', 'D', 5]], 4, 'D');
        expect(simulateNodeFailure(net, 'C')).toMatchObject({ originalMaxFlow: 0, newMaxFlow: 0, flowReduction: 0 });
    });
});

describe('Multiple sources and sinks', () => {
    // A and B are sources, D and E are sinks
    //   A->C 4, B->C 6, C->D 3, C->E 5
    const multi = () => build([['A', 'C', 4], ['B', 'C', 6], ['C', 'D', 3], ['C', 'E', 5]], 5, 'E');

    it('finds the combined max flow through a super-source and super-sink', () => {
        const { net } = multi();
        const result = multiSourceSinkMaxFlow(net, ['A', 'B'], ['D', 'E']);
        expect(result.maxFlow).toBe(8);
    });

    it('leaves artificial nodes and edges out of the results', () => {
        const { net, ids } = multi();
        const result = multiSourceSinkMaxFlow(net, ['A', 'B'], ['D', 'E']);

        expect(result.bottleneckEdgeIds.sort()).toEqual([ids['C->D'], ids['C->E']].sort());
        for (const id of Object.keys(result.flows)) expect(id).not.toMatch(/super/);
        for (const b of result.bottlenecks) {
            expect([b.source, b.target]).not.toContain(SUPER_SOURCE);
            expect([b.source, b.target]).not.toContain(SUPER_SINK);
        }
    });

    it('matches single source/sink max flow when given one of each', () => {
        const { net } = clrs();
        expect(multiSourceSinkMaxFlow(net, ['A'], ['F']).maxFlow).toBe(23);
    });

    it('does not modify the original network', () => {
        const { net } = multi();
        const before = snapshot(net);
        multiSourceSinkMaxFlow(net, ['A', 'B'], ['D', 'E']);
        expect(snapshot(net)).toBe(before);
    });

    it('returns clear errors for invalid input', () => {
        const { net } = multi();
        expect(multiSourceSinkMaxFlow(net, [], ['D']).error).toMatch(/source/);
        expect(multiSourceSinkMaxFlow(net, ['A'], []).error).toMatch(/sink/);
        expect(multiSourceSinkMaxFlow(net, ['A', 'ZZ'], ['D']).error).toMatch(/does not exist/);
        expect(multiSourceSinkMaxFlow(net, ['A', 'D'], ['D']).error).toMatch(/both/);
    });
});
