(function () {
'use strict';
/**
 * Horizon — moteur de paysages génératifs (WebGL).
 * Une seule fonction de rendu, plusieurs scènes réglées par des préréglages.
 * Sert à la fois au hero (rendu en direct) et à la production des images fixes
 * (outils/rendre-images.mjs).
 */

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uScene;      // 0 paysage, 1 seuil, 2 onde, 3 pierre
uniform vec3  uSkyTop;
uniform vec3  uSkyMid;
uniform vec3  uSkyLow;
uniform vec3  uGlow;
uniform vec3  uRidge;
uniform vec3  uMist;
uniform vec4  uP;          // x horizon, y étoiles, z brume, w intensité halo
uniform vec4  uQ;          // x montagnes, y eau, z lune, w position x du halo
uniform float uSeed;
uniform float uExposure;

float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1.,0.)), u.x), mix(h21(i+vec2(0.,1.)), h21(i+vec2(1.,1.)), u.x), u.y);
}
const mat2 R = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<6;i++){ v+=a*noise(p); p=R*p; a*=.5; } return v; }
float fbm3(vec2 p){ float v=0., a=.5; for(int i=0;i<3;i++){ v+=a*noise(p); p=R*p; a*=.5; } return v; }
float ridged(vec2 p){
  float v=0., a=.55;
  for(int i=0;i<6;i++){ float n = 1.0-abs(noise(p)*2.0-1.0); v += a*n*n; p=R*p; a*=.48; }
  return v;
}

/* ---------- Paysage : ciel, astres, crêtes, brume ---------- */
vec3 sky(vec2 p, float aspect){
  float hz = uP.x;
  float t = p.y - hz;
  vec3 c = mix(uSkyLow, uSkyMid, smoothstep(-0.02, 0.22, t));
  c = mix(c, uSkyTop, smoothstep(0.18, 0.95, t));
  vec2 gp = vec2(uQ.w, hz - 0.04);
  vec2 d = (p - gp) * vec2(0.55, 2.2);
  c += uGlow * exp(-length(d)*3.2) * uP.w;
  c += uGlow * exp(-abs(t)*26.0) * 0.18 * uP.w;
  // voiles de nuages fins, éclairés par le halo
  float cl = fbm(vec2(p.x*1.4 + uTime*0.006 + uSeed, p.y*7.0));
  float band = smoothstep(0.45, 0.85, cl) * smoothstep(0.55, 0.05, t) * smoothstep(-0.01, 0.06, t);
  c = mix(c, c*0.55 + uGlow*0.35*uP.w, band*0.55);
  // étoiles, deux échelles
  if (uP.y > 0.0){
    for(int k=0;k<2;k++){
      float sc = k==0 ? 140.0 : 320.0;
      vec2 g = p*sc + uSeed*10.0;
      vec2 id = floor(g);
      float r = h21(id);
      float th = k==0 ? 0.988 : 0.975;
      if (r > th){
        vec2 o = vec2(h21(id+3.1), h21(id+7.7)) - 0.5;
        float dd = length(fract(g)-0.5-o*0.6);
        float tw = 0.65 + 0.35*sin(uTime*(1.0+r*3.0) + r*80.0);
        float s = smoothstep(k==0 ? 0.11 : 0.08, 0.0, dd) * tw;
        c += vec3(0.85, 0.88, 1.0) * s * uP.y * smoothstep(0.03, 0.35, t) * (k==0 ? 1.0 : 0.55);
      }
    }
    // voie lactée discrète
    float mw = fbm(vec2(p.x*2.0 - p.y*1.3, p.y*2.2 + p.x*0.4) * 2.0 + uSeed);
    float mwb = exp(-abs(p.y - 0.75 + p.x*0.35)*5.0);
    c += vec3(0.55, 0.6, 0.75) * smoothstep(0.45, 0.8, mw) * mwb * 0.06 * uP.y * smoothstep(0.1, 0.4, t);
  }
  // lune
  if (uQ.z > 0.0){
    vec2 mp = vec2(uQ.w + 0.22, hz + 0.34);
    float md = length((p - mp));
    c += vec3(1.0, 0.96, 0.88) * smoothstep(0.024, 0.021, md) * uQ.z;
    c += vec3(0.75, 0.8, 0.9) * exp(-md*9.0) * 0.18 * uQ.z;
  }
  return c;
}

