import { useState } from "react";

import { BFS } from '../algorithm/ek.js';

export function BfsPanel({ network, onHighlight }) {
    const [isActive, setIsActive] = useState(false);

    function startBFS() {
        setIsActive(current => ~current);
        console.log("started BFS");
    }

    const [step, setStep] = useState(1);

    return isActive ? (
        <section>
            <h2>Breadth first search</h2>
            <button className="primary" onClick={() => setStep(current => current + 1)}>Step: {step}</button>
        </section>
    ) : (
        <section>
            <h2>Breadth first search</h2>
            <button className='primary' onClick={startBFS}>Start</button>
        </section>
    );
}
