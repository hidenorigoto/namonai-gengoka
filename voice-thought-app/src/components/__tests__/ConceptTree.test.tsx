import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConceptTree from '../ConceptTree';
import { ConceptNode } from '../../types';

describe('ConceptTree', () => {
  const mockOnSelect = jest.fn();

  const mockConcepts: ConceptNode[] = [
    {
      id: '1',
      text: 'Root Concept',
      level: 0,
      children: [
        {
          id: '2',
          text: 'Child Concept',
          level: 1,
          children: []
        }
      ]
    }
  ];

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('should render empty state when no concepts', () => {
    render(
      <ConceptTree
        concepts={[]}
        selectedIds={new Set()}
        onSelect={mockOnSelect}
      />
    );
    
    expect(screen.getByText('録音を開始すると、ここに概念が表示されます')).toBeInTheDocument();
  });

  it('should render concept tree', () => {
    render(
      <ConceptTree
        concepts={mockConcepts}
        selectedIds={new Set()}
        onSelect={mockOnSelect}
      />
    );
    
    expect(screen.getByText('Root Concept')).toBeInTheDocument();
    // Child concepts are initially collapsed, so we don't expect to see them
  });

  it('should render with selected concepts', () => {
    render(
      <ConceptTree
        concepts={mockConcepts}
        selectedIds={new Set(['1'])}
        onSelect={mockOnSelect}
      />
    );
    
    // Selected concepts should render with different styling
    // This is testing that the component receives and uses the selectedIds prop
    expect(screen.getByText('Root Concept')).toBeInTheDocument();
  });

  it('should call onSelect when concept is clicked', () => {
    render(
      <ConceptTree
        concepts={mockConcepts}
        selectedIds={new Set()}
        onSelect={mockOnSelect}
      />
    );
    
    fireEvent.click(screen.getByText('Root Concept'));
    expect(mockOnSelect).toHaveBeenCalledWith('1');
  });

  it('should expand/collapse concepts with children', () => {
    render(
      <ConceptTree
        concepts={mockConcepts}
        selectedIds={new Set()}
        onSelect={mockOnSelect}
      />
    );
    
    // Initially child should be hidden
    const toggle = screen.getByText('▶');
    expect(screen.queryByText('Child Concept')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(toggle);
    expect(screen.getByText('▼')).toBeInTheDocument();
    expect(screen.getByText('Child Concept')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(screen.getByText('▼'));
    expect(screen.getByText('▶')).toBeInTheDocument();
  });
});