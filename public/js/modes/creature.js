// Creature Lab: the artist draws ONLY what the writer describes.
// More details = a better drawing and stronger stats.

import { get, update, award, countWords } from "../state.js";
import { ask, kidMessage, canPaint, paint, detectBackend } from "../ai.js";
import { esc, el, $, writingDesk, wireDesk, spellChip, loadingHtml, sparkyHtml, showReward } from "../ui.js";
import { sfx, confetti } from "../fx.js";

let root, nav;
let current = null; // the creature being built

const RARITY_GEMS = { common: 5, rare: 15, epic: 30, legendary: 50 };
const ELEMENT_ICON = { fire: "🔥", water: "💧", earth: "🪨", air: "🌪️", lightning: "⚡", ice: "❄️", nature: "🌿", shadow: "🌑", light: "🌟", cosmic: "🌌", metal: "⚙️" };

const BLUEPRINT = [
  ["🫧", "Body", "shape and size"],
  ["🎨", "Colors", "and patterns"],
  ["🦴", "Special parts", "wings? horns? tentacles?"],
  ["✨", "Powers", "what can it do?"],
  ["💥", "Sounds", "what noise does it make?"],
  ["🏔️", "Home", "where does it live?"],
];

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

export function cardHtml(c) {
  const stat = (label, v) => `<div class="stat"><span>${label}</span><div class="stat-bar"><div style="width:${v}%"></div></div><b>${v}</b></div>`;
  return `<div class="creature-card rarity-${esc(c.rarity)}">
    <div class="card-top"><span class="card-name">${esc(c.name)}</span><span class="card-element" title="${esc(c.element)}">${ELEMENT_ICON[c.element] || "✨"} ${esc(c.element)}</span></div>
    <div class="card-art">${
      showsPainting(c)
        ? `<img src="${esc(c.painting)}" alt="Painting of ${esc(c.name)}"><span class="painted-badge">🎨 Painted${c.paintedLevel !== c.level ? ` at Lv ${c.paintedLevel}` : ""}</span>`
        : c.svg
          ? `<img src="${imgSrc(c.svg)}" alt="Drawing of ${esc(c.name)}">`
          : `<div class="no-art">?</div>`
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
      <h1 class="screen-title">Creature Lab</h1>
      <div class="lab-intro">
        ${sparkyHtml("happy", "small")}
        <p>Our Creature Artist is very literal. It draws <b>only</b> what you write! Write "a monster" and you get a plain blob. Write about its colors, wings, and glowing eyes, and you get something AMAZING.</p>
      </div>
      <div class="blueprint">
        <span class="label">The artist needs to know...</span>
        <ul>${BLUEPRINT.map(([i, a, b]) => `<li><span aria-hidden="true">${i}</span><b>${a}</b> ${b}</li>`).join("")}</ul>
      </div>
      <label for="creature-name" class="label">Creature name (or leave it blank and the artist will name it)</label>
      <input id="creature-name" maxlength="40" autocomplete="off" placeholder="Like Zapzilla or Fluffernova">
      ${writingDesk({ id: "creature-desc", placeholder: "My creature is...", rows: 6, goal: 40 })}
      <p class="form-error" id="lab-error" role="alert" hidden></p>
      <div class="turn-actions">
        <button class="btn btn-go btn-big" type="button" id="draw">🖌️ Bring it to life!</button>
      </div>
    </section>`),
  );
  const ta = wireDesk($(".desk", root));
  $("#draw", root).addEventListener("click", () => create(ta.value.trim(), $("#creature-name", root).value.trim()));
}

