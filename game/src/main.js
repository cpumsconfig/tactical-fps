import * as THREE from 'three';
import { rng } from './palette.js';
import { buildWorld } from './world.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { Weapon, catalog } from './weapon.js';
import { HUD } from './hud.js';

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
const random = rng(Number(query.get('seed') || 1));
const root = document.querySelector('#game');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.08, 140);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
root.appendChild(renderer.domElement);

const world = buildWorld(scene);
const input = new Input(renderer.domElement);
const player = new Player(camera);
const weapon = new Weapon(camera, scene);
const hud = new HUD();
scene.add(camera);

const ray = new THREE.Raycaster();
let bots = [], tracers = [], score = [0, 0], money = 800, round = 1;
let phase = 'buy', phaseTime = 12, time = 105, buyOpen = false;
let hit = 0, toast = '', objectiveState = 'safe', objectTimer = 0;
let accumulator = 0, last = 0, shotFrames = 0;
const fixed = 1 / 60;

function makeBot(team, index) {
  const color = team ? 0x51d6f2 : 0xff9750;
  const bodyMat = new THREE.MeshStandardMaterial({
    color, roughness: 0.48, metalness: 0.14, emissive: color, emissiveIntensity: 0.42
  });
  const outlineMat = new THREE.MeshBasicMaterial({ color: team ? 0x9cf4ff : 0xffd08b, side: THREE.BackSide });
  const root = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.65, 4, 8), bodyMat);
  torso.position.y = 1.1;
  torso.castShadow = true;
  const outline = new THREE.Mesh(new THREE.CapsuleGeometry(0.39, 0.69, 4, 8), outlineMat);
  outline.position.copy(torso.position);
  root.add(outline, torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), bodyMat);
  head.position.y = 1.7;
  const headOutline = new THREE.Mesh(new THREE.SphereGeometry(0.255, 12, 10), outlineMat);
  headOutline.position.copy(head.position);
  root.add(headOutline, head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: team ? 0x9cf4ff : 0xffd08b }));
  visor.position.set(0, 1.72, -0.2);
  root.add(visor);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.2), bodyMat);
  pack.position.set(0, 1.1, 0.25);
  root.add(pack);
  // Bright shoulder bars keep the silhouettes readable against either zone.
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.24), new THREE.MeshBasicMaterial({ color }));
    shoulder.position.set(side * 0.39, 1.35, 0);
    root.add(shoulder);
  }
  scene.add(root);
  const spawn = world.spawns[(team * 3 + index) % world.spawns.length];
  root.position.set(spawn.x, 0, spawn.z);
  return { root, team, hp: 100, alive: true, cool: 0.4 + random(), strife: random() * 5, cover: world.colliders[index % world.colliders.length] };
}

function spawnTeams() {
  bots.forEach(bot => scene.remove(bot.root));
  bots = [];
  for (let i = 0; i < 3; i++) bots.push(makeBot(0, i), makeBot(1, i));
}

function aimDir() {
  return new THREE.Vector3(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch));
}

function trace(from, to, color = 0xffd69d, duration = 0.09) {
  const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1 });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  tracers.push({ line, life: duration, duration });
}

function hitShot() {
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  ray.far = 80;
  const meshes = [];
  for (const bot of bots) if (bot.alive) for (const mesh of bot.root.children) {
    mesh.userData.bot = bot;
    meshes.push(mesh);
  }
  const hits = ray.intersectObjects(meshes, false);
  const end = hits[0]?.point || ray.ray.origin.clone().addScaledVector(ray.ray.direction, 38);
  trace(camera.position.clone().addScaledVector(ray.ray.direction, 0.6), end);
  if (hits[0]) {
    const bot = hits[0].object.userData.bot;
    bot.hp -= weapon.def.damage;
    hit = 0.12;
    if (bot.hp <= 0) { bot.alive = false; bot.root.visible = false; toast = 'OPERATOR DOWN'; }
  }
}

function fire() {
  if (phase !== 'combat' || !input.locked || !weapon.fire()) return;
  player.addRecoil(weapon.def.recoil);
  hitShot();
}

window.addEventListener('mousedown', () => { if (input.locked) fire(); });
window.addEventListener('keydown', event => {
  if (event.code === 'KeyR') weapon.reload();
  if (event.code === 'KeyB' && phase === 'buy') buyOpen = !buyOpen;
});
hud.onDeploy = () => { if (!shot) input.lock(); };
hud.onBuy = index => {
  const item = catalog[index];
  if (money >= item.price) { money -= item.price; weapon.set(item); toast = `${item.name.toUpperCase()} ISSUED`; }
};

function startCombat() {
  phase = 'combat'; phaseTime = 0; time = 105; buyOpen = false; spawnTeams();
  player.health = 100; player.pos.set(-4, 1.7, 22); objectiveState = 'safe'; objectTimer = 0;
}

function nextRound(winner) {
  score[winner]++; money += winner === 0 ? 1800 : 1200; phase = 'result'; phaseTime = 4;
  toast = winner === 0 ? 'AMBER LINE HOLDS' : 'COBALT LINE TAKES THE VALVE';
}

