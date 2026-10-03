/**
 * Foggy — CampusFind's 3D assistant (three.js r128).
 *
 * Draws the character into a canvas and runs its animation loop. It never touches the page
 * (no DOM, no window), so the same code runs inside a Web Worker on an OffscreenCanvas —
 * which is how the FAQ uses it, keeping every bit of 3D work off the page's main thread.
 * Size, pointer input and expression arrive as method calls; `dispose()` frees the GPU.
 */
import * as THREE from "three";

export type FoggyExpression = "hello" | "happy" | "thinking" | "excited" | "typing" | "curious" | "cheerful";

export interface FoggyController {
  setExpression(name: FoggyExpression): void;
  pop(): void;
  wave(): void;
  bounce(): void;
  boop(): void;
  /** Start/stop the render loop (pause when off screen or the tab is hidden). */
  setActive(active: boolean): void;
  /** Dark backgrounds: slightly lower exposure and a stronger rim light so the outline reads. */
  setTheme(dark: boolean): void;
  /** Canvas size in CSS pixels, plus the screen's device pixel ratio. */
  resize(width: number, height: number, devicePixelRatio: number): void;
  /** Cursor position relative to Foggy, each axis about -1..1. His eyes follow it. */
  look(x: number, y: number): void;
  pointerDown(id: number, clientX: number, clientY: number): void;
  pointerMove(id: number, clientX: number, clientY: number): void;
  /** ndcX/ndcY: where the pointer was released, in canvas space (-1..1), to detect a tap on Foggy. */
  pointerUp(id: number, ndcX: number, ndcY: number): void;
  pointerCancel(id: number): void;
  dispose(): void;
}

/** An on-page canvas, or an OffscreenCanvas when running in a worker. */
export type FoggyCanvas = HTMLCanvasElement | OffscreenCanvas;

export interface FoggyOptions {
  width: number;
  height: number;
  devicePixelRatio: number;
  reduceMotion: boolean;
  /** Checked between setup steps; when true, setup stops and frees everything. */
  isCancelled?: () => boolean;
  /** Which quality level was picked for this device. */
  onQuality?: (quality: FoggyQuality) => void;
  onFirstFrame?: () => void;
  onMoodChange?: (label: string) => void;
  onBoop?: () => void;
}

/* ---------- quality: picked from the device, not hard-coded ---------- */

export type FoggyQuality = "high" | "medium" | "low";

const QUALITY_SETTINGS: Record<
  FoggyQuality,
  { maxPixelRatio: number; shadows: boolean; bodySegments: [number, number]; glossyBody: boolean }
> = {
  // Dedicated / Apple GPUs: full retina sharpness, real soft shadow, the original detail.
  high: { maxPixelRatio: 2, shadows: true, bodySegments: [220, 160], glossyBody: true },
  // Integrated laptop GPUs (Intel UHD/Iris, AMD APUs) and mid-range phones.
  medium: { maxPixelRatio: 1.5, shadows: false, bodySegments: [176, 128], glossyBody: false },
  // Software rendering, very old phones, data saver.
  low: { maxPixelRatio: 1, shadows: false, bodySegments: [128, 96], glossyBody: false },
};

