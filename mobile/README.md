# ANIVA Mobile App

React Native / Expo モバイルアプリ for ANIVA AI Companion Platform.

## 技術スタック

| Tech | Version |
|------|---------|
| Expo SDK | ~52.0 |
| React Native | 0.76 |
| TypeScript | ~5.3 |
| Expo Router | v4 (file-based routing) |
| NativeWind | v4 (Tailwind CSS) |
| Zustand | v5 (state management) |
| AsyncStorage | 1.23 (session persistence) |
| Expo Notifications | ~0.29 |

## 画面構成

```
/               → キャラクター選択 (Home)
/moments        → Moments タイムライン
/chat/:id       → チャット画面
/profile/:id    → キャラクタープロフィール・関係性
/(auth)/login   → ログイン画面
```

## セットアップ

### 1. 依存関係をインストール

```bash
cd mobile/
npm install
# または
pnpm install
```

### 2. 環境変数

`.env.local` を確認（既に作成済み）:

```env
EXPO_PUBLIC_API_URL=http://aniva.162.43.90.97.nip.io
```

### 3. 開発サーバー起動

```bash
npx expo start
```

ターミナルに **QRコード** が表示されます。

### 4. スマートフォンでスキャン

**iOSの場合:**
1. カメラアプリを開く
2. QRコードをスキャン → Expo Go が起動

**Androidの場合:**
1. [Expo Go](https://expo.dev/go) をインストール
2. Expo Go アプリを開く
3. "Scan QR code" でスキャン

### 5. エミュレーターで実行

```bash
# iOS Simulator (macOS のみ)
npx expo start --ios

# Android Emulator
npx expo start --android
```

## ディレクトリ構造

```
mobile/
├── app/
│   ├── _layout.tsx          # Root layout (auth guard)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx        # ログイン画面
│   └── (app)/
│       ├── _layout.tsx      # Tab navigation
│       ├── index.tsx        # キャラクター選択
│       ├── moments.tsx      # Moments タイムライン
│       ├── chat/
│       │   └── [characterId].tsx   # チャット画面
│       └── profile/
│           └── [characterId].tsx   # プロフィール
├── components/
│   ├── CharacterCard.tsx    # キャラクターカード
│   ├── MessageBubble.tsx    # チャットバブル
│   ├── MomentCard.tsx       # Momentカード
│   └── RelationshipBar.tsx  # 関係性プログレスバー
├── lib/
│   ├── api.ts               # API クライアント
│   └── storage.ts           # AsyncStorage ユーティリティ
├── stores/
│   └── auth.ts              # Zustand 認証ストア
├── global.css               # NativeWind グローバルスタイル
├── metro.config.js          # Metro バンドラー設定
├── babel.config.js          # Babel 設定
├── tailwind.config.js       # Tailwind 設定
├── app.json                 # Expo 設定
└── tsconfig.json            # TypeScript 設定
```

## API エンドポイント

| 機能 | Method | Path |
|------|--------|------|
| ログイン | POST | `/api/auth/callback/credentials` |
| キャラクター一覧 | GET | `/api/characters` |
| メッセージ送信 | POST | `/api/chat/send` |
| チャット履歴 | GET | `/api/chat/history/:characterId` |
| Moments | GET | `/api/moments` |
| Momentへの反応 | POST | `/api/moments/:id/react` |
| 関係性取得 | GET | `/api/relationship/:characterId` |

## ビルド (EAS Build)

```bash
# EAS CLI インストール
npm install -g eas-cli

# ログイン
eas login

# ビルド設定初期化
eas build:configure

# プレビュービルド
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

## TypeScript チェック

```bash
npx tsc --noEmit
```

## 注意事項

- Expo Managed Workflow (bare/ejected ではない)
- `scheme: "aniva"` でディープリンク設定済み
- API接続先: `http://aniva.162.43.90.97.nip.io`
- セッションはAsyncStorageで永続化