async function create(description, name) {
  if (countWords(description) < 3) {
    const err = $("#lab-error", root);
    err.hidden = false;
    err.textContent = "The artist needs at least a few words to draw anything!";
    sfx.fizzle();
    return;
  }
  root.innerHTML = loadingHtml("The Creature Artist is sketching... 🖌️");
  try {
    const r = await ask("creature_create", { writerName: get().writerName, description, name });
    const c = { id: "c" + Date.now(), ...r, description, level: 1, createdAt: Date.now() };
    update((s) => s.creatures.unshift(c));
    current = c;
    const result = award({ spells: r.spells, gems: RARITY_GEMS[r.rarity], mode: "creature", text: description });
    showCard();
    if (r.rarity === "legendary" || r.rarity === "epic") confetti(80);
    await showReward({ cheer: `You discovered ${r.name}! ${r.artistNote}`, spells: r.spells, result, mood: "wow" });
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
      <div class="card-wrap reveal">${cardHtml(c)}</div>
      <div class="upgrade-panel">
        <div class="artist-note">${sparkyHtml("happy", "small")}<p>${esc(c.artistNote)}</p></div>
        ${c.spells?.length ? `<div class="spell-list">${c.spells.map((s) => spellChip(s.id, s.quote)).join("")}</div>` : ""}
        <div id="paint-box"></div>
        <h2>🧬 Evolve ${esc(c.name)}!</h2>
        <p class="upgrade-q">${esc(c.upgradeQuestion)}</p>
        ${writingDesk({ id: "evolve-text", placeholder: "Add more details...", rows: 3, goal: 15 })}
        <p class="form-error" id="lab-error" role="alert" hidden></p>
        <div class="turn-actions">
          <button class="btn btn-ghost" type="button" id="new">🥚 New creature</button>
          <button class="btn btn-go" type="button" id="evolve">🧬 Evolve it!</button>
        </div>
        <details class="desc-so-far"><summary>What you wrote so far</summary><p>${esc(c.description)}</p></details>
      </div>
    </section>`),
  );
  const ta = wireDesk($(".desk", root));
  $("#new", root).addEventListener("click", () => {
    current = null;
    designer();
  });
  $("#evolve", root).addEventListener("click", () => evolve(ta.value.trim()));
  detectBackend().then(() => paintBox(c));
}

function saveCreature(next) {
  update((s) => {
    const i = s.creatures.findIndex((x) => x.id === next.id);
    if (i >= 0) s.creatures[i] = next;
  });
  current = next;
}

function paintBox(c) {
  const box = $("#paint-box", root);
  if (!box || current !== c || !canPaint()) return;
  const fresh = c.painting && c.paintedLevel === c.level;
  box.innerHTML = `<div class="paint-box">
    ${
      fresh
        ? `<p>🖼️ Painted! Evolve ${esc(c.name)} and the artist can paint the new version.</p>`
        : `<p>${c.painting ? `🧬 ${esc(c.name)} has evolved since the last painting!` : "✏️ That's the artist's quick sketch."} The Creature Artist can paint exactly what you wrote.</p>
           <button class="btn btn-paint" type="button" id="paint">🎨 ${c.painting ? "Paint the new version!" : "Paint it for real!"}</button>`
    }
    ${c.painting ? `<button class="link-btn" type="button" id="flip">${showsPainting(c) ? "Show the sketch" : "Show the painting"}</button>` : ""}
  </div>`;
  $("#paint", box)?.addEventListener("click", doPaint);
  $("#flip", box)?.addEventListener("click", () => {
    saveCreature({ ...c, view: showsPainting(c) ? "sketch" : "painting" });
    showCard();
  });
}

async function doPaint() {
  const c = current;
  const box = $("#paint-box", root);
  box.innerHTML = `<div class="paint-box painting-now" role="status"><span class="brush" aria-hidden="true">🖌️</span><p>The Creature Artist is painting ${esc(c.name)}... this takes a little while!</p></div>`;
  $(".card-art", root).classList.add("painting");
  $("#evolve", root).disabled = true;
  $("#new", root).disabled = true;
  sfx.click();
  try {
    const image = await paint({ name: c.name, description: c.description, habitat: c.habitat });
    if (current?.id !== c.id) return;
    saveCreature({ ...current, painting: image, paintedLevel: current.level, view: undefined });
    showCard();
    $(".card-wrap", root)?.scrollIntoView({ block: "start", behavior: "smooth" });
    sfx.level();
    confetti(70);
  } catch (e) {
    if (current?.id !== c.id) return;
    $(".card-art", root)?.classList.remove("painting");
    $("#evolve", root).disabled = false;
    $("#new", root).disabled = false;
    box.innerHTML = `<div class="paint-box"><p>${esc(e.code === "refused" ? "The paint got smudged on that one. Try changing some words and evolving it!" : kidMessage(e))}</p>
      ${e.code === "paint_limit" ? "" : `<button class="btn btn-paint" type="button" id="paint">🎨 Try painting again</button>`}</div>`;
    $("#paint", box)?.addEventListener("click", doPaint);
  }
}

async function evolve(addition) {
  const c = current;
  if (countWords(addition) < 2) {
    const err = $("#lab-error", root);
    err.hidden = false;
    err.textContent = "Write a new detail for the artist first!";
    sfx.fizzle();
    return;
  }
  root.innerHTML = loadingHtml(`${c.name} is evolving... 🧬`);
  const description = `${c.description} ${addition}`;
  try {
    const r = await ask("creature_create", {
      writerName: get().writerName,
      description,
      name: c.name,
      addition,
      previous: { description: c.description, level: c.level, hp: c.hp, attack: c.attack, defense: c.defense, magic: c.magic, upgradeQuestion: c.upgradeQuestion },
    });
    const next = {
      ...c,
      ...r,
      view: undefined,
      name: c.name,
      description,
      level: c.level + 1,
      hp: Math.max(r.hp, c.hp),
      attack: Math.max(r.attack, c.attack),
      defense: Math.max(r.defense, c.defense),
      magic: Math.max(r.magic, c.magic),
    };
    saveCreature(next);
    const rarityBonus = Math.max(5, RARITY_GEMS[next.rarity] - RARITY_GEMS[c.rarity]);
    const result = award({ spells: r.spells, gems: rarityBonus, mode: "creature", text: addition });
    showCard();
    confetti(50);
    await showReward({ cheer: `${c.name} EVOLVED to level ${next.level}! ${r.artistNote}`, spells: r.spells, result, mood: "wow" });
  } catch (e) {
    showCard();
    $("#evolve-text", root).value = addition;
    const err = $("#lab-error", root);
    err.hidden = false;
    err.textContent = kidMessage(e);
  }
}
