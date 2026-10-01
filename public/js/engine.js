// The actual AI calls, shared by server.js (keys on the server) and the
// github.io build (keys saved in the browser). Callers pass in the SDK
// clients and classes, so this file has no imports a browser can't load.

import { GUIDE, TASKS, paintPrompt } from "./prompts.js";

export const DEFAULTS = {
  model: "claude-opus-5-5",
  imageModel: "gpt-image-2.5-flare",
  imageQuality: "medium",
  imageSize: "1024x1024",
};

export class TaskError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Run one game task on Claude and return the parsed JSON reply.
// `state.useFallbacks` is flipped off (and kept off) if the account rejects them.
export async function runClaudeTask({ client, Anthropic, model = DEFAULTS.model, state = { useFallbacks: true } }, task, payload) {
  const t = TASKS[task];
  const params = {
    model,
    max_tokens: 16000,
    system: [{ type: "text", text: GUIDE, cache_control: { type: "ephemeral" } }],
    output_config: { effort: t.effort, format: { type: "json_schema", schema: t.schema } },
    messages: [{ role: "user", content: t.build(payload) }],
  };
  let response;
  try {
    if (state.useFallbacks) {
      try {
        // If a safety classifier declines, the API re-runs the request on a fallback model.
        response = await client.beta.messages.create({
          ...params,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        });
      } catch (e) {
        if (!(e instanceof Anthropic.BadRequestError)) throw e;
        console.warn("Fallbacks not accepted for this account; continuing without them:", e.message);
        state.useFallbacks = false;
      }
    }
    if (!response) response = await client.messages.create(params);
  } catch (e) {
    throw new TaskError(claudeErrorCode(e, Anthropic), e.message, e.status);
  }
  if (response.stop_reason === "refusal") throw new TaskError("refused", "Claude declined this request", 422);
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  try {
    return JSON.parse(text);
  } catch {
    throw new TaskError("default", `Reply was not valid JSON (stop_reason: ${response.stop_reason})`, 502);
  }
}

function claudeErrorCode(e, Anthropic) {
  if (e instanceof Anthropic.RateLimitError) return "rate_limited";
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return "not_granted";
  if (e instanceof Anthropic.APIConnectionError) return "network";
  return "default";
}

// Paint a creature card. Returns base64 JPEG data.
export async function paintCreature({ openai, OpenAI, model = DEFAULTS.imageModel, quality = DEFAULTS.imageQuality, size = DEFAULTS.imageSize }, creature) {
  try {
    const result = await openai.images.generate({
      model,
      prompt: paintPrompt(creature),
      size,
      quality,
      output_format: "jpeg",
      output_compression: 85,
      background: "opaque",
      n: 1,
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new TaskError("default", "No image in reply", 502);
    return b64;
  } catch (e) {
    if (e instanceof TaskError) throw e;
    let code = "default";
    if (e instanceof OpenAI.BadRequestError && /moderation|safety/i.test(String(e.code))) code = "refused";
    else if (e instanceof OpenAI.RateLimitError) code = "rate_limited";
    else if (e instanceof OpenAI.AuthenticationError || e instanceof OpenAI.PermissionDeniedError) code = "not_granted";
    else if (e instanceof OpenAI.APIConnectionError) code = "network";
    throw new TaskError(code, e.message, e.status);
  }
}
