# 実装ガイド

## 1. 開発環境セットアップ

### 1.1 必要な環境
- Node.js 18.x 以上
- npm または yarn
- モダンブラウザ（Chrome/Edge/Safari）
- OpenAI APIキー

### 1.2 プロジェクト初期化
```bash
# プロジェクト作成
npx create-react-app voice-thought-app --template typescript
cd voice-thought-app

# 必要な依存関係をインストール
npm install openai
npm install --save-dev @types/node
```

### 1.3 プロジェクト構造
```
voice-thought-app/
├── public/
├── src/
│   ├── components/
│   │   ├── VoiceInput.tsx
│   │   ├── ConceptTree.tsx
│   │   ├── ConceptDetail.tsx
│   │   └── ApiKeyModal.tsx
│   ├── services/
│   │   ├── speechRecognition.ts
│   │   ├── openaiService.ts
│   │   └── apiKeyManager.ts
│   ├── types/
│   │   └── index.ts
│   ├── styles/
│   │   └── App.css
│   ├── App.tsx
│   └── index.tsx
├── docs/
│   ├── architecture.md
│   ├── api-design.md
│   └── implementation-guide.md
├── package.json
└── README.md
```

## 2. 基本実装フロー

### 2.1 型定義 (types/index.ts)
```typescript
export interface ConceptNode {
  id: string;
  text: string;
  level: number;
  children: ConceptNode[];
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
```

### 2.2 音声認識サービス実装
```typescript
// services/speechRecognition.ts

export class SpeechRecognitionService {
  private recognition: any;
  private isListening: boolean = false;
  
  constructor() {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported');
    }
    
    this.recognition = new SpeechRecognition();
    this.setupRecognition();
  }
  
  private setupRecognition(): void {
    this.recognition.lang = 'ja-JP';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
  }
  
  start(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: any) => void
  ): void {
    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      onResult(text, result.isFinal);
    };
    
    this.recognition.onerror = onError;
    
    this.recognition.start();
    this.isListening = true;
  }
  
  stop(): void {
    this.recognition.stop();
    this.isListening = false;
  }
}
```

### 2.3 メインアプリコンポーネント
```typescript
// App.tsx

import React, { useState, useCallback } from 'react';
import VoiceInput from './components/VoiceInput';
import ConceptTree from './components/ConceptTree';
import ConceptDetail from './components/ConceptDetail';
import ApiKeyModal from './components/ApiKeyModal';
import { openAIService } from './services/openaiService';
import { ConceptNode } from './types';
import './styles/App.css';

function App() {
  const [state, setState] = useState({
    isRecording: false,
    transcribedText: '',
    concepts: [] as ConceptNode[],
    selectedConceptIds: new Set<string>(),
    isProcessing: false,
    apiKey: localStorage.getItem('openai_api_key'),
    questions: [] as string[]
  });
  
  const handleTranscription = useCallback((text: string) => {
    setState(prev => ({
      ...prev,
      transcribedText: prev.transcribedText + ' ' + text
    }));
    
    // デバウンスされた概念抽出を呼び出し
    extractConcepts(text);
  }, []);
  
  const handleConceptSelect = useCallback(async (conceptId: string) => {
    const newSelected = new Set(state.selectedConceptIds);
    
    if (newSelected.has(conceptId)) {
      newSelected.delete(conceptId);
    } else {
      newSelected.add(conceptId);
      
      // 質問生成
      const concept = findConceptById(state.concepts, conceptId);
      if (concept) {
        const questions = await openAIService.generateQuestions(concept.text);
        setState(prev => ({ ...prev, questions }));
      }
    }
    
    setState(prev => ({
      ...prev,
      selectedConceptIds: newSelected
    }));
  }, [state.concepts, state.selectedConceptIds]);
  
  return (
    <div className="app">
      <header className="app-header">
        <h1>音声思考支援アプリ</h1>
        <div className="status">
          {state.isRecording ? '🔴 録音中...' : '⏸️ 停止中'}
        </div>
      </header>
      
      <main className="app-main">
        <div className="concept-tree-panel">
          <ConceptTree
            concepts={state.concepts}
            selectedIds={state.selectedConceptIds}
            onSelect={handleConceptSelect}
          />
          <VoiceInput
            isRecording={state.isRecording}
            onTranscription={handleTranscription}
            onToggleRecording={() => 
              setState(prev => ({ ...prev, isRecording: !prev.isRecording }))
            }
          />
        </div>
        
        <div className="detail-panel">
          <ConceptDetail
            selectedConcepts={getSelectedConcepts(state)}
            questions={state.questions}
          />
        </div>
      </main>
      
      {!state.apiKey && (
        <ApiKeyModal
          onSave={(key) => {
            localStorage.setItem('openai_api_key', key);
            openAIService.initialize(key);
            setState(prev => ({ ...prev, apiKey: key }));
          }}
        />
      )}
    </div>
  );
}

export default App;
```

