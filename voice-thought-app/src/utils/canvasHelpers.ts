import { LayoutNode } from './radialLayout';

export interface DrawOptions {
  nodeRadius: number;
  fontSize: number;
  selectedIds: Set<string>;
  hoveredId?: string;
}

/**
 * キャンバスをクリアして背景を描画
 */
export function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, width, height);
}

/**
 * ノード間の接続線を描画
 */
export function drawConnection(
  ctx: CanvasRenderingContext2D,
  parent: LayoutNode,
  child: LayoutNode
) {
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(parent.x, parent.y);
  
  // ベジェ曲線で滑らかな接続
  const cp1x = parent.x + (child.x - parent.x) * 0.5;
  const cp1y = parent.y;
  const cp2x = parent.x + (child.x - parent.x) * 0.5;
  const cp2y = child.y;
  
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, child.x, child.y);
  ctx.stroke();
}

/**
 * ノードを描画
 */
export function drawNode(
  ctx: CanvasRenderingContext2D,
  node: LayoutNode,
  options: DrawOptions
) {
  const { nodeRadius, fontSize, selectedIds, hoveredId } = options;
  const isSelected = selectedIds.has(node.id);
  const isHovered = node.id === hoveredId;
  
  // ノードの円を描画
  ctx.beginPath();
  ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
  
  // 背景色
  if (isSelected) {
    ctx.fillStyle = '#2196f3';
  } else if (isHovered) {
    ctx.fillStyle = '#e3f2fd';
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fill();
  
  // ボーダー
  ctx.strokeStyle = isSelected ? '#1976d2' : '#ccc';
  ctx.lineWidth = isSelected ? 3 : 2;
  ctx.stroke();
  
  // テキストを描画
  ctx.fillStyle = isSelected ? '#ffffff' : '#333333';
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // テキストを複数行に分割
  const maxWidth = nodeRadius * 1.8;
  const lines = wrapText(ctx, node.text, maxWidth);
  const lineHeight = fontSize * 1.2;
  const totalHeight = lines.length * lineHeight;
  const startY = node.y - totalHeight / 2 + lineHeight / 2;
  
  lines.forEach((line, index) => {
    ctx.fillText(line, node.x, startY + index * lineHeight);
  });
  
  // メタデータ（言及回数）を表示
  if (node.originalNode.metadata?.mentions && node.originalNode.metadata.mentions > 1) {
    ctx.fillStyle = isSelected ? '#ffffff' : '#666';
    ctx.font = `${fontSize * 0.8}px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif`;
    ctx.fillText(
      `(${node.originalNode.metadata.mentions}回)`,
      node.x,
      node.y + nodeRadius - fontSize * 0.5
    );
  }
}

/**
 * テキストを指定幅で折り返し
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const char of words) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

/**
 * 中心インジケータを描画
 */
export function drawCenterIndicator(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number
) {
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  
  // 十字線
  ctx.beginPath();
  ctx.moveTo(centerX - 20, centerY);
  ctx.lineTo(centerX + 20, centerY);
  ctx.moveTo(centerX, centerY - 20);
  ctx.lineTo(centerX, centerY + 20);
  ctx.stroke();
  
  ctx.setLineDash([]);
}