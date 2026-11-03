import { move, validInput, PROTOCOL_VERSION } from "./protocol.js";
import type { Entity, InputCommand, Snapshot } from "./protocol.js";

interface Session { entity: Entity; queue: Map<number, InputCommand>; seen: number; connected: boolean }

/** Authoritative simulation shared by the real local host and deterministic transport tests. */
export class World {
  public tick = 0;
  private readonly sessions = new Map<string, Session>();

  public join(token: string, id: string, now: number): Entity {
    const existing = this.sessions.get(token);
    if (existing) { existing.connected = true; existing.seen = now; return { ...existing.entity }; }
    if (this.sessions.size >= 64) throw new Error("session capacity");
    const entity: Entity = { id, x: 0, z: 0, ack: 0, weapon: "training-sword" };
    this.sessions.set(token, { entity, queue: new Map(), seen: now, connected: true });
    return { ...entity };
  }

  public has(token: string): boolean { return this.sessions.has(token); }
  public leave(token: string): void {
    const session = this.sessions.get(token);
    if (session) { session.connected = false; session.queue.clear(); }
  }

  public input(token: string, commands: unknown[], now: number): void {
    const session = this.session(token, now);
    if (commands.length > 120) throw new Error("input batch too large");
    for (const input of commands) {
      if (!validInput(input)) throw new Error("invalid input");
      if (input.seq > session.entity.ack && input.seq <= session.entity.ack + 120) {
        session.queue.set(input.seq, input); // duplicate packets replace, never multiply movement
      }
    }
  }

  public step(now: number): void {
    this.tick++;
    for (const [token, session] of this.sessions) {
      if (now - session.seen > 30_000) { this.sessions.delete(token); continue; }
      if (now - session.seen > 3_000) this.leave(token);
      if (!session.connected) continue;
      const next = session.queue.get(session.entity.ack + 1);
      if (next) {
        Object.assign(session.entity, move(session.entity, next), { ack: next.seq });
        session.queue.delete(next.seq);
      }
    }
  }

  public snapshot(token: string, now: number, radius = 200, bots = 0): Snapshot {
    const own = this.session(token, now).entity;
    const entities = [...this.sessions.values()].filter(s => s.connected).map(s => s.entity);
    for (let i = 0; i < bots; i++) {
      entities.push({ id: `bot-${i}`, x: (i % 20) * 9 - 85, z: Math.floor(i / 20) * 9 - 40, ack: 0, weapon: "training-sword" });
    }
    return { version: PROTOCOL_VERSION, tick: this.tick, self: own.id,
      entities: entities.filter(e => e.id === own.id || Math.hypot(e.x - own.x, e.z - own.z) <= radius).map(e => ({ ...e })) };
  }

  private session(token: string, now: number): Session {
    const session = this.sessions.get(token);
    if (!session || !session.connected) throw new Error("session expired; reconnect");
    session.seen = now;
    return session;
  }
}
