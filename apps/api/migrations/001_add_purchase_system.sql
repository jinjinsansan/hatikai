-- Phase 1: 購入システム追加のマイグレーション
-- このSQLをSupabase SQL EditorまたはTablePlusで実行してください

-- 1. PurchaseStatus enumの追加（既存でない場合）
DO $$ BEGIN
  CREATE TYPE "PurchaseStatus" AS ENUM ('pending', 'confirmed', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. WishItemテーブルの更新（カラム追加）
ALTER TABLE "WishItem"
  ADD COLUMN IF NOT EXISTS "asin" TEXT,
  ADD COLUMN IF NOT EXISTS "price" INTEGER;

-- 3. PurchaseObligationテーブルの作成
CREATE TABLE IF NOT EXISTS "PurchaseObligation" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "buyerId" TEXT NOT NULL,
  "targetItemId" TEXT,
  "tierId" INTEGER NOT NULL,
  "period" "ObligationPeriod" NOT NULL,
  "issuedFor" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" "PurchaseStatus" NOT NULL DEFAULT 'pending',
  "purchaseUrl" TEXT,
  "completedAt" TIMESTAMP(3),
  "verificationUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PurchaseObligation_pkey" PRIMARY KEY ("id")
);

-- 4. PurchaseHistoryテーブルの作成
CREATE TABLE IF NOT EXISTS "PurchaseHistory" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "itemTitle" TEXT NOT NULL,
  "itemUrl" TEXT NOT NULL,
  "purchasePrice" INTEGER,
  "affiliateUrl" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "verificationUrl" TEXT,
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PurchaseHistory_pkey" PRIMARY KEY ("id")
);

-- 5. インデックスの作成
CREATE INDEX IF NOT EXISTS "PurchaseObligation_buyerId_period_status_idx"
  ON "PurchaseObligation"("buyerId", "period", "status");

CREATE INDEX IF NOT EXISTS "PurchaseHistory_buyerId_purchasedAt_idx"
  ON "PurchaseHistory"("buyerId", "purchasedAt");

CREATE INDEX IF NOT EXISTS "PurchaseHistory_sellerId_purchasedAt_idx"
  ON "PurchaseHistory"("sellerId", "purchasedAt");

-- 6. 外部キー制約の追加
ALTER TABLE "PurchaseObligation"
  ADD CONSTRAINT "PurchaseObligation_targetItemId_fkey"
  FOREIGN KEY ("targetItemId") REFERENCES "WishItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. 初期データ: Tierテーブル
INSERT INTO "Tier" ("id", "name", "obligationsSchema", "perksSchema", "rulesVersion")
VALUES
(1, '最下層', '{"purchases":1,"adViews":3,"period":"day"}', '{"purchasesReceived":1,"period":"day","specialRule":"義務未達成でルーレット参加不可"}', 1),
(2, '借金階層', '{"purchases":2,"adViews":2,"period":"day"}', '{"purchasesReceived":1,"period":"day","specialRule":"購入された商品価値の50%が借金として蓄積"}', 1),
(3, '条件付き平等', '{"purchases":1,"adViews":1,"period":"day"}', '{"purchasesReceived":1,"period":"day","specialRule":"連続7日間条件未クリアで2階降格"}', 1),
(4, '選択の自由', '{"purchases":3,"adViews":0,"period":"week"}', '{"purchasesReceived":1,"period":"week","specialRule":"広告視聴代わりに+1つ購入選択可"}', 1),
(5, '優遇開始', '{"purchases":2,"adViews":0,"period":"month"}', '{"purchasesReceived":3,"period":"month","specialRule":"他階層1人紹介で当月購入義務免除"}', 1),
(6, '投資家気分', '{"purchases":0,"adViews":0,"period":"month"}', '{"purchasesReceived":1,"period":"month","specialRule":"月1回自動購入+下位階層から配当"}', 1),
(7, 'ほぼ特権階級', '{"purchases":0,"adViews":0,"period":"week"}', '{"purchasesReceived":1,"period":"week","specialRule":"1-3階の広告視聴でポイント蓄積"}', 1),
(8, '最上階', '{"purchases":0,"adViews":0,"period":"day"}', '{"purchasesReceived":1,"period":"day","specialRule":"60日以上滞在で強制的に1-3階ランダム配置"}', 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  obligationsSchema = EXCLUDED.obligationsSchema,
  perksSchema = EXCLUDED.perksSchema,
  rulesVersion = EXCLUDED.rulesVersion;