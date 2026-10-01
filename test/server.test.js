// Runs server.js against a fake OpenAI API to check the requests we send
// and how replies and errors come back to the game.

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";

function fakeOpenAI(handler) {
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

// A Responses API reply carrying one output_text (or a refusal).
const response = (text, { status = "completed", refusal = false } = {}) => ({
  id: "resp_1",
  object: "response",
  model: "gpt-6.1-sol",
  status,
  incomplete_details: status === "incomplete" ? { reason: "max_output_tokens" } : null,
  output: [
    { type: "reasoning", id: "rs_1", summary: [] },
    {
      type: "message",
      id: "msg_1",
      role: "assistant",
      status: "completed",
      content: [refusal ? { type: "refusal", refusal: "I can't help with that." } : { type: "output_text", text, annotations: [] }],
    },
  ],
  usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 },
});

const post = (port, body) =>
  fetch(`http://127.0.0.1:${port}/api/ai`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const spark = { task: "spark", payload: { writerName: "Leo", context: "a dragon story", draft: "" } };

async function startServer(fakePort, gamePort, extraEnv = {}) {
  const child = spawn(process.execPath, ["server.js"], {
    env: {
      ...process.env,
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: `http://127.0.0.1:${fakePort}/v1`,
      PORT: String(gamePort),
      HOST: "127.0.0.1",
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  while (!out.includes("running at")) await once(child.stdout, "data");
  return child;
}

const paintReq = (port, creature) =>
  fetch(`http://127.0.0.1:${port}/api/paint`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ creature }) });

test("story tasks go to gpt-6.1-sol with Light (low) thinking and a strict schema", async () => {
  const api = await fakeOpenAI(() => [200, response(JSON.stringify({ sparks: ["What if?", "How?", "Why?"] }))]);
  const game = await startServer(api.port, 3911);
  try {
    const status = await (await fetch("http://127.0.0.1:3911/api/status")).json();
    assert.deepEqual([status.live, status.paint, status.voice, status.model], [true, true, true, "gpt-6.1-sol"]);

    const res = await post(3911, spark);
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).sparks, ["What if?", "How?", "Why?"]);

    const req = api.seen[0];
    assert.match(req.url, /\/v1\/responses$/);
    assert.equal(req.headers.authorization, "Bearer test-key");
    assert.equal(req.body.model, "gpt-6.1-sol");
    assert.deepEqual(req.body.reasoning, { effort: "low" });
    assert.equal(req.body.store, false);
    assert.equal(req.body.text.format.type, "json_schema");
    assert.equal(req.body.text.format.strict, true);
    assert.equal(req.body.text.format.name, "spark");
    assert.ok(req.body.instructions.includes("Sparky"));
    assert.match(req.body.input, /TASK:/);

    const bad = await post(3911, { task: "constructor", payload: {} });
    assert.equal(bad.status, 400);
  } finally {
    game.kill();
    api.server.close();
  }
});

test("refusals, cut-off replies, and bad keys come back as friendly codes", async () => {
  const replies = [
    [200, response("", { refusal: true })],
    [200, response('{"sparks": ["What', { status: "incomplete" })],
    [401, { error: { message: "Incorrect API key provided", type: "invalid_request_error", code: "invalid_api_key" } }],
  ];
  const api = await fakeOpenAI((_, n) => replies[n - 1]);
  const game = await startServer(api.port, 3912);
  try {
    const refused = await post(3912, spark);
    assert.equal(refused.status, 422);
    assert.equal((await refused.json()).code, "refused");
    const cut = await post(3912, spark);
    assert.equal(cut.status, 502);
    const key = await post(3912, spark);
    assert.equal(key.status, 401);
    assert.equal((await key.json()).code, "not_granted");
  } finally {
    game.kill();
    api.server.close();
  }
});

