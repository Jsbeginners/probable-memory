import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './style.css';
import { createScene } from './scene.js';
import { createEnvironment } from './environment.js';
import { loadOptionalAssets } from './assets.js';
import { addRiverWater } from './water.js';
import { createSky } from './sky.js';

const viewer = new Cesium.Viewer('cesiumContainer', {
  animation: false, timeline: false, geocoder: false, homeButton: false,
  sceneModePicker: false, baseLayerPicker: false, navigationHelpButton: false,
  fullscreenButton: false, infoBox: false, selectionIndicator: false,
  baseLayer: false, terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  shouldAnimate: true,
});
const scene = createScene(viewer);
const environment = createEnvironment(viewer);
const water = addRiverWater(viewer);
const sky = createSky(viewer);
if (sky.supported) scene.setClouds(false);
const dateInput = document.querySelector('#scene-date');
dateInput.min = '1900-01-01';
dateInput.max = '2100-12-31';
dateInput.value = environment.getDate();
dateInput.addEventListener('change', () => {
  if (!environment.setDate(dateInput.value)) dateInput.value = environment.getDate();
});
let optionalAssets;
const qualityInput = document.querySelector('#quality');
function updateQuality(value) {
  environment.setQuality(value);
  if (optionalAssets?.tileset) optionalAssets.tileset.maximumScreenSpaceError = ({low: 32, medium: 16, high: 8})[value] ?? 16;
}
qualityInput.addEventListener('change', event => updateQuality(event.target.value));
const status = document.querySelector('#asset-status');
loadOptionalAssets(viewer, {
  setFallbackBuildingsVisible: scene.setFallbackBuildingsVisible,
  onStatus: (message, level) => { status.textContent = message; status.dataset.level = level; }
}).then(result => { optionalAssets = result; updateQuality(qualityInput.value); }).catch(error => { console.error(error); status.textContent = '可选数据加载失败，继续使用基础场景。'; status.dataset.level = 'warning'; });

document.querySelectorAll('.weather').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.weather').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    scene.setWeather(button.dataset.weather);
    environment.setWeather(button.dataset.weather);
    water.setWeather(button.dataset.weather);
    sky.setWeather(button.dataset.weather);
  });
});
const timeSlider = document.querySelector('#time-slider');
timeSlider.addEventListener('input', () => {
  const hour = Number(timeSlider.value);
  document.querySelector('#time-value').textContent = `${String(hour).padStart(2, '0')}:00`;
  environment.setHour(hour);
});
document.querySelector('#cloud-toggle').addEventListener('change', (event) => { scene.setClouds(!sky.supported && event.target.checked); sky.setClouds(event.target.checked); });
document.querySelector('#home-button').addEventListener('click', () => scene.flyHome());
document.querySelector('#aerial-button').addEventListener('click', () => scene.flyAerial());

function updateClock() {
  const now = new Date();
  document.querySelector('#date-display').textContent = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', timeZone: 'Asia/Shanghai' }).format(now);
  document.querySelector('#clock-display').textContent = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' }).format(now);
}
updateClock();
setInterval(updateClock, 1000);
