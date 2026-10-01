// "Talk it out with Sparky": a short spoken coaching session (OpenAI realtime
// over WebRTC). Kids say far more than they write, so Sparky asks questions
// out loud, and the child's spoken ideas show up as notes to write from.

import { voiceSession, canTalk, detectBackend, kidMessage, AIError } from "./ai.js";
import { get } from "./state.js";
import { logEvent } from "./log.js";
import { esc, el, $, sparkyHtml } from "./ui.js";
import { sfx, stopSpeaking } from "./fx.js";

const MAX_SECS = 5 * 60; // one session
const USAGE_KEY = "storyquest.voice.v1";
const CALLS_URL = "https://api.openai.com/v1/realtime/calls";

function usedToday(addSecs = 0) {
  const today = new Date().toISOString().slice(0, 10);
  let rec = { day: today, secs: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(USAGE_KEY));
    if (saved?.day === today) rec = saved;
    if (addSecs) {
      rec.secs += addSecs;
      localStorage.setItem(USAGE_KEY, JSON.stringify(rec));
    }
  } catch {
    /* storage blocked */
  }
  return rec.secs;
}

const minutesAllowed = () => get().settings.voiceMinutes ?? 20;
const voiceEnabled = () => get().settings.voice !== false;

// Only one session at a time; anything that leaves the page can end it.
let activeStop = null;
export function stopVoice(reason = "left") {
  activeStop?.(reason);
}

export const talkButtonHtml = () => `<button class="btn btn-ghost btn-talk" type="button" data-talk hidden>🎙️ Talk it out</button>`;

// Show the talk button once we know the voice coach is available, and open
// the coach panel just above `anchorSel` when it's tapped.
export function wireTalk(scope, anchorSel, getCtx) {
  const btn = $("[data-talk]", scope);
  if (!btn) return;
  detectBackend().then(() => {
    if (!canTalk() || !voiceEnabled()) return;
    btn.hidden = false;
    btn.addEventListener("click", () => {
      if ($(".voice-panel", scope)) return;
      btn.disabled = true;
      openVoiceCoach($(anchorSel, scope), getCtx(), () => (btn.disabled = false));
    });
  });
}

