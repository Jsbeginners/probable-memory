import * as Cesium from 'cesium';

// The date picker and hour are Shanghai civil time (UTC+08:00, no DST).
function shanghaiToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => parts.find((value) => value.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  // Restrict years to the date range supported by the application's picker.
  if (year < 1900 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Cesium's ambient occlusion stage needs a noise texture. A deterministic canvas
// keeps the effect self-contained and prevents a network request on startup.
function makeNoiseTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 255;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  const pixels = context.createImageData(255, 255);
  let seed = 29411;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    pixels.data[i] = seed % 256;
    pixels.data[i + 1] = pixels.data[i + 2] = pixels.data[i];
    pixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

/** Configure sun, atmospheric light and scalable post processing.
 * Screen-space AO is a local approximation, not global illumination.
 * @param {Cesium.Viewer} viewer
 */
export function createEnvironment(viewer) {
  const scene = viewer.scene;
  const globe = scene.globe;
  const stages = scene.postProcessStages;
  const sunlight = new Cesium.SunLight({ intensity: 2.0 });
  scene.light = sunlight;
  globe.enableLighting = true;
  globe.showGroundAtmosphere = true;
  globe.dynamicAtmosphereLighting = true;
  globe.dynamicAtmosphereLightingFromSun = true;
  scene.skyAtmosphere.show = true;
  scene.fog.enabled = true;
  viewer.terrainShadows = Cesium.ShadowMode.RECEIVE_ONLY;
  viewer.clock.shouldAnimate = false;
  stages.tonemapper = Cesium.Tonemapper.ACES;
  stages.fxaa.enabled = true;
  const ao = stages.ambientOcclusion;
  ao.uniforms.randomTexture = makeNoiseTexture();
  ao.uniforms.intensity = 1.25;
  ao.uniforms.bias = 0.12;
  ao.uniforms.lengthCap = 0.5;
  ao.uniforms.directionCount = 6;
  ao.uniforms.stepCount = 12;
  const bloom = stages.bloom;
  bloom.uniforms.glowOnly = false;
  bloom.uniforms.contrast = 90;
  bloom.uniforms.brightness = -0.45;
  bloom.uniforms.delta = 1;
  bloom.uniforms.sigma = 2;
  bloom.uniforms.stepSize = 1;
  // Software WebGL can advertise shadow support but render an entirely black
  // globe. Disable shadows for known software renderers while preserving
  // sunlight shadows on supported hardware in medium and high quality.
  const gl = scene.canvas.getContext('webgl2') || scene.canvas.getContext('webgl');
  const debugRenderer = gl?.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugRenderer ? gl.getParameter(debugRenderer.UNMASKED_RENDERER_WEBGL) : '';
  const softwareRenderer = /swiftshader|llvmpipe|softpipe|software rasterizer/i.test(renderer);
  let selectedDate = shanghaiToday();
  let hour = 14;
  let quality = 'medium';
  let weather = 'clear';

  function updateTime() {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const localMidnightUTC = Date.UTC(year, month - 1, day, -8);
    viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(localMidnightUTC + hour * 3600000));
    // Bloom only adds a subtle glow around bright pixels; it does not create light sources.
    bloom.enabled = quality !== 'low' && (hour < 7 || hour >= 18);
    scene.requestRender();
  }

  function setHour(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    hour = Math.max(0, Math.min(23.99, parsed));
    updateTime();
  }

  function setDate(value) {
    if (!validDate(value)) return false;
    selectedDate = value;
    updateTime();
    return true;
  }

  function setWeather(value) {
    weather = ['clear', 'rain', 'snow', 'fog'].includes(value) ? value : 'clear';
    scene.fog.density = weather === 'fog' ? 0.00055 : weather === 'rain' ? 0.0002 : 0.00012;
    scene.skyAtmosphere.saturationShift = weather === 'clear' ? 0 : -0.12;
    scene.skyAtmosphere.brightnessShift = weather === 'fog' ? -0.08 : 0;
    scene.requestRender();
  }

  function setQuality(value) {
    quality = ['low', 'medium', 'high'].includes(value) ? value : 'medium';
    const low = quality === 'low';
    const high = quality === 'high';
    // High-quality rendering is optional because shadow maps and AO are GPU intensive.
    viewer.resolutionScale = low ? 0.75 : 1;
    scene.highDynamicRange = !low;
    viewer.shadows = !low && !softwareRenderer;
    scene.shadowMap.size = high ? 2048 : 1024;
    scene.shadowMap.maximumDistance = 5500;
    scene.shadowMap.softShadows = high;
    scene.shadowMap.darkness = 0.35;
    ao.enabled = high && Boolean(ao.uniforms.randomTexture);
    stages.fxaa.enabled = true;
    updateTime();
  }

  setWeather(weather);
  setQuality(quality);
  return { setHour, setDate, setQuality, setWeather, getDate: () => selectedDate };
}
