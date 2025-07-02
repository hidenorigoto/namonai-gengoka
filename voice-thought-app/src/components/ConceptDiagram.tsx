import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ConceptNode } from '../types';
import { calculateRadialLayout, isNodeAtPosition, LayoutNode } from '../utils/radialLayout';
import { clearCanvas, drawConnection, drawNode, drawCenterIndicator } from '../utils/canvasHelpers';

interface ConceptDiagramProps {
  concepts: ConceptNode[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
}

const ConceptDiagram: React.FC<ConceptDiagramProps> = ({ concepts, selectedIds, onSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | undefined>();
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // レイアウトオプション
  const layoutOptions = {
    centerX: canvasSize.width / 2,
    centerY: canvasSize.height / 2,
    innerRadius: 60,
    radiusIncrement: 100,
    nodeRadius: 40
  };

  // 描画オプション
  const drawOptions = {
    nodeRadius: 40,
    fontSize: 14,
    selectedIds,
    hoveredId: hoveredNodeId
  };

  // キャンバスのリサイズ処理
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // レイアウトの計算
  useEffect(() => {
    if (concepts.length === 0) {
      setLayoutNodes([]);
      return;
    }

    const nodes = calculateRadialLayout(concepts, {
      ...layoutOptions,
      centerX: canvasSize.width / 2,
      centerY: canvasSize.height / 2
    });
    setLayoutNodes(nodes);
  }, [concepts, canvasSize]);

  // 描画処理
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスをクリア
    clearCanvas(ctx, canvasSize.width, canvasSize.height);

    if (layoutNodes.length === 0) {
      // 空の状態を表示
      ctx.fillStyle = '#999';
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        '録音を開始すると、ここに概念が表示されます',
        canvasSize.width / 2,
        canvasSize.height / 2
      );
      return;
    }

    // 中心インジケータを描画
    drawCenterIndicator(ctx, canvasSize.width / 2, canvasSize.height / 2);

    // 接続線を描画
    layoutNodes.forEach(node => {
      if (node.parent) {
        drawConnection(ctx, node.parent, node);
      }
    });

    // ノードを描画
    layoutNodes.forEach(node => {
      drawNode(ctx, node, drawOptions);
    });
  }, [layoutNodes, selectedIds, hoveredNodeId, canvasSize]);

  // マウスクリックハンドラ
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // クリックされたノードを探す
    for (const node of layoutNodes) {
      if (isNodeAtPosition(node, x, y, drawOptions.nodeRadius)) {
        onSelect(node.id);
        break;
      }
    }
  }, [layoutNodes, onSelect, drawOptions.nodeRadius]);

  // マウス移動ハンドラ
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // ホバーされたノードを探す
    let hoveredId: string | undefined;
    for (const node of layoutNodes) {
      if (isNodeAtPosition(node, x, y, drawOptions.nodeRadius)) {
        hoveredId = node.id;
        break;
      }
    }

    if (hoveredId !== hoveredNodeId) {
      setHoveredNodeId(hoveredId);
      canvas.style.cursor = hoveredId ? 'pointer' : 'default';
    }
  }, [layoutNodes, hoveredNodeId, drawOptions.nodeRadius]);

  // マウスが離れた時のハンドラ
  const handleMouseLeave = useCallback(() => {
    setHoveredNodeId(undefined);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  }, []);

  return (
    <div ref={containerRef} className="concept-diagram">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

export default ConceptDiagram;