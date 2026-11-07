import { useState } from 'react'

import { BfsPanel } from './panels/BfsPanel'
import { EdmondsKarpPanel } from './panels/EdmondsKarpPanel'
import { AnalysisPanel } from './panels/AnalysisPanel'
import { MultiSourceSinkPanel } from './panels/MultiSourceSinkPanel'

// a plain number input component using standard jsx
function NumberInput(props) {
  return <input type="number" {...props} />
}

function ControlPanel({
  network,
  selection,
  result,
  error,
  viewKey,
  onRandom,
  onExample,
  onDownload,
  onAddNode,
  onAddEdge,
  onUpdateCapacity,
  onRemoveNode,
  onRemoveEdge,
  onSetSource,
  onSetSink,
  onSelect,
  onRun,
  onFindBottlenecks,
  onFailEdge,
  onFailNode,
  onRankEdges,
  onMultiFlow,
  onSetView,
  onResetView,
  onHighlight,
  onFlowChanged,

}) {
  const [edgeSource, setEdgeSource] = useState('')
  const selectedNodeId =
    selection?.kind === 'node' && network.exists(selection.id)
      ? selection.id
      : null

  const selectedEdge =
    selection?.kind === 'edge'
      ? network.allEdges().find((edge) => edge.id === selection.id)
      : null

  function submitEdge(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const source = form.get('from')
    const target = form.get('to')
    const capacity = Number(form.get('capacity'))
    onAddEdge(source, target, capacity)
  }

  function submitCapacity(event) {
    event.preventDefault()

    if (!selectedEdge) return

    const form = new FormData(event.currentTarget)
    onUpdateCapacity(selectedEdge.id, Number(form.get('capacity')))
  }

  return (
    <aside className="control-panel">
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <section>
        <h2>Network</h2>
        <div className="button-row">
          <button type="button" onClick={onRandom}>
            Random network
          </button>
          <button type="button" onClick={onExample}>
            Example network
          </button>
          <button type="button" onClick={onAddNode}>
            Add node
          </button>
          <button type="button" onClick={onDownload}>
            Download JSON
          </button>
        </div>
      </section>

      <section>
        <h2>Analysis</h2>
        <div className="button-row">
          <button type="button" className="primary" onClick={onRun}>
            Run max flow
          </button>
          <button type="button" onClick={() => onFindBottlenecks(false)}>
            Find bottlenecks
          </button>
          <button type="button" onClick={onRankEdges}>
            Rank all edges
          </button>
          <button type="button" onClick={onResetView}>
            Reset view
          </button>
        </div>
      </section>

      {result && (
        <AnalysisPanel
          key={'analysis-' + viewKey}
          network={network}
          analysis={result}
          onSelect={onSelect}
          onHighlight={onHighlight}
          onFindBottlenecks={onFindBottlenecks}
          onSetView={onSetView}
        />
      )}

      <section>
        <h2>Add edge</h2>
        <form onSubmit={submitEdge} className="edge-form">
          <label>
            From
            <select
              name="from"
              value={edgeSource}
              onChange={(event) => setEdgeSource(event.target.value)}
              required
            >
              <option value="" disabled>
                Choose node
              </option>
              {network.nodes().map((nodeId) => (
                <option key={nodeId} value={nodeId}>
                  {nodeId}
                </option>
              ))}
            </select>
          </label>

          <label>
            To
            <select name="to" defaultValue="" required>
              <option value="" disabled>
                Choose node
              </option>
              {network.nodes().map((nodeId) => (
                <option
                  key={nodeId}
                  value={nodeId}
                  disabled={nodeId === edgeSource}
                >
                  {nodeId}
                </option>
              ))}
            </select>
          </label>

          <label>
            Capacity
            <NumberInput
              name="capacity"
              min="1"
              step="1"
              defaultValue="10"
              required
            />
          </label>

          <button type="submit">Add edge</button>
        </form>
      </section>

      <section>
        <h2>Selected</h2>

        {selectedNodeId && (
          <>
            <p>Node {selectedNodeId}</p>
            <div className="button-row">
              <button
                type="button"
                onClick={() => onSetSource(selectedNodeId)}
              >
                Set as source
              </button>
              <button
                type="button"
                onClick={() => onSetSink(selectedNodeId)}
              >
                Set as sink
              </button>
              <button
                type="button"
                onClick={() => onFailNode(selectedNodeId)}
              >
                Fail this node
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => onRemoveNode(selectedNodeId)}
              >
                Delete node
              </button>
            </div>
          </>
        )}

        {selectedEdge && (
          <>
            <p>
              Edge {selectedEdge.source} → {selectedEdge.target}
            </p>
            <form
              key={selectedEdge.id}
              onSubmit={submitCapacity}
              className="button-row"
            >
              <NumberInput
                name="capacity"
                min="1"
                step="1"
                defaultValue={selectedEdge.capacity}
                required
                aria-label="Edge capacity"
              />
              <button type="submit">Save capacity</button>
              <button
                type="button"
                onClick={() => onFailEdge(selectedEdge.id)}
              >
                Fail this edge
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => onRemoveEdge(selectedEdge.id)}
              >
                Delete edge
              </button>
            </form>
          </>
        )}

        {!selectedNodeId && !selectedEdge && (
          <p className="hint">Click a node or edge to edit it</p>
        )}
      </section>
      <BfsPanel key={'bfs-' + viewKey} network={network} onHighlight={onHighlight} />
      <EdmondsKarpPanel
        key={'ek-' + viewKey}
        network={network}
        onHighlight={onHighlight}
        onFlowChanged={onFlowChanged}
      />
      <MultiSourceSinkPanel network={network} onRun={onMultiFlow} />
    </aside>
  )
}

export default ControlPanel