# AI API 連携設計ドキュメント

## 1. OpenAI API 統合概要

### 1.1 使用モデル
- **概念抽出**: GPT-3.5-turbo（コスト効率重視）
- **質問生成**: GPT-3.5-turbo
- **将来的な拡張**: GPT-4（より高度な理解が必要な場合）

### 1.2 API 呼び出しパターン
- 定期的なバッチ処理（10秒ごと）
- オンデマンド処理（概念選択時の質問生成）

## 2. プロンプトエンジニアリング

### 2.1 概念抽出プロンプト

#### 基本プロンプト
```typescript
const CONCEPT_EXTRACTION_SYSTEM_PROMPT = `
あなたは思考の構造化を支援するアシスタントです。
ユーザーの発話から重要な概念を抽出し、階層構造として整理してください。

ルール:
1. 最大3階層まで
2. 1つの親に対して最大5つの子概念
3. 抽象的な概念を上位に、具体的な概念を下位に配置
4. 同じ概念の重複を避ける
`;

const buildConceptExtractionPrompt = (text: string): string => {
  return `
以下のテキストから主要な概念を抽出し、インデント形式で階層化してください。

テキスト:
"${text}"

出力例:
- 概念名
  - 下位概念1
  - 下位概念2
    - さらに詳細な概念
`;
};
```

#### レスポンス処理
```typescript
interface ParsedConcept {
  text: string;
  level: number;
  id: string;
}

function parseConceptResponse(response: string): ParsedConcept[] {
  const lines = response.split('\n').filter(line => line.trim());
  
  return lines.map((line, index) => {
    const level = Math.floor(line.search(/\S/) / 2);
    const text = line.replace(/^[-\s]+/, '').trim();
    
    return {
      id: `concept-${Date.now()}-${index}`,
      text,
      level
    };
  });
}
```

### 2.2 質問生成プロンプト

#### 基本プロンプト
```typescript
const QUESTION_GENERATION_SYSTEM_PROMPT = `
あなたは思考を深めるための質問を生成するアシスタントです。
ユーザーが選択した概念について、以下の観点から質問を作成してください：

1. 詳細化: より具体的な内容を引き出す
2. 関連性: 他の要素との関係を探る
3. 実現性: 実装や応用の可能性を検討する
`;

const buildQuestionPrompt = (
  concept: string, 
  context?: string
): string => {
  return `
概念: "${concept}"
${context ? `文脈: "${context}"` : ''}

この概念について、ユーザーの理解を深めるための質問を3つ生成してください。
質問は具体的で答えやすいものにしてください。

出力形式:
1. [質問内容]
2. [質問内容]
3. [質問内容]
`;
};
```

## 3. API 呼び出し実装

### 3.1 サービスクラス設計
```typescript
// services/openaiService.ts

import OpenAI from 'openai';

class OpenAIService {
  private client: OpenAI | null = null;
  
  initialize(apiKey: string): void {
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // PoC用設定
    });
  }
  
  async extractConcepts(text: string): Promise<ParsedConcept[]> {
    if (!this.client) throw new Error('OpenAI client not initialized');
    
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: CONCEPT_EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: buildConceptExtractionPrompt(text) }
        ],
        temperature: 0.3,  // 一貫性重視
        max_tokens: 500
      });
      
      const content = response.choices[0]?.message?.content || '';
      return parseConceptResponse(content);
      
    } catch (error) {
      console.error('Concept extraction failed:', error);
      throw error;
    }
  }
  
  async generateQuestions(
    concept: string, 
    context?: string
  ): Promise<string[]> {
    if (!this.client) throw new Error('OpenAI client not initialized');
    
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: QUESTION_GENERATION_SYSTEM_PROMPT },
          { role: 'user', content: buildQuestionPrompt(concept, context) }
        ],
        temperature: 0.7,  // 創造性を許容
        max_tokens: 300
      });
      
      const content = response.choices[0]?.message?.content || '';
      return parseQuestions(content);
      
    } catch (error) {
      console.error('Question generation failed:', error);
      throw error;
    }
  }
}

export const openAIService = new OpenAIService();
```