vec3 land(vec2 p, float aspect, float par){
  vec3 c = sky(p, aspect);
  if (uQ.x <= 0.0) return c;
  float hz = uP.x;
  for (int i=0;i<4;i++){
    float fi = float(i);
    float x = p.x + par*(0.004 + fi*0.012);
    float h;
    if (i < 2){
      // massifs lointains : crêtes nettes, grande amplitude
      float r = ridged(vec2(x*(0.75 + fi*0.7) + fi*17.3 + uSeed, fi*3.1));
      h = hz + 0.004 + pow(r, 2.2) * (0.34 - fi*0.12) * uQ.x;
    } else {
      // lisières de conifères : silhouettes étroites et irrégulières
      float sc = i == 2 ? 170.0 : 85.0;
      float tx = x*sc + fi*31.0;
      float id = floor(tx);
      float f = fract(tx);
      float th = h21(vec2(id, fi+uSeed));
      th = th*th * (i == 2 ? 0.016 : 0.04);
      float tree = th * max(0.0, 1.0 - abs(f-0.5)*2.2) ;
      float th2 = h21(vec2(id+0.5, fi+uSeed+3.0));
      tree = max(tree, th2*th2*(i == 2 ? 0.012 : 0.03) * max(0.0, 1.0 - abs(fract(tx+0.5)-0.5)*2.4));
      float hill = (i == 2 ? 0.006 : 0.012) + (i == 2 ? 0.02 : 0.05) * fbm(vec2(x*(i == 2 ? 1.6 : 2.4) + uSeed + fi, 4.0));
      h = hz + (hill + tree) * min(uQ.x, 1.0) * (1.0 + 0.4*noise(vec2(x*4.0, fi)));
    }
    float depth = 1.0 - fi/3.0;
    vec3 rc = mix(uRidge, uSkyLow*0.75 + uMist*0.2, depth*0.6);
    if (i < 2){
      // modelé des versants : ombre côté opposé au halo, ravines
      float slope = ridged(vec2(x*(0.75 + fi*0.7) + fi*17.3 + uSeed + 0.01, fi*3.1)) - ridged(vec2(x*(0.75 + fi*0.7) + fi*17.3 + uSeed - 0.01, fi*3.1));
      float up = smoothstep(hz, h, p.y);
      rc *= 0.86 + clamp(slope*5.0, -0.22, 0.25) * up;
      rc *= 0.92 + 0.14*fbm(vec2(x*9.0, p.y*9.0) + uSeed);
      rc = mix(rc, uMist*0.8, smoothstep(h, hz, p.y)*0.25*depth);
    }
    // lumière rasante du halo sur les crêtes lointaines
    rc += uGlow * 0.08 * depth * uP.w * smoothstep(h-0.05, h, p.y);
    float edge = smoothstep(h + 0.0015, h - 0.0015, p.y);
    c = mix(c, rc, edge);
    // brume posée au pied de chaque plan
    float m = fbm3(vec2(p.x*3.0 + uTime*(0.01+fi*0.006) + fi*5.0, p.y*14.0 - fi));
    float foot = smoothstep(h - 0.01, hz - 0.01, p.y) * smoothstep(hz - 0.02, hz + 0.01, p.y);
    c = mix(c, uMist, foot * m * uP.z * 0.65 * edge);
  }
  return c;
}

vec3 landscape(vec2 uv, float aspect){
  vec2 p = vec2((uv.x-0.5)*aspect, uv.y);
  float par = uMouse.x;
  p.y += uMouse.y*0.006;
  float hz = uP.x;
  vec3 col;
  if (uQ.y > 0.0 && p.y < hz){
    float dist = hz - p.y;
    float w1 = noise(vec2(p.x*4.0, p.y*90.0/(dist*6.0+0.25) - uTime*0.5));
    float w2 = noise(vec2(p.x*9.0 + 3.0, p.y*160.0/(dist*6.0+0.25) + uTime*0.35));
    vec2 rp = vec2(p.x + (w1-0.5)*0.018*(dist*3.0+0.3), 2.0*hz - p.y + (w2-0.5)*0.012*(dist*4.0+0.2));
    col = land(rp, aspect, par) * 0.62;
    col = mix(col, uSkyLow*0.35, smoothstep(0.0, 0.45, dist)*0.6);
    // reflets du halo et de la lune en lignes brisées
    float streak = pow(noise(vec2(p.x*3.0, p.y*240.0 - uTime*0.8)), 6.0);
    float gx = exp(-abs(p.x - uQ.w)*2.2);
    col += uGlow * streak * gx * uP.w * 0.9 * smoothstep(0.5, 0.0, dist);
    if (uQ.z > 0.0){
      float mx = exp(-abs(p.x - (uQ.w+0.22))*16.0);
      col += vec3(0.9,0.92,1.0) * pow(noise(vec2(p.x*20.0, p.y*300.0 - uTime*0.7)), 5.0) * mx * 0.9 * uQ.z;
    }
    // ligne d'horizon lumineuse
    col += uGlow * exp(-dist*260.0) * 0.25 * uP.w;
    // brume rasante sur l'eau
    float fm = fbm3(vec2(p.x*2.2 - uTime*0.015, p.y*10.0));
    col = mix(col, uMist*0.9, smoothstep(0.08, 0.0, dist) * fm * uP.z * 0.7);
  } else {
    col = land(p, aspect, par);
  }
  // brume générale qui dérive
  float fog = fbm(vec2(p.x*1.2 + uTime*0.012 + uSeed, p.y*3.5 - uTime*0.004));
  col = mix(col, uMist, smoothstep(0.42, 0.9, fog) * exp(-abs(p.y-hz)*7.0) * uP.z * 0.55);
  return col;
}

