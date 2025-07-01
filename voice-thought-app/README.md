# 音声思考支援アプリ

音声入力を通じて思考の言語化を支援するWebアプリケーションです。リアルタイムに音声を認識し、AIが内容を解析・構造化して概念マップとして表示します。

## 機能

- 🎤 リアルタイム音声認識（日本語対応）
- 🤖 AI による概念の自動抽出・構造化
- 🌳 インタラクティブな概念ツリー表示
- 💭 選択した概念に対する深掘り質問の自動生成
- 🔒 APIキーはローカルストレージに安全に保存

## セットアップ

### 必要な環境

- Node.js 18.x 以上
- モダンブラウザ（Chrome, Edge, Safari）
- OpenAI API キー

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm start
```

アプリケーションは http://localhost:3000 で起動します。

### OpenAI API キーの設定

1. [OpenAI Platform](https://platform.openai.com/api-keys) でAPIキーを取得
2. アプリケーション起動時に表示される設定画面でAPIキーを入力
3. APIキーはブラウザのローカルストレージに保存されます

## 使い方

1. APIキーを設定
2. 「録音開始」ボタンをクリック
3. マイクに向かって話す
4. 10秒ごとにAIが発話内容を解析し、概念を抽出
5. 左側のツリーに概念が階層構造で表示される
6. 概念をクリックすると、右側に詳細と質問が表示される

## プロジェクト構造

```
src/
├── components/
│   ├── VoiceInput.tsx     # 音声入力コンポーネント
│   ├── ConceptTree.tsx    # 概念ツリー表示
│   ├── ConceptDetail.tsx  # 概念詳細表示
│   └── ApiKeyModal.tsx    # APIキー設定モーダル
├── services/
│   ├── speechRecognition.ts  # 音声認識サービス
│   ├── openaiService.ts      # OpenAI API連携
│   └── apiKeyManager.ts      # APIキー管理
├── types/
│   └── index.ts              # 型定義
├── App.tsx                   # メインコンポーネント
└── App.css                   # スタイリング
```

## 技術スタック

- React + TypeScript
- Web Speech API（音声認識）
- OpenAI API（概念抽出・質問生成）
- CSS（スタイリング）

## 開発コマンド

### `npm start`
開発サーバーを起動します。

### `npm run build`
本番用にアプリケーションをビルドします。

### `npm test`
テストを実行します。

## 注意事項

- 音声認識にはHTTPS接続が必要です
- マイクへのアクセス許可が必要です
- APIキーは第三者と共有しないでください

## ライセンス

MIT