### 3.2 エラーハンドリング
```typescript
interface APIError {
  type: 'rate_limit' | 'invalid_key' | 'network' | 'unknown';
  message: string;
  retryAfter?: number;
}

function handleOpenAIError(error: any): APIError {
  if (error.status === 429) {
    return {
      type: 'rate_limit',
      message: 'API利用制限に達しました。しばらくお待ちください。',
      retryAfter: error.headers?.['retry-after']
    };
  }
  
  if (error.status === 401) {
    return {
      type: 'invalid_key',
      message: 'APIキーが無効です。設定を確認してください。'
    };
  }
  
  if (error.code === 'ECONNABORTED') {
    return {
      type: 'network',
      message: 'ネットワークエラーが発生しました。'
    };
  }
  
  return {
    type: 'unknown',
    message: 'エラーが発生しました。'
  };
}
```

## 4. パフォーマンス最適化

### 4.1 デバウンス処理
```typescript
import { debounce } from 'lodash';

// 10秒ごとに概念抽出を実行
const debouncedExtractConcepts = debounce(
  async (text: string) => {
    const concepts = await openAIService.extractConcepts(text);
    updateConceptTree(concepts);
  },
  10000  // 10秒
);
```

### 4.2 テキスト長の管理
```typescript
const MAX_TEXT_LENGTH = 2000;  // 文字数制限

function truncateText(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  
  // 最新の内容を優先
  return '...' + text.slice(-MAX_TEXT_LENGTH);
}
```

## 5. 使用量とコスト管理

### 5.1 トークン数の見積もり
```typescript
function estimateTokens(text: string): number {
  // 日本語の場合、おおよそ1文字 = 2-3トークン
  return Math.ceil(text.length * 2.5);
}

function calculateCost(tokens: number, model: string): number {
  const pricing = {
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },  // per 1K tokens
    'gpt-4': { input: 0.01, output: 0.03 }
  };
  
  const price = pricing[model] || pricing['gpt-3.5-turbo'];
  return (tokens / 1000) * price.input;
}
```

### 5.2 使用量トラッキング
```typescript
class UsageTracker {
  private usage = {
    conceptExtractions: 0,
    questionGenerations: 0,
    totalTokens: 0
  };
  
  track(operation: string, tokens: number): void {
    this.usage.totalTokens += tokens;
    
    if (operation === 'extract') {
      this.usage.conceptExtractions++;
    } else if (operation === 'question') {
      this.usage.questionGenerations++;
    }
  }
  
  getReport(): string {
    const estimatedCost = calculateCost(
      this.usage.totalTokens, 
      'gpt-3.5-turbo'
    );
    
    return `
      概念抽出: ${this.usage.conceptExtractions}回
      質問生成: ${this.usage.questionGenerations}回
      推定コスト: $${estimatedCost.toFixed(4)}
    `;
  }
}
```

## 6. セキュリティ考慮事項

### 6.1 APIキーの保護
- ブラウザのローカルストレージに暗号化なしで保存（PoC として許容）
- 本番環境では必ずバックエンド経由でAPI呼び出し
- APIキーの定期的なローテーション推奨

### 6.2 入力サニタイゼーション
```typescript
function sanitizeInput(text: string): string {
  // 特殊文字のエスケープ
  return text
    .replace(/[<>]/g, '')  // HTMLタグ除去
    .slice(0, 5000);       // 最大文字数制限
}
```

## 7. テスト用モックデータ

### 7.1 開発時のモック応答
```typescript
const MOCK_CONCEPTS = `
- 音声による思考の言語化
  - リアルタイム音声認識
    - Web Speech API
    - 日本語処理
  - AI による構造化
    - 概念抽出
    - 関係性分析
`;

const MOCK_QUESTIONS = [
  "この機能の主な利用シーンはどのようなものを想定していますか？",
  "音声認識の精度をどのように確保する予定ですか？",
  "構造化された概念をどのように活用できると考えていますか？"
];

// 開発モードでの切り替え
const useMockData = process.env.NODE_ENV === 'development' && 
                   !process.env.REACT_APP_USE_REAL_API;
```