// Creature Lab "detail stars": the six things the artist needs to know.
// The star count, not a vague judgment, decides the art a child unlocks,
// so they always know what to add next.

export const DETAILS = [
  { id: "body", icon: "🫧", label: "Body", hint: "How big is it? What shape?" },
  { id: "colors", icon: "🎨", label: "Colors", hint: "What colors or patterns?" },
  { id: "parts", icon: "🦴", label: "Parts", hint: "Wings? Horns? A tail? How many eyes?" },
  { id: "powers", icon: "✨", label: "Powers", hint: "What can it do?" },
  { id: "sounds", icon: "💥", label: "Sounds", hint: "What noise does it make?" },
  { id: "home", icon: "🏔️", label: "Home", hint: "Where does it live?" },
];
export const DETAIL_IDS = DETAILS.map((d) => d.id);

// Stars needed for each art level.
export const STARS_FOR = { rare: 3, epic: 4, legendary: 6 };

export function rarityFromStars(n) {
  if (n >= STARS_FOR.legendary) return "legendary";
  if (n >= STARS_FOR.epic) return "epic";
  if (n >= STARS_FOR.rare) return "rare";
  return "common";
}

export const countStars = (details) => DETAIL_IDS.filter((id) => details?.[id]?.has).length;

// Quick word-pattern check so stars light up while the child types.
// The AI makes the final call when the creature is drawn.
const COLORS = "red|orange|yellow|green|blue|purple|pink|black|white|gold|golden|silver|brown|gray|grey|rainbow|teal|violet|crimson|glowing|glows|sparkly|shiny|striped|stripes|spotted|spots|neon";
const PATTERNS = {
  body: /\b(big|bigger|huge|giant|gigantic|enormous|massive|tiny|small|little|tall|long|short|fat|round|skinny|chubby|size|shaped|shape|body|scales|scaly|fur|furry|fuzzy|skin|slimy|fluffy|feathers|armor)\b/i,
  colors: new RegExp(`\\b(${COLORS})\\b`, "i"),
  parts: /\b(wings?|horns?|tails?|claws?|teeth|tooth|fangs?|eyes?|legs?|arms?|tentacles?|spikes?|spiky|beak|antlers?|fins?|heads|shell|paws?|mouths?|jaws?|hands?|feet|foot|necks?)\b/i,
  powers: /\b(can|could|power|powers|breathes?|breathing|shoots?|shooting|fires?|zaps?|blasts?|spits?|turns? into|flies|fly|flying|teleports?|invisible|freezes?|magic|lasers?|beams?|explodes?|controls?|super|strong|strength)\b/i,
  sounds: /\b(roars?|roared|roaring|growls?|screech(es)?|hiss(es)?|howls?|squeaks?|beeps?|booms?|rumbles?|buzz(es)?|chirps?|screams?|says|sounds?|loud|noise|whispers?|shrieks?)\b|\b[A-Z]{3,}!/,
  home: /\b(lives?|living|home|cave|volcano|ocean|sea|lake|river|forest|jungle|space|planet|moon|mountains?|swamp|desert|castle|city|underground|island|nest|sky|clouds?|ice|arctic)\b/i,
};

export function detectDetails(text) {
  const t = String(text || "");
  return Object.fromEntries(
    DETAIL_IDS.map((id) => {
      const m = t.match(PATTERNS[id]);
      return [id, { has: Boolean(m), quote: m ? m[0] : "" }];
    }),
  );
}

// What each star level gets you, in kid words.
export const PRIZE = { rare: "🖌️ a real painting", epic: "🎬 a movie poster", legendary: "🏆 LEGENDARY art" };

// "1 more ⭐ unlocks 🖌️ a real painting!" style message for the next level.
export function nextUnlock(stars) {
  if (stars < STARS_FOR.rare) return { need: STARS_FOR.rare - stars, icon: "🖌️", label: "a real painting" };
  if (stars < STARS_FOR.epic) return { need: STARS_FOR.epic - stars, icon: "🎬", label: "a movie poster" };
  if (stars < STARS_FOR.legendary) return { need: STARS_FOR.legendary - stars, icon: "🏆", label: "LEGENDARY art" };
  return null;
}

export function starsHtml(details, { live = false } = {}) {
  return `<ul class="detail-stars${live ? " live" : ""}" aria-label="Detail stars">${DETAILS.map(
    (d) => `<li class="${details?.[d.id]?.has ? "lit" : ""}" data-detail="${d.id}" title="${d.hint}"><span class="star" aria-hidden="true">${details?.[d.id]?.has ? "⭐" : "☆"}</span><span class="d-icon" aria-hidden="true">${d.icon}</span>${d.label}</li>`,
  ).join("")}</ul>`;
}

// Light the stars live while the child types in `textarea`. `base` holds
// stars already earned (confirmed by the AI), which stay lit. With
// `original`, only words added since then can light a new star, so a star
// the AI didn't award never lights up by itself.
export function wireStars(container, textarea, { base = {}, original = null, onCount = () => {} } = {}) {
  const before = original === null ? null : detectDetails(original);
  const update = () => {
    const found = detectDetails(textarea.value);
    const fresh = (id) => found[id].has && !(before && before[id].has);
    const merged = Object.fromEntries(DETAIL_IDS.map((id) => [id, { has: Boolean(base[id]?.has || fresh(id)) }]));
    container.querySelectorAll("[data-detail]").forEach((li) => {
      const has = merged[li.dataset.detail].has;
      if (has && !li.classList.contains("lit")) li.classList.add("pop-star");
      li.classList.toggle("lit", has);
      li.querySelector(".star").textContent = has ? "⭐" : "☆";
    });
    onCount(countStars(merged));
  };
  textarea.addEventListener("input", update);
  update();
}
