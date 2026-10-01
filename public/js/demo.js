// Practice mode: simple word-pattern "magic" used when no AI is connected.
// It also powers the instant spell glow while the writer types.

import { SPELLS } from "./spells.js";

const words = (list) => new RegExp(`\\b(${list.join("|")})\\b`, "i");

const COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "black", "white", "gold", "golden", "silver", "brown", "gray", "grey", "rainbow", "teal", "violet", "crimson"];
const DETECTORS = {
  sight: words([...COLORS, "huge", "tiny", "giant", "enormous", "gigantic", "massive", "little", "spiky", "pointy", "round", "glowing", "sparkly", "shiny", "striped", "spotted", "fluffy", "scaly", "sparkling", "glittering"]),
  sound: /\b(k?a?boom|crash|bang|whoosh|hiss|hissed|roar|roared|buzz|buzzed|pop|zap|splash|crack|thud|growl|growled|beep|rumble|rumbled|screech|sizzle|sizzled|clang|ding|honk|squeak|squeaked|thump|snap|pow|wham|bam|vroom|sound|sounded|loud|quiet|whisper|hum|hummed)\b/i,
  senses: /\b(smell|smelled|smelly|stink|stinky|stank|taste|tasted|sweet|sour|salty|sticky|slimy|fuzzy|soft|rough|cold|freezing|hot|warm|wet|smooth|prickly|squishy|gooey|crunchy|itchy|bumpy)\b|\bfelt (soft|rough|cold|hot|warm|wet|smooth|sticky|slimy|fuzzy|squishy|bumpy|prickly)\b/i,
  talk: /["“”]|\b(said|shouted|yelled|whispered|asked|screamed|cried|called|replied|exclaimed)\b/i,
  feelings: /\b(happy|sad|scared|afraid|nervous|excited|angry|mad|brave|worried|surprised|proud|lonely|grumpy|terrified|joyful|curious|confused|embarrassed|furious|thought|wondered|hoped|wished)\b/i,
  likea: /\b(like an? \w+|as \w+ as)\b/i,
  power: words(["zoomed", "smashed", "crashed", "dashed", "blasted", "soared", "sprinted", "raced", "snatched", "leaped", "leapt", "exploded", "zapped", "slammed", "burst", "charged", "dove", "scrambled", "stomped", "whirled", "zipped", "shattered", "gobbled", "tumbled", "swooped", "flung", "hurled", "bolted", "chomped", "crushed", "darted", "galloped", "plunged", "rocketed", "scurried", "slithered", "smacked", "sprang", "swung", "thundered", "whipped", "yanked"]),
  twist: /\b(suddenly|but then|turned out|surprise|actually|out of nowhere|secretly|all of a sudden|it was really|instead)\b/i,
};

// Returns [{id, quote}] for every spell whose pattern matches.
// Shouted sound words: KABOOM! or WHOOSH! (all capitals, so "crown!" doesn't count).
const SHOUTED_SOUND = /\b[A-Z]{3,}!/;

export function detectSpells(text) {
  const found = [];
  for (const spell of SPELLS) {
    const m = String(text || "").match(DETECTORS[spell.id]) || (spell.id === "sound" ? String(text || "").match(SHOUTED_SOUND) : null);
    if (m) found.push({ id: spell.id, quote: quoteAround(text, m.index, m[0].length) });
  }
  return found;
}

function quoteAround(text, index, len) {
  const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, index - 12)));
  const end = text.indexOf(" ", Math.min(text.length, index + len + 12));
  return text.slice(start, end < 0 ? text.length : end).trim();
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const missing = (found) => SPELLS.filter((s) => !found.some((f) => f.id === s.id));
const wordCount = (t) => String(t || "").trim().split(/\s+/).filter(Boolean).length;

function challengeFor(found) {
  const s = pick(missing(found).length ? missing(found) : SPELLS);
  return { spell: s.id, prompt: s.ask };
}

