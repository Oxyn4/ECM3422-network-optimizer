import { useState } from 'react'

import { BfsPanel } from './panels/BfsPanel'
import { EdmondsKarpPanel } from './panels/EdmondsKarpPanel'
import { AnalysisPanel } from './panels/AnalysisPanel'
import { MultiSourceSinkPanel } from './panels/MultiSourceSinkPanel'

// a plain number input component using standard jsx
function NumberInput(props) {
  return <input type="number" {...props} />
}

// the step-through algorithms share one panel, one tab each
const ALGORITHM_TABS = [
  { id: 'bfs', label: 'BFS' },
  { id: 'ek', label: 'Edmonds-Karp' },
  { id: 'multi', label: 'Multi-source' },
]

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
  onFindBottlenecks,
  onFailEdge,
  onFailNode,
  onMultiFlow,
  onSetView,
  onHighlight,
  onFlowChanged,

}) {
  const [edgeSource, setEdgeSource] = useState('')
  const [algorithmTab, setAlgorithmTab] = useState('ek')
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

      {/* Network + Add edge merged into one collapsible Edit panel */}
      <section className="panel-collapsible">
        <details open>
          <summary>
            <h2>Edit</h2>
          </summary>

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

          <h3>Add edge</h3>
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
        </details>
      </section>

      {/* BFS, Edmonds-Karp and multi source/sink merged into one tabbed Algorithms panel */}
      <section className="algorithms">
        <h2>Algorithms</h2>
        <div className="tabs" role="tablist" aria-label="Algorithms">
          {ALGORITHM_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={'tab-' + tab.id}
              aria-selected={algorithmTab === tab.id}
              aria-controls={'tabpanel-' + tab.id}
              className={algorithmTab === tab.id ? 'tab active' : 'tab'}
              onClick={() => setAlgorithmTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* every tab stays mounted (just hidden) so switching tabs keeps playback state */}
        <div
          role="tabpanel"
          id="tabpanel-bfs"
          aria-labelledby="tab-bfs"
          className="tab-body"
          hidden={algorithmTab !== 'bfs'}
        >
          <BfsPanel key={'bfs-' + viewKey} network={network} onHighlight={onHighlight} />
        </div>
        <div
          role="tabpanel"
          id="tabpanel-ek"
          aria-labelledby="tab-ek"
          className="tab-body"
          hidden={algorithmTab !== 'ek'}
        >
          <EdmondsKarpPanel
            key={'ek-' + viewKey}
            network={network}
            onHighlight={onHighlight}
            onFlowChanged={onFlowChanged}
          />
        </div>
        <div
          role="tabpanel"
          id="tabpanel-multi"
          aria-labelledby="tab-multi"
          className="tab-body"
          hidden={algorithmTab !== 'multi'}
        >
          <MultiSourceSinkPanel network={network} onRun={onMultiFlow} />
        </div>
      </section>
    </aside>
  )
}

export default ControlPanel