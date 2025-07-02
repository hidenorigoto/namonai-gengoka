import OpenAI from 'openai';
import { ParsedConcept, ConceptNode } from '../types';

const CONCEPT_EXTRACTION_SYSTEM_PROMPT = `
あなたは思考の構造化を支援するアシスタントです。
ユーザーの発話から重要な概念を抽出し、それらの関係性を明示してください。

ルール:
1. 単語、フレーズ、文レベルで概念を抽出
2. 階層制限なし
3. 概念間の関係をラベル付きで表現
4. 同じ概念の重複を避ける
5. 既存概念との関連を優先
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
  
  async extractConcepts(text: string, existingConcepts?: ConceptNode[]): Promise<ParsedConcept[]> {
    if (!this.client) throw new Error('OpenAI client not initialized');
    
    try {
      // 既存の概念をフラットなリストに変換
      const existingConceptsList = existingConcepts ? this.flattenConcepts(existingConcepts) : [];
      
      const prompt = `
以下のテキストから概念を抽出し、関係性も含めて構造化してください。

${existingConceptsList.length > 0 ? `既に抽出されている概念:
${existingConceptsList.map(c => `- ${c}`).join('\n')}

重要: 既存の概念との関連を優先し、新しい概念や関係性を追加してください。
` : ''}
テキスト:
"${text}"

出力形式:
- 概念A
  - 概念B [関係: の詳細]
  - 概念C [関係: によって]
- 概念D
  - 概念E [関係: のため]

※ 関係ラベルの例: の詳細、によって、のため、の種類、を含む、の要素、の理由、の方法、の結果、の例
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
    const concepts: ParsedConcept[] = [];
    
    lines.forEach((line, index) => {
      const level = Math.floor(line.search(/\S/) / 2);
      let text = line.replace(/^[-\s]+/, '').trim();
      
      // 関係ラベルの抽出
      let relationLabel = '';
      const relationMatch = text.match(/\[\u95a2係:\s*(.+?)\]/);
      if (relationMatch) {
        relationLabel = relationMatch[1];
        text = text.replace(/\s*\[\u95a2\u4fc2:.+?\]/, '').trim();
      }
      
      concepts.push({
        id: `concept-${Date.now()}-${index}`,
        text,
        level,
        relationLabel
      });
    });
    
    return concepts;
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
  
  private flattenConcepts(nodes: ConceptNode[]): string[] {
    const concepts: string[] = [];
    
    const traverse = (node: ConceptNode) => {
      concepts.push(node.text);
      if (node.children) {
        node.children.forEach(child => traverse(child));
      }
    };
    
    nodes.forEach(node => traverse(node));
    return concepts;
  }
}

export const openAIService = new OpenAIService();