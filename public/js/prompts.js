// Prompts and output schemas for every AI task in the game.
// Shared by the browser (artifact mode) and server.js (API-key mode),
// so both backends behave the same way.

import { SPELL_IDS } from "./spells.js";

export const GUIDE = `You are the Story Guide inside "Story Quest", a creative-writing game for a 3rd grader (about 8 years old) who loves magic, fantasy, creatures, and sci-fi. Their writing tends to be short and literal. Your job is to make writing feel like magic and to grow their writing one small, fun step at a time. You speak through Sparky, a friendly little dragon who eats words and grows when fed great writing.

How to talk:
- Short sentences, vivid words, around a 2nd-3rd grade reading level. Playful and excited, never babyish, never preachy.
- Sparky's lines are 1-3 sentences. Sparky can be silly (dragon burps, snacking on words), and uses the writer's name now and then.

Teaching rules (follow every one):
1. Fun comes first. Celebrate effort and imagination.
2. Never correct spelling, grammar, capitalization, or punctuation, and never mention mistakes. Read misspelled words generously as the writer meant them.
3. Praise specifically: quote or name the exact words they wrote that worked. "I love 'a dragon as big as a school bus'!" beats "Great job!"
4. Ask, don't tell. To nudge for more, ask ONE curious question about a single detail (what it looked or sounded or felt like, what someone said, how someone felt). Never give a list of fixes.
5. Never write their part for them. Ideas you offer are questions or choices, not finished sentences for them to copy.
6. Their ideas are canon. If they add a laser-shooting penguin, the story now has a laser-shooting penguin. Build on their ideas; never undo or ignore them.
7. Kid-safe: cartoon peril, spooky-fun, and fantasy battles are fine. No gore, nothing truly frightening, no romance. If they write something mean or inappropriate, steer the story somewhere fun without lecturing.
8. In your own story writing, model the spells below so they see what great writing looks like.

The spells (writing moves) the writer can cast. Use these ids exactly:
- sight: colors, shapes, sizes, or what something looks like ("a glowing purple door")
- sound: sound words or what something sounds like ("KABOOM", "the engine hummed")
- senses: smell, taste, or touch/feel ("the slime felt cold and sticky")
- talk: a character says something out loud (dialogue, with or without quotation marks)
- feelings: how a character feels or what they think inside ("Max was so nervous his tail shook")
- likea: a comparison using like or as ("fast as a comet", "teeth like swords")
- power: a strong, exciting action verb instead of a plain one ("zoomed", "smashed", "snatched")
- twist: a surprise or unexpected idea that changes what is happening
When you award spells for the writer's text, be generous with real attempts but honest: only award a spell when their own words contain an example, even a simple one. Each awarded spell needs a short quote of their words that earned it. Award each spell id at most once per piece of writing.`;

const spellEnum = { type: "string", enum: SPELL_IDS };

const spellsArray = {
  type: "array",
  description: "Spells found in the writer's own words, at most one entry per spell id",
  items: {
    type: "object",
    properties: {
      id: spellEnum,
      quote: { type: "string", description: "the writer's words (a few words) that earned it" },
    },
    required: ["id", "quote"],
    additionalProperties: false,
  },
};

const challenge = {
  type: "object",
  properties: {
    spell: spellEnum,
    prompt: { type: "string", description: "one short, exciting question that invites this spell" },
  },
  required: ["spell", "prompt"],
  additionalProperties: false,
};

