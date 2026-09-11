/**
 * Geo Explorer 的轻量 WebGL 地球渲染器。
 *
 * 这里不依赖 Three.js：小程序 Canvas WebGL 只需要一组球面顶点、三个
 * 离线材质图和两段 GLSL，即可完成真实球体、凹凸光照、海陆镜面差异和
 * 地点投影。Canvas 2D 版本仍保留在 globe-renderer.ts 作为兜底。
 */

import {
  GlobeMarker,
  GlobeProjection,
  GlobeVariant,
  projectGlobePoint,
} from "./globe-renderer";

interface ImageLike {
  width: number;
  height: number;
  src: string;
  onload?: () => void;
  onerror?: () => void;
}

interface WebGLCanvasLike {
  width: number;
  height: number;
  getContext(type: "webgl" | "experimental-webgl", attributes?: { alpha?: boolean; premultipliedAlpha?: boolean }): WebGLContextLike | null;
  createImage?: () => ImageLike;
}

interface WebGLContextLike {
  createShader(type: number): unknown;
  shaderSource(shader: unknown, source: string): void;
  compileShader(shader: unknown): void;
  getShaderParameter(shader: unknown, parameter: number): boolean;
  getShaderInfoLog(shader: unknown): string | null;
  deleteShader(shader: unknown): void;
  createProgram(): unknown;
  attachShader(program: unknown, shader: unknown): void;
  linkProgram(program: unknown): void;
  getProgramParameter(program: unknown, parameter: number): boolean;
  getProgramInfoLog(program: unknown): string | null;
  deleteProgram(program: unknown): void;
  useProgram(program: unknown): void;
  getAttribLocation(program: unknown, name: string): number;
  getUniformLocation(program: unknown, name: string): unknown;
  createBuffer(): unknown;
  bindBuffer(target: number, buffer: unknown): void;
  bufferData(target: number, data: unknown, usage: number): void;
  deleteBuffer(buffer: unknown): void;
  enableVertexAttribArray(index: number): void;
  vertexAttribPointer(index: number, size: number, type: number, normalized: boolean, stride: number, offset: number): void;
  createTexture(): unknown;
  deleteTexture(texture: unknown): void;
  activeTexture(texture: number): void;
  bindTexture(target: number, texture: unknown): void;
  texParameteri(target: number, parameter: number, value: number): void;
  pixelStorei(parameter: number, value: number): void;
  texImage2D(target: number, level: number, internalFormat: number, width: number, height: number, border: number, format: number, type: number, pixels: unknown): void;
  texImage2D(target: number, level: number, internalFormat: number, format: number, type: number, source: unknown): void;
  generateMipmap(target: number): void;
  uniform1f(location: unknown, value: number): void;
  uniform1i(location: unknown, value: number): void;
  uniform2f(location: unknown, x: number, y: number): void;
  uniform3f(location: unknown, x: number, y: number, z: number): void;
  clearColor(red: number, green: number, blue: number, alpha: number): void;
  clear(mask: number): void;
  viewport(x: number, y: number, width: number, height: number): void;
  enable(capability: number): void;
  disable(capability: number): void;
  depthFunc(functionCode: number): void;
  blendFunc(source: number, destination: number): void;
  drawElements(mode: number, count: number, type: number, offset: number): void;
  drawArrays(mode: number, first: number, count: number): void;
  uniform4f(location: unknown, x: number, y: number, z: number, w: number): void;
}

interface Geometry {
  position: unknown;
  normal: unknown;
  uv: unknown;
  tangent: unknown;
  bitangent: unknown;
  index: unknown;
  indexCount: number;
}

interface TextureSet {
  color: unknown;
  height: unknown;
  specular: unknown;
}

export interface GlobeRenderOptions {
  earthOnly?: boolean;
  selectedMode?: boolean;
  bumpEnabled?: boolean;
  atmosphereEnabled?: boolean;
  bumpScale?: number;
  atmosphereStrength?: number;
  textureScale?: 2048 | 4096;
}

export interface ProjectedGlobeMarker extends GlobeProjection {
  id: string;
  screenX: number;
  screenY: number;
  opacity: number;
}

export type GlobeProjectionListener = (markers: ProjectedGlobeMarker[]) => void;

