import * as Cesium from 'cesium';

// A self-contained, fictional city landscape. Coordinates are near Chengdu.
const C = Cesium;
const lon = 103.94, lat = 30.67;
const point = (x, y, z = 0) => C.Cartesian3.fromDegrees(lon + x, lat + y, z);
const color = (hex, alpha = 1) => C.Color.fromCssColorString(hex).withAlpha(alpha);
const polygon = (coords, z = 0) => C.Cartesian3.fromDegreesArrayHeights(coords.flatMap(([x, y]) => [lon + x, lat + y, z]));

export function createScene(viewer) {
  const scene = viewer.scene;
  scene.globe.enableLighting = true;
  scene.globe.showGroundAtmosphere = true;
  scene.skyAtmosphere.show = true;
  scene.fog.enabled = true;
  scene.fog.density = 0.00014;
  scene.backgroundColor = color('#071827');
  viewer.clock.shouldAnimate = false;
  const entities = viewer.entities;
  const addPoly = (coords, material, height = 10) => entities.add({ polygon: { hierarchy: polygon(coords, height), perPositionHeight: true, material } });

  // A broad landscape plate keeps the demo useful without paid terrain assets.
  addPoly([[-.21,-.15],[.22,-.15],[.22,.17],[-.21,.17]], color('#263f38'), 5);
  // Mountains are layered ellipsoids; their lower halves are hidden by the landscape.
  let seed = 7281;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 48; i++) {
    const x = -.2 + rand() * .4, y = .085 + rand() * .09;
    const radius = 850 + rand() * 2100, height = 350 + rand() * 1900;
    entities.add({ position: point(x,y,10), ellipsoid: { radii: new C.Cartesian3(radius, radius * (.7 + rand()*.5), height), material: color(['#334d43','#405747','#4b6150','#526859'][Math.floor(rand()*4)]) } });
  }
  // Meandering river and banks; polygons avoid external imagery dependencies.
  const river = [[-.22,-.027],[-.18,-.018],[-.14,-.02],[-.10,-.006],[-.06,.003],[-.02,-.001],[.02,.008],[.06,.025],[.10,.022],[.14,.035],[.18,.046],[.22,.045],[.22,.032],[.18,.032],[.14,.022],[.10,.009],[.06,.012],[.02,-.006],[-.02,-.015],[-.06,-.011],[-.10,-.02],[-.14,-.034],[-.18,-.032],[-.22,-.04]];
  addPoly(river, color('#287d88', .96), 32);
  const line = (coords, width, material, height = 36) => entities.add({ polyline: { positions: polygon(coords, height), width, material } });
  line([[-.22,-.032],[-.18,-.025],[-.14,-.027],[-.10,-.013],[-.06,-.004],[-.02,-.008],[.02,.001],[.06,.018],[.10,.015],[.14,.028],[.18,.039],[.22,.038]], 2, color('#8ed3cb', .45), 38);

  // Three districts with generated blocks, towers and a connected road grid.
  const districts = [ {x:-.085,y:-.068,n:'西岸生活区', size:.046}, {x:.005,y:-.055,n:'中央商务区',size:.052}, {x:.105,y:-.044,n:'东部科创区',size:.046} ];
  districts.forEach((d, di) => {
    addPoly([[d.x-d.size,d.y-d.size*.7],[d.x+d.size,d.y-d.size*.7],[d.x+d.size,d.y+d.size*.7],[d.x-d.size,d.y+d.size*.7]], color('#526b62'), 14);
    for (let j=-3;j<=3;j++) {
      line([[d.x-d.size,d.y+j*.009],[d.x+d.size,d.y+j*.009]], 3, color('#233b3e'), 23);
      line([[d.x+j*.014,d.y-d.size*.7],[d.x+j*.014,d.y+d.size*.7]], 3, color('#233b3e'), 23);
    }
    for (let ix=-3;ix<3;ix++) for (let iy=-3;iy<3;iy++) {
      if (rand()<.12) continue;
      const x=d.x+ix*.014+.007, y=d.y+iy*.009+.0045;
      const h = 65 + rand() * (di===1 ? 460 : 220);
      const base = 25;
      const tint = ['#80a7a2','#759b9a','#95b8ae','#5d8988'][Math.floor(rand()*4)];
      entities.add({ position: point(x,y,base+h/2), box: { dimensions: new C.Cartesian3(410+rand()*170, 320+rand()*170, h), material: color(tint), outline: true, outlineColor: color('#b2d4ca', .38) } });
      if (h > 250) entities.add({ position: point(x,y,base+h+4), box: { dimensions: new C.Cartesian3(280,220,8), material: color('#62ddd1') } });
    }
    entities.add({ position: point(d.x,d.y,700), label: { text: d.n, font: '15px sans-serif', fillColor: C.Color.WHITE, showBackground: true, backgroundColor: color('#12333b', .8), pixelOffset: new C.Cartesian2(0,-8), disableDepthTestDistance: Number.POSITIVE_INFINITY } });
  });
  // Bridges span the water and connect the banks.
  [[-.09,-.03], [.035,.002], [.145,.025]].forEach(([x,y]) => {
    line([[x,y-.035],[x+.018,y+.035]], 7, color('#bdd0c0'), 45);
    line([[x,y-.035],[x+.018,y+.035]], 2, color('#e6f3d3'), 47);
  });

  // Cesium's cloud collection renders volumetric cloud billboards using a 3D noise texture.
  let clouds;
  try {
    clouds = scene.primitives.add(new C.CloudCollection());
    for (let i=0;i<22;i++) clouds.add({ position: point(-.19+rand()*.38,.025+rand()*.12, 3000+rand()*2200), scale: new C.Cartesian2(2200+rand()*3000, 700+rand()*800), maximumSize: new C.Cartesian3(1800, 900, 650), slice: -1, brightness: .86+rand()*.14 });
  } catch (e) { console.warn('Clouds unavailable', e); }

  const shader = {
    rain: `uniform sampler2D colorTexture; in vec2 v_textureCoordinates; void main(){vec2 uv=v_textureCoordinates; float t=czm_frameNumber*.015; float n=fract(sin(dot(floor(vec2(uv.x*240.0,uv.y*25.0+t*15.0)),vec2(12.9898,78.233)))*43758.5453); float streak=step(.965,n)*smoothstep(.15,.8,fract(uv.y*25.0+t*15.0)); vec4 c=texture(colorTexture,uv); out_FragColor=vec4(mix(c.rgb,vec3(.66,.78,.85),streak*.55)*vec3(.78,.85,.92),c.a);}`,
    snow: `uniform sampler2D colorTexture; in vec2 v_textureCoordinates; void main(){vec2 uv=v_textureCoordinates; float t=czm_frameNumber*.004; vec2 p=uv*vec2(90.,55.); p.y+=t*12.; p.x+=sin(p.y*.12)*.8; vec2 id=floor(p); vec2 f=fract(p)-.5; float r=fract(sin(dot(id,vec2(12.9898,78.233)))*43758.5453); float flake=(1.-smoothstep(.02,.16,length(f)))*step(.65,r); vec4 c=texture(colorTexture,uv); out_FragColor=vec4(mix(c.rgb,vec3(.95),flake*.8),c.a);}`,
    fog: `uniform sampler2D colorTexture; in vec2 v_textureCoordinates; void main(){vec4 c=texture(colorTexture,v_textureCoordinates); out_FragColor=vec4(mix(c.rgb,vec3(.65,.72,.73),.35),c.a);}`
  };
  let effect;
  function setWeather(mode) {
    if (effect) { scene.postProcessStages.remove(effect); effect = undefined; }
    scene.fog.density = mode === 'fog' ? .0008 : .00014;
    if (shader[mode]) effect = scene.postProcessStages.add(new C.PostProcessStage({ fragmentShader: shader[mode] }));
  }
  function setHour(hour) {
    // UTC+8: the solar position follows the chosen local hour.
    const date = new Date(Date.UTC(2026, 5, 21, Number(hour) - 8, 0, 0));
    viewer.clock.currentTime = C.JulianDate.fromDate(date);
  }
  function flyHome() {
    viewer.camera.flyTo({ destination: point(.005,-.21, 21000), orientation: { heading: 0, pitch: C.Math.toRadians(-36), roll: 0 }, duration: 1.5 });
  }
  setHour(10);
  viewer.camera.setView({ destination: point(.005,-.21,21000), orientation: { heading: 0, pitch: C.Math.toRadians(-36), roll: 0 } });
  return { setWeather, setHour, setClouds: visible => { if (clouds) clouds.show = visible; }, flyHome };
}
