import React, { useState, useCallback, useEffect, useRef } from 'react';
import VoiceInput from './components/VoiceInput';
import ConceptTree from './components/ConceptTree';
import ConceptDetail from './components/ConceptDetail';
import ApiKeyModal from './components/ApiKeyModal';
import { openAIService } from './services/openaiService';
import { ApiKeyManager } from './services/apiKeyManager';
import { ConceptNode, ParsedConcept } from './types';
import './App.css';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [concepts, setConcepts] = useState<ConceptNode[]>([]);
  const [selectedConceptIds, setSelectedConceptIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(ApiKeyManager.get());
  const [questions, setQuestions] = useState<string[]>([]);
  
  const processTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedTextRef = useRef<string>('');

  useEffect(() => {
    if (apiKey) {
      openAIService.initialize(apiKey);
    }
  }, [apiKey]);

  const buildConceptTree = (parsedConcepts: ParsedConcept[]): ConceptNode[] => {
    const nodes: ConceptNode[] = [];
    const nodeStack: ConceptNode[] = [];

    parsedConcepts.forEach(parsed => {
      const node: ConceptNode = {
        id: parsed.id,
        text: parsed.text,
        level: parsed.level,
        children: [],
        metadata: {
          createdAt: new Date(),
          mentions: 1
        }
      };

      while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].level >= parsed.level) {
        nodeStack.pop();
      }

      if (nodeStack.length === 0) {
        nodes.push(node);
      } else {
        nodeStack[nodeStack.length - 1].children.push(node);
      }

      nodeStack.push(node);
    });

    return nodes;
  };

  const processWithAI = useCallback(async () => {
    if (!transcribedText || transcribedText === lastProcessedTextRef.current) return;
    if (!openAIService.isInitialized()) return;

    setIsProcessing(true);
    try {
      const parsedConcepts = await openAIService.extractConcepts(transcribedText);
      const tree = buildConceptTree(parsedConcepts);
      setConcepts(tree);
      lastProcessedTextRef.current = transcribedText;
    } catch (error) {
      console.error('AI processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [transcribedText]);

  const scheduleProcessing = useCallback(() => {
    if (processTimeoutRef.current) {
      clearTimeout(processTimeoutRef.current);
    }
    processTimeoutRef.current = setTimeout(processWithAI, 10000);
  }, [processWithAI]);

  const handleTranscription = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setTranscribedText(prev => prev + ' ' + text);
      scheduleProcessing();
    }
  }, [scheduleProcessing]);

  const findConceptById = useCallback((nodes: ConceptNode[], id: string): ConceptNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findConceptById(node.children, id);
      if (found) return found;
    }
    return null;
  }, []);

  const handleConceptSelect = useCallback(async (conceptId: string) => {
    const newSelected = new Set(selectedConceptIds);
    
    if (newSelected.has(conceptId)) {
      newSelected.delete(conceptId);
      if (newSelected.size === 0) {
        setQuestions([]);
      }
    } else {
      newSelected.add(conceptId);
      
      const concept = findConceptById(concepts, conceptId);
      if (concept && openAIService.isInitialized()) {
        try {
          const generatedQuestions = await openAIService.generateQuestions(concept.text);
          setQuestions(generatedQuestions);
        } catch (error) {
          console.error('Question generation failed:', error);
        }
      }
    }
    
    setSelectedConceptIds(newSelected);
  }, [concepts, selectedConceptIds, findConceptById]);

  const getSelectedConcepts = (): ConceptNode[] => {
    const selected: ConceptNode[] = [];
    selectedConceptIds.forEach(id => {
      const concept = findConceptById(concepts, id);
      if (concept) selected.push(concept);
    });
    return selected;
  };

  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const handleApiKeySave = (key: string) => {
    ApiKeyManager.save(key);
    setApiKey(key);
    openAIService.initialize(key);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>音声思考支援アプリ</h1>
        <div className="header-controls">
          <div className="status">
            {isRecording ? '🔴 録音中...' : '⏸️ 停止中'}
            {isProcessing && ' | 🤖 AI処理中...'}
          </div>
          {apiKey && (
            <button
              className="settings-button"
              onClick={() => setApiKey(null)}
            >
              ⚙️ 設定
            </button>
          )}
        </div>
      </header>
      
      <main className="app-main">
        <div className="concept-tree-panel">
          <ConceptTree
            concepts={concepts}
            selectedIds={selectedConceptIds}
            onSelect={handleConceptSelect}
          />
          <VoiceInput
            isRecording={isRecording}
            onTranscription={handleTranscription}
            onToggleRecording={handleToggleRecording}
          />
        </div>
        
        <div className="detail-panel">
          <ConceptDetail
            selectedConcepts={getSelectedConcepts()}
            questions={questions}
          />
        </div>
      </main>
      
      {!apiKey && (
        <ApiKeyModal onSave={handleApiKeySave} />
      )}
    </div>
  );
}

export default App;
