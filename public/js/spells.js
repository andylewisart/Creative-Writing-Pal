// The eight writing "spells" — each one is a real writing craft move.
// The AI awards them when it spots them in the young writer's text.

export const SPELLS = [
  {
    id: "sight",
    demo: { before: "The ship landed.", after: "The <b>silver, spiky</b> ship landed." },
    name: "Color Spell",
    icon: "🎨",
    color: "#ff9f1c",
    teaches: "Describe what things look like: color, shape, size.",
    example: "a glowing purple door with silver spikes",
    ask: "What does it look like? What color or shape is it?",
  },
  {
    id: "sound",
    demo: { before: "The robot fell over.", after: "The robot fell over with a <b>loud CLANG!</b>" },
    name: "Sound Spell",
    icon: "💥",
    color: "#ff5d8f",
    teaches: "Use sound words, or say what something sounds like.",
    example: "KABOOM! The engine hummed and hissed.",
    ask: "What does it sound like? BOOM? Whoosh? Hiss?",
  },
  {
    id: "senses",
    demo: { before: "The cave was dark.", after: "The cave was dark and <b>smelled like wet socks</b>." },
    name: "Senses Spell",
    icon: "👃",
    color: "#7bd389",
    teaches: "Tell how something smells, tastes, or feels to touch.",
    example: "The slime felt cold and sticky and smelled like old socks.",
    ask: "How does it smell, taste, or feel to touch?",
  },
  {
    id: "talk",
    demo: { before: 'The knight saw the dragon.', after: 'The knight saw the dragon and <b>yelled, "Run!"</b>' },
    name: "Talking Spell",
    icon: "💬",
    color: "#3ddbd9",
    teaches: "Let a character say something out loud.",
    example: "\"Run!\" shouted the robot.",
    ask: "What does someone SAY right now?",
  },
  {
    id: "feelings",
    demo: { before: "Mia opened the box.", after: "Mia opened the box <b>with shaky, nervous hands</b>." },
    name: "Feelings Spell",
    icon: "💓",
    color: "#f78fb3",
    teaches: "Show how a character feels or what they think inside.",
    example: "Max was so nervous his tail wouldn't stop shaking.",
    ask: "How does your hero feel inside right now?",
  },
  {
    id: "likea",
    demo: { before: "The dinosaur was big.", after: "The dinosaur was <b>as big as a school bus</b>." },
    name: "Like-a Spell",
    icon: "🪞",
    color: "#c39bff",
    teaches: "Compare two things using \"like\" or \"as\".",
    example: "fast as a comet, teeth like swords",
    ask: "What is it like? Try \"as big as...\" or \"like a...\"",
  },
  {
    id: "power",
    demo: { before: "The car went down the hill.", after: "The car <b>zoomed</b> down the hill." },
    name: "Power-Word Spell",
    icon: "⚡",
    color: "#ffd23f",
    teaches: "Use a strong action word instead of a plain one.",
    example: "zoomed, crashed, snatched (instead of went, got)",
    ask: "Can you swap a plain word for a POWER word, like zoomed or smashed?",
  },
  {
    id: "twist",
    demo: { before: "The monster ran away.", after: "The monster ran away, <b>but it left a glowing egg behind</b>." },
    name: "Twist Spell",
    icon: "🌀",
    color: "#5aa9ff",
    teaches: "Add a surprise that nobody expected.",
    example: "But the dragon was actually a tiny wizard in a costume!",
    ask: "What surprising thing could happen that nobody expects?",
  },
];

export const SPELL_IDS = SPELLS.map((s) => s.id);
export const spellById = Object.fromEntries(SPELLS.map((s) => [s.id, s]));

// Mastery ranks per spell, by how many times it has been cast.
export const RANKS = [
  { min: 25, name: "Gold", icon: "🥇" },
  { min: 10, name: "Silver", icon: "🥈" },
  { min: 3, name: "Bronze", icon: "🥉" },
];

export function rankFor(count) {
  return RANKS.find((r) => count >= r.min) || null;
}

// Story power: the spells in the writer's part (judged with the picture
// test, so "really loud" doesn't count) decide how exciting the next
// chapter is, so interesting writing visibly earns interesting story.
export const POWER = [
  { id: "tiny", min: 0, icon: "🕯️", label: "Tiny" },
  { id: "spark", min: 1, icon: "⚡", label: "Spark" },
  { id: "blaze", min: 3, icon: "🔥", label: "Blaze" },
  { id: "mega", min: 5, icon: "🌋", label: "MEGA" },
];
export const powerById = Object.fromEntries(POWER.map((p) => [p.id, p]));

export function powerFor(spellCount) {
  let p = POWER[0];
  for (const level of POWER) if (spellCount >= level.min) p = level;
  return p;
}

// "1 more spell for a 🔥 Blaze chapter!" (or the top-level cheer).
export function powerHint(spellCount) {
  const now = powerFor(spellCount);
  const next = POWER[POWER.indexOf(now) + 1];
  if (!next) return `${now.icon} ${now.label} power! Your next chapter will be EPIC!`;
  const need = next.min - spellCount;
  return `${now.icon} ${now.label} power · ${need} more spell${need === 1 ? "" : "s"} for a ${next.icon} ${next.label} chapter!`;
}
