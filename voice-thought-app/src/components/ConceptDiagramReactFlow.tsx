import React, { useCallback, useEffect } from 'react';
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
  BaseEdge
} from 'reactflow';
import dagre from '@dagrejs/dagre';
import { ConceptNode } from '../types';

import 'reactflow/dist/style.css';

interface ConceptDiagramReactFlowProps {
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

// Dagreレイアウトアルゴリズム
const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = 'TB'
): { nodes: Node[]; edges: Edge[] } => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 150, height: 50 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: (isHorizontal ? Position.Left : Position.Top) as Position,
      sourcePosition: (isHorizontal ? Position.Right : Position.Bottom) as Position,
      position: {
        x: nodeWithPosition.x - 75,
        y: nodeWithPosition.y - 25
      }
    };
  });

  return { nodes: newNodes, edges };
};

const ConceptDiagramReactFlow: React.FC<ConceptDiagramReactFlowProps> = ({
  concepts,
  selectedIds,
  onSelect
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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
        position: { x: 0, y: 0 }
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

  // 概念が更新されたらレイアウトを再計算
  useEffect(() => {
    const { nodes: flowNodes, edges: flowEdges } = convertToFlowElements(concepts);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      flowNodes,
      flowEdges,
      'TB'
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [concepts, convertToFlowElements, setNodes, setEdges]);

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
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
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

export default ConceptDiagramReactFlow;