const DEG = Math.PI / 180;
const GL = {
  VERTEX_SHADER: 0x8b31,
  FRAGMENT_SHADER: 0x8b30,
  COMPILE_STATUS: 0x8b81,
  LINK_STATUS: 0x8b82,
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
  STATIC_DRAW: 0x88e4,
  DYNAMIC_DRAW: 0x88e8,
  FLOAT: 0x1406,
  UNSIGNED_SHORT: 0x1403,
  TRIANGLES: 0x0004,
  POINTS: 0x0000,
  TEXTURE0: 0x84c0,
  TEXTURE1: 0x84c1,
  TEXTURE2: 0x84c2,
  TEXTURE_2D: 0x0de1,
  RGBA: 0x1908,
  UNSIGNED_BYTE: 0x1401,
  TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_MAG_FILTER: 0x2800,
  TEXTURE_WRAP_S: 0x2802,
  TEXTURE_WRAP_T: 0x2803,
  LINEAR: 0x2601,
  REPEAT: 0x2901,
  CLAMP_TO_EDGE: 0x812f,
  UNPACK_FLIP_Y_WEBGL: 0x9240,
  DEPTH_TEST: 0x0b71,
  LEQUAL: 0x0203,
  BLEND: 0x0be2,
  SRC_ALPHA: 0x0302,
  ONE_MINUS_SRC_ALPHA: 0x0303,
  COLOR_BUFFER_BIT: 0x4000,
  DEPTH_BUFFER_BIT: 0x0100,
} as const;

const VERTEX_SHADER = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv;
attribute vec3 aTangent;
attribute vec3 aBitangent;

uniform float uRotation;
uniform float uPitch;
uniform vec2 uCenter;
uniform highp vec2 uResolution;
uniform float uRadius;

varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;
varying vec2 vUv;
varying float vViewZ;
varying vec2 vScreenPixel;
varying float vSphereY;

vec3 rotateEarth(vec3 value) {
  // 与 projectGlobePoint 的 longitude - rotation 保持同向。
  float yCos = cos(uRotation);
  float ySin = sin(uRotation);
  vec3 yaw = vec3(
    value.x * yCos - value.z * ySin,
    value.y,
    value.x * ySin + value.z * yCos
  );
  float xCos = cos(uPitch);
  float xSin = sin(uPitch);
  return vec3(
    yaw.x,
    yaw.y * xCos - yaw.z * xSin,
    yaw.y * xSin + yaw.z * xCos
  );
}

