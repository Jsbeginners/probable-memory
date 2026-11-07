# probable-memory
Jsbeginners的库

# 智慧城市 · Cesium 场景

基于 CesiumJS 和 Vite 的交互式智慧城市示例。场景使用程序化的山脉、河流、桥梁及三个城市片区，包含 Cesium 云、大气和太阳光照，并提供晴、雨、雪、雾与时间调节。

## 本地运行

需要 Node.js 20.19+ 或 22.12+。在项目文件夹打开终端：

```bash
npm install
npm run dev
```

打开终端显示的本地网址。鼠标左键旋转视角、滚轮缩放；可通过面板切换天气、云层和时间。生产构建使用 `npm run build`，使用 `npm run preview` 预览。

## 场景说明

这是虚构的示意场景，建筑和地形由代码生成，并非真实城市数据。云使用 Cesium CloudCollection 的体积云近似；雨雪雾为屏幕后处理效果。时间滑块通过太阳光照展示不同时刻；当前版本不自动推进时间。无需 Cesium ion token 或在线地形服务。首次安装依赖需要联网，运行需要支持 WebGL 的浏览器。

场景代码在 `src/scene.js`，界面逻辑在 `src/main.js`，样式在 `src/style.css`。可在此基础上接入真实地形、影像与 3D Tiles 数据。
