
import { useState } from 'react'

// side panel for editing the network and running the algorithm
function ControlPanel({
  network,
  selection,
  result,
  error,
  onRandom,
  onSample,
  onAddNode,
  onAddEdge,
  onUpdateCapacity,
  onRemoveNode,
  onRemoveEdge,
  onSetSource,
  onSetSink,
  onRun,
}) {
  // keep track of the starting node chosen in the edge form
  const [edgeSource, setEdgeSource] = useState('')

  // find the selected node or edge in the current network
  const selectedNode =
    selection?.kind === 'node'
      ? network.nodes.find((node) => node.id === selection.id)
      : null

  const selectedEdge =
    selection?.kind === 'edge'
      ? network.edges.find((edge) => edge.id === selection.id)
      : null

  // read the form values when adding an edge
  function submitEdge(event) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const source = form.get('from')
    const target = form.get('to')
    const capacity = form.get('capacity')

    onAddEdge(source, target, capacity)
  }

  // update the capacity of the selected edge
  function submitCapacity(event) {
    event.preventDefault()

    if (!selectedEdge) return

    const form = new FormData(event.currentTarget)
    onUpdateCapacity(selectedEdge.id, form.get('capacity'))
  }

  // only allow the algorithm to run when the network has the basics it needs
  const canRun =
    network.source &&
    network.sink &&
    network.edges.length > 0

  return (
    <aside className="control-panel">
      <section>
        <h2>Network</h2>
        <div className="button-row">
          <button type="button" onClick={onRandom}>
            Random network
          </button>
          <button type="button" onClick={onSample}>
            Sample network
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
              {network.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label}
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
              {network.nodes.map((node) => (
                <option
                  key={node.id}
                  value={node.id}
                  disabled={node.id === edgeSource}
                >
                  {node.label}
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

        {selectedNode && (
          <>
            <p>Node {selectedNode.label}</p>
            <div className="button-row">
              <button
                type="button"
                onClick={() => onSetSource(selectedNode.id)}
              >
                Set as source
              </button>
              <button
                type="button"
                onClick={() => onSetSink(selectedNode.id)}
              >
                Set as sink
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => onRemoveNode(selectedNode.id)}
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

            {/* reset the input when a different edge is selected */}
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

        {!selectedNode && !selectedEdge && (
          <p className="hint">Click a node or edge to edit it</p>
        )}
      </section>

      <section>
        <h2>Max flow</h2>
        <p>
          Source: <strong>{network.source ?? 'none'}</strong>, sink:{' '}
          <strong>{network.sink ?? 'none'}</strong>
        </p>

        <button
          type="button"
          className="primary"
          onClick={onRun}
          disabled={!canRun}
        >
          Run Edmonds-Karp
        </button>

        {result && (
          <p className="result">
            Maximum flow: <strong>{result.maxFlow}</strong>
          </p>
        )}
        {error && <p className="error">{error}</p>}
      </section>
    </aside>
  )
}
export default ControlPanel
