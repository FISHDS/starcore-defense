# 星核防線固定站位戰鬥改版計畫
建立日期：2026-10-16

**目標：** 讓 25 關戰役以固定站位、原地轉向瞄準為核心，並以有辨識度的頭目路線、可反制攻擊、有效技能組合和可驗證的難度曲線支撐每一關。

**架構：** `campaign.js` 為關卡指定中央守點或底線迎擊；`input.js` 把手機觸控轉成瞄準角度；`game.js` 使用固定角色座標和有方向的藥丸；`routes.js` 提供兩種站位可用的敵軍路線；頭目預警、弱點和技能都沿用這套瞄準操作。技能、研究與存檔保持免費遊玩，不新增廣告或付費項目。

**技術：** 原生 JavaScript、Canvas、Node.js 測試、Playwright 手機尺寸驗收、GitHub Pages。

## 固定規則

- 主角不走位、不閃避；每關固定在中央或底線，玩家只原地轉向瞄準。
- 頭目攻擊必須能靠改變瞄準方向、集中攻擊或破壞指定部位來應對。
- 不提供回血技能或需要移動接觸的獎勵。
- 保留身體寶箱，必須直接射擊打開；技能要能改變攻擊選擇與傷害方式。
- 頭目數量依關卡機制安排；單頭、雙頭和非頭目壓力關都要有清楚差異。
- 每隻新頭目必須經主代理在手機尺寸驗收後才接入正式關卡。

## 任務 1：把觸控和角色改成固定瞄準

**檔案：** 修改 `dist/src/input.js`、`dist/src/main.js`、`dist/src/game.js`、`dist/src/render.js`、`dist/index.html`、`dist/style.css`；新增或調整 `tests/input.test.js`、`tests/game.test.js`。

- [ ] 先測手機觸控點能依固定角色座標轉成角度，角色座標不因輸入改變。
- [ ] 每關由資料指定中央或底線；瞄準角度決定藥丸速度方向。
- [ ] 移除左右鍵移動與滑動角色；畫出可辨認的瞄準方向和兩種站位提示。
- [ ] 測試兩種站位都不改變角色座標，觸控四個方向產生四個正確射擊方向。

## 任務 2：讓敵人和頭目攻擊能以瞄準反制

**檔案：** 修改 `dist/src/routes.js`、`dist/src/mechanics.js`、`dist/src/boss-rig.js`、`dist/src/game.js`、`dist/src/boss-art.js`、`dist/src/render.js`、`dist/src/tutorial.js`；新增或調整 `tests/boss-patterns.test.js`、`tests/mechanics.test.js`、`tests/campaign.test.js`。

- [ ] 每一區至少安排中央盤繞與底線進攻路線；不同頭目以不同轉向、分岔、交錯、蓄力或弱點窗口塑造打法。
- [ ] 攻擊預警標出可反制部位；擊破蓄力節或瞄準危險源會取消/削弱攻擊，玩家不必閃避。
- [ ] 單頭與雙頭數量依招式需求配置，不把每區決戰都固定為雙頭。
- [ ] 測試攻擊預警、可反制窗口、部位擊破效果及碰核心失敗條件。

## 任務 3：技能與局外成長盤點

**檔案：** 修改 `dist/src/content.js`、`dist/src/game.js`、`dist/src/meta.js`、`dist/src/storage.js`、`dist/src/main.js`、`dist/index.html`、`dist/src/render.js`；新增或調整 `tests/evolutions.test.js`、`tests/extended-growth.test.js`、`tests/storage.test.js`。

- [ ] 逐項驗證技能描述和實際效果；刪除回血、移動拾取和低價值寶箱加成技能，保存舊存檔相容性。
- [ ] 保留並平衡穿透、反彈、擴大彈體、電弧、範圍爆裂、弱點標記等不同攻擊流派；提升毒素對長鏈的持續價值。
- [ ] 寶箱三選一維持免費重抽；局外研究改為有效戰鬥成長，避免純數值升級造成掛機通關。
- [ ] 用測試確認沒有任何技能或掉落回復核心耐久或要求主角移動取得。

## 任務 4：頭目造型和動作驗收

**檔案：** 新頭目素材放在 `dist/assets/bosses/`；按驗收結果修改 `dist/src/boss-profiles-a.js`、`dist/src/boss-profiles-b.js`、`dist/src/boss-art.js`、`dist/src/boss-rig.js` 和相應 `tests/`。

- [ ] 每個造型有專屬輪廓、身體節、招牌攻擊和預警；不以共用通用剪影冒充完成。
- [ ] 保持簡潔向量、低繪製成本，頭部在 80–90px、身節在 40–50px 可辨識。
- [ ] 每隻新增頭目先出現在獨立試玩，主代理用 360×740、390×844 實際檢視並測過動作後才能進戰役。

## 任務 5：平衡試跑、手機驗收和發布

**檔案：** 修改 `scripts/simulate-campaign.mjs`、相關測試、`README.md` 和必要的快取版本標記。

- [ ] 以固定角度、隨機轉向、鎖定最迫近頭部、優先打寶箱等策略模擬早中後期與局外成長。
- [ ] 確認無法只靠長時間固定方向快速通關，同時有合理瞄準策略能通過各關；記錄各種策略的勝率和失敗位置。
- [ ] 完整跑 `npm test`、`npm run balance`，用手機尺寸檢查首頁、戰鬥、技能選擇、頭目、成長與結算畫面及音效。
- [ ] 更新 README 操作說明，推送 GitHub，打開公開網址用手機尺寸點開始並驗證新版內容。
