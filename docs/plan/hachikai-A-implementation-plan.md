# ハチカイ A案（非金銭的特典版）実装計画書 v1.0

## 0. 目的と前提
- 目的: 規約・審査適合を最優先に、階層×ルーレット×義務/特典の“核体験”をPWAで最短実装し、検証サイクルを開始する。
- 方針: 
  - 購入/アフィリエイトは特典と切り離す（当面は導入しない）。
  - 特典は“抽選・表示優遇・称号/イベント招待”など非金銭的メリットに限定。
  - Web(PWA)で立ち上げ→実証→必要に応じてRN/Flutterへ展開。

## 1. スコープ（MVP）
- ユーザー登録（メール+SNS/OAuthいずれか）/年齢確認同意
- 初期配置ルーレット（登録時）
- 日次ルーレット（毎日0:00、固定期間ルール含む）
- 義務管理（階層ごとの日/週/月タスク生成・達成記録）
- 広告視聴カウント（自社/提携枠、AdSenseはフォールバック）
- 特典: 抽選参加権/当選率ブースト、表示優遇、称号/バッジ
- イベント: 大革命/下克上（管理画面から発火）
- 管理者パネル（ダッシュボード、階層強制変更、イベント発火、ルール編集）
- 監査ログ（全ルーレット確定・管理操作）
- 通知（Web Push）

除外（将来）:
- 購入申告/証憑/OCR（B案機能）
- アソシエイトリンク生成/PA-API連携
- ネイティブ端末機能（カメラ、ハプティック、ウィジェット）

## 2. アーキテクチャ/スタック
- フロント: Next.js 14 (App Router) + TypeScript + Tailwind + PWA（Workbox）
- バックエンド: NestJS (Node.js) + TypeScript（REST）
- DB: PostgreSQL（RLS不要なら通常運用）
- キャッシュ/キュー: Redis（BullMQでジョブ/スケジューラ）
- ストレージ: S3互換（画像/後日拡張用）
- 認証: Auth0 or Supabase Auth（MVPはメール+OAuth）
- 通知: Firebase Cloud Messaging（Web Push）
- 監視: OpenTelemetry（NestJS/Next.js）+ Grafana Cloud or self-host（後追いでも可）
- インフラ: 
  - フロント: Vercel
  - API/ジョブ: Render/Fly.io/railway.app のいずれか
  - DB: Neon/Render PG/Cloud SQL などマネージド
  - Redis: Upstash/Valkey互換

## 3. データモデル（概略）
- users(id, auth_provider_id, handle, age_confirmed, referred_by, created_at)
- tiers(id, name, obligations_schema, perks_schema, rules_version, active_from)
- user_tier_states(user_id, tier_id, effective_from, lock_until, stay_days)
- tier_transitions(id, user_id, from_tier, to_tier, decided_at, base_probs, modifiers, event_id, reason)
- obligations(id, user_id, period(day/week/month), schema_snapshot, issued_for, status, progress)
- obligation_logs(id, obligation_id, kind(view_ad/login/referral), occurred_at, meta)
- ad_views(id, user_id, ad_slot, verified, token_id, viewed_at)
- events(id, kind(revolution/gekokujo/custom), window, payload, triggered_by, triggered_at)
- points_draws(id, user_id, points, draw_entries, won_reward_id, decided_at)
- rewards(id, kind(badge/boost/feature), weight, window, meta)
- audit_logs(id, actor_id, actor_role, action, target, payload, created_at)

備考:
- `obligations_schema`/`perks_schema`はJSONスキーマで階層ごとの差分を柔軟表現。
- `modifiers`はルーレット計算時の係数内訳を保存（透明性）。

## 4. ルーレット仕様
- ベース確率: 1:30% / 2:20% / 3:15% / 4:12% / 5:10% / 6:8% / 7:3% / 8:2%
- 修正要素（例）
  - 紹介人数: +2%/人（上位方向）
  - 広告超過視聴: 必要回数×2達成で+3%
  - 連続ログイン: 7日+1%、30日+5%
  - 義務未達成: 下位確率+15%
  - 長期滞在: 30日以上同階層で+3%/週（下位）
- 固定期間: 降格時3-7日、昇格時1-3日（結果をクランプ）
- 特殊イベント:
  - 大革命: 完全ランダム（等確率）
  - 下克上: 1-3階の上昇確率を強ブースト
- 擬似コード（要点）
  ```ts
  const base = [0.30,0.20,0.15,0.12,0.10,0.08,0.03,0.02];
  const upMod = f(referrals, extraAds, streak, debtClear=0);
  const downMod = g(missedObl, longStay, upperCapRules);
  let dist = applyModifiers(base, upMod, downMod);
  dist = applyEvents(dist, todayEvent);
  if (isLocked(user)) return currentTier;
  const nextTier = sample(dist);
  saveTransition(user, currentTier, nextTier, {base, upMod, downMod, event});
  ```

## 5. API（例・抜粋）
- 認証/ユーザー
  - `POST /auth/callback`（プロバイダ連携）
  - `GET /me` 現在ユーザー/階層/義務サマリ
