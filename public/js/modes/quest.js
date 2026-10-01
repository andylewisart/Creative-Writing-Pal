// Story Quest: the writer and Sparky take turns writing an adventure.

import { get, update, award, countWords } from "../state.js";
import { ask, kidMessage, detectBackend } from "../ai.js";
import { WORLDS, HERO_KINDS, POWER_IDEAS } from "../worlds.js";
import { esc, el, $, $$, writingDesk, wireDesk, showReward, challengeHtml, loadingHtml, spellChip, sparkyHtml, toast } from "../ui.js";
import { sfx, speak, stopSpeaking, canSpeak, confetti, prefetchSpeech } from "../fx.js";
import { spellById } from "../spells.js";
import { splitSentences } from "../demo.js";
import { logEvent } from "../log.js";
import { talkButtonHtml, wireTalk } from "../voice.js";

let root, nav;

export function render(r, n) {
  root = r;
  nav = n;
  const q = get().activeQuest;
  if (!q) return setup();
  if (q.phase === "finale") return finale();
  return writeTurn();
}

const payloadBase = (q) => ({
  writerName: get().writerName,
  world: q.world,
  worldId: q.worldId,
  hero: q.hero,
});

// ---------------- Setup: choose a world and make a hero ----------------
function setup() {
  const draft = { worldId: null, kindId: null };
  root.innerHTML = "";
  root.appendChild(
    el(`<section class="quest-setup">
      <h1 class="screen-title">New Story Quest</h1>
      <h2 class="step">1. Pick a world</h2>
      <div class="world-grid">
        ${WORLDS.map(
          (w) => `<button class="world-card" type="button" data-world="${w.id}" style="--hue:${w.hue}">
            <span class="world-icon" aria-hidden="true">${w.icon}</span>
            <span class="world-name">${esc(w.name)}</span>
            <span class="world-blurb">${esc(w.blurb)}</span>
          </button>`,
        ).join("")}
        <button class="world-card" type="button" data-world="random" style="--hue:#ffd23f">
          <span class="world-icon" aria-hidden="true">🎲</span>
          <span class="world-name">Surprise me!</span>
          <span class="world-blurb">Sparky picks a world at random</span>
        </button>
      </div>

      <h2 class="step">2. Make your hero</h2>
      <div class="hero-form">
        <label for="hero-name">Hero's name</label>
        <input id="hero-name" maxlength="30" autocomplete="off" placeholder="Like Zara Moonblade or Captain Bolt">
        <span class="label">What kind of hero?</span>
        <div class="chip-row" id="kinds">
          ${HERO_KINDS.map((k) => `<button class="chip" type="button" data-kind="${k.id}">${k.icon} ${esc(k.label)}</button>`).join("")}
        </div>
        <label for="hero-power">Secret power (write it your way!)</label>
        <input id="hero-power" maxlength="90" autocomplete="off" placeholder="My hero can...">
        <div class="idea-row"><span>Need an idea?</span>${POWER_IDEAS.map((p) => `<button class="mini-chip" type="button" data-power="${esc(p)}">${esc(p)}</button>`).join("")}</div>
      </div>
      <p class="setup-error" id="setup-error" role="alert" hidden></p>
      <button class="btn btn-go btn-big" type="button" id="begin">Begin the adventure! 🗺️</button>
    </section>`),
  );

  $$(".world-card", root).forEach((b) =>
    b.addEventListener("click", () => {
      sfx.click();
      draft.worldId = b.dataset.world;
      $$(".world-card", root).forEach((x) => x.classList.toggle("picked", x === b));
    }),
  );
  $$("#kinds .chip", root).forEach((b) =>
    b.addEventListener("click", () => {
      sfx.click();
      draft.kindId = b.dataset.kind;
      $$("#kinds .chip", root).forEach((x) => x.classList.toggle("picked", x === b));
    }),
  );
  $$("[data-power]", root).forEach((b) =>
    b.addEventListener("click", () => {
      $("#hero-power", root).value = "My hero " + b.dataset.power;
    }),
  );
  $("#begin", root).addEventListener("click", async () => {
    const err = $("#setup-error", root);
    const name = $("#hero-name", root).value.trim();
    const power = $("#hero-power", root).value.trim();
    const missing = [!draft.worldId && "a world", !name && "a hero name", !draft.kindId && "a kind of hero"].filter(Boolean);
    if (missing.length) {
      err.hidden = false;
      err.textContent = `Almost! Pick ${missing.join(" and ")} first.`;
      sfx.fizzle();
      return;
    }
    const worldId = draft.worldId === "random" ? WORLDS[Math.floor(Math.random() * WORLDS.length)].id : draft.worldId;
    const world = WORLDS.find((w) => w.id === worldId);
    const kind = HERO_KINDS.find((k) => k.id === draft.kindId);
    const q = {
      worldId,
      world: `${world.name}: ${world.blurb}`,
      hero: { name, kind: kind.text, kindIcon: kind.icon, power: power || "a secret power nobody knows yet" },
      title: "",
      story: [],
      bonus: null,
      turn: 1,
      totalTurns: get().settings.questTurns,
      phase: "write",
      startedAt: Date.now(),
    };
    if (power) award({ spells: [], gems: 5, mode: "quest", text: power });
    await startStory(q);
  });
}

