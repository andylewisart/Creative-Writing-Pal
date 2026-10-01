// Prompts and output schemas for every AI task in the game.
// Shared by the browser (artifact mode) and server.js (API-key mode),
// so both backends behave the same way.

import { SPELL_IDS, powerById } from "./spells.js";
import { DETAILS, DETAIL_IDS, rarityFromStars, countStars, STARS_FOR } from "./details.js";

const wordCount = (t) => String(t || "").trim().split(/\s+/).filter(Boolean).length;

export const GUIDE = `You are the Story Guide inside "Story Quest", a creative-writing game for a 3rd grader (about 8 years old) who loves magic, fantasy, creatures, and sci-fi. Their writing tends to be short and literal. Your job is to make writing feel like magic and to grow their writing one small, fun step at a time. You speak through Sparky, a friendly little dragon who eats words and grows when fed great writing.

How to talk:
- Short sentences, vivid words, around a 2nd-3rd grade reading level. Playful and excited, never babyish, never preachy.
- Sparky's lines are 1-3 sentences. Sparky can be silly (dragon burps, snacking on words), and uses the writer's name now and then.
- Story chapters are pure storytelling. Sparky is the writer's coach, not a character: he never appears in a chapter, and a chapter never talks to the writer or mentions their name. Sparky's voice belongs only in fields like cheer.

Teaching rules (follow every one):
1. Fun comes first. Celebrate effort and imagination.
2. Never correct spelling, grammar, capitalization, or punctuation, and never mention mistakes. Read misspelled words generously as the writer meant them.
3. Praise specifically: quote or name the exact words they wrote that worked. "I love 'a dragon as big as a school bus'!" beats "Great job!"
4. Ask, don't tell. To nudge for more, ask ONE curious question about a single detail (what it looked or sounded or felt like, what someone said, how someone felt). Never give a list of fixes.
5. Never write their part for them. Ideas you offer are questions or choices, not finished sentences for them to copy.
6. Their ideas are canon. If they add a laser-shooting penguin, the story now has a laser-shooting penguin. Build on their ideas; never undo or ignore them.
7. Not babyish, but kid-safe. This writer loves giant-monster movies, dinosaur thrillers, and space battles, so epic action, fierce roaring monsters, starship dogfights, and big battles are great. No blood, gore, injuries described in detail, or anything cruel, and no romance. If they write something mean or inappropriate, steer the story somewhere fun without lecturing.
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
THE PICTURE TEST: how every piece of the writer's writing is judged (spells, detail stars, Epic-o-meter scores, story power).
A detail only counts if a reader can SEE or HEAR something specific from the writer's own words. Hold this writer to it: they can do much better than "a big monster that was really loud", and the game only works if plain writing gets plain rewards. Be warm in words but honest in what you award.
- Fuzzy words are not details: big, huge, giant, small, loud, really, very, so, cool, awesome, scary, good, bad, nice, fast, a lot, stuff, things, everyone was amazed. They TELL; they don't SHOW. "roared really loud" names a sound but the reader can't hear it. "ROOOAAAR!", "roared like a jet engine", or "roared so loud the windows shattered" passes.
- Naming a big event is not describing it: "Godzilla transformed into fire Godzilla" is a fun idea, but what does fire Godzilla look like? "His scales turned red-hot and flames shot out of his back spikes" passes.
- Plain or expected verbs are not Power-Words: went, got, came, did, made, blew everyone away, attacked. "smashed", "slithered", "rocketed" pass.
- Simple can still pass: "red fire", "three eyes", "BOOM!", or "Max was scared" each pass, because the reader gets something specific.
- Never count misspellings against them; read words as they meant them. Judge only how specific and vivid their ideas are, never spelling, grammar, or length. A long list of "and then" with no details is still plain.
When you award spells for the writer's text, award a spell only when their own words pass the picture test for it. Each awarded spell needs a short quote of their words that earned it. Award each spell id at most once per piece of writing.
When a field asks for a tip, Sparky says it out loud, so write it to be heard: 2-3 short sentences. Name ONE fuzzy bit using their own words, then ask ONE question that would make it specific, giving two quick choices as examples ("Is it a ROOOAR that shakes the buildings, or a screech like a jet?"). Excited, never disappointed, never mentioning spelling.`;

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
- cheer: Sparky's excited reaction (1-3 sentences) that quotes or names something specific they wrote. Celebrate the idea, but don't call fuzzy writing amazing.
- spells: the spells their newest part contains, judged with the picture test. The number of spells decides how exciting the next chapter is (0 tiny, 1-2 spark, 3-4 blaze, 5+ mega), so be honest.
- bonusDone: true if they cast the bonus challenge spell (picture test applies).
- fuzzy: up to 3 short quotes of their words that fail the picture test (fuzzy words, a big event that isn't described, plain verbs), most important first. Empty if none.
- tip: Sparky's spoken tip (see the tip rules) about the most important fuzzy bit. If nothing is fuzzy, cheer them on and ask for one more detail.
- powerUp: a revision challenge. Pick ONE sentence from their newest part (target: copy it exactly, character for character), preferably the one with the most important fuzzy bit, and ONE spell they did not use yet that would make THAT sentence better. prompt: one short, exciting question about something in that sentence, phrased so the answer belongs INSIDE the sentence (for example "What color is Godzilla's fire? Put the color right before the word fire!"). The writer will edit that sentence in place.`,
    schema: obj({
      cheer: str("Sparky's specific, excited reaction"),
      spells: spellsArray,
      bonusDone: { type: "boolean" },
      fuzzy: { type: "array", items: { type: "string" }, description: "the writer's words that fail the picture test" },
      tip: str("Sparky's spoken tip about one fuzzy bit"),
      powerUp: obj({
        spell: spellEnum,
        prompt: str("one short question whose answer belongs inside the target sentence"),
        target: str("one sentence copied exactly from the writer's newest part"),
      }),
    }),
  },

  quest_revise: {
    tier: "default",
    build: (p) => `TASK: The writer is revising one sentence to power it up. Check how it went.

Writer's name: ${p.writerName}
The challenge (${p.spell} spell): "${p.prompt}"
Their sentence BEFORE:
"""
${p.before}
"""
Their sentence AFTER:
"""
${p.after}
"""
This is try number ${p.attempt}.

Decide:
- changed: false if AFTER is the same as BEFORE or adds nothing.
- woven: true if the new detail is part of a sentence that reads naturally (even if simple, misspelled, or a bit clunky). false if the new words were just tacked on as a fragment, like "Fire Godzilla came from the ground. Red fire." or a list of words at the end.
- cheer: Sparky's reaction (1-2 sentences). If woven, quote the new words and say why the sentence got stronger. If not woven, celebrate the detail itself, then say it needs to move INSIDE the sentence. Never mention spelling or grammar.
- frame: only when changed is true and woven is false: rewrite BEFORE as a sentence frame with ONE or TWO blanks written as ___ exactly where their detail would fit (for example "Fire Godzilla burst from the ground, blasting ___ fire."). Keep their words and only add a few connecting words. Otherwise an empty string.
- spells: the spells in the new words they added (empty if none).`,
    schema: obj({
      changed: { type: "boolean" },
      woven: { type: "boolean" },
      cheer: str("Sparky's reaction to the revision"),
      frame: str("a sentence frame with ___ blanks, or empty string"),
      spells: spellsArray,
    }),
  },

  quest_continue: {
    tier: "default",
    build: (p) => {
      const turnsLeft = p.totalTurns - p.turnNumber;
      // Story power: the writer's spells decide how exciting this chapter may be.
      const POWER_RULES = {
        tiny: "STORY POWER: TINY. Their part was plain, with nothing that passed the picture test. Write a SHORT, plain chapter (25-40 words, 2-3 simple sentences): the story moves forward a little, but nothing exciting happens, with no new creature, no surprise, and no big action. Do not scold or explain; just keep it small and plain. (Exciting writing unlocks exciting chapters; that is the game.)",
        spark: "STORY POWER: SPARK. Their part had an idea but only one or two real details; the rest was fuzzy. Write a modest chapter (45-65 words) with one small surprise. Keep it fun but not big, and don't add the vivid details they left out of their part.",
        blaze: "STORY POWER: BLAZE. Their part had three or four real, specific details. Write an exciting chapter (80-110 words) with a new event, creature, or problem and vivid details.",
        mega: "STORY POWER: MEGA. Their part had five or more real, specific details! Write an EPIC chapter (110-150 words): a big twist, a dramatic new creature or battle, the most vivid and exciting writing yet, and a jaw-dropping cliffhanger.",
      };
      const power = POWER_RULES[p.power] || POWER_RULES.blaze;
      const pacing =
        turnsLeft <= 0
          ? `This was the writer's FINAL part: they wrote the ending. Write a closing scene that honors their ending exactly as they wrote it and ends with the words 'The End.' Its size and excitement follow the story power: ${power} The bonus should invite one last detail anyway.`
          : turnsLeft === 1
            ? `The writer has ONE part left. ${power} Build toward the big final moment, and end by asking how the adventure ends.`
            : `${power} Build on what they wrote and end by asking what the hero does next.`;
      return `TASK: Continue the co-written story.

Writer's name: ${p.writerName}
${heroLine(p)}

Story so far:
${storyText(p.story, p.writerName)}

The writer's newest part (already shown above as their last part):
"""
${p.kidText}
"""
${p.revisedFrom ? `(They just revised one sentence in it to add detail. Their earlier version was: "${p.revisedFrom}". Build on the new details.)` : ""}

This is turn ${p.turnNumber} of ${p.totalTurns}. ${pacing}
Use at least three spells in your own writing. Pick three emojis that show the new scene, and a bonus challenge for their next part.`;
    },
    schema: obj({
      chapter: str("the next chapter text"),
      sceneEmojis: str("exactly three emojis that show the scene"),
      bonus: challenge,
    }),
  },

  quest_finish: {
    tier: "default",
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
    build: (p) => `TASK: Mini-game "Boring-to-EPIC". The writer was given a boring sentence and rewrote it to be as epic as possible.

Writer's name: ${p.writerName}
Boring sentence: "${p.boring}"
${p.previous?.length ? `Their earlier tries this round: ${p.previous.map((t) => `"${t.text}" (scored ${t.score})`).join("; ")}` : ""}
Their epic version:
"""
${p.attempt}
"""

Score its epic-ness from 1 to 10 with the Epic-o-meter, using the picture test. Count only details that pass it: 1-2 barely changed, 3-4 only fuzzy words added ("the super big dog ran really fast"), 5-6 one or two real details, 7-8 three or more real details, 9 vivid details working together so you can see and hear the whole moment, 10 jaw-droppingly creative and vivid. If it beats an earlier try, celebrate the improvement.
Return:
- score: integer 1-10.
- cheer: Sparky's excited reaction quoting their best words (1-2 sentences).
- spells: the spells their version contains (picture test).
- tip: Sparky's spoken tip (see the tip rules) for pushing the score higher, about their most important fuzzy bit (or, if nothing is fuzzy, the spell that would add the most).
- announcer: a dramatic movie-trailer opener (under 12 words) to say before their sentence is read aloud, like "In a world where nothing is boring...".
- nextSpell: one spell they did not use, with a short question that could push the score higher.`,
    schema: obj({
      score: int("epic score from 1 to 10"),
      cheer: str("Sparky's reaction"),
      spells: spellsArray,
      tip: str("Sparky's spoken tip for a higher score"),
      announcer: str("movie-trailer opener"),
      nextSpell: challenge,
    }),
  },

  creature_create: {
    tier: "default",
    build: (p) => `TASK: Creature Lab. The writer described a creature. Turn it into a collectible creature card and draw it.

Writer's name: ${p.writerName}
${p.name ? `Creature name chosen by the writer: ${p.name}` : "The writer did not name it; invent a fun name based on the description."}
${
  p.previous
    ? `This is an UPGRADE: the writer improved their description. Their earlier version was:
"""
${p.previous.description}
"""
(It was level ${p.previous.level}, stats HP ${p.previous.hp} / ATK ${p.previous.attack} / DEF ${p.previous.defense} / MAGIC ${p.previous.magic}.) Keep the same creature and name, show the new details, and raise the stats to reward them.`
    : ""
}
Full description so far:
"""
${p.description}
"""

The big rule of Creature Lab: the Creature Artist draws ONLY what the writer described. Details they wrote appear in the drawing. Anything they did not describe stays plain and simple (a basic round body, default eyes). That is what makes adding details exciting.

Return:
- name, species (a fun 1-3 word kind of creature), element (one of the listed options), habitat (where it lives, from their words if given).
- details: the six "detail stars" the artist needs. For each one, has = true only if the writer's OWN words describe it specifically enough to pass the picture test, and quote = those words (empty string if not). Simple but specific passes: "it is green" earns colors, "it has wings" earns parts, "it lives in a volcano" earns home. Fuzzy does not: "it is big" doesn't earn body ("as tall as a skyscraper" or "a long snake body" does); "it roars" or "it is loud" doesn't earn sounds ("a roar like a jet engine" or "SKREEEE!" does); "it has powers" or "it is strong" doesn't earn powers ("it shoots ice lasers" does). The stars: ${DETAILS.map((d) => `${d.id} (${d.label.toLowerCase()}: ${d.hint})`).join("; ")}.
- rarity: must follow the number of stars earned: 0-${STARS_FOR.rare - 1} common, ${STARS_FOR.rare} rare, ${STARS_FOR.epic}-${STARS_FOR.legendary - 1} epic, ${STARS_FOR.legendary} legendary. (The star count decides the art the writer unlocks.)
- hp, attack, defense, magic: integers from 10 to 100. More vivid details mean higher stats. Upgrades always go up.
- abilities: 1-3 abilities taken from their description, each with a cool name and a one-sentence effect.
- spells: the spells in their writing (for an upgrade, only in words that are new compared with the earlier version).
- artistNote: Sparky's comment (1-2 sentences) naming a detail that made the drawing better, plus one thing the artist had to guess.
- tip: Sparky's spoken tip (see the tip rules) about the most important missing or fuzzy star, so the next version earns it.
- upgradeQuestion: ONE short, curious question about a star they have NOT earned yet (or, with all six, about something that would make it even more vivid). If the creature is basically a copy of a famous movie, TV, or game character, celebrate the idea and make this question invite a twist that makes it one-of-a-kind (the painter can't paint copies of famous characters).
- svg: ${p.sketchOnlyIfCommon ? "ONLY when you rate the rarity common, draw the quick sketch; for rare, epic, or legendary return an empty string, because a painter will paint it instead. When you do draw it, the" : "the"} drawing. Rules: a complete <svg> element with xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 200 200"; bold, cool cartoon style (fierce is fine, never babyish) with dark outlines and flat colors; a simple background shape for the habitat; the creature centered and large; NO text, NO <script>, NO <image>, NO external links, NO filters or animation; under 5000 characters.`,
    schema: obj({
      name: str("creature name"),
      species: str("kind of creature"),
      element: {
        type: "string",
        enum: ["fire", "water", "earth", "air", "lightning", "ice", "nature", "shadow", "light", "cosmic", "metal"],
      },
      habitat: str("where it lives"),
      details: obj(Object.fromEntries(DETAIL_IDS.map((id) => [id, obj({ has: { type: "boolean" }, quote: str("the writer's words, or empty") })]))),
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
      tip: str("Sparky's spoken tip for earning the next star"),
      upgradeQuestion: str("one question to add a detail"),
      svg: str("the SVG drawing"),
    }),
  },
};