void main() {
  vec3 position = rotateEarth(aPosition);
  vNormal = normalize(rotateEarth(aNormal));
  vTangent = normalize(rotateEarth(aTangent));
  vBitangent = normalize(rotateEarth(aBitangent));
  vUv = aUv;
  vViewZ = position.z;
  vSphereY = position.y;

  vec2 pixel = vec2(uCenter.x + position.x * uRadius, uCenter.y - position.y * uRadius);
  vScreenPixel = pixel;
  vec2 clip = vec2(
    (pixel.x / uResolution.x) * 2.0 - 1.0,
    1.0 - (pixel.y / uResolution.y) * 2.0
  );
  // 让朝向观察者的一面处于更近的深度，同时在 fragment 阶段丢弃背面。
  gl_Position = vec4(clip, -position.z, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D uColorMap;
uniform sampler2D uHeightMap;
uniform sampler2D uSpecularMap;
uniform vec2 uTexel;
uniform highp vec2 uResolution;
uniform vec3 uLightDirection;
uniform float uBumpEnabled;
uniform float uBumpScale;
uniform float uAtmosphereEnabled;
uniform float uAtmosphereStrength;

varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;
varying vec2 vUv;
varying float vViewZ;
varying vec2 vScreenPixel;
varying float vSphereY;

void main() {
  if (vViewZ <= 0.0) discard;

  // 等距矩形贴图在两极会把同一处球面压成一条像素带。对极区使用
  // 稳定的中央经线采样，避免顶端出现扇形/人字形纹理伪影。
  float polarDistance = min(vUv.y, 1.0 - vUv.y);
  float polarBlend = 1.0 - smoothstep(0.0, 0.24, polarDistance);
  vec3 polarBase = (
    texture2D(uColorMap, vec2(0.125, vUv.y)).rgb
    + texture2D(uColorMap, vec2(0.375, vUv.y)).rgb
    + texture2D(uColorMap, vec2(0.625, vUv.y)).rgb
    + texture2D(uColorMap, vec2(0.875, vUv.y)).rgb
  ) * 0.25;
  float polarHeight = (
    texture2D(uHeightMap, vec2(0.125, vUv.y)).r
    + texture2D(uHeightMap, vec2(0.375, vUv.y)).r
    + texture2D(uHeightMap, vec2(0.625, vUv.y)).r
    + texture2D(uHeightMap, vec2(0.875, vUv.y)).r
  ) * 0.25;
  vec3 base = mix(texture2D(uColorMap, vUv).rgb, polarBase, polarBlend * 0.98);
  float height = mix(texture2D(uHeightMap, vUv).r, polarHeight, polarBlend * 0.98);
  float heightRight = texture2D(uHeightMap, vUv + vec2(uTexel.x, 0.0)).r;
  float heightLeft = texture2D(uHeightMap, vUv - vec2(uTexel.x, 0.0)).r;
  float heightUp = texture2D(uHeightMap, vUv + vec2(0.0, uTexel.y)).r;
  float heightDown = texture2D(uHeightMap, vUv - vec2(0.0, uTexel.y)).r;
  vec3 normal = normalize(
    vNormal
    + (heightRight - heightLeft) * vTangent * uBumpScale * uBumpEnabled * 2.0 * (1.0 - polarBlend * 0.86)
    + (heightUp - heightDown) * vBitangent * uBumpScale * uBumpEnabled * 2.0
  );

  vec3 lightDirection = normalize(uLightDirection);
  vec3 viewDirection = vec3(0.0, 0.0, 1.0);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  // 环境光保留暗部地表信息，定向光负责让山地起伏变得可见。
  float light = 0.36 + diffuse * 0.72;
  float heightTint = 0.96 + (height - 0.42) * 0.10 * uBumpEnabled;
  // 低幅度的高度响应让“开/关 bump”在移动端截图中可辨识，仍不会
  // 把真实比例的山脉夸张成几何凸起。
  float reliefLight = 1.0 + (height - 0.42) * 0.26 * uBumpEnabled;
  vec3 lit = base * light * heightTint * reliefLight;

  float polarSpecular = (
    texture2D(uSpecularMap, vec2(0.125, vUv.y)).r
    + texture2D(uSpecularMap, vec2(0.375, vUv.y)).r
    + texture2D(uSpecularMap, vec2(0.625, vUv.y)).r
    + texture2D(uSpecularMap, vec2(0.875, vUv.y)).r
  ) * 0.25;
  float specularMap = mix(texture2D(uSpecularMap, vUv).r, polarSpecular, polarBlend * 0.92);
  float highlight = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), 34.0);
  lit += vec3(0.66, 0.86, 0.96) * highlight * specularMap * 0.22;

  // Fresnel 只在边缘轻微提亮，避免形成完整的人工圆环。
  float facing = max(dot(normal, viewDirection), 0.0);
  float fresnel = pow(1.0 - facing, 4.0) * uAtmosphereEnabled * uAtmosphereStrength;
  lit += vec3(0.018, 0.085, 0.13) * fresnel;

  // Oversized partial globe 会超出 Canvas 的矩形视口。让接近视口边缘的
  // 地表逐渐透明，避免左右和底部出现“图片被裁掉”的硬直线；这不是
  // 人造圆框，真正的球面轮廓仍由几何体和光照决定。
  float leftDistance = gl_FragCoord.x;
  float rightDistance = uResolution.x - gl_FragCoord.x;
  float bottomDistance = uResolution.y - vScreenPixel.y;
  float sideFade = smoothstep(0.0, uResolution.x * 0.095, leftDistance)
    * smoothstep(0.0, uResolution.x * 0.095, rightDistance);
  float bottomFade = smoothstep(0.0, uResolution.y * 0.28, bottomDistance);
  float edgeAlpha = sideFade * bottomFade;
  // 片元 alpha 让 Canvas 之外继续透出星空与底部信息，而不是把整个
  // 原生 Canvas 视口作为一张不透明矩形贴图压在页面上。
  gl_FragColor = vec4(clamp(lit, 0.0, 1.0), edgeAlpha);
}
`;

const MARKER_VERTEX_SHADER = `
attribute vec3 aMarkerPosition;
uniform float uRotation;
uniform float uPitch;
uniform vec2 uCenter;
uniform vec2 uResolution;
uniform float uRadius;
uniform float uMarkerSize;
varying float vMarkerDepth;

vec3 rotateMarker(vec3 value) {
  float yCos = cos(uRotation);
  float ySin = sin(uRotation);
  vec3 yaw = vec3(value.x * yCos - value.z * ySin, value.y, value.x * ySin + value.z * yCos);
  float xCos = cos(uPitch);
  float xSin = sin(uPitch);
  return vec3(yaw.x, yaw.y * xCos - yaw.z * xSin, yaw.y * xSin + yaw.z * xCos);
}

void main() {
  vec3 position = rotateMarker(aMarkerPosition);
  vMarkerDepth = position.z;
  vec2 pixel = vec2(uCenter.x + position.x * uRadius, uCenter.y - position.y * uRadius);
  vec2 clip = vec2((pixel.x / uResolution.x) * 2.0 - 1.0, 1.0 - (pixel.y / uResolution.y) * 2.0);
  gl_Position = vec4(clip, -position.z - 0.0005, 1.0);
  gl_PointSize = uMarkerSize;
}
`;

const MARKER_FRAGMENT_SHADER = `
precision mediump float;
uniform vec4 uMarkerColor;
varying float vMarkerDepth;

