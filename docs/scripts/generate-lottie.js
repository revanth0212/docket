const fs = require('fs');
const path = require('path');

// Color palette (Catppuccin Mocha)
const C = {
  base: [30 / 255, 30 / 255, 46 / 255],
  text: [205 / 255, 214 / 255, 244 / 255],
  blue: [137 / 255, 180 / 255, 250 / 255],
  mauve: [203 / 255, 166 / 255, 247 / 255],
  green: [166 / 255, 227 / 255, 161 / 255],
  peach: [250 / 255, 179 / 255, 135 / 255],
  red: [243 / 255, 139 / 255, 168 / 255],
  teal: [148 / 255, 226 / 255, 213 / 255],
  surface: [69 / 255, 71 / 255, 90 / 255],
};

let layerIndex = 1;

function layer(name, shapes, transform) {
  return { ddd: 0, ind: layerIndex++, ty: 4, nm: name, sr: 1, ks: transform, shapes, ip: 0, op: 180, st: 0, bm: 0 };
}

function rect(size, pos, color, strokeW = 0, strokeC = null, r = 0) {
  const it = [
    { ty: 'rc', d: 1, s: { a: 0, k: size }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: r } },
    { ty: 'fl', c: { a: 0, k: color }, o: { a: 0, k: 100 }, r: 1 },
    { ty: 'tr', p: { a: 0, k: pos }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
  ];
  if (strokeW > 0 && strokeC) {
    it.splice(2, 0, { ty: 'st', c: { a: 0, k: strokeC }, o: { a: 0, k: 100 }, w: { a: 0, k: strokeW }, lc: 2, lj: 2, ml: 4 });
  }
  return { ty: 'gr', it };
}

function ellipse(size, pos, color, strokeW = 0, strokeC = null) {
  const it = [
    { ty: 'el', d: 1, s: { a: 0, k: size }, p: { a: 0, k: [0, 0] } },
    { ty: 'fl', c: { a: 0, k: color }, o: { a: 0, k: 100 }, r: 1 },
    { ty: 'tr', p: { a: 0, k: pos }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
  ];
  if (strokeW > 0 && strokeC) {
    it.splice(2, 0, { ty: 'st', c: { a: 0, k: strokeC }, o: { a: 0, k: 100 }, w: { a: 0, k: strokeW }, lc: 2, lj: 2, ml: 4 });
  }
  return { ty: 'gr', it };
}

function star(points, pos, outerR, innerR, color, rot = 0) {
  return {
    ty: 'gr',
    it: [
      { ty: 'sr', sy: 1, d: 1, pt: { a: 0, k: points }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 0 }, or: { a: 0, k: outerR }, ir: { a: 0, k: innerR }, is: { a: 0, k: 0 }, os: { a: 0, k: 0 } },
      { ty: 'fl', c: { a: 0, k: color }, o: { a: 0, k: 100 }, r: 1 },
      { ty: 'tr', p: { a: 0, k: pos }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: rot }, o: { a: 0, k: 100 } },
    ],
  };
}

function poly(pos, verts, color, strokeW, strokeC) {
  return {
    ty: 'gr',
    it: [
      { ty: 'sh', ks: { a: 0, k: { i: verts.map(() => [0, 0]), o: verts.map(() => [0, 0]), v: verts, c: true } } },
      { ty: 'fl', c: { a: 0, k: color }, o: { a: 0, k: 100 }, r: 1 },
      ...(strokeW > 0 && strokeC ? [{ ty: 'st', c: { a: 0, k: strokeC }, o: { a: 0, k: 100 }, w: { a: 0, k: strokeW }, lc: 2, lj: 2, ml: 4 }] : []),
      { ty: 'tr', p: { a: 0, k: pos }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
    ],
  };
}

function pathLine(from, to, color, width) {
  return {
    ty: 'gr',
    it: [
      { ty: 'sh', ks: { a: 0, k: { i: [[0, 0], [0, 0]], o: [[0, 0], [0, 0]], v: [from, to], c: false } } },
      { ty: 'st', c: { a: 0, k: color }, o: { a: 0, k: 100 }, w: { a: 0, k: width }, lc: 2, lj: 2, ml: 4 },
      { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
    ],
  };
}

// 1D property keyframes (opacity, rotation)
function kf1(frames) {
  return {
    a: 1,
    k: frames.map((k) => ({ i: { x: [0.5], y: [0.5] }, o: { x: [0.5], y: [0.5] }, t: k.t, s: [k.s] })),
  };
}

// 2D property keyframes (scale)
function kf2(frames) {
  return {
    a: 1,
    k: frames.map((k) => ({ i: { x: [0.5, 0.5], y: [0.5, 0.5] }, o: { x: [0.5, 0.5], y: [0.5, 0.5] }, t: k.t, s: k.s })),
  };
}

// 3D property keyframes (position) with spatial bezier
function kfPos(frames) {
  return {
    a: 1,
    k: frames.map((k) => ({ i: { x: 0.5, y: 0.5 }, o: { x: 0.5, y: 0.5 }, t: k.t, s: k.s, to: [0, 0], ti: [0, 0] })),
  };
}

function tx(pos) {
  return { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: pos }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] } };
}

