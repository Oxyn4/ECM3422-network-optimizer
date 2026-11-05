import { useState } from 'react'

import { BfsPanel } from './panels/BfsPanel'
import { EdmondsKarpPanel } from './panels/EdmondsKarpPanel'

function ControlPanel({
  network,
  selection,
  onRandom,
  onAddNode,
  onAddEdge,
  onUpdateCapacity,
  onRemoveNode,
  onRemoveEdge,
  onSetSource,
  onSetSink,
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
      <section>
        <h2>Network</h2>
        <div className="button-row">
          <button type="button" onClick={onRandom}>
            Random network
          </button>
          <button type="button" onClick={onAddNode}>
            Add node
          </button>
        </div>
      </section>

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
            <input
              name="capacity"
              type="number"
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
              <input
                name="capacity"
                type="number"
                min="1"
                step="1"
                defaultValue={selectedEdge.capacity}
                required
                aria-label="Edge capacity"
              />
              <button type="submit">Save capacity</button>
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
      <BfsPanel network={network} onHighlight={onHighlight} />
      <EdmondsKarpPanel
        network={network}
        onHighlight={onHighlight}
        onFlowChanged={onFlowChanged}
      />
    </aside>
  )
}
export default ControlPanel
