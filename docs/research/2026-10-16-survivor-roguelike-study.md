# 肉鴿射擊與《細胞保衛戰》玩法研究
建立日期：2026-10-16

## 研究目的與範圍

整理《細胞保衛戰》、Survivor.io、Vampire Survivors、Brotato 的官方商店頁、官方更新公告與商店展示畫面，作為《星核防線》後續玩法討論的參考。本文只把來源明確支持的內容列為「可查證事實」；從這些內容推導出的建議另標為「設計推論」，不宣稱是原作已實作的機制。

資料查閱日期：2026-10-16。商店頁與遊戲內容會更新，未來應再次確認。

## 本專案已確認的操作限制

以下是《星核防線》的設計前提，不是同類遊戲的事實：

- 守衛者固定在中央原地，不可左右走位，也不可翻滾、衝刺或閃避。
- 玩家可在原地 360 度旋轉，選擇射擊方向。
- 不採用必須移動到掉落物旁才能拾取的設計。
- 不設回血機制；攻擊物、獎勵物和防禦效果必須讓玩家一眼分辨。戰鬥中不應掉落看起來像藥瓶、愛心或回血道具的物件。

**現況核對提醒：**指定工作區在本次研究時仍留有舊版水平移動與靠近掉落物拾取邏輯：README 寫有左右移動；`dist/src/main.js` 依指標水平座標更新目標位置；`dist/src/game.js` 依角色與掉落物的距離拾取。這些是目前程式現況，不符合上方已確認的設計前提，本文不把它們寫成已完成的固定瞄準實作。

## 一手來源可查證的玩法事實

### 《細胞保衛戰》

Google Play 官方商店頁描述：

- 戰鬥中可從三個隨機技能中選一個強化。
- 官方宣稱頭目有各自的行動軌跡與弱點部位；精準攻擊弱點可擊退頭目。
- 官方宣稱關卡有不同難度與解法，技能選擇會影響戰鬥策略。

這些是商店頁的官方玩法說明，**不代表本研究已逐隻驗證其實際 Boss 行為**。商店頁也沒有說明寶箱的所有觸發細節，因此不在此補寫未核實的機制。