/* ---------- Seuil : une ouverture de lumière dans l'obscurité ---------- */
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p)-b; return length(max(d,0.0)) + min(max(d.x,d.y),0.0); }
vec3 threshold(vec2 uv, float aspect){
  vec2 p = vec2((uv.x-0.5)*aspect + uMouse.x*0.01, uv.y);
  float floorY = 0.24;
  vec2 dc = vec2(0.0, floorY + 0.27);
  vec2 db = vec2(0.085, 0.27);
  vec3 warm = uGlow;
  vec3 col = uSkyTop;
  // murs : panneaux verticaux à peine révélés
  float panels = smoothstep(0.48, 0.5, abs(fract(p.x*6.0)-0.5)) * 0.03;
  col += warm * panels * exp(-abs(p.x)*2.5) * smoothstep(floorY, 1.0, p.y);
  // plafond : deux arêtes lumineuses qui fuient vers l'ouverture
  for (int s=-1; s<=1; s+=2){
    float fs = float(s);
    float k = clamp((1.05 - p.y)/(1.05 - 0.78), 0.0, 1.0);
    float ex = fs * mix(aspect*0.62, 0.11, k);
    float line = exp(-abs(p.x - ex)*(260.0)) * step(0.78, p.y);
    col += warm * line * 0.22 * (0.4 + k);
  }
  float d = sdBox(p - dc, db);
  vec3 inside = mix(warm*1.05, warm*0.55 + vec3(0.12,0.1,0.08), smoothstep(0.0, 1.0, (p.y - floorY)/0.54));
  inside += warm * 0.35 * exp(-abs(p.x)*40.0) * smoothstep(0.6, 0.0, (p.y - floorY)/0.54);
  float haze = fbm(vec2(p.x*2.0 + uTime*0.02, p.y*3.0 - uTime*0.03));
  col += warm * exp(-max(d,0.0)*9.0) * 0.32 * (0.7 + 0.6*haze);
  col += warm * exp(-max(d,0.0)*40.0) * 0.35;
  col = mix(col, inside, smoothstep(0.002, -0.002, d));
  // sol : reflet étiré et flou de l'ouverture
  if (p.y < floorY){
    float fy = floorY - p.y;
    vec2 rp = vec2(p.x + (noise(vec2(p.x*30.0, fy*60.0))-0.5)*0.01, floorY + fy*1.6);
    float rd = sdBox(rp - dc, db + vec2(0.01, 0.0));
    vec3 refl = warm * (exp(-max(rd,0.0)*14.0)*0.45 + smoothstep(0.01, -0.01, rd)*0.5);
    col = uSkyTop*0.8 + refl * exp(-fy*5.0);
    col += warm * exp(-fy*80.0) * exp(-abs(p.x)*6.0) * 0.15;
  }
  // volume de poussière dans le faisceau
  float beam = exp(-abs(p.x)*5.0) * smoothstep(floorY-0.1, floorY+0.6, p.y);
  float dust = pow(noise(p*vec2(160.0, 160.0) + vec2(0.0, uTime*0.4)), 30.0);
  col += warm * dust * beam * 0.5;
  return col;
}

