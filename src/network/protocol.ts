export const PROTOCOL_VERSION = 1;
export const TICK_SECONDS = 0.05;
export const SPEED = 6;
export interface Position { x: number; z: number }
export interface InputCommand { seq: number; x: number; z: number }
export interface Entity extends Position { id: string; ack: number; weapon: "training-sword" }
export interface Snapshot { version: number; tick: number; self: string; entities: Entity[] }

// One input represents exactly one server tick. The client cannot choose speed or dt.
export function move(position: Position, input: InputCommand): Position {
  const length = Math.max(1, Math.hypot(input.x, input.z));
  const clamp = (v: number): number => Math.max(-100, Math.min(100, v));
  return { x: clamp(position.x + input.x / length * SPEED * TICK_SECONDS), z: clamp(position.z + input.z / length * SPEED * TICK_SECONDS) };
}

export function validInput(input: unknown): input is InputCommand {
  if (!input || typeof input !== "object") return false;
  const value = input as InputCommand;
  return Number.isSafeInteger(value.seq) && value.seq > 0 &&
    Number.isFinite(value.x) && Number.isFinite(value.z) && Math.abs(value.x) <= 1 && Math.abs(value.z) <= 1;
}

export function reconcile(authoritative: Entity, pending: readonly InputCommand[]): Position {
  return pending.filter(input => input.seq > authoritative.ack).reduce(move, authoritative);
}

export function interpolate(a: Position, b: Position, alpha: number): Position {
  const t = Math.max(0, Math.min(1, alpha));
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}
