import { addSseClient, getSnapshot, getStats, getTargetYear, pollLoop, removeSseClient } from "./snapshot.ts";
import { file } from "bun";
import { join, resolve, normalize } from "node:path";
import { existsSync } from "node:fs";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const STATIC_ROOT = resolve(process.cwd(), "web/dist");
const encoder = new TextEncoder();

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function serveStatic(pathname: string): Promise<Response> {
  let p = pathname;
  if (p === "/") p = "/index.html";
  // Prevent path traversal
  const normalized = normalize(p);
  if (normalized.startsWith("..") || normalized.includes("\0")) {
    return new Response("Bad request", { status: 400 });
  }
  const fullPath = join(STATIC_ROOT, normalized);
  if (!fullPath.startsWith(STATIC_ROOT)) {
    return new Response("Bad request", { status: 400 });
  }
  if (!existsSync(fullPath)) {
    // SPA fallback: serve index.html for unknown routes (no API hit)
    const indexPath = join(STATIC_ROOT, "index.html");
    if (existsSync(indexPath)) {
      return new Response(file(indexPath), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return new Response("Not found", { status: 404 });
  }
  return new Response(file(fullPath));
}

function sseStream(): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));
      addSseClient(controller);
      const ka = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ka\n\n"));
        } catch {
          clearInterval(ka);
        }
      }, 25000);
      // attach cleanup hook to controller (closure)
      (controller as unknown as { _ka: ReturnType<typeof setInterval> })._ka = ka;
    },
    cancel(controller) {
      const ctrl = controller as unknown as { _ka?: ReturnType<typeof setInterval> };
      if (ctrl._ka) clearInterval(ctrl._ka);
      removeSseClient(controller as unknown as ReadableStreamDefaultController<Uint8Array>);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

const TARGET_YEAR = getTargetYear();

const server = Bun.serve({
  port: PORT,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/healthz") {
      return jsonResponse(getStats());
    }

    const apiMatch = path.match(/^\/api\/champs\/(\d+)(\/stream)?$/);
    if (apiMatch) {
      const year = parseInt(apiMatch[1] as string, 10);
      const isStream = !!apiMatch[2];
      if (year !== TARGET_YEAR) return new Response("Not found", { status: 404 });
      if (isStream) return sseStream();
      const snap = getSnapshot();
      if (!snap) return jsonResponse({ error: "snapshot not ready" }, 503);
      return jsonResponse(snap);
    }

    return serveStatic(path);
  },
});

console.log(`frc-champs-brackets listening on :${server.port}, year=${TARGET_YEAR}`);
pollLoop();