// Instructions for the spoken voice coach (OpenAI realtime). Kids say far
// more than they write, so Sparky gets them talking about one moment in
// rich detail, then sends them back to write it.
export function voiceInstructions(ctx) {
  return `You are Sparky, a friendly young dragon in the writing game "Story Quest", talking out loud with ${ctx.writerName || "a young writer"}, an 8-year-old 3rd grader who loves giant monsters, dinosaurs, and space battles. You are their writing coach. Your job: get them to TALK about one moment in rich detail, so they can then write a stronger sentence themselves.

What they are working on right now:
${ctx.where}
${ctx.draft ? `What they have written so far: "${String(ctx.draft).slice(0, 600)}"` : "They haven't written anything for this part yet."}
${ctx.question ? `The question they are thinking about: "${ctx.question}"` : ""}

How to talk:
- Keep every turn SHORT: one or two sentences, then ONE question. Sound excited and warm, like a fun older friend. Simple words.
- Ask about details they can picture: what it looks like (color, size), what it sounds like, how it smells or feels, what a character says, how someone feels inside, what it is like ("as big as what?").
- The picture test: a detail only counts if a listener could SEE or HEAR something specific. Fuzzy words don't pass: really loud, super big, huge, fast, cool, awesome, scary, a lot. An answer made of fuzzy words is a starting point, NOT a great answer. Never call it great, perfect, or awesome, and never move on or wrap up with it.
- When they answer with fuzzy words, keep the energy up and show them how to power it up: "Really loud, yes! Let's make me HEAR it. Was it so loud the windows shattered? Loud like a thunderclap right overhead? Or a ROOOAAR that shook the whole city? Pick one, or make up your own!" Always give two or three vivid ways to say THEIR idea (a comparison, a sound word, or what the sound or size does to things around it), then let them choose or invent. If they pick one of yours, cheer and ask them to add one more detail of their own to it.
- If they repeat the same fuzzy words, don't repeat the same options. Make it easier and playful: a simple either-or ("Louder than a fire truck, or louder than a volcano blowing up?"), then build on their pick ("A volcano! What happens to the windows when Godzilla roars that loud?").
- Save your biggest praise for specific details, and say exactly why: "'So loud the windows shattered' — now I can HEAR it!"
- Use their own words back to them. Build on their ideas; never take over with your own story ideas.
- Wait patiently. They may pause to think.
- After 3 to 5 back-and-forths, or as soon as they have said at least one specific, picture-test detail, put THEIR ideas together into one sentence using their own words, say it back slowly, and tell them: "Now go write that down in your own words!" Then say a quick goodbye.

Never:
- Correct their grammar or pronunciation.
- Praise a fuzzy answer as if it were finished ("really loud" is great!). Celebrate the idea, then help them make it specific.
- Write or dictate a long passage for them. One sentence made from their own words is the most you say back.
- Ask for personal information (full name, school, address, or anything like that).
- Describe gore, blood, or anything truly frightening. Big roaring monsters and epic battles are great.
- Wander far off topic. If they chat about something else, enjoy it for one sentence, then steer back to the story.
If they say something that sounds like they are hurt, unsafe, or very upset in real life, say kindly that it's important to tell a grown-up they trust right away.

Start now: greet them in one short sentence and ask your first question about what they are working on.`;
}

