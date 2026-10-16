import NetworkGraph from './components/NetworkGraph.jsx'
import { sampleNetwork, randomNetwork } from './data/sampleNetwork.js'
import './App.css'

function App() {
  return (
    <main className="app">
      <h1>Network Optimizer</h1>
      <p>Edmonds-Karp max-flow visualiser (random network)</p>
      <NetworkGraph network={randomNetwork} />
    </main>
  )
}

export default App