function obj(properties) {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

const str = (description) => ({ type: "string", description });
const int = (description) => ({ type: "integer", description });

function storyText(story, writerName) {
  if (!story?.length) return "(nothing yet)";
  return story
    .map((p) =>
      p.author === "kid"
        ? `[${writerName || "The writer"} wrote]: ${p.text}`
        : `[Story Guide wrote]: ${p.text}`,
    )
    .join("\n\n");
}

function heroLine(q) {
  const h = q.hero || {};
  return `Hero: ${h.name || "a hero"}, who is ${h.kind || "an adventurer"}. Special power, in the writer's words: "${h.power || "a secret power"}".${q.sidekick ? ` Sidekick: ${q.sidekick}.` : ""}`;
}

// Each task: build(payload) -> instructions, schema, and the tier/effort to use.
export const TASKS = {
  quest_start: {
    tier: "default",
    effort: "low",
    build: (p) => `TASK: Begin a new co-written adventure story.

Writer's name: ${p.writerName}
World: ${p.world}
${heroLine(p)}

Write Chapter 1 (90-140 words). Introduce the hero in the world with vivid details, then end on an exciting cliffhanger that asks what the hero does next, so the writer can take over. Use at least three spells in your own writing. Also pick a fun working title, three emojis that show the scene, and a bonus challenge: one spell that would fit the writer's next part perfectly, with a short, exciting question inviting it.`,
    schema: obj({
      title: str("fun working title for the story, max 6 words"),
      chapter: str("chapter 1 text, 90-140 words"),
      sceneEmojis: str("exactly three emojis that show the scene"),
      bonus: challenge,
    }),
  },

  quest_react: {
    tier: "default",
    effort: "low",
    build: (p) => `TASK: React to the writer's newest part of the story.

Writer's name: ${p.writerName}
${heroLine(p)}

Story so far:
${storyText(p.story, p.writerName)}

The bonus challenge for this turn was the "${p.bonus?.spell}" spell: "${p.bonus?.prompt}"

The writer's newest part:
"""
${p.kidText}
"""

Return:
- cheer: Sparky's excited reaction (1-3 sentences) that quotes or names something specific they wrote.
- spells: the spells their newest part contains.
- bonusDone: true if they cast the bonus challenge spell.
- powerUp: ONE curious question inviting them to add one more detail to THIS part, using a spell they did not use yet. Keep it short and exciting, and make it about something they actually wrote.`,
    schema: obj({
      cheer: str("Sparky's specific, excited reaction"),
      spells: spellsArray,
      bonusDone: { type: "boolean" },
      powerUp: challenge,
    }),
  },

  quest_continue: {
    tier: "default",
    effort: "low",
    build: (p) => {
      const turnsLeft = p.totalTurns - p.turnNumber;
      const pacing =
        turnsLeft <= 0
          ? "This was the writer's FINAL part: they wrote the ending. Write a short closing scene (50-90 words) that honors their ending exactly as they wrote it and ends with the words 'The End.' The bonus should invite one last detail anyway."
          : turnsLeft === 1
            ? "The writer has ONE part left. Write the next chapter (80-130 words) building up to the big final moment, and end by asking how the adventure ends."
            : "Write the next chapter (80-130 words). Build on what they wrote, add a new surprise, problem, or creature, and end on a cliffhanger asking what the hero does next.";
      return `TASK: Continue the co-written story.

Writer's name: ${p.writerName}
${heroLine(p)}

Story so far:
${storyText(p.story, p.writerName)}

The writer's newest part (already shown above as their last part):
"""
${p.kidText}
"""
${
  p.addition
    ? `They powered up their part by adding this answer to the question "${p.powerUp?.prompt}":
"""
${p.addition}
"""
Give an additionCheer that names what they added, and list the spells in the addition only.`
    : "They did not add a power-up, so additionCheer is an empty string and additionSpells is empty."
}

This is turn ${p.turnNumber} of ${p.totalTurns}. ${pacing}
Use at least three spells in your own writing. Pick three emojis that show the new scene, and a bonus challenge for their next part.`;
    },
    schema: obj({
      additionCheer: str("Sparky's reaction to the power-up addition, or empty string"),
      additionSpells: spellsArray,
      chapter: str("the next chapter text"),
      sceneEmojis: str("exactly three emojis that show the scene"),
      bonus: challenge,
    }),
  },

  quest_finish: {
    tier: "default",
    effort: "low",
    build: (p) => `TASK: The co-written story is finished. Celebrate it.

Writer's name: ${p.writerName}
${heroLine(p)}

Whole story:
${storyText(p.story, p.writerName)}

Return:
- titles: three fun title ideas for the book, based on what the writer added.
- favoriteLine: the single best line the WRITER wrote (quote their words exactly, from their parts only).
- whyFavorite: one sentence from Sparky on why that line is great, naming the spell it uses.
- award: a made-up, magical award name for this story (like "The Golden Quill of Thunder Words").
- nextTime: one friendly, specific tip for their next story, phrased as an exciting challenge (not a correction).`,
    schema: obj({
      titles: { type: "array", items: { type: "string" } },
      favoriteLine: str("exact quote of the writer's best line"),
      whyFavorite: str("why it is great"),
      award: str("magical award name"),
      nextTime: str("challenge for next time"),
    }),
  },

  spark: {
    tier: "quick",
    effort: "low",
    build: (p) => `TASK: The writer is stuck and tapped the crystal ball for ideas.

Writer's name: ${p.writerName}
Where they are: ${p.context}
${p.draft ? `What they have written so far for this part: "${p.draft}"` : "They have not written anything for this part yet."}

Give exactly three short idea sparks (each under 15 words). Each spark is a curious QUESTION or a "What if...?" that helps them imagine, never a finished sentence to copy. Make them different from each other: one wild and silly, one about a sense or a feeling, one surprising twist.`,
    schema: obj({
      sparks: { type: "array", items: { type: "string" } },
    }),
  },

  epic_judge: {
    tier: "quick",
    effort: "low",
    build: (p) => `TASK: Mini-game "Boring-to-EPIC". The writer was given a boring sentence and rewrote it to be as epic as possible.

Writer's name: ${p.writerName}
Boring sentence: "${p.boring}"
${p.previous?.length ? `Their earlier tries this round: ${p.previous.map((t) => `"${t.text}" (scored ${t.score})`).join("; ")}` : ""}
Their epic version:
"""
${p.attempt}
"""

Score its epic-ness from 1 to 10 with the Epic-o-meter. Be generous to effort: 1-3 barely changed, 4-5 one good detail, 6-7 two or three spells, 8-9 vivid with three or more spells, 10 jaw-droppingly creative. If it beats an earlier try, celebrate the improvement.
Return:
- score: integer 1-10.
- cheer: Sparky's excited reaction quoting their best words (1-2 sentences).
- spells: the spells their version contains.
- announcer: a dramatic movie-trailer opener (under 12 words) to say before their sentence is read aloud, like "In a world where nothing is boring...".
- nextSpell: one spell they did not use, with a short question that could push the score higher.`,
    schema: obj({
      score: int("epic score from 1 to 10"),
      cheer: str("Sparky's reaction"),
      spells: spellsArray,
      announcer: str("movie-trailer opener"),
      nextSpell: challenge,
    }),
  },

  creature_create: {
    tier: "default",
    effort: "medium",
    build: (p) => `TASK: Creature Lab. The writer described a creature. Turn it into a collectible creature card and draw it.

Writer's name: ${p.writerName}
${p.name ? `Creature name chosen by the writer: ${p.name}` : "The writer did not name it; invent a fun name based on the description."}
${
  p.previous
    ? `This is an UPGRADE. Earlier description: "${p.previous.description}" (it was level ${p.previous.level}, stats HP ${p.previous.hp} / ATK ${p.previous.attack} / DEF ${p.previous.defense} / MAGIC ${p.previous.magic}).
The writer answered the question "${p.previous.upgradeQuestion}" and added:
"""
${p.addition}
"""
Keep the same creature and name, add the new details, and raise the stats to reward the new details.`
    : ""
}
Full description so far:
"""
${p.description}
"""

The big rule of Creature Lab: the Creature Artist draws ONLY what the writer described. Details they wrote appear in the drawing. Anything they did not describe stays plain and simple (a basic round body, default eyes). That is what makes adding details exciting.

Return:
- name, species (a fun 1-3 word kind of creature), element (one of the listed options), habitat (where it lives, from their words if given).
- rarity: common for a bare-bones description, rare for a few details, epic for lots of details, legendary for an amazingly detailed and creative one.
- hp, attack, defense, magic: integers from 10 to 100. More vivid details mean higher stats. Upgrades always go up.
- abilities: 1-3 abilities taken from their description, each with a cool name and a one-sentence effect.
- spells: the spells in their writing (for an upgrade, only the newly added words).
- artistNote: Sparky's comment (1-2 sentences) naming a detail that made the drawing better, plus one thing the artist had to guess.
- upgradeQuestion: ONE curious question about a detail the artist could not draw yet.
- svg: the drawing. Rules: a complete <svg> element with xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 200 200"; cute, bold cartoon style with dark outlines and flat colors; a simple background shape for the habitat; the creature centered and large with big friendly eyes; NO text, NO <script>, NO <image>, NO external links, NO filters or animation; under 5000 characters.`,
    schema: obj({
      name: str("creature name"),
      species: str("kind of creature"),
      element: {
        type: "string",
        enum: ["fire", "water", "earth", "air", "lightning", "ice", "nature", "shadow", "light", "cosmic", "metal"],
      },
      habitat: str("where it lives"),
      rarity: { type: "string", enum: ["common", "rare", "epic", "legendary"] },
      hp: int("10-100"),
      attack: int("10-100"),
      defense: int("10-100"),
      magic: int("10-100"),
      abilities: {
        type: "array",
        items: obj({ name: str("ability name"), effect: str("one sentence") }),
      },
      spells: spellsArray,
      artistNote: str("Sparky's comment on the drawing"),
      upgradeQuestion: str("one question to add a detail"),
      svg: str("the SVG drawing"),
    }),
  },
};

// Turn a JSON schema into a compact shape description, for backends that
// can't enforce a schema (the artifact's Claude connection).
export function describeShape(schema, indent = "") {
  if (schema.enum) return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (schema.type === "string") return "string";
  if (schema.type === "integer") return "integer";
  if (schema.type === "boolean") return "true | false";
  if (schema.type === "array") return `[ ${describeShape(schema.items, indent)}, ... ]`;
  if (schema.type === "object") {
    const inner = indent + "  ";
    const lines = Object.entries(schema.properties).map(
      ([k, v]) => `${inner}"${k}": ${describeShape(v, inner)}`,
    );
    return `{\n${lines.join(",\n")}\n${indent}}`;
  }
  return "any";
}

export function fullPrompt(task, payload) {
  const t = TASKS[task];
  return `${GUIDE}

${t.build(payload)}

Reply with only one JSON object in exactly this shape, and no other text:
${describeShape(t.schema)}`;
}

// ---- Normalizers: make any backend's reply safe to render. ----

const clampInt = (v, lo, hi, dflt) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};
const s = (v, dflt = "") => (typeof v === "string" ? v : dflt);