function cheerFor(text, found, name) {
  if (!found.length) {
    return `Chomp! Tasty start, ${name}! I want to SEE it in my head. Tell me more!`;
  }
  const best = found[0];
  return pick([
    `CHOMP CHOMP! "${best.quote}" tastes like magic, ${name}!`,
    `Whoa! "${best.quote}"? My scales are sparkling!`,
    `Burp! Sorry. "${best.quote}" was SO delicious I couldn't help it!`,
  ]);
}

const OPENERS = {
  dragon: (h) => `High above the Dragon Kingdom, the sky glowed orange like a giant campfire. ${h.name}, ${h.kind}, stood on the castle wall as the wind whooshed past. "The Royal Crown is gone!" cried the king. Everyone gasped. Then ${h.name} saw it: huge, muddy claw prints leading into the Whispering Mountains. A low ROAR rumbled through the clouds. What does ${h.name} do next?`,
  kaiju: (h) => `The sea began to boil. Out in the harbor, a shadow bigger than a skyscraper rose from the waves, and a ROAR shook every window in Neon City. ${h.name}, ${h.kind}, stood on the tallest rooftop as rain whipped sideways. Glowing blue spikes lit up along the monster's back, one by one. "It's charging its atomic breath!" someone screamed below. What does ${h.name} do next?`,
  space: (h) => `BEEP BEEP BEEP! Red lights flashed all over Galaxy Station. ${h.name}, ${h.kind}, zoomed down the silver hallway. Outside the window, a purple comet the size of a city was heading straight for them. "We have five minutes!" crackled the captain's voice. Then a tiny green alien tugged ${h.name}'s sleeve and whispered, "I know a secret way out." What does ${h.name} do next?`,
  forest: (h) => `The Enchanted Forest smelled like pine needles and warm honey. ${h.name}, ${h.kind}, tiptoed past trees that giggled when the wind tickled them. Suddenly, a fox with sparkly blue eyes leaped onto the path. "Help!" it squeaked. "The grumpy troll stole the forest's last glowing acorn!" Far away, something went THUD... THUD... THUD. What does ${h.name} do next?`,
  ocean: (h) => `Deep under the sea, the Sunken City glittered like a treasure chest. ${h.name}, ${h.kind}, swam past coral towers as tall as skyscrapers. Bubbles tickled ${h.name}'s nose. Then the water turned ice cold. A shadow as long as a train slid under the city. "Sea monster!" shouted a merkid. Everyone dashed for cover. What does ${h.name} do next?`,
  academy: (h) => `At Monster Academy, the lunch slime was green and the teachers had three heads. ${h.name}, ${h.kind}, was late for Spell Class. CRASH! A potion exploded in the hallway, and pink smoke puffed everywhere. When the smoke cleared, every teacher had turned into a tiny frog. "Ribbit!" croaked the principal. "Fix this before the Big Test!" What does ${h.name} do next?`,
  dino: (h) => `The electric fence went dark with a loud CLUNK. Rain hammered the jeep as ${h.name}, ${h.kind}, stared into the jungle. THOOM. A puddle rippled. THOOM. The rippling got bigger. Then two huge yellow eyes blinked open between the ferns, and a roar shook the trees so hard that leaves rained down. "Nobody move," whispered the park ranger. What does ${h.name} do next?`,
};

const NEXT_CHAPTERS = [
  (h) => `Whoa! Nobody saw that coming. The ground shook, and a cloud of glittery dust swirled around ${h.name}. When it cleared, a gate as tall as a tree stood in front of them, covered in glowing blue runes. A creaky voice echoed: "Only the bravest may pass." ${h.name}'s heart thumped like a drum. What does ${h.name} do?`,
  (h) => `That worked! But then... a squeaky little laugh came from behind a rock. Out hopped a creature with fuzzy orange fur, six legs, and eyes like headlights. "I'm Fizzwick," it said. "And you just woke up the Snoring Giant." Far away, something went RUMBLE. What happens next?`,
  (h) => `The air smelled like burnt marshmallows. ${h.name} looked up and gasped. Hundreds of tiny lights were zooming in circles, faster and faster, like a tornado of fireflies. In the middle floated a silver key. "Grab it!" shouted a voice. But the lights were getting closer. What does ${h.name} do?`,
  (h) => `CRACK! The floor split open. ${h.name} tumbled down, down, down, and landed with a squishy SPLAT in a room full of bouncy purple mushrooms. Across the room sat the villain on a throne of bones made of candy. "So," it hissed, "you finally made it." How does ${h.name} answer?`,
];

