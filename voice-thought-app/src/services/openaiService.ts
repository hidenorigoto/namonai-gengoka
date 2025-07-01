import OpenAI from 'openai';
import { ParsedConcept } from '../types';

const CONCEPT_EXTRACTION_SYSTEM_PROMPT = `
あなたは思考の構造化を支援するアシスタントです。
ユーザーの発話から重要な概念を抽出し、階層構造として整理してください。

ルール:
1. 最大3階層まで
2. 1つの親に対して最大5つの子概念
3. 抽象的な概念を上位に、具体的な概念を下位に配置
4. 同じ概念の重複を避ける
`;

const QUESTION_GENERATION_SYSTEM_PROMPT = `
あなたは思考を深めるための質問を生成するアシスタントです。
ユーザーが選択した概念について、以下の観点から質問を作成してください：

1. 詳細化: より具体的な内容を引き出す
2. 関連性: 他の要素との関係を探る
3. 実現性: 実装や応用の可能性を検討する
`;

class OpenAIService {
  private client: OpenAI | null = null;
  
  initialize(apiKey: string): void {
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }
  
  async extractConcepts(text: string): Promise<ParsedConcept[]> {
    if (!this.client) throw new Error('OpenAI client not initialized');
    
    try {
      const prompt = `
以下のテキストから主要な概念を抽出し、インデント形式で階層化してください。

テキスト:
"${text}"

出力例:
- 概念名
  - 下位概念1
  - 下位概念2
    - さらに詳細な概念
`;
      
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: CONCEPT_EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });
      
      const content = response.choices[0]?.message?.content || '';
      return this.parseConceptResponse(content);
      
    } catch (error) {
      console.error('Concept extraction failed:', error);
      throw error;
    }
  }
  
  async generateQuestions(concept: string, context?: string): Promise<string[]> {
    if (!this.client) throw new Error('OpenAI client not initialized');
    
    try {
      const prompt = `
概念: "${concept}"
${context ? `文脈: "${context}"` : ''}

この概念について、ユーザーの理解を深めるための質問を3つ生成してください。
質問は具体的で答えやすいものにしてください。

出力形式:
1. [質問内容]
2. [質問内容]
3. [質問内容]
`;
      
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: QUESTION_GENERATION_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      });
      
      const content = response.choices[0]?.message?.content || '';
      return this.parseQuestions(content);
      
    } catch (error) {
      console.error('Question generation failed:', error);
      throw error;
    }
  }
  
  private parseConceptResponse(response: string): ParsedConcept[] {
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
  
  private parseQuestions(content: string): string[] {
    const lines = content.split('\n').filter(line => line.trim());
    return lines
      .filter(line => /^\d+\./.test(line))
      .map(line => line.replace(/^\d+\.\s*/, ''));
  }
  
  isInitialized(): boolean {
    return this.client !== null;
  }
}

export const openAIService = new OpenAIService();