import { useEffect, useEffectEvent, useRef } from 'react'
import cytoscape from 'cytoscape'

// colors for different active paths or custom  groupings
export const HIGHLIGHT_COLORS = [

  { line: '#ef4444', node: '#ef4444', border: '#fca5a5' },
  { line: '#3b82f6', node: '#3b82f6', border: '#93c5fd' },
  { line: '#22c55e', node: '#22c55e', border: '#86efac' },
  { line: '#a855f7', node: '#a855f7', border: '#d8b4fe' },
  { line: '#ec4899', node: '#ec4899', border: '#f9a8d4' },
  { line: '#14b8a6', node: '#14b8a6', border: '#5eead4' },
]

// turn highlight instructions into a quick lookup map
function buildHighlightMap(highlight) {
  const map = new Map()
  if (!highlight) return map

  if (highlight.kind === 'paths'){
    for (const path of highlight.paths ?? []) {
      const idx = (path.colorIndex ?? 0) % HIGHLIGHT_COLORS.length
      for (const id of path.nodeIds ?? []) map.set(`n:${id}`, { idx, active: !!path.active })
      for (const id of path.edgeIds ?? []) map.set(`e:${id}`, { idx, active: !!path.active })
    }
    return map
  }

  // layers handle special visual states
  if (highlight.kind === 'layers') {
    for (const layer of highlight.layers ?? []) {
      for (const id of layer.nodeIds ?? []) map.set(`n:${id}`, { idx: null, active: false, style: layer.style })
      for (const id of layer.edgeIds ?? []) map.set(`e:${id}`, { idx: null, active: false, style: layer.style })
    }
    return map
  }
  const nodeIds = highlight.kind === 'both' ? highlight.nodeIds : highlight.kind === 'node' ? highlight.ids : []
  const edgeIds = highlight.kind === 'both' ? highlight.edgeIds : highlight.kind === 'edge' ? highlight.ids : []
  for (const id of nodeIds ?? []) map.set(`n:${id}`, { idx: null, active: false })
  for (const id of edgeIds ?? []) map.set(`e:${id}`, { idx: null, active: false })
  return map

}

// map our network data into the node/edge format cytoscape expects
function toElements(network, selection, highlight = null, flowOverride = null) {
  const isSelected = (kind, id) => selection?.kind === kind && selection.id === id
  const highlightMap = buildHighlightMap(highlight)
  const getClasses = (kind, id) => {
    const entry = highlightMap.get(`${kind === 'node' ? 'n' : 'e'}:${id}`)
    if (!entry) return []
    if (entry.style) return [entry.style]
    
    const classes = entry.idx === null ? ['highlighted'] : [`highlighted-${entry.idx}`]
    if (entry.active) classes.push('path-active')
    return classes
  }

  const nodes = network.nodes.map((node) => {
    const classes = []
    
    // multi source/sink mode manages its own terminals via layers instead
    if (!highlight?.replaceTerminals) {
      if (node.id === network.source) classes.push('source')
      if (node.id === network.sink) classes.push('sink')
    }
    if (isSelected('node', node.id)) classes.push('selected')
    classes.push(...getClasses('node', node.id))

    return {
      data: { id: node.id, label: node.label },
      position: { x: node.x, y: node.y },
      classes: classes.join(' '),
    }
  })

  const edges = network.edges.map((edge) => {
    const classes = []
    if (isSelected('edge', edge.id)) classes.push('selected')
    classes.push(...getClasses('edge', edge.id))

    // fall back to flowOverride if we'are viewing a simulation state like a failure
    const flow = flowOverride ? (flowOverride[edge.id] ?? 0) : edge.flow

    return {
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: `${flow} / ${edge.capacity}`,
      },
      classes: classes.join(' '),
    }
  })

  return [...nodes, ...edges]
}

// base cytoscape styling rules
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
  { selector: 'node.source', style: { 'background-color': '#16a34a' } },
  { selector: 'node.sink', style: { 'background-color': '#dc2626' } },
  { selector: 'node.highlighted', style: { 'background-color': '#f59e0b', 'border-width': 3, 'border-color': '#fbbf24' } },
  { selector: 'node.multi-source', style: { 'background-color': '#16a34a' } },
  { selector: 'node.multi-sink', style: { 'background-color': '#dc2626' } },
  { selector: 'node.cut', style: { 'border-width': 3, 'border-color': '#dc2626' } },
  { selector: 'node.failed', style: { 'background-color': '#d1d5db', color: '#6b7280', opacity: 0.6 } },
  { selector: 'node.selected', style: { 'border-width': 4, 'border-color': '#2563eb' } },
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
  { selector: 'edge.highlighted', style: { width: 5, 'line-color': '#f59e0b', 'target-arrow-color': '#f59e0b' } },
  { selector: 'edge.cut', style: { width: 5, 'line-color': '#dc2626', 'target-arrow-color': '#dc2626' } },
  {
    selector: 'edge.failed',
    style: {
      'line-style': 'dashed',
      'line-color': '#d1d5db',
      'target-arrow-color': '#d1d5db',
      color: '#9ca3af',
      opacity: 0.7,
    },
  },
  { selector: 'edge.selected', style: { width: 4, 'line-order': 3, 'line-color': '#2563eb', 'target-arrow-color': '#2563eb' } },
]

// dynamically push styles for each highlight color variant
HIGHLIGHT_COLORS.forEach((c, i) => {
  style.push(
    { selector: `node.highlighted-${i}`, style: { 'background-color': c.node, 'border-width': 3, 'border-color': c.border } },
    { selector: `edge.highlighted-${i}`, style: { width: 5, 'line-color': c.line, 'target-arrow-color': c.line } }
  )
})

style.push(
  { selector: 'edge.path-active', style: { width: 7 } },
  { selector: 'node.path-active', style: { 'border-width': 5 } }
)

function NetworkGraph({ network, selection, highlight, flowOverride, onSelect, onNodeMove }) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)

  // keep stable references for handlers without triggering re-runs
  const handleSelect = useEffectEvent((picked) => onSelect?.(picked))
  const handleMove = useEffectEvent((nodeId, position) => onNodeMove?.(nodeId, position))
  useEffect(() => {        // boot up cytoscape once on mount and clean it up when leaving
    const cy = cytoscape({
      container: containerRef.current,
      style,
      layout: { name: 'preset' },
      userZoomingEnabled: false,
      autounselectify: true,
    })

    cy.on('tap', 'node', (event) => handleSelect({ kind: 'node', id: event.target.id() }))
    cy.on('tap', 'edge', (event) => handleSelect({ kind: 'edge', id: event.target.id() }))
    cy.on('tap', (event) => {
      if (event.target === cy) handleSelect(null)
    })


    cy.on('dragfree', 'node', (event) => {
      const { x, y } = event.target.position()
      handleMove(event.target.id(), { x, y })
    })

    cyRef.current = cy
    return () => cy.destroy()
  }, [])

  // sync network data changes into cytoscape using a batch operation
  useEffect(() => {
    const cy = cyRef.current
    cy.batch(() => {
      cy.elements().remove()
      cy.add(toElements(network, selection, highlight, flowOverride))
    })
  }, [network, selection, highlight, flowOverride])
  // autofit the view whenever the node structure changes
  const nodeIds = network.nodes.map((node) => node.id).join(',')
  useEffect(() => {
    cyRef.current?.fit(undefined, 40)
  }, [nodeIds])
  return <div ref={containerRef} className="network-graph" />
}
export default NetworkGraph