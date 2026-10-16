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

  cytoscape() {
    const nodes = [];
    const edges = [];

    for (const [nodeId, neighbours] of this.list) {
      nodes.push({ id: nodeId, label: nodeId, x: Math.floor(Math.random() * (500 - 1)), y: Math.floor(Math.random() * (500 - 1))});
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

export const sampleNetwork = function() {  
	let net = new FlowNet();

	const b = net.add(net.source, 0, 5);

	const c = net.add(net.source, 0, 5);

	const d = net.add([b, c], 0, 10);

	net.setSink(d);

	return net.cytoscape();
}
