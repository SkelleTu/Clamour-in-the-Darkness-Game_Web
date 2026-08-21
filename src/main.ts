import * as THREE from 'three';
import './style.css';

type Weather = {
  conditionType?: string;
  description?: string;
  isDaytime?: boolean;
  temperatureC?: number | null;
  humidityPct?: number | null;
  windKph?: number | null;
  rainMm?: number | null;
  precipitationMm?: number | null;
  cloudCoverPct?: number | null;
};

type PositionState = { lat: number; lng: number; x: number; z: number; heading: number };

const SERVER = import.meta.env.VITE_UNIVERSAL_SERVER_URL || 'https://universal-server--charlesespurgeo.replit.app';
const API_KEY = import.meta.env.VITE_UNIVERSAL_SERVER_API_KEY || localStorage.getItem('clamour_api_key') || '';
const ARARAS = { lat: -22.3572, lng: -47.3841 };

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="hud">
    <div class="topbar">
      <div><strong>CLAMOUR</strong><span id="status">conectando...</span></div>
      <div id="clock">--:--:--</div>
    </div>
    <div id="streetview"></div>
    <div id="crosshair">+</div>
    <div class="vitals">
      <div class="meter"><span>VIDA</span><i id="healthBar"></i></div>
      <div class="meter"><span>STAMINA</span><i id="staminaBar"></i></div>
    </div>
    <div id="weather"></div>
    <div id="inventory"></div>
    <div id="prompt"></div>
    <div id="mobileControls" class="mobile-only">
      <button id="lookToggle">olhar</button>
      <button id="jumpBtn">pular</button>
      <button id="interactBtn">interagir</button>
    </div>
  </div>
  <div id="characterCreation" class="modal">
    <div class="panel">
      <div class="eyebrow">CLAMOUR IN THE DARKNESS</div>
      <h1>Onde você mora?</h1>
      <p>Na primeira entrada, informe o endereço da sua casa. O jogo começa ali. Depois disso, sua última posição fica salva.</p>
      <input id="homeAddress" placeholder="Rua, número, Araras - SP" autocomplete="street-address" />
      <div class="row"><button id="startBtn">Criar personagem e entrar</button></div>
      <small>Protótipo web nativo • mundo de Araras • Street View passivo</small>
    </div>
  </div>
  <div id="loading" class="overlay"><div>carregando mundo...</div></div>
`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 2000);
camera.position.set(0, 1.62, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.prepend(renderer.domElement);

const ambient = new THREE.HemisphereLight(0x8997b2, 0x17181d, 1.2);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffe9c8, 1.1);
sun.position.set(40, 60, 20);
scene.add(sun);

const player = new THREE.Object3D();
player.position.set(0, 0, 0);
scene.add(player);

const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.33, 1.1, 8, 16),
  new THREE.MeshStandardMaterial({ color: 0x8b9098, roughness: 0.8, metalness: 0.05 })
);
body.position.y = 0.9;
player.add(body);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(2500, 2500),
  new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
scene.add(ground);

const streetViewEl = document.querySelector<HTMLDivElement>('#streetview')!;
const statusEl = document.querySelector<HTMLSpanElement>('#status')!;
const weatherEl = document.querySelector<HTMLDivElement>('#weather')!;
const clockEl = document.querySelector<HTMLDivElement>('#clock')!;
const promptEl = document.querySelector<HTMLDivElement>('#prompt')!;
const healthEl = document.querySelector<HTMLElement>('#healthBar')!;
const staminaEl = document.querySelector<HTMLElement>('#staminaBar')!;
const inventoryEl = document.querySelector<HTMLDivElement>('#inventory')!;
const modal = document.querySelector<HTMLDivElement>('#characterCreation')!;
const loading = document.querySelector<HTMLDivElement>('#loading')!;
const addressInput = document.querySelector<HTMLInputElement>('#homeAddress')!;

let initialized = false;
let heading = 0;
let pitch = -2;
let last = performance.now();
let velocity = new THREE.Vector3();
let health = 100;
let stamina = 100;
let sprinting = false;
let jumpVelocity = 0;
let grounded = true;
let bob = 0;
let weather: Weather | null = null;
let currentPosition: PositionState = { ...ARARAS, x: 0, z: 0, heading: 0 };
let lastStreetRequest = 0;
let streetObjectUrl: string | null = null;
const keys = new Set<string>();
const inventory: string[] = [];
const pickups: THREE.Mesh[] = [];

function authHeaders(): HeadersInit {
  return API_KEY ? { 'x-api-key': API_KEY } : {};
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  Object.entries(authHeaders()).forEach(([k, v]) => headers.set(k, v));
  return fetch(`${SERVER}${path}`, { ...init, headers });
}

function showPrompt(text: string) {
  promptEl.textContent = text;
  promptEl.classList.toggle('visible', Boolean(text));
}

function updateHud() {
  healthEl.style.width = `${health}%`;
  staminaEl.style.width = `${stamina}%`;
  inventoryEl.textContent = inventory.length ? `inventário: ${inventory.join(', ')}` : 'inventário: vazio';
}

async function geocode(address: string) {
  const res = await api(`/api/game/google/geocode?address=${encodeURIComponent(address)}`);
  if (!res.ok) throw new Error('Não foi possível localizar o endereço.');
  const data = await res.json() as { results?: Array<{ geometry?: { location?: { lat: number; lng: number } }; formatted_address?: string }> };
  const first = data.results?.[0];
  if (!first?.geometry?.location) throw new Error('Endereço não encontrado.');
  return { ...first.geometry.location, formatted: first.formatted_address ?? address };
}

async function restoreState() {
  try {
    const id = localStorage.getItem('clamour_player_id');
    if (!id) return false;
    const res = await api(`/api/game/player-state/${encodeURIComponent(id)}`);
    if (!res.ok) return false;
    const data = await res.json() as { state?: PositionState & { homeAddress?: string } };
    if (!data.state) return false;
    currentPosition = { ...currentPosition, ...data.state };
    player.position.set(data.state.x ?? 0, 0, data.state.z ?? 0);
    heading = data.state.heading ?? 0;
    return true;
  } catch {
    return false;
  }
}

async function saveState() {
  const id = localStorage.getItem('clamour_player_id');
  if (!id) return;
  currentPosition.x = player.position.x;
  currentPosition.z = player.position.z;
  currentPosition.heading = heading;
  try {
    await api(`/api/game/player-state/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(currentPosition),
      keepalive: true,
    });
  } catch { /* persistence is best-effort */ }
}

