# E-seal 電子章 DEBUG 詳細過程

## 今日新增/修改重點

1) 日期文字大小可獨立調整
- UI 新增滑桿（60%~160%），可獨立放大/縮小章內日期文字。
- 匯出時同步使用 `dateScale` 倍率，確保輸出與畫面一致。

2) 日期文字上下位置可獨立調整
- UI 新增滑桿（-40px~40px），可微調日期在章內的上下位置。
- 匯出時將畫面像素位移換算到 PDF 座標，並修正 y 軸方向差異。

3) 匯出與畫面位置對齊修正
- 先改為「以畫面像素為基準」換算到 PDF：`drawW = centerImg.width / scale`、`drawH = centerImg.height / scale`。
- 再修正 y 軸方向差異：`offsetPdf = -(dateYOffset) / scale`。

---

## 變更檔案

- `index.html`
- `renderer.js`

---

## 程式碼修正摘要

### 1) UI 新增日期大小/上下位置滑桿

**檔案：** `index.html`

新增：
```html
<div class="control-row">
  <span>日期文字</span>
  <span id="dateSizeValue" class="muted">100%</span>
</div>
<input id="dateSizeSlider" type="range" min="60" max="160" value="100" />
<div class="control-row">
  <span>日期上下</span>
  <span id="dateYOffsetValue" class="muted">0px</span>
</div>
<input id="dateYOffsetSlider" type="range" min="-40" max="40" value="0" />
```

---

### 2) 日期大小/位置參數與預覽同步

**檔案：** `renderer.js`

新增狀態與控制元件：
```js
const dateSizeSlider = document.getElementById('dateSizeSlider');
const dateSizeValue = document.getElementById('dateSizeValue');
const dateYOffsetSlider = document.getElementById('dateYOffsetSlider');
const dateYOffsetValue = document.getElementById('dateYOffsetValue');
```

新增 placement 參數：
```js
const newPlacement = {
  ...,
  withDate: true,
  dateScale: 1,
  dateYOffset: 0,
};
```

預覽字體大小與位置同步：
```js
const fontSize = Math.max(10, placement.width * 0.13 * (placement.dateScale || 1));
dateOverlay.style.fontSize = `${fontSize}px`;
dateOverlay.style.transform = `translateY(${placement.dateYOffset || 0}px)`;
```

滑桿事件：
```js
dateSizeSlider.addEventListener('input', () => {
  const scale = Math.max(0.6, Math.min(1.6, (Number(dateSizeSlider.value) || 100) / 100));
  placement.dateScale = scale;
  dateSizeValue.textContent = `${Math.round(scale * 100)}%`;
  overlay.style.fontSize = `${Math.max(10, placement.width * 0.13 * scale)}px`;
});

dateYOffsetSlider.addEventListener('input', () => {
  const offset = Math.round(Number(dateYOffsetSlider.value) || 0);
  placement.dateYOffset = offset;
  dateYOffsetValue.textContent = `${offset}px`;
  overlay.style.transform = `translateY(${offset}px)`;
});
```

---

### 3) 匯出時文字大小/位置對齊修正

**檔案：** `renderer.js` (`buildStampedPdf`) 內：

匯出尺寸改用「畫面像素 / scale」：
```js
const centerImg = createTextImage(dateCenterText, fontSizePx);
const centerPng = await pdfDocLib.embedPng(base64ToUint8(centerImg.base64));
let drawH = centerImg.height / scale;
let drawW = centerImg.width / scale;
```

匯出上下位移修正（PDF y 軸反向）：
```js
const offsetPdf = -(placement.dateYOffset || 0) / scale;
const textY = pdfY + pdfH / 2 - drawH / 2 + offsetPdf;
```

---

## 結論

- 日期文字大小與上下位置已可獨立調整。
- 匯出與畫面顯示已使用相同「畫面像素 → PDF」換算方式，並修正 y 軸方向差異。

如後續仍有偏差，可再依實際輸出微調 `offsetPdf` 的倍率。
## 今日修改內容

1) 點擊印章預設位置與多頁處理
- 點擊印章後，預設放在每一頁的右下角（邊距 20px）。
- 多頁 PDF 會自動在每一頁生成印章，不需要的頁面可手動刪除。

2) 發行章與其他章的預設參數
- 發行章：寬高 100px、日期文字 60%、日期上下 2px。
- 其他章：寬高 120px、日期文字 100%、日期上下 2px。

3) 日期文字顏色與印章字色一致
- 新增 CSS 變數 `--stamp-red`，預覽與匯出統一使用此顏色。

4) 日期文字匯出位置對齊
- 匯出時以「畫面像素 / scale」換算成 PDF 尺寸，並修正 y 軸方向差異。

---

## 打包成 EXE 指令

在專案根目錄執行：

```
cd C:\Users\sky.lo\Desktop\E-seal電子章
npx electron-packager . E-seal --platform=win32 --arch=x64 --out=dist --overwrite --asar
```

完成後檔案位置：
`dist\E-seal-win32-x64\E-seal.exe`
