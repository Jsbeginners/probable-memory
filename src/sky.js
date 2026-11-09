import * as Cesium from 'cesium';

// Approximate procedural sky. Only pixels with no opaque geometry in the depth
// buffer are painted; Cesium's atmosphere remains the fallback when depth
// textures are unavailable. This is not a volumetric atmosphere simulation.
const fragmentShader = `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform float cloudAmount;
in vec2 v_textureCoordinates;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float value = 0.0, amp = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amp * noise2(p);
    p = p * 2.03 + vec2(17.1, 8.7);
    amp *= 0.5;
  }
  return value;
}
void main() {
  vec4 source = texture(colorTexture, v_textureCoordinates);
  float depth = czm_readDepth(depthTexture, v_textureCoordinates);
  if (depth < 0.999999) { out_FragColor = source; return; }

  vec2 ndc = v_textureCoordinates * 2.0 - 1.0;
  vec4 eye = czm_inverseProjection * vec4(ndc, 1.0, 1.0);
  vec3 rayEye = normalize(eye.xyz / eye.w);
  vec3 ray = normalize((czm_inverseView * vec4(rayEye, 0.0)).xyz);
  vec3 up = normalize(czm_viewerPositionWC);
  float elevation = dot(ray, up);
  // Preserve the existing background below the horizon when terrain is not loaded.
  if (elevation <= -0.015) { out_FragColor = source; return; }
  vec3 sun = normalize(czm_sunDirectionWC);
  float sunHeight = dot(sun, up);
  float daylight = smoothstep(-0.12, 0.08, sunHeight);
  float twilight = (1.0 - smoothstep(-0.02, 0.22, abs(sunHeight))) * daylight;
  float horizon = pow(1.0 - clamp(max(elevation, 0.0), 0.0, 1.0), 3.0);
  vec3 nightZenith = vec3(0.008, 0.016, 0.044);
  vec3 nightHorizon = vec3(0.025, 0.039, 0.073);
  vec3 dayZenith = vec3(0.14, 0.36, 0.63);
  vec3 dayHorizon = vec3(0.62, 0.73, 0.79);
  vec3 sky = mix(mix(nightZenith, nightHorizon, horizon),
                 mix(dayZenith, dayHorizon, horizon), daylight);
  float sunFacing = max(dot(ray, sun), 0.0);
  sky += vec3(0.35, 0.20, 0.10) * pow(sunFacing, 12.0) * twilight * horizon;
  sky += vec3(0.18, 0.13, 0.07) * pow(sunFacing, 128.0) * daylight;
  sky += vec3(1.0, 0.84, 0.59) * smoothstep(0.99985, 0.99996, sunFacing) * daylight;

  // A moving procedural cloud layer in a local tangent basis; the cloud density
  // is controlled by weather and the user toggle, without external textures.
  if (cloudAmount > 0.001 && elevation > 0.008) {
    vec3 east = normalize(cross(vec3(0.0, 0.0, 1.0), up));
    vec3 north = normalize(cross(up, east));
    vec2 direction = vec2(dot(ray, east), dot(ray, north));
    vec2 uv = direction / max(elevation + 0.19, 0.22) * 2.4;
    uv += vec2(czm_frameNumber * 0.000025, 0.0);
    float cloud = fbm(uv);
    float coverage = smoothstep(0.61 - cloudAmount * 0.22, 0.72 - cloudAmount * 0.20, cloud);
    coverage *= smoothstep(0.01, 0.16, elevation) * cloudAmount;
    vec3 cloudColor = mix(vec3(0.075, 0.105, 0.16), vec3(0.92, 0.93, 0.91), daylight);
    cloudColor = mix(cloudColor, vec3(0.90, 0.58, 0.37), twilight * 0.28);
    sky = mix(sky, cloudColor, coverage * 0.75);
  }
  float edge = smoothstep(-0.015, 0.035, elevation);
  out_FragColor = vec4(mix(source.rgb, sky, edge), source.a);
}`;

export function createSky(viewer) {
  const scene = viewer.scene;
  let visible = true;
  let weather = 'clear';
  let amount = 0.45;
  const supported = Boolean(scene.context?.depthTexture);
  let stage;
  if (supported) {
    stage = scene.postProcessStages.add(new Cesium.PostProcessStage({
      name: 'shanghai-procedural-sky',
      fragmentShader,
      uniforms: { cloudAmount: () => visible ? amount : 0 },
    }));
  }
  function setWeather(value) {
    weather = value;
    amount = ({clear: 0.45, rain: 0.9, snow: 0.8, fog: 0.85})[weather] ?? 0.45;
    scene.requestRender();
  }
  return {
    supported,
    setWeather,
    setClouds(value) { visible = Boolean(value); scene.requestRender(); },
    destroy() { if (stage && !scene.isDestroyed()) scene.postProcessStages.remove(stage); },
  };
}
