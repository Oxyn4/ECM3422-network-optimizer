
 // helpers for editing the network. each one returns a new network object
// instead of changing the old one, so react notices the change and redraws
// edits that are refused return { error }

// next unused letter id: A,... Z, AA, ... ZZ
export function nextNodeId(network) {
  const used = new Set(network.nodes.map((node) => node.id))

  for (let n = 1; ; n++) {
    let value = n
    let id = ''

    while (value > 0) {
      value--
      id = String.fromCharCode(65 + (value % 26)) + id
      value = Math.floor(value / 26)
    }

    if (!used.has(id)) return id
  }
}

// capacities must be whole numbers above zero
function checkCapacity(capacity) {
  const value = Number(capacity)

  if (!Number.isInteger(value) || value < 1) {
    return 'Capacity must be a whole number of at least 1.'
  }

  return null
}

export function addNode(network) {
  const id = nextNodeId(network)
  const xs = network.nodes.map((node) => node.x)
  const ys = network.nodes.map((node) => node.y)

  // drop the new node somewhere inside the current drawing
  const x = xs.length
    ? Math.min(...xs) + Math.random() * (Math.max(...xs) - Math.min(...xs) + 1)
    : 0
  const y = ys.length ? Math.max(...ys) + 80 : 0

  return {
    ...network,
    nodes: [...network.nodes, { id, label: id, x, y }],
  }
}

// removing a node also removes every edge touching it
export function removeNode(network, nodeId) {
  return {
    ...network,
    nodes: network.nodes.filter((node) => node.id !== nodeId),
    edges: network.edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId,
    ),
    source: network.source === nodeId ? null : network.source,
    sink: network.sink === nodeId ? null : network.sink,
  }
}

export function moveNode(network, nodeId, position) {
  return {
    ...network,
    nodes: network.nodes.map((node) =>
      node.id === nodeId ? { ...node, x: position.x, y: position.y } : node,
    ),
}}

export function addEdge(network, source, target, capacity) {
  if (!source || !target) {
    return { error: 'Pick a node to start from and a node to go to.' }}

  if (source === target) {
    return { error: 'An edge cannot connect a node to itself.' }}

  if (network.edges.some((edge) => edge.source === source && edge.target === target)) {
    return { error: `There is already an edge from ${source} to ${target}.` }}

  const capacityError = checkCapacity(capacity)
  if (capacityError) return { error: capacityError }

  const edge = {
    id: `edge-${source}-${target}`,
    source,
    target,
    flow: 0,
    capacity: Number(capacity),
  }
  return {
    network: { ...network, edges: [...network.edges, edge] },
  }}

export function updateCapacity(network, edgeId, capacity) {
  const capacityError = checkCapacity(capacity)
  if (capacityError) return { error: capacityError }

  return {
    network: {
      ...network,
      edges: network.edges.map((edge) =>
        edge.id === edgeId ? { ...edge, capacity: Number(capacity) } : edge,
      ),
    },}}

export function removeEdge(network, edgeId) {
  return {
    ...network,
    edges: network.edges.filter((edge) => edge.id !== edgeId),
  }}

// a node can't be both, so picking the sink as the source clears the sink (and the other way round)
export function setSource(network, nodeId) {
  return {
    ...network,
    source: nodeId,
    sink: network.sink === nodeId ? null : network.sink,
  }}

export function setSink(network, nodeId) {
  return {
    ...network,
    sink: nodeId,
    source: network.source === nodeId ? null : network.source,
  }}

// any edit makes the old flows out of date
export function resetFlows(network) {
  return {
    ...network,
    edges: network.edges.map((edge) => ({ ...edge, flow: 0 })),
  }}

// flows come back from edmonds-karp e.g. { 'edge-A-B': 12 }
export function applyFlows(network, flows) {
  return {
    ...network,
    edges: network.edges.map((edge) => ({
      ...edge,
      flow: flows[edge.id] ?? 0,
    })),
  }}

// returns a message if the network can't be run yet, or null if it's fine
export function checkReadyToRun(network) {
  if (!network.source) return 'Choose a source node first.'
  if (!network.sink) return 'Choose a sink node first.'
  if (network.edges.length === 0) return 'Add at least one edge first.'

  return null
}
