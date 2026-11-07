import { useState } from 'react'
import { HIGHLIGHT_COLORS } from '../NetworkGraph.jsx'
import './EdmondsKarpPanel.css'


// a plain checkbox component using standard jsx
function Checkbox(props) {
    return <input type="checkbox" {...props} />
}

function formatPercent(value) {
    return String(Math.round(value * 10) / 10)
}

function edgeName(edge) {
    return `${edge.source} → ${edge.target}`
}


// builds highlight data structures for paths
function pathsHighlight(paths, hoverIdx = null) {
    const shown = hoverIdx === null ? paths.map((p, i) => [p, i]) : [[paths[hoverIdx], hoverIdx]]
    return {
        kind: 'paths',
        paths: shown.map(([p, i]) => ({
            nodeIds: p.nodeIds,
            edgeIds: p.edgeIds,
            colorIndex: i % HIGHLIGHT_COLORS.length,
            active: hoverIdx !== null,

        })),
    }
}

function MaxFlowResult({ analysis, onHighlight }) {
    const [showAll, setShowAll] = useState(false)
    const { maxFlow, paths } = analysis


    function baseHighlight() {
        return showAll ? pathsHighlight(paths) : null
    }

    function toggleAll() {
        const next = !showAll
        setShowAll(next)
        onHighlight(next ? pathsHighlight(paths) : null)
    }
    return (
        <section>
            <h2>Max flow</h2>
            <p className="result-value">Max flow = {maxFlow}</p>
            <p className="hint">Edge labels show flow/capacity</p>

            {paths.length === 0 ? (
                <p>No augmenting path from source to sink.</p>
            ) : (
                <>
                    <h3>Augmenting paths ({paths.length})</h3>
                    <p className="hint">Hover a path to highlight it</p>
                    <ul className="ek-list">
                        {paths.map((p, i) => (
                            <li
                                key={i}
                                className={`ek-item revealed pc-${i % HIGHLIGHT_COLORS.length}`}
                                onMouseEnter={() => onHighlight(pathsHighlight(paths, i))}
                                onMouseLeave={() => onHighlight(baseHighlight())}
                            >
                                <span className="ek-swatch" />
                                {`#${i + 1}  ${p.nodeIds.join(' → ')}  +${p.bottleneck}`}
                            </li>
                        ))}
                    </ul>
                    <button type="button" onClick={toggleAll}>
                        {showAll ? 'Hide paths' : 'Show all paths'}
                    </button>
                </>
            )}
        </section>
    )

}

