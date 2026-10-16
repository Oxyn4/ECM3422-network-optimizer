import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'

// turns the network data into elements for cytoscape
function toElements(network) {
  // create the nodes and set their positions and colours
  const nodes = network.nodes.map((node) => ({
    data: { id: node.id, label: node.label },
    position: { x: node.x, y: node.y },
    classes:
      node.id === network.source ? 'source' : node.id === network.sink ? 'sink' : '',

  }))

  // create the edges and show their capacities
  const edges = network.edges.map((edge) => ({
    data: {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: String(edge.flow) + ' / ' + String(edge.capacity),
    },
  }))

  return [...nodes, ...edges]
}

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
]

function NetworkGraph({ network }) {

  // keeps a reference to the graph container
  const containerRef = useRef(null)
  useEffect(() => {
    // create the graph whenever the network changes
    const cy = cytoscape({
      container: containerRef.current,
      elements: toElements(network),
      style,
      layout: { name: 'preset', fit: true, padding: 40 },
      userZoomingEnabled: false,
    })

    // remove the graph when the component is cleaned up
    return () => cy.destroy()
  }, [network])

  return <div ref={containerRef} className="network-graph" />
}
export default NetworkGraph