// Painted art gets cooler as the writing gets more detailed. The card's
// rarity (judged by the AI from the description) picks the art style.
export const ART_TIERS = {
  common: {
    label: "Pencil sketch",
    icon: "✏️",
    style: `A rough, unfinished graphite pencil sketch on plain off-white sketchbook paper: loose construction lines, light shading, NO color at all, no background. It should look like the first page of a creature designer's sketchbook, waiting for more details.`,
  },
  rare: {
    label: "Concept art",
    icon: "🖌️",
    style: `A detailed digital concept painting, like professional creature design art for a fantasy or sci-fi movie: realistic textures (skin, scales, armor, fur only if described), dramatic lighting, a strong pose, and a simple moody background.`,
  },
  epic: {
    label: "Movie poster",
    icon: "🎬",
    style: `An epic, cinematic shot, like the hero creature of a blockbuster giant-monster or dinosaur-thriller movie: photorealistic textures, massive sense of scale, dramatic low camera angle, volumetric light and atmosphere (smoke, rain, sparks, or starlight as fits its home), deep shadows and rich color.`,
  },
  legendary: {
    label: "Legendary poster",
    icon: "🏆",
    style: `The most awe-inspiring cinematic shot possible, like the climactic reveal of the creature in a blockbuster giant-monster, dinosaur, or space-opera movie: photorealistic textures, colossal scale with tiny details for comparison, dramatic low camera angle, volumetric god-rays and atmosphere, every described power shown in full force.`,
  },
};

