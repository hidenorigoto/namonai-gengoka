export interface ConceptRelation {
  targetId: string;
  label: string;
}

export interface ConceptNode {
  id: string;
  text: string;
  level: number;
  children: ConceptNode[];
  relations?: ConceptRelation[];
  metadata?: {
    createdAt: Date;
    mentions: number;
  };
}

export interface AppState {
  isRecording: boolean;
  transcribedText: string;
  concepts: ConceptNode[];
  selectedConceptIds: Set<string>;
  isProcessing: boolean;
  apiKey: string | null;
  questions: string[];
}

export interface ParsedConcept {
  text: string;
  level: number;
  id: string;
  relationLabel?: string;
}