# 「最後一班」透明 Sprite Atlas 規格
建立日期：2026-10-16

## 用途

本檔為獨立候選 sprite atlas：`dist/assets/bosses/prototypes/last-shift-coffin-leader-atlas.svg`。SVG 畫布是 336×240，沒有背景填色；所有部件沿用手機拼圖的黑色外框、銀白、電紫、金色寶箱和紅色攻擊預警。只新增圖像和文件，尚未由遊戲程式載入。現有 `boss-art.js` 對透明圖片以 `Image` 載入、必要時預先縮圖，Canvas 用 `drawImage` 繪製；本 atlas 可按下表的 source rectangle 裁切，不需要解析路徑。

## Sprite 裁切座標

座標原點是 atlas 左上角，單位為 SVG 內在像素；`x, y, 寬, 高` 可直接當 Canvas `drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)` 的 source rectangle。

| 圖層 ID | source x | source y | source 寬 | source 高 | 遊戲用途 |
|---|---:|---:|---:|---:|---|
| `cell-head` | 0 | 0 | 96 | 96 | `segments[0]` 頭部；不可破壞 |
| `cell-glove` | 112 | 8 | 44 | 44 | 承重手套身節 |
| `cell-coffin` | 168 | 8 | 44 | 44 | 窄長梯形棺材身節 |
| `cell-shoe` | 224 | 8 | 44 | 44 | 舞鞋身節 |
| `cell-treasure-chest` | 280 | 8 | 44 | 44 | 金扣近方形寶箱節 |
| `cell-lift-warning` | 0 | 112 | 128 | 100 | 兩手／肩臂抬起棺材的攻擊預警姿勢 |
| `cell-stumble-pose` | 144 | 112 | 192 | 112 | 頭、棺材、手套、舞鞋錯拍的失步姿勢 |

每個 `cell-*` 群組 ID 只負責定位；可見零件由 `<use>` 指向 `defs` 中對應的 symbol。Sprite 本身保留透明空白，無標籤文字、背景圖片或外部字型。Atlas 四周與圖格間留有透明間隔，裁切時使用表內座標，不要把整張 336×240 圖直接當單一 sprite 縮放。

## Canvas 載入方式

```js
const atlas = new Image();
atlas.decoding = 'async';
atlas.src = new URL('../assets/bosses/prototypes/last-shift-coffin-leader-atlas.svg', import.meta.url).href;
await atlas.decode();

// 例：把 96×96 的頭畫在遊戲節點中心 (x, y)，再依路徑角度旋轉。
ctx.save();
ctx.translate(x, y);
ctx.rotate(angle);
ctx.drawImage(atlas, 0, 0, 96, 96, -48, -48, 96, 96);
ctx.restore();

// 例：棺材身節 source=(168,8,44,44)，目標大小可維持 44×44。
ctx.drawImage(atlas, 168, 8, 44, 44, targetX - 22, targetY - 22, 44, 44);
```

姿勢圖格可用相同的九參數 `drawImage`；若要在 Canvas 內旋轉整組姿勢，先 `save`，平移到目標中心、旋轉，再以格子中心為繪製原點，最後 `restore`。正式遊戲仍需由共用骨架提供關節方向和頭部回拉；本 atlas 不包含碰撞範圍或動畫程式。

## 骨架契約與未驗收項目

- `cell-head` 對應既有共用骨架的頭節 `segments[0]`，不加入頭部傷害判定。
- 三種身節可依既有 `segments[1…n]` 配置重複，沿相鄰關節方向旋轉；破節後頭部平滑回拉仍由共用路徑負責。
- `cell-treasure-chest` 必須維持可辨識、可擊中的方形金扣外觀；它不能與窄長紫黑梯形棺材混用裁切座標。
- `cell-lift-warning` 是預警姿勢樣稿，不自動令玩家受傷；正式行為需連到特定可破壞承重節，或允許玩家轉向攔截發出的節拍塊。
- **尚未**實際由瀏覽器將這張 atlas rasterize/canvas-crop；尚未驗證手機瀏覽器相容、低階裝置效能、角色骨架動態、碰撞、動畫、路線或關卡難度。不得宣稱動態或碰撞驗收完成。
