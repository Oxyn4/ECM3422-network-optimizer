import { useEffect, useEffectEvent, useState } from "react";

import { edmondsKarpTrace } from '../../algorithm/ek.js';
import { HIGHLIGHT_COLORS } from '../NetworkGraph.jsx';
import './EdmondsKarpPanel.css'

// how long Play waits between augmenting paths
const PLAY_DELAY_MS = 900;

function applySteps(network, steps, upto) {
    network.clearFlows();
    for (let i = 0; i <= upto; i++) {
        const step = steps[i];
        for (const hop of step.path) {
            if (hop.type === 'forward') hop.edge.flow += step.bottleneck;
            else hop.edge.flow -= step.bottleneck;
        }
    }
}

function highlightFor(steps, upto, hoverIdx = null) {
    if (upto < 0) return null;

    if (hoverIdx !== null) {
        const s = steps[hoverIdx];
        return {
            kind: 'paths',
            paths: [{
                nodeIds: s.nodeIds,
                edgeIds: s.edgeIds,
                colorIndex: hoverIdx % HIGHLIGHT_COLORS.length,
                active: true,
            }],
        };
    }

    return {
        kind: 'paths',
        paths: steps.slice(0, upto + 1).map((s, i) => ({
            nodeIds: s.nodeIds,
            edgeIds: s.edgeIds,
            colorIndex: i % HIGHLIGHT_COLORS.length,
            active: i === upto,
        })),
    };
}

// classes replace the old summaryItemStyle/swatchStyle inline style factories
// the per-path colors come from the .pc-N classes in EkPanel.css
function itemClassName(index, step) {
    const classes = ['ek-item'];
    if (index <= step) classes.push('revealed');
    if (index === step) classes.push('current');
    classes.push('pc-' + (index % HIGHLIGHT_COLORS.length));
    return classes.join(' ');
}

export function EdmondsKarpPanel({ network, onHighlight, onFlowChanged }) {
    const [steps, setSteps] = useState(null);
    const [step, setStep] = useState(-1);
    const [hover, setHover] = useState(null);
    const [playing, setPlaying] = useState(false);

    // Play just presses Next on a timer until the last path
    const tick = useEffectEvent(() => {
        if (!steps || step >= steps.length - 1) {
            setPlaying(false);
            return;
        }
        advanceStep();
    });

    useEffect(() => {
        if (!playing) return;
        const timer = setTimeout(tick, PLAY_DELAY_MS);
        return () => clearTimeout(timer);
    }, [playing, step]);

    function startEK() {
        const s = edmondsKarpTrace(network);
        setSteps(s);
        setStep(-1);
        setHover(null);
        onHighlight(null);
        onFlowChanged?.();
    }

    function advanceStep() {
        if (!steps) return;
        const next = step + 1;
        if (next >= steps.length) return;

        applySteps(network, steps, next);
        setStep(next);
        setHover(null);
        onHighlight(highlightFor(steps, next));
        onFlowChanged?.();
    }

    function jumpTo(index) {
        if (!steps || index > step || index < 0) return;
        applySteps(network, steps, index);
        setStep(index);
        setHover(null);
        onHighlight(highlightFor(steps, index));
        onFlowChanged?.();
    }

    // go back one path; from the first path this returns to zero flow
    function stepBack() {
        if (!steps || step < 0) return;
        setPlaying(false);
        if (step === 0) {
            network.clearFlows();
            setStep(-1);
            setHover(null);
            onHighlight(null);
            onFlowChanged?.();
            return;
        }
        jumpTo(step - 1);
    }

    function enterSummaryItem(index) {
        if (index > step) return;
        setHover(index);
        onHighlight(highlightFor(steps, step, index));
    }

    function leaveSummaryItem() {
        setHover(null);
        onHighlight(highlightFor(steps, step));
    }

    function reset() {
        setPlaying(false);
        network.clearFlows();
        setSteps(null);
        setStep(-1);
        setHover(null);
        onHighlight(null);
        onFlowChanged?.();
    }

    if (steps === null) {
        return (
            <section>
                <h2>Edmonds-Karp</h2>
                <button className='primary' onClick={startEK}>Start</button>
            </section>
        );
    }

    const done = steps.length > 0 && step === steps.length - 1;

    return (
        <section>
            <h2>Edmonds-Karp</h2>
            {steps.length === 0 ? (
                <p>Max flow: 0</p>
            ) : (
                <>
                    <p>
                        Round: {step + 1} / {steps.length}
                        {done && ` max flow ${steps[step].maxFlow}`}
                    </p>
                    <ul className="ek-list">
                        {steps.map((s, i) => (
                            <li
                                key={i}
                                className={itemClassName(i, step)}
                                title={i <= step ? `Path ${i + 1}: +${s.bottleneck}` : undefined}
                                onMouseEnter={() => enterSummaryItem(i)}
                                onMouseLeave={leaveSummaryItem}
                                onClick={() => {
                                    setPlaying(false);
                                    jumpTo(i);
                                }}
                            >
                                <span className="ek-swatch" />
                                {i <= step
                                    ? `#${i + 1}  +${s.bottleneck}  (total ${s.maxFlow})`
                                    : `#${i + 1}  —`}
                            </li>
                        ))}
                    </ul>
                    <div className="button-row">
                        <button className="primary" onClick={stepBack} disabled={step < 0}>
                            Back
                        </button>
                        <button
                            className="primary"
                            onClick={() => {
                                setPlaying(false);
                                advanceStep();
                            }}
                            disabled={done}
                        >
                            Next
                        </button>
                        <button className="primary" onClick={() => setPlaying(!playing)} disabled={done}>
                            {playing ? 'Pause' : 'Play'}
                        </button>
                    </div>
                </>
            )}
            <button className='primary' onClick={reset}>Reset</button>
        </section>
    );
}