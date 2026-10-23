import { useEffect, useEffectEvent, useRef } from 'react'
import cytoscape from 'cytoscape'

// turns the network data into elements for cytoscape
function toElements(network, selection) {
  const isSelected = (kind, id) => selection?.kind === kind && selection.id === id

  // create the nodes and set their positions and colours
  const nodes = network.nodes.map((node) => {
    const classes = []
    if (node.id === network.source) classes.push('source')
    if (node.id === network.sink) classes.push('sink')
    if (isSelected('node', node.id)) classes.push('selected')

    return {
      data: { id: node.id, label: node.label },
      position: { x: node.x, y: node.y },
      classes,
    }
  })

  // create the edges and show their flow and capacity
  const edges = network.edges.map((edge) => ({
    data: {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: String(edge.flow) + ' / ' + String(edge.capacity),
    },
    classes: isSelected('edge', edge.id) ? ['selected'] : [],
  }))

  return [...nodes, ...edges]}

// sets how the nodes and edges look
const style = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'background-color': '#4b5563',
      color: '#fff',
      width: 44,
      height: 44,
      'font-size': 14,
    },
  },

  // green for the source and red for the sink
  { selector: 'node.source', style: { 'background-color': '#16a34a' } },
  { selector: 'node.sink', style: { 'background-color': '#dc2626' } },
  {
    selector: 'edge',
    style: {
      label: 'data(label)',
      width: 2,
      'line-color': '#9ca3af',
      'target-arrow-color': '#9ca3af',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'font-size': 13,
      color: '#111827',
      'text-background-color': '#fff',
      'text-background-opacity': 1,
      'text-background-padding': 2,
    },
  },

  // blue outline on whatever the user clicked
  { selector: 'node.selected', style: { 'border-width': 4, 'border-color': '#2563eb' } },
  {
    selector: 'edge.selected',
    style: { width: 4, 'line-color': '#2563eb', 'target-arrow-color': '#2563eb' },
  },
]

function NetworkGraph({ network, selection, onSelect, onNodeMove }) {
  // keeps a reference to the graph container and the cytoscape instance
  const containerRef = useRef(null)
  const cyRef = useRef(null)

  // effect events always call the latest version of the props,
  // without making the graph get rebuilt every time App re-renders
  const handleSelect = useEffectEvent((picked) => onSelect?.(picked))
  const handleMove = useEffectEvent((nodeId, position) => onNodeMove?.(nodeId, position))

  // create the graph once, and remove it when the component is cleaned up
  useEffect(() => {
    const cy = cytoscape({
      container: containerRef.current,
      style,
      layout: { name: 'preset' },
      userZoomingEnabled: false,
      autounselectify: true, // we track the selection ourselves
    })

    // clicking a node, an edge, or the empty background
    cy.on('tap', 'node', (event) => handleSelect({ kind: 'node', id: event.target.id() }))
    cy.on('tap', 'edge', (event) => handleSelect({ kind: 'edge', id: event.target.id() }))
    cy.on('tap', (event) => {
      if (event.target === cy) handleSelect(null)
    })

    // when a node is dropped after dragging, save its new position
    cy.on('dragfree', 'node', (event) => {
      const { x, y } = event.target.position()
      handleMove(event.target.id(), { x, y })
    })

    cyRef.current = cy
    return () => cy.destroy()
  }, [])

  // redraw the nodes and edges whenever the network or selection changes
  useEffect(() => {
    const cy = cyRef.current
    cy.batch(() => {
      cy.elements().remove()
      cy.add(toElements(network, selection))
    })
  }, [network, selection])

  // zoom to fit only when nodes are added or removed, so dragging doesn't make the view jump
  const nodeCount = network.nodes.length
  useEffect(() => {
    cyRef.current.fit(undefined, 40)
  }, [nodeCount])

  return <div ref={containerRef} className="network-graph" />
}

export default NetworkGraph