async function startStory(q) {
  logEvent("quest.start", { world: q.worldId, hero: q.hero.name, kind: q.hero.kind, power: q.hero.power, turns: q.totalTurns });
  root.innerHTML = loadingHtml("Sparky is opening the story book...");
  try {
    const r = await ask("quest_start", payloadBase(q));
    q.title = r.title;
    q.story.push({ author: "ai", text: r.chapter, emojis: r.sceneEmojis });
    q.bonus = r.bonus;
    update((s) => (s.activeQuest = q));
    writeTurn();
  } catch (e) {
    errorScreen(e, () => startStory(q));
  }
}

// ---------------- The story so far ----------------
function storyHtml(q) {
  const name = get().writerName;
  return `<article class="storybook" aria-label="Your story">
    <header class="book-head"><span class="book-world">${esc(q.hero.kindIcon || "✨")} ${esc(q.hero.name)}</span><h1>${esc(q.title)}</h1></header>
    ${q.story
      .map((p, i) =>
        p.author === "ai"
          ? `<section class="page page-ai">
              ${p.emojis ? `<div class="scene" aria-hidden="true">${esc(p.emojis)}</div>` : ""}
              <p>${esc(p.text)}</p>
              ${canSpeak() ? `<button class="read-btn" type="button" data-read="${i}" aria-label="Read this part out loud">🔊 Read to me</button>` : ""}
            </section>`
          : `<section class="page page-kid">
              <span class="byline">✍️ by ${esc(name)}</span>
              <p>${esc(p.text)}</p>
              ${p.spells?.length ? `<div class="page-spells">${p.spells.map((s) => `<span class="mini-spell" title="${esc(s.quote)}">${spellIcon(s.id)}</span>`).join("")}</div>` : ""}
            </section>`,
      )
      .join("")}
  </article>`;
}

const spellIcon = (id) => ({ sight: "🎨", sound: "💥", senses: "👃", talk: "💬", feelings: "💓", likea: "🪞", power: "⚡", twist: "🌀" })[id] || "✨";

function wireReading(scope, q) {
  const READ = "🔊 Read to me";
  const reset = (x) => {
    x.classList.remove("reading");
    x.textContent = READ;
  };
  $$("[data-read]", scope).forEach((b) =>
    b.addEventListener("click", () => {
      const part = q.story[Number(b.dataset.read)];
      if (b.classList.contains("reading")) {
        stopSpeaking();
        return reset(b);
      }
      $$(".read-btn.reading", scope).forEach(reset);
      b.classList.add("reading");
      logEvent("readaloud", { part: Number(b.dataset.read) });
      b.textContent = "⏳ Getting ready…";
      speak(part.text, {
        onstart: () => (b.textContent = "⏹ Stop reading"),
        onend: () => reset(b),
      });
    }),
  );
}

