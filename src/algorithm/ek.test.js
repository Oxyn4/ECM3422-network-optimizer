import { describe, it, expect } from 'vitest';

import { FlowNet, makeRandomNetwork } from '../data/sampleNetwork.js';
import { BFS, findAugmentingPath, edmondsKarp, edmondsKarpTrace } from './ek.js';

// build a net from [from, to, capacity] lists node a is the source
function build(edges, nodeCount, sink) {
    const net = new FlowNet();
    for (let i = 1; i < nodeCount; i++) net.addNode();
    for (const [from, to, capacity] of edges) net.connect(from, to, 0, capacity);
    if (sink) net.setSink(sink);
    return net;
}

// edge objec between two nodes
const edge = (net, from, to) => net.list.get(from).get(to);

// classic example, max flow is 23
const clrs = () => build([
    ['A', 'B', 16], ['A', 'C', 13], ['B', 'C', 10], ['C', 'B', 4], ['B', 'D', 12],
    ['D', 'C', 9], ['C', 'E', 14], ['E', 'D', 7], ['D', 'F', 20], ['E', 'F', 4],
], 6, 'F');

describe('BFS', () => {
    it('starts at the source with no edge', () => {
        const trace = BFS(clrs());
        expect(trace[0]).toEqual({ node: 'A', edgeId: null });
    });

    it('visits nodes level by level', () => {
        // a -> b, a -> c, b -> d, c -> e
        const net = build([['A', 'B', 1], ['A', 'C', 1], ['B', 'D', 1], ['C', 'E', 1]], 5, null);
        expect(BFS(net).map(s => s.node)).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('stops as soon as it reaches the sink', () => {
        const net = build([['A', 'B', 1], ['A', 'C', 1], ['C', 'D', 1]], 4, 'B');
        expect(BFS(net).map(s => s.node)).toEqual(['A', 'B']);
    });

    it('gives the id of the edge used to reach each node', () => {
        const net = build([['A', 'B', 1], ['B', 'C', 1]], 3, 'C');
        const trace = BFS(net);
        expect(trace[1].edgeId).toBe(`edge-${edge(net, 'A', 'B').id}`);
        expect(trace[2].edgeId).toBe(`edge-${edge(net, 'B', 'C').id}`);
    });

    it('only visits reachable nodes when the sink is cut off', () => {
        const net = build([['A', 'B', 1], ['C', 'D', 1]], 4, 'D');
        expect(BFS(net).map(s => s.node)).toEqual(['A', 'B']);
    });

});

describe('findAugmentingPath', () => {
    it('returns null when there is no sink', () => {
        const net = build([['A', 'B', 1]], 2, null);
        expect(findAugmentingPath(net, {})).toBeNull();
    });

    it('picks the path with the fewest edges', () => {
        // long way a-b-c-d, short way a-d
        const net = build([['A', 'B', 9], ['B', 'C', 9], ['C', 'D', 9], ['A', 'D', 1]], 4, 'D');
        const { path } = findAugmentingPath(net, {});
        expect(path.map(h => [h.from, h.to])).toEqual([['A', 'D']]);
    });

    it('uses the smallest spare capacity on the path as the bottleneck', () => {
        const net = build([['A', 'B', 5], ['B', 'C', 2], ['C', 'D', 7]], 4, 'D');
        expect(findAugmentingPath(net, {}).bottleneck).toBe(2);
    });

    it('counts existing flow when working out spare capacity', () => {
        const net = build([['A', 'B', 5], ['B', 'C', 5]], 3, 'C');
        edge(net, 'A', 'B').flow = 3;
        expect(findAugmentingPath(net, {}).bottleneck).toBe(2);
    });

    it('returns null when every path is full', () => {
        const net = build([['A', 'B', 4]], 2, 'B');
        edge(net, 'A', 'B').flow = 4;
        expect(findAugmentingPath(net, {})).toBeNull();
    });

    it('goes backwards along an edge to undo flow when needed', () => {
        // flow already on a-b-c-d, the only new path is a-c then back over b-c then b-d
        const net = build([['A', 'B', 1], ['A', 'C', 1], ['B', 'C', 1], ['B', 'D', 1], ['C', 'D', 1]], 4, 'D');
        edge(net, 'A', 'B').flow = 1;
        edge(net, 'B', 'C').flow = 1;
        edge(net, 'C', 'D').flow = 1;

        const { path, bottleneck } = findAugmentingPath(net, {});
        expect(bottleneck).toBe(1);
        expect(path.some(h => h.type === 'backward')).toBe(true);
    });
});

describe('edmondsKarp', () => {
    it('handles simple shapes', () => {

        // one edge
        expect(edmondsKarp(build([['A', 'B', 7]], 2, 'B')).maxFlow).toBe(7);
        // a line, limited by the smallest edge
        expect(edmondsKarp(build([['A', 'B', 5], ['B', 'C', 3]], 3, 'C')).maxFlow).toBe(3);
        // two routes side by side add up
        expect(edmondsKarp(build([['A', 'B', 4], ['A', 'C', 6], ['B', 'D', 4], ['C', 'D', 6]], 4, 'D')).maxFlow).toBe(10);
    });

    it('gives zero when the sink cannot be reached', () => {
        expect(edmondsKarp(build([['A', 'B', 5], ['C', 'D', 5]], 4, 'D')).maxFlow).toBe(0);
    });

    it('gives zero when an edge on the only path has no capacity', () => {
        expect(edmondsKarp(build([['A', 'B', 5], ['B', 'C', 0]], 3, 'C')).maxFlow).toBe(0);
    });

    it('gives zero when there is no sink', () => {
        expect(edmondsKarp(build([['A', 'B', 5]], 2, null)).maxFlow).toBe(0);
    });

    it('returns a flow for every edge that matches the network', () => {
        const net = clrs();
        const { flows } = edmondsKarp(net);
        const edges = net.allEdges();
        expect(Object.keys(flows).length).toBe(edges.length);
        for (const e of edges) expect(flows[e.id]).toBe(e.flow);
    });

    it('never puts more flow on an edge than it can hold', () => {
        for (let i = 0; i < 20; i++) {
            const net = makeRandomNetwork(15, 0.3, 1, 20, 2);
            edmondsKarp(net);
            for (const e of net.allEdges()) {
                expect(e.flow).toBeGreaterThanOrEqual(0);
                expect(e.flow).toBeLessThanOrEqual(e.capacity);
            }
        }
    });

    it('keeps flow in equal to flow out at every middle node', () => {
        for (let i = 0; i < 20; i++) {
            const net = makeRandomNetwork(15, 0.3, 1, 20, 2);
            const { maxFlow } = edmondsKarp(net);
            const balance = new Map(net.nodes().map(n => [n, 0]));
            for (const e of net.allEdges()) {
                balance.set(e.source, balance.get(e.source) - e.flow);
                balance.set(e.target, balance.get(e.target) + e.flow);
            }
            for (const [node, b] of balance) {
                if (node === net.source) expect(b).toBe(-maxFlow);
                else if (node === net.sink) expect(b).toBe(maxFlow);
                else expect(b).toBe(0);
            }
        }
    });
});

describe('edmondsKarpTrace', () => {
    it('returns no steps when there is no sink', () => {
        expect(edmondsKarpTrace(build([['A', 'B', 5]], 2, null))).toEqual([]);
    });

    it('ends on the same max flow as edmondsKarp', () => {
        const steps = edmondsKarpTrace(clrs());
        expect(steps.at(-1).maxFlow).toBe(23);
        expect(steps.at(-1).maxFlow).toBe(edmondsKarp(clrs()).maxFlow);
    });


    it('adds each bottleneck to the running total', () => {
        let total = 0;
        for (const step of edmondsKarpTrace(clrs())) {
            expect(step.bottleneck).toBeGreaterThan(0);
            total += step.bottleneck;
            expect(step.maxFlow).toBe(total);
        }
    });

    it('never picks a longer path before a shorter one', () => {
        for (let i = 0; i < 20; i++) {
            const steps = edmondsKarpTrace(makeRandomNetwork(15, 0.3, 1, 20, 2));
            for (let s = 1; s < steps.length; s++) {
                expect(steps[s].path.length).toBeGreaterThanOrEqual(steps[s - 1].path.length);
            }
        }
    });

    it('gives each step a path from source to sink with matching highlights', () => {
        const net = clrs();
        for (const step of edmondsKarpTrace(net)) {
            expect(step.path[0].from).toBe('A');
            expect(step.path.at(-1).to).toBe('F');
            expect(step.edgeIds).toEqual(step.path.map(h => `edge-${h.edge.id}`));
            expect(step.nodeIds[0]).toBe('A');
            expect(step.nodeIds).toContain('F');
        }
    });



    it('leaves all flows at zero when done', () => {
        const net = clrs();
        edmondsKarpTrace(net);
        for (const e of net.allEdges()) expect(e.flow).toBe(0);
    });
});
