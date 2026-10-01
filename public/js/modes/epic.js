// Boring-to-EPIC: zap a boring sentence until the Epic-o-meter hits 10.

import { get, update, award, countWords } from "../state.js";
import { ask, kidMessage } from "../ai.js";
import { BORING_SENTENCES } from "../worlds.js";
import { esc, el, $, writingDesk, wireDesk, spellChip, challengeHtml, loadingHtml, sparkyHtml, speakTip, fuzzyHtml, wireTipButtons } from "../ui.js";
import { sfx, speak, canSpeak, confetti } from "../fx.js";
import { logEvent } from "../log.js";
import { fuzzyHint } from "../picture.js";

let root;
let round = null; // { boring, tries: [{text, score}], best, spellsAwarded: [] }

export function render(r) {
  root = r;
  if (!round) newRound();
  draw();
}

function newRound() {
  const last = round?.boring;
  let boring;
  do boring = BORING_SENTENCES[Math.floor(Math.random() * BORING_SENTENCES.length)];
  while (boring === last);
  round = { boring, tries: [], best: 0, spellsAwarded: [] };
}

function draw(text = "") {
  const lastTry = round.tries[round.tries.length - 1];
  root.innerHTML = "";
  root.appendChild(
    el(`<section class="epic">
      <h1 class="screen-title">Boring-to-EPIC</h1>
      <div class="boring-machine">
        <div class="machine-label">BORING-O-TRON 3000 <span aria-hidden="true">🥱</span></div>
        <p class="boring-sentence">${esc(round.boring)}</p>
        <p class="machine-hint">Yawn. Make it EPIC.</p>
      </div>
      <div id="meter-zone">${meterHtml(lastTry?.score || 0, round.best)}</div>
      <div id="result-zone"></div>
      <div class="epic-desk" id="epic-desk">
        ${writingDesk({ id: "epic-text", placeholder: "Make it EPIC...", rows: 3, goal: 20, value: text })}
        <p class="story-power" id="epic-fuzzy" aria-live="polite"></p>
        <p class="form-error" id="epic-error" role="alert" hidden></p>
        <div class="turn-actions">
          <button class="btn btn-ghost" type="button" id="new-boring">🎲 New one</button>
          <button class="btn btn-go" type="button" id="zap">⚡ EPIC-IFY!</button>
        </div>
      </div>
    </section>`),
  );
  const ta = wireDesk($(".desk", root));
  const hint = $("#epic-fuzzy", root);
  const showHint = () => (hint.textContent = fuzzyHint(ta.value));
  ta.addEventListener("input", showHint);
  showHint();
  $("#zap", root).addEventListener("click", () => judge(ta.value.trim()));
  $("#new-boring", root).addEventListener("click", () => {
    sfx.click();
    newRound();
    draw();
  });
}

function meterHtml(score, best) {
  return `<div class="epic-meter" aria-label="Epic-o-meter: ${score} out of 10">
    <span class="meter-label">EPIC-O-METER</span>
    <div class="meter-bars">${Array.from({ length: 10 }, (_, i) => `<span class="bar ${i < score ? "lit" : ""}" style="--i:${i}"></span>`).join("")}</div>
    <span class="meter-score">${score || "?"}<small>/10</small></span>
    ${best ? `<span class="meter-best">Best this round: ${best}</span>` : ""}
  </div>`;
}

