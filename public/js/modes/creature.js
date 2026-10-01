// Creature Lab: the artist draws ONLY what the writer describes.
// More details = a better drawing and stronger stats.

import { get, update, award, countWords } from "../state.js";
import { ask, kidMessage, canPaint, paint, detectBackend } from "../ai.js";
import { esc, el, $, writingDesk, wireDesk, spellChip, loadingHtml, sparkyHtml, showReward, speakTip, fuzzyHtml, wireTipButtons } from "../ui.js";
import { sfx, confetti } from "../fx.js";
import { ART_TIERS, artTierFor } from "../prompts.js";
import { demoCreatureSvg } from "../demo.js";
import { logEvent } from "../log.js";
import { starsHtml, wireStars, nextUnlock, countStars, rarityFromStars, PRIZE } from "../details.js";
import { talkButtonHtml, wireTalk } from "../voice.js";
import { fuzzyHint } from "../picture.js";

let root, nav;
let current = null; // the creature being built
let paintingId = null; // the creature whose painting is in progress

// The image service won't paint lookalikes of famous movie monsters. Turn that
// into a creature-designer lesson instead of a dead end.
const LOOKALIKE_TIP =
  "The magic paint won't stick! That usually means your creature looks a LOT like a famous movie monster. Real creature designers make theirs one-of-a-kind. 🌀 Cast a Twist Spell: change its colors, give it a body part no movie monster has, or a power nobody has seen. Then evolve it and paint again!";

const RARITY_GEMS = { common: 5, rare: 15, epic: 30, legendary: 50 };
const ELEMENT_ICON = { fire: "🔥", water: "💧", earth: "🪨", air: "🌪️", lightning: "⚡", ice: "❄️", nature: "🌿", shadow: "🌑", light: "🌟", cosmic: "🌌", metal: "⚙️" };

// One plain line about the next unlock, written for a third grader.
function starMessage(n, painting) {
  const next = nextUnlock(n);
  if (!next) return "🏆 All 6 stars! LEGENDARY!";
  if (!painting) return `⭐ ${n} of 6 stars. More stars make a stronger creature!`;
  const more = `${next.need} more ⭐ ${next.need === 1 ? "unlocks" : "unlock"} ${next.icon} ${next.label}!`;
  const have = rarityFromStars(n);
  return have === "common" ? more : `${PRIZE[have]} unlocked! ${more}`;
}

export function render(r, n) {
  root = r;
  nav = n;
  if (n.params?.creatureId) {
    current = get().creatures.find((c) => c.id === n.params.creatureId) || null;
    if (current) return showCard();
  }
  current = null;
  designer();
}

export function imgSrc(svg) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// Show the painting when it matches the creature's current level, unless
// the writer flipped the card to the other view.
const showsPainting = (c) => Boolean(c.painting) && (c.view ? c.view === "painting" : c.paintedLevel === c.level);

function artHtml(c) {
  if (showsPainting(c)) return `<img src="${esc(c.painting)}" alt="Painting of ${esc(c.name)}">`;
  if (c.svg) return `<img src="${imgSrc(c.svg)}" alt="Sketch of ${esc(c.name)}">`;
  return `<div class="no-art">?</div>`;
}

