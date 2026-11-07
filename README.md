# probable-memory
Jsbeginners的库

# 智慧城市 · 上海 Cesium 场景

这是基于 CesiumJS 和 Vite 的上海智慧城市演示。场景以黄浦江、外滩和陆家嘴为中心，使用 Esri World Imagery 在线卫星影像，并结合项目内置的 OpenStreetMap 建筑轮廓生成三维建筑。可切换天气、云层和时间。

## 本地运行

需要 Node.js 20.19+ 或 22.12+。在项目文件夹打开终端：

```bash
npm install
npm run dev
```

打开终端显示的本地网址。拖动旋转视角，滚轮缩放；可通过面板切换天气、云层和时间。生产构建使用 `npm run build`，使用 `npm run preview` 预览。

## 数据来源与范围

- 背景影像：Esri World Imagery，© Esri、Maxar、Earthstar Geographics 及 GIS 用户社区。运行时需联网，影像可用性受服务及网络条件影响。
- 建筑：© [OpenStreetMap 贡献者](https://www.openstreetmap.org/copyright)，数据遵循 ODbL。轮廓提取于 2026-11-07，范围约为东经 121.478–121.522°、北纬 31.225–31.249°，共约 2,978 个建筑轮廓，仅覆盖演示区域。建筑高度优先使用 OSM 的高度或层数信息；缺少数据时按示意高度挤出，并非真实建筑高度。建筑没有真实立面纹理，数据可能不完整或过时。
- 场景基于椭球地面，未接入真实地形；上海核心区以平原为主，不人为添加山脉。黄浦江来自影像，而非独立水体模型。

云使用 Cesium CloudCollection 的体积云近似；雨雪雾为屏幕后处理效果。时间滑块通过太阳光照展示不同时刻，不自动推进时间。界面数值为模拟数据。运行需要支持 WebGL 的浏览器；当前项目不需要 Cesium ion token。

场景代码在 `src/scene.js`，建筑数据在 `src/shanghai-buildings.json`，界面逻辑在 `src/main.js`，样式在 `src/style.css`。可进一步接入更高精度的三维城市模型、真实地形及实时业务数据。
