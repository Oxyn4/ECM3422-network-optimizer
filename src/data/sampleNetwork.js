// hard-coded sample flow networ, max flow from s to t is 23.
export const sampleNetwork = {
  source: 's',
  sink: 't',
  nodes: [
    { id: 's', label: 's', x: 0, y: 150 },
    { id: 'v1', label: 'v1', x: 200, y: 0 },
    { id: 'v2', label: 'v2', x: 200, y: 300 },
    { id: 'v3', label: 'v3', x: 400, y: 0 },
    { id: 'v4', label: 'v4', x: 400, y: 300 },
    { id: 't', label: 't', x: 600, y: 150 },
  ],
  edges: [
    { id: 's-v1', source: 's', target: 'v1', capacity: 16 },
    { id: 's-v2', source: 's', target: 'v2', capacity: 13 },
    { id: 'v2-v1', source: 'v2', target: 'v1', capacity: 4 },
    { id: 'v1-v3', source: 'v1', target: 'v3', capacity: 12 },
    { id: 'v3-v2', source: 'v3', target: 'v2', capacity: 9 },
    { id: 'v2-v4', source: 'v2', target: 'v4', capacity: 14 },
    { id: 'v4-v3', source: 'v4', target: 'v3', capacity: 7 },
    { id: 'v3-t', source: 'v3', target: 't', capacity: 20 },
    { id: 'v4-t', source: 'v4', target: 't', capacity: 4 },
  ],
}

