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

  static NODE_CLEARANCE = 40
  static GRID_SPACING = 140

  static segmentsCross(a, b, c, d) {
    // this lamda for which side does p->q fall on
    const ccw = (p, q, r) => (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y)
    return (ccw(a, b, c) * ccw(a, b, d) < 0) && (ccw(c, d, a) * ccw(c, d, b) < 0)
  }

  crossingCount(from, fromPos, to, toPos, placed) {
    let count = 0
    const newSeg = { a: fromPos, b: toPos }

    for (const [u, pu] of placed) {
      for (const [v, pv] of placed) {
        if (u === v || !this.isAdjacent(u, v)) continue
        if (u === from || u === to || v === from || v === to) continue
        if (FlowNet.segmentsCross(newSeg.a, newSeg.b, pu, pv)) count++
      }
    }
    return count
  }

  isAdjacent(a, b) {
    return this.list.get(a)?.has(b) || this.list.get(b)?.has(a)
  }

  degree(nodeId) {
    let d = this.list.get(nodeId).size
    for (const neighbours of this.list.values()) {
      if (neighbours.has(nodeId)) d++
    }
    return d
  }

  static segmentDistance(p, a, b) {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
  }

  collisionScore(nodeId, pos, placed) {
    let score = 0

    for (const [a, pa] of placed) {
      for (const [b, pb] of placed) {
        if (a === b || !this.isAdjacent(a, b)) continue
        if (FlowNet.segmentDistance(pos, pa, pb) < FlowNet.NODE_CLEARANCE) score++
      }
    }

    for (const [m, pm] of placed) {
      if (!this.isAdjacent(nodeId, m)) continue
      for (const [o, po] of placed) {
        if (o === m || o === nodeId) continue
        if (FlowNet.segmentDistance(po, pos, pm) < FlowNet.NODE_CLEARANCE) score++
      }
    }
    return score
  }

  layoutScore(nodeId, pos, placed) {
    let score = this.collisionScore(nodeId, pos, placed)

    for (const [neighbor, neighborPos] of placed) {
      if (!this.isAdjacent(nodeId, neighbor)) continue
      score += this.crossingCount(nodeId, pos, neighbor, neighborPos, placed)
    }

    return score
  }

  *candidateCells(count) {
    const s = FlowNet.GRID_SPACING
    const cols = Math.ceil(Math.sqrt(count))
    const cells = []
    for (let i = 0; i < count; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const stagger = row % 2 === 1 ? s / 2 : 0
      cells.push({ x: col * s + stagger, y: row * s })
    }
    yield* cells
    for (const c of cells) {
      for (const [ox, oy] of [[s/2,-s/2],[s/2,s/2],[-s/2,s/2],[-s/2,-s/2],[0,-s*0.75],[0,s*0.75]]) {
        yield { x: c.x + ox, y: c.y + oy }
      }
    }
  }

  placeUnplaced() {
    const placed = new Map(
      [...this.nodePositions].filter(([id]) => this.exists(id))
    )
    const unplaced = this.nodes()
      .filter((id) => !placed.has(id))
      .sort((a, b) => this.degree(b) - this.degree(a))

    for (const id of unplaced) {
      let best = null
      let bestScore = Infinity
      for (const cell of this.candidateCells(this.list.size + 4)) {
        let tooClose = false
        for (const p of placed.values()) {
          if (Math.hypot(p.x - cell.x, p.y - cell.y) < FlowNet.GRID_SPACING * 0.7) {
            tooClose = true
            break
          }
        }
        if (tooClose) continue

        const score = this.layoutScore(id, cell, placed)
        if (score === 0) {
          best = cell
          break
        }
        if (score < bestScore) {
          best = cell
          bestScore = score
        }
      }
      const pos = best ?? { x: 0, y: FlowNet.GRID_SPACING * Math.ceil(Math.sqrt(this.list.size + 4) + 2) }
      this.nodePositions.set(id, pos)
      placed.set(id, pos)
	}
	}

	cytoscape() {
    const nodes = []
    const edges = []

    this.placeUnplaced()

		for (const [nodeId, neighbours] of this.list) {
      const position = this.nodePositions.get(nodeId)
      nodes.push({ id: nodeId, label: nodeId, x: position.x, y: position.y })

			for (const [neighbourId, edge] of neighbours) {
				edges.push({
					id: `edge-${edge.id}`,
					source: nodeId,
					target: neighbourId,
					flow: edge.flow,
					capacity: edge.capacity,
        })
      }
    }

    const byId = new Map(nodes.map((n) => [n.id, n]))
    for (const e of edges) {
      const a = byId.get(e.source)
      const b = byId.get(e.target)
      e.midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }

    const OFFSET_STEP = 4
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const e1 = edges[i]
        const e2 = edges[j]
        if (Math.hypot(e1.midpoint.x - e2.midpoint.x, e1.midpoint.y - e2.midpoint.y) < 15) {
          e1.offset = (e1.offset ?? 0) + OFFSET_STEP
          e2.offset = (e2.offset ?? 0) - OFFSET_STEP
        }
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