// ---------------- A writing turn ----------------
function writeTurn(draftText = "") {
  const q = get().activeQuest;
  const last = q.turn >= q.totalTurns;
  root.innerHTML = "";
  root.appendChild(
    el(`<section class="quest">
      ${storyHtml(q)}
      <div class="turn-panel" id="turn-panel">
        <div class="turn-head">
          <span class="turn-count">${last ? "🏁 Final part!" : `Your part ${q.turn} of ${q.totalTurns}`}</span>
          <h2>${last ? `How does ${esc(q.hero.name)}'s adventure end?` : `What does ${esc(q.hero.name)} do next?`}</h2>
        </div>
        ${challengeHtml(q.bonus, "Bonus +15 💎")}
        ${writingDesk({ id: "kid-text", placeholder: last ? "Write the big ending..." : `${q.hero.name}...`, value: draftText })}
        <div class="spark-box" id="spark-box" hidden></div>
        <p class="form-error" id="turn-error" role="alert" hidden></p>
        <div class="turn-actions">
          ${talkButtonHtml()}
          <button class="btn btn-ghost" type="button" id="spark">🔮 Idea crystal</button>
          <button class="btn btn-go" type="button" id="cast">✨ Feed Sparky</button>
        </div>
        <div class="quest-tools">
          <button class="link-btn" type="button" id="quit">Start a different story</button>
        </div>
      </div>
    </section>`),
  );
  wireReading(root, q);
  const ta = wireDesk($(".desk", root));
  q.turnShownAt ||= Date.now();
  ta.addEventListener("input", () => {
    q.draft = ta.value;
  });
  if (q.draft && !draftText) {
    ta.value = q.draft;
    ta.dispatchEvent(new Event("input"));
  }
  // Show the newest chapter, then the writing box.
  const pages = $$(".page", root);
  pages[pages.length - 1]?.scrollIntoView({ block: "start", behavior: "smooth" });
  const newest = [...q.story].reverse().find((p) => p.author === "ai");
  detectBackend().then(() => prefetchSpeech(newest?.text));
  if (get().settings.readAloud && q.justArrived && canSpeak()) {
    q.justArrived = false;
    $$(".read-btn", root).pop()?.click();
  }

  $("#spark", root).addEventListener("click", () => sparkIdeas(q, ta));
  wireTalk(root, ".desk", () => {
    const lastAi = [...q.story].reverse().find((p) => p.author === "ai");
    return {
      kind: "quest",
      writerName: get().writerName,
      where: `Story Quest, part ${q.turn} of ${q.totalTurns} of a co-written adventure (${q.world}). Hero: ${q.hero.name}, ${q.hero.kind}. The newest chapter ends like this: "${(lastAi?.text || "").slice(-450)}". They are about to write what happens next.`,
      draft: ta.value.trim(),
      question: q.bonus?.prompt,
    };
  });
  $("#cast", root).addEventListener("click", () => submitTurn(q, ta.value.trim()));
  $("#quit", root).addEventListener("click", () => confirmQuit());
}

async function sparkIdeas(q, ta) {
  const box = $("#spark-box", root);
  box.hidden = false;
  box.innerHTML = `<p class="spark-wait">🔮 The crystal ball is swirling...</p>`;
  sfx.click();
  try {
    const lastAi = [...q.story].reverse().find((p) => p.author === "ai");
    const r = await ask("spark", {
      writerName: get().writerName,
      context: `Writing a ${q.world} story. Hero: ${q.hero.name}. The latest chapter: "${lastAi?.text || ""}"`,
      draft: ta.value.trim(),
    });
    box.innerHTML = `<p class="spark-title">🔮 The crystal ball shows...</p><ul>${r.sparks.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`;
    logEvent("spark", { mode: "quest", draft: ta.value.trim(), sparks: r.sparks });
    sfx.spell();
  } catch (e) {
    box.innerHTML = `<p class="spark-wait">${esc(kidMessage(e))}</p>`;
  }
}

async function submitTurn(q, text) {
  const err = $("#turn-error", root);
  if (countWords(text) < 2) {
    logEvent("quest.too_short", { turn: q.turn, text });
    err.hidden = false;
    err.textContent = "Sparky's tummy is rumbling! Write a little more first.";
    sfx.fizzle();
    return;
  }
  stopSpeaking();
  const panel = $("#turn-panel", root);
  panel.innerHTML = loadingHtml("Sparky is tasting your words... nom nom nom");
  logEvent("quest.submit", { turn: q.turn, of: q.totalTurns, text, words: countWords(text), secs: secsSince(q.turnShownAt), bonus: q.bonus?.spell });
  q.turnShownAt = null;
  let r;
  try {
    r = await ask("quest_react", { ...payloadBase(q), story: q.story, kidText: text, bonus: q.bonus });
  } catch (e) {
    logEvent("error", { where: "quest_react", code: e.code });
    return turnError(e, text);
  }
  logEvent("quest.react", { turn: q.turn, cheer: r.cheer, spells: r.spells.map((x) => x.id), bonusDone: r.bonusDone, powerUp: r.powerUp.prompt });
  if (r.switchedToPractice) toast("Real magic isn't allowed here, so Sparky is using practice magic.");
  q.story.push({ author: "kid", text, spells: r.spells });
  q.draft = "";
  update((s) => (s.activeQuest = q));
  const result = award({ spells: r.spells, gems: r.bonusDone ? 15 : 0, mode: "quest", text });
  await showReward({ cheer: r.cheer + (r.bonusDone ? " BONUS QUEST COMPLETE! +15 💎" : ""), spells: r.spells, result });
  powerUpPanel(q, r.powerUp);
}

// The power-up: revise ONE sentence of the writer's part, in place.
// A worked example shows the move; if the detail gets tacked on as a
// fragment ("...from the ground. Red fire"), Sparky offers a sentence
// frame with blanks and one more try.
function powerUpPanel(q, powerUp, attempt = 1, coach = null) {
  const kidPart = q.story[q.story.length - 1];
  const target = (q.revision ||= { target: pickTarget(kidPart.text, powerUp.target), shownAt: Date.now() }).target;
  const spell = spellById[powerUp.spell] || spellById.sight;
  const startText = coach?.frame || coach?.lastTry || target;
  root.innerHTML = "";
  root.appendChild(
    el(`<section class="quest">
      ${storyHtml(q)}
      <div class="turn-panel powerup" id="turn-panel">
        <div class="powerup-head">
          ${sparkyHtml(coach ? "happy" : "wow", "small bounce")}
          <div><span class="turn-count">⚡ Power-up · +15 💎</span>
          <h2>${esc(coach ? coach.cheer : powerUp.prompt)}</h2></div>
        </div>
        ${
          coach?.frame
            ? `<div class="frame-help"><span class="label">Fill in the blanks:</span><p class="frame">${esc(coach.frame).replace(/_{3,}/g, '<span class="blank">___</span>')}</p></div>`
            : `<div class="how-to" style="--spell:${spell.color}">
                <span class="challenge-label">${spell.icon} ${esc(spell.name)}: put the new words inside</span>
                <p class="demo-line"><span class="demo-before">${esc(spell.demo.before)}</span><span class="demo-arrow" aria-hidden="true">→</span><span class="demo-after">${spell.demo.after}</span></p>
              </div>`
        }
        <label class="sr-only" for="revision">Your sentence</label>
        ${writingDesk({ id: "revision", placeholder: target, rows: 2, goal: countWords(target) + 4, value: startText })}
        <p class="form-error" id="turn-error" role="alert" hidden></p>
        <div class="turn-actions">
          ${talkButtonHtml()}
          <button class="btn btn-ghost" type="button" id="skip">Skip</button>
          <button class="btn btn-go" type="button" id="power">⚡ Power up!</button>
        </div>
      </div>
    </section>`),
  );
  wireReading(root, q);
  const ta = wireDesk($(".desk", root));
  $("#turn-panel", root).scrollIntoView({ block: "start", behavior: "smooth" });
  ta.focus({ preventScroll: true });
  const blank = ta.value.indexOf("___");
  if (blank >= 0) ta.setSelectionRange(blank, blank + 3);
  wireTalk(root, ".desk", () => ({
    kind: "powerup",
    writerName: get().writerName,
    where: `Revising ONE sentence from their story to add a detail inside it. The sentence: "${target}".`,
    draft: ta.value.trim(),
    question: powerUp.prompt,
  }));
  logEvent("powerup.shown", { attempt, spell: powerUp.spell, question: powerUp.prompt, target, frame: coach?.frame });

  const fail = (msg) => {
    const err = $("#turn-error", root);
    err.hidden = false;
    err.textContent = msg;
    sfx.fizzle();
  };
  $("#skip", root).addEventListener("click", () => {
    logEvent("powerup.skip", { attempt, spell: powerUp.spell, secs: secsSince(q.revision.shownAt) });
    q.revision = null;
    continueStory(q, null);
  });
  $("#power", root).addEventListener("click", async () => {
    const after = ta.value.trim();
    if (after.includes("___")) return fail("Fill in the ___ blanks with your own words first!");
    if (after.replace(/\s+/g, " ") === target.replace(/\s+/g, " ")) return fail("It's the same as before! Add a new detail somewhere inside your sentence.");
    $("#turn-panel", root).innerHTML = loadingHtml("Sparky is checking your power-up...");
    let r;
    try {
      r = await ask("quest_revise", { writerName: get().writerName, spell: powerUp.spell, prompt: powerUp.prompt, before: target, after, attempt });
    } catch (e) {
      logEvent("error", { where: "quest_revise", code: e.code });
      powerUpPanel(q, powerUp, attempt, { ...coach, lastTry: after, frame: "" });
      return fail(kidMessage(e));
    }
    logEvent("powerup.try", { attempt, before: target, after, woven: r.woven, changed: r.changed, cheer: r.cheer, frame: r.frame, spells: r.spells.map((x) => x.id) });
    if (!r.changed) {
      powerUpPanel(q, powerUp, attempt, { ...coach, lastTry: after, frame: coach?.frame || "" });
      return fail(r.cheer);
    }
    if (!r.woven && attempt < 2) {
      sfx.click();
      return powerUpPanel(q, powerUp, attempt + 1, { cheer: r.cheer, frame: r.frame, lastTry: after });
    }
    // Put the revised sentence back into the writer's part.
    const before = kidPart.text;
    kidPart.text = before.includes(target) ? before.replace(target, after) : `${before} ${after}`;
    kidPart.spells = mergeSpells(kidPart.spells, r.spells);
    update((st) => (st.activeQuest = q));
    const result = award({ spells: r.spells, gems: r.woven ? 15 : 5, mode: "powerup", text: after });
    await showReward({ cheer: r.cheer, spells: r.spells, result, title: "Power-up spells!", mood: "wow" });
    q.revision = null;
    continueStory(q, before);
  });
}

// The sentence to revise: the AI's pick if it really is in the text, else the first one.
function pickTarget(text, aiTarget) {
  const t = String(aiTarget || "").trim();
  if (t && text.includes(t)) return t;
  return splitSentences(text)[0] || text;
}

const secsSince = (t) => (t ? Math.round((Date.now() - t) / 1000) : undefined);

async function continueStory(q, revisedFrom) {
  const kidPart = q.story[q.story.length - 1];
  $("#turn-panel", root).innerHTML = loadingHtml(revisedFrom ? "Power-up absorbing... the story is growing!" : "The story is unfolding...");
  let r;
  try {
    r = await ask("quest_continue", {
      ...payloadBase(q),
      story: q.story,
      kidText: kidPart.text,
      revisedFrom,
      turnNumber: q.turn,
      totalTurns: q.totalTurns,
    });
  } catch (e) {
    logEvent("error", { where: "quest_continue", code: e.code });
    $("#turn-panel", root).innerHTML = `<div class="fizzle"><p>${esc(kidMessage(e))}</p><button class="btn btn-go" type="button" id="retry">Try again</button></div>`;
    $("#retry", root).addEventListener("click", () => continueStory(q, revisedFrom));
    return;
  }
  logEvent("quest.chapter", { turn: q.turn, chapter: r.chapter, bonus: r.bonus.prompt });
  q.story.push({ author: "ai", text: r.chapter, emojis: r.sceneEmojis });
  q.bonus = r.bonus;
  q.justArrived = true;
  if (q.turn >= q.totalTurns) {
    q.phase = "finale";
    update((s) => (s.activeQuest = q));
    return finale();
  }
  q.turn += 1;
  update((s) => (s.activeQuest = q));
  writeTurn();
}

function mergeSpells(a = [], b = []) {
  const ids = new Set(a.map((s) => s.id));
  return [...a, ...b.filter((s) => !ids.has(s.id))];
}

function turnError(e, text) {
  writeTurn(text);
  const err = $("#turn-error", root);
  err.hidden = false;
  err.textContent = kidMessage(e);
  sfx.fizzle();
}

function errorScreen(e, retry) {
  root.innerHTML = `<div class="fizzle">${sparkyHtml("wow", "big")}<p>${esc(kidMessage(e))}</p><button class="btn btn-go" type="button" id="retry">Try again</button></div>`;
  $("#retry", root).addEventListener("click", retry);
}

function confirmQuit() {
  const tools = $(".quest-tools", root);
  tools.innerHTML = `<span>Leave this story? It will be gone forever.</span>
    <button class="btn btn-small btn-danger" type="button" id="yes-quit">Yes, start over</button>
    <button class="btn btn-small btn-ghost" type="button" id="no-quit">Keep writing</button>`;
  $("#yes-quit", root).addEventListener("click", () => {
    logEvent("quest.abandon", { turn: get().activeQuest?.turn, title: get().activeQuest?.title });
    update((s) => (s.activeQuest = null));
    setup();
  });
  $("#no-quit", root).addEventListener("click", () => writeTurn($("#kid-text", root)?.value || ""));
}

// ---------------- Finale: title, award, and into the library ----------------
async function finale() {
  const q = get().activeQuest;
  root.innerHTML = "";
  root.appendChild(el(`<section class="quest">${storyHtml(q)}<div class="turn-panel" id="turn-panel">${loadingHtml("Sparky is binding your book with dragon glue...")}</div></section>`));
  wireReading(root, q);
  const pages = $$(".page", root);
  pages[pages.length - 1]?.scrollIntoView({ block: "start", behavior: "smooth" });
  let r = q.finish;
  if (!r) {
    try {
      r = await ask("quest_finish", { ...payloadBase(q), story: q.story });
      q.finish = r;
      update((s) => (s.activeQuest = q));
    } catch (e) {
      $("#turn-panel", root).innerHTML = `<div class="fizzle"><p>${esc(kidMessage(e))}</p><button class="btn btn-go" type="button" id="retry">Try again</button></div>`;
      $("#retry", root).addEventListener("click", finale);
      return;
    }
  }
  const kidWords = q.story.filter((p) => p.author === "kid").reduce((n, p) => n + countWords(p.text), 0);
  const kidSpells = q.story.filter((p) => p.author === "kid").flatMap((p) => p.spells || []);
  const titles = r.titles.length ? r.titles : [q.title];
  confetti(100);
  sfx.level();
  $("#turn-panel", root).innerHTML = `
    <div class="finale">
      <p class="the-end">The End!</p>
      <div class="award">🏆 <span>${esc(r.award)}</span></div>
      <div class="finale-stats">
        <div><b>${kidWords}</b><span>words you wrote</span></div>
        <div><b>${kidSpells.length}</b><span>spells cast</span></div>
        <div><b>+50</b><span>💎 finish bonus</span></div>
      </div>
      ${
        r.favoriteLine
          ? `<div class="fav-line">${sparkyHtml("happy", "small")}<div><span class="label">Sparky's favorite line you wrote</span><blockquote>${esc(r.favoriteLine)}</blockquote><p>${esc(r.whyFavorite)}</p></div></div>`
          : ""
      }
      ${r.nextTime ? `<p class="next-time">🎯 <b>Next quest challenge:</b> ${esc(r.nextTime)}</p>` : ""}
      <h2>Pick a title for your book</h2>
      <div class="title-pick" role="radiogroup" aria-label="Book title">
        ${titles.map((t, i) => `<label class="title-opt"><input type="radio" name="title" value="${esc(t)}" ${i === 0 ? "checked" : ""}><span>${esc(t)}</span></label>`).join("")}
        <label class="title-opt own"><input type="radio" name="title" value="__own"><span>My own title:</span><input id="own-title" maxlength="60" placeholder="Type your title"></label>
      </div>
      <button class="btn btn-go btn-big" type="button" id="save-book">📚 Put it in my library!</button>
    </div>`;
  $("#own-title", root).addEventListener("focus", () => ($('input[value="__own"]', root).checked = true));
  $("#save-book", root).addEventListener("click", async () => {
    const pickedVal = $('input[name="title"]:checked', root).value;
    const title = pickedVal === "__own" ? $("#own-title", root).value.trim() || titles[0] : pickedVal;
    const book = {
      id: "b" + Date.now(),
      title,
      hero: q.hero,
      worldId: q.worldId,
      story: q.story,
      award: r.award,
      favoriteLine: r.favoriteLine,
      words: kidWords,
      finishedAt: Date.now(),
    };
    update((s) => {
      s.stories.unshift(book);
      s.activeQuest = null;
    });
    logEvent("quest.finish", { title, words: kidWords, spells: kidSpells.length, favoriteLine: r.favoriteLine, mins: Math.round((Date.now() - (q.startedAt || Date.now())) / 60000) });
    const result = award({ gems: 50, mode: "finish" });
    await showReward({ cheer: `"${title}" is in your library! You're a real author now!`, spells: [], result, mood: "wow" });
    nav.go("library", { tab: "books", open: book.id });
  });
}