const FINAL_SETUP = (h) => `This is it. Everything has led to this moment. Thunder boomed, the wind howled, and ${h.name} stood face to face with the biggest challenge of the whole adventure. All the friends ${h.name} had met were watching and holding their breath. How does the adventure end?`;

const ENDING = (h) => `And so ${h.name} saved the day! Everyone cheered so loudly that the clouds bounced. That night there was a giant party with glowing cupcakes and fireworks shaped like dragons. ${h.name} smiled. It had been the most amazing adventure ever... for now. The End.`;

function heroOf(p) {
  return { name: p.hero?.name || "Our hero", kind: p.hero?.kind || "an adventurer" };
}

function epicScore(text, found, boring) {
  const n = wordCount(text);
  const growth = Math.max(0, n - wordCount(boring));
  let score = 1 + found.length * 1.6 + Math.min(3, growth / 5);
  return Math.max(1, Math.min(10, Math.round(score)));
}

// --- Practice-mode creature drawing: draws only the details it can find. ---

const COLOR_HEX = {
  red: "#e84a5f", orange: "#ff9f1c", yellow: "#ffd23f", green: "#59c26b", blue: "#4a90e2", purple: "#9b59d0",
  pink: "#ff7eb6", black: "#3a3a4a", white: "#f4f4f8", gold: "#f2c14e", golden: "#f2c14e", silver: "#c0c7d1",
  brown: "#9c6b3f", gray: "#9aa0a6", grey: "#9aa0a6", teal: "#2ec4b6", violet: "#8f5bd6", crimson: "#c0263d",
};