void main() {
  if (vMarkerDepth <= 0.015) discard;
  vec2 point = gl_PointCoord - vec2(0.5);
  float distanceFromCenter = length(point);
  if (distanceFromCenter > 0.5) discard;
  float alpha = smoothstep(0.5, 0.22, distanceFromCenter) * uMarkerColor.a;
  gl_FragColor = vec4(uMarkerColor.rgb, alpha);
}
`;

function createSphereGeometry(latSegments = 48, lonSegments = 96): {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  tangents: Float32Array;
  bitangents: Float32Array;
  indices: Uint16Array;
} {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const tangents: number[] = [];
  const bitangents: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= latSegments; y += 1) {
    const v = y / latSegments;
    const latitude = (v - 0.5) * Math.PI;
    const sinLat = Math.sin(latitude);
    const cosLat = Math.cos(latitude);
    for (let x = 0; x <= lonSegments; x += 1) {
      const u = x / lonSegments;
      // 把经度接缝放在网格首尾。若在球面中间通过 `(u + 0.5) % 1`
      // 换算 UV，会让相邻顶点从 0.99 直接插值到 0，形成整条拉伸裂缝。
      // 这里让 u=0/1 同时对应贴图的 -180°/180°，首尾顶点位置重合，
      // 由索引自然闭合球面，并保持 Greenwich（经度 0）位于 +Z。
      const longitude = (u - 0.5) * Math.PI * 2;
      const sinLon = Math.sin(longitude);
      const cosLon = Math.cos(longitude);
      const px = cosLat * sinLon;
      const py = sinLat;
      const pz = cosLat * cosLon;
      positions.push(px, py, pz);
      normals.push(px, py, pz);
      uvs.push(u, 1 - v);
      tangents.push(cosLon, 0, -sinLon);
      bitangents.push(-sinLat * sinLon, cosLat, -sinLat * cosLon);
    }
  }

  const row = lonSegments + 1;
  for (let y = 0; y < latSegments; y += 1) {
    for (let x = 0; x < lonSegments; x += 1) {
      const topLeft = y * row + x;
      const bottomLeft = (y + 1) * row + x;
      indices.push(topLeft, bottomLeft, topLeft + 1, topLeft + 1, bottomLeft, bottomLeft + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    tangents: new Float32Array(tangents),
    bitangents: new Float32Array(bitangents),
    indices: new Uint16Array(indices),
  };
}

export class WebGLGlobeRenderer {
  private readonly canvas: WebGLCanvasLike;
  private readonly gl: WebGLContextLike;
  private readonly program: unknown;
  private readonly markerProgram: unknown;
  private readonly geometry: Geometry;
  private readonly textures: TextureSet;
  private readonly width: number;
  private readonly height: number;
  private readonly radius: number;
  private readonly centerX: number;
  private readonly centerY: number;
  private readonly pixelRatio: number;
  private readonly options: Required<GlobeRenderOptions>;
  private readonly rotationLocation: unknown;
  private readonly pitchLocation: unknown;
  private readonly centerLocation: unknown;
  private readonly resolutionLocation: unknown;
  private readonly radiusLocation: unknown;
  private readonly texelLocation: unknown;
  private readonly lightLocation: unknown;
  private readonly bumpEnabledLocation: unknown;
  private readonly bumpScaleLocation: unknown;
  private readonly atmosphereEnabledLocation: unknown;
  private readonly atmosphereStrengthLocation: unknown;
  private readonly colorMapLocation: unknown;
  private readonly heightMapLocation: unknown;
  private readonly specularMapLocation: unknown;
  private readonly markerPositionLocation: number;
  private readonly markerRotationLocation: unknown;
  private readonly markerPitchLocation: unknown;
  private readonly markerCenterLocation: unknown;
  private readonly markerResolutionLocation: unknown;
  private readonly markerRadiusLocation: unknown;
  private readonly markerSizeLocation: unknown;
  private readonly markerColorLocation: unknown;
  private readonly markerBuffer: unknown;
  private readonly buffers: unknown[];
  private markers: GlobeMarker[] = [];
  private renderedMarkers: Array<GlobeMarker & { x: number; y: number; z: number }> = [];
  private projectionListener: GlobeProjectionListener | null = null;
  private rotation = 1.5;
  private pitch = 0;
  private selectedId = "";
  private timer: ReturnType<typeof setInterval> | null = null;
  private focusTimer: ReturnType<typeof setInterval> | null = null;
  private momentumTimer: ReturnType<typeof setInterval> | null = null;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;
  private rotating = true;

  constructor(
    canvas: WebGLCanvasLike,
    width: number,
    height: number,
    pixelRatio: number,
    variant: GlobeVariant = "half",
    options: GlobeRenderOptions = {},
  ) {
    this.canvas = canvas;
    this.gl = this.getContext(canvas);
    this.width = width;
    this.height = height;
    this.pixelRatio = Math.max(1, pixelRatio);
    const earthOnly = options.earthOnly === true;
    const selectedMode = options.selectedMode === true;
    // Canvas 始终保持在页面视口内。放大地球由球体半径控制，不再依赖
    // “110% 宽度 + 负 left” 的裁剪技巧，否则会把左缘硬切并挤压右侧 HUD。
    this.centerX = earthOnly ? width * 0.5 : selectedMode ? width * 0.5 : variant === "third" ? width * 0.51 : variant === "low" ? width * 0.56 : width * 0.5;
    this.centerY = earthOnly ? height * 0.52 : selectedMode ? height * 0.43 : variant === "third" ? height * 1.2 : variant === "low" ? height * 1.08 : height * 0.66;
    this.radius = earthOnly
      ? Math.min(width * 0.72, height * 0.72)
      : selectedMode
        ? Math.min(width * 0.50, height * 0.48)
      : variant === "third"
      ? Math.min(width * 0.73, height * 0.9)
      : variant === "low"
        ? Math.min(width * 0.73, height * 0.9)
        : Math.min(width * 0.52, height * 0.56);
    this.options = {
      earthOnly,
      selectedMode,
      bumpEnabled: options.bumpEnabled !== false,
      atmosphereEnabled: options.atmosphereEnabled !== false,
      bumpScale: Math.max(0, Math.min(1.4, options.bumpScale ?? 0.82)),
      atmosphereStrength: Math.max(0, Math.min(1, options.atmosphereStrength ?? 0.62)),
      textureScale: options.textureScale ?? 2048,
    };
    this.canvas.width = Math.round(width * this.pixelRatio);
    this.canvas.height = Math.round(height * this.pixelRatio);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.enable(GL.DEPTH_TEST);
    this.gl.depthFunc(GL.LEQUAL);
    this.gl.enable(GL.BLEND);
    this.gl.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
    this.markerProgram = this.createProgram(MARKER_VERTEX_SHADER, MARKER_FRAGMENT_SHADER);
    this.geometry = this.createGeometry();
    this.buffers = this.createBuffers(this.geometry);
    this.textures = this.createTextures();
    this.markerBuffer = this.gl.createBuffer();
    if (!this.markerBuffer) throw new Error("WebGL marker buffer unavailable");
    this.rotationLocation = this.gl.getUniformLocation(this.program, "uRotation");
    this.pitchLocation = this.gl.getUniformLocation(this.program, "uPitch");
    this.centerLocation = this.gl.getUniformLocation(this.program, "uCenter");
    this.resolutionLocation = this.gl.getUniformLocation(this.program, "uResolution");
    this.radiusLocation = this.gl.getUniformLocation(this.program, "uRadius");
    this.texelLocation = this.gl.getUniformLocation(this.program, "uTexel");
    this.lightLocation = this.gl.getUniformLocation(this.program, "uLightDirection");
    this.bumpEnabledLocation = this.gl.getUniformLocation(this.program, "uBumpEnabled");
    this.bumpScaleLocation = this.gl.getUniformLocation(this.program, "uBumpScale");
    this.atmosphereEnabledLocation = this.gl.getUniformLocation(this.program, "uAtmosphereEnabled");
    this.atmosphereStrengthLocation = this.gl.getUniformLocation(this.program, "uAtmosphereStrength");
    this.colorMapLocation = this.gl.getUniformLocation(this.program, "uColorMap");
    this.heightMapLocation = this.gl.getUniformLocation(this.program, "uHeightMap");
    this.specularMapLocation = this.gl.getUniformLocation(this.program, "uSpecularMap");
    this.markerPositionLocation = this.gl.getAttribLocation(this.markerProgram, "aMarkerPosition");
    this.markerRotationLocation = this.gl.getUniformLocation(this.markerProgram, "uRotation");
    this.markerPitchLocation = this.gl.getUniformLocation(this.markerProgram, "uPitch");
    this.markerCenterLocation = this.gl.getUniformLocation(this.markerProgram, "uCenter");
    this.markerResolutionLocation = this.gl.getUniformLocation(this.markerProgram, "uResolution");
    this.markerRadiusLocation = this.gl.getUniformLocation(this.markerProgram, "uRadius");
    this.markerSizeLocation = this.gl.getUniformLocation(this.markerProgram, "uMarkerSize");
    this.markerColorLocation = this.gl.getUniformLocation(this.markerProgram, "uMarkerColor");
    this.loadTextures();
    this.draw();
  }

  setMarkers(markers: GlobeMarker[]): void {
    this.markers = markers;
    this.draw();
  }

  setProjectionListener(listener: GlobeProjectionListener | null): void {
    this.projectionListener = listener;
    this.emitProjections();
  }

  setSelected(id: string | null): void {
    this.selectedId = id ?? "";
    this.draw();
  }

  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      if (this.rotating) {
        this.rotation += 0.0045;
        this.draw();
      }
    }, 80);
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.cancelMotion();
  }

  pauseRotation(): void {
    this.rotating = false;
  }

  resumeRotation(): void {
    this.rotating = true;
  }

  reset(): void {
    this.cancelMotion();
    this.rotation = 1.5;
    this.pitch = 0;
    this.selectedId = "";
    this.draw();
  }

  dragBy(deltaX: number, deltaY = 0): void {
    this.cancelFocus();
    this.rotation += (deltaX / Math.max(1, this.width)) * 2.2;
    this.pitch = Math.max(-0.38, Math.min(0.38, this.pitch - (deltaY / Math.max(1, this.height)) * 1.2));
    this.draw();
  }

  release(velocityX: number, velocityY: number): void {
    this.cancelMotion();
    let momentumX = velocityX;
    let momentumY = velocityY;
    if (Math.abs(momentumX) < 0.8 && Math.abs(momentumY) < 0.8) {
      this.scheduleAutoResume();
      return;
    }
    this.rotating = false;
    this.momentumTimer = setInterval(() => {
      this.rotation += (momentumX / Math.max(1, this.width)) * 0.42;
      this.pitch = Math.max(-0.38, Math.min(0.38, this.pitch - (momentumY / Math.max(1, this.height)) * 0.16));
      momentumX *= 0.86;
      momentumY *= 0.86;
      this.draw();
      if (Math.abs(momentumX) < 0.25 && Math.abs(momentumY) < 0.25) {
        if (this.momentumTimer !== null) clearInterval(this.momentumTimer);
        this.momentumTimer = null;
        this.scheduleAutoResume();
      }
    }, 80);
  }

  focusOnMarker(id: string): void {
    const marker = this.markers.find((item) => item.id === id);
    if (!marker) return;
    this.cancelMotion();
    this.rotating = false;
    const from = this.rotation;
    const rawTarget = marker.longitude * DEG;
    const target = from + Math.atan2(Math.sin(rawTarget - from), Math.cos(rawTarget - from));
    const startedAt = Date.now();
    const duration = 760;
    this.focusTimer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.rotation = from + (target - from) * eased;
      this.draw();
      if (progress >= 1) {
        if (this.focusTimer !== null) clearInterval(this.focusTimer);
        this.focusTimer = null;
        this.scheduleAutoResume(2600);
      }
    }, 16);
  }

  hitTest(x: number, y: number): string | null {
    const candidates = [...this.renderedMarkers].sort((a, b) => b.z - a.z);
    const hitRadius = Math.max(20, this.radius * 0.075);
    const hit = candidates.find((marker) => Math.hypot(marker.x - x, marker.y - y) <= hitRadius);
    return hit?.id ?? null;
  }

  dispose(): void {
    this.stop();
    this.buffers.forEach((buffer) => this.gl.deleteBuffer(buffer));
    this.gl.deleteTexture(this.textures.color);
    this.gl.deleteTexture(this.textures.height);
    this.gl.deleteTexture(this.textures.specular);
    this.gl.deleteProgram(this.program);
    this.gl.deleteBuffer(this.markerBuffer);
    this.gl.deleteProgram(this.markerProgram);
    this.projectionListener = null;
  }

  private getContext(canvas: WebGLCanvasLike): WebGLContextLike {
    // 小程序 Canvas 需要显式打开透明合成，否则片元 alpha 只会在 Canvas
    // 内部生效，页面仍会把整个矩形视口当成不透明层，边缘就会被硬切。
    const attributes = { alpha: true, premultipliedAlpha: false };
    const context = canvas.getContext("webgl", attributes) ?? canvas.getContext("experimental-webgl", attributes);
    if (!context) throw new Error("WebGL context unavailable");
    return context;
  }

  private createProgram(vertexSource: string, fragmentSource: string): unknown {
    const vertex = this.createShader(GL.VERTEX_SHADER, vertexSource);
    const fragment = this.createShader(GL.FRAGMENT_SHADER, fragmentSource);
    const program = this.gl.createProgram();
    if (!program) throw new Error("WebGL program unavailable");
    this.gl.attachShader(program, vertex);
    this.gl.attachShader(program, fragment);
    this.gl.linkProgram(program);
    this.gl.deleteShader(vertex);
    this.gl.deleteShader(fragment);
    if (!this.gl.getProgramParameter(program, GL.LINK_STATUS)) {
      throw new Error(this.gl.getProgramInfoLog(program) ?? "WebGL program link failed");
    }
    return program;
  }

  private createShader(type: number, source: string): unknown {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error("WebGL shader unavailable");
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, GL.COMPILE_STATUS)) {
      const log = this.gl.getShaderInfoLog(shader) ?? "WebGL shader compile failed";
      this.gl.deleteShader(shader);
      throw new Error(log);
    }
    return shader;
  }

  private createGeometry(): Geometry {
    const data = createSphereGeometry();
    return {
      position: data.positions,
      normal: data.normals,
      uv: data.uvs,
      tangent: data.tangents,
      bitangent: data.bitangents,
      index: data.indices,
      indexCount: data.indices.length,
    };
  }

  private createBuffers(geometry: Geometry): unknown[] {
    const create = (target: number, data: unknown): unknown => {
      const buffer = this.gl.createBuffer();
      if (!buffer) throw new Error("WebGL buffer unavailable");
      this.gl.bindBuffer(target, buffer);
      this.gl.bufferData(target, data, GL.STATIC_DRAW);
      return buffer;
    };
    return [
      create(GL.ARRAY_BUFFER, geometry.position),
      create(GL.ARRAY_BUFFER, geometry.normal),
      create(GL.ARRAY_BUFFER, geometry.uv),
      create(GL.ARRAY_BUFFER, geometry.tangent),
      create(GL.ARRAY_BUFFER, geometry.bitangent),
      create(GL.ELEMENT_ARRAY_BUFFER, geometry.index),
    ];
  }

  private createTextures(): TextureSet {
    const create = (): unknown => {
      const texture = this.gl.createTexture();
      if (!texture) throw new Error("WebGL texture unavailable");
      this.gl.bindTexture(GL.TEXTURE_2D, texture);
      this.gl.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
      this.gl.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
      // 横向经度是周期性的。使用 REPEAT 让接缝附近的线性采样跨越
      // 贴图首尾，而不是把首尾边缘各自 clamp 成一条可见的硬带。
      this.gl.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.REPEAT);
      this.gl.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
      this.gl.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, 1, 1, 0, GL.RGBA, GL.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      return texture;
    };
    return { color: create(), height: create(), specular: create() };
  }

  private loadTextures(): void {
    if (!this.canvas.createImage) return;
    const suffix = this.options.textureScale;
    const sources: Array<{ key: keyof TextureSet; src: string }> = [
      { key: "color", src: `/assets/world/globe-texture-realistic-${suffix}.png` },
      { key: "height", src: `/assets/world/globe-height-${suffix}.png` },
      { key: "specular", src: `/assets/world/globe-specular-${suffix}.png` },
    ];
    sources.forEach(({ key, src }, index) => {
      const image = this.canvas.createImage?.();
      if (!image) return;
      image.onload = () => {
        this.uploadTexture(this.textures[key], image, index);
        this.draw();
      };
      image.onerror = () => {
        // 保留 1×1 占位图，地球仍可用基础光照渲染，不阻断页面交互。
        this.draw();
      };
      image.src = src;
    });
  }

  private uploadTexture(texture: unknown, image: ImageLike, index: number): void {
    this.gl.activeTexture(GL.TEXTURE0 + index);
    this.gl.bindTexture(GL.TEXTURE_2D, texture);
    this.gl.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, 0);
    this.gl.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, image);
  }

  private draw(): void {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    this.bindAttribute("aPosition", this.buffers[0], 3);
    this.bindAttribute("aNormal", this.buffers[1], 3);
    this.bindAttribute("aUv", this.buffers[2], 2);
    this.bindAttribute("aTangent", this.buffers[3], 3);
    this.bindAttribute("aBitangent", this.buffers[4], 3);
    gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.buffers[5]);
    gl.uniform1f(this.rotationLocation, this.rotation);
    gl.uniform1f(this.pitchLocation, this.pitch);
    gl.uniform2f(this.centerLocation, this.centerX * this.pixelRatio, this.centerY * this.pixelRatio);
    gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.radiusLocation, this.radius * this.pixelRatio);
    gl.uniform2f(this.texelLocation, 1 / this.options.textureScale, 1 / (this.options.textureScale / 2));
    gl.uniform3f(this.lightLocation, -0.42, 0.60, 0.68);
    gl.uniform1f(this.bumpEnabledLocation, this.options.bumpEnabled ? 1 : 0);
    gl.uniform1f(this.bumpScaleLocation, this.options.bumpScale);
    gl.uniform1f(this.atmosphereEnabledLocation, this.options.atmosphereEnabled ? 1 : 0);
    gl.uniform1f(this.atmosphereStrengthLocation, this.options.atmosphereStrength);
    this.bindTexture(0, this.textures.color, this.colorMapLocation);
    this.bindTexture(1, this.textures.height, this.heightMapLocation);
    this.bindTexture(2, this.textures.specular, this.specularMapLocation);
    gl.drawElements(GL.TRIANGLES, this.geometry.indexCount, GL.UNSIGNED_SHORT, 0);
    this.drawMarkerPoints();
    this.updateProjections();
  }

  private drawMarkerPoints(): void {
    if (!this.markers.length || this.markerPositionLocation < 0) return;
    const selected: number[] = [];
    const normal: number[] = [];
    this.markers.forEach((marker) => {
      const latitude = marker.latitude * DEG;
      const longitude = marker.longitude * DEG;
      const position = [
        Math.cos(latitude) * Math.sin(longitude),
        Math.sin(latitude),
        Math.cos(latitude) * Math.cos(longitude),
      ];
      (marker.id === this.selectedId ? selected : normal).push(...position);
    });

    this.gl.useProgram(this.markerProgram);
    this.gl.bindBuffer(GL.ARRAY_BUFFER, this.markerBuffer);
    this.gl.enableVertexAttribArray(this.markerPositionLocation);
    this.gl.vertexAttribPointer(this.markerPositionLocation, 3, GL.FLOAT, false, 0, 0);
    this.gl.uniform1f(this.markerRotationLocation, this.rotation);
    this.gl.uniform1f(this.markerPitchLocation, this.pitch);
    this.gl.uniform2f(this.markerCenterLocation, this.centerX * this.pixelRatio, this.centerY * this.pixelRatio);
    this.gl.uniform2f(this.markerResolutionLocation, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.markerRadiusLocation, this.radius * this.pixelRatio);
    // 地理可见性由 marker shader 的球面 z 判断；关闭深度测试可以避免
    // 与同一球面上的插值深度出现移动端精度竞争，让选中点稳定可见。
    this.gl.disable(GL.DEPTH_TEST);
    if (normal.length) this.drawMarkerPointGroup(normal, 11, 0.30, 0.88, 0.94, 0.94);
    if (selected.length) this.drawMarkerPointGroup(selected, 22, 1.0, 0.35, 0.24, 1.0);
    this.gl.enable(GL.DEPTH_TEST);
  }

  private drawMarkerPointGroup(points: number[], size: number, red: number, green: number, blue: number, alpha: number): void {
    this.gl.bindBuffer(GL.ARRAY_BUFFER, this.markerBuffer);
    this.gl.bufferData(GL.ARRAY_BUFFER, new Float32Array(points), GL.DYNAMIC_DRAW);
    this.gl.uniform1f(this.markerSizeLocation, size * this.pixelRatio);
    this.gl.uniform4f(this.markerColorLocation, red, green, blue, alpha);
    this.gl.drawArrays(GL.POINTS, 0, points.length / 3);
  }

  private bindAttribute(name: string, buffer: unknown, size: number): void {
    const location = this.gl.getAttribLocation(this.program, name);
    if (location < 0) return;
    this.gl.bindBuffer(GL.ARRAY_BUFFER, buffer);
    this.gl.enableVertexAttribArray(location);
    this.gl.vertexAttribPointer(location, size, GL.FLOAT, false, 0, 0);
  }

  private bindTexture(index: number, texture: unknown, location: unknown): void {
    this.gl.activeTexture(GL.TEXTURE0 + index);
    this.gl.bindTexture(GL.TEXTURE_2D, texture);
    this.gl.uniform1i(location, index);
  }

  private updateProjections(): void {
    this.renderedMarkers = this.markers
      .map((marker) => {
        const point = projectGlobePoint(marker.latitude, marker.longitude, this.rotation, this.pitch, this.centerX, this.centerY, this.radius);
        return { ...marker, x: point.x, y: point.y, z: point.z };
      })
      .filter((marker) => marker.z > 0.015);
    this.emitProjections();
  }

  private emitProjections(): void {
    if (!this.projectionListener) return;
    const projections = this.markers.map((marker) => {
      const point = projectGlobePoint(marker.latitude, marker.longitude, this.rotation, this.pitch, this.centerX, this.centerY, this.radius);
      const visible = point.z > 0.015;
      return {
        id: marker.id,
        x: point.x,
        y: point.y,
        z: point.z,
        visible,
        screenX: point.x,
        screenY: point.y,
        opacity: visible
          ? marker.id === this.selectedId ? 1 : Math.max(0.22, Math.min(1, point.z * 0.82 + 0.18))
          : 0,
      };
    });
    this.projectionListener(projections);
  }

  private cancelFocus(): void {
    if (this.focusTimer !== null) clearInterval(this.focusTimer);
    this.focusTimer = null;
  }

  private cancelMotion(): void {
    this.cancelFocus();
    if (this.momentumTimer !== null) clearInterval(this.momentumTimer);
    this.momentumTimer = null;
    if (this.resumeTimer !== null) clearTimeout(this.resumeTimer);
    this.resumeTimer = null;
  }

  private scheduleAutoResume(delay = 1400): void {
    if (this.resumeTimer !== null) clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = null;
      this.rotating = true;
    }, delay);
  }
}
