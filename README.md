# ハチカイ（A案・MVP）

モノレポ（web/API）で運用。Supabase(Google)認証・JSTルーレット前提の土台を含みます。

## ディレクトリ
- `apps/web`: Next.js 14（App Router）。SupabaseクライアントでGoogleサインイン雛形。
- `apps/api`: NestJS。`GET /health`のみ実装済み。
- `docs/plan`: 実装計画書
- `docs/adr`: アーキテクチャ決定記録（モノレポ採用）

## セットアップ（ローカル）
1. 依存取得（オフライン環境ではスキップ可）
   - ルートで: `pnpm i` または `npm i` （Turborepo）
2. Web用環境変数
   - `apps/web/.env` を作成し以下を設定
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_TIMEZONE=Asia/Tokyo`
     - Firebase Push用（任意・通知デモを使う場合）
       - `NEXT_PUBLIC_FIREBASE_API_KEY`
       - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
       - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
       - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
       - `NEXT_PUBLIC_FIREBASE_APP_ID`
       - `NEXT_PUBLIC_FCM_VAPID_KEY`
3. API用環境変数
   - `apps/api/.env` を作成し以下を設定
     - `PORT=3001`
     - `TIMEZONE=Asia/Tokyo`
     - `DATABASE_URL`（SupabaseのConnection string） / `REDIS_URL`（ダミーでOK）
     - `SUPABASE_JWT_SECRET`（Supabaseプロジェクト設定のJWT秘密鍵）
     - `FCM_SERVER_KEY`（Firebase Cloud Messaging サーバーキー）
     - `ADS_TOKEN_SECRET`（広告トークン署名鍵） / `MIN_AD_DURATION_SEC`（最低視聴秒数）
4. 開発起動
   - ルート: `npm run dev`（web/api 並行起動）
   - WebのCSS反映には `apps/web` での依存導入が必要です（ネットワーク許可時）
     - 例: `cd apps/web && npm i`

## Supabase 設定（Google Auth）
- SupabaseプロジェクトでGoogle Providerを有効化
- WebのリダイレクトURL: `http://localhost:3000/` を追加
- `.env` に URL/Anon Key を設定
- APIのJWT検証: SupabaseのJWT秘密鍵を `apps/api/.env` の `SUPABASE_JWT_SECRET` に設定

## 今後
- ルーレット/義務/イベント/管理APIの実装
- FCM(Web Push)の追加
- PrismaでDBスキーマ定義（追加済み）
- TailwindでUI整備（導入済み）

## Prisma（API）
- スキーマ: `apps/api/prisma/schema.prisma`
- コマンド（apps/api 配下で実行）
  - 生成: `npm run prisma:generate`
  - マイグレーション: `npm run prisma:migrate`
  - シード: `npm run prisma:seed`（tiers 1..8 を投入）
  - Studio: `npm run prisma:studio`
- 接続先: SupabaseのPostgres（プロジェクト設定 → Connection Info のURLを`DATABASE_URL`に設定）

## 管理/ルーレット
- 管理用エンドポイント（暫定）: `POST /admin/roulette/run` → 全ユーザーの日次ルーレット実行
- 自動実行: サーバ起動後、JST 0:00 を監視し1日1回実行（簡易タイマー）
- 管理APIは `x-admin-token` ヘッダーで保護（`apps/api/.env` の `ADMIN_TOKEN`）
 - ルーレット補正（mods）: 紹介人数、広告超過視聴、連続ログイン、前日未達、長期滞在を反映

## 義務（Obligations）

## 管理UI（簡易）
- 画面: `http://localhost:3000/admin`
- 機能: ダッシュボード（分布/件数/最新イベント）、階層強制変更、イベント発火、Tierルール編集（obligations/perks のJSON編集、バージョン更新）
- 環境変数: `apps/web/.env` に `ADMIN_TOKEN` を設定（NextのAPIルートからサーバー側で送信）
 - 認証: `/admin/login` で `ADMIN_TOKEN` を入力→ Cookieで保護（`admin_authed`）。ミドルウェアで `/admin/*` と `/api/admin/*` をガード

### 一括操作（CSV）
- フォーマット: `userId,tierId,lockDays`（先頭行はヘッダ可）
- 画面のテキストエリアに貼り付け→「一括Tier変更を実行」
- 裏側API: `POST /admin/force-tier/bulk`

### イベントスケジュール
- 種別と from/to（任意）を指定して登録
- 裏側API: `POST /admin/events/schedule`
- 生成: JST 0:00 に各ユーザーの現在Tierの `obligationsSchema` から `day/week/month` を発行
- 失効: 前日までの`pending`は`expired`に更新
- 取得: `GET /me/obligations?period=day`
  - 開発中はヘッダー `X-User-Id: <uuid>` を付与（後でAuthに置換）
- 進捗: `POST /me/obligations/:id/progress` body `{ kind: 'view_ad', meta?: any }`
  - 簡易ルール: `kind=view_ad` で `progress.ads` を+1。`schemaSnapshot`の数値要件を満たすと`completed`へ

## 通知（Web Push / FCM）
- Web側: トップページの「プッシュ通知を有効化」→ トークン取得→ `/api/me/notifications/token` へ登録
- API側: `FCM_SERVER_KEY` を設定。`POST /admin/notify/test` でテスト配信（`x-admin-token` 必須）
- Service Worker: `apps/web/public/firebase-messaging-sw.js`
## 広告視聴トークン（デモ）
- API 環境変数: `ADS_TOKEN_SECRET`（署名鍵）, `MIN_AD_DURATION_SEC`（最小視聴秒数）
- 取得: `GET /ads/slot/:slotId`（Next: `/api/ads/slot/main`）→ `{ token, tid, min }`
- 完了: `POST /ads/view-complete`（Next: `/api/ads/view-complete`） body `{ token, metrics: { durationMs, focusRatio } }`
  - サーバ側で署名・期限・ユーザー一致・最小視聴時間・フォーカス比（>=0.8）を検証
  - `ad_views` に記録（tokenId一意で再利用防止）、当日`obligations`の`ads`を+1
 - Web UI: トップページ下部にデモを配置（トークン取得→カウントダウン→完了送信）

## ユーザー系API（Auth）
- 認証: Supabaseのアクセストークンを `Authorization: Bearer <token>` でNextのAPIに送る → APIへ転送 → `SUPABASE_JWT_SECRET` で検証
- `POST /me/login-ping`（Next: `/api/me/login-ping`）
  - 当日のログインを記録（連続ログイン用）
- `GET /me/tier-state`（Next: `/api/me/tier-state`）
- `GET /me/roulette/modifiers`（Next: `/api/me/roulette/modifiers`）
  - 現時点の補正内訳（参考）

### 監査ログ/変動履歴
- 監査ログ: `GET /admin/audit`（最新N件）。管理画面に最近の操作を表示
- 変動履歴: `GET /admin/transitions`（最新N件）。ユーザーのTier変動を一覧表示

## PWA対応（Web）
- 追加ファイル
  - `apps/web/public/manifest.webmanifest`
  - `apps/web/public/sw.js`（オフライン対応の簡易Service Worker）
  - `apps/web/public/offline.html`（フォールバック）
  - `apps/web/public/icons/icon-192.svg`, `icon-512.svg`
- 登録
  - クライアント側で `/sw.js` を登録（`components/AppInit.tsx`）
  - `layout.tsx` に manifest・theme-color・icon を追加
- 挙動
  - ナビゲーションはネットワーク失敗時に `offline.html` へフォールバック
  - 静的アセットはキャッシュファースト
