import { useState } from 'react'
import NetworkGraph from './components/NetworkGraph.jsx'
import ControlPanel from './components/ControlPanel.jsx'
import { FlowNet, makeRandomNetwork } from './data/sampleNetwork.js'
import * as ek from './algorithm/ek.js'
import { findBottlenecks } from './algorithm/bottleneck.js'
import { simulateEdgeFailure } from './algorithm/edgeFailure.js'
import { simulateNodeFailure } from './algorithm/nodeFailure.js'
import { multiSourceSinkMaxFlow } from './algorithm/multiSourceSink.js'
import { cloneNetwork } from './algorithm/networkUtils.js'
import './App.css'

function withEdge(net, edgeId, fn) {
  const edge = net.allEdges().find((edge) => edge.id === edgeId)
  if (!edge) return { error: 'Edge not found' }
  return fn(edge)
}

// the single source/sink analyses all need these before they can run
function readyError(net) {
  if (!net.sink) return 'Choose a sink before running'
  if (net.edgeCount() === 0) return 'Add at least one edge'
  return null
}

// the textbook network from the tests: A = source, F = sink, max flow 23
// it needs several augmenting paths (one undoes flow), so playback has steps to show
function makeExampleNetwork() {
  const net = new FlowNet()
  for (let i = 1; i < 6; i++) net.addNode() // B to F

  const edges = [
    ['A', 'B', 16], ['A', 'C', 13], ['B', 'C', 10], ['C', 'B', 4], ['B', 'D', 12],
    ['D', 'C', 9], ['C', 'E', 14], ['E', 'D', 7], ['D', 'F', 20], ['E', 'F', 4],
  ]
  for (const [from, to, capacity] of edges) net.connect(from, to, 0, capacity)
  net.setSink('F')

  const positions = {
    A: { x: 0, y: 140 }, B: { x: 180, y: 0 }, C: { x: 180, y: 280 },
    D: { x: 380, y: 0 }, E: { x: 380, y: 280 }, F: { x: 560, y: 140 },
  }
  for (const [id, position] of Object.entries(positions)) net.setNodePosition(id, position)
  return net
}

