import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  EdgeLabelRenderer,
  getBezierPath,
  BaseEdge,
  NodeChange,
  applyNodeChanges
} from 'reactflow';
import * as d3 from 'd3-force';
import { ConceptNode } from '../types';

import 'reactflow/dist/style.css';

interface ConceptDiagramForceLayoutProps {
  concepts: ConceptNode[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
}

// カスタムノードコンポーネント
const CustomNode = ({ data, selected }: { data: any; selected: boolean }) => {
  return (
    <div 
      className={`custom-node ${selected ? 'selected' : ''}`}
      style={{
        padding: '10px 20px',
        borderRadius: '20px',
        backgroundColor: selected ? '#2196f3' : '#ffffff',
        border: `2px solid ${selected ? '#1976d2' : '#ccc'}`,
        color: selected ? '#ffffff' : '#333',
        fontSize: '14px',
        minWidth: '100px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      <div>{data.label}</div>
      {data.mentions > 1 && (
        <div style={{ 
          fontSize: '11px', 
          marginTop: '4px',
          opacity: 0.8
        }}>
          ({data.mentions}回)
        </div>
      )}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

// カスタムエッジコンポーネント（関係性ラベル付き）
const CustomEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerEnd
}: any) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              border: '1px solid #ddd',
              pointerEvents: 'all',
              cursor: 'default'
            }}
            className="nodrag nopan"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const nodeTypes = {
  concept: CustomNode
};

const edgeTypes = {
  relation: CustomEdge
};

// Force-directed layout using d3-force
const getForceLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  width: number,
  height: number
): { nodes: Node[]; edges: Edge[] } => {
  const simulationNodes = nodes.map(n => ({ ...n, x: n.position.x, y: n.position.y }));
  const simulationLinks = edges.map(e => ({
    source: e.source,
    target: e.target
  }));

  // Create force simulation
  const simulation = d3.forceSimulation(simulationNodes as any)
    .force('link', d3.forceLink(simulationLinks)
      .id((d: any) => d.id)
      .distance(150)
      .strength(0.5))
    .force('charge', d3.forceManyBody()
      .strength(-300)
      .distanceMax(400))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(80))
    .stop();

  // Run simulation
  simulation.tick(300);

  // Update node positions
  const layoutedNodes = nodes.map((node, index) => {
    const simNode = simulationNodes[index] as any;
    return {
      ...node,
      position: {
        x: simNode.x - 75, // Center the node
        y: simNode.y - 25
      }
    };
  });

  return { nodes: layoutedNodes, edges };
};

const ConceptDiagramForceLayout: React.FC<ConceptDiagramForceLayoutProps> = ({
  concepts,
  selectedIds,
  onSelect
}) => {
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle node changes with dragging support
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  // ConceptNodeからReact Flow用のデータに変換
  const convertToFlowElements = useCallback((conceptNodes: ConceptNode[]) => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    const processedNodes = new Set<string>();

    const processNode = (node: ConceptNode, parentId?: string) => {
      if (processedNodes.has(node.id)) return;
      processedNodes.add(node.id);

      // ノードを追加
      flowNodes.push({
        id: node.id,
        type: 'concept',
        data: { 
          label: node.text,
          mentions: node.metadata?.mentions || 1
        },
        position: { x: Math.random() * 600, y: Math.random() * 400 }
      });

      // 親子関係のエッジを追加
      if (parentId) {
        const relationLabel = node.relations?.find(r => r.targetId === node.id)?.label;
        flowEdges.push({
          id: `${parentId}-${node.id}`,
          source: parentId,
          target: node.id,
          type: 'relation',
          data: { label: relationLabel }
        });
      }

      // 追加の関係性エッジ
      if (node.relations) {
        node.relations.forEach(relation => {
          if (relation.targetId !== node.id) {
            flowEdges.push({
              id: `${node.id}-${relation.targetId}-rel`,
              source: node.id,
              target: relation.targetId,
              type: 'relation',
              data: { label: relation.label },
              style: { stroke: '#999', strokeDasharray: '5 5' }
            });
          }
        });
      }

      // 子ノードを処理
      if (node.children) {
        node.children.forEach(child => processNode(child, node.id));
      }
    };

    conceptNodes.forEach(node => processNode(node));
    return { nodes: flowNodes, edges: flowEdges };
  }, []);

  // Get container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 概念が更新されたらレイアウトを再計算
  useEffect(() => {
    const { nodes: flowNodes, edges: flowEdges } = convertToFlowElements(concepts);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getForceLayoutedElements(
      flowNodes,
      flowEdges,
      dimensions.width,
      dimensions.height
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [concepts, convertToFlowElements, setNodes, setEdges, dimensions]);

  // 選択状態の更新
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: selectedIds.has(node.id)
      }))
    );
  }, [selectedIds, setNodes]);

  // ノードクリックハンドラ
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      onSelect(node.id);
    },
    [onSelect]
  );

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap 
          nodeColor={(node) => 
            node.selected ? '#2196f3' : '#ffffff'
          }
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
};

export default ConceptDiagramForceLayout;