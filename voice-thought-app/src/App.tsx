import React, { useState, useCallback, useEffect, useRef } from 'react';
import VoiceInput from './components/VoiceInput';
import ConceptTree from './components/ConceptTree';
import ConceptDetail from './components/ConceptDetail';
import ApiKeyModal from './components/ApiKeyModal';
import ProcessingIndicator from './components/ProcessingIndicator';
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
  const [debugLog, setDebugLog] = useState<string[]>([]);
  
  const processTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedTextRef = useRef<string>('');

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    setDebugLog(prev => [...prev, `[${timestamp}] ${message}`].slice(-10)); // 最新10件のみ保持
    console.log(`[${timestamp}] ${message}`);
  };

  useEffect(() => {
    if (apiKey) {
      openAIService.initialize(apiKey);
      addDebugLog('OpenAI APIキーが設定されました');
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
    if (!transcribedText || transcribedText === lastProcessedTextRef.current) {
      addDebugLog('AI処理スキップ: テキストが変更されていません');
      return;
    }
    if (!openAIService.isInitialized()) {
      addDebugLog('AI処理スキップ: OpenAIサービスが初期化されていません');
      return;
    }

    addDebugLog(`AI処理開始: "${transcribedText.slice(-50)}..."`);
    setIsProcessing(true);
    try {
      const parsedConcepts = await openAIService.extractConcepts(transcribedText);
      addDebugLog(`概念抽出成功: ${parsedConcepts.length}個の概念を抽出`);
      const tree = buildConceptTree(parsedConcepts);
      setConcepts(tree);
      lastProcessedTextRef.current = transcribedText;
    } catch (error) {
      console.error('AI processing failed:', error);
      addDebugLog(`AI処理エラー: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  }, [transcribedText, addDebugLog]);

  const scheduleProcessing = useCallback(() => {
    if (processTimeoutRef.current) {
      clearTimeout(processTimeoutRef.current);
    }
    addDebugLog('AI処理を10秒後にスケジュール');
    processTimeoutRef.current = setTimeout(processWithAI, 10000);
  }, [processWithAI, addDebugLog]);

  const handleTranscription = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      addDebugLog(`音声認識完了: "${text}"`);
      setTranscribedText(prev => {
        const newText = prev + ' ' + text;
        addDebugLog(`全テキスト長: ${newText.length}文字`);
        return newText;
      });
      scheduleProcessing();
    }
  }, [scheduleProcessing, addDebugLog]);

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
    const newState = !isRecording;
    setIsRecording(newState);
    addDebugLog(newState ? '録音開始' : '録音停止');
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
          {/* AI処理インジケーター */}
          <ProcessingIndicator 
            isProcessing={isProcessing}
            processedText={transcribedText}
          />
          
          {/* デバッグ情報 */}
          <div className="debug-info">
            <h4>デバッグ情報</h4>
            <div className="debug-stats">
              <p>📝 認識テキスト長: {transcribedText.length}文字</p>
              <p>🌳 抽出概念数: {concepts.length}個</p>
              <p>🤖 AI処理中: {isProcessing ? 'はい' : 'いいえ'}</p>
            </div>
            <div className="debug-log">
              <h5>ログ:</h5>
              {debugLog.map((log, index) => (
                <div key={index} className="log-entry">{log}</div>
              ))}
            </div>
          </div>
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