來源：[《細胞保衛戰》Google Play 官方商店頁](https://play.google.com/store/apps/details?hl=zh-TW&id=defense.roguelike.cell.shoot.survivor)

### Survivor.io

Google Play 官方商店頁描述：

- 玩家以單手操作在地圖中對付大量敵人。
- 遊戲主打 roguelite 技能組合與不同難度關卡。
- 頁面用「你與其他倖存者」描述背景，但沒有足夠資料證明本頁所述核心玩法包含可組隊的戰鬥後排英雄，因此本文不把它當作英雄編隊系統的證據。

來源：[Survivor.io Google Play 官方商店頁](https://play.google.com/store/apps/details?hl=en_US&id=com.dxx.firenow)

### Vampire Survivors

Steam 官方商店頁描述：

- 每局收集金幣，用於購買可幫助後續倖存者的局外升級。
- 官方上手提示建議先取得兩至三種攻擊武器，再集中升級其中一兩種，鼓勵形成流派。
- 官方商店頁將遊戲定位為時間生存與 roguelite，並支援觸控螢幕。

來源：[Vampire Survivors Steam 官方商店頁](https://store.steampowered.com/app/1794680/Vampire_Survivors/)

### Brotato

Steam 官方商店頁描述：

- 角色可同時持有最多六把武器，並透過角色特性、物品和武器組出不同玩法。
- 遊戲以短時長敵潮作為戰鬥段落，玩家收集材料獲得經驗，並在敵潮之間從商店取得物品。
- 官方頁列有調整敵人生命、傷害和速度的難度選項。

來源：[Brotato Steam 官方商店頁](https://store.steampowered.com/app/1942280/Brotato/)

## 對《星核防線》的設計推論

以下是根據上述官方資料與本專案操作限制提出的建議，屬於本專案設計推論，不是對原作機制的描述。

### Boss：每隻都要改變玩家的瞄準決策

既然玩家固定原地，只能轉向瞄準，Boss 的差異應體現在行軍軌跡、弱點暴露方向、攻擊預警與身體段落，而不能只換配色或外型。每隻至少要有：

1. 一種清楚可辨的行軍路線，例如沿外圈慢推、斜向切入後折返、繞核心公轉、兩條路線交錯掩護。
2. 一種可預讀的招式預警，讓玩家有時間把瞄準方向轉到可擊破的身體弱點。
3. 一個不同於其他 Boss 的反制方式，例如打斷蓄力段、先拆護衛節、攻擊露出的鏡面弱點，或利用彈道反彈打到背側。
4. 行軍路線最後仍會威脅中央核心；預警是讓玩家判斷先打哪一段、轉向哪裡，不是要求玩家走位閃避。

### 危險、獎勵與技能選擇必須使用不同視覺語言

- 危險攻擊使用紅橘色，並以明確的線、扇區、落點圈或倒數表現生效位置與時間。
- 寶箱使用穩定的金色外框、鎖具或耐久條，並明確標示「擊破後選技能」；不要做成會像敵彈一樣飛向玩家的物件。
- 防禦資源只使用盾形或護盾符號，搭配 HUD 同步提示；不使用藥瓶、愛心或看似補血的圖示。
- 攻擊與獎勵不得共用顏色、輪廓、運動方式或命中音效。寶箱被擊破後短暫停格，再直接進入三選一，清楚表達這是獎勵事件。

### 技能選擇應改變攻擊方式

Vampire Survivors 的武器集中升級建議，以及 Brotato 的多武器搭配，支持「技能組合要改變實際打法」這個方向。建議戰鬥三選一優先放能改變彈道、命中範圍或擊破節奏的技能，例如：

- 反彈：子彈撞到身體節後折射到另一段。
- 巨型彈：彈體變大並提高單發傷害，但降低射速。
- 分裂或連鎖：擊破一段後把傷害傳到鄰近身體段。
- 弱點鎖定：對露出或標記的弱點提高命中效果。
- 穿透蓄勢：穿透越多節，後續命中越強，但每次命中仍有明確傷害上限。

以上是可測試的技能方向，不代表已完成平衡。寶箱解析率、額外開箱數等偏向獎勵效率的升級，不應擠掉戰鬥中改變打法的主要技能選項。

### 英雄與局外成長

本專案可以設計免費解鎖的英雄／支援編隊作為長期目標，但目前查到的同類官方頁面不足以支持「抽英雄編隊是這類遊戲必要核心」。若採用，建議以關卡解鎖、挑戰獎勵或研究點解鎖，不做付費抽取；一名主英雄搭配少量支援角色，每位提供不同攻擊規則或互補效果，而不是疊加高額常駐傷害，避免破壞關卡難度曲線。

## 官方商店展示畫面

以下直接連到官方商店的展示圖檔；若圖片網址失效，請從對應商店頁重新開啟圖片集。

### 《細胞保衛戰》Google Play 截圖

- [官方截圖 1](https://play-lh.googleusercontent.com/pyo7BCc1FvwAMwWas-197EjSzxCJuMF8Hkho-xshUrau5Nntmg0ejNCI5Qp_t6oVva9L4po5m1ROPKZMp9t3zw=w526-h296)
- [官方截圖 2](https://play-lh.googleusercontent.com/3SVkL0PXa37L3sqo7ae4U-ySMxTpWTZz40tKr2AKHdnT7Hm7Wddh3GxlOmGnYS5c5SAD8TuUSs-I4gyKV9PHrQ=w526-h296)
- [官方截圖 3](https://play-lh.googleusercontent.com/aRYu8KPoLiNT6n8DmaVyRvA_BTzrS54bokUlgXKGJ6YQgVnnxnF2qJXAtLuiRDq318XG4ExBHzm0AR87DNbsbg=w526-h296)
- [官方截圖 4](https://play-lh.googleusercontent.com/KcfAG-LKlVxjfWKJrI1JGlmBsHYdUtUbPQMadgLSMgG8W8kerZjDajB2DACZj__tQdUWlhqszCiD1Gqv8IpfIQ=w526-h296)
- [商店頁完整圖片集](https://play.google.com/store/apps/details?hl=zh-TW&id=defense.roguelike.cell.shoot.survivor)

### Survivor.io Google Play 截圖

- [官方截圖 1](https://play-lh.googleusercontent.com/MMMP-SPyP1C3Wgn2qNlBlh-kytzRbUm5XXSiPUpthG81sPLiv-zMS8ADgNQBCd6vqE9wIl67e_zDf8NkpF7H=w526-h296)
- [官方截圖 2](https://play-lh.googleusercontent.com/-HP8wruG8qE1uCD_Dotr8MlnFOWCfcpRR-yE2FVPtDgCv_9CR3cYt1tMZnNk26Vx04VkiVDfynInlDhpWddA8g=w526-h296)
- [商店頁完整圖片集](https://play.google.com/store/apps/details?hl=en_US&id=com.dxx.firenow)

### Brotato Steam 截圖

- [官方截圖 1](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1942280/ss_79be0eea0299da76bc50cef160fb669509f74e0b.1920x1080.jpg)
- [官方截圖 2](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1942280/ss_61ad3d242282311207828c1a7d87c1c9d7b4d8bf.1920x1080.jpg)
- [Steam 商店頁](https://store.steampowered.com/app/1942280/Brotato/)

### Vampire Survivors Steam 截圖

- [官方截圖 1](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1794680/ss_6c55afe36be2a7784bf18cb9b3218321ae2d10e5.1920x1080.jpg)
- [官方截圖 2](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1794680/ss_6105ad3d6af52593c31d915bf39e91512611ea8e.1920x1080.jpg)
- [Steam 商店頁](https://store.steampowered.com/app/1794680/Vampire_Survivors/)

## 結論

可核實的同類遊戲資料支持三個方向：敵潮與關卡要有可辨識節奏；局內選擇要能形成不同攻擊流派；局外成長要讓下一局有明確目標。對《星核防線》而言，這些原則必須配合固定位置、360 度瞄準的規則：用 Boss 行軍路線與身體弱點迫使玩家改變瞄準決策，用清晰預警讓人能讀懂危險，並以彈道和段落反應打造技能差異。不得依賴走位、閃避或移動撿取來增加操作深度。
