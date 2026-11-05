import { describe, it, expect } from 'vitest';

import { FlowNet, makeRandomNetwork } from './sampleNetwork';

describe('FlowNet', () => {
  describe('constructor', () => {
    it('should initialize with a source node', () => {
      const net = new FlowNet();
      expect(net.count()).toBe(1);
      expect(net.source).toBeDefined();
      expect(net.sink).toBeNull();
    });

    it('should create an empty adjacency map', () => {
      const net = new FlowNet();
      expect(net.edges(net.source)).toEqual([]);
    });
  });

  describe('count and edgeCount', () => {
    it('should return correct node count after adding nodes', () => {
      const net = new FlowNet();
      expect(net.count()).toBe(1);

      const node1 = net.add(net.source, 0, 10);
      expect(net.count()).toBe(2);

      const node2 = net.add(node1, 0, 5);
      expect(net.count()).toBe(3);
    });

    it('should return correct edge count', () => {
      const net = new FlowNet();
      expect(net.edgeCount()).toBe(0);

      net.add(net.source, 0, 10);
      expect(net.edgeCount()).toBe(1);

      net.add(net.source, 0, 8);
      expect(net.edgeCount()).toBe(2);
    });
  });

  describe('nodes and edges', () => {
    it('should return all node IDs', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);
      const node2 = net.add(net.source, 0, 5);

      const nodes = net.nodes();
      expect(nodes).toContain(net.source);
      expect(nodes).toContain(node1);
      expect(nodes).toContain(node2);
      expect(nodes.length).toBe(3);
    });

    it('should return outgoing edge targets of a node', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);
      const node2 = net.add(net.source, 0, 5);

      const edges = net.edges(net.source);
      expect(edges).toContain(node1);
      expect(edges).toContain(node2);
    });

    it('should return empty array for a node with no outgoing edges', () => {
      const net = new FlowNet();
      const leaf = net.add(net.source, 0, 10);
      expect(net.edges(leaf)).toEqual([]);
    });
  });

  describe('exists', () => {
    it('should return true for existing nodes', () => {
      const net = new FlowNet();
      expect(net.exists(net.source)).toBe(true);

      const node1 = net.add(net.source, 0, 10);
      expect(net.exists(node1)).toBe(true);
    });

    it('should return false for non-existent nodes', () => {
      const net = new FlowNet();
      expect(net.exists('nonexistent')).toBe(false);
    });
  });

  describe('setSink', () => {
    it('should set sink to valid node', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);

      expect(net.setSink(node1)).toBe(true);
      expect(net.sink).toBe(node1);
    });

    it('should fail to set sink to non-existent node', () => {
      const net = new FlowNet();
      expect(net.setSink('nonexistent')).toBe(false);
      expect(net.sink).toBeNull();
    });

    it('should allow changing sink', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);
      const node2 = net.add(net.source, 0, 5);

      net.setSink(node1);
      expect(net.sink).toBe(node1);

      net.setSink(node2);
      expect(net.sink).toBe(node2);
    });
  });

  describe('add', () => {
    it('should add single node with an edge from the target to the new node', () => {
      const net = new FlowNet();
      const newNode = net.add(net.source, 0, 10);

      expect(newNode).toBeDefined();
      expect(net.exists(newNode)).toBe(true);
      // Edges are stored target -> newNode
      expect(net.getConnectedNodes(net.source)).toContain(newNode);
      expect(net.getConnectedNodes(newNode)).toEqual([]);
    });

    it('should add node with incoming edges from multiple existing nodes', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);
      const node2 = net.add(net.source, 0, 5);

      const newNode = net.add([node1, node2], 0, 8);

      expect(newNode).toBeDefined();
      expect(net.getConnectedNodes(node1)).toContain(newNode);
      expect(net.getConnectedNodes(node2)).toContain(newNode);
    });

    it('should create one edge per target', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);
      const node2 = net.add(net.source, 0, 5);

      const before = net.edgeCount();
      net.add([node1, node2], 0, 8);
      expect(net.edgeCount()).toBe(before + 2);
    });

    it('should create edges with the given flow and capacity', () => {
      const net = new FlowNet();
      const newNode = net.add(net.source, 5, 10);

      const edge = net.getEdge(net.source, newNode);
      expect(edge.flow).toBe(5);
      expect(edge.capacity).toBe(10);
    });
  });

  describe('connect', () => {
    it('should connect two existing nodes', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);
      const node2 = net.add(net.source, 0, 5);

      const result = net.connect(node1, node2, 0, 8);
      expect(result).toBe(true);

      const edge = net.getEdge(node1, node2);
      expect(edge).toBeDefined();
      expect(edge.flow).toBe(0);
      expect(edge.capacity).toBe(8);
    });

    it('should connect multiple sources to multiple targets', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);
      const node2 = net.add(net.source, 0, 5);
      const node3 = net.add(net.source, 0, 8);
      const node4 = net.add(net.source, 0, 12);

      const result = net.connect([node1, node2], [node3, node4], 0, 6);
      expect(result).toBe(true);

      // Check all 4 connections were created
      expect(net.getEdge(node1, node3)).toBeDefined();
      expect(net.getEdge(node1, node4)).toBeDefined();
      expect(net.getEdge(node2, node3)).toBeDefined();
      expect(net.getEdge(node2, node4)).toBeDefined();
    });

    it('should return false if any source or target does not exist', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);

      const result = net.connect(node1, 'nonexistent', 0, 8);
      expect(result).toBe(false);
    });

    it('should not create self-loops', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);

      const result = net.connect(node1, node1, 0, 8);
      expect(result).toBe(false);
      expect(net.getEdge(node1, node1)).toBeUndefined();
    });

    it('should overwrite existing edge', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);

      net.connect(net.source, node1, 2, 10);
      net.connect(net.source, node1, 5, 15);

      const edge = net.getEdge(net.source, node1);
      expect(edge.flow).toBe(5);
      expect(edge.capacity).toBe(15);
    });
  });

  describe('getEdge', () => {
    it('should return edge data for valid node pair', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);

      const edge = net.getEdge(net.source, node1);
      expect(edge.flow).toBe(0);
      expect(edge.capacity).toBe(10);
    });

    it('should return undefined for non-existent edge', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);

      const edge = net.getEdge(node1, net.source);
      expect(edge).toBeUndefined();
    });
  });

  describe('getConnectedNodes', () => {
    it('should return connected nodes for existing node', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);
      const node2 = net.add(net.source, 0, 5);

      const connected = net.getConnectedNodes(net.source);
      expect(connected).toContain(node1);
      expect(connected).toContain(node2);
    });

    it('should return null for non-existent node', () => {
      const net = new FlowNet();
      expect(net.getConnectedNodes('nonexistent')).toBeNull();
    });
  });

  describe('positions', () => {
    it('should generate positions for given count', () => {
      const net = new FlowNet();
      net.add(net.source, 0, 10);
      net.add(net.source, 0, 5);

      const positions = net.positions(3);
      expect(positions.length).toBe(3);

      positions.forEach(pos => {
        expect(typeof pos.x).toBe('number');
        expect(typeof pos.y).toBe('number');
      });
    });

    it('should spread positions across grid', () => {
      const net = new FlowNet();
      const positions = net.positions(9);

      // With 9 nodes, we expect ~3 columns
      const xValues = positions.map(p => p.x);
      const yValues = positions.map(p => p.y);

      // Should have variety in both dimensions
      expect(new Set(xValues).size).toBeGreaterThan(1);
      expect(new Set(yValues).size).toBeGreaterThan(1);
    });

    it('should add random offset to positions', () => {
      const net = new FlowNet();
      const positions1 = net.positions(5);
      const positions2 = net.positions(5);

      // Positions should be different due to random offset
      const allDifferent = positions1.every((pos, i) =>
        pos.x !== positions2[i].x || pos.y !== positions2[i].y
      );
      expect(allDifferent).toBe(true);
    });
  });

  describe('cytoscape', () => {
    it('should return proper cytoscape format', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 0, 10);
      net.setSink(node1);

      const result = net.cytoscape();

      expect(result.source).toBe(net.source);
      expect(result.sink).toBe(node1);
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
    });

    it('should include position data in nodes', () => {
      const net = new FlowNet();
      net.add(net.source, 0, 10);

      const result = net.cytoscape();

      result.nodes.forEach(node => {
        expect(node.id).toBeDefined();
        expect(node.label).toBeDefined();
        expect(typeof node.x).toBe('number');
        expect(typeof node.y).toBe('number');
      });
    });

    it('should include flow and capacity in edges', () => {
      const net = new FlowNet();
      const node1 = net.add(net.source, 3, 10);

      const result = net.cytoscape();

      result.edges.forEach(edge => {
        expect(edge.id).toBeDefined();
        expect(edge.source).toBeDefined();
        expect(edge.target).toBeDefined();
        expect(edge.flow).toBe(3);
        expect(edge.capacity).toBe(10);
      });
    });

    it('should handle empty network with just source', () => {
      const net = new FlowNet();

      const result = net.cytoscape();

      expect(result.nodes).toHaveLength(1);
      expect(result.edges).toHaveLength(0);
      expect(result.source).toBe(net.source);
      expect(result.sink).toBeNull();
    });
  });
});

