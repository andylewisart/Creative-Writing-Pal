// The actual AI calls (all OpenAI), shared by server.js (key on the server)
// and the github.io build (key saved in the browser). Callers pass in the
// SDK client and class, so this file has no imports a browser can't load.

import { GUIDE, TASKS, paintPrompt, voiceInstructions } from "./prompts.js";

export const DEFAULTS = {
  model: "gpt-6.1-sol",
  effort: "low", // ChatGPT's "Light" thinking level
  imageModel: "gpt-image-2.5-flare",
  imageQuality: "medium",
  imageSize: "1024x1024",
  voiceModel: "gpt-realtime-2.1",
  voiceName: "marin",
  speechModel: "gpt-4o-mini-tts",
};

// Read-aloud voices: who reads, and how.
export const SPEECH_STYLES = {
  story: {
    voice: "marin",
    instructions:
      "You are reading an adventure story aloud to an 8-year-old who loves monsters, dinosaurs, and space battles. Use a warm, lively storyteller voice with real drama: build suspense at cliffhangers, make sound words like KABOOM and ROAR punchy, and give characters a little voice when they speak. Clear and not rushed.",
  },
  trailer: {
    voice: "onyx",
    instructions: "Deep, booming movie-trailer announcer. Slow and epic, with dramatic pauses, like the biggest blockbuster of the year.",
  },
};
export const SPEECH_MAX_CHARS = 3800;

export class TaskError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function errorCode(e, OpenAI) {
  if (e instanceof OpenAI.BadRequestError && /moderation|safety/i.test(String(e.code))) return "refused";
  if (e instanceof OpenAI.RateLimitError) return "rate_limited";
  if (e instanceof OpenAI.AuthenticationError || e instanceof OpenAI.PermissionDeniedError) return "not_granted";
  if (e instanceof OpenAI.APIConnectionError) return "network";
  return "default";
}

const wrap = (e, OpenAI) => (e instanceof TaskError ? e : new TaskError(errorCode(e, OpenAI), e.message, e.status));

// Run one game task and return the parsed JSON reply. The API enforces the
// task's schema (strict structured output), so replies always fit the game.
export async function runTextTask({ openai, OpenAI, model = DEFAULTS.model, effort = DEFAULTS.effort }, task, payload) {
  const t = TASKS[task];
  let response;
  try {
    response = await openai.responses.create({
      model,
      instructions: GUIDE,
      input: t.build(payload),
      reasoning: { effort },
      max_output_tokens: 16000,
      store: false, // don't keep a child's writing on OpenAI's side
      text: { format: { type: "json_schema", name: task, schema: t.schema, strict: true } },
    });
  } catch (e) {
    throw wrap(e, OpenAI);
  }
  const content = (response.output || []).filter((o) => o.type === "message").flatMap((o) => o.content || []);
  if (content.some((c) => c.type === "refusal")) throw new TaskError("refused", "The model declined this request", 422);
  if (response.status === "incomplete") {
    throw new TaskError("default", `Reply was cut short (${response.incomplete_details?.reason || "incomplete"})`, 502);
  }
  const text = content.filter((c) => c.type === "output_text").map((c) => c.text).join("");
  try {
    return JSON.parse(text);
  } catch {
    throw new TaskError("default", "Reply was not valid JSON", 502);
  }
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
    throw wrap(e, OpenAI);
  }
}

// A short-lived key for one spoken coaching session (OpenAI realtime over
// WebRTC). The browser uses it to connect; the real API key never leaves
// wherever it is stored.
export async function createVoiceSession({ openai, OpenAI, model = DEFAULTS.voiceModel, voice = DEFAULTS.voiceName }, ctx) {
  try {
    const secret = await openai.realtime.clientSecrets.create({
      expires_after: { anchor: "created_at", seconds: 120 },
      session: {
        type: "realtime",
        model,
        instructions: voiceInstructions(ctx),
        max_output_tokens: 800,
        audio: {
          input: {
            transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
            // Kids pause to think; "low" eagerness waits for them to finish.
            turn_detection: { type: "semantic_vad", eagerness: "low" },
          },
          output: { voice },
        },
      },
    });
    return { value: secret.value, model };
  } catch (e) {
    throw wrap(e, OpenAI);
  }
}

// Read text aloud with OpenAI text-to-speech. Returns MP3 bytes (ArrayBuffer).
export async function synthesizeSpeech({ openai, OpenAI, model = DEFAULTS.speechModel }, { text, style = "story" }) {
  const st = SPEECH_STYLES[style] || SPEECH_STYLES.story;
  try {
    const res = await openai.audio.speech.create({
      model,
      voice: st.voice,
      input: String(text).slice(0, SPEECH_MAX_CHARS),
      instructions: st.instructions,
      response_format: "mp3",
    });
    return await res.arrayBuffer();
  } catch (e) {
    throw wrap(e, OpenAI);
  }
}
