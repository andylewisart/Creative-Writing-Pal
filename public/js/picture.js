// The picture test, live: spot fuzzy words ("really loud", "a big monster")
// while the writer types, so they know what to make specific before Sparky
// judges it. The AI makes the real call; this is only a quick hint.

const FUZZY = {
  big: "How big? As big as what?",
  huge: "How huge? As big as what?",
  giant: "How giant? As big as what?",
  small: "How small? As small as what?",
  little: "How little? As small as what?",
  loud: "How loud? What does it sound like?",
  quiet: "How quiet? What does it sound like?",
  fast: "How fast? As fast as what?",
  cool: "What makes it cool? Show me!",
  awesome: "What makes it awesome? Show me!",
  amazing: "What makes it amazing? Show me!",
  scary: "What makes it scary? Show me!",
  good: "What makes it good? Show me!",
  bad: "What makes it bad? Show me!",
  nice: "What makes it nice? Show me!",
  strong: "How strong? Show me what it can smash!",
};
// Intensifiers, with common 3rd-grade spellings, since they only make fuzzy words louder.
const BOOST = "really|realy|relly|rely|rilly|very|vary|super|extra";
const FUZZY_RE = new RegExp(`\\b(?:(${BOOST})\\s+)?(${Object.keys(FUZZY).join("|")})\\b`, "gi");
const BE = /^(was|is|were|are|be|so|and|the|a|an)$/i;

// [{quote, ask}] for up to `max` fuzzy spots. Comparisons ("as big as a
// bus", "bigger than") pass the picture test, so they aren't flagged.
export function findFuzzy(text, max = 2) {
  const t = String(text || "");
  const out = [];
  for (const m of t.matchAll(FUZZY_RE)) {
    const before = t.slice(0, m.index);
    const after = t.slice(m.index + m[0].length);
    if (/\bas\s+$/i.test(before) || /^\s+(as|than)\b/i.test(after)) continue;
    const next = after.match(/^\s+([A-Za-z']+)/)?.[1];
    const prev = before.match(/([A-Za-z']+)\s+$/)?.[1];
    const quote = next && !/^(and|but|then|so|as)$/i.test(next) ? `${m[0]} ${next}` : prev && !BE.test(prev) ? `${prev} ${m[0]}` : m[0];
    out.push({ quote, ask: FUZZY[m[2].toLowerCase()] });
    if (out.length >= max) break;
  }
  return out;
}

// One short line for under a writing box, or "" when nothing looks fuzzy.
export function fuzzyHint(text) {
  const f = findFuzzy(text, 1)[0];
  return f ? `🔍 "${f.quote}" is fuzzy. ${f.ask}` : "";
}