function anim(name, w, h, layers) {
  return { v: '5.7.4', fr: 30, ip: 0, op: 180, w, h, nm: name, ddd: 0, assets: [], layers: layers.reverse() };
}

// ========== ANIMATION 1: Data Pipeline ==========
function dataPipeline() {
  const W = 512, H = 256;
  const layers = [];

  layers.push(layer('bg', [rect([W, H], [W / 2, H / 2], C.base)], tx([0, 0])));

  const segs = [
    { x: 80, c: C.blue },
    { x: 210, c: C.mauve },
    { x: 340, c: C.green },
    { x: 460, c: C.peach },
  ];

  segs.forEach((s, i) => {
    layers.push(layer(`box_${i}`, [rect([90, 50], [s.x, H / 2 - 30], [0.12, 0.12, 0.18], 2, s.c, 8)], tx([0, 0])));
    layers.push(layer(`dot_${i}`, [ellipse([10, 10], [s.x, H / 2 + 20], s.c)], {
      o: kf1([
        { t: i * 15, s: 0 },
        { t: i * 15 + 10, s: 100 },
        { t: i * 15 + 140, s: 100 },
        { t: i * 15 + 160, s: 0 },
      ]),
      r: { a: 0, k: 0 },
      p: { a: 0, k: [0, 0] },
      a: { a: 0, k: [0, 0] },
      s: { a: 0, k: [100, 100] },
    }));
  });

  for (let i = 0; i < segs.length - 1; i++) {
    const x1 = segs[i].x + 45;
    const x2 = segs[i + 1].x - 45;
    layers.push(layer(`line_${i}`, [pathLine([x1, H / 2 - 30], [x2, H / 2 - 30], C.surface, 2)], tx([0, 0])));
  }

  for (let i = 0; i < 6; i++) {
    const yOff = i % 2 === 0 ? -8 : 8;
    const delay = i * 25;
    layers.push(layer(`particle_${i}`, [ellipse([6, 6], [0, 0], C.teal)], {
      o: kf1([
        { t: delay, s: 0 },
        { t: delay + 8, s: 100 },
        { t: delay + 100, s: 100 },
        { t: delay + 120, s: 0 },
      ]),
      r: { a: 0, k: 0 },
      p: kfPos([
        { t: delay, s: [30, H / 2 + yOff] },
        { t: delay + 110, s: [490, H / 2 + yOff] },
      ]),
      a: { a: 0, k: [0, 0] },
      s: { a: 0, k: [100, 100] },
    }));
  }

  return anim('Data Pipeline', W, H, layers);
}

