// The library: finished books, creature cards, and the spellbook.

import { get } from "../state.js";
import { SPELLS, rankFor, RANKS } from "../spells.js";
import { esc, el, $, $$ } from "../ui.js";
import { sfx, speak, stopSpeaking, canSpeak } from "../fx.js";
import { cardHtml } from "./creature.js";

let root, nav;

export function render(r, n) {
  root = r;
  nav = n;
  const tab = n.params?.tab || "books";
  if (n.params?.open) return openBook(n.params.open);
  draw(tab);
}

function draw(tab) {
  const s = get();
  root.innerHTML = "";
  root.appendChild(
    el(`<section class="library">
      <h1 class="screen-title">My Library</h1>
      <div class="tabs" role="tablist">
        <button role="tab" type="button" data-tab="books" aria-selected="${tab === "books"}">📚 Books</button>
        <button role="tab" type="button" data-tab="creatures" aria-selected="${tab === "creatures"}">🃏 Creature Cards</button>
        <button role="tab" type="button" data-tab="spells" aria-selected="${tab === "spells"}">📖 Spellbook</button>
      </div>
      <div class="tab-body">${tab === "books" ? booksHtml(s) : tab === "creatures" ? creaturesHtml(s) : spellbookHtml(s)}</div>
    </section>`),
  );
  $$("[role=tab]", root).forEach((b) => b.addEventListener("click", () => (sfx.click(), draw(b.dataset.tab))));
  $$("[data-book]", root).forEach((b) => b.addEventListener("click", () => openBook(b.dataset.book)));
  $$("[data-creature]", root).forEach((b) => b.addEventListener("click", () => nav.go("creature", { creatureId: b.dataset.creature })));
  $$("[data-go]", root).forEach((b) => b.addEventListener("click", () => nav.go(b.dataset.go)));
}

function booksHtml(s) {
  if (!s.stories.length) {
    return `<div class="empty">No books yet! Finish a Story Quest and it will appear here with your name on the cover.
      <button class="btn btn-go" type="button" data-go="quest">Start a Story Quest</button></div>`;
  }
  return `<div class="shelf">${s.stories
    .map(
      (b, i) => `<button class="book" type="button" data-book="${b.id}" style="--cover:${COVERS[i % COVERS.length]}">
        <span class="book-title">${esc(b.title)}</span>
        <span class="book-author">by ${esc(s.writerName)}</span>
        <span class="book-meta">${b.words} words · 🏆</span>
      </button>`,
    )
    .join("")}</div>`;
}

const COVERS = ["#e8553d", "#2ec4b6", "#7b61ff", "#ff9f1c", "#5a8dee", "#ff5d8f"];

function creaturesHtml(s) {
  if (!s.creatures.length) {
    return `<div class="empty">No creature cards yet! Invent one in the Creature Lab.
      <button class="btn btn-go" type="button" data-go="creature">Go to Creature Lab</button></div>`;
  }
  return `<div class="card-grid">${s.creatures
    .map((c) => `<button class="card-btn" type="button" data-creature="${c.id}" aria-label="Open ${esc(c.name)}">${cardHtml(c)}</button>`)
    .join("")}</div>`;
}

function spellbookHtml(s) {
  const learned = SPELLS.filter((sp) => s.spellCounts[sp.id] > 0).length;
  return `<p class="spellbook-intro">You've learned <b>${learned} of ${SPELLS.length}</b> spells. Cast a spell ${RANKS.map((r) => `${r.min} times for ${r.icon} ${r.name}`).reverse().join(", ")}.</p>
  <div class="spellbook">${SPELLS.map((sp) => {
    const n = s.spellCounts[sp.id] || 0;
    const rank = rankFor(n);
    return `<div class="spell-page ${n ? "" : "locked"}" style="--spell:${sp.color}">
      <div class="spell-page-head"><span class="spell-big" aria-hidden="true">${n ? sp.icon : "❔"}</span>
        <div><h3>${esc(sp.name)}</h3><span class="cast-count">${n ? `Cast ${n} time${n === 1 ? "" : "s"}` : "Not learned yet"} ${rank ? `· ${rank.icon} ${rank.name}` : ""}</span></div></div>
      <p>${esc(sp.teaches)}</p>
      <p class="spell-example">Like: <i>${esc(sp.example)}</i></p>
    </div>`;
  }).join("")}</div>`;
}

function openBook(id) {
  const s = get();
  const b = s.stories.find((x) => x.id === id);
  if (!b) return draw("books");
  root.innerHTML = "";
  root.appendChild(
    el(`<section class="reader">
      <button class="btn btn-ghost btn-small" type="button" id="back">← All books</button>
      <article class="storybook finished">
        <header class="book-cover-head">
          <h1>${esc(b.title)}</h1>
          <p class="by">by ${esc(s.writerName)} and Sparky</p>
          <p class="award">🏆 ${esc(b.award)}</p>
        </header>
        ${b.story
          .map((p) =>
            p.author === "ai"
              ? `<section class="page page-ai">${p.emojis ? `<div class="scene" aria-hidden="true">${esc(p.emojis)}</div>` : ""}<p>${esc(p.text)}</p></section>`
              : `<section class="page page-kid"><span class="byline">✍️ by ${esc(s.writerName)}</span><p>${esc(p.text)}</p></section>`,
          )
          .join("")}
        <p class="the-end">The End</p>
      </article>
      ${canSpeak() ? `<button class="btn btn-go" type="button" id="read-all">🔊 Read my whole book to me</button>` : ""}
    </section>`),
  );
  $("#back", root).addEventListener("click", () => (stopSpeaking(), draw("books")));
  $("#read-all", root)?.addEventListener("click", (e) => {
    if (e.target.dataset.reading) {
      stopSpeaking();
      delete e.target.dataset.reading;
      e.target.textContent = "🔊 Read my whole book to me";
      return;
    }
    e.target.dataset.reading = "1";
    e.target.textContent = "⏹ Stop reading";
    speak(`${b.title}. By ${s.writerName}. ${b.story.map((p) => p.text).join(" ")} The End.`, {
      onend: () => {
        delete e.target.dataset.reading;
        e.target.textContent = "🔊 Read my whole book to me";
      },
    });
  });
}