function BottleneckResult({ analysis, onSelect, onFindBottlenecks }) {
    const { maxFlow, totalCutCapacity, bottlenecks, sensitivity } = analysis
    return (
        <section>
            <h2>Bottlenecks</h2>
            <p className="result-value">
                {maxFlow === totalCutCapacity
                    ? `Max flow = min cut = ${maxFlow}`
                    : `Max flow = ${maxFlow}, min cut = ${totalCutCapacity}`}
            </p>
            {bottlenecks.length === 0 ? (
                <p>No path from source to sink, so there are no bottleneck edges.</p>
            ) : (
                <>
                    <label className="toggle">
                        <Checkbox
                            checked={sensitivity}
                            onChange={(event) => onFindBottlenecks(event.target.checked)}
                        />
                        Show improvement
                    </label>
                    <p className="hint">Min-cut edges are red on the graph. Click one to select it.</p>
                    <ul className="result-list">
                        {bottlenecks.map((edge) => (
                            <li key={edge.id} onClick={() => onSelect({ kind: 'edge', id: edge.id })}>
                                {edgeName(edge)} (capacity {edge.capacity})
                                {sensitivity && (
                                    <span className={edge.improvement > 0 ? 'improvement' : 'no-gain'}>
                                        {edge.improvement > 0
                                            ? ` +1 capacity here → +${edge.improvement} flow`
                                            : ' +1 capacity here → no gain'}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    )
}

// before/after toggle plus a table of every edge whose flow changed
function BeforeAfter({ network, analysis, onSetView }) {
    const changed = network.allEdges()
        .map((edge) => ({
            ...edge,
            before: analysis.beforeFlows[edge.id] ?? 0,
            after: analysis.afterFlows[edge.id] ?? 0,
        }))
        .filter((edge) => edge.before !== edge.after)

    return (
        <>
            <h3>Before / after</h3>
            <div className="button-row">
                <button
                    type="button"
                    className={analysis.view === 'before' ? 'active' : ''}
                    onClick={() => onSetView('before')}
                >
                    Before
                </button>
                <button
                    type="button"
                    className={analysis.view === 'after' ? 'active' : ''}
                    onClick={() => onSetView('after')}
                >
                    After
                </button>
            </div>
            <p className="hint">
                The graph shows the flows {analysis.view === 'before' ? 'before' : 'after'} the failure.
                There can be more than one valid max flow, so some edges may move even if the total doesn't.
            </p>

            {changed.length === 0 ? (
                <p>No edge flows changed.</p>
            ) : (
                <div className="table-scroll">
                    <table className="result-table">
                        <thead>
                            <tr>
                                <th>Edge</th>
                                <th className="num">Before</th>
                                <th className="num">After</th>
                            </tr>
                        </thead>
                        <tbody>
                            {changed.map((edge) => (
                                <tr key={edge.id}>
                                    <td>{edgeName(edge)}</td>
                                    <td className="num">{edge.before}</td>
                                    <td className="num">{edge.after}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    )
}

function FlowChange({ analysis }) {
    const { originalMaxFlow, newMaxFlow, percentageReduction, affectsMaxFlow } = analysis
    if (!affectsMaxFlow) {
        return <p className="result-value">No effect on max flow ({originalMaxFlow})</p>
    }
    return (
        <p className="result-value">
            Max flow {originalMaxFlow} → {newMaxFlow} (−{formatPercent(percentageReduction)}%)
        </p>
        )
}

function EdgeFailureResult({ network, analysis, onSetView }) {
    const { failedEdge } = analysis

    return (
        <section>
            <h2>Edge failure</h2>
            <p>
                Failed edge {edgeName(failedEdge)} (capacity {failedEdge.capacity}, was carrying{' '}
                {failedEdge.flowBeforeFailure})
            </p>
            <FlowChange analysis={analysis} />
            <BeforeAfter network={network} analysis={analysis} onSetView={onSetView} />
        </section>
    )
}

function NodeFailureResult({ network, analysis, onSetView }) {
    const { failedNode, removedEdges, warning } = analysis

    return (
        <section>
            <h2>Node failure</h2>
            <p>
                Failed node {failedNode} ({removedEdges.length} edge{removedEdges.length === 1 ? '' : 's'} removed)
            </p>
            {warning && <p className="warning">{warning}</p>}
            <FlowChange analysis={analysis} />
            <BeforeAfter network={network} analysis={analysis} onSetView={onSetView} />
        </section>
    )
}

function RankResult({ analysis, onSelect }) {
    const { maxFlow, rows } = analysis
    const critical = rows.filter((row) => row.flowReduction > 0).length

    return (
        <section>
            <h2>Edge ranking</h2>
            <p>
                Max flow = {maxFlow}. Each edge was failed on its own; {critical} of {rows.length} reduce
                the max flow (red on the graph).
            </p>
            <p className="hint">Click a row to select that edge</p>
            <div className="table-scroll">
                <table className="result-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Edge</th>
                            <th className="num">Cap</th>
                            <th className="num">Flow lost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={row.id} onClick={() => onSelect({ kind: 'edge', id: row.id })}>
                                <td>{i + 1}</td>
                                <td>{edgeName(row)}</td>
                                <td className="num">{row.capacity}</td>
                                <td className="num">
                                    {row.flowReduction > 0
                                        ? `−${row.flowReduction} (${formatPercent(row.percentageReduction)}%)`
                                        : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

function MultiResult({ analysis, onSelect }) {
    const { sources, sinks, maxFlow, bottlenecks, limitedByTerminals } = analysis

    return (
        <section>
            <h2>Multi-source max flow</h2>
            <p>
                Sources: {sources.join(', ')}
                <br />
                Sinks: {sinks.join(', ')}
            </p>
            <p className="result-value">Max flow = {maxFlow}</p>
            <p className="hint">Green = sources, red = sinks, red edges = bottlenecks</p>
            {limitedByTerminals && (
                <p className="warning">
                    Part of the limit is the total capacity leaving a source or entering a sink.
                </p>
            )}
            {bottlenecks.length > 0 && (
                <>
                    <h3>Bottleneck edges</h3>
                    <ul className="result-list">
                        {bottlenecks.map((edge) => (
                            <li key={edge.id} onClick={() => onSelect({ kind: 'edge', id: edge.id })}>
                                {edgeName(edge)} (capacity {edge.capacity})
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    )
}

export function AnalysisPanel({ network, analysis, onSelect, onHighlight, onFindBottlenecks, onSetView }) {
    switch (analysis.type) {
        case 'maxFlow':
            return <MaxFlowResult analysis={analysis} onHighlight={onHighlight} />
        case 'bottlenecks':
            return (
                <BottleneckResult analysis={analysis} onSelect={onSelect} onFindBottlenecks={onFindBottlenecks} />
            )
        case 'edgeFailure':
            return <EdgeFailureResult network={network} analysis={analysis} onSetView={onSetView} />
        case 'nodeFailure':
            return <NodeFailureResult network={network} analysis={analysis} onSetView={onSetView} />
        case 'rank':
            return <RankResult analysis={analysis} onSelect={onSelect} />
        case 'multi':
            return <MultiResult analysis={analysis} onSelect={onSelect} />
        default:
            return null
            
    }
}