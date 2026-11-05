function* letters() {
  let n = 1;
  while (true) {
    let value = n;
    let result = "";
    while (value > 0) {
      value--;
      result = String.fromCharCode(65 + (value % 26)) + result;
      value = Math.floor(value / 26);
    }
    yield result;
    n++;
  }
}

class Node {
  constructor(idGenerator) {
    this.id = idGenerator.next().value;
  }
}

class Edge {
  constructor(idGenerator, flow, capacity) {
    this.id = idGenerator.next().value;
    this.flow = flow;
    this.capacity = capacity;
  }
}

export class FlowNet {
  constructor() {
    this.nodeGenerator = letters();
    this.edgeGenerator = letters();
    this.list = new Map();
this.nodePositions = new Map();
    const source = new Node(this.nodeGenerator);
    this.list.set(source.id, new Map());
    this.source = source.id;
    this.sink = null;
  }

  count() {
    return this.list.size;
  }

  edgeCount() {
    let total = 0;
    for (let [key, value] of this.list) {
      total += value.size;
    }
    return total;
  }

  nodes() {
    return [...this.list.keys()];
  }

  edges(nodeId) {
    return [...this.list.get(nodeId).keys()];
  }

  findEdge(edgeId) {
    for (const inner of this.list.values()) {
      if (inner.has(edgeId)) return inner;
    }
  }

  allEdges() {
    const result = [];
    for (const [source, neighbours] of this.list) {
      for (const [target, edge] of neighbours) {
        result.push({
          id: `edge-${edge.id}`,
          source,
          target,
          flow: edge.flow,
          capacity: edge.capacity,
        });
      }
    }
    return result;
  }

  exists(nodeId) {
    return this.list.has(nodeId);
  }

  setSink(nodeId) {
    if (this.exists(nodeId)) {
      this.sink = nodeId;
      return true;
    }
    return false;
  }

	addNode() {
		const newNode = new Node(this.nodeGenerator);
		this.list.set(newNode.id, new Map());
		return newNode.id;
  }

	add(connectTo, flow, capacity) {
		const targets = Array.isArray(connectTo) ? connectTo : [connectTo];
		if (targets.some((t) => !this.exists(t))) return null;

		const newNode = new Node(this.nodeGenerator);
		this.list.set(newNode.id, new Map());

		for (const target of targets) {
			const edge = new Edge(this.edgeGenerator, flow, capacity);
			this.list.get(target).set(newNode.id, edge);
		}

		return newNode.id;
	}

	connect(fr, to, flow, capacity) {
		const sources = Array.isArray(fr) ? fr : [fr];
		const targets = Array.isArray(to) ? to : [to];

		let ok = true;
		for (const src of sources) {
			for (const dst of targets) {
				if (!this.exists(src) || !this.exists(dst) || src === dst) {
					ok = false;
					continue;
				}
				const edge = new Edge(this.edgeGenerator, flow, capacity);
				this.list.get(src).set(dst, edge);
			}
		}

		return ok;
	}

  getEdge(nodeId, edgeId) {
    return this.list.get(nodeId).get(edgeId);
	}

  getConnectedNodes(nodeId) {
    return this.exists(nodeId) ? [...this.list.get(nodeId).keys()] : null;
  }
	
	removeNode(nodeId) {
		if (!this.exists(nodeId) || nodeId === this.source) return false;
		this.list.delete(nodeId);
		this.nodePositions.delete(nodeId);
		for (const neighbours of this.list.values()) neighbours.delete(nodeId);
		if (this.sink === nodeId) this.sink = null;
		return true;
	}

	removeEdge(sourceId, targetId) {
		return this.exists(sourceId) ? this.list.get(sourceId).delete(targetId) : false;
	}

	setCapacity(sourceId, targetId, capacity) {
		const edge = this.list.get(sourceId)?.get(targetId);
		if (!edge) return false;
		edge.capacity = capacity;
		return true;
	}

	setNodePosition(nodeId, position) {
		if (!this.exists(nodeId)) return false;
		this.nodePositions.set(nodeId, position);
		return true;
	}

	clearFlows() {
		for (const neighbours of this.list.values()) {
			for (const edge of neighbours.values()) {
				edge.flow = 0;
			}
		}
	}

	}
	}

	cytoscape() {
		const nodes = [];
		const edges = [];

		const positions = this.positions(this.list.size);
		let i = 0;

		for (const [nodeId, neighbours] of this.list) {
			nodes.push({ id: nodeId, label: nodeId, x: positions[i].x, y: positions[i].y, });
			i++;

			for (const [neighbourId, edge] of neighbours) {
				edges.push({
					id: `edge-${edge.id}`,
					source: nodeId,
					target: neighbourId,
					flow: edge.flow,
					capacity: edge.capacity,
				});
			}
		}

		return { source: this.source, sink: this.sink, nodes, edges };
	}
}

function randomFlowNet(nodeCount = 12, density = 0.25, minCapacity = 1, maxCapacity = 20, minimumBetween = 3, rng = Math.random) {
  const randInt = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

  let net;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    net = new FlowNet();

  for (let i = 1; i < nodeCount; i++) {
    const existing = [...net.list.keys()];
    const parent = existing[randInt(0, existing.length - 1)];

    net.add(parent, 0, randInt(minCapacity, maxCapacity));
  }

  const crossEdges = Math.floor(density * nodeCount);
  const allIds = [...net.list.keys()];

	for (let i = 0; i < crossEdges; i++) {
		const fromIdx = randInt(0, allIds.length - 1);
		const toIdx = randInt(fromIdx + 1, allIds.length - 1);

		const from = allIds[fromIdx];
		const to = allIds[toIdx];

		if (net.list.get(from).has(to)) continue;

		net.connect(from, to, 0, randInt(minCapacity, maxCapacity));
	}

  const sinks = allIds.filter((id) => net.list.get(id).size === 0);

    let selectedSink = null;
  if (sinks.length > 0) {
      const validSinks = sinks.filter(s => bfsDistance(net, net.source, s) > minimumBetween);
      if (validSinks.length > 0) {
        selectedSink = validSinks[randInt(0, validSinks.length - 1)];
      }
    }

    if (!selectedSink) {
    const candidates = allIds.filter((id) => id !== net.source);
      const validCandidates = candidates.filter(c => bfsDistance(net, net.source, c) > minimumBetween);
      if (validCandidates.length > 0) {
        selectedSink = validCandidates[randInt(0, validCandidates.length - 1)];
      }
    }

    if (selectedSink) {
      net.setSink(selectedSink);
    }

    attempts++;
  } while ((!net.sink || bfsDistance(net, net.source, net.sink) <= minimumBetween) && attempts < maxAttempts);

  if (!net.sink || bfsDistance(net, net.source, net.sink) <= minimumBetween) {
    throw new Error(`Could not generate network with minimumBetween=${minimumBetween} after ${maxAttempts} attempts`);
  }

  return net;
}

export const randomNetwork = new randomFlowNet().cytoscape();
// builds a fresh random network each time it is called (for the "Random network" button)
export const makeRandomNetwork = (...options) => randomFlowNet(...options).cytoscape();

export const sampleNetwork = function() {  
	let net = new FlowNet();

	const b = net.add(net.source, 0, 5);

	const c = net.add(net.source, 0, 5);

	const d = net.add([b, c], 0, 10);

	net.setSink(d);

	return net.cytoscape();
}