// The result screen: the art is the star, details stay compact.
function heroHtml(c) {
  const tier = showsPainting(c) ? ART_TIERS[c.paintedTier] : null;
  const stat = (label, v) => `<div class="hero-stat"><span>${label}</span><b>${v}</b><i style="--v:${v}%"></i></div>`;
  return `<article class="creature-hero rarity-${esc(c.rarity)}">
    <div class="hero-art">
      ${artHtml(c)}
      ${
        !showsPainting(c) && canPaint()
          ? `<div class="sketch-banner"><b>📐 Just a sketch</b><span>${esc(starMessage(countStars(c.details), true))}</span></div>`
          : ""
      }
      <div class="hero-tags"><span class="hero-rarity">${esc(c.rarity)}</span><span>Lv ${c.level}</span>${tier ? `<span>${tier.icon} ${esc(tier.label)}</span>` : `<span>📐 Sketch</span>`}</div>
      <div class="hero-name"><h1>${esc(c.name)}</h1><span>${ELEMENT_ICON[c.element] || "✨"} ${esc(c.species)}</span></div>
    </div>
    <div class="hero-stats">${stat("HP", c.hp)}${stat("ATK", c.attack)}${stat("DEF", c.defense)}${stat("MAGIC", c.magic)}</div>
    ${c.abilities.length ? `<ul class="hero-abilities">${c.abilities.map((a) => `<li title="${esc(a.effect)}"><b>${esc(a.name)}</b> ${esc(a.effect)}</li>`).join("")}</ul>` : ""}
  </article>`;
}

export function cardHtml(c) {
  const stat = (label, v) => `<div class="stat"><span>${label}</span><div class="stat-bar"><div style="width:${v}%"></div></div><b>${v}</b></div>`;
  return `<div class="creature-card rarity-${esc(c.rarity)}">
    <div class="card-top"><span class="card-name">${esc(c.name)}</span><span class="card-element" title="${esc(c.element)}">${ELEMENT_ICON[c.element] || "✨"} ${esc(c.element)}</span></div>
    <div class="card-art">${artHtml(c)}${
      showsPainting(c) ? `<span class="painted-badge">${esc(ART_TIERS[c.paintedTier]?.icon || "🎨")} ${esc(ART_TIERS[c.paintedTier]?.label || "Painted")}${c.paintedLevel !== c.level ? ` · Lv ${c.paintedLevel}` : ""}</span>` : ""
    }
      <span class="card-level">Lv ${c.level}</span></div>
    <div class="card-sub"><span>${esc(c.species)}</span><span class="rarity-tag">${esc(c.rarity)}</span></div>
    <div class="card-stats">${stat("HP", c.hp)}${stat("ATK", c.attack)}${stat("DEF", c.defense)}${stat("MAGIC", c.magic)}</div>
    <ul class="card-abilities">${c.abilities.map((a) => `<li><b>${esc(a.name)}</b> ${esc(a.effect)}</li>`).join("")}</ul>
    <div class="card-habitat">🏠 ${esc(c.habitat)}</div>
  </div>`;
}

function designer() {
  root.innerHTML = "";
  root.appendChild(
    el(`<section class="lab">
      <header class="lab-head">
        <h1 class="screen-title">Creature Lab</h1>
        <p class="lab-sub">The artist draws <b>only</b> what you write.</p>
      </header>
      <div class="star-goal">
        ${starsHtml({}, { live: true })}
        <p class="star-msg" id="star-msg" aria-live="polite"></p>
      </div>
      <label for="creature-name" class="sr-only">Creature name (optional)</label>
      <input id="creature-name" maxlength="40" autocomplete="off" placeholder="Name (optional)">
      ${writingDesk({ id: "creature-desc", placeholder: "My creature is...", rows: 6, goal: 40 })}
      <p class="form-error" id="lab-error" role="alert" hidden></p>
      <div class="turn-actions">
        ${talkButtonHtml()}
        <button class="btn btn-go btn-big" type="button" id="draw">🖌️ Bring it to life!</button>
      </div>
    </section>`),
  );
  const ta = wireDesk($(".desk", root));
  const msg = $("#star-msg", root);
  let stars = 0;
  const say = () => (msg.textContent = [starMessage(stars, canPaint()), fuzzyHint(ta.value)].filter(Boolean).join(" "));
  wireStars($(".star-goal", root), ta, { onCount: (n) => ((stars = n), say()) });
  detectBackend().then(say);
  $("#draw", root).addEventListener("click", () => create(ta.value.trim(), $("#creature-name", root).value.trim()));
  wireTalk(root, ".desk", () => ({
    kind: "creature",
    writerName: get().writerName,
    where: "Creature Lab: describing a made-up creature so the Creature Artist can draw it. The artist draws ONLY what they describe. Details about its body, colors, parts, powers, sounds, and home each earn a star.",
    draft: ta.value.trim(),
    question: "What does your creature look like, sound like, and what can it do?",
  }));
}

