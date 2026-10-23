import { useState } from 'react'
import NetworkGraph from './components/NetworkGraph.jsx'
import ControlPanel from './components/ControlPanel.jsx'
import { sampleNetwork, makeRandomNetwork } from './data/sampleNetwork.js'
import * as ek from './algorithm/ek.js'
import {
  addNode,
  addEdge,
  updateCapacity,
  removeNode,
  removeEdge,
  moveNode,
  setSource,
  setSink,
  resetFlows,
  applyFlows,
  checkReadyToRun,
} from './graph/networkEdits.js'
import './App.css'

function App() {
  const [network, setNetwork] = useState(() => makeRandomNetwork())
  const [selection, setSelection] = useState(null) // { kind: 'node' | 'edge', id } or null
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // any change to the network makes the last result out of date
  function changeNetwork(next) {
    setNetwork(resetFlows(next))
    setResult(null)
    setError('')
  }

  // edits that can be refused return { error } 
  function tryChange(outcome) {
    if (outcome.error) setError(outcome.error)
    else changeNetwork(outcome.network)
  }

  function loadNetwork(next) {
    changeNetwork(next)
    setSelection(null)
  }
  
  function runMaxFlow() {
    const problem = checkReadyToRun(network)
    if (problem) return setError(problem)

    // edmondsKarp returns the max flow and the flow on each edge
    if (typeof ek.edmondsKarp !== 'function') {
      return setError('Edmonds-Karp is not ready yet: src/algorithm/ek.js needs to export edmondsKarp.')
    }

    // show an error instead of crashing if the algorithm fails
    try {
      const output = ek.edmondsKarp(network)
      setNetwork(applyFlows(network, output.flows ?? {}))
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
          network={network}
          selection={selection}
          onSelect={setSelection}
          // moving a node doesn't change the flows, so keep the result
          onNodeMove={(nodeId, position) => setNetwork((current) => moveNode(current, nodeId, position))}
        />
        <ControlPanel
          network={network}
          selection={selection}
          result={result}
          error={error}
          onRandom={() => loadNetwork(makeRandomNetwork())}
          onSample={() => loadNetwork(sampleNetwork())}
          onAddNode={() => changeNetwork(addNode(network))}
          onAddEdge={(from, to, capacity) => tryChange(addEdge(network, from, to, capacity))}
          onUpdateCapacity={(edgeId, capacity) => tryChange(updateCapacity(network, edgeId, capacity))}
          onRemoveNode={(nodeId) => {
            changeNetwork(removeNode(network, nodeId))
            setSelection(null)
          }}
          onRemoveEdge={(edgeId) => {
            changeNetwork(removeEdge(network, edgeId))
            setSelection(null)
          }}
          onSetSource={(nodeId) => changeNetwork(setSource(network, nodeId))}
          onSetSink={(nodeId) => changeNetwork(setSink(network, nodeId))}
          onRun={runMaxFlow}
        />
      </div>
    </main>
  )
}

export default App