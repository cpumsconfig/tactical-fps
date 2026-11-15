import * as THREE from 'three';
import { C } from './palette.js';

export function buildWorld(scene) {
  scene.background = new THREE.Color(0x384342);
  scene.fog = new THREE.FogExp2(0x384342, 0.0052);
  const colliders = [], targets = [], spawns = [];
  const material = (color, roughness = 0.78, metalness = 0.2, emissive = 0, intensity = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: intensity });
  const steel = material(0x626c69, 0.72, 0.28);
  const wall = material(0x737a73, 0.86, 0.12);
  const floor = material(0x555f5b, 0.9, 0.08);
  const amber = material(C.amber, 0.35, 0.45, C.amber, 0.9);
  const blue = material(C.cobalt, 0.35, 0.45, C.cobalt, 0.9);
  const hot = material(C.molten, 0.4, 0.2, C.molten, 4.2);
  const strip = material(0xffc27a, 0.3, 0.1, 0xff7137, 4.4);

  const box = (x, y, z, w, h, d, mat, solid = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
    if (solid && y < 3) colliders.push({ x, z, w, d });
    return mesh;
  };

  box(0, -0.25, 0, 42, 0.5, 58, floor, false);
  for (const side of [-1, 1]) {
    box(side * 21, 2.4, 0, 0.7, 5, 58, wall, false);
    box(side * 20.58, 3.15, 0, 0.08, 2.9, 50, side < 0 ? amber : blue, false);
    for (let z = -22; z <= 22; z += 11) {
      box(side * 20.48, 3.5, z, 0.1, 1.15, 2.8, side < 0 ? amber : blue, false);
      const pool = new THREE.PointLight(side < 0 ? 0xff994c : 0x49cde5, 8, 12, 1.8);
      pool.position.set(side * 17.5, 3.4, z); scene.add(pool);
    }
    box(side * 11, 2.7, -28, 20, 5, 0.7, wall, false);
    box(side * 11, 2.7, 28, 20, 5, 0.7, wall, false);
    box(side * 10.1, 4.9, 0, 0.12, 0.1, 45, side < 0 ? amber : blue, false);
    box(side * 14, 5.5, 0, 9, 0.35, 42, steel, false);
    for (let z = -23; z < 26; z += 8) box(side * 14, 5.78, z, 7, 0.1, 0.08, side < 0 ? amber : blue, false);
  }
  for (let x = -18; x <= 18; x += 6) {
    box(x, 5.9, -3, 0.18, 0.2, 22, steel, false);
    box(x, 5.75, -3, 0.25, 0.1, 7, strip, false);
  }

  // Three track beds and paired luminous slag channels cross the terminal.
  for (const x of [-12, 0, 12]) {
    box(x, 0.02, 0, 4, 0.08, 56, material(0x48514d), false);
    for (const side of [-1, 1]) box(x + side * 1.65, 0.1, 0, 0.12, 0.15, 56, material(0xb0afa2), false);
  }
  for (const x of [-8, 8]) {
    box(x, -0.12, 0, 2.6, 0.13, 55, hot, false);
    for (let z = -27; z < 28; z += 3) box(x, 0.13, z, 2.5, 0.06, 1.2, material(0xffa34a, 0.4, 0.2, 0xff5c1b, 2), false);
  }

  // Receding overhead markers give the long lanes depth and clear team identity.
  for (const z of [-22, -14, -6, 2, 10, 18]) {
    for (const side of [-1, 1]) {
      box(side * 6.2, 5.65, z, 0.28, 0.12, 3.4, side < 0 ? amber : blue, false);
    }
  }

  // Pillars, crate islands, and low traversable rail cars preserve the cover lanes.
  for (const x of [-17, 17]) for (const z of [-18, -6, 7, 20]) {
    box(x, 2.1, z, 2, 4.2, 2, steel);
    box(x, 4.28, z, 2.3, 0.2, 2.3, z < 0 ? amber : blue, false);
  }
  const crates = [[-5, -14, 4, 3, 4], [5, -10, 4, 3, 4], [-4, -1, 3, 2.3, 3], [5, 5, 4, 2.6, 3], [-5, 15, 4, 3, 5], [5, 20, 3, 2, 4], [14, 1, 4, 2.4, 7], [-14, 2, 4, 2.4, 7]];
  for (const [x, z, w, h, d] of crates) {
    box(x, h / 2, z, w, h, d, steel);
    box(x, h * 0.7, z, w + 0.03, 0.09, 0.11, material(0xa4aea5), false);
    for (let i = 0; i < 3; i++) box(x - w * 0.35 + i * w * 0.35, h * 0.5, z + d * 0.5 + 0.01, 0.1, h * 0.7, 0.05, material(0x414a46), false);
  }

  // Roof ribs and bright continuous strips give the tall hall a readable scale.
  for (let z = -25; z <= 25; z += 10) {
    box(0, 8, z, 40, 0.35, 0.5, steel, false);
    box(0, 7.7, z, 34, 0.08, 0.1, strip, false);
  }
  box(0, 9, 0, 4, 1, 50, material(0x414b49), false);

  // The core valve is the brightest landmark and anchors both team color pools.
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.8, 0.35, 12), material(0x59645e, 0.4, 0.7));
  dais.position.y = 0.15; dais.castShadow = true; scene.add(dais);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.1, 8, 48), strip);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.38; scene.add(ring);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 2.8, 10), material(0xffa15c, 0.3, 0.55, 0xff4b20, 4.2));
  core.position.y = 1.8; core.castShadow = true; scene.add(core);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 8, 12), amber);
  wheel.position.y = 2.3; wheel.rotation.x = Math.PI / 2; scene.add(wheel);
  const coreLight = new THREE.PointLight(0xff6935, 40, 18, 1.6);
  coreLight.position.set(0, 3.2, 0); scene.add(coreLight);
  for (const x of [-2.9, 2.9]) box(x, 0.85, 0, 0.28, 1.7, 0.28, x < 0 ? amber : blue, false);

  // Broad fill keeps shaded geometry legible while team lights preserve the palette.
  scene.add(new THREE.HemisphereLight(0xe1f3ed, 0x4a5148, 2.8));
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const key = new THREE.DirectionalLight(0xffe0bb, 3.1);
  key.position.set(-8, 16, 10); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -26; key.shadow.camera.right = 26; key.shadow.camera.top = 34; key.shadow.camera.bottom = -34;
  scene.add(key);
  const pools = [
    [-15, 20, 0xff8b45], [15, -20, 0x36bcd4], [-15, -19, 0xff8944], [15, 20, 0x36c1d6],
    [-8, 3, 0xff984c], [8, -3, 0x43c9e3], [0, 0, 0xff7138]
  ];
  for (const [x, z, color] of pools) {
    const light = new THREE.PointLight(color, 34, 25, 1.6);
    light.position.set(x, 4.4, z); scene.add(light);
    box(x, 7.5, z, 0.5, 0.12, 2, material(color, 0.2, 0, color, 3.5), false);
  }

  spawns.push(
    { x: -3, z: 23, team: 0 }, { x: -15, z: 19, team: 0 }, { x: 13, z: 22, team: 0 },
    { x: 3, z: -23, team: 1 }, { x: 15, z: -19, team: 1 }, { x: -13, z: -22, team: 1 }
  );
  return { colliders, targets, spawns, objective: new THREE.Vector3(0, 0, 0) };
}
