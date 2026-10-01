// The eight writing "spells" — each one is a real writing craft move.
// The AI awards them when it spots them in the young writer's text.

export const SPELLS = [
  {
    id: "sight",
    name: "Color Spell",
    icon: "🎨",
    color: "#ff9f1c",
    teaches: "Describe what things look like: color, shape, size.",
    example: "a glowing purple door with silver spikes",
    ask: "What does it look like? What color or shape is it?",
  },
  {
    id: "sound",
    name: "Sound Spell",
    icon: "💥",
    color: "#ff5d8f",
    teaches: "Use sound words, or say what something sounds like.",
    example: "KABOOM! The engine hummed and hissed.",
    ask: "What does it sound like? BOOM? Whoosh? Hiss?",
  },
  {
    id: "senses",
    name: "Senses Spell",
    icon: "👃",
    color: "#7bd389",
    teaches: "Tell how something smells, tastes, or feels to touch.",
    example: "The slime felt cold and sticky and smelled like old socks.",
    ask: "How does it smell, taste, or feel to touch?",
  },
  {
    id: "talk",
    name: "Talking Spell",
    icon: "💬",
    color: "#3ddbd9",
    teaches: "Let a character say something out loud.",
    example: "\"Run!\" shouted the robot.",
    ask: "What does someone SAY right now?",
  },
  {
    id: "feelings",
    name: "Feelings Spell",
    icon: "💓",
    color: "#f78fb3",
    teaches: "Show how a character feels or what they think inside.",
    example: "Max was so nervous his tail wouldn't stop shaking.",
    ask: "How does your hero feel inside right now?",
  },
  {
    id: "likea",
    name: "Like-a Spell",
    icon: "🪞",
    color: "#c39bff",
    teaches: "Compare two things using \"like\" or \"as\".",
    example: "fast as a comet, teeth like swords",
    ask: "What is it like? Try \"as big as...\" or \"like a...\"",
  },
  {
    id: "power",
    name: "Power-Word Spell",
    icon: "⚡",
    color: "#ffd23f",
    teaches: "Use a strong action word instead of a plain one.",
    example: "zoomed, crashed, snatched (instead of went, got)",
    ask: "Can you swap a plain word for a POWER word, like zoomed or smashed?",
  },
  {
    id: "twist",
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
