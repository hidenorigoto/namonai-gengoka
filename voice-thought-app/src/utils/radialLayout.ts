import { ConceptNode } from '../types';

export interface LayoutNode {
  id: string;
  text: string;
  x: number;
  y: number;
  radius: number;
  angle: number;
  depth: number;
  parent?: LayoutNode;
  children: LayoutNode[];
  originalNode: ConceptNode;
}

export interface RadialLayoutOptions {
  centerX: number;
  centerY: number;
  innerRadius: number;
  radiusIncrement: number;
  nodeRadius: number;
}

/**
 * 放射状レイアウトを計算する
 */
export function calculateRadialLayout(
  roots: ConceptNode[],
  options: RadialLayoutOptions
): LayoutNode[] {
  const { centerX, centerY, innerRadius, radiusIncrement } = options;
  const layoutNodes: LayoutNode[] = [];

  // 階層ごとのノードを収集
  const nodesByDepth: Map<number, LayoutNode[]> = new Map();
  
  // ルートノードは中心に配置
  if (roots.length === 1) {
    // 単一ルートの場合は中心に配置
    const rootLayout = createLayoutNode(roots[0], centerX, centerY, 0, 0, 0);
    layoutNodes.push(rootLayout);
    processChildren(rootLayout, roots[0], 1, nodesByDepth, layoutNodes);
  } else {
    // 複数ルートの場合は第1階層として配置
    roots.forEach((root, index) => {
      const angle = (index / roots.length) * 2 * Math.PI;
      const x = centerX + innerRadius * Math.cos(angle);
      const y = centerY + innerRadius * Math.sin(angle);
      const rootLayout = createLayoutNode(root, x, y, innerRadius, angle, 1);
      layoutNodes.push(rootLayout);
      processChildren(rootLayout, root, 2, nodesByDepth, layoutNodes);
    });
  }

  // 各階層のノードを放射状に配置
  nodesByDepth.forEach((nodes, depth) => {
    const radius = innerRadius + (depth - 1) * radiusIncrement;
    
    // 親ノードごとにグループ化
    const nodesByParent = new Map<string, LayoutNode[]>();
    nodes.forEach(node => {
      const parentId = node.parent?.id || 'root';
      if (!nodesByParent.has(parentId)) {
        nodesByParent.set(parentId, []);
      }
      nodesByParent.get(parentId)!.push(node);
    });

    // 各親ノードの子ノードを配置
    nodesByParent.forEach((children, parentId) => {
      const parent = layoutNodes.find(n => n.id === parentId);
      if (!parent) return;

      const parentAngle = parent.angle;
      const angleSpread = Math.PI / 3; // 60度の範囲に子ノードを配置
      const startAngle = parentAngle - angleSpread / 2;

      children.forEach((child, index) => {
        const angle = children.length === 1
          ? parentAngle
          : startAngle + (index / (children.length - 1)) * angleSpread;
        
        child.x = centerX + radius * Math.cos(angle);
        child.y = centerY + radius * Math.sin(angle);
        child.radius = radius;
        child.angle = angle;
      });
    });
  });

  return layoutNodes;
}

function createLayoutNode(
  node: ConceptNode,
  x: number,
  y: number,
  radius: number,
  angle: number,
  depth: number,
  parent?: LayoutNode
): LayoutNode {
  return {
    id: node.id,
    text: node.text,
    x,
    y,
    radius,
    angle,
    depth,
    parent,
    children: [],
    originalNode: node
  };
}

function processChildren(
  parentLayout: LayoutNode,
  parentNode: ConceptNode,
  depth: number,
  nodesByDepth: Map<number, LayoutNode[]>,
  layoutNodes: LayoutNode[]
) {
  if (!parentNode.children || parentNode.children.length === 0) return;

  if (!nodesByDepth.has(depth)) {
    nodesByDepth.set(depth, []);
  }

  parentNode.children.forEach(child => {
    const childLayout = createLayoutNode(child, 0, 0, 0, 0, depth, parentLayout);
    parentLayout.children.push(childLayout);
    layoutNodes.push(childLayout);
    nodesByDepth.get(depth)!.push(childLayout);
    
    // 再帰的に子ノードを処理
    processChildren(childLayout, child, depth + 1, nodesByDepth, layoutNodes);
  });
}

/**
 * ノードが指定された座標にあるかチェック
 */
export function isNodeAtPosition(
  node: LayoutNode,
  x: number,
  y: number,
  nodeRadius: number
): boolean {
  const dx = node.x - x;
  const dy = node.y - y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= nodeRadius;
}

/**
 * 2つのノード間のベジェ曲線の制御点を計算
 */
export function calculateBezierControlPoints(
  parent: LayoutNode,
  child: LayoutNode
): { cp1x: number; cp1y: number; cp2x: number; cp2y: number } {
  const dx = child.x - parent.x;
  const dy = child.y - parent.y;
  
  // 制御点は親と子の中間点付近に配置
  const midX = (parent.x + child.x) / 2;
  const midY = (parent.y + child.y) / 2;
  
  // 曲線の曲がり具合を調整
  const curvature = 0.2;
  const offsetX = -dy * curvature;
  const offsetY = dx * curvature;
  
  return {
    cp1x: midX + offsetX,
    cp1y: midY + offsetY,
    cp2x: midX + offsetX,
    cp2y: midY + offsetY
  };
}