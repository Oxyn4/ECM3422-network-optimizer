import NetworkGraph from './components/NetworkGraph.jsx'
import { sampleNetwork } from './data/sampleNetwork.js'
import './App.css'

function App() {
  return (
    <main className="app">
      <h1>Network Optimizer</h1>
      <p>Edmonds-Karp max-flow visualiser (sample network)</p>
      <NetworkGraph network={sampleNetwork()} />
    </main>
  )
}

export default App