// Writing that earns Rare or better goes straight to a painting. Bare-bones
// writing only gets the artist's plain vector sketch (and a nudge to add
// details), so the reward always matches the writing.
const paintable = (c) => canPaint() && artTierFor(c) !== "common";

async function paintInto(c, intro) {
  const tier = ART_TIERS[artTierFor(c)];
  root.innerHTML = loadingHtml(`${intro} ${tier.icon} ${tier.label} unlocked!`, `Painting ${c.name}… about 10 seconds`);
  try {
    const painting = await paint({ name: c.name, description: c.description, habitat: c.habitat, rarity: c.rarity });
    logEvent("creature.paint", { name: c.name, tier: artTierFor(c), ok: true });
    return { ...c, painting, paintedLevel: c.level, paintedTier: artTierFor(c), view: undefined, paintError: undefined };
  } catch (e) {
    logEvent("creature.paint", { name: c.name, tier: artTierFor(c), ok: false, code: e.code });
    return { ...c, paintError: e.code || "default" };
  }
}

// The sketch is needed when there's no painting; draw a simple one locally
// if the AI skipped it.
const withSketch = (c) => (c.svg || c.painting ? c : { ...c, svg: demoCreatureSvg(c.description) });

const rarityCheer = { rare: "RARE", epic: "EPIC", legendary: "LEGENDARY" };

// A plain description only gets a sketch: say so on the reward, and have
// Sparky say out loud which star to earn next.
function sketchLine(c) {
  if (artTierFor(c) !== "common") return "";
  speakTip(c.tip, "creature");
  return `📐 Just a sketch!<small>${esc(c.tip || c.upgradeQuestion)}</small>`;
}

async function create(description, name) {
  if (countWords(description) < 3) {
    const err = $("#lab-error", root);
    err.hidden = false;
    err.textContent = "The artist needs at least a few words to draw anything!";
    sfx.fizzle();
    return;
  }
  root.innerHTML = loadingHtml("The artist is reading your description…");
  try {
    await detectBackend();
    const r = await ask("creature_create", { writerName: get().writerName, description, name, sketchOnlyIfCommon: canPaint() });
    let c = { id: "c" + Date.now(), ...r, description, level: 1, createdAt: Date.now() };
    logEvent("creature.create", { name: r.name, description, words: countWords(description), rarity: r.rarity, spells: r.spells.map((x) => x.id), question: r.upgradeQuestion, tip: r.tip });
    if (paintable(c)) c = await paintInto(c, `${rarityCheer[c.rarity]}!`);
    c = withSketch(c);
    update((s) => s.creatures.unshift(c));
    current = c;
    const result = award({ spells: r.spells, gems: RARITY_GEMS[r.rarity], mode: "creature", text: description });
    showCard();
    if (c.painting) sfx.level();
    if (r.rarity === "legendary" || r.rarity === "epic") confetti(80);
    await showReward({ cheer: `You discovered ${r.name}! ${r.artistNote}`, spells: r.spells, result, mood: "wow", power: sketchLine(c), button: artTierFor(c) === "common" ? "✏️ Add details →" : "Awesome! →" });
  } catch (e) {
    designer();
    $("#creature-desc", root).value = description;
    $("#creature-name", root).value = name;
    $("#creature-desc", root).dispatchEvent(new Event("input"));
    const err = $("#lab-error", root);
    err.hidden = false;
    err.textContent = kidMessage(e);
  }
}

