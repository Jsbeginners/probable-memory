import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './style.css';
import { createScene } from './scene.js';

const viewer = new Cesium.Viewer('cesiumContainer', {
  animation: false, timeline: false, geocoder: false, homeButton: false,
  sceneModePicker: false, baseLayerPicker: false, navigationHelpButton: false,
  fullscreenButton: false, infoBox: false, selectionIndicator: false,
  baseLayer: false, terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  shouldAnimate: true,
});
const scene = createScene(viewer);
scene.setHour(14);

document.querySelectorAll('.weather').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.weather').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    scene.setWeather(button.dataset.weather);
  });
});
const timeSlider = document.querySelector('#time-slider');
timeSlider.addEventListener('input', () => {
  const hour = Number(timeSlider.value);
  document.querySelector('#time-value').textContent = `${String(hour).padStart(2, '0')}:00`;
  scene.setHour(hour);
});
document.querySelector('#cloud-toggle').addEventListener('change', (event) => scene.setClouds(event.target.checked));
document.querySelector('#home-button').addEventListener('click', () => scene.flyHome());

function updateClock() {
  const now = new Date();
  document.querySelector('#date-display').textContent = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', timeZone: 'Asia/Shanghai' }).format(now);
  document.querySelector('#clock-display').textContent = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' }).format(now);
}
updateClock();
setInterval(updateClock, 1000);