export function cleanSpells(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .filter((x) => x && SPELL_IDS.includes(x.id) && !seen.has(x.id) && seen.add(x.id))
    .map((x) => ({ id: x.id, quote: s(x.quote) }));
}

function cleanChallenge(c) {
  return {
    spell: SPELL_IDS.includes(c?.spell) ? c.spell : "sight",
    prompt: s(c?.prompt, "What does it look like?"),
  };
}

export function sanitizeSvg(svg) {
  let out = s(svg).trim();
  const start = out.indexOf("<svg");
  const end = out.lastIndexOf("</svg>");
  if (start < 0 || end < 0) return "";
  out = out.slice(start, end + 6);
  if (!/xmlns=/.test(out.slice(0, 200))) out = out.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return out;
}

export const NORMALIZE = {
  quest_start: (r) => ({
    title: s(r.title, "A Brand-New Adventure"),
    chapter: s(r.chapter),
    sceneEmojis: s(r.sceneEmojis, "✨🗺️✨"),
    bonus: cleanChallenge(r.bonus),
  }),
  quest_react: (r) => ({
    cheer: s(r.cheer, "Chomp chomp! Those words were delicious!"),
    spells: cleanSpells(r.spells),
    bonusDone: r.bonusDone === true,
    powerUp: cleanChallenge(r.powerUp),
  }),
  quest_continue: (r) => ({
    additionCheer: s(r.additionCheer),
    additionSpells: cleanSpells(r.additionSpells),
    chapter: s(r.chapter),
    sceneEmojis: s(r.sceneEmojis, "✨📖✨"),
    bonus: cleanChallenge(r.bonus),
  }),
  quest_finish: (r) => ({
    titles: (Array.isArray(r.titles) ? r.titles : []).map((t) => s(t)).filter(Boolean).slice(0, 3),
    favoriteLine: s(r.favoriteLine),
    whyFavorite: s(r.whyFavorite),
    award: s(r.award, "The Golden Quill of Awesome"),
    nextTime: s(r.nextTime),
  }),
  spark: (r) => ({
    sparks: (Array.isArray(r.sparks) ? r.sparks : []).map((t) => s(t)).filter(Boolean).slice(0, 3),
  }),
  epic_judge: (r) => ({
    score: clampInt(r.score, 1, 10, 5),
    cheer: s(r.cheer, "Whoa, that's getting epic!"),
    spells: cleanSpells(r.spells),
    announcer: s(r.announcer, "In a world where nothing is boring..."),
    nextSpell: cleanChallenge(r.nextSpell),
  }),
  creature_create: (r) => ({
    name: s(r.name, "Mystery Creature"),
    species: s(r.species, "Unknown Beast"),
    element: s(r.element, "cosmic"),
    habitat: s(r.habitat, "somewhere mysterious"),
    rarity: ["common", "rare", "epic", "legendary"].includes(r.rarity) ? r.rarity : "common",
    hp: clampInt(r.hp, 10, 100, 30),
    attack: clampInt(r.attack, 10, 100, 30),
    defense: clampInt(r.defense, 10, 100, 30),
    magic: clampInt(r.magic, 10, 100, 30),
    abilities: (Array.isArray(r.abilities) ? r.abilities : [])
      .slice(0, 3)
      .map((a) => ({ name: s(a?.name, "Mystery Move"), effect: s(a?.effect) })),
    spells: cleanSpells(r.spells),
    artistNote: s(r.artistNote),
    upgradeQuestion: s(r.upgradeQuestion, "What color is it?"),
    svg: sanitizeSvg(r.svg),
  }),
};
