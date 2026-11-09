import * as Cesium from 'cesium';

// Optional assets are configured with Vite variables. They are public in the
// browser bundle: use a restricted, read-only token and never a secret key.
const env = import.meta.env;
const asText = value => typeof value === 'string' ? value.trim() : '';
const optionalNumber = value => {
  const text = asText(value);
  if (!text) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
};

/**
 * Load optional licensed data while retaining the built-in OSM city as fallback.
 * tilesLoaded means the tileset was initialized; it does not guarantee coverage
 * at the current camera. The fallback is hidden only when a tile becomes visible.
 * onStatus receives a human-readable Chinese message and level ('info'|'warning').
 */
export async function loadOptionalAssets(viewer, options = {}) {
  const config = options.config || env;
  const notify = typeof options.onStatus === 'function' ? options.onStatus : () => {};
  const setFallback = typeof options.setFallbackBuildingsVisible === 'function'
    ? options.setFallbackBuildingsVisible : () => {};
  const warnings = [];
  const result = { terrainLoaded: false, tilesLoaded: false, tileset: undefined, landmark: undefined, warnings, dispose };
  let disposed = false;
  let terrain;
  const previousTerrain = viewer.terrainProvider;
  const removers = [];
  const alive = () => !disposed && !viewer.isDestroyed();
  const status = (message, level = 'info') => {
    if (level === 'warning') warnings.push(message);
    if (alive()) notify(message, level);
  };
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const remove of removers) remove();
    if (viewer.isDestroyed()) return;
    if (result.tileset) viewer.scene.primitives.remove(result.tileset);
    if (result.landmark) viewer.scene.primitives.remove(result.landmark);
    if (terrain && viewer.terrainProvider === terrain) viewer.terrainProvider = previousTerrain;
    setFallback(true);
  }

  const token = asText(config.VITE_CESIUM_ION_TOKEN);
  const terrainRequested = asText(config.VITE_CESIUM_TERRAIN).toLowerCase() === 'true';
  const tilesUrl = asText(config.VITE_CESIUM_3DTILES_URL);
  const assetIdText = asText(config.VITE_CESIUM_3DTILES_ION_ASSET_ID);
  const landmarkUrl = asText(config.VITE_LANDMARK_URL);
  if (token) Cesium.Ion.defaultAccessToken = token;

  async function loadTerrain() {
    if (!terrainRequested) return;
    if (!token) { status('未配置 Cesium ion 令牌，继续使用椭球地面。', 'warning'); return; }
    try {
      const provider = await Cesium.createWorldTerrainAsync({ requestVertexNormals: true, requestWaterMask: true });
      if (!alive()) return;
      terrain = provider;
      const removeTerrainError = provider.errorEvent.addEventListener(() => {
        if (!alive() || viewer.terrainProvider !== provider) return;
        viewer.terrainProvider = previousTerrain;
        result.terrainLoaded = false;
        status('地形瓦片加载失败，已恢复椭球地面。请检查令牌、授权和网络。', 'warning');
      });
      removers.push(removeTerrainError);
      viewer.terrainProvider = provider;
      result.terrainLoaded = true;
      status('真实地形已启用。');
    } catch {
      status('地形服务加载失败，继续使用椭球地面。请检查令牌、授权和网络。', 'warning');
    }
  }

  async function loadTiles() {
    if (!tilesUrl && !assetIdText) return;
    const id = Number(assetIdText);
    if (!tilesUrl && (!Number.isSafeInteger(id) || id <= 0)) {
      status('3D Tiles 资源 ID 无效，继续显示示意建筑。', 'warning'); return;
    }
    if (!tilesUrl && !token) {
      status('未配置 Cesium ion 令牌，继续显示示意建筑。', 'warning'); return;
    }
    try {
      const tilesetOptions = { maximumScreenSpaceError: 16, shadows: Cesium.ShadowMode.ENABLED };
      const tileset = tilesUrl
        ? await Cesium.Cesium3DTileset.fromUrl(tilesUrl, tilesetOptions)
        : await Cesium.Cesium3DTileset.fromIonAssetId(id, tilesetOptions);
      if (!alive()) { tileset.destroy(); return; }
      let failed = false;
      let fallbackHidden = false;
      const removeVisible = tileset.tileVisible.addEventListener(() => {
        if (!failed && !fallbackHidden && alive()) {
          fallbackHidden = true;
          setFallback(false);
          status('实景瓦片已显示。');
        }
      });
      const removeFailed = tileset.tileFailed.addEventListener(() => {
        if (failed || !alive()) return;
        failed = true;
        tileset.show = false;
        result.tilesLoaded = false;
        setFallback(true);
        status('实景瓦片加载失败，已恢复示意建筑。请检查资源授权与网络。', 'warning');
      });
      removers.push(removeVisible, removeFailed);
      viewer.scene.primitives.add(tileset);
      result.tileset = tileset;
      result.tilesLoaded = true;
      status('实景瓦片已连接，等待当前区域内容加载。');
    } catch {
      setFallback(true);
      status('实景瓦片初始化失败，继续显示示意建筑。请检查地址、授权和网络。', 'warning');
    }
  }

  async function loadLandmark() {
    if (!landmarkUrl) return;
    const lon = optionalNumber(config.VITE_LANDMARK_LONGITUDE);
    const lat = optionalNumber(config.VITE_LANDMARK_LATITUDE);
    const altitude = optionalNumber(config.VITE_LANDMARK_HEIGHT) ?? 0;
    const heading = optionalNumber(config.VITE_LANDMARK_HEADING) ?? 0;
    if (lon === undefined || lat === undefined || Math.abs(lon) > 180 || Math.abs(lat) > 90) {
      status('地标坐标无效，未加载 glTF 地标。', 'warning'); return;
    }
    try {
      const position = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
      const hpr = new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(heading), 0, 0);
      const model = await Cesium.Model.fromGltfAsync({
        url: landmarkUrl,
        modelMatrix: Cesium.Transforms.headingPitchRollToFixedFrame(position, hpr),
        shadows: Cesium.ShadowMode.ENABLED
      });
      if (!alive()) { model.destroy(); return; }
      const removeError = model.errorEvent.addEventListener(() => {
        if (!alive()) return;
        model.show = false;
        status('地标模型资源加载失败，请检查 URL、格式和跨域设置。', 'warning');
      });
      const removeReady = model.readyEvent.addEventListener(() => status('PBR 地标模型已加载。'));
      removers.push(removeError, removeReady);
      viewer.scene.primitives.add(model);
      result.landmark = model;
    } catch {
      status('地标模型加载失败，请检查 URL、格式和跨域设置。', 'warning');
    }
  }

  await Promise.all([loadTerrain(), loadTiles(), loadLandmark()]);
  if (alive() && !terrainRequested && !tilesUrl && !assetIdText && !landmarkUrl) {
    status('当前使用内置上海建筑示例；可在配置文件中接入实景数据。');
  }
  return result;
}