/* ---------- Onde : surface d'eau sous lumière rasante ---------- */
vec3 ripple(vec2 uv, float aspect){
  vec2 p = vec2((uv.x-0.5)*aspect, uv.y);
  vec2 q = vec2(p.x*2.2, p.y*6.0 + 1.0/(p.y+0.35));
  float t = uTime*0.25;
  float e = 0.01;
  float h  = fbm(q + vec2(t, -t*0.6) + uSeed);
  float hx = fbm(q + vec2(e,0.) + vec2(t, -t*0.6) + uSeed);
  float hy = fbm(q + vec2(0.,e) + vec2(t, -t*0.6) + uSeed);
  vec3 n = normalize(vec3((h-hx)/e*0.6, (h-hy)/e*0.6, 1.0));
  vec3 l = normalize(vec3(-0.2, 0.9, 0.35));
  float spec = pow(max(dot(reflect(-l, n), vec3(0.,0.,1.)), 0.0), 36.0);
  vec3 col = mix(uSkyLow, uSkyTop, uv.y);
  col += uSkyMid * (n.y*0.5+0.2) * 0.35;
  col += uGlow * spec * (0.6 + uv.y*1.4) * uP.w;
  col = mix(col, uSkyTop, smoothstep(0.55, 1.0, uv.y)*0.6);
  return col;
}

