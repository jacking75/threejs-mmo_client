import * as THREE from "three";
import { FaultLink } from "../../network/FaultLink";
import { interpolate, move, PROTOCOL_VERSION, reconcile } from "../../network/protocol";
import type { Entity, InputCommand, Position, Snapshot } from "../../network/protocol";
import { createTrainingSword } from "../../assets/equipment/createSword";
import { disposeObject } from "../shared/disposeObject";
import "./network.css";

export function startNetworkLab(): void {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) return;
  root.innerHTML = `<main class="network-lab"><header><h1>Network Client Lab</h1><p>로컬 서버 권한 · WASD 이동 · 청록: 내 예측 위치 / 금색: 서버 위치 / 보라: 다른 플레이어</p></header>
    <nav><button id="connect">접속 / 재접속</button><button id="disconnect">연결 끊기</button>
    <label>편도 지연 <select id="latency"><option>0</option><option>50</option><option>150</option><option>300</option></select> ms</label>
    <label><input id="faults" type="checkbox"> 손실·중복·순서 변경</label>
    <label><input id="prediction" type="checkbox" checked> 입력 예측</label>
    <label>관심 반경 <select id="radius"><option>200</option><option>40</option><option>15</option></select></label>
    <label>스냅샷 Hz <select id="hz"><option>20</option><option>10</option><option>5</option></select></label>
    <label>부하 객체 <select id="bots"><option>0</option><option>50</option><option>200</option></select></label></nav>
    <output id="network-status" aria-live="polite">접속 전</output><canvas tabindex="0" aria-label="네트워크 실습 필드"></canvas>
    <footer>두 브라우저에서 같은 주소를 열어 접속하세요. 부하 객체는 서버 스냅샷/렌더 비용 측정용입니다. <a href="/">오프라인 RPG</a></footer></main>`;
  const required = <T extends HTMLElement>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing ${selector}`);
    return element;
  };
  const canvas = required<HTMLCanvasElement>("canvas");
  const status = required<HTMLOutputElement>("output");
  const select = (id: string): number => Number(required<HTMLSelectElement>(`#${id}`).value);
  const checked = (id: string): boolean => required<HTMLInputElement>(`#${id}`).checked;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#101f2a");
  scene.add(new THREE.HemisphereLight(0xffffff, 0x586a76, 2));
  const grid = new THREE.GridHelper(200, 40, 0x4d7b82, 0x28434b); scene.add(grid);
  const camera = new THREE.PerspectiveCamera(55, 1, .1, 400);
  const actors = new Map<string, THREE.Group>();
  const marker = new THREE.Mesh(new THREE.TorusGeometry(.7, .07, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd87c }));
  marker.rotation.x = -Math.PI / 2; scene.add(marker);
  const outbound = new FaultLink<InputCommand[]>();
  const inbound = new FaultLink<Snapshot>();
  const keys = new Set<string>();
  let token = "", self = "", connected = false, generation = 0, joining = false;
  let pending: InputCommand[] = [], seq = 0, tick = -1;
  let predicted: Position = { x: 0, z: 0 };
  let latest: Snapshot | null = null, previous: Snapshot | null = null;
  let receivedAt = 0, sampleInterval = 50, pollAt = 0, polling = false;
  let bytes = 0, bytesWindow = 0, bandwidth = 0, meterAt = performance.now(), correction = 0;
  let lastFrame = performance.now(), frameMs = 0, frameId = 0;
  let message = "접속 전";
  const api = async (path: string, method = "GET", body?: unknown): Promise<unknown> => {
    const response = await fetch(`/api/network/${path}${path.includes("?") ? "&" : "?"}v=${PROTOCOL_VERSION}`, {
      method, headers: { "Content-Type": "application/json", "X-Lab-Session": token },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(3000),
    });
    const text = await response.text(); bytes += new TextEncoder().encode(text).length;
    if (!response.ok) throw new Error(response.status === 409 ? "프로토콜 버전 불일치: 새로고침 필요" : `연결 오류 ${response.status}`);
    return JSON.parse(text) as unknown;
  };
  const clearActors = (): void => { actors.forEach(actor => { scene.remove(actor); disposeObject(actor); }); actors.clear(); };
  const reset = (): void => {
    generation++; connected = false; keys.clear(); pending = []; outbound.clear(); inbound.clear();
    latest = previous = null; tick = -1; clearActors(); marker.visible = false;
  };
  const connect = async (): Promise<void> => {
    if (joining) return;
    joining = true; reset(); const epoch = generation;
    try {
      const result = await api("join", "POST") as { token: string; entity: Entity };
      if (epoch !== generation) return;
      token = result.token; self = result.entity.id; seq = result.entity.ack; predicted = { ...result.entity };
      connected = true; message = "연결됨"; pollAt = 0; canvas.focus();
    } catch (error) { message = String(error); } finally { joining = false; }
  };
  const disconnect = (): void => { reset(); message = "연결 끊김 · 재접속하면 전체 상태 복원"; void api("leave", "POST").catch(() => undefined); };
  required("#connect").addEventListener("click", () => { void connect(); });
  required("#disconnect").addEventListener("click", disconnect);
  const keyDown = (event: KeyboardEvent): void => {
    if (document.activeElement === canvas && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) { keys.add(event.code); event.preventDefault(); }
  };
  const keyUp = (event: KeyboardEvent): void => { keys.delete(event.code); };
  const blur = (): void => { keys.clear(); };
  window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp); window.addEventListener("blur", blur);
  const interval = setInterval(() => {
    if (!connected) return;
    if (pending.length >= 100) { disconnect(); message = "입력 확인 시간 초과 · 재접속 필요"; return; }
    const input = { seq: ++seq, x: Number(keys.has("KeyD")) - Number(keys.has("KeyA")), z: Number(keys.has("KeyS")) - Number(keys.has("KeyW")) };
    pending.push(input); predicted = move(predicted, input);
    outbound.send([...pending], performance.now(), select("latency"), checked("faults"));
  }, 50);

  const accept = (snapshot: Snapshot, now: number): void => {
    if (snapshot.version !== PROTOCOL_VERSION) { disconnect(); message = "프로토콜 버전 불일치"; return; }
    if (snapshot.tick <= tick) return;
    const own = snapshot.entities.find(entity => entity.id === self);
    if (!own) return;
    tick = snapshot.tick; previous = latest; latest = snapshot;
    sampleInterval = Math.max(50, now - receivedAt); receivedAt = now;
    pending = pending.filter(input => input.seq > own.ack);
    const corrected = reconcile(own, pending);
    correction = Math.hypot(corrected.x - predicted.x, corrected.z - predicted.z); predicted = corrected;
    const ids = new Set(snapshot.entities.map(e => e.id));
    for (const [id, actor] of actors) if (!ids.has(id)) { scene.remove(actor); disposeObject(actor); actors.delete(id); }
    for (const entity of snapshot.entities) if (!actors.has(entity.id)) {
      const actor = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(.35, .8, 4, 8), new THREE.MeshLambertMaterial({ color: entity.id === self ? 0x64dbc4 : 0xbda3ef }));
      body.position.y = 1; actor.add(body);
      const hand = new THREE.Group(); hand.name = "hand.R"; hand.position.set(.5, .8, 0);
      const sword = createTrainingSword(); sword.scale.setScalar(.35); hand.add(sword); actor.add(hand);
      scene.add(actor); actors.set(entity.id, actor);
    }
    marker.visible = true; marker.position.set(own.x, .1, own.z);
  };
  const frame = (now: number): void => {
    frameMs = frameMs * .9 + (now - lastFrame) * .1; lastFrame = now;
    const epoch = generation;
    if (connected) {
      for (const commands of outbound.drain(now)) void api("input", "POST", commands).catch(error => {
        if (epoch === generation) { reset(); message = String(error); }
      });
      if (!polling && now >= pollAt) {
        polling = true; pollAt = now + 1000 / select("hz");
        void api(`snapshot?radius=${select("radius")}&bots=${select("bots")}`).then(result => {
          if (epoch === generation) inbound.send(result as Snapshot, performance.now(), select("latency"), checked("faults"));
        }).catch(error => { if (epoch === generation) { reset(); message = String(error); } }).finally(() => { polling = false; });
      }
      for (const snapshot of inbound.drain(now)) accept(snapshot, now);
    }
    if (now - meterAt >= 1000) { bandwidth = (bytes - bytesWindow) / ((now - meterAt) / 1000); bytesWindow = bytes; meterAt = now; }
    for (const entity of latest?.entities ?? []) {
      const old = previous?.entities.find(e => e.id === entity.id) ?? entity;
      const position = entity.id === self && checked("prediction") ? predicted : interpolate(old, entity, (now - receivedAt) / sampleInterval);
      actors.get(entity.id)?.position.set(position.x, 0, position.z);
    }
    const target = actors.get(self)?.position ?? new THREE.Vector3();
    camera.position.set(target.x, 28, target.z + 32); camera.lookAt(target);
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * renderer.getPixelRatio()) || canvas.height !== Math.round(height * renderer.getPixelRatio())) {
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
    status.textContent = `${message} · tick ${tick} · 객체 ${actors.size} · 미확인 입력 ${pending.length} · 보정 ${correction.toFixed(3)}m · 수신 ${(bandwidth / 1024).toFixed(1)} KiB/s · 프레임 ${frameMs.toFixed(1)}ms`;
    root.dataset.connected = String(connected); root.dataset.entities = String(actors.size); root.dataset.self = self;
    root.dataset.x = predicted.x.toFixed(3); root.dataset.z = predicted.z.toFixed(3); root.dataset.tick = String(tick);
    root.dataset.displayX = (actors.get(self)?.position.x ?? 0).toFixed(3);
    root.dataset.serverX = marker.position.x.toFixed(3);
    root.dataset.correction = correction.toFixed(6);
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);
  window.addEventListener("pagehide", () => {
    void fetch(`/api/network/leave?v=${PROTOCOL_VERSION}`, { method: "POST", headers: { "X-Lab-Session": token }, keepalive: true });
    clearInterval(interval); cancelAnimationFrame(frameId); reset();
    window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); window.removeEventListener("blur", blur);
    disposeObject(scene); grid.geometry.dispose();
    (Array.isArray(grid.material) ? grid.material : [grid.material]).forEach(material => material.dispose()); renderer.dispose();
  }, { once: true });
}
