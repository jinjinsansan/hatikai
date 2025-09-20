// 階層システムの設定
export interface TierObligation {
  purchases: number // 購入義務数
  adViews: number   // 広告視聴義務数
  period: 'day' | 'week' | 'month'
}

export interface TierPerk {
  purchasesReceived: number // 購入される数
  period: 'day' | 'week' | 'month'
  specialRule?: string
}

export interface TierConfig {
  id: number
  name: string
  displayName: string
  obligations: TierObligation
  perks: TierPerk
}

// 階層設定定義（要件定義に基づく）
export const TIER_CONFIGS: TierConfig[] = [
  {
    id: 1,
    name: 'bottom',
    displayName: '最下層',
    obligations: {
      purchases: 1,
      adViews: 3,
      period: 'day'
    },
    perks: {
      purchasesReceived: 1,
      period: 'day',
      specialRule: '義務未達成でルーレット参加不可'
    }
  },
  {
    id: 2,
    name: 'debt',
    displayName: '借金階層',
    obligations: {
      purchases: 2,
      adViews: 2,
      period: 'day'
    },
    perks: {
      purchasesReceived: 1,
      period: 'day',
      specialRule: '購入された商品価値の50%が借金として蓄積'
    }
  },
  {
    id: 3,
    name: 'conditional',
    displayName: '条件付き平等',
    obligations: {
      purchases: 1,
      adViews: 1,
      period: 'day'
    },
    perks: {
      purchasesReceived: 1,
      period: 'day',
      specialRule: '連続7日間条件未クリアで2階降格'
    }
  },
  {
    id: 4,
    name: 'choice',
    displayName: '選択の自由',
    obligations: {
      purchases: 3,
      adViews: 0,
      period: 'week'
    },
    perks: {
      purchasesReceived: 1,
      period: 'week',
      specialRule: '広告視聴代わりに+1つ購入選択可'
    }
  },
  {
    id: 5,
    name: 'privilege_start',
    displayName: '優遇開始',
    obligations: {
      purchases: 2,
      adViews: 0,
      period: 'month'
    },
    perks: {
      purchasesReceived: 3,
      period: 'month',
      specialRule: '他階層1人紹介で当月購入義務免除'
    }
  },
  {
    id: 6,
    name: 'investor',
    displayName: '投資家気分',
    obligations: {
      purchases: 0,
      adViews: 0,
      period: 'month'
    },
    perks: {
      purchasesReceived: 1,
      period: 'month',
      specialRule: '月1回自動購入+下位階層から配当'
    }
  },
  {
    id: 7,
    name: 'nearly_top',
    displayName: 'ほぼ特権階級',
    obligations: {
      purchases: 0,
      adViews: 0,
      period: 'week'
    },
    perks: {
      purchasesReceived: 1,
      period: 'week',
      specialRule: '1-3階の広告視聴でポイント蓄積'
    }
  },
  {
    id: 8,
    name: 'top',
    displayName: '最上階',
    obligations: {
      purchases: 0,
      adViews: 0,
      period: 'day'
    },
    perks: {
      purchasesReceived: 1,
      period: 'day',
      specialRule: '60日以上滞在で強制的に1-3階ランダム配置'
    }
  }
]

// ルーレット基本確率
export const BASE_PROBABILITIES = {
  1: 0.30, // 30%
  2: 0.20, // 20%
  3: 0.15, // 15%
  4: 0.12, // 12%
  5: 0.10, // 10%
  6: 0.08, // 8%
  7: 0.03, // 3%
  8: 0.02  // 2%
}

// 確率修正要素
export const PROBABILITY_MODIFIERS = {
  // ボーナス要素（上昇確率UP）
  referralPerPerson: 0.02,      // 紹介1人につき+2%
  adViewDouble: 0.03,            // 広告2倍視聴で+3%
  consecutiveLogin7Days: 0.01,   // 7日連続ログイン+1%
  consecutiveLogin30Days: 0.05,  // 30日連続ログイン+5%
  debtCleared: 0.10,             // 借金完済（2階）+10%

  // ペナルティ要素（下降確率UP）
  obligationNotMet: 0.15,        // 義務未達成+15%下位確率
  longStayPerWeek: 0.03,         // 30日以上同階層で+3%/週
  tier8LongStay: 60               // 8階60日以上で強制降格（日数）
}