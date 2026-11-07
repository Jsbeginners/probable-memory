import * as C from 'cesium';
import buildings from './shanghai-buildings.json';

// Bund and Lujiazui, Shanghai: imagery and building footprints are real-world data.
const center = { lon: 121.498, lat: 31.235 };
const color = (hex, alpha = 1) => C.Color.fromCssColorString(hex).withAlpha(alpha);
const point = (lon, lat, height = 0) => C.Cartesian3.fromDegrees(lon, lat, height);

export function createScene(viewer) {
  const scene = viewer.scene;
  scene.globe.enableLighting = true;
  scene.globe.showGroundAtmosphere = true;
  scene.skyAtmosphere.show = true;
  scene.fog.enabled = true;
  scene.fog.density = 0.00012;
  scene.backgroundColor = color('#132331');
  viewer.clock.shouldAnimate = false;
  scene.globe.baseColor = color('#263b41');
  viewer.imageryLayers.addImageryProvider(new C.UrlTemplateImageryProvider({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maximumLevel: 19,
    credit: new C.Credit('Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community')
  }));
  // Credit is visible when Cesium credit display is expanded, including attributions for exported data.
  viewer.creditDisplay.addStaticCredit(new C.Credit('Building footprints © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>', true));

  // Data contains OSM building ways in the rectangle 121.478–121.522°E, 31.225–31.249°N.
  // Most are untextured extrusions. Where OSM has neither height nor levels, use a visual estimate.
  const palette = ['#a8a9a4', '#aeb1af', '#939f9e', '#b4b1a8', '#8d9c9e', '#b3b6b1'];
  const geometries = [];
  for (let i = 0; i < buildings.length; i++) {
    const [rawHeight, minHeight, ring] = buildings[i];
    const height = rawHeight == null ? 12 + (i * 17 % 19) : Math.max(rawHeight, minHeight + 1);
    if (ring.length < 4) continue;
    const positions = C.Cartesian3.fromDegreesArray(ring.flat());
    try {
      const geometry = C.PolygonGeometry.fromPositions({
        positions, height: Math.max(0, minHeight || 0), extrudedHeight: height,
        vertexFormat: C.PerInstanceColorAppearance.VERTEX_FORMAT
      });
      geometries.push(new C.GeometryInstance({
        geometry,
        attributes: { color: C.ColorGeometryInstanceAttribute.fromColor(color(palette[i % palette.length])) }
      }));
    } catch (error) { console.warn('Building geometry skipped:', error); }
  }
  scene.primitives.add(new C.Primitive({
    geometryInstances: geometries,
    appearance: new C.PerInstanceColorAppearance({ translucent: false, closed: true }),
    asynchronous: true
  }));

  // Cesium's cloud primitive uses volume noise; scene is intentionally sparse so buildings stay visible.
  let clouds;
  try {
    clouds = scene.primitives.add(new C.CloudCollection());
    for (let i = 0; i < 9; i++) {
      const lon = 121.47 + ((i * 31) % 55) / 1000;
      const lat = 31.260 + ((i * 13) % 20) / 1000;
      clouds.add({ position: point(lon, lat, 2700 + (i % 3) * 450), scale: new C.Cartesian2(1400 + (i % 3) * 350, 500), maximumSize: new C.Cartesian3(1250, 700, 500), slice: -1, brightness: .95 });
    }
  } catch (error) { console.warn('Clouds unavailable', error); }

  const shader = {
    rain: `uniform sampler2D colorTexture; in vec2 v_textureCoordinates; void main(){vec2 uv=v_textureCoordinates; float t=czm_frameNumber*.015; float n=fract(sin(dot(floor(vec2(uv.x*240.0,uv.y*25.0+t*15.0)),vec2(12.9898,78.233)))*43758.5453); float streak=step(.965,n)*smoothstep(.15,.8,fract(uv.y*25.0+t*15.0)); vec4 c=texture(colorTexture,uv); out_FragColor=vec4(mix(c.rgb,vec3(.66,.78,.85),streak*.55)*vec3(.78,.85,.92),c.a);}`,
    snow: `uniform sampler2D colorTexture; in vec2 v_textureCoordinates; void main(){vec2 uv=v_textureCoordinates; float t=czm_frameNumber*.004; vec2 p=uv*vec2(90.,55.); p.y+=t*12.; p.x+=sin(p.y*.12)*.8; vec2 id=floor(p); vec2 f=fract(p)-.5; float r=fract(sin(dot(id,vec2(12.9898,78.233)))*43758.5453); float flake=(1.-smoothstep(.02,.16,length(f)))*step(.65,r); vec4 c=texture(colorTexture,uv); out_FragColor=vec4(mix(c.rgb,vec3(.95),flake*.8),c.a);}`,
    fog: `uniform sampler2D colorTexture; in vec2 v_textureCoordinates; void main(){vec4 c=texture(colorTexture,v_textureCoordinates); out_FragColor=vec4(mix(c.rgb,vec3(.65,.72,.73),.35),c.a);}`
  };
  let effect;
  function setWeather(mode) {
    if (effect) { scene.postProcessStages.remove(effect); effect = undefined; }
    scene.fog.density = mode === 'fog' ? .0008 : .00012;
    if (shader[mode]) effect = scene.postProcessStages.add(new C.PostProcessStage({ fragmentShader: shader[mode] }));
  }
  function setHour(hour) {
    const date = new Date(Date.UTC(2026, 5, 21, Number(hour) - 8, 0, 0));
    viewer.clock.currentTime = C.JulianDate.fromDate(date);
  }
  const destination = point(center.lon, 31.212, 2700);
  const orientation = { heading: 0, pitch: C.Math.toRadians(-48), roll: 0 };
  function flyHome() { viewer.camera.flyTo({ destination, orientation, duration: 1.5 }); }
  setHour(14);
  viewer.camera.setView({ destination, orientation });
  return { setWeather, setHour, setClouds: visible => { if (clouds) clouds.show = visible; }, flyHome };
}