function detectQuality(gl: WebGLRenderingContext): FoggyQuality {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = String(debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory || 4;

  if (nav.connection?.saveData || /swiftshader|llvmpipe|software|basic render/i.test(gpu)) return "low";
  if (cores <= 2 || memory <= 2 || /mali-[gt]?[4-7]\d\b|adreno[^0-9]*[3-5]\d\d\b|powervr/i.test(gpu)) return "low";
  if (/nvidia|geforce|quadro|rtx|gtx|radeon rx|radeon pro|apple m\d|apple gpu|arc\(tm\) a|\barc a\d/i.test(gpu)) return "high";
  return "medium";
}

/** Lets the thread breathe between heavy setup steps. */
const pause = () => new Promise<void>((resolve) => globalThis.setTimeout(resolve, 16));

// Workers in older Safari have no requestAnimationFrame; fall back to a ~60fps timer there.
const scheduleFrame = (callback: (now: number) => void): number =>
  typeof requestAnimationFrame === "function"
    ? requestAnimationFrame(callback)
    : (globalThis.setTimeout(() => callback(performance.now()), 16) as unknown as number);
const cancelFrame = (handle: number) =>
  typeof cancelAnimationFrame === "function" ? cancelAnimationFrame(handle) : globalThis.clearTimeout(handle);

type V3 = THREE.Vector3;
const V3 = THREE.Vector3;
const Z = new V3(0, 0, 1);
const col = (hex: number) => new THREE.Color(hex).convertSRGBToLinear();

interface ExpressionDef {
  label: string;
  eyes: [EyeShape, EyeShape];
  size?: [number, number];
  look?: [number, number];
  mouth: MouthShape;
  mouthSize?: number;
  blush: number;
  A: [number, number];
  B: [number, number];
  props: PropName[];
  marks?: number;
  wiggle?: boolean;
  tilt?: number;
  pitch?: number;
  hop?: boolean;
  typing?: boolean;
}
type EyeShape = "open" | "arc" | "chevR" | "chevL";
type MouthShape = "open" | "small" | "flat" | "o";
type PropName = "sun" | "question" | "sparkles" | "laptop" | "magnifier";

const EXPR: Record<FoggyExpression, ExpressionDef> = {
  hello: { label: "friendly", eyes: ["open", "open"], size: [1, 1], mouth: "open", blush: 0.85, A: [-0.25, -0.45], B: [0, 2.5], props: [], marks: 1, wiggle: true },
  happy: { label: "happy", eyes: ["arc", "arc"], mouth: "open", blush: 1, A: [-0.1, -0.75], B: [-0.1, 0.75], props: ["sun"], tilt: -0.05 },
  thinking: { label: "thoughtful", eyes: ["open", "open"], size: [0.75, 0.75], look: [0.07, 0.07], mouth: "flat", blush: 0.45, A: [-1.6, 0.7], B: [0, 0.3], props: ["question"], tilt: 0.12 },
  excited: { label: "excited", eyes: ["chevR", "chevL"], mouth: "open", mouthSize: 1.15, blush: 1, A: [0, -2.35], B: [0, 2.35], props: ["sparkles"], hop: true },
  typing: { label: "busy typing", eyes: ["arc", "arc"], look: [0, -0.05], mouth: "small", blush: 0.7, A: [-1.25, 0.2], B: [-1.25, -0.2], props: ["laptop"], typing: true, pitch: 0.06 },
  curious: { label: "curious", eyes: ["open", "open"], size: [1.4, 0.95], mouth: "o", blush: 0.6, A: [-1.15, -0.35], B: [0, 0.35], props: ["magnifier"], tilt: -0.09 },
  cheerful: { label: "cheerful", eyes: ["chevR", "open"], mouth: "small", blush: 0.95, A: [-0.2, -0.4], B: [0, 2.3], props: [], marks: 1, wiggle: true, tilt: 0.06 },
};

class Spring {
  v = 0;
  t: number;
  constructor(public x = 0, public k = 170, public c = 18) {
    this.t = x;
  }
  step(dt: number) {
    const a = this.k * (this.t - this.x) - this.c * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
  }
}

/**
 * Builds Foggy step by step, pausing between heavy steps. Meant to run in a worker; the
 * page-thread fallback benefits from the pauses too. Resolves to null if cancelled.
 */
export async function createFoggyScene(canvas: FoggyCanvas, options: FoggyOptions): Promise<FoggyController | null> {
  const { reduceMotion } = options;
  const isCancelled = options.isCancelled ?? (() => false);

  // Throws if WebGL is unavailable — the caller reports that and Foggy stays hidden.
  // "high-performance" asks for the device's strongest GPU (the discrete one on dual-GPU laptops).
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas as HTMLCanvasElement,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  const quality = detectQuality(renderer.getContext());
  const settings = QUALITY_SETTINGS[quality];
  options.onQuality?.(quality);

  let deviceRatio = options.devicePixelRatio || 1;
  /** Highest pixel ratio allowed; the slow-frame safety net lowers it. */
  let ratioCeiling = settings.maxPixelRatio;
  let pixelRatio = Math.min(deviceRatio, ratioCeiling);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04; // was 1.12, which blew the body out to pure white
  if (settings.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const springs: Spring[] = [];
  const spr = (x?: number, k?: number, c?: number) => {
    const s = new Spring(x, k, c);
    springs.push(s);
    return s;
  };

  /* ---------- scene, camera, light ---------- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

  let envTexture: THREE.Texture | null = null;
  /** Frees whatever has been built so far when setup is cancelled part-way. */
  const bail = () => {
    disposeTree(scene);
    envTexture?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return null;
  };

  // Studio reflections (soft environment lighting for the materials).
  {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: col(0x7d7a72), side: THREE.BackSide })));
    const panel = (w: number, h: number, x: number, y: number, z: number, k: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k * 0.96), side: THREE.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    panel(7, 7, -6, 7, 7, 5); // big key softbox
    panel(9, 3, 7, 3, 5, 2.2); // side strip
    panel(14, 14, 0, 12, 0, 2.4); // ceiling
    panel(8, 4, 0, 3, -10, 1.6); // back rim
    envTexture = pmrem.fromScene(env, 0.035).texture;
    pmrem.dispose();
    disposeTree(env);
  }
  scene.environment = envTexture;
  await pause();
  if (isCancelled()) return bail();

  // Warm ground bounce gives the underside beige shadows instead of grey ones.
  scene.add(new THREE.HemisphereLight(col(0xfffaf0), col(0xc9b48f), 0.4));
  const key = new THREE.DirectionalLight(col(0xfff3e4), settings.shadows ? 1.2 : 1.45);
  key.position.set(-3.2, 6, 5);
  scene.add(key);

  if (settings.shadows) {
    // Nearly overhead, so the soft shadow lands under the feet (the original side light
    // threw it off to the right, which read as wrong).
    const shadowLight = new THREE.DirectionalLight(col(0xffffff), 0.3);
    shadowLight.position.set(0.4, 8, 1.6);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.set(1024, 1024);
    Object.assign(shadowLight.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: 1, far: 14 });
    shadowLight.shadow.bias = -0.0004;
    shadowLight.shadow.normalBias = 0.03;
    scene.add(shadowLight);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.12 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }
  const rim = new THREE.DirectionalLight(col(0xffffff), 0.85);
  rim.position.set(2.5, 4, -5);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(col(0xeef3ff), 0.3);
  fill.position.set(5, 1.5, 4);
  scene.add(fill);

  function radialTexture(stops: [number, string][], size = 256) {
    // OffscreenCanvas works in workers and pages alike; plain canvas for very old browsers.
    const c: HTMLCanvasElement | OffscreenCanvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(size, size)
        : Object.assign(document.createElement("canvas"), { width: size, height: size });
    const g = c.getContext("2d") as CanvasRenderingContext2D;
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, s]) => grd.addColorStop(o, s));
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c as HTMLCanvasElement);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  // Soft contact shadow centred under the feet; it shrinks and fades when Foggy jumps.
  const blobMat = new THREE.MeshBasicMaterial({
    map: radialTexture([[0, "rgba(40,38,30,0.62)"], [0.4, "rgba(40,38,30,0.26)"], [1, "rgba(40,38,30,0)"]]),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), blobMat);
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(0, 0.003, 0.12);
  scene.add(blob);

  /* ---------- materials ---------- */
  // Strong GPUs get the original glossy, sheened body. Elsewhere a Standard material looks
  // the same at this size and costs about half as much to shade.
  // Warm cream with only a faint glow: the old 0.14 emissive lifted the shadow side so much
  // that Foggy read as a flat white shape, especially on dark backgrounds.
  const bodyLook = { color: col(0xf4ebdb), roughness: 0.72, metalness: 0, envMapIntensity: 0.55, emissive: col(0x3a2e1f), emissiveIntensity: 0.05 };
  const bodyMat: THREE.MeshStandardMaterial = settings.glossyBody
    ? Object.assign(new THREE.MeshPhysicalMaterial({ ...bodyLook, clearcoat: 0.06, clearcoatRoughness: 0.6 }), { sheen: col(0x6b5f4c) })
    : new THREE.MeshStandardMaterial(bodyLook);
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: col(0x120e0c), roughness: 0.14, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const mouthMat = new THREE.MeshPhysicalMaterial({ color: col(0x3e1b18), roughness: 0.42, clearcoat: 0.6, envMapIntensity: 0.9 });
  const tongueMat = new THREE.MeshPhysicalMaterial({ color: col(0xe2746a), roughness: 0.5, clearcoat: 0.3 });
  // Deeper, richer green so the sprout stands out against the cream body.
  const leafMat = new THREE.MeshPhysicalMaterial({ color: col(0x5a9444), roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.3, envMapIntensity: 0.9 });
  const stemMat = new THREE.MeshPhysicalMaterial({ color: col(0x4e7f3b), roughness: 0.5 });
  const markMat = new THREE.MeshPhysicalMaterial({ color: col(0x7aa569), roughness: 0.45, transparent: true, opacity: 1 });
  const goldMat = new THREE.MeshPhysicalMaterial({ color: col(0xffc94a), roughness: 0.3, clearcoat: 0.8, emissive: col(0xffa51a), emissiveIntensity: 0.35 });
  const greyMat = new THREE.MeshPhysicalMaterial({ color: col(0x868b82), roughness: 0.35, clearcoat: 0.6 });

  /* ---------- body surface (one smooth cloud) ---------- */
  const BODY_C = new V3(0, 1.1, 0);
  const S = new V3(1.03, 0.92, 0.9); // a touch wider than tall, like a cumulus puff
  const dirUV = (u: number, v: number) => new V3(Math.sin(u) * Math.cos(v), Math.sin(v), Math.cos(u) * Math.cos(v));
  // The body is a soft union of overlapping spheres — a core plus round puffs — which gives
  // the scalloped cumulus outline of the concept art. (Bumps added to one sphere gave ridges
  // and flat faces, more boulder than cloud.) [x, y, z, radius] in body space.
  const PUFFS = (
    [
      [0, 0, 0, 1.0], // core
      [0, 0.6, 0.04, 0.6], // crown
      [-0.62, 0.46, 0, 0.54], [0.62, 0.46, 0, 0.54], // upper sides
      [-0.8, -0.06, 0.02, 0.5], [0.8, -0.06, 0.02, 0.5], // sides
      [-0.6, -0.44, 0.06, 0.46], [0.6, -0.44, 0.06, 0.46], // lower sides
      [-0.42, -0.32, 0.42, 0.5], [0.42, -0.32, 0.42, 0.5], // chubby cheeks (stay behind the face)
      [0, 0.36, -0.46, 0.6], [-0.52, 0.1, -0.4, 0.52], [0.52, 0.1, -0.4, 0.52], // back
    ] as const
  ).map(([x, y, z, r]) => ({ c: new V3(x, y, z), cc: x * x + y * y + z * z, r2: r * r }));
  /** Higher = sharper creases between puffs; 16 keeps them soft like a real cloud. */
  const BLEND = 16;

  /** Distance from the body centre to the cloud surface along direction d (a unit vector). */
  function radius(d: V3) {
    // Where the ray leaves each puff, combined with a smooth max (log-sum-exp).
    let sum = 0;
    for (const p of PUFFS) {
      const b = d.dot(p.c);
      const disc = b * b - p.cc + p.r2;
      if (disc <= 0) continue;
      const t = b + Math.sqrt(disc);
      if (t > 0) sum += Math.exp(BLEND * t);
    }
    let r = Math.log(sum) / BLEND;
    if (d.y < -0.55) {
      const t = (-d.y - 0.55) / 0.45;
      r -= 0.08 * t * t;
    }
    return r;
  }
  const surf = (d: V3, out: V3) => out.copy(d).multiplyScalar(radius(d)).multiply(S);
  const _h = new V3(), _t1 = new V3(), _t2 = new V3(), _a = new V3(), _b = new V3(), _q = new V3(), _p = new V3();
  function surfNormal(d: V3, out: V3) {
    _h.set(0, 1, 0);
    if (Math.abs(d.y) > 0.95) _h.set(1, 0, 0);
    _t1.crossVectors(_h, d).normalize();
    _t2.crossVectors(d, _t1);
    const e = 0.003;
    surf(_q.copy(d).addScaledVector(_t1, e).normalize(), _a);
    surf(_q.copy(d).addScaledVector(_t1, -e).normalize(), _p);
    _a.sub(_p);
    surf(_q.copy(d).addScaledVector(_t2, e).normalize(), _b);
    surf(_q.copy(d).addScaledVector(_t2, -e).normalize(), _p);
    _b.sub(_p);
    out.crossVectors(_a, _b).normalize();
    if (out.dot(d) < 0) out.negate();
    return out;
  }
  function frameAt(u: number, v: number, off: number, outP: V3, outN: V3) {
    const d = dirUV(u, v);
    surf(d, outP);
    surfNormal(d, outN);
    outP.addScaledVector(outN, off);
  }
  const _fp = new V3(), _fn = new V3();
  function placeOn(obj: THREE.Object3D, u: number, v: number, off: number) {
    frameAt(u, v, off, _fp, _fn);
    obj.position.copy(_fp);
    obj.quaternion.setFromUnitVectors(Z, _fn);
  }

  function buildBody() {
    // Detail follows the device: 180×132 (the original) on strong GPUs, less elsewhere.
    const g = new THREE.SphereGeometry(1, settings.bodySegments[0], settings.bodySegments[1]);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const nor = g.attributes.normal as THREE.BufferAttribute;
    const d = new V3(), p = new V3(), n = new V3();
    for (let i = 0; i < pos.count; i++) {
      d.fromBufferAttribute(pos, i).normalize();
      surf(d, p);
      surfNormal(d, n);
      pos.setXYZ(i, p.x, p.y, p.z);
      nor.setXYZ(i, n.x, n.y, n.z);
    }
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, bodyMat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  /* ---------- helpers ---------- */
  function stroke(pts2: [number, number][], r: number, mat: THREE.Material, sag = 0.95) {
    const pts = pts2.map(([x, y]) => new V3(x, y, -(x * x + y * y) / (2 * sag)));
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, r, 12, false), mat));
    const cap = new THREE.SphereGeometry(r, 14, 10);
    [pts[0], pts[pts.length - 1]].forEach((p) => {
      const m = new THREE.Mesh(cap, mat);
      m.position.copy(p);
      grp.add(m);
    });
    return grp;
  }
  function shadowAll<T extends THREE.Object3D>(o: T) {
    o.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) c.castShadow = true;
    });
    return o;
  }

  /* ---------- character rig ---------- */
  const root = new THREE.Group();
  scene.add(root); // jump + yaw
  const squash = new THREE.Group();
  root.add(squash); // squash & stretch from the feet
  const body = new THREE.Group();
  body.position.copy(BODY_C);
  squash.add(body); // breathing, tilt
  body.add(buildBody());
  // The body is the heaviest step; let the page paint before building the rest.
  await pause();
  if (isCancelled()) return bail();

  const footGeo = new THREE.SphereGeometry(0.2, 40, 28);
  [-0.37, 0.37].forEach((x) => {
    const f = new THREE.Mesh(footGeo, bodyMat);
    f.scale.set(1.15, 0.72, 1.3);
    f.position.set(x, 0.14, 0.24);
    f.castShadow = f.receiveShadow = true;
    squash.add(f);
  });

  const armGeo = new THREE.SphereGeometry(0.16, 40, 30);
  function makeArm(u: number, v: number) {
    const pivot = new THREE.Group();
    frameAt(u, v, -0.08, _fp, _fn);
    pivot.position.copy(_fp);
    const m = new THREE.Mesh(armGeo, bodyMat);
    m.scale.set(1, 1.6, 0.95);
    m.position.y = -0.17;
    m.castShadow = m.receiveShadow = true;
    pivot.add(m);
    body.add(pivot);
    return pivot;
  }
  const armA = makeArm(-1.05, -0.36); // viewer-left
  const armB = makeArm(1.2, -0.2); // viewer-right (the waving one)

  const marks = new THREE.Group();
  armB.add(marks);
  const markGeo = new THREE.SphereGeometry(0.03, 16, 12);
  // Fanned outward only (the original +0.7 mark pointed back into the head while waving).
  [-1.05, -0.5, 0.02].forEach((ang, i) => {
    const piv = new THREE.Group();
    piv.rotation.z = ang;
    const m = new THREE.Mesh(markGeo, markMat);
    m.scale.set(1, 2.4, 1);
    m.position.y = -0.68 - (i === 1 ? 0.04 : 0);
    piv.add(m);
    marks.add(piv);
  });

  // sprout
  const sprout = new THREE.Group();
  {
    const d = new V3(0, 1, 0.22).normalize(), p = new V3(), n = new V3();
    surf(d, p);
    surfNormal(d, n);
    sprout.position.copy(p).addScaledVector(n, -0.04);
    sprout.quaternion.setFromUnitVectors(new V3(0, 1, 0), new V3(0, 1, 0).lerp(n, 0.4).normalize());
  }
  body.add(sprout);
  const stem = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, -0.05, 0), new V3(0.012, 0.09, 0), new V3(-0.004, 0.19, 0)]), 20, 0.03, 12, false),
    stemMat,
  );
  stem.castShadow = true;
  sprout.add(stem);
  const stemTop = new V3(-0.004, 0.19, 0);

  function leafGeometry(L = 0.52, W = 0.215) { // rounder leaves, like the concept art
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(L * 0.25, W * 0.95, L * 0.75, W * 0.85, L, 0);
    s.bezierCurveTo(L * 0.75, -W * 0.85, L * 0.25, -W * 0.95, 0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 4, curveSegments: 28 });
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      p.setZ(i, p.getZ(i) + 0.32 * x * x - 1.6 * y * y);
    }
    g.computeVertexNormals();
    return g;
  }
  const leafG = leafGeometry();
  function makeLeaf(dirZ: number, twist: number, scale: number) {
    const outer = new THREE.Group();
    outer.position.copy(stemTop);
    outer.rotation.z = dirZ;
    const m = new THREE.Mesh(leafG, leafMat);
    m.rotation.x = twist;
    m.scale.setScalar(scale);
    m.castShadow = true;
    outer.add(m);
    sprout.add(outer);
    return { outer, base: dirZ };
  }
  const leafL = makeLeaf(Math.PI - 0.5, 0.85, 1.0);
  const leafR = makeLeaf(0.42, -0.85, 0.82);

  /* ---------- face ---------- */
  const EYE_UV: [number, number][] = [[-0.32, -0.07], [0.32, -0.07]];
  function makeEye() {
    const holder = new THREE.Group();
    body.add(holder);
    const open = new THREE.Group();
    // Slightly bigger eyes (0.15 → 0.168) with bigger catch-lights, closer to the concept art.
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.168, 40, 30), eyeMat);
    ball.scale.set(0.62, 1, 0.36);
    open.add(ball);
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 12), shineMat);
    s1.position.set(-0.03, 0.068, 0.056);
    s1.scale.set(1, 1.15, 0.5);
    open.add(s1);
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), shineMat);
    s2.position.set(0.032, -0.062, 0.054);
    open.add(s2);
    const variants: Record<EyeShape, THREE.Object3D> = {
      open,
      arc: stroke([[-0.075, -0.03], [-0.045, 0.025], [0, 0.048], [0.045, 0.025], [0.075, -0.03]], 0.019, eyeMat),
      chevR: stroke([[-0.05, 0.06], [-0.002, 0.03], [0.05, 0], [-0.002, -0.03], [-0.05, -0.06]], 0.019, eyeMat),
      chevL: stroke([[0.05, 0.06], [0.002, 0.03], [-0.05, 0], [0.002, -0.03], [0.05, -0.06]], 0.019, eyeMat),
    };
    Object.values(variants).forEach((v) => holder.add(v));
    const w = {} as Record<EyeShape, Spring>;
    (Object.keys(variants) as EyeShape[]).forEach((k) => (w[k] = spr(k === "open" ? 1 : 0, 320, 24)));
    return { holder, variants, w, size: spr(1, 200, 20) };
  }
  const eyes = [makeEye(), makeEye()];

  const mouth = new THREE.Group();
  body.add(mouth);
  placeOn(mouth, 0, -0.125, -0.008);
  function openMouth() {
    const w = 0.095, s = new THREE.Shape();
    s.moveTo(-w, 0.012);
    s.quadraticCurveTo(0, 0.03, w, 0.012);
    s.bezierCurveTo(w * 1.02, -0.2, -w * 1.02, -0.2, -w, 0.012);
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 4, curveSegments: 32 }), mouthMat);
    m.position.z = -0.012;
    g.add(m);
    const ts = new THREE.Shape();
    ts.absellipse(0, -0.1, 0.056, 0.034, 0, Math.PI * 2, false, 0);
    const t = new THREE.Mesh(new THREE.ShapeGeometry(ts, 32), tongueMat);
    t.position.z = 0.0135;
    g.add(t);
    return g;
  }
  const mouthVariants: Record<MouthShape, THREE.Object3D> = {
    open: openMouth(),
    small: stroke([[-0.05, 0.012], [-0.026, -0.012], [0, -0.02], [0.026, -0.012], [0.05, 0.012]], 0.015, mouthMat),
    flat: stroke([[-0.035, -0.012], [0.0, -0.006], [0.035, 0.006]], 0.014, mouthMat),
    o: (() => {
      const s = new THREE.Shape();
      s.absellipse(0, -0.035, 0.028, 0.034, 0, Math.PI * 2, false, 0);
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 24 }), mouthMat);
      m.position.z = -0.008;
      const g = new THREE.Group();
      g.add(m);
      return g;
    })(),
  };
  const mouthW = {} as Record<MouthShape, Spring>;
  (Object.keys(mouthVariants) as MouthShape[]).forEach((k) => {
    mouth.add(mouthVariants[k]);
    mouthW[k] = spr(k === "open" ? 1 : 0, 320, 24);
  });
  mouthVariants.small.position.z = 0.006;
  mouthVariants.flat.position.z = 0.006;
  const mouthSize = spr(1, 220, 20);

  const blushMat = new THREE.MeshBasicMaterial({
    map: radialTexture([[0, "rgba(255,128,128,0.75)"], [0.5, "rgba(255,140,140,0.35)"], [1, "rgba(255,150,150,0)"]]),
    transparent: true,
    depthWrite: false,
    opacity: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });
  ([[-0.5, -0.27], [0.5, -0.27]] as const).forEach(([u, v]) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), blushMat);
    placeOn(b, u, v, 0.012);
    body.add(b);
  });
  const blush = spr(0.85, 120, 18);

  /* ---------- props ---------- */
  const props = {} as Record<PropName, { obj: THREE.Object3D; w: Spring }>;
  function addProp(name: PropName, obj: THREE.Object3D, pos: V3) {
    obj.position.copy(pos);
    obj.scale.setScalar(0.0001);
    obj.visible = false;
    body.add(shadowAll(obj));
    props[name] = { obj, w: spr(0, 210, 15) };
  }

  {
    const g = new THREE.Group(); // sun
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 24), goldMat));
    const rg = new THREE.SphereGeometry(0.024, 12, 10);
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Group();
      p.rotation.z = (i * Math.PI) / 4;
      const r = new THREE.Mesh(rg, goldMat);
      r.scale.set(1, 2.2, 1);
      r.position.y = 0.2;
      p.add(r);
      g.add(p);
    }
    addProp("sun", g, new V3(0.95, 1.0, 0.15));
  }
  {
    const g = new THREE.Group(); // question mark
    const curve = new THREE.CatmullRomCurve3(
      ([[-0.07, 0.06], [-0.05, 0.12], [0.01, 0.152], [0.07, 0.12], [0.078, 0.06], [0.04, 0.02], [0.0, -0.01], [0.0, -0.06]] as const).map(([x, y]) => new V3(x, y, 0)),
      false,
      "centripetal",
    );
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.026, 12, false), greyMat));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), greyMat);
    cap.position.set(-0.07, 0.06, 0);
    g.add(cap);
    const cap2 = cap.clone();
    cap2.position.set(0, -0.06, 0);
    g.add(cap2);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), greyMat);
    dot.position.set(0, -0.13, 0);
    g.add(dot);
    g.scale.setScalar(1.3);
    addProp("question", g, new V3(0.82, 0.92, 0.3));
  }
  {
    const s = new THREE.Shape(), R = 0.1; // sparkles
    s.moveTo(0, R);
    s.quadraticCurveTo(0, 0, R, 0);
    s.quadraticCurveTo(0, 0, 0, -R);
    s.quadraticCurveTo(0, 0, -R, 0);
    s.quadraticCurveTo(0, 0, 0, R);
    const sg = new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 3, curveSegments: 16 });
    sg.center();
    const g = new THREE.Group();
    ([[0.98, 0.82, 0.3, 1], [1.2, 0.5, 0.15, 0.6], [-1.05, 0.72, 0.25, 0.75]] as const).forEach(([x, y, z, sc]) => {
      const m = new THREE.Mesh(sg, goldMat);
      m.position.set(x, y, z);
      m.userData.s = sc;
      m.scale.setScalar(sc);
      g.add(m);
    });
    addProp("sparkles", g, new V3(0, 0, 0));
  }
  {
    const g = new THREE.Group(); // laptop
    const metal = new THREE.MeshPhysicalMaterial({ color: col(0xa9aaa5), metalness: 0.55, roughness: 0.32, clearcoat: 0.4, envMapIntensity: 1.1 });
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 0.5), metal));
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.02, 0.24);
    hinge.rotation.x = 0.22;
    g.add(hinge);
    const lidG = new THREE.BoxGeometry(0.78, 0.46, 0.03);
    lidG.translate(0, 0.23, 0);
    hinge.add(new THREE.Mesh(lidG, metal));
    const logo = new THREE.Mesh(leafG, leafMat);
    logo.scale.setScalar(0.22);
    logo.position.set(-0.05, 0.24, 0.018);
    logo.rotation.z = 0.5;
    hinge.add(logo);
    const logo2 = new THREE.Mesh(leafG, leafMat);
    logo2.scale.setScalar(0.18);
    logo2.position.set(-0.01, 0.24, 0.018);
    logo2.rotation.z = Math.PI - 0.4;
    hinge.add(logo2);
    addProp("laptop", g, new V3(0, -0.8, 0.98));
  }
  {
    const g = new THREE.Group(); // magnifier
    const dark = new THREE.MeshPhysicalMaterial({ color: col(0x3b3f3a), roughness: 0.3, metalness: 0.3, clearcoat: 0.8 });
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.024, 18, 56), dark));
    g.add(new THREE.Mesh(new THREE.CircleGeometry(0.13, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.04, clearcoat: 1, envMapIntensity: 2, depthWrite: false })));
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.28, 18), dark);
    handle.rotation.z = -Math.PI / 4;
    handle.position.set(-0.19, -0.19, 0);
    g.add(handle);
    const p = new V3(), n = new V3();
    frameAt(EYE_UV[0][0], EYE_UV[0][1], 0.2, p, n);
    g.quaternion.setFromUnitVectors(Z, n);
    addProp("magnifier", g, p);
  }

  /* ---------- expressions ---------- */
  const arm = { Ax: spr(0, 110, 15), Az: spr(-0.45, 110, 15), Bx: spr(0, 110, 15), Bz: spr(2.5, 110, 15) };
  const tilt = spr(0, 60, 11), pitchS = spr(0, 60, 11), lookU = spr(0, 90, 14), lookV = spr(0, 90, 14), markW = spr(1, 120, 16);
  let cur = EXPR.hello;
  let curName: FoggyExpression = "hello";
  let revertTimer = 0;
  let revertTo: FoggyExpression | null = null;

  /* ---------- motion state ---------- */
  const sq = spr(0, 260, 11); // squash/stretch amount
  const pop = spr(1, 150, 10); // overall scale for pop-up
  const popSpin = spr(0, 70, 9);
  const dragYaw = spr(0, 40, 9);
  const sproutKick = spr(0, 90, 5);
  let jumpY = 0, vy = 0, anticT = 0, launchV = 4.2;
  let phase: "ground" | "antic" | "air" = "ground";
  let waveT = 0;
  const waveAmt = spr(0, 90, 14);
  let hopT = 0, blinkT = 3, blinkPhase = -1, blinkDouble = false;
  let px = 0, py = 0, pointerIdle = 0;
  let idleTimer = 3, glanceHold = 0;
  const lookYaw = spr(0, 40, 10), lookPitch = spr(0, 40, 10);
  const BASE_YAW = 0.22;

  function applyExpression(name: FoggyExpression, temporary: boolean) {
    const e = EXPR[name];
    cur = e;
    if (!temporary) {
      curName = name;
      revertTimer = 0;
      revertTo = null;
    }
    eyes.forEach((eye, i) => {
      (Object.keys(eye.w) as EyeShape[]).forEach((k) => (eye.w[k].t = e.eyes[i] === k ? 1 : 0));
      eye.size.t = e.size ? e.size[i] : 1;
    });
    (Object.keys(mouthW) as MouthShape[]).forEach((k) => (mouthW[k].t = e.mouth === k ? 1 : 0));
    mouthSize.t = e.mouthSize || 1;
    blush.t = e.blush;
    arm.Ax.t = e.A[0];
    arm.Az.t = e.A[1];
    arm.Bx.t = e.B[0];
    arm.Bz.t = e.B[1];
    (Object.keys(props) as PropName[]).forEach((k) => (props[k].w.t = e.props.includes(k) ? 1 : 0));
    tilt.t = e.tilt || 0;
    pitchS.t = e.pitch || 0;
    lookU.t = e.look ? e.look[0] : 0;
    lookV.t = e.look ? e.look[1] : 0;
    markW.t = e.marks || 0;
    options.onMoodChange?.(e.label);
  }

  function jump(v: number) {
    if (phase !== "ground") return;
    phase = "antic";
    anticT = 0.11;
    launchV = v;
    sq.t = -0.15;
  }
  function doPop() {
    pop.x = 0;
    pop.v = 0;
    pop.t = 1;
    popSpin.x = -1.2;
    popSpin.v = 0;
    popSpin.t = 0;
    sq.x = 0.25;
    sq.v = 0;
    sproutKick.v += 4;
  }
  function doWave() {
    waveT = 2.2;
  }
  function doBounce() {
    jump(4.4);
  }
  function doBoop() {
    sq.v -= 3.2;
    sproutKick.v += 3;
    if (curName === "hello" || curName === "cheerful") {
      applyExpression("excited", true);
      revertTo = curName;
      revertTimer = 1.1;
    }
    jump(3.2);
    options.onBoop?.();
  }

  /* ---------- loop ---------- */
  let t = 0;

  function update(dt: number) {
    t += dt;
    if (revertTimer > 0) {
      revertTimer -= dt;
      if (revertTimer <= 0 && revertTo) {
        const r = revertTo;
        revertTo = null;
        applyExpression(r, true);
      }
    }
    if (waveT > 0) waveT -= dt;
    waveAmt.t = waveT > 0 ? 1 : 0;

    // jump physics
    if (phase === "antic") {
      anticT -= dt;
      if (anticT <= 0) {
        phase = "air";
        vy = launchV;
        sq.t = 0;
        sq.v += 3.4;
        sproutKick.v -= 2;
      }
    } else if (phase === "air") {
      vy -= 14 * dt;
      jumpY += vy * dt;
      sq.t = Math.max(-0.08, Math.min(0.1, vy * 0.025));
      if (jumpY <= 0 && vy < 0) {
        jumpY = 0;
        sq.t = 0;
        sq.v -= Math.min(5, -vy * 1.15);
        sproutKick.v += -vy * 0.9;
        phase = "ground";
      }
    }
    if (cur.hop && phase === "ground" && !reduceMotion) {
      hopT -= dt;
      if (hopT <= 0) {
        hopT = 0.75;
        jump(2.6);
      }
    }

    // Idle life: when nobody is interacting (always the case on phones, which have no
    // hover), glance around, wave or hop every few seconds so Foggy never looks frozen.
    pointerIdle += dt;
    if (glanceHold > 0) glanceHold -= dt;
    if (!reduceMotion && (curName === "hello" || curName === "cheerful") && pointerIdle > 2.5 && phase === "ground") {
      idleTimer -= dt;
      if (idleTimer <= 0) {
        const roll = Math.random();
        if (roll < 0.5) {
          // look somewhere else for a moment
          px = (Math.random() < 0.5 ? -1 : 1) * (0.45 + Math.random() * 0.5);
          py = Math.random() * 1.0 - 0.25;
          glanceHold = 1.1 + Math.random() * 0.9;
        } else if (roll < 0.7) {
          doWave();
        } else if (roll < 0.87) {
          jump(2.6);
          sproutKick.v += 2.5;
        } else {
          // a little twirl that springs back
          dragYaw.v += (Math.random() < 0.5 ? -1 : 1) * 9;
          sproutKick.v += 3;
        }
        idleTimer = 2.2 + Math.random() * 2.3;
      }
    }

    // gaze drifts back to centre when the pointer goes quiet (unless mid-glance)
    if (pointerIdle > 2.5 && glanceHold <= 0) {
      px *= 0.96;
      py *= 0.96;
    }
    // Strong enough to read clearly on a small phone companion, not just a big stage.
    lookYaw.t = px * 0.45;
    lookPitch.t = -py * 0.18;

    const n = 3, h = dt / n;
    for (let i = 0; i < n; i++) for (const s of springs) s.step(h);

    const p = Math.max(0.0001, pop.x);
    root.scale.setScalar(p);
    root.position.y = jumpY;
    root.rotation.y = BASE_YAW + lookYaw.x + dragYaw.x + popSpin.x;
    const s = sq.x;
    squash.scale.set(1 - s * 0.55, 1 + s, 1 - s * 0.55);

    // breathing + sway
    const breath = reduceMotion ? 0 : Math.sin(t * 2.1) * 0.012;
    body.scale.set(1 - breath * 0.4, 1 + breath, 1 - breath * 0.4);
    body.rotation.z = (reduceMotion ? 0 : Math.sin(t * 1.25) * 0.025) + tilt.x;
    body.rotation.x = lookPitch.x + pitchS.x;

    // arms
    const az = arm.Az.x;
    let bz = arm.Bz.x, ax = arm.Ax.x, bx = arm.Bx.x;
    if (cur.wiggle && !reduceMotion) bz += Math.sin(t * 3.2) * 0.12;
    if (cur.typing && !reduceMotion) {
      ax += Math.sin(t * 17) * 0.1;
      bx += Math.sin(t * 17 + Math.PI) * 0.1;
    }
    const wa = waveAmt.x;
    bz = bz * (1 - wa) + (2.45 + Math.sin(t * 13) * 0.42) * wa;
    bx = bx * (1 - wa);
    armA.rotation.set(ax, 0, az);
    armB.rotation.set(bx, 0, bz);

    // motion marks
    const mk = Math.max(markW.x, wa);
    marks.visible = mk > 0.02;
    markMat.opacity = Math.min(1, mk) * (0.75 + 0.25 * Math.sin(t * (wa > 0.1 ? 14 : 4)));
    marks.scale.setScalar(Math.max(0.0001, Math.min(1.2, mk)));

    // eyes + blinking
    blinkT -= dt;
    if (blinkT <= 0 && blinkPhase < 0) {
      blinkPhase = 0;
      blinkDouble = Math.random() < 0.25;
    }
    let blink = 1;
    if (blinkPhase >= 0) {
      blinkPhase += dt;
      const d = 0.16;
      blink = 1 - 0.92 * Math.sin(Math.PI * Math.min(1, blinkPhase / d));
      if (blinkPhase >= d) {
        if (blinkDouble) {
          blinkDouble = false;
          blinkPhase = -0.12;
          blinkT = 0;
        } else {
          blinkPhase = -1;
          blinkT = 2.4 + Math.random() * 3;
        }
      }
    }
    if (blinkPhase < -0.001 && blinkPhase > -1) {
      blinkPhase += dt;
      if (blinkPhase >= 0) blinkPhase = 0;
    }

    const eu = lookU.x + px * 0.07, ev = lookV.x + py * 0.06;
    eyes.forEach((eye, i) => {
      placeOn(eye.holder, EYE_UV[i][0] + eu, EYE_UV[i][1] + ev, -0.012);
      (Object.keys(eye.variants) as EyeShape[]).forEach((k) => {
        const w = Math.max(0, eye.w[k].x), v = eye.variants[k];
        v.visible = w > 0.01;
        if (k === "open") v.scale.set(w * eye.size.x, w * eye.size.x * blink, w * eye.size.x);
        else v.scale.setScalar(Math.max(0.0001, w));
      });
    });
    (Object.keys(mouthVariants) as MouthShape[]).forEach((k) => {
      const w = Math.max(0, mouthW[k].x), v = mouthVariants[k];
      v.visible = w > 0.01;
      v.scale.setScalar(Math.max(0.0001, w * mouthSize.x));
    });
    blushMat.opacity = Math.max(0, Math.min(1, blush.x));

    // sprout
    const sk = sproutKick.x;
    sprout.rotation.z = (reduceMotion ? 0 : Math.sin(t * 1.7) * 0.07) + sk * 0.12;
    sprout.rotation.x = sk * 0.05;
    leafL.outer.rotation.z = leafL.base + (reduceMotion ? 0 : Math.sin(t * 2.3) * 0.06) + sk * 0.1;
    leafR.outer.rotation.z = leafR.base - (reduceMotion ? 0 : Math.sin(t * 2.3 + 0.8) * 0.06) - sk * 0.1;
    sproutKick.t = 0;

    // props
    (Object.keys(props) as PropName[]).forEach((k) => {
      const pr = props[k], w = Math.max(0, pr.w.x);
      pr.obj.visible = w > 0.01;
      pr.obj.scale.setScalar(Math.max(0.0001, w));
    });
    props.sun.obj.rotation.z = t * 0.6;
    props.sun.obj.position.y = 1.0 + Math.sin(t * 2) * 0.03;
    props.question.obj.position.y = 0.92 + Math.sin(t * 2.4) * 0.04;
    props.question.obj.rotation.z = Math.sin(t * 1.6) * 0.15;
    props.sparkles.obj.children.forEach((m, i) => {
      const k = (m.userData.s as number) * (0.7 + 0.3 * Math.sin(t * 5 + i * 2));
      m.scale.setScalar(k);
      m.rotation.z = Math.sin(t * 1.5 + i) * 0.4;
    });
    props.magnifier.obj.rotation.z = Math.sin(t * 1.8) * 0.06;

    // contact shadow
    const bs = (1 - Math.min(0.5, jumpY * 0.45)) * p;
    blob.scale.set(bs * (1 - s * 0.55), bs, 1);
    blobMat.opacity = Math.max(0, 1 - jumpY * 0.7) * Math.min(1, p);
  }

  let frameHandle = 0;
  let last = performance.now();
  let firstFrame = true;
  let active = false;
  let disposed = false;

  let sampleFrames = 0;
  let sampleTime = 0;

  function frame(now: number) {
    frameHandle = 0;
    if (!active || disposed) return;
    const raw = now - last;
    const dt = Math.min(0.033, Math.max(0, raw / 1000));
    last = now;

    // Safety net whatever the detected quality: if frames run slow, step resolution down.
    if (pixelRatio > 1 && !firstFrame) {
      sampleFrames += 1;
      sampleTime += raw;
      if (sampleFrames === 60) {
        if (sampleTime / sampleFrames > 24) {
          ratioCeiling = Math.max(1, pixelRatio - 0.5); // 2 → 1.5 → 1
          applySize();
        }
        sampleFrames = 0;
        sampleTime = 0;
      }
    }
    update(dt);
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      options.onFirstFrame?.();
    }
    frameHandle = scheduleFrame(frame);
  }

  /* ---------- sizing ---------- */
  let width = Math.max(1, options.width);
  let height = Math.max(1, options.height);
  function applySize() {
    pixelRatio = Math.min(deviceRatio, ratioCeiling);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // Wider than the original demo's 1.55 so the waving arm never clips in a narrow column.
    const needH = 1.58, needW = 1.95; // room for the taller cloud crown and sprout
    const dist = Math.max(needH / half, needW / (half * camera.aspect));
    camera.position.set(0, 1.3 + dist * 0.06, dist);
    camera.lookAt(0, 1.27, 0);
    camera.updateProjectionMatrix();
    if (!active && !firstFrame) renderer.render(scene, camera); // resizing clears the canvas
  }
  applySize();
  await pause();
  if (isCancelled()) return bail();

  /* ---------- input (forwarded by the page) ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down: { id: number; x: number; y: number; yaw: number; moved: number; time: number } | null = null;

  // Hello! Pop in, then wave.
  applyExpression("hello", false);
  if (!reduceMotion) doPop();
  const waveTimer = reduceMotion ? 0 : globalThis.setTimeout(doWave, 900);

  function disposeTree(object: THREE.Object3D) {
    const materials = new Set<THREE.Material>();
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m && materials.add(m));
    });
    materials.forEach((m) => {
      const map = (m as THREE.MeshBasicMaterial).map;
      map?.dispose();
      m.dispose();
    });
  }

  return {
    setExpression(name) {
      if (name === curName) return;
      applyExpression(name, false);
      sq.v -= 1.6; // little bounce when the mood changes
      sproutKick.v += 1.5;
      if (!reduceMotion && (name === "happy" || name === "excited")) jump(3.2); // hop for joy
      idleTimer = 3; // don't start idling straight after a reaction
    },
    pop: doPop,
    wave: doWave,
    bounce: doBounce,
    boop: doBoop,
    setActive(next) {
      if (disposed || next === active) return;
      active = next;
      if (active) {
        last = performance.now();
        if (!frameHandle) frameHandle = scheduleFrame(frame);
      } else if (frameHandle) {
        cancelFrame(frameHandle);
        frameHandle = 0;
      }
    },
    setTheme(dark) {
      renderer.toneMappingExposure = dark ? 0.96 : 1.04;
      rim.intensity = dark ? 1.45 : 0.85;
      if (!active && !firstFrame) renderer.render(scene, camera);
    },
    resize(nextWidth, nextHeight, nextRatio) {
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
      deviceRatio = nextRatio || 1;
      applySize();
    },
    look(x, y) {
      px = Math.max(-1, Math.min(1, x));
      py = Math.max(-1, Math.min(1, y));
      pointerIdle = 0;
      glanceHold = 0;
    },
    pointerDown(id, x, y) {
      down = { id, x, y, yaw: dragYaw.x, moved: 0, time: performance.now() };
    },
    pointerMove(id, x, y) {
      if (!down || down.id !== id) return;
      const dx = x - down.x;
      down.moved = Math.max(down.moved, Math.abs(dx), Math.abs(y - down.y));
      dragYaw.x = down.yaw + dx * 0.012;
      dragYaw.v = 0;
      dragYaw.t = dragYaw.x;
    },
    pointerUp(id, ndcX, ndcY) {
      if (!down || down.id !== id) return;
      const tap = down.moved < 6 && performance.now() - down.time < 400;
      down = null;
      dragYaw.t = 0;
      if (tap) {
        ndc.set(ndcX, ndcY);
        ray.setFromCamera(ndc, camera);
        if (ray.intersectObject(root, true).length) doBoop();
      }
    },
    pointerCancel(id) {
      if (!down || down.id !== id) return;
      down = null;
      dragYaw.t = 0;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      active = false;
      if (frameHandle) cancelFrame(frameHandle);
      globalThis.clearTimeout(waveTimer);
      disposeTree(scene);
      envTexture?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