export function demoCreatureSvg(text) {
  const t = String(text || "").toLowerCase();
  const colors = COLORS.filter((c) => COLOR_HEX[c] && new RegExp(`\\b${c}\\b`).test(t)).sort((a, b) => t.search(new RegExp(`\\b${a}\\b`)) - t.search(new RegExp(`\\b${b}\\b`)));
  const body = COLOR_HEX[colors[0]] || "#b9b4c9";
  const accent = COLOR_HEX[colors[1]] || "#ffffff";
  const has = (w) => new RegExp(`\\b${w}`).test(t);
  const eyesMatch = t.match(/\b(one|two|three|four|five|1|2|3|4|5)\s+eyes?\b/);
  const eyeCount = eyesMatch ? ({ one: 1, two: 2, three: 3, four: 4, five: 5 }[eyesMatch[1]] || Number(eyesMatch[1])) : 2;
  const big = has("huge") || has("giant") || has("enormous") || has("big");
  const r = big ? 58 : 46;
  const parts = [];
  parts.push(`<rect width="200" height="200" fill="#241f4a"/>`);
  parts.push(`<ellipse cx="100" cy="178" rx="80" ry="14" fill="#1a1638"/>`);
  if (has("wing")) {
    parts.push(`<path d="M${100 - r + 6} 100 Q ${30 - r / 3} 40 ${40 - r / 4} 120 Z" fill="${accent}" stroke="#1b1530" stroke-width="4"/>`);
    parts.push(`<path d="M${100 + r - 6} 100 Q ${170 + r / 3} 40 ${160 + r / 4} 120 Z" fill="${accent}" stroke="#1b1530" stroke-width="4"/>`);
  }
  if (has("tail")) parts.push(`<path d="M${100 + r - 10} 140 Q 190 150 180 110" fill="none" stroke="${body}" stroke-width="12" stroke-linecap="round"/>`);
  parts.push(`<ellipse cx="100" cy="${120 - (r - 46) / 2}" rx="${r}" ry="${r - 4}" fill="${body}" stroke="#1b1530" stroke-width="4"/>`);
  if (has("spike") || has("spiky")) {
    for (let i = 0; i < 5; i++) {
      const x = 100 - r * 0.7 + i * (r * 0.35);
      parts.push(`<path d="M${x - 8} ${80 - (r - 46)} L${x} ${58 - (r - 46)} L${x + 8} ${80 - (r - 46)} Z" fill="${accent}" stroke="#1b1530" stroke-width="3"/>`);
    }
  }
  if (has("horn")) {
    parts.push(`<path d="M75 ${82 - (r - 46)} L66 ${48 - (r - 46)} L86 ${76 - (r - 46)} Z" fill="#fff4d6" stroke="#1b1530" stroke-width="3"/>`);
    parts.push(`<path d="M125 ${82 - (r - 46)} L134 ${48 - (r - 46)} L114 ${76 - (r - 46)} Z" fill="#fff4d6" stroke="#1b1530" stroke-width="3"/>`);
  }
  const eyeY = 108 - (r - 46) / 2;
  const span = Math.min(70, 26 * (eyeCount - 1));
  for (let i = 0; i < eyeCount; i++) {
    const x = eyeCount === 1 ? 100 : 100 - span / 2 + (span / (eyeCount - 1)) * i;
    parts.push(`<circle cx="${x}" cy="${eyeY}" r="11" fill="#fff" stroke="#1b1530" stroke-width="3"/><circle cx="${x + 2}" cy="${eyeY + 2}" r="5" fill="#1b1530"/>`);
  }
  const mouthY = eyeY + 26;
  if (has("teeth") || has("fang")) {
    parts.push(`<path d="M82 ${mouthY} Q100 ${mouthY + 16} 118 ${mouthY}" fill="#5a1e2b" stroke="#1b1530" stroke-width="3"/><path d="M88 ${mouthY + 1} L92 ${mouthY + 9} L96 ${mouthY + 3} M104 ${mouthY + 3} L108 ${mouthY + 9} L112 ${mouthY + 1}" fill="#fff" stroke="#1b1530" stroke-width="2"/>`);
  } else {
    parts.push(`<path d="M88 ${mouthY} Q100 ${mouthY + 10} 112 ${mouthY}" fill="none" stroke="#1b1530" stroke-width="3" stroke-linecap="round"/>`);
  }
  if (has("fire") || has("flame")) parts.push(`<path d="M150 70 q10 -20 0 -34 q18 12 12 34 q-6 10 -12 0z" fill="#ff9f1c" stroke="#1b1530" stroke-width="2"/>`);
  if (has("sparkl") || has("glow") || has("magic")) {
    parts.push(`<path d="M40 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z M160 150 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z" fill="#ffd23f"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${parts.join("")}</svg>`;
}

const ELEMENT_WORDS = [
  ["fire", /fire|flame|lava|burn|hot/],
  ["water", /water|ocean|sea|swim|wave/],
  ["ice", /ice|snow|frozen|cold/],
  ["lightning", /lightning|electric|thunder|zap/],
  ["air", /wind|sky|cloud|fly|flies/],
  ["nature", /tree|forest|leaf|flower|plant/],
  ["shadow", /shadow|dark|night|ghost/],
  ["cosmic", /space|star|planet|galaxy|alien/],
  ["metal", /metal|robot|steel|iron/],
  ["earth", /rock|stone|cave|mountain|dirt/],
];

// Fake AI replies, task by task.
export function demoReply(task, p) {
  const name = p.writerName || "friend";
  switch (task) {
    case "quest_start": {
      const h = heroOf(p);
      const opener = OPENERS[p.worldId] || OPENERS.dragon;
      return {
        title: `${h.name} and the Big Adventure`,
        chapter: opener(h),
        sceneEmojis: "✨🗺️⚡",
        bonus: { spell: "sound", prompt: "What sounds does your hero hear? BOOM? Whoosh?" },
      };
    }
    case "quest_react": {
      const found = detectSpells(p.kidText);
      return {
        cheer: cheerFor(p.kidText, found, name),
        spells: found,
        bonusDone: found.some((f) => f.id === p.bonus?.spell),
        powerUp: challengeFor(found),
      };
    }
    case "quest_continue": {
      const h = heroOf(p);
      const left = p.totalTurns - p.turnNumber;
      const addFound = p.addition ? detectSpells(p.addition) : [];
      return {
        additionCheer: p.addition ? `Power-up absorbed! "${p.addition.slice(0, 40)}" made me glow!` : "",
        additionSpells: addFound,
        chapter: left <= 0 ? ENDING(h) : left === 1 ? FINAL_SETUP(h) : NEXT_CHAPTERS[(p.turnNumber - 1) % NEXT_CHAPTERS.length](h),
        sceneEmojis: pick(["🌀🗝️✨", "🦊👀💥", "🍄🏰👑", "⚡🐉🌋", "🌙⭐🚀"]),
        bonus: challengeFor([]),
      };
    }
    case "quest_finish": {
      const kidParts = (p.story || []).filter((x) => x.author === "kid");
      const best = kidParts
        .flatMap((x) => x.text.split(/(?<=[.!?])\s+/))
        .sort((a, b) => detectSpells(b).length - detectSpells(a).length || b.length - a.length)[0] || "";
      return {
        titles: [`The Legend of ${p.hero?.name || "the Hero"}`, "The Day Everything Went KABOOM", "Quest of the Glowing Secret"],
        favoriteLine: best,
        whyFavorite: "It made me see the whole scene in my head!",
        award: "The Golden Quill of Thunder Words",
        nextTime: "Next time, see if you can make a character SAY something surprising!",
      };
    }
    case "spark":
      return {
        sparks: shuffle([
          "What if a tiny creature showed up and asked for help?",
          "What does the air smell like right now?",
          "What if the bad guy was actually trying to help?",
          "What sound would make everyone jump?",
          "How does your hero feel deep down inside?",
          "What if something started to glow?",
          "What would be the silliest thing that could happen?",
        ]).slice(0, 3),
      };
    case "epic_judge": {
      const found = detectSpells(p.attempt);
      const score = epicScore(p.attempt, found, p.boring);
      return {
        score,
        cheer: found.length ? `"${found[0].quote}" made my scales stand up! That's EPIC!` : "Ooh, it's warming up! Add a detail to make it explode with epicness!",
        spells: found,
        announcer: pick(["In a world where nothing is boring...", "This summer... one sentence... changes everything.", "Get ready for the most epic moment of all time..."]),
        nextSpell: challengeFor(found),
      };
    }
    case "creature_create": {
      const description = p.description || "";
      const found = detectSpells(p.addition || description);
      const words = wordCount(description);
      const base = Math.min(90, 15 + words * 1.5 + found.length * 6);
      const prev = p.previous;
      const stat = (k, wobble) => Math.min(100, Math.max(prev ? prev[k] + 8 : 10, Math.round(base + wobble)));
      const element = ELEMENT_WORDS.find(([, re]) => re.test(description.toLowerCase()))?.[0] || "cosmic";
      const rarity = words > 60 ? "legendary" : words > 35 ? "epic" : words > 15 ? "rare" : "common";
      return {
        name: p.name || prev?.name || "Blobsworth",
        species: element === "cosmic" ? "Mystery Beast" : `${element[0].toUpperCase()}${element.slice(1)} Beast`,
        element,
        habitat: /lives? (in|on|under|at) ([^.,!]+)/i.exec(description)?.[2] || "somewhere mysterious",
        rarity,
        hp: stat("hp", 5),
        attack: stat("attack", -3),
        defense: stat("defense", 2),
        magic: stat("magic", 8),
        abilities: [{ name: "Mystery Move", effect: "Nobody knows what it does yet. Describe its powers to find out!" }],
        spells: found,
        artistNote: found.length
          ? `I drew "${found[0].quote}" just like you said!`
          : words > 15
            ? "I drew every detail I could find. The more you tell me, the cooler it gets!"
            : "I had to guess almost everything, so I drew a plain blob. Tell me more!",
        upgradeQuestion: pick(["Does it have wings, horns, spikes, or a tail?", "What color is it, and does any part glow?", "How many eyes does it have?", "What is its special power?"]),
        svg: demoCreatureSvg(description),
      };
    }
    default:
      throw new Error(`Unknown task ${task}`);
  }
}

function shuffle(list) {
  return list
    .map((v) => [Math.random(), v])
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1]);
}
