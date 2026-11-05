import { useState } from 'react'
import NetworkGraph from './components/NetworkGraph.jsx'
import ControlPanel from './components/ControlPanel.jsx'
import { makeRandomNetwork } from './data/sampleNetwork.js'
import * as ek from './algorithm/ek.js'
import './App.css'

function withEdge(net, edgeId, fn) {
  const edge = net.allEdges().find((edge) => edge.id === edgeId)
  if (!edge) return { error: 'Edge not found' }
  return fn(edge)
}

function App() {
  const [network, setNetwork] = useState(() => makeRandomNetwork())
  const [revision, setRevision] = useState(0)
  const [selection, setSelection] = useState(null) // { kind: 'node' | 'edge', id } or null
  const [highlight, setHighlight] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // any change to the network makes the last result out of date
  function changeNetwork(next) {
    if (next !== network) setNetwork(next)
    next.clearFlows()
    setRevision((r) => r + 1)
    setResult(null)
    setError('')
    setHighlight(null)
  }

  function tryChange(outcome) {
    if (outcome.error) setError(outcome.error)
    else changeNetwork(network)
  }

  function loadNetwork(next) {
    changeNetwork(next)
    setSelection(null)
  }

  function flowChanged() {
    setRevision((r) => r + 1)
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
      setRevision((r) => r + 1)
      setResult(output)
      setError('')
    } catch (err) {
      setResult(null)
      setError('Edmonds-Karp failed: ' + err.message)
    }
  }

  return (
    <main className="app">
      <h1>Network Optimizer</h1>
      <p>Edmonds-Karp max-flow visualiser</p>
      <div className="workspace">
        <NetworkGraph
          network={network.cytoscape()}
          selection={selection}
          highlight={highlight}
          onSelect={setSelection}
          // moving a node doesn't change the flows, so keep the result
          onNodeMove={(nodeId, position) => network.setNodePosition(nodeId, position)}
        />
        <ControlPanel
          network={network}
          selection={selection}
          result={result}
          error={error}
          onRandom={() => loadNetwork(makeRandomNetwork())}
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
          onRun={runMaxFlow}
          onHighlight={setHighlight}
          onFlowChanged={flowChanged}
        />
      </div>
    </main>
  )
}

export default App
