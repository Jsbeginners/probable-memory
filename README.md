# probable-memory
Jsbeginners的库

# 智慧城市 · 上海 Cesium 场景

基于 CesiumJS 和 Vite 的上海黄浦江场景。默认使用 Esri World Imagery 和 OpenStreetMap 建筑轮廓；支持接入经过授权的实景 3D Tiles、Cesium World Terrain 和 glTF/GLB 地标模型。

## 本地运行

需要 Node.js 22.17+ 和支持 WebGL 的浏览器：

```bash
npm install
npm run dev
```

打开终端显示的 Local 地址。拖动地图可旋转视角，滚轮缩放；面板提供江景、俯瞰视角、天气、上海日期及时间、云层和画质控制。运行时影像需要联网。

## 接入高精度资源

1. 复制 `.env.example` 为 `.env.local`。
2. 按文件注释填写有使用权限的资源地址或 Cesium ion 资源 ID。可分别启用地形、实景 3D Tiles 和一个 glTF/GLB 地标；不配置时保留内置场景。
3. 修改后重启 `npm run dev`。生产构建时变量会打包进浏览器代码，因此 ion 令牌应仅具备必要的只读权限，并限制授权资源及可用来源；不要把 `.env.local` 提交到 Git。

3D Tiles URL 应指向 `tileset.json`，模型地址可指向 glTF 或 GLB；远端服务器须允许浏览器跨域访问。地标坐标使用 WGS84，经纬度为度、高度为米；模型原点、轴向和高程应依据资产自身情况校准。Cesium ion 资源需由账号授予相应访问权。瓦片初始化失败时保留示意建筑；首个瓦片可见后隐藏示意建筑，资源应覆盖当前上海区域。服务只覆盖局部时，其余区域的示意建筑也会隐藏。

World Terrain 是可选在线服务。示意建筑和水面以椭球高度近似定位，启用地形后可能出现高程不匹配；实际项目应使用统一的坐标系和高程基准，并对各资产进行校准。接入其他服务时请遵守其许可、署名和访问规则。

## 渲染能力及限制

- 太阳位置按所选上海日期与时间计算，支持阴影、HDR 色调映射、雾和天空大气；均衡和高画质在支持的硬件渲染环境启用阴影；高画质增加屏幕空间环境遮蔽和柔和阴影。低画质关闭阴影及 HDR 并降低渲染分辨率。已识别的软件渲染器会关闭阴影以避免画面异常。高画质对 GPU 有较高要求。
- glTF/GLB 模型使用 Cesium 支持的内置 PBR 材质；材质和纹理的质量由模型资产决定。默认 OSM 建筑是没有立面纹理的挤出体，并非写实 PBR 模型。
- 阴影、环境照明和屏幕空间环境遮蔽只是光照近似；没有实现覆盖城市的实时全局光照、光线追踪或预烘焙光照。夜间泛光不会自动创建建筑窗灯或城市灯光。
- 黄浦江局部使用 OSM 河道轮廓与自定义水面 Shader 模拟动态波纹、视角相关颜色和太阳高光，不是实时物理反射或水动力模拟。高度按椭球近似，真实地形或实景瓦片可能遮挡水面，需根据资产调整。
- 天空使用基于太阳方向的程序化后处理 Shader，结合程序云模拟昼夜和天气；深度纹理不可用时回退到 Cesium 天空。天空和云层是视觉近似，不是物理体积云；透明物体可能不写入深度而受到天空覆盖。雨雪为屏幕后处理，雾与大气为视觉模拟，均不代表实时天气。高性能及视觉表现取决于浏览器、GPU 和数据。

## 数据来源

- 影像：Esri World Imagery，© Esri、Maxar、Earthstar Geographics 及 GIS 用户社区，受网络和服务可用性影响。
- 建筑：© [OpenStreetMap 贡献者](https://www.openstreetmap.org/copyright)，遵循 ODbL。数据提取于 2026-11-07，约覆盖东经 121.478–121.522°、北纬 31.225–31.249°，包含约 2,978 个轮廓。高度优先使用 OSM 高度或层数，缺失时为估算值，可能不完整或过时。
- 黄浦江水面轮廓：© OpenStreetMap 贡献者，[way 71118583](https://www.openstreetmap.org/way/71118583)，遵循 ODbL，仅覆盖部分河段。

代码主要位于 `src/scene.js`（基础城市）、`src/environment.js`（光照与画质）、`src/water.js`（水面）、`src/sky.js`（天空）、`src/assets.js`（可选资源）和 `src/main.js`（交互）。生产构建使用 `npm run build`，使用 `npm run preview` 预览。

## 技术参考

- [Cesium 官方 Ocean Details](https://github.com/CesiumGS/cesium/wiki/Ocean-Details)：参考视角相关水色、法线扰动和高光等海面渲染思路。本项目的河面 Shader 为独立实现，不含真实反射或水深测量。
- [Cesium 官方项目](https://github.com/CesiumGS/cesium)：本项目使用其地理渲染与材质能力。第三方实景数据和模型的授权仍需分别核实。