function showCard() {
  const c = current;
  root.innerHTML = "";
  root.appendChild(
    el(`<section class="lab-result">
      <div class="card-wrap reveal">${heroHtml(c)}</div>
      <div class="artist-line">${sparkyHtml("happy", "mini")}<span>${esc(c.artistNote)}</span></div>
      <div id="paint-box"></div>
      <div class="evolve">
        <h2>✏️ Make ${esc(c.name)} better</h2>
        <div class="star-goal">
          ${starsHtml(c.details, { live: true })}
          <p class="star-msg" id="star-msg" aria-live="polite"></p>
        </div>
        <p class="evolve-hint">💡 ${esc(c.upgradeQuestion)}</p>
        ${fuzzyHtml([], c.tip)}
        <label class="sr-only" for="evolve-text">Your description</label>
        ${writingDesk({ id: "evolve-text", placeholder: "My creature is...", rows: 5, goal: 40, value: c.description })}
        <p class="form-error" id="lab-error" role="alert" hidden></p>
        <div class="turn-actions">
          ${talkButtonHtml()}
          <button class="btn btn-ghost" type="button" id="new">🥚 New creature</button>
          <button class="btn btn-go" type="button" id="evolve">🧬 Evolve</button>
        </div>
      </div>
    </section>`),
  );
  const ta = wireDesk($(".desk", root));
  const msg = $("#star-msg", root);
  const earned = countStars(c.details);
  wireStars($(".evolve .star-goal", root), ta, {
    base: c.details,
    original: c.description,
    onCount: (n) => {
      const goesUp = rarityFromStars(n) !== rarityFromStars(earned);
      msg.textContent = [canPaint() && goesUp ? `⭐ ${n} stars! Tap Evolve to unlock ${PRIZE[rarityFromStars(n)]}!` : starMessage(n, canPaint()), fuzzyHint(ta.value)].filter(Boolean).join(" ");
    },
  });
  wireTipButtons(root);
  $("#new", root).addEventListener("click", () => {
    current = null;
    designer();
  });
  $("#evolve", root).addEventListener("click", () => evolve(ta.value.trim()));
  wireTalk(root, ".evolve .desk", () => ({
    kind: "creature-evolve",
    writerName: get().writerName,
    where: `Creature Lab: improving the description of their creature ${c.name} so it evolves. What they wrote before: "${c.description}".`,
    draft: ta.value.trim(),
    question: c.upgradeQuestion,
  }));
  detectBackend().then(() => paintBox(c));
}

function saveCreature(next) {
  update((s) => {
    const i = s.creatures.findIndex((x) => x.id === next.id);
    if (i >= 0) s.creatures[i] = next;
  });
  current = next;
}

// Only shows up when a painting failed (with a retry) or when there is both
// a sketch and a painting to flip between.
function paintBox(c) {
  const box = $("#paint-box", root);
  if (!box || current !== c || paintingId === c.id) return;
  const failed = canPaint() && c.paintError && artTierFor(c) !== "common" && !(c.painting && c.paintedLevel === c.level);
  const flip = c.painting && c.svg;
  if (!failed && !flip) return (box.innerHTML = "");
  box.innerHTML = `<div class="paint-box">
    ${
      failed
        ? `<p class="ladder-hint warn">${esc(c.paintError === "refused" ? LOOKALIKE_TIP : kidMessage({ code: c.paintError }))}</p>
           ${c.paintError === "paint_limit" || c.paintError === "refused" ? "" : `<button class="btn btn-paint btn-small" type="button" id="paint">🎨 Try painting again</button>`}`
        : ""
    }
    ${flip ? `<button class="link-btn" type="button" id="flip">${showsPainting(c) ? "See the sketch" : "See the painting"}</button>` : ""}
  </div>`;
  $("#paint", box)?.addEventListener("click", doPaint);
  $("#flip", box)?.addEventListener("click", () => {
    saveCreature({ ...c, view: showsPainting(c) ? "sketch" : "painting" });
    showCard();
  });
}