// ========== ANIMATION 2: Adapter Swap ==========
function adapterSwap() {
  const W = 512,
    H = 256;
  const layers = [];

  layers.push(layer('bg', [rect([W, H], [W / 2, H / 2], C.base)], tx([0, 0])));

  layers.push(layer('gear', [star(8, [W / 2, H / 2], 40, 28, C.blue), ellipse([18, 18], [W / 2, H / 2], C.base)], {
    o: { a: 0, k: 100 },
    r: kf1([
      { t: 0, s: 0 },
      { t: 180, s: 360 },
    ]),
    p: { a: 0, k: [0, 0] },
    a: { a: 0, k: [0, 0] },
    s: { a: 0, k: [100, 100] },
  }));

  const adapters = [
    { angle: 0, c: C.green },
    { angle: 72, c: C.mauve },
    { angle: 144, c: C.peach },
    { angle: 216, c: C.teal },
    { angle: 288, c: C.red },
  ];

  adapters.forEach((a, i) => {
    const rad = (a.angle * Math.PI) / 180;
    const x = W / 2 + Math.cos(rad) * 75;
    const y = H / 2 + Math.sin(rad) * 75;

    layers.push(
      layer(
        `adp_${i}`,
        [rect([56, 28], [x, y], [0.15, 0.15, 0.22], 1.5, a.c, 6)],
        {
          o: kf1([
            { t: i * 20, s: 0 },
            { t: i * 20 + 15, s: 100 },
            { t: i * 20 + 130, s: 100 },
            { t: i * 20 + 150, s: 30 },
          ]),
          r: { a: 0, k: 0 },
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: kf2([
            { t: i * 20, s: [80, 80] },
            { t: i * 20 + 15, s: [100, 100] },
          ]),
        }
      )
    );

    const dx = -(Math.cos(rad) * 40);
    const dy = -(Math.sin(rad) * 40);
    layers.push(layer(`conn_${i}`, [pathLine([x, y], [x + dx, y + dy], a.c, 1.5)], tx([0, 0])));
  });

  return anim('Adapter Swap', W, H, layers);
}

// ========== ANIMATION 3: Query Pipeline ==========
function queryPipeline() {
  const W = 512,
    H = 256;
  const layers = [];

  layers.push(layer('bg', [rect([W, H], [W / 2, H / 2], C.base)], tx([0, 0])));

  layers.push(layer('lens', [ellipse([50, 50], [W / 2 - 60, H / 2], [0.15, 0.15, 0.22], 3, C.blue)], tx([0, 0])));
  layers.push(
    layer(
      'handle',
      [rect([8, 30], [W / 2 - 60 + 22, H / 2 + 22], C.blue, 0, null, 4)],
      {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 45 },
        p: { a: 0, k: [0, 0] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] },
      }
    )
  );

  for (let i = 0; i < 3; i++) {
    const d = i * 40;
    layers.push(
      layer(
        `pulse_${i}`,
        [ellipse([60, 60], [W / 2 - 60, H / 2], [0, 0, 0], 2, C.blue)],
        {
          o: kf1([
            { t: d, s: 80 },
            { t: d + 20, s: 40 },
            { t: d + 50, s: 0 },
          ]),
          r: { a: 0, k: 0 },
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: kf2([
            { t: d, s: [100, 100] },
            { t: d + 50, s: [180, 180] },
          ]),
        }
      )
    );
  }

  const colors = [C.green, C.mauve, C.peach, C.teal, C.red];
  for (let i = 0; i < 5; i++) {
    const y = H / 2 - 40 + i * 20;
    layers.push(
      layer(
        `res_${i}`,
        [rect([50, 14], [0, 0], [0.15, 0.15, 0.22], 1, colors[i], 7)],
        {
          o: kf1([
            { t: 30 + i * 15, s: 0 },
            { t: 45 + i * 15, s: 100 },
            { t: 140, s: 100 },
            { t: 160, s: 0 },
          ]),
          r: { a: 0, k: 0 },
          p: kfPos([
            { t: 30 + i * 15, s: [W / 2 + 20, y] },
            { t: 50 + i * 15, s: [W / 2 + 100 + i * 20, y] },
          ]),
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
        }
      )
    );
  }

  return anim('Query Pipeline', W, H, layers);
}