- ルーレット/階層
  - `GET /tiers` 定義・説明
  - `GET /me/tier-state` 現在階層/ロック情報
  - `POST /roulette/run` （管理発火 or バックジョブ）
- 義務/進捗
  - `GET /me/obligations?period=day` 
  - `POST /me/obligations/:id/progress`（広告視聴/ログイン/紹介 等）
- 広告
  - `GET /ads/slot/:slotId`（差し込み/在庫自動切替）
  - `POST /ads/view-complete`（署名トークン検証）
- 特典/抽選
  - `GET /me/draws`（保有抽選権・当選履歴）
  - `POST /draws/enter`（消費して参加）
- 管理
  - `GET /admin/dashboard`
  - `POST /admin/tiers/:id`（ルール更新）
  - `POST /admin/force-tier`（個別/一括）
  - `POST /admin/events/trigger`（革命/下克上）

## 6. 画面/UX
- マイページ
  - 現在階層・次回ルーレットまでのカウントダウン
  - 今日の義務進捗（チェックリスト）
  - 抽選参加権・称号/バッジ表示
- 階層ステータス
  - 各階層の義務/特典・ロック状態・修正要素
- ルーレット
  - 高速スクロール演出、STOPボタン（演出用、結果はサーバー決定）
- 広告閲覧
  - 表示/カウント/完了ボタン（署名トークンで二重防止）
- 管理者パネル
  - 分布/義務達成率/イベント、強制変更、イベント発火、ルール編集

## 7. スケジュール（8–10週間想定）
- W1: 仕様固め/設計（API/モデル/UXワイヤ）
- W2: プロジェクト初期化（Next.js/NestJS/DB/Auth/CI）
- W3: 認証/ユーザー/階層モデル、初期配置ルーレット
- W4: 日次ルーレット（ジョブ/ロック/イベント対応）
- W5: 義務テンプレート生成/進捗API/マイページ
- W6: 広告視聴カウント/トークン検証/広告スロット
- W7: 抽選/特典（表示優遇・称号）/履歴
- W8: 管理者パネル（ダッシュボード/強制変更/イベント/ルール編集）
- W9: 監査ログ/通知(Web Push)/負荷最小テスト
- W10: QA/セキュリティ/ドキュメント/ステージング検証

## 8. 受け入れ基準（MVP）
- 登録直後に1–8階に初期配置される（監査ログ有）
- 毎日0:00に階層が更新され、固定期間中は変化しない
- マイページで本日の義務と進捗が確認・更新できる
- 広告視聴は署名トークンで重複防止され、1回分が記録される
- 管理画面で階層強制変更・イベント発火・ルール更新が可能
- すべての階層変動と管理操作が監査ログに記録される
- Web Push通知が主要イベントで配信される

## 9. セキュリティ/NFR
- 認証: OAuth/OIDC + セッション（HttpOnly, SameSite=Lax）
- 権限: RBAC（user/admin）、管理APIはIP制限/2FA
- データ保護: PII最小化、監査ログの改ざん対策（WORM風設計）
- レート制御: captcha/漏斗レートリミット（IP+アカウント）
- 可用性: API p95<300ms、日次ジョブ冪等、タイムゾーン一元管理（UTC保管/JST表示）
- 監視: メトリクス(Req/s, Error, p95)、ジョブ失敗アラート

## 10. リスクと対応
- 審査/規約の解釈ズレ（Webでも広告/抽選表現注意）
  - 文言/UIの中立化、TOS/プライバシー明示
- 不正視聴/スクリプト
  - 署名トークン+視聴時間/フォーカス検知、レートリミット、異常検知
- ルーレット不信感
  - 係数内訳/監査ログの開示（自分にのみ）、検証テスト公開
- スケジュール遅延
  - 先に最小UIで進め、管理/演出は段階投入

## 11. タスク分解（WBS 概要）
- 01-設計: 仕様凍結、ERD、API定義、ワイヤ
- 02-基盤: Monorepo整備(Turbo), CI, Lint/Format, Env管理
- 03-認証: プロバイダ/コールバック/セッション
- 04-モデル: users/tiers/user_tier_states/tier_transitions/obligations
- 05-ルーレット: ベース確率/修正係数/イベント/ロック/監査
- 06-義務: スキーマ/生成/進捗API/ログ
- 07-広告: スロット/在庫/トークン/完了API
- 08-特典: 抽選権/重み/当選/表示優遇制御
- 09-管理: ダッシュボード/強制変更/イベント/ルール編集
- 10-通知: FCM設定/購読/主要イベント送出
- 11-監視: OTel/ログ整備/アラート
- 12-QA: シナリオ/受け入れ/負荷ミニ

## 12. 環境/運用
- 環境: dev/stg/prd（別DB/Redis/FCM鍵）
- デプロイ: main→stg自動、タグ→prd承認付き
- データ移行: `tiers`/`rewards`はSeederで管理（バージョン付）
- ドキュメント: ADR/Runbook/オンボーディング手順

---
今後のアクション（提案）
1) この計画へのフィードバック反映（2–3点の意思決定）
2) リポジトリ初期化（ Next.js + NestJS のモノレポ or 分離構成）
3) API/モデルのスケルトン生成 → ルーレット実装着手
