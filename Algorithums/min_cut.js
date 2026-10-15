/* Min-cut 
Finds the edge that blocks the most flow from reaching the desitation 

Inputs:
 - originalGraph: original nodes/edges with capacities
 - residualGraph: remaining capacities after max flow
 - source: selected source node ID
 
   originalGraph edge format:
      { source: "S", target: "A", capacity: 10 }
 
   residualGraph format:
    {
      S: { A: 0, B: 5 },
      A: { S: 10, T: 0 }
    }

*/

export function findMinCut(originalGraph, residualGraph, source){
    // Adding the source to nodes it can reach
    const reachable = new Set();
    const queue = [source];

    reachable.add(source);

    // BFS
    while (queue.length > 0){

        const current = queue.shift();

        const neighbours = residualGraph[current] || {};

        for (const [next, capacity] of Object.entries(neighbours)){

            if (capacity > 0 && !reachable.has(next)){

                reachable.add(next)
                queue.push(next)
    
            }
        }
    }

    const cutEdges = [];

    for (const edge of originalGraph.edges){

        const sourceIsReachable = reachable.has(edge.source);
        const targetIsReachable = reachable.has(edge.target);

        if (sourceIsReachable && !targetIsReachable){
            cutEdges.push(edge);
        }
    }

    const totalCutCapacity = cutEdges.reduce(
        (sum, edge) => sum + edge.capacity,
        0
      );
      
      return {
        cutEdges,
        totalCutCapacity
      }
}