// ========== ANIMATION 4: Memory Nodes ==========
function memoryNodes() {
  const W = 512,
    H = 256;
  const layers = [];

  layers.push(layer('bg', [rect([W, H], [W / 2, H / 2], C.base)], tx([0, 0])));

  layers.push(
    layer(
      'hub',
      [ellipse([36, 36], [W / 2, H / 2], C.mauve, 2, C.mauve), ellipse([16, 16], [W / 2, H / 2], C.base)],
      {
        o: { a: 0, k: 100 },
        r: kf1([
          { t: 0, s: 0 },
          { t: 90, s: 180 },
          { t: 180, s: 360 },
        ]),
        p: { a: 0, k: [0, 0] },
        a: { a: 0, k: [0, 0] },
        s: kf2([
          { t: 0, s: [100, 100] },
          { t: 45, s: [110, 110] },
          { t: 90, s: [100, 100] },
          { t: 135, s: [110, 110] },
          { t: 180, s: [100, 100] },
        ]),
      }
    )
  );

  const nodes = [
    { r: 55, s: 1, c: C.blue, sz: 14 },
    { r: 55, s: -1.2, c: C.green, sz: 10 },
    { r: 85, s: 0.7, c: C.peach, sz: 12 },
    { r: 85, s: -0.9, c: C.teal, sz: 9 },
    { r: 110, s: 0.5, c: C.red, sz: 11 },
    { r: 110, s: -0.6, c: C.blue, sz: 8 },
  ];

  nodes.forEach((n, i) => {
    const positions = [];
    for (let t = 0; t <= 180; t += 15) {
      const angle = t * n.s * 2 * (Math.PI / 180);
      positions.push({ t, s: [W / 2 + Math.cos(angle) * n.r, H / 2 + Math.sin(angle) * n.r] });
    }
    layers.push(
      layer(
        `node_${i}`,
        [ellipse([n.sz, n.sz], [0, 0], n.c, 1.5, n.c)],
        {
          o: kf1([
            { t: i * 10, s: 0 },
            { t: i * 10 + 15, s: 100 },
            { t: 160, s: 100 },
            { t: 175, s: 0 },
          ]),
          r: { a: 0, k: 0 },
          p: kfPos(positions),
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
        }
      )
    );
  });

  return anim('Memory Nodes', W, H, layers);
}

// ========== ANIMATION 5: Control Plane ==========
function controlPlane() {
  const W = 512,
    H = 256;
  const layers = [];

  layers.push(layer('bg', [rect([W, H], [W / 2, H / 2], C.base)], tx([0, 0])));

  const shieldVerts = [
    [0, -40],
    [32, -20],
    [32, 20],
    [0, 45],
    [-32, 20],
    [-32, -20],
  ];
  layers.push(layer('shield', [poly([W / 2, H / 2], shieldVerts, [0.12, 0.12, 0.18], 2.5, C.green)], tx([0, 0])));

  layers.push(
    layer(
      'check',
      [pathLine([-14, -4], [-4, 10], C.green, 4), pathLine([-4, 10], [18, -16], C.green, 4)],
      {
        o: kf1([
          { t: 20, s: 0 },
          { t: 40, s: 100 },
          { t: 160, s: 100 },
          { t: 175, s: 0 },
        ]),
        r: { a: 0, k: 0 },
        p: { a: 0, k: [W / 2, H / 2 + 2] },
        a: { a: 0, k: [0, 0] },
        s: kf2([
          { t: 20, s: [60, 60] },
          { t: 45, s: [110, 110] },
          { t: 60, s: [100, 100] },
        ]),
      }
    )
  );

  const indicators = [
    { x: W / 2 - 90, y: H / 2, c: C.blue },
    { x: W / 2 + 90, y: H / 2, c: C.mauve },
    { x: W / 2, y: H / 2 - 70, c: C.peach },
    { x: W / 2, y: H / 2 + 70, c: C.teal },
  ];

  indicators.forEach((ind, i) => {
    layers.push(
      layer(
        `ind_${i}`,
        [ellipse([8, 8], [ind.x, ind.y], ind.c)],
        {
          o: kf1([
            { t: i * 15, s: 0 },
            { t: i * 15 + 12, s: 100 },
            { t: i * 15 + 25, s: 60 },
            { t: i * 15 + 38, s: 100 },
            { t: 160, s: 100 },
            { t: 175, s: 0 },
          ]),
          r: { a: 0, k: 0 },
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
        }
      )
    );
  });

  return anim('Control Plane', W, H, layers);
}

// ========== Write ==========
const outDir = path.join(__dirname, '..', 'public', 'lottie');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const anims = [
  { name: 'data-pipeline', gen: dataPipeline },
  { name: 'adapter-swap', gen: adapterSwap },
  { name: 'query-pipeline', gen: queryPipeline },
  { name: 'memory-nodes', gen: memoryNodes },
  { name: 'control-plane', gen: controlPlane },
];

anims.forEach(({ name, gen }) => {
  layerIndex = 1;
  const data = gen();
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(data, null, 2));
  console.log(`Generated ${name}.json (${data.layers.length} layers)`);
});
console.log(`\nWritten to ${outDir}`);
