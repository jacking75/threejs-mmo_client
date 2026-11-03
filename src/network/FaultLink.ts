/** Deterministic in-memory packet scheduler: latency, reordering, loss and duplication. */
export class FaultLink<T> {
  private packets: { at: number; payload: T }[] = [];
  private sequence = 0;
  public send(payload: T, now: number, latency: number, faults: boolean): void {
    const n = ++this.sequence;
    if (faults && n % 7 === 0) return;
    const at = now + latency + (faults && n % 3 === 0 ? latency : 0);
    this.packets.push({ at, payload });
    if (faults && n % 5 === 0) this.packets.push({ at: at + 10, payload });
  }
  public drain(now: number): T[] {
    const ready = this.packets.filter(p => p.at <= now).sort((a, b) => a.at - b.at);
    this.packets = this.packets.filter(p => p.at > now);
    return ready.map(p => p.payload);
  }
  public clear(): void { this.packets = []; }
}