async function createCharacter() {
  const address = addressInput.value.trim();
  if (!address) return showPrompt('Digite o endereço da casa.');
  showPrompt('localizando sua casa...');
  try {
    const geo = await geocode(address);
    const id = localStorage.getItem('clamour_player_id') || crypto.randomUUID();
    localStorage.setItem('clamour_player_id', id);
    localStorage.setItem('clamour_home_address', geo.formatted ?? address);
    currentPosition = { lat: geo.lat, lng: geo.lng, x: 0, z: 0, heading: 0 };
    await api(`/api/game/player-state/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...currentPosition, homeAddress: geo.formatted ?? address })
    });
    player.position.set(0, 0, 0);
    modal.classList.remove('visible');
    initialized = true;
    loading.classList.remove('visible');
    statusEl.textContent = 'online';
    await refreshStreetView(true);
    await refreshWeather();
  } catch (err) {
    showPrompt(err instanceof Error ? err.message : 'Erro ao criar personagem.');
  }
}

async function bootstrap() {
  const restored = await restoreState();
  initialized = true;
  modal.classList.toggle('visible', !restored);
  loading.classList.remove('visible');
  statusEl.textContent = API_KEY ? 'online' : 'modo local';
  updateHud();
  if (restored) {
    await refreshStreetView(true);
    await refreshWeather();
  }
}

async function refreshStreetView(force = false) {
  if (!initialized) return;
  const now = performance.now();
  if (!force && now - lastStreetRequest < 1200) return;
  lastStreetRequest = now;
  try {
    const metadataRes = await api(`/api/game/streetview/metadata?lat=${currentPosition.lat}&lng=${currentPosition.lng}&radius=70`);
    if (!metadataRes.ok) return;
    const meta = await metadataRes.json() as { data?: { pano?: string } };
    if (!meta.data?.pano) return;
    const imageRes = await api(`/api/game/streetview/image?lat=${currentPosition.lat}&lng=${currentPosition.lng}&heading=${heading}&pitch=${pitch}&fov=96&width=1024&height=640&radius=70`);
    if (!imageRes.ok) return;
    const blob = await imageRes.blob();
    const url = URL.createObjectURL(blob);
    if (streetObjectUrl) URL.revokeObjectURL(streetObjectUrl);
    streetObjectUrl = url;
    streetViewEl.style.backgroundImage = `url(${url})`;
    streetViewEl.classList.add('ready');
  } catch { /* keep previous frame */ }
}

async function refreshWeather() {
  try {
    const res = await api(`/api/game/weather/current?lat=${currentPosition.lat}&lng=${currentPosition.lng}`);
    if (!res.ok) return;
    const payload = await res.json() as { data?: Weather; serverTime?: string };
    weather = payload.data ?? null;
    if (weather) {
      const temp = weather.temperatureC == null ? '--' : `${weather.temperatureC.toFixed(1)}°C`;
      weatherEl.textContent = `${weather.description ?? weather.conditionType ?? 'clima'} • ${temp}`;
    }
    const serverTime = payload.serverTime ? new Date(payload.serverTime) : new Date();
    clockEl.textContent = serverTime.toLocaleTimeString('pt-BR');
    const day = Boolean(weather?.isDaytime);
    scene.background = new THREE.Color(day ? 0x171a21 : 0x03040a);
    ambient.intensity = day ? 1.25 : 0.45;
    sun.intensity = day ? 1.15 : 0.05;
  } catch { /* offline */ }
}

function spawnPickup() {
  const obj = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.25, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xb7a36b, emissive: 0x241b06, emissiveIntensity: 0.4 })
  );
  obj.position.copy(player.position).add(new THREE.Vector3(0.8, 0.15, -1.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), heading * Math.PI / 180));
  scene.add(obj);
  pickups.push(obj);
}

function interact() {
  let nearest: THREE.Mesh | null = null;
  let dist = Infinity;
  for (const obj of pickups) {
    const d = obj.position.distanceTo(player.position);
    if (d < dist) { dist = d; nearest = obj; }
  }
  if (nearest && dist < 2.2) {
    inventory.push('objeto');
    scene.remove(nearest);
    pickups.splice(pickups.indexOf(nearest), 1);
    updateHud();
    showPrompt('objeto guardado');
    setTimeout(() => showPrompt(''), 1000);
  }
}

function triggerHorror() {
  const ghost = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.24, 1.4, 8, 12),
    new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.92 })
  );
  const fwd = new THREE.Vector3(0, 0, -7).applyAxisAngle(new THREE.Vector3(0,1,0), heading * Math.PI / 180);
  ghost.position.copy(player.position).add(fwd);
  ghost.position.y = 1.05;
  scene.add(ghost);
  showPrompt('alguma coisa está observando...');
  document.body.classList.add('horror');
  setTimeout(() => {
    scene.remove(ghost);
    document.body.classList.remove('horror');
    showPrompt('');
  }, 2600);
}

function updateMovement(dt: number) {
  const input = new THREE.Vector2(
    (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
    (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0)
  );
  if (input.lengthSq() > 1) input.normalize();
  sprinting = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && input.lengthSq() > 0.01 && stamina > 1;
  const speed = sprinting ? 6.2 : 3.8;
  const target = new THREE.Vector3(input.x, 0, -input.y).applyAxisAngle(new THREE.Vector3(0,1,0), heading * Math.PI / 180).multiplyScalar(speed);
  velocity.x = THREE.MathUtils.damp(velocity.x, target.x, 18, dt);
  velocity.z = THREE.MathUtils.damp(velocity.z, target.z, 18, dt);
  if (sprinting) stamina = Math.max(0, stamina - 20 * dt);
  else stamina = Math.min(100, stamina + 12 * dt);
  if (keys.has('Space') && grounded) { jumpVelocity = 6.2; grounded = false; }
  jumpVelocity -= 24 * dt;
  player.position.x += velocity.x * dt;
  player.position.z += velocity.z * dt;
  player.position.y += jumpVelocity * dt;
  if (player.position.y <= 0) { player.position.y = 0; jumpVelocity = 0; grounded = true; }
  const moveSpeed = Math.hypot(velocity.x, velocity.z);
  if (moveSpeed > 0.2 && grounded) bob += dt * (sprinting ? 10.5 : 7);
  const bobY = moveSpeed > 0.2 && grounded ? Math.abs(Math.cos(bob)) * (sprinting ? 0.035 : 0.018) : 0;
  camera.position.copy(player.position).add(new THREE.Vector3(0, 1.62 + bobY, 0));
  camera.rotation.order = 'YXZ';
  camera.rotation.y = -heading * Math.PI / 180;
  camera.rotation.x = -pitch * Math.PI / 180;
}

function onPointerMove(e: PointerEvent) {
  if (!initialized || modal.classList.contains('visible')) return;
  if (document.pointerLockElement === renderer.domElement || e.buttons === 1) {
    heading -= e.movementX * 0.075;
    pitch = THREE.MathUtils.clamp(pitch + e.movementY * 0.075, -78, 82);
    currentPosition.heading = heading;
    void refreshStreetView();
  }
}

window.addEventListener('keydown', e => {
  keys.add(e.code);
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyF') spawnPickup();
  if (e.code === 'KeyH') triggerHorror();
  if (e.code === 'Escape') document.exitPointerLock();
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('click', () => renderer.domElement.requestPointerLock?.());
document.querySelector('#startBtn')?.addEventListener('click', () => void createCharacter());
document.querySelector('#jumpBtn')?.addEventListener('click', () => keys.add('Space'));
document.querySelector('#interactBtn')?.addEventListener('click', interact);
setInterval(() => void saveState(), 8000);
setInterval(() => void refreshWeather(), 60000);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (initialized) updateMovement(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

void bootstrap();
requestAnimationFrame(tick);
