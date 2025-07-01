import React, { useState } from 'react';
import { ApiKeyManager } from '../services/apiKeyManager';

interface ApiKeyModalProps {
  onSave: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!ApiKeyManager.validate(apiKey)) {
      setError('APIキーが無効です。sk-で始まる正しいキーを入力してください。');
      return;
    }
    
    onSave(apiKey);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>OpenAI APIキーの設定</h2>
        <p>このアプリを使用するにはOpenAI APIキーが必要です。</p>
        
        <div className="api-key-input-group">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setError('');
            }}
            placeholder="sk-..."
            className="api-key-input"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="toggle-visibility"
          >
            {showKey ? '隠す' : '表示'}
          </button>
        </div>
        
        {error && <p className="error-message">{error}</p>}
        
        <div className="modal-footer">
          <button
            onClick={handleSave}
            disabled={!apiKey}
            className="save-button"
          >
            設定
          </button>
        </div>
        
        <div className="modal-info">
          <p>※ APIキーはブラウザのローカルストレージに保存されます。</p>
          <p>※ サーバーには送信されません。</p>
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
          >
            APIキーの取得方法
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;