/* ---------- Pierre : relief éclairé en lumière rasante ---------- */
vec3 stone(vec2 uv, float aspect){
  vec2 p = vec2((uv.x-0.5)*aspect, uv.y) * 3.2;
  float e = 0.004;
  float h  = ridged(p + uSeed) * 0.7 + fbm(p*6.0)*0.15;
  float hx = ridged(p + vec2(e,0.) + uSeed) * 0.7 + fbm((p+vec2(e,0.))*6.0)*0.15;
  float hy = ridged(p + vec2(0.,e) + uSeed) * 0.7 + fbm((p+vec2(0.,e))*6.0)*0.15;
  vec3 n = normalize(vec3((h-hx)/e*0.04, (h-hy)/e*0.04, 1.0));
  vec3 l = normalize(vec3(-0.85 + uMouse.x*0.2, 0.25, 0.32));
  float dif = max(dot(n, l), 0.0);
  vec3 col = uRidge * 0.8 + uGlow * pow(dif, 1.6) * 1.5 * uP.w;
  col *= 0.55 + 0.45*smoothstep(1.2, -0.2, uv.x + uv.y*0.3);
  return col;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec3 col;
  if (uScene < 0.5) col = landscape(uv, aspect);
  else if (uScene < 1.5) col = threshold(uv, aspect);
  else if (uScene < 2.5) col = ripple(uv, aspect);
  else col = stone(uv, aspect);
  col *= uExposure;
  // vignette douce
  vec2 vv = uv - 0.5;
  col *= 1.0 - dot(vv*vec2(0.9, 1.1), vv*vec2(0.9, 1.1)) * 0.9;
  // tonemap filmique léger + grain
  col = col / (1.0 + col*0.35);
  col = pow(max(col, 0.0), vec3(0.95));
  float g = h21(gl_FragCoord.xy + fract(uTime*7.13)*100.0) - 0.5;
  col += g * 0.035;
  gl_FragColor = vec4(col, 1.0);
}
`;

const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/**
 * Préréglages des scènes. Les couleurs sont en hexadécimal pour rester lisibles.
 * p = [horizon, étoiles, brume, halo]  q = [montagnes, eau, lune, position x du halo]
 */
const SCENES = {
  lac: { kind: 0, skyTop: '#04070d', skyMid: '#132038', skyLow: '#3a3a4a', glow: '#c98a4b', ridge: '#04060b', mist: '#5d6878', p: [0.4, 0.55, 0.5, 0.8], q: [1.7, 1, 0, 0.22], seed: 8.0 },
  brume: { kind: 0, skyTop: '#11161e', skyMid: '#3b4552', skyLow: '#7d8894', glow: '#c9b59a', ridge: '#141a22', mist: '#9aa3ad', p: [0.36, 0.0, 1.0, 0.35], q: [1.25, 1, 0, -0.3], seed: 11.0 },
  astres: { kind: 0, skyTop: '#02040a', skyMid: '#0a1426', skyLow: '#1d2a40', glow: '#6d7fa6', ridge: '#020307', mist: '#2b3850', p: [0.26, 1.0, 0.25, 0.4], q: [0.8, 0, 0, 0.0], seed: 27.0 },
  rivage: { kind: 0, skyTop: '#03060c', skyMid: '#0d1a2c', skyLow: '#26344a', glow: '#8a9cc0', ridge: '#05080e', mist: '#3d4c63', p: [0.4, 0.7, 0.3, 0.25], q: [0.18, 1, 1, -0.05], seed: 5.0 },
  braise: { kind: 0, skyTop: '#07070c', skyMid: '#2a1c22', skyLow: '#6e3c24', glow: '#e08a42', ridge: '#0a0708', mist: '#2e2222', p: [0.34, 0.25, 0.35, 1.0], q: [1.1, 0, 0, 0.12], seed: 41.0 },
  seuil: { kind: 1, skyTop: '#07080b', skyMid: '#15130f', skyLow: '#1a1712', glow: '#d39a5a', ridge: '#0a0a0a', mist: '#2a241c', p: [0.5, 0, 0, 1], q: [0, 0, 0, 0], seed: 1.0 },
  onde: { kind: 2, skyTop: '#03060b', skyMid: '#2b4a6b', skyLow: '#0b1626', glow: '#e3b57a', ridge: '#000', mist: '#000', p: [0.5, 0, 0, 1], q: [0, 0, 0, 0], seed: 7.0 },
  pierre: { kind: 3, skyTop: '#000', skyMid: '#000', skyLow: '#000', glow: '#c99a63', ridge: '#0e0d0c', mist: '#000', p: [0.5, 0, 0, 1], q: [0, 0, 0, 0], seed: 13.0 },
};

/**
 * Monte le rendu sur un canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts { scene, still, time, quality (0–1), onReady }
 * @returns {{ destroy(): void, setMouse(x:number,y:number): void } | null}
 */
function mountHorizon(canvas, opts = {}) {
  const preset = SCENES[opts.scene] || SCENES.lac;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: !!opts.still, powerPreference: 'high-performance' });
  if (!gl) return null;

  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = (n) => gl.getUniformLocation(prog, n);
  const u = { res: U('uRes'), time: U('uTime'), mouse: U('uMouse'), exposure: U('uExposure') };
  gl.uniform1f(U('uScene'), preset.kind);
  gl.uniform3fv(U('uSkyTop'), hex(preset.skyTop));
  gl.uniform3fv(U('uSkyMid'), hex(preset.skyMid));
  gl.uniform3fv(U('uSkyLow'), hex(preset.skyLow));
  gl.uniform3fv(U('uGlow'), hex(preset.glow));
  gl.uniform3fv(U('uRidge'), hex(preset.ridge));
  gl.uniform3fv(U('uMist'), hex(preset.mist));
  gl.uniform4fv(U('uP'), preset.p);
  gl.uniform4fv(U('uQ'), preset.q);
  gl.uniform1f(U('uSeed'), preset.seed);

  let quality = opts.quality ?? 0.75;
  let raf = 0, visible = true, paused = false, start = performance.now();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const frameTimes = [];
  let exposure = opts.still ? 1 : 0;

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const scale = opts.still ? 1 : Math.min(window.devicePixelRatio || 1, 1.5) * quality;
    const w = Math.max(2, Math.round((opts.width || r.width) * scale));
    const h = Math.max(2, Math.round((opts.height || r.height) * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(u.res, canvas.width, canvas.height);
  };

  const draw = (t) => {
    gl.uniform1f(u.time, t);
    gl.uniform2f(u.mouse, mouse.x, mouse.y);
    gl.uniform1f(u.exposure, exposure);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  resize();

  if (opts.still) {
    draw(opts.time ?? 12);
    opts.onReady?.();
    return { destroy() {}, setMouse() {} };
  }

  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (!visible || paused) return;
    const dt = now - (loop.last || now);
    loop.last = now;
    // qualité adaptative : on baisse la résolution si l'appareil peine
    if (dt > 0 && dt < 200) {
      frameTimes.push(dt);
      if (frameTimes.length > 40) {
        const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        frameTimes.length = 0;
        if (avg > 24 && quality > 0.4) { quality = Math.max(0.4, quality - 0.12); resize(); }
        else if (avg < 14 && quality < 0.9) { quality = Math.min(0.9, quality + 0.05); resize(); }
      }
    }
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    exposure += (1 - exposure) * 0.02;
    draw((now - start) / 1000 + (opts.time ?? 8));
  };

  if (opts.reducedMotion) {
    exposure = 1;
    draw(opts.time ?? 12);
    const onResize = () => { resize(); draw(opts.time ?? 12); };
    window.addEventListener('resize', onResize);
    opts.onReady?.();
    return { destroy() { window.removeEventListener('resize', onResize); }, setMouse() {} };
  }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
  io.observe(canvas);
  const onVis = () => { visible = !document.hidden; };
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(loop);
  requestAnimationFrame(() => opts.onReady?.());

  return {
    setMouse(x, y) { mouse.tx = x; mouse.ty = y; },
    setPaused(v) { paused = !!v; },
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', resize);
    },
  };
}

// Script classique (pas de module) : fonctionne aussi en ouvrant le fichier en local.
window.Horizon = { SCENES, mountHorizon };
})();