describe('makeRandomNetwork', () => {
  it('should create network with correct node count', () => {
    const net = makeRandomNetwork(5, 0.3, 1, 10);
    const data = net.cytoscape();

    expect(data.nodes.length).toBe(5);
  });

  it('should create network with varying densities', () => {
    const lowDensity = makeRandomNetwork(10, 0.1, 1, 10);
    const highDensity = makeRandomNetwork(10, 0.5, 1, 10);

    const lowData = lowDensity.cytoscape();
    const highData = highDensity.cytoscape();

    expect(highData.edges.length).toBeGreaterThanOrEqual(lowData.edges.length);
  });

  it('should respect capacity bounds', () => {
    const net = makeRandomNetwork(5, 0.3, 5, 10);
    const data = net.cytoscape();

    data.edges.forEach(edge => {
      expect(edge.capacity).toBeGreaterThanOrEqual(5);
      expect(edge.capacity).toBeLessThanOrEqual(10);
    });
  });

  it('should always set a sink node', () => {
    const net = makeRandomNetwork(5, 0.3, 1, 10);
    expect(net.sink).toBeDefined();
  });

  it('should throw error for invalid node count', () => {
    expect(() => makeRandomNetwork(1, 0.3, 1, 10)).toThrow('minimum node count is 2');
  });

  it('should use provided RNG for reproducibility', () => {
    let counter = 0;
    const deterministicRng = () => {
      counter++;
      return counter / 100;
    };

    const net1 = makeRandomNetwork(5, 0.3, 1, 10, deterministicRng);
    counter = 0;
    const net2 = makeRandomNetwork(5, 0.3, 1, 10, deterministicRng);

    const data1 = net1.cytoscape();
    const data2 = net2.cytoscape();

    // Same structure should be generated
    expect(data1.nodes.length).toBe(data2.nodes.length);
    expect(data1.edges.length).toBe(data2.edges.length);
  });

  it('should create valid network structure', () => {
    const net = makeRandomNetwork(8, 0.25, 1, 20);
    const data = net.cytoscape();

    // All nodes should have unique IDs
    const nodeIds = data.nodes.map(n => n.id);
    expect(new Set(nodeIds).size).toBe(nodeIds.length);

    // All edges should reference valid nodes
    data.edges.forEach(edge => {
      expect(nodeIds).toContain(edge.source);
      expect(nodeIds).toContain(edge.target);
    });
  });
});