async function judge(text) {
  const err = $("#epic-error", root);
  if (countWords(text) < 2) {
    err.hidden = false;
    err.textContent = "Type your epic version first!";
    sfx.fizzle();
    return;
  }
  const desk = $("#epic-desk", root);
  desk.hidden = true;
  $("#result-zone", root).innerHTML = loadingHtml("Measuring the epic-ness... ⚡⚡⚡");
  let r;
  try {
    r = await ask("epic_judge", { writerName: get().writerName, boring: round.boring, attempt: text, previous: round.tries });
  } catch (e) {
    desk.hidden = false;
    $("#result-zone", root).innerHTML = "";
    err.hidden = false;
    err.textContent = kidMessage(e);
    return;
  }
  const prevBest = round.best;
  logEvent("epic.try", { boring: round.boring, text, words: countWords(text), score: r.score, best: prevBest, tryNo: round.tries.length + 1, spells: r.spells.map((x) => x.id), cheer: r.cheer, next: r.nextSpell.prompt, tip: r.tip });
  round.tries.push({ text, score: r.score });
  round.best = Math.max(prevBest, r.score);

  // Gems only for improving your best, and spells only the first time each round.
  const freshSpells = r.spells.filter((s) => !round.spellsAwarded.includes(s.id));
  round.spellsAwarded.push(...freshSpells.map((s) => s.id));
  const result = award({ spells: freshSpells, gems: Math.max(0, r.score - prevBest) * 5, mode: "epic", text });
  if (r.score > get().epicBest) update((s) => (s.epicBest = r.score));

  // Animate the meter filling up.
  const zone = $("#meter-zone", root);
  zone.innerHTML = meterHtml(0, round.best);
  const bars = zone.querySelectorAll(".bar");
  bars.forEach((b, i) =>
    setTimeout(() => {
      if (i < r.score) {
        b.classList.add("lit");
        sfx.gem();
      }
    }, 150 * i),
  );
  setTimeout(() => {
    zone.querySelector(".meter-score").innerHTML = `${r.score}<small>/10</small>`;
    if (r.score >= 9) {
      confetti(r.score === 10 ? 120 : 60);
      sfx.level();
    }
  }, 150 * r.score + 100);

  const improved = prevBest && r.score > prevBest;
  // Under 7, Sparky says out loud what would push the score higher.
  const low = r.score < 7;
  $("#result-zone", root).innerHTML = `<div class="epic-result">
    <div class="epic-react">${sparkyHtml(r.score >= 7 ? "wow" : "happy", "small bounce")}
      <div><p class="cheer">${r.score === 10 ? "🏆 LEGENDARY! " : improved ? "📈 NEW BEST! " : ""}${esc(r.cheer)}</p>
      ${result.gained ? `<p class="gem-gain-inline">+${result.gained} 💎</p>` : ""}</div>
    </div>
    <blockquote class="their-sentence">${esc(text)}</blockquote>
    ${r.spells.length ? `<div class="spell-list">${r.spells.map((s) => spellChip(s.id, s.quote)).join("")}</div>` : ""}
    ${low && r.tip ? `<p class="epic-tip">💡 ${esc(r.tip)}</p>${fuzzyHtml([], r.tip)}` : r.score < 10 ? challengeHtml(r.nextSpell, "Push it higher with the") : ""}
    <div class="turn-actions">
      ${canSpeak() ? `<button class="btn btn-ghost" type="button" id="trailer">🎬 Movie-trailer voice</button>` : ""}
      <button class="btn btn-ghost" type="button" id="again">✏️ Make it even MORE epic</button>
      <button class="btn btn-go" type="button" id="next">🎲 Next boring sentence</button>
    </div>
  </div>`;
  if (result.newSpells.length || result.levelUp) {
    const note = el(`<p class="new-spell">${result.levelUp ? `🎉 Sparky grew into a ${esc(result.levelUp.name)}!` : "📖 New spell learned! Check your Spellbook."}</p>`);
    $(".epic-result", root).prepend(note);
    sfx.spell();
  }
  wireTipButtons(root);
  if (low) speakTip(r.tip, "epic");
  $("#trailer", root)?.addEventListener("click", () => {
    logEvent("epic.trailer");
    speak(`${r.announcer} ... ${text}`, { style: "trailer" });
  });
  $("#again", root).addEventListener("click", () => draw(text));
  $("#next", root).addEventListener("click", () => {
    newRound();
    draw();
  });
}