function botStep(dt) {
  for (const bot of bots) {
    if (!bot.alive) continue;
    bot.cool -= dt;
    const target = bot.team === 0 ? new THREE.Vector3(0, 0, 0) : player.pos.clone();
    const delta = target.sub(bot.root.position); delta.y = 0;
    if (delta.length() > 5) {
      delta.normalize();
      bot.root.position.addScaledVector(delta, dt * (bot.team === 0 ? 1.65 : 1.9));
      bot.root.rotation.y = Math.atan2(delta.x, delta.z);
    }
    if (bot.cool <= 0) {
      bot.cool = 1.1 + random() * 1.5;
      if (bot.root.position.distanceTo(player.pos) < 24 && random() < 0.62) {
        const from = bot.root.position.clone().add(new THREE.Vector3(0, 1.6, 0));
        const to = player.pos.clone().add(new THREE.Vector3(0, 1, 0));
        trace(from, to, bot.team ? 0x74e5ee : 0xffaa68);
        if (from.distanceTo(to) < 18 && random() < 0.22) player.health = Math.max(0, player.health - 9);
      }
    }
  }
}

function fixedUpdate(dt) {
  if (phase === 'buy') {
    phaseTime -= dt;
    if (phaseTime <= 0) startCombat();
  } else if (phase === 'combat') {
    time -= dt;
    if (input.locked) player.update(dt, input, world.colliders);
    weapon.update(dt); botStep(dt);
    const nearAlly = bots.some(b => b.alive && b.team === 0 && b.root.position.distanceTo(world.objective) < 4);
    const nearEnemy = bots.some(b => b.alive && b.team === 1 && b.root.position.distanceTo(world.objective) < 4);
    if (nearEnemy && !nearAlly) { objectTimer += dt; if (objectTimer > 5) objectiveState = 'armed'; }
    else if (nearAlly && objectiveState === 'armed') { objectTimer -= dt; if (objectTimer < 0) objectiveState = 'secured'; }
    if (objectiveState === 'armed' && objectTimer > 20) nextRound(1);
    const aliveA = bots.some(b => b.alive && b.team === 0), aliveB = bots.some(b => b.alive && b.team === 1);
    if (!aliveB) nextRound(0); else if (!aliveA || player.health <= 0) nextRound(1); else if (time <= 0) nextRound(0);
  } else if (phase === 'result') {
    phaseTime -= dt;
    if (phaseTime <= 0) { round++; phase = 'buy'; phaseTime = 18; time = 105; objectiveState = 'safe'; bots = []; weapon.set(catalog[0]); money += 500; }
  }
  for (const tracer of tracers) {
    tracer.life -= dt;
    tracer.line.material.opacity = Math.max(0, tracer.life / tracer.duration);
  }
  tracers = tracers.filter(tracer => {
    if (tracer.life > 0) return true;
    scene.remove(tracer.line); tracer.line.geometry.dispose(); tracer.line.material.dispose(); return false;
  });
  hit = Math.max(0, hit - dt);
}

function setShotCamera(position, yaw, pitch = 0) {
  player.pos.set(position[0], 1.7, position[2]);
  player.yaw = yaw; player.pitch = pitch;
  camera.position.set(position[0], 1.7, position[2]);
  camera.rotation.order = 'YXZ';
  camera.rotation.set(pitch, yaw, 0);
}

function stageShot() {
  if (shot === 'start') {
    phase = 'buy'; phaseTime = 14; round = 1;
    setShotCamera([-4, 0, 17], 0.08, -0.08);
    hud.setMode('start');
  } else if (shot === 'play') {
    phase = 'combat'; time = 61; round = 3; score = [2, 1]; money = 2450;
    setShotCamera([0, 0, 16], 0, -0.08);
    player.health = 76; weapon.set(catalog[1]); weapon.mag = 17;
    spawnTeams();
    // Dedicated staged positions place the opposing team inside the first-person sightline.
    const enemies = bots.filter(bot => bot.team === 1);
    enemies.forEach((bot, index) => {
      bot.root.position.set([-4, 0, 4][index], 0, [1, -3, -8][index]);
      bot.root.rotation.y = 0; bot.cool = 1e6;
    });
    bots.filter(bot => bot.team === 0).forEach((bot, index) => {
      bot.root.position.set(index === 0 ? 7 : -7, 0, 9 - index * 2);
      bot.root.rotation.y = 0;
    });
    const target = enemies[0].root.position.clone().add(new THREE.Vector3(0, 1.35, 0));
    trace(camera.position.clone().add(new THREE.Vector3(0.15, -0.12, -0.4)), target, 0xffedaa, 0.7);
    weapon.mag--; weapon.flash = 0.7; weapon.model.userData.muzzle.visible = true;
    hud.setMode('play');
  } else if (shot === 'end') {
    phase = 'result'; phaseTime = 4; round = 5; score = [4, 2]; money = 3900;
    setShotCamera([0, 0, 18], 0, -0.075);
    player.health = 100;
    spawnTeams();
    bots.forEach((bot, index) => {
      bot.root.position.set([-8, -2.8, 3, 8, -6, 6][index], 0, [-5, -8, -3, -7, -15, -13][index]);
      bot.root.rotation.y = 0;
      if (index === 1 || index === 4) { bot.root.rotation.x = -1.2; bot.root.position.y = 0.28; }
    });
    hud.setMode('end');
  } else {
    phase = 'buy'; phaseTime = 14; setShotCamera([-4, 0, 17], 0.08, -0.08); hud.setMode('start');
  }
}

stageShot();
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
});
window.addEventListener('keydown', event => { if (event.code === 'Space' && input.locked) player.pos.y = 1.7; });

function frame(now) {
  if (!last) last = now;
  const delta = Math.min(0.05, (now - last) / 1000); last = now;
  if (!shot) { accumulator += delta; while (accumulator >= fixed) { fixedUpdate(fixed); accumulator -= fixed; } }
  else { weapon.update(1 / 60); }
  renderer.render(scene, camera);
  hud.update({ player, weapon, round, score, money, phase, phaseTime, time, buyOpen, hit, toast, objectiveState });
  if (shot && ++shotFrames >= 2) window.__shotReady = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
