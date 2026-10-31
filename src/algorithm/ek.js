import { FlowNet } from '../data/sampleNetwork.js';

export function BFS(network) {
    const src = network.source;
    if (!src) {
        console.error('No source node defined');
        return [];
    }

    const visited = new Set();
    const queue = [];

    visited.add(src);
    queue.push(src);

    const trace = [{ node: src, edgeId: null }];

    while (queue.length > 0) {
        const curr = queue.shift();

        const neighbors = network.getConnectedNodes(curr) || [];

        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                const edge = network.list.get(curr).get(neighbor);
                trace.push({ node: neighbor, edgeId: `edge-${edge.id}` });

                if (neighbor === network.sink) {
                    return trace;
                }

                queue.push(neighbor);
            }
        }
    }

    return trace;
}