test("paint endpoint asks the image model for one opaque jpeg and enforces the daily cap", async () => {
  const api = await fakeOpenAI(() => [200, { created: 1, data: [{ b64_json: "AAAA" }] }]);
  const game = await startServer(api.port, 3913, { PAINTS_PER_DAY: "2" });
  try {
    const status = await (await fetch("http://127.0.0.1:3913/api/status")).json();
    assert.equal(status.paint, true);

    const res = await paintReq(3913, { name: "Zapzilla", description: "A giant purple monster with wings.", habitat: "a volcano" });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).image, "data:image/jpeg;base64,AAAA");
    const req = api.seen[0];
    assert.match(req.url, /\/v1\/images\/generations/);
    assert.equal(req.body.model, "gpt-image-2.5-flare");
    assert.equal(req.body.output_format, "jpeg");
    assert.equal(req.body.n, 1);
    assert.ok(req.body.prompt.includes("A giant purple monster with wings."));

    assert.equal((await paintReq(3913, { description: "" })).status, 400);
    assert.equal((await paintReq(3913, { description: "a blob" })).status, 200);
    const capped = await paintReq(3913, { description: "a third blob" });
    assert.equal(capped.status, 429);
    assert.equal((await capped.json()).code, "paint_limit");
  } finally {
    game.kill();
    api.server.close();
  }
});

test("paint endpoint maps a moderation block to a friendly refusal and doesn't count it", async () => {
  const api = await fakeOpenAI(() => [400, { error: { message: "Your request was rejected by the safety system.", type: "image_generation_user_error", code: "moderation_blocked" } }]);
  const game = await startServer(api.port, 3914, { PAINTS_PER_DAY: "1" });
  try {
    for (let i = 0; i < 2; i++) {
      const res = await paintReq(3914, { description: "something" });
      assert.equal(res.status, 400);
      assert.equal((await res.json()).code, "refused");
    }
  } finally {
    game.kill();
    api.server.close();
  }
});

test("voice endpoint mints a short-lived realtime key with the coaching instructions", async () => {
  const api = await fakeOpenAI(() => [200, { value: "ek_test", expires_at: 1 }]);
  const game = await startServer(api.port, 3915, { VOICE_SESSIONS_PER_DAY: "1" });
  try {
    const status = await (await fetch("http://127.0.0.1:3915/api/status")).json();
    assert.equal(status.voice, true);
    const post = (body) => fetch("http://127.0.0.1:3915/api/voice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    assert.equal((await post({})).status, 400);
    const res = await post({ ctx: { writerName: "Leo", where: "Story Quest part 1", draft: "Fire Godzilla came from the ground." } });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).value, "ek_test");
    const req = api.seen[0];
    assert.match(req.url, /\/v1\/realtime\/client_secrets/);
    assert.equal(req.body.session.model, "gpt-realtime-2.1");
    assert.equal(req.body.session.audio.input.turn_detection.type, "semantic_vad");
    assert.match(req.body.session.instructions, /Fire Godzilla came from the ground/);
    assert.ok(req.body.expires_after.seconds <= 600);
    const capped = await post({ ctx: { where: "x" } });
    assert.equal(capped.status, 429);
    assert.equal((await capped.json()).code, "voice_limit");
  } finally {
    game.kill();
    api.server.close();
  }
});

test("speech endpoint reads text aloud with the storyteller voice and returns mp3", async () => {
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    server.seen = { url: req.url, body: JSON.parse(body) };
    res.writeHead(200, { "content-type": "audio/mpeg" });
    res.end(Buffer.from([0x49, 0x44, 0x33, 0x04]));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const game = await startServer(server.address().port, 3916);
  try {
    const say = (body) => fetch("http://127.0.0.1:3916/api/speech", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const res = await say({ text: "KABOOM! The monster rose from the sea.", style: "story" });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "audio/mpeg");
    assert.equal((await res.arrayBuffer()).byteLength, 4);
    assert.match(server.seen.url, /\/v1\/audio\/speech$/);
    assert.equal(server.seen.body.model, "gpt-4o-mini-tts");
    assert.equal(server.seen.body.voice, "marin");
    assert.match(server.seen.body.instructions, /storyteller/);
    assert.equal((await say({ text: "", style: "story" })).status, 400);
    assert.equal((await say({ text: "hi", style: "robot" })).status, 400);
  } finally {
    game.kill();
    server.close();
  }
});
