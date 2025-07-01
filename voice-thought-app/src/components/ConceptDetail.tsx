import React from 'react';
import { ConceptNode } from '../types';

interface ConceptDetailProps {
  selectedConcepts: ConceptNode[];
  questions: string[];
}

const ConceptDetail: React.FC<ConceptDetailProps> = ({ selectedConcepts, questions }) => {
  if (selectedConcepts.length === 0) {
    return (
      <div className="concept-detail empty">
        <h3>概念を選択してください</h3>
        <p>左側のツリーから概念をクリックすると、詳細と質問が表示されます。</p>
      </div>
    );
  }

  return (
    <div className="concept-detail">
      <div className="selected-concepts">
        <h3>【選択中の概念】</h3>
        {selectedConcepts.map((concept, index) => (
          <div key={concept.id} className="concept-info">
            {selectedConcepts.length > 1 && <span className="concept-number">{index + 1}. </span>}
            <span className="concept-name">{concept.text}</span>
          </div>
        ))}
      </div>

      {questions.length > 0 && (
        <div className="questions-section">
          <h4>💭 AI生成の質問:</h4>
          <ol className="questions-list">
            {questions.map((question, index) => (
              <li key={index} className="question-item">
                {question}
              </li>
            ))}
          </ol>
        </div>
      )}

      {selectedConcepts.length === 1 && selectedConcepts[0].metadata && (
        <div className="metadata-section">
          <h4>🏷️ メタ情報:</h4>
          <ul className="metadata-list">
            <li>言及回数: {selectedConcepts[0].metadata.mentions}回</li>
            <li>初出: {new Date(selectedConcepts[0].metadata.createdAt).toLocaleTimeString('ja-JP')}</li>
          </ul>
        </div>
      )}

      {selectedConcepts.length > 1 && (
        <div className="multi-select-info">
          <p className="info-text">
            複数の概念が選択されています。これらの関連性について考えてみましょう。
          </p>
        </div>
      )}
    </div>
  );
};

export default ConceptDetail;