// hard-coded sample flow networ, max flow from s to t is 23.
/*export const sampleNetwork = {
  source: 's',
  sink: 't',
  nodes: [
    { id: 's', label: 's', x: 0, y: 150 },
    { id: 'v1', label: 'v1', x: 200, y: 0 },
    { id: 'v2', label: 'v2', x: 200, y: 300 },
    { id: 'v3', label: 'v3', x: 400, y: 0 },
    { id: 'v4', label: 'v4', x: 400, y: 300 },
    { id: 't', label: 't', x: 600, y: 150 },
  ],
  edges: [
    { id: 's-v1', source: 's', target: 'v1', flow: 0, capacity: 16},
    { id: 's-v2', source: 's', target: 'v2', flow: 0, capacity: 13 },
    { id: 'v2-v1', source: 'v2', target: 'v1', flow: 0, capacity: 4 },
    { id: 'v1-v3', source: 'v1', target: 'v3', flow: 0, capacity: 12 },
    { id: 'v3-v2', source: 'v3', target: 'v2', flow: 0, capacity: 9 },
    { id: 'v2-v4', source: 'v2', target: 'v4', flow: 0, capacity: 14 },
    { id: 'v4-v3', source: 'v4', target: 'v3', flow: 0, capacity: 7 },
    { id: 'v3-t', source: 'v3', target: 't', flow: 0, capacity: 20 },
    { id: 'v4-t', source: 'v4', target: 't', flow: 0, capacity: 4 },
  ],
}*/

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

class FlowNet {
  constructor() {
    this.nodeGenerator = letters();
    this.edgeGenerator = letters();
    this.list = new Map();
    const source = new Node(this.nodeGenerator);
    this.list.set(source.id, new Map());
    this.source = source.id;
    this.sink = null;
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

  getConnectedNodes(nodeId) {
    return this.exists(nodeId) ? [...this.list.get(nodeId).keys()] : null;
  }
	
	// to positiin the graph we construct cells for each node
	// edges might overlap. Turns out trying to figure out if a graph is planar (drawable without overlapped edges) is quite difficult TODO
	positions(count) {
		const cols = Math.ceil(Math.sqrt(count));
		const cellSize = 120;   
		const randomOffset = 40;

		const cells = [...Array(count).keys()];

		for (let i = cells.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));

			[cells[i], cells[j]] = [cells[j], cells[i]];
		}

		return cells.map((cell) => ({
			x: (cell % cols) * cellSize + Math.random() * randomOffset,
			y: Math.floor(cell / cols) * cellSize + Math.random() * randomOffset,
		}));
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

// change rng parameter to recreate specific random examples
function randomFlowNet(nodeCount = 8, density = 0.25, minCapacity = 1, maxCapacity = 20, rng = Math.random) {
  if (nodeCount < 2) throw new RangeError("minimum node count is 2");

  const randInt = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

  const net = new FlowNet();

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

  if (sinks.length > 0) {
    net.setSink(sinks[randInt(0, sinks.length - 1)]);
  } else {
    const candidates = allIds.filter((id) => id !== net.source);
    net.setSink(candidates[randInt(0, candidates.length - 1)]);
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