export function openVoiceCoach(anchor, ctx, onEnd = () => {}) {
  stopSpeaking();
  const panel = el(`<div class="voice-panel" role="region" aria-label="Talking with Sparky">
    <div class="voice-head">
      ${sparkyHtml("happy", "small")}
      <div class="voice-title"><b>🎙️ Talking with Sparky</b><span class="voice-state">Getting ready...</span></div>
      <span class="voice-timer" aria-label="Time left"></span>
    </div>
    <p class="voice-caption" aria-live="polite"></p>
    <div class="voice-notes" hidden><span class="label">Your ideas (you said these!):</span><ul></ul></div>
    <p class="form-error voice-error" role="alert" hidden></p>
    <button class="btn btn-go" type="button" data-voice-done>✏️ Done talking. Let's write!</button>
  </div>`);
  anchor.before(panel);
  panel.scrollIntoView({ block: "start", behavior: "smooth" });

  const state = (t) => ($(".voice-state", panel).textContent = t);
  const caption = $(".voice-caption", panel);
  const notes = $(".voice-notes", panel);
  const sparky = $(".sparky", panel);
  let pc = null, dc = null, stream = null, audio = null, timer = null, started = 0, ended = false;
  stopVoice("replaced");

  // Hang up as soon as the panel leaves the page (the child submitted,
  // switched screens, or the page redrew) or the app goes to the background.
  const watcher = new MutationObserver(() => {
    if (!panel.isConnected) stop("left");
  });
  watcher.observe(document.body, { childList: true, subtree: true });
  const onHide = () => document.visibilityState === "hidden" && stop("hidden");
  document.addEventListener("visibilitychange", onHide);

  const stop = (reason) => {
    if (ended) return;
    ended = true;
    if (activeStop === stop) activeStop = null;
    watcher.disconnect();
    document.removeEventListener("visibilitychange", onHide);
    clearInterval(timer);
    try { dc?.close(); } catch { /* already closed */ }
    try { pc?.close(); } catch { /* already closed */ }
    stream?.getTracks().forEach((t) => t.stop());
    if (audio) audio.srcObject = null;
    const secs = started ? Math.round((Date.now() - started) / 1000) : 0;
    if (secs) usedToday(secs);
    logEvent("voice.end", { secs, reason, ideas: $$li().length });
    // Keep his spoken ideas on screen while he writes; otherwise close up.
    const done = $("[data-voice-done]", panel);
    const close = () => panel.remove();
    sparky.classList.remove("talking");
    $(".voice-timer", panel).textContent = "";
    if (reason === "error") {
      done.textContent = "Close";
      done.onclick = close;
    } else if (!$$li().length) {
      close();
    } else {
      panel.classList.add("ended");
      caption.textContent = "";
      state(reason === "time" ? "Time's up! Now write your ideas down." : "Now write your ideas down in your own words!");
      done.textContent = "Close my ideas";
      done.onclick = close;
    }
    onEnd();
  };
  const $$li = () => [...notes.querySelectorAll("li")];
  const fail = (e) => {
    const box = $(".voice-error", panel);
    box.hidden = false;
    box.textContent = kidMessage(e);
    logEvent("voice.error", { code: e.code || "default", msg: e.message });
    sfx.fizzle();
    stop("error");
  };

  activeStop = stop;
  $("[data-voice-done]", panel).onclick = () => stop("done");

  const handle = (evt) => {
    switch (evt.type) {
      case "input_audio_buffer.speech_started":
        state("Listening... 👂");
        break;
      case "input_audio_buffer.speech_stopped":
        state("Sparky is thinking...");
        break;
      case "conversation.item.input_audio_transcription.completed": {
        const said = String(evt.transcript || "").trim();
        if (!said) break;
        notes.hidden = false;
        $("ul", notes).appendChild(el(`<li>${esc(said)}</li>`));
        logEvent("voice.said", { text: said });
        break;
      }
      case "response.output_audio_transcript.delta":
        caption.textContent += evt.delta || "";
        break;
      case "response.created":
        caption.textContent = "";
        break;
      case "output_audio_buffer.started":
        state("Sparky is talking... 🗣️");
        sparky.classList.add("talking");
        break;
      case "output_audio_buffer.stopped":
        state("Your turn! Just talk. 🎤");
        sparky.classList.remove("talking");
        break;
      case "response.output_audio_transcript.done":
        caption.textContent = evt.transcript || caption.textContent;
        logEvent("voice.coach", { text: evt.transcript });
        break;
      case "error":
        logEvent("voice.error", { code: evt.error?.code || evt.error?.type, msg: evt.error?.message });
        break;
    }
  };

  (async () => {
    if (usedToday() >= minutesAllowed() * 60) return fail(new AIError("voice_limit", "daily voice minutes used"));
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      return fail(new AIError("no_mic", e.message));
    }
    if (ended) return stream.getTracks().forEach((t) => t.stop());
    state("Connecting to Sparky...");
    logEvent("voice.start", { where: ctx.kind });
    try {
      const { value } = await voiceSession(ctx);
      if (ended) return;
      pc = new RTCPeerConnection();
      audio = new Audio();
      audio.autoplay = true;
      pc.ontrack = (e) => (audio.srcObject = e.streams[0]);
      pc.addTrack(stream.getAudioTracks()[0], stream);
      dc = pc.createDataChannel("oai-events");
      dc.onopen = () => dc.send(JSON.stringify({ type: "response.create" })); // Sparky speaks first
      dc.onmessage = (m) => {
        try {
          handle(JSON.parse(m.data));
        } catch {
          /* ignore malformed events */
        }
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected"].includes(pc.connectionState)) fail(new AIError("network", `connection ${pc.connectionState}`));
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const res = await fetch(CALLS_URL, {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${value}`, "Content-Type": "application/sdp" },
      });
      if (!res.ok) throw new AIError(res.status === 429 ? "rate_limited" : "default", `calls HTTP ${res.status}`);
      await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
      started = Date.now();
      const left = Math.min(MAX_SECS, minutesAllowed() * 60 - usedToday());
      const tick = () => {
        const s = Math.max(0, left - Math.round((Date.now() - started) / 1000));
        $(".voice-timer", panel).textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
        if (s <= 0) stop("time");
      };
      tick();
      timer = setInterval(tick, 1000);
    } catch (e) {
      fail(e instanceof AIError ? e : new AIError(e.code || "network", e.message));
    }
  })();
}