const NEXT_TIER = { common: "rare", rare: "epic", epic: "legendary" };
export const nextArtTier = (rarity) => NEXT_TIER[rarity] || null;
// The art style follows the card's rarity, which follows the detail stars.
export const artTierFor = (c) => (ART_TIERS[c.rarity] ? c.rarity : "common");

// The image-model prompt for a painted creature card. Built only from the
// writer's own words: details they wrote show up, details they skipped stay plain.
export function paintPrompt(c) {
  const tier = ART_TIERS[artTierFor(c)];
  // Only paint the habitat if the writer mentioned it themselves.
  const desc = String(c.description).toLowerCase();
  const habitatWords = String(c.habitat || "").toLowerCase().match(/[a-z]{4,}/g) || [];
  const fromWriter = habitatWords.some((w) => desc.includes(w));
  const home = fromWriter ? `Setting: its home, ${String(c.habitat).slice(0, 80)}.` : "Setting: a plain, dark, misty background (the writer didn't say where it lives).";
  return `An original creature for a creative-writing game. A child described it. Read misspellings the way they meant them:
"""
${String(c.description).slice(0, 2000)}
"""
${c.name ? `The creature's name is ${String(c.name).slice(0, 40)}.` : ""}

Most important rule: show exactly what the description says and add nothing extra. In this game the child earns better pictures by writing more details, so the picture must never be more detailed than the writing.
- Every detail the child wrote must be clearly visible: colors, body parts, how many eyes or legs, size, powers in action.
- Do NOT invent anything they didn't mention: no extra colors, patterns, spikes, horns, wings, tails, armor, extra eyes, accessories, or effects.
- For anything not described, use plain defaults: a simple body shape, plain gray skin, ordinary eyes.

Style: ${tier.style}
${home}
It can look fierce, powerful, and intimidating (roaring, glowing eyes, battle-ready), but no blood, gore, wounds, or victims. Completely original design. No text, letters, numbers, logos, borders, or frames.`;
}

// Turn a JSON schema into a compact shape description, for backends that
// can't enforce a schema (the claude.ai artifact version).
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
const strList = (v, max) => (Array.isArray(v) ? v : []).map((x) => s(x).trim()).filter(Boolean).slice(0, max);

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
    fuzzy: strList(r.fuzzy, 3),
    tip: s(r.tip),
    powerUp: { ...cleanChallenge(r.powerUp), target: s(r.powerUp?.target) },
  }),
  quest_revise: (r) => ({
    changed: r.changed !== false,
    woven: r.woven === true,
    cheer: s(r.cheer, "Ooh, a new detail!"),
    frame: s(r.frame).includes("___") ? s(r.frame) : "",
    spells: cleanSpells(r.spells),
  }),
  quest_continue: (r) => ({
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
    tip: s(r.tip),
    announcer: s(r.announcer, "In a world where nothing is boring..."),
    nextSpell: cleanChallenge(r.nextSpell),
  }),
  creature_create: (r) => ({
    name: s(r.name, "Mystery Creature"),
    species: s(r.species, "Unknown Beast"),
    element: s(r.element, "cosmic"),
    habitat: s(r.habitat, "somewhere mysterious"),
    // The star count decides rarity, so the reward always matches the stars shown.
    details: Object.fromEntries(DETAIL_IDS.map((id) => [id, { has: r.details?.[id]?.has === true, quote: s(r.details?.[id]?.quote) }])),
    rarity: rarityFromStars(countStars(r.details)),
    hp: clampInt(r.hp, 10, 100, 30),
    attack: clampInt(r.attack, 10, 100, 30),
    defense: clampInt(r.defense, 10, 100, 30),
    magic: clampInt(r.magic, 10, 100, 30),
    abilities: (Array.isArray(r.abilities) ? r.abilities : [])
      .slice(0, 3)
      .map((a) => ({ name: s(a?.name, "Mystery Move"), effect: s(a?.effect) })),
    spells: cleanSpells(r.spells),
    artistNote: s(r.artistNote),
    tip: s(r.tip),
    upgradeQuestion: s(r.upgradeQuestion, "What color is it?"),
    svg: sanitizeSvg(r.svg),
  }),
};
