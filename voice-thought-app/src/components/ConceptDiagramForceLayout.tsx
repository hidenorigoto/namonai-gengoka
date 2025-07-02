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
      {/* 複数のハンドルポジションを用意して動的に選択 */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
};

// ノード間の最適な接続位置を計算する関数
const getOptimalConnectionPoints = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  nodeWidth = 140,
  nodeHeight = 60
) => {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) return { sourceX, sourceY, targetX, targetY };
  
  // 正規化された方向ベクトル
  const dirX = dx / distance;
  const dirY = dy / distance;
  
  // 楕円形のノード境界を考慮した接続点計算
  const sourceRadiusX = nodeWidth / 2;
  const sourceRadiusY = nodeHeight / 2;
  const targetRadiusX = nodeWidth / 2;
  const targetRadiusY = nodeHeight / 2;
  
  // 楕円との交点を計算
  const sourceDistanceToEdge = Math.sqrt(
    (sourceRadiusX * sourceRadiusY) / 
    (sourceRadiusY * sourceRadiusY * dirX * dirX + sourceRadiusX * sourceRadiusX * dirY * dirY)
  );
  
  const targetDistanceToEdge = Math.sqrt(
    (targetRadiusX * targetRadiusY) / 
    (targetRadiusY * targetRadiusY * dirX * dirX + targetRadiusX * targetRadiusX * dirY * dirY)
  );
  
  // 接続点を計算
  const newSourceX = sourceX + dirX * sourceDistanceToEdge;
  const newSourceY = sourceY + dirY * sourceDistanceToEdge;
  const newTargetX = targetX - dirX * targetDistanceToEdge;
  const newTargetY = targetY - dirY * targetDistanceToEdge;
  
  return {
    sourceX: newSourceX,
    sourceY: newSourceY,
    targetX: newTargetX,
    targetY: newTargetY
  };
};

// カスタムエッジコンポーネント（動的接続位置付き）
const CustomEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style = {}
}: any) => {
  // 最適な接続点を計算
  const {
    sourceX: optimalSourceX,
    sourceY: optimalSourceY,
    targetX: optimalTargetX,
    targetY: optimalTargetY
  } = getOptimalConnectionPoints(sourceX, sourceY, targetX, targetY);
  
  // 滑らかな曲線パスを作成（ベジェ曲線）
  const dx = optimalTargetX - optimalSourceX;
  const dy = optimalTargetY - optimalSourceY;
  
  // 制御点を計算（線の方向に垂直な方向にオフセット）
  const controlX1 = optimalSourceX + dx * 0.25 + dy * 0.1;
  const controlY1 = optimalSourceY + dy * 0.25 - dx * 0.1;
  const controlX2 = optimalTargetX - dx * 0.25 + dy * 0.1;
  const controlY2 = optimalTargetY - dy * 0.25 - dx * 0.1;
  
  const edgePath = `M ${optimalSourceX},${optimalSourceY} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${optimalTargetX},${optimalTargetY}`;
  
  // ラベルの位置を中央に設定
  const labelX = (optimalSourceX + optimalTargetX) / 2;
  const labelY = (optimalSourceY + optimalTargetY) / 2;

  return (
    <>
      <path
        d={edgePath}
        style={{
          stroke: style.stroke || '#999',
          strokeWidth: style.strokeWidth || 2,
          strokeDasharray: style.strokeDasharray,
          fill: 'none'
        }}
        markerEnd="url(#arrowclosed)"
      />
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
              cursor: 'default',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
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
        position: { x: Math.random() * 600, y: Math.random() * 400 },
        // 動的ハンドル位置のためにsourcePosition/targetPositionを削除
        sourcePosition: undefined,
        targetPosition: undefined
      });

      // 親子関係のエッジを追加
      if (parentId) {
        const relationLabel = node.relations?.find(r => r.targetId === node.id)?.label;
        flowEdges.push({
          id: `${parentId}-${node.id}`,
          source: parentId,
          target: node.id,
          type: 'relation',
          data: { label: relationLabel },
          markerEnd: 'arrowclosed'
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
              style: { stroke: '#999', strokeDasharray: '5 5' },
              markerEnd: 'arrowclosed'
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
        defaultEdgeOptions={{
          markerEnd: {
            type: 'arrowclosed',
            width: 12,
            height: 12,
            color: '#999'
          }
        }}
      >
        <defs>
          <marker
            id="arrowclosed"
            markerWidth="12"
            markerHeight="12"
            refX="6"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#999"/>
          </marker>
        </defs>
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