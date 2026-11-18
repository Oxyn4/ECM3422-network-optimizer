
# Network optimiser

For this project we chose to build a web based implemention of the Edmonds-Karp algorithm for network analysis and optimization.

The intended users of this project are network administrators attempting to understand how their network topology is limited by throughput.

This tool enables network engineers to design and model their network architectures and test them prior to deployment.

## Installation and access

Online:  https://ecm2433-network-optimizer.web.app/ 

Locally (requires Node.js 18+ and npm):

```sh
git clone https://github.com/Oxyn4/ECM3422-network-optimizer
cd ECM3422-network-optimizer
npm install
npm run dev
```

Then open the local URL Vite prints (usually http://localhost:5173)

Run the tests (more info in testing section):
```sh
npx vitest run
```

## Problem and algorithm

Problem: given a network of nodes and links with capacities, find the maximum throughput from a source to a sink, and find the bottleneck links that limit it.

Edmonds-Karp is Ford-Fulkerson where each augmenting path is the shortest one, found with bfs.


Psuedo code:
'''
EdmondsKarp(G, s, t):
  flow(u,v) = 0 for every edge
  maxFlow = 0
  while BFS finds a path P from s to t in the residual graph:
      b = min residual capacity along P
      for each edge (u,v) in P:
          flow(u,v) += b
          flow(v,u) -= b        
      maxFlow += b
  return maxFlow
'''

After it finishes, the nodes still reachable from s in the residual graph form one side of the minimum cut.


Complexity:
- Time: O(V*E²). Each BFS costs O(E), and using shortest paths limits the number of augmentations to O(V*E).
- Space: O(V + E) for the adjacency lists, the residual capacities and the bfs queue


## Testing

Run the Vitest unit tests with `npx vitest run`. All 113 tests pass across 3 files:

- `src/algorithm/ek.test.js`: Edmonds-Karp, BFS and augmenting paths (26 tests)
- `src/algorithm/networkAnalysis.test.js`: min cut, bottlenecks, failures and multi-source/sink (33 tests)
- `src/data/sampleNetwork.test.js`: network data structure and random generator (54 tests)

Key cases:
- Max flow of 23 on the CLRS textbook network, and correct results for single edges, bottlenecks and parallel paths
- Max flow of 0 when the sink is unreachable
- Backward edges are used correctly to reroute flow
- On random networks, capacity limits and flow conservation always hold, and min cut equals max flow
- edge and node failures recalculate flow correctly

The app also has a random network generator and a step-by-step mode for manual testing.


## Dependencies and third-party resources

- React and Vite: UI framework and build tool
- Cytoscape.js: graph visualisation
- Vitest: testing
- Firebase Hosting: deployment
- References: Cormen et al., *Introduction to Algorithms* (ch. 26); Edmonds & Karp (1972)


## Limitations

The limitations for this this project include a lack of simultion of computer hardware, while the theoretical modelling tools like this provide a valueable first step, in reality throughput in computer networks is also determined by the protocols in use, e.g SSH vs HTTP; How fast a computer can generate packets and protocol messages to be sent through the network and factors such as the physical delivery method, e.g wifi vs ethernet.

Our tool does little to simulate real world networking hardware including the preformance of firewalls dropping or letting packets progress and this is something we would explore further in later work. The tool also does not account for dropped packets in a network.


## Team contributions

Jacob - Core Algorithm
- Implemented the main Edmonds-Karp algorithm, including BFS, augmenting paths and residual graph handling.
- Developed the graph data structures and random network generator.
- Contributed to algorithm improvements and wrote core unit tests.

Harry - UI and Integration
- Built the React and Cytoscape interface.
- Improved the core algorithm's backward-edge handling and implemented step-by-step execution.
- Integrated the algorithm with the UI and visualised augmenting paths and minimum cuts.
- Implemented node-failure comparisons, fixed bugs and wrote integration and feature tests.

Will - Algorithm Extensions
- Contributed to the core flow-analysis functionality, including minimum-cut and bottleneck calculations.
- Developed node and edge failure simulations and multi-source/multi-sink functionality.
- Wrote tests for the additional features.

All team members contributed to the development, testing and improvement of the core network-flow algorithm.

# AI declaration

We complied with the universities of Exeters' definition of AI-assisted.