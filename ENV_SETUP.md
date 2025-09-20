# 環境設定ガイド

## 1. 環境変数ファイル

以下の2つの`.env`ファイルを作成済みです：

### apps/web/.env
Webアプリケーション（Next.js）用の設定ファイル

**必須項目（Supabaseプロジェクト作成後に設定）**：
- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトのURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: SupabaseプロジェクトのAnonymousキー

**任意項目（Firebase設定 - プッシュ通知を使う場合）**：
- Firebase Console から取得した各種設定値を入力

### apps/api/.env
APIサーバー（NestJS）用の設定ファイル

**必須項目（Supabaseプロジェクト作成後に設定）**：
- `DATABASE_URL`: SupabaseのPostgreSQL接続URL
- `SUPABASE_JWT_SECRET`: SupabaseプロジェクトのJWT秘密鍵

## 2. Supabaseプロジェクトの設定

1. [Supabase](https://supabase.com)にアクセスしてプロジェクトを作成

2. プロジェクト設定から以下を取得：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Project API keys > anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Database > Connection string → `DATABASE_URL`
   - Project Settings > JWT Settings > JWT Secret → `SUPABASE_JWT_SECRET`

3. Authentication > Providers からGoogleプロバイダーを有効化
   - Redirect URLsに `http://localhost:3000/` を追加

## 3. 依存関係のインストール

```bash
# ルートディレクトリで実行
npm install

# またはyarnを使用
yarn install
```

## 4. データベースのマイグレーション

```bash
# APIディレクトリに移動
cd apps/api

# Prismaクライアントの生成
npm run prisma:generate

# マイグレーション実行
npm run prisma:migrate

# 初期データ投入（Tier 1-8）
npm run prisma:seed
```

## 5. 起動方法

```bash
# ルートディレクトリから
npm run dev

# 個別に起動する場合
# Web: http://localhost:3000
cd apps/web && npm run dev

# API: http://localhost:3001
cd apps/api && npm run dev
```

## 6. 管理画面へのアクセス

- URL: http://localhost:3000/admin
- 初回ログイン時に `ADMIN_TOKEN`（デフォルト: devadmin）を入力

## トラブルシューティング

### 依存関係のインストールが失敗する場合
```bash
# クリーンインストール
rm -rf node_modules package-lock.json
rm -rf apps/*/node_modules apps/*/package-lock.json
npm cache clean --force
npm install
```

### データベース接続エラーの場合
- SupabaseプロジェクトのDatabase設定でConnection poolingが有効になっていることを確認
- `DATABASE_URL`のフォーマットが正しいことを確認

### 認証エラーの場合
- SupabaseでGoogle認証プロバイダーが有効になっていることを確認
- Redirect URLsが正しく設定されていることを確認