async function doPaint() {
  const c = current;
  paintingId = c.id;
  const box = $("#paint-box", root);
  box.innerHTML = `<div class="paint-box painting-now" role="status"><span class="brush" aria-hidden="true">🖌️</span><p>Painting ${esc(c.name)}… about 10 seconds</p></div>`;
  $(".hero-art", root)?.classList.add("painting");
  $("#evolve", root).disabled = true;
  $("#new", root).disabled = true;
  sfx.click();
  try {
    const image = await paint({ name: c.name, description: c.description, habitat: c.habitat, rarity: c.rarity }).finally(() => (paintingId = null));
    logEvent("creature.paint", { name: c.name, tier: artTierFor(c), ok: true });
    if (current?.id !== c.id) return;
    saveCreature({ ...current, painting: image, paintedLevel: current.level, paintedTier: artTierFor(c), view: undefined, paintError: undefined });
    showCard();
    $(".card-wrap", root)?.scrollIntoView({ block: "start", behavior: "smooth" });
    sfx.level();
    confetti(70);
  } catch (e) {
    logEvent("creature.paint", { name: c.name, tier: artTierFor(c), ok: false, code: e.code });
    if (current?.id !== c.id) return;
    $(".hero-art", root)?.classList.remove("painting");
    $("#evolve", root).disabled = false;
    $("#new", root).disabled = false;
    saveCreature({ ...current, paintError: e.code || "default" });
    paintBox(current);
  }
}

// Evolving = improving the whole description, not tacking on more.
async function evolve(description) {
  const c = current;
  if (description.replace(/\s+/g, " ") === c.description.replace(/\s+/g, " ")) {
    const err = $("#lab-error", root);
    err.hidden = false;
    err.textContent = "Change or add something in your description first!";
    sfx.fizzle();
    return;
  }
  if (countWords(description) < 3) {
    const err = $("#lab-error", root);
    err.hidden = false;
    err.textContent = "The artist needs at least a few words!";
    sfx.fizzle();
    return;
  }
  root.innerHTML = loadingHtml(`${c.name} is evolving… 🧬`);
  try {
    await detectBackend();
    const r = await ask("creature_create", {
      writerName: get().writerName,
      description,
      name: c.name,
      sketchOnlyIfCommon: canPaint(),
      previous: { description: c.description, level: c.level, hp: c.hp, attack: c.attack, defense: c.defense, magic: c.magic },
    });
    logEvent("creature.evolve", { name: c.name, before: c.description, after: description, words: countWords(description) - countWords(c.description), stars: countStars(r.details), was: countStars(c.details), rarity: r.rarity, spells: r.spells.map((x) => x.id) });
    let next = {
      ...c,
      ...r,
      view: undefined,
      paintError: undefined,
      name: c.name,
      description,
      level: c.level + 1,
      hp: Math.max(r.hp, c.hp),
      attack: Math.max(r.attack, c.attack),
      defense: Math.max(r.defense, c.defense),
      magic: Math.max(r.magic, c.magic),
    };
    if (paintable(next)) next = await paintInto(next, "Evolved!");
    next = withSketch(next);
    saveCreature(next);
    const rarityBonus = Math.max(5, RARITY_GEMS[next.rarity] - RARITY_GEMS[c.rarity]);
    const result = award({ spells: r.spells, gems: rarityBonus, mode: "creature", text: description });
    showCard();
    if (next.painting && next.paintedLevel === next.level) sfx.level();
    confetti(50);
    await showReward({ cheer: `${c.name} EVOLVED to level ${next.level}! ${r.artistNote}`, spells: r.spells, result, mood: "wow", power: sketchLine(next), button: artTierFor(next) === "common" ? "✏️ Add details →" : "Awesome! →" });
  } catch (e) {
    showCard();
    const ta = $("#evolve-text", root);
    ta.value = description;
    ta.dispatchEvent(new Event("input"));
    const err = $("#lab-error", root);
    err.hidden = false;
    err.textContent = kidMessage(e);
  }
}
