import { useState } from "react";

import { BFS } from '../../algorithm/ek.js';

export function BfsPanel({ network, onHighlight }) {
    const [isActive, setIsActive] = useState(false);

    const [trace, setTrace] = useState([]);
    const [step, setStep] = useState(0);

    function startBFS() {
        setIsActive(true);
        const t = BFS(network);
        setTrace(t);
        setStep(0);
        if (t.length > 0) {
            onHighlight({
                kind: 'both',
                nodeIds: [t[0].node],
                edgeIds: []
            });
        }
    }

    function advanceStep() {
        if (step >= trace.length - 1) return;

        const next = step + 1;
        setStep(next);

        const nodes = trace.slice(0, next + 1).map(entry => entry.node);
        const edges = trace.slice(1, next + 1).map(entry => entry.edgeId).filter(Boolean);

        onHighlight({
            kind: 'both',
            nodeIds: nodes,
            edgeIds: edges
        });
    }

    function reset() {
        setStep(0);
        setIsActive(false);
        setTrace([]);
        onHighlight(null);
    }

    return isActive ? (
        <section>
            <h2>Breadth first search</h2>
            <p>Step: {step + 1} / {trace.length}</p>
            <button className="primary" onClick={advanceStep} disabled={step >= trace.length - 1}>
                Next
            </button>
            <button className='primary' onClick={reset}>Reset</button>
        </section>
    ) : (
        <section>
            <h2>Breadth first search</h2>
            <button className='primary' onClick={startBFS}>Start</button>
        </section>
    );
}