describe('Edge cases and error handling', () => {
  it('should handle large networks', () => {
    const net = makeRandomNetwork(50, 0.2, 1, 100);
    expect(net.count()).toBe(50);
    expect(net.edgeCount()).toBeGreaterThan(0);
  });

  it('should handle dense networks', () => {
    const net = makeRandomNetwork(10, 0.8, 1, 10);
    const data = net.cytoscape();

    // Dense network should have many edges
    const maxPossibleEdges = 10 * 9; // Complete graph
    expect(data.edges.length).toBeLessThanOrEqual(maxPossibleEdges);
  });

  it('should maintain data integrity after multiple operations', () => {
    const net = new FlowNet();

    // Perform multiple operations
    const n1 = net.add(net.source, 0, 10);
    const n2 = net.add(net.source, 0, 8);
    const n3 = net.add([n1, n2], 0, 12);

    net.connect(n1, n2, 2, 5);
    net.setSink(n3);

    // Verify all operations persisted correctly
    expect(net.count()).toBe(4);
    expect(net.edgeCount()).toBeGreaterThanOrEqual(3);
    expect(net.sink).toBe(n3);
    expect(net.exists(n1)).toBe(true);
    expect(net.exists(n2)).toBe(true);
    expect(net.exists(n3)).toBe(true);
  });
});