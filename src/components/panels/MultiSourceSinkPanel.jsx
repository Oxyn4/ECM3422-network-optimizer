import { useState } from 'react'

// a plain checkbox component using standard jsx
function Checkbox(props) {
    return <input type="checkbox" {...props} />
}

// flow-net only stores one source and one sink, so this panel keeps its own lists
export function MultiSourceSinkPanel({ network, onRun }) {
    const [sources, setSources] = useState(() => (network.source ? [network.source] : []))
    const [sinks, setSinks] = useState(() => (network.sink ? [network.sink] : []))


    // drop ticks for nodes that have since been deleted
    const liveSources = sources.filter((id) => network.exists(id))
    const liveSinks = sinks.filter((id) => network.exists(id))
    function toggle(list, setList, id) {
        setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
    }
    function clearTicks() {
        setSources([])
        setSinks([])
    
    }
    return (
        <section>
            <h2>Multiple sources and sinks</h2>
            <p className="hint">Tick each node's role, then run</p>
            <div className="table-scroll">
                <table className="result-table multi-table">
                    <thead>
                        <tr>
                            <th>Node</th>
                            <th>Source</th>
                            <th>Sink</th>
                        </tr>
                    </thead>
                    <tbody>
                        {network.nodes().map((id) => (
                            <tr key={id}>
                                <td>{id}</td>
                                <td>
                                    <Checkbox

                                        aria-label={`${id} is a source`}
                                        checked={liveSources.includes(id)}
                                        disabled={liveSinks.includes(id)}
                                        onChange={() => toggle(sources, setSources, id)}
                                    />
                                </td>
                                <td>
                                    <Checkbox

                                        aria-label={`${id} is a sink`}
                                        checked={liveSinks.includes(id)}
                                        disabled={liveSources.includes(id)}
                                        onChange={() => toggle(sinks, setSinks, id)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="button-row">
                <button
                    type="button"
                    className="primary"
                    onClick={() => onRun(liveSources, liveSinks)}
                    disabled={liveSources.length === 0 || liveSinks.length === 0}
                >
                    Run multi max Flow
                </button>
                <button type="button" onClick={clearTicks}>
                    Clear ticks
                </button>
            </div>
        </section>

    )
    
}