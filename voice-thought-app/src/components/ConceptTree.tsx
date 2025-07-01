import React, { useState, useEffect } from 'react';
import { ConceptNode } from '../types';

interface ConceptTreeProps {
  concepts: ConceptNode[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
}

const ConceptTree: React.FC<ConceptTreeProps> = ({ concepts, selectedIds, onSelect }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 概念が更新されたら全て展開する
  useEffect(() => {
    const getAllIds = (nodes: ConceptNode[]): string[] => {
      const ids: string[] = [];
      nodes.forEach(node => {
        ids.push(node.id);
        if (node.children && node.children.length > 0) {
          ids.push(...getAllIds(node.children));
        }
      });
      return ids;
    };

    if (concepts.length > 0) {
      const allIds = getAllIds(concepts);
      setExpandedIds(new Set(allIds));
    }
  }, [concepts]);

  const toggleExpand = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderConcept = (concept: ConceptNode, depth: number = 0): React.ReactElement => {
    const isSelected = selectedIds.has(concept.id);
    const isExpanded = expandedIds.has(concept.id);
    const hasChildren = concept.children && concept.children.length > 0;
    const indent = depth * 20;

    return (
      <div key={concept.id} className="concept-item">
        <div
          className={`concept-node ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => onSelect(concept.id)}
        >
          {hasChildren && (
            <span
              className="toggle"
              onClick={(e) => toggleExpand(concept.id, e)}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          <span className="concept-text">{concept.text}</span>
          {concept.metadata && (
            <span className="concept-metadata">
              ({concept.metadata.mentions}回)
            </span>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="concept-children">
            {concept.children.map(child => renderConcept(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="concept-tree">
      {concepts.length === 0 ? (
        <div className="empty-state">
          <p>録音を開始すると、ここに概念が表示されます</p>
        </div>
      ) : (
        concepts.map(concept => renderConcept(concept))
      )}
    </div>
  );
};

export default ConceptTree;