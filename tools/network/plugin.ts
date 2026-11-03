import { randomUUID } from "node:crypto";
import type { Plugin } from "vite";
import { World } from "../../src/network/World.js";
import { PROTOCOL_VERSION } from "../../src/network/protocol.js";

export function networkPlugin(): Plugin {
  return { name: "local-network-lab", configureServer(server) {
    const world = new World();
    let previous = performance.now(), accumulated = 0;
    const timer = setInterval(() => {
      const now = performance.now();
      accumulated += Math.min(250, now - previous); previous = now;
      while (accumulated >= 50) { world.step(Date.now()); accumulated -= 50; }
    }, 10);
    server.httpServer?.once("close", () => clearInterval(timer));
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith("/api/network/")) return next();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      const reply = (code: number, value: unknown): void => { res.statusCode = code; res.end(JSON.stringify(value)); };
      const host = req.headers.host ?? "";
      if (!/^127\.0\.0\.1:\d+$/.test(host) || (req.headers.origin && req.headers.origin !== `http://${host}`)) {
        reply(403, { error: "loopback same-origin only" }); return;
      }
      try {
        const url = new URL(req.url, `http://${host}`);
        if (url.searchParams.get("v") !== String(PROTOCOL_VERSION)) { reply(409, { error: "protocol version mismatch" }); return; }
        const token = String(req.headers["x-lab-session"] ?? "");
        if (url.pathname === "/api/network/join" && req.method === "POST") {
          const resume = world.has(token) ? token : randomUUID();
          const entity = world.join(resume, randomUUID(), Date.now());
          reply(200, { token: resume, entity, version: PROTOCOL_VERSION }); return;
        }
        if (!world.has(token)) { reply(401, { error: "session expired" }); return; }
        if (url.pathname === "/api/network/leave" && req.method === "POST") {
          world.leave(token); reply(200, {}); return;
        }
        if (url.pathname === "/api/network/input" && req.method === "POST") {
          let body = "";
          for await (const chunk of req) {
            body += String(chunk);
            if (Buffer.byteLength(body) > 16_384) { reply(413, { error: "body too large" }); return; }
          }
          const inputs: unknown = JSON.parse(body);
          if (!Array.isArray(inputs)) throw new Error("expected input array");
          world.input(token, inputs, Date.now()); reply(200, {}); return;
        }
        if (url.pathname === "/api/network/snapshot" && req.method === "GET") {
          const radius = Number(url.searchParams.get("radius") ?? 200);
          const bots = Number(url.searchParams.get("bots") ?? 0);
          if (![15, 40, 200].includes(radius) || ![0, 50, 200].includes(bots)) throw new Error("invalid experiment parameters");
          reply(200, world.snapshot(token, Date.now(), radius, bots)); return;
        }
        reply(404, { error: "unknown endpoint" });
      } catch (error) { reply(400, { error: error instanceof Error ? error.message : "invalid request" }); }
    });
  } };
}
