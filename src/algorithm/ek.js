
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

function reconstructPath(parent, src, sink) {
    const path = [];
    let current = sink;

    while (current !== src) {
        path.unshift(current);
        current = parent.get(current);
        if (current === undefined) {
            return null;
        }
    }

    path.unshift(src);
    return path;
}

export function findAugmentingPath(network, flows) {

    const src = network.source;
    const sink = network.sink;

    if (!src || !sink) return null;

    const visited = new Set();
    const parent = new Map();
    const queue = [];

    visited.add(src);
    queue.push(src);

    while (queue.length > 0) {
        const curr = queue.shift();
        const neighbors = network.getConnectedNodes(curr) || [];

        for (const neighbor of neighbors) {
            if (visited.has(neighbor)) continue;

            const edge = network.list.get(curr)?.get(neighbor);

            if (edge) {
                const residualCapacity = edge.capacity - edge.flow;
                if (residualCapacity > 0) {
                    visited.add(neighbor);
                    parent.set(neighbor, { from: curr, type: 'forward', edge });
                    queue.push(neighbor);

                    if (neighbor === sink) {
                        return buildAugmentingPath(parent, src, sink);
                    }
                }
            }

            const reverseEdge = network.list.get(neighbor)?.get(curr);
            if (reverseEdge && reverseEdge.flow > 0) {
                visited.add(neighbor);
                parent.set(neighbor, { from: curr, type: 'backward', edge: reverseEdge });
                queue.push(neighbor);

                if (neighbor === sink) {
                    return buildAugmentingPath(parent, src, sink);
                }
            }
        }
    }

    return null;
}

function buildAugmentingPath(parent, src, sink) {
    const path = [];
    let current = sink;
    let bottleneck = Infinity;

    while (current !== src) {
        const info = parent.get(current);
        if (!info) return null;

        path.unshift({
            from: info.from,
            to: current,
            type: info.type,
            edge: info.edge,
        });

        if (info.type === 'forward') {
            bottleneck = Math.min(bottleneck, info.edge.capacity - info.edge.flow);
        } else {
            bottleneck = Math.min(bottleneck, info.edge.flow);
        }

        current = info.from;
    }

    return { path, bottleneck };
}

export function edmondsKarp(network) {
    const flows = {};
    let maxFlow = 0;

    while (true) {
        const result = findAugmentingPath(network, flows);
        if (!result) break;

        for (const { from, to, type, edge } of result.path) {
            if (type === 'forward') {
                edge.flow += result.bottleneck;
            } else {
                edge.flow -= result.bottleneck;
            }
        }

        maxFlow += result.bottleneck;
    }

    return {
        maxFlow,
        flows: network.edges.reduce((acc, edge) => {
            acc[edge.id] = edge.flow;
            return acc;
        }, {}),
    };
}
