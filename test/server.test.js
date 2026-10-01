// Runs server.js against a fake Claude API to check the request we send
// and how replies and errors come back to the game.

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";

function fakeClaude(handler) {
  const seen = [];
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const entry = { url: req.url, headers: req.headers, body: JSON.parse(body || "{}") };
    seen.push(entry);
    const [status, reply] = handler(entry, seen.length);
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(reply));
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r({ server, seen, port: server.address().port })));
}

const message = (text, stop = "end_turn") => ({
  id: "msg_1",
  type: "message",
  role: "assistant",
  model: "claude-opus-5-5",
  content: [{ type: "text", text }],
  stop_reason: stop,
  usage: { input_tokens: 10, output_tokens: 10 },
});

async function startGame(apiPort, gamePort) {
  const child = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, ANTHROPIC_API_KEY: "test-key", ANTHROPIC_BASE_URL: `http://127.0.0.1:${apiPort}`, PORT: String(gamePort), HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  while (!out.includes("running at")) await once(child.stdout, "data");
  return { child, log: () => out };
}

const post = (port, body) =>
  fetch(`http://127.0.0.1:${port}/api/ai`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const spark = { task: "spark", payload: { writerName: "Leo", context: "a dragon story", draft: "" } };

test("server sends a structured-output request with fallbacks and returns parsed JSON", async () => {
  const api = await fakeClaude(() => [200, message(JSON.stringify({ sparks: ["What if?", "How?", "Why?"] }))]);
  const game = await startGame(api.port, 3911);
  try {
    const status = await (await fetch("http://127.0.0.1:3911/api/status")).json();
    assert.equal(status.live, true);

    const res = await post(3911, spark);
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).sparks, ["What if?", "How?", "Why?"]);

    const req = api.seen[0];
    assert.match(req.url, /\/v1\/messages/);
    assert.equal(req.body.model, "claude-opus-5-5");
    assert.equal(req.body.fallbacks, "default");
    assert.match(req.headers["anthropic-beta"], /server-side-fallback-2026-07-01/);
    assert.equal(req.body.output_config.format.type, "json_schema");
    assert.equal(req.body.output_config.effort, "low");
    assert.ok(req.body.system[0].text.includes("Sparky"));
    assert.equal(req.body.thinking, undefined);

    const bad = await post(3911, { task: "constructor", payload: {} });
    assert.equal(bad.status, 400);
  } finally {
    game.child.kill();
    api.server.close();
  }
});

test("server retries without fallbacks if the account rejects them, and maps refusals", async () => {
  const api = await fakeClaude((req, n) => {
    if (req.body.fallbacks) return [400, { type: "error", error: { type: "invalid_request_error", message: "fallbacks not enabled" } }];
    if (n === 2) return [200, message(JSON.stringify({ sparks: ["a", "b", "c"] }))];
    return [200, message("", "refusal")];
  });
  const game = await startGame(api.port, 3912);
  try {
    const ok = await post(3912, spark);
    assert.equal(ok.status, 200);
    assert.equal(api.seen.length, 2);
    assert.equal(api.seen[1].body.fallbacks, undefined);

    const refused = await post(3912, spark);
    assert.equal(refused.status, 422);
    assert.equal((await refused.json()).code, "refused");
    assert.equal(api.seen.length, 3, "no fallback attempt after it was rejected once");
  } finally {
    game.child.kill();
    api.server.close();
  }
});
