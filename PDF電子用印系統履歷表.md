# 專案名稱：PDF 電子用印系統 (E-seal Desktop App)

## 專案簡介
開發一款基於 Electron 的跨平台桌面應用程式，旨在解決企業文件電子化流程中的「用印」需求。系統允許使用者將數位印章（如公司發行章、個人簽名）拖放至 PDF 文件的任意位置，並支援動態生成當日日期壓印，提供「所見即所得」的操作體驗，有效提升行政效率並減少紙張浪費。

## 技術架構與關鍵技能
*   **核心框架 (Core Framework):**
    *   **Electron:** 構建跨平台桌面應用程式，實現與作業系統的原生整合（如檔案系統讀寫、原生對話框）。掌握 Main Process 與 Renderer Process 之間的 IPC (Inter-Process Communication) 通訊機制。
*   **PDF 核心處理 (PDF Core Processing):**
    *   **pdf-lib:** 負責後端 PDF 生成與編輯。實作複雜的座標轉換邏輯，將前端 DOM 元素的像素位置精確映射至 PDF 內部的 Point 座標系（處理 Y 軸反轉與 DPI 縮放問題），確保匯出結果與預覽畫面完全一致。
    *   **pdfjs-dist:** 負責前端 PDF 渲染預覽。實現高效的 Canvas 繪圖，支援多頁數文檔的快速載入與縮放顯示。
*   **前端互動與視覺 (Frontend Interactivity & Graphics):**
    *   **interact.js:** 實作印章物件的拖曳 (Drag & Drop) 與邊界限制功能，提供流暢的 UI 互動體驗。
    *   **HTML5 Canvas API:** 動態繪製包含「當前日期」的印章圖層。實作自定義邏輯以處理文字與圓弧的相對位置、字體大小自適應縮放，並將其轉換為 Base64 圖像嵌入 PDF。
*   **封裝與部署 (Packaging & Deployment):**
    *   **electron-packager:** 建立自動化構建流程，將應用程式打包為免安裝的 Windows 可執行檔 (.exe)，包含資源檔加密 (ASAR) 與圖示整合。

## 專案亮點與解決難題 (Key Achievements)
*   **精確的座標映射演算法 (Precise Coordinate Mapping):** 解決了瀏覽器視窗 (Screen Pixels) 與 PDF 文件標準 (72 DPI Points) 之間的座標換算難題。成功處理了 PDF 頁面不同縮放比例下的定位偏移，實現真正的 WYSIWYG（所見即所得）。
*   **動態日期印章生成 (Dynamic Date Stamp Generation):** 開發了一套演算法，能根據印章尺寸自動調整日期文字的大小與位置（如發行章與機密文件的不同佈局），無需美術人員手動修圖，自動帶入系統當日日期。
*   **高效能批次處理 (High-Performance Batch Processing):** 實作「一鍵全頁用印」功能，透過非同步處理 (Async/Await) 優化 PDF 頁面遍歷效能，能在數秒內完成百頁文件的蓋章作業。
*   **直覺的使用者體驗 (Intuitive UX):** 設計極簡化介面，支援拖拉上傳、即時預覽、雙擊移除印章、獨立調整日期顯示設定（大小/位移），大幅降低使用門檻。