function downloadJson(net, analysis) {
  const data = {
    exportedAt: new Date().toISOString(),
    source: net.source,
    sink: net.sink,
    nodes: net.nodes().map((id) => ({ id, position: net.nodePositions.get(id) ?? null })),
    edges: net.allEdges(),
    analysis,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'network.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function App() {
  const [network, setNetwork] = useState(() => makeRandomNetwork())
  const [revision, setRevision] = useState(0)
  const [selection, setSelection] = useState(null) // { kind: 'node' | 'edge', id } or null
  const [highlight, setHighlight] = useState(null)
  const [result, setResult] = useState(null) // last result shown in the Results panel, with a type field
  const [error, setError] = useState('')
  // bumping this remounts the BFS / Edmonds-Karp panels so they never show stale steps
  const [viewKey, setViewKey] = useState(0)

  // any change to the network makes the last result out of date
  function changeNetwork(next) {
    if (next !== network) setNetwork(next)
    next.clearFlows()
    setRevision((r) => r + 1)
    setResult(null)
    setError('')
    setHighlight(null)
    setViewKey((k) => k + 1)
  }

  function tryChange(outcome) {
    if (outcome.error) setError(outcome.error)
    else changeNetwork(network)
  }

  function loadNetwork(next) {
    changeNetwork(next)
    setSelection(null)
  }

  // the playback panels change the flows themselves, so any result on screen is out of date
  function flowChanged() {
    setRevision((r) => r + 1)
    setResult(null)
  }

  // run an analysis without crashing: algorithm errors go to the error area
  function runSafely(label, fn) {
    try {
      const output = fn()
      if (output?.error) {
        setError(output.error)
        return null
      }
      setError('')
      return output
    } catch (err) {
      setError(label + ' failed: ' + err.message)
      return null
    }
  }

  function showAnalysis(next, nextHighlight) {
    setRevision((r) => r + 1)
    setResult(next)
    setHighlight(nextHighlight)
    setViewKey((k) => k + 1)
  }

  function resetView() {
    network.clearFlows()
    setRevision((r) => r + 1)
    setResult(null)
    setHighlight(null)
    setError('')
    setViewKey((k) => k + 1)
  }

  function runMaxFlow() {
    if (!network.sink) return setError('Choose a sink before running')
    if (network.edgeCount() === 0) return setError('Add at least one edge')

    // edmondsKarp returns the max flow and the flow on each edge
    if (typeof ek.edmondsKarp !== 'function') {
      return setError('Edmonds-Karp is not ready yet: src/algorithm/ek.js needs to export edmondsKarp.')
    }

    // show an error instead of crashing if the algorithm fails
    try {
      const output = ek.edmondsKarp(network)

      // replay on a copy to list the augmenting paths without touching the real flows
      const paths = ek.edmondsKarpTrace(cloneNetwork(network)).map((step) => ({
        nodeIds: step.nodeIds,
        edgeIds: step.edgeIds,
        bottleneck: step.bottleneck,
        maxFlow: step.maxFlow,
      }))

      setRevision((r) => r + 1)
      setResult({ type: 'maxFlow', ...output, paths })
      setError('')
      setHighlight(null)
      setViewKey((k) => k + 1)
    } catch (err) {
      setResult(null)
      setError('Edmonds-Karp failed: ' + err.message)
    }
  }

  function runBottlenecks(sensitivity = false) {
    const output = runSafely('Bottleneck search', () => {
      const problem = readyError(network)
      if (problem) return { error: problem }

      const found = findBottlenecks(network, { sensitivity })
      if (found.error) return found

      // put the max flow on the graph too, so the cut edges read as full (e.g. 12 / 12)
      ek.edmondsKarp(network)
      return found
    })
    if (!output) return

    showAnalysis(
      { type: 'bottlenecks', sensitivity, ...output },
      { kind: 'layers', layers: [{ style: 'cut', nodeIds: [], edgeIds: output.highlight.edgeIds }] }
    )
  }

  function failEdge(edgeId) {
    const output = runSafely('Edge failure', () => {
      const problem = readyError(network)
      if (problem) return { error: problem }

      const outcome = simulateEdgeFailure(network, edgeId)
      if (outcome.error) return outcome

      // the real network keeps the "before" flows; the failed copy gives the "after" flows
      const before = ek.edmondsKarp(network)
      return { ...outcome, beforeFlows: before.flows, afterFlows: outcome.flows }
    })
    if (!output) return

    showAnalysis(
      { type: 'edgeFailure', view: 'after', ...output },
      { kind: 'layers', layers: [{ style: 'failed', nodeIds: [], edgeIds: output.highlight.edgeIds }] }
    )
  }

  function failNode(nodeId) {
    const output = runSafely('Node failure', () => {
      const problem = readyError(network)
      if (problem) return { error: problem }

      const outcome = simulateNodeFailure(network, nodeId)
      if (outcome.error) return outcome

      const before = ek.edmondsKarp(network)
      return { ...outcome, beforeFlows: before.flows, afterFlows: outcome.flows }
    })
    if (!output) return

    showAnalysis(
      { type: 'nodeFailure', view: 'after', ...output },
      {
        kind: 'layers',
        layers: [{ style: 'failed', nodeIds: output.highlight.nodeIds, edgeIds: output.highlight.edgeIds }],
      }
    )
  }

  // fail every edge in turn and sort by how much flow is lost
  function rankEdges() {
    const output = runSafely('Edge ranking', () => {
      const problem = readyError(network)
      if (problem) return { error: problem }

      const rows = []
      for (const edge of network.allEdges()) {
        const outcome = simulateEdgeFailure(network, edge.id)
        if (outcome.error) return outcome

        rows.push({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          capacity: edge.capacity,
          newMaxFlow: outcome.newMaxFlow,
          flowReduction: outcome.flowReduction,
          percentageReduction: outcome.percentageReduction,
        })
      }
      rows.sort((a, b) => b.flowReduction - a.flowReduction || a.id.localeCompare(b.id))

      const { maxFlow } = ek.edmondsKarp(network)
      return { maxFlow, rows }
    })
    if (!output) return

    const critical = output.rows.filter((row) => row.flowReduction > 0).map((row) => row.id)
    showAnalysis(
      { type: 'rank', ...output },
      { kind: 'layers', layers: [{ style: 'cut', nodeIds: [], edgeIds: critical }] }
    )
  }

  function runMultiFlow(sources, sinks) {
    const output = runSafely('Multi-source max flow', () => multiSourceSinkMaxFlow(network, sources, sinks))
    if (!output) return

    // the flows are shown through flowOverride, so the real network goes back to zero
    network.clearFlows()
    showAnalysis(
      { type: 'multi', ...output },
      {
        kind: 'layers',
        replaceTerminals: true,
        layers: [
          { style: 'multi-source', nodeIds: sources, edgeIds: [] },
          { style: 'multi-sink', nodeIds: sinks, edgeIds: [] },
          { style: 'cut', nodeIds: [], edgeIds: output.bottleneckEdgeIds },
        ],
      }
    )
  }

  function setFailureView(view) {
    setResult((current) => (current ? { ...current, view } : current))
  }

  // edge labels show these flows instead of the network's own when set
  let flowOverride = null
  if (result?.type === 'multi') flowOverride = result.flows
  else if (result?.view === 'after') flowOverride = result.afterFlows

  return (
    <main className="app">
      <h1>Network Optimizer</h1>
      <p>Edmonds-Karp max-flow visualiser</p>
      <div className="workspace">
        <NetworkGraph
          network={network.cytoscape()}
          selection={selection}
          highlight={highlight}
          flowOverride={flowOverride}
          onSelect={setSelection}
          // moving a node doesn't change the flows, so keep the result
          onNodeMove={(nodeId, position) => network.setNodePosition(nodeId, position)}
        />
        <ControlPanel
          network={network}
          selection={selection}
          result={result}
          error={error}
          viewKey={viewKey}
          onRandom={() => loadNetwork(makeRandomNetwork())}
          onExample={() => loadNetwork(makeExampleNetwork())}
          onDownload={() => downloadJson(network, result)}
          onAddNode={() => {
            network.addNode()
            changeNetwork(network)
          }}
          onAddEdge={(from, to, capacity) =>
            tryChange(
              network.connect(from, to, 0, capacity)
                ? { network }
                : { error: 'Could not add edge (missing node or self-loop)' }
            )
          }
          onUpdateCapacity={(edgeId, capacity) =>
            tryChange(
              withEdge(network, edgeId, (edge) => {
                network.setCapacity(edge.source, edge.target, capacity)
                return { network }
              })
            )
          }
          onRemoveNode={(nodeId) => {
            if (network.removeNode(nodeId)) changeNetwork(network)
            else setError('Cannot delete the source node')
            setSelection(null)
          }}
          onRemoveEdge={(edgeId) => {
            tryChange(
              withEdge(network, edgeId, (edge) => {
                network.removeEdge(edge.source, edge.target)
                return { network }
              })
            )
            setSelection(null)
          }}
          onSetSource={(nodeId) => {
            network.source = nodeId
            changeNetwork(network)
          }}
          onSetSink={(nodeId) => {
            if (network.setSink(nodeId)) changeNetwork(network)
            else setError('Unknown node')
          }}
          onSelect={setSelection}
          onRun={runMaxFlow}
          onFindBottlenecks={runBottlenecks}
          onFailEdge={failEdge}
          onFailNode={failNode}
          onRankEdges={rankEdges}
          onMultiFlow={runMultiFlow}
          onSetView={setFailureView}
          onResetView={resetView}
          onHighlight={setHighlight}
          onFlowChanged={flowChanged}
        />
      </div>
    </main>
  )
}

export default App