
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

        const neighbours = network.getConnectedNodes(curr) || [];

        for (const neighbour of neighbours) {
            if (!visited.has(neighbour)) {
                visited.add(neighbour);
                const edge = network.list.get(curr).get(neighbour);
                trace.push({ node: neighbour, edgeId: `edge-${edge.id}` });

                if (neighbour === network.sink) {
                    return trace;
                }

                queue.push(neighbour);
            }
        }
    }

    return trace;
}

// edges coming into each node, so backward edges are found without scanning every node
function incomingEdges(network) {
    const incoming = new Map();
    for (const node of network.list.keys()) incoming.set(node, []);

    for (const [from, outgoing] of network.list) {
        for (const [to, edge] of outgoing) {
            incoming.get(to)?.push({ from, edge });
        }
    }

    return incoming;
}

export function findAugmentingPath(network) {

    const src = network.source;
    const sink = network.sink;

    if (!src || !sink) return null;

    const incoming = incomingEdges(network);
    const visited = new Set();
    const parent = new Map();
    const queue = [];

    visited.add(src);
    queue.push(src);

    while (queue.length > 0) {
        const curr = queue.shift();
        const neighbours = network.getConnectedNodes(curr) || [];

        // forward residual edges: curr -> neighbour with spare capacity
        for (const neighbour of neighbours) {
            if (visited.has(neighbour)) continue;

            const edge = network.list.get(curr).get(neighbour);
            if (edge.capacity - edge.flow > 0) {
                visited.add(neighbour);
                parent.set(neighbour, { from: curr, type: 'forward', edge });
                if (neighbour === sink) return buildAugmentingPath(parent, src, sink);
                queue.push(neighbour);
            }
        }

        // backward residual edges: an edge prev -> curr carrying flow can be undone
        for (const { from: prev, edge: reverseEdge } of incoming.get(curr) ?? []) {
            if (visited.has(prev)) continue;

            if (reverseEdge.flow > 0) {
                visited.add(prev);
                parent.set(prev, { from: curr, type: 'backward', edge: reverseEdge });
                if (prev === sink) return buildAugmentingPath(parent, src, sink);
                queue.push(prev);
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
    let maxFlow = 0;

    // start from zero flow so repeated runs give the same answer
    network.clearFlows();

    while (true) {
        const result = findAugmentingPath(network);
        if (!result) break;

        for (const { type, edge } of result.path) {
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
        flows: network.allEdges().reduce((acc, edge) => {
            acc[edge.id] = edge.flow;
            return acc;
        }, {}),
    };
}

function pathHighlights(path) {
    const nodeIds = [];
    const edgeIds = [];
    for (const hop of path) {
        if (!nodeIds.includes(hop.from)) nodeIds.push(hop.from);
        if (!nodeIds.includes(hop.to)) nodeIds.push(hop.to);
        edgeIds.push(`edge-${hop.edge.id}`);
    }
    return { nodeIds, edgeIds };
}

export function edmondsKarpTrace(network) {
    if (!network.source || !network.sink) return [];

    network.clearFlows();

    const steps = [];
    let maxFlow = 0;

    while (true) {
        const result = findAugmentingPath(network);
        if (!result) break;

        for (const { type, edge } of result.path) {
            if (type === 'forward') {
                edge.flow += result.bottleneck;
            } else {
                edge.flow -= result.bottleneck;
            }
        }

        maxFlow += result.bottleneck;
        steps.push({
            path: result.path,
            ...pathHighlights(result.path),
            bottleneck: result.bottleneck,
            maxFlow,
        });
    }

    network.clearFlows();
    return steps;
}