## 3. コンポーネント実装例

### 3.1 ConceptTree コンポーネント
```typescript
// components/ConceptTree.tsx

import React from 'react';
import { ConceptNode } from '../types';

interface Props {
  concepts: ConceptNode[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
}

const ConceptTree: React.FC<Props> = ({ concepts, selectedIds, onSelect }) => {
  const renderConcept = (concept: ConceptNode, depth: number = 0) => {
    const isSelected = selectedIds.has(concept.id);
    const indent = depth * 20;
    
    return (
      <div key={concept.id}>
        <div
          className={`concept-node ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => onSelect(concept.id)}
        >
          {concept.children.length > 0 && (
            <span className="toggle">▼</span>
          )}
          {concept.text}
        </div>
        {concept.children.map(child => 
          renderConcept(child, depth + 1)
        )}
      </div>
    );
  };
  
  return (
    <div className="concept-tree">
      {concepts.map(concept => renderConcept(concept))}
    </div>
  );
};

export default ConceptTree;
```

## 4. スタイリング

### 4.1 基本スタイル (styles/App.css)
```css
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: #f5f5f5;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ddd;
}

.app-main {
  flex: 1;
  display: grid;
  grid-template-columns: 40% 60%;
  overflow: hidden;
}

.concept-tree-panel {
  border-right: 1px solid #ddd;
  padding: 1rem;
  overflow-y: auto;
}

.detail-panel {
  padding: 1rem;
  overflow-y: auto;
}

.concept-node {
  padding: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.concept-node:hover {
  background-color: #f0f0f0;
}

.concept-node.selected {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
  font-weight: 600;
}

.record-button {
  width: 100%;
  padding: 1rem;
  margin-top: 1rem;
  font-size: 1.2rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.record-button.recording {
  background: #f44336;
}
```

## 5. 開発フロー

### 5.1 開発サーバー起動
```bash
npm start
# http://localhost:3000 でアプリケーションが起動
```

### 5.2 開発時の確認ポイント
1. **音声認識の動作確認**
   - マイク許可のプロンプトが表示されるか
   - 日本語音声が正しく認識されるか
   
2. **API連携の確認**
   - APIキーが正しく設定されるか
   - エラーハンドリングが適切か
   
3. **UI/UXの確認**
   - 概念選択がスムーズか
   - レスポンシブ対応が適切か

### 5.3 デバッグのコツ
```typescript
// コンソールログを活用
console.log('Transcribed text:', text);
console.log('Extracted concepts:', concepts);
console.log('API response:', response);

// React Developer Tools を使用
// Chrome拡張機能でコンポーネントの状態を確認
```

## 6. デプロイメント

### 6.1 ビルド
```bash
npm run build
# build/ ディレクトリに本番用ファイルが生成される
```

### 6.2 静的ホスティング
- **Vercel**: `vercel` コマンドでデプロイ
- **Netlify**: ドラッグ&ドロップでデプロイ
- **GitHub Pages**: gh-pages パッケージを使用

### 6.3 環境変数の設定
```javascript
// .env.local (開発環境)
REACT_APP_OPENAI_API_KEY=sk-...

// 本番環境では環境変数を適切に設定
```

## 7. トラブルシューティング

### 7.1 よくある問題と対処法

**音声認識が動作しない**
- HTTPSで接続しているか確認
- マイクの権限が許可されているか確認
- ブラウザが対応しているか確認

**API呼び出しがエラーになる**
- APIキーが正しく設定されているか確認
- レート制限に達していないか確認
- ネットワーク接続を確認

**概念が表示されない**
- コンソールでエラーを確認
- API応答の形式を確認
- パース処理が正しいか確認

### 7.2 パフォーマンス改善
- 不要な再レンダリングを防ぐ（React.memo使用）
- 大量の概念がある場合は仮想スクロール導入
- API呼び出しの最適化（デバウンス調整）

## 8. 次のステップ

### 8.1 機能追加のアイデア
- 音声コマンドによる操作
- 概念のエクスポート機能
- セッション履歴の保存
- より高度なビジュアライゼーション

### 8.2 本番化に向けて
- バックエンドサーバーの実装
- ユーザー認証の追加
- データベースによる永続化
- より堅牢なエラーハンドリング