import { test } from "node:test";
import assert from "node:assert/strict";
import { TASKS, NORMALIZE, GUIDE, fullPrompt, describeShape, sanitizeSvg, voiceInstructions } from "../public/js/prompts.js";
import { detectSpells, demoReply } from "../public/js/demo.js";

const quest = {
  writerName: "Leo",
  world: "Dragon Kingdom",
  worldId: "dragon",
  hero: { name: "Zara", kind: "a young wizard", power: "shoots rainbow lasers" },
  story: [
    { author: "ai", text: "Chapter one." },
    { author: "kid", text: "Zara zoomed to the cave." },
  ],
  kidText: "Zara zoomed to the cave.",
  bonus: { spell: "sound", prompt: "What do you hear?" },
  addition: "",
  powerUp: { prompt: "What does it look like?" },
  turnNumber: 2,
  totalTurns: 5,
  context: "a story",
  draft: "",
  boring: "The dog ran.",
  attempt: "The huge red dog zoomed like a rocket. WOOF!",
  previous: [],
  description: "A giant green monster with wings and three eyes.",
};

test("every task builds a prompt and has a strict schema", () => {
  for (const [name, t] of Object.entries(TASKS)) {
    const text = t.build(quest);
    assert.ok(text.includes("TASK:"), `${name} prompt`);
    assert.equal(t.schema.additionalProperties, false, `${name} schema`);
    assert.deepEqual(t.schema.required, Object.keys(t.schema.properties), `${name} required`);
    assert.ok(fullPrompt(name, quest).includes("Reply with only one JSON object"));
    assert.ok(["quick", "default", "complex"].includes(t.tier));
    assert.ok(typeof NORMALIZE[name] === "function");
  }
});

test("schemas nested objects are strict too (structured outputs requirement)", () => {
  const walk = (s, where) => {
    if (s.type === "object") {
      assert.equal(s.additionalProperties, false, where);
      assert.deepEqual(s.required, Object.keys(s.properties), where);
      for (const [k, v] of Object.entries(s.properties)) walk(v, `${where}.${k}`);
    }
    if (s.type === "array") walk(s.items, `${where}[]`);
  };
  for (const [name, t] of Object.entries(TASKS)) walk(t.schema, name);
});

test("describeShape renders a readable shape", () => {
  const shape = describeShape(TASKS.epic_judge.schema);
  assert.match(shape, /"score": integer/);
  assert.match(shape, /"id": "sight" \| "sound"/);
});

test("practice-mode spell detection finds the obvious moves", () => {
  const ids = detectSpells('The huge red dragon zoomed like a rocket. "Run!" yelled Max. KABOOM! He felt scared.').map((s) => s.id);
  for (const id of ["sight", "power", "likea", "talk", "sound", "feelings"]) assert.ok(ids.includes(id), id);
  assert.deepEqual(detectSpells("The dog ran."), []);
});

test("normalizers survive junk replies", () => {
  for (const name of Object.keys(TASKS)) {
    const out = NORMALIZE[name]({});
    assert.ok(out && typeof out === "object", name);
  }
  const r = NORMALIZE.quest_react({ spells: [{ id: "sight", quote: "x" }, { id: "sight", quote: "y" }, { id: "nope" }] });
  assert.deepEqual(r.spells, [{ id: "sight", quote: "x" }]);
  assert.equal(NORMALIZE.epic_judge({ score: 42 }).score, 10);
  assert.equal(NORMALIZE.creature_create({ hp: -5 }).hp, 10);
});

test("svg sanitizer keeps only the svg element", () => {
  assert.equal(sanitizeSvg("here you go: <svg viewBox='0 0 1 1'></svg> enjoy"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox='0 0 1 1'></svg>`);
  assert.equal(sanitizeSvg("no drawing"), "");
});

test("demo replies normalize cleanly for every task", () => {
  for (const name of Object.keys(TASKS)) {
    const out = NORMALIZE[name](demoReply(name, quest));
    assert.ok(out, name);
  }
  const creature = NORMALIZE.creature_create(demoReply("creature_create", quest));
  assert.match(creature.svg, /^<svg/);
  assert.match(creature.svg, /<path/); // wings were described, so they get drawn
});

test("paint prompt keeps the 'draws only what you write' rule and climbs the art ladder", async () => {
  const { paintPrompt, artTierFor } = await import("../public/js/prompts.js");
  const plain = { description: "it is a monster", habitat: "somewhere mysterious", rarity: "common" };
  assert.equal(artTierFor(plain), "common");
  assert.match(paintPrompt(plain), /pencil sketch/);
  assert.match(paintPrompt(plain), /plain gray skin/);
  assert.match(paintPrompt(plain), /didn't say where it lives/);
  const rich = { name: "Zapzilla", rarity: "legendary", description: "A giant purple monster with orange wings that lives in a smoky volcano and breathes blue fire at night.", habitat: "a smoky volcano" };
  assert.equal(artTierFor(rich), "legendary");
  assert.match(paintPrompt(rich), /awe-inspiring cinematic/);
  assert.match(paintPrompt(rich), /its home, a smoky volcano/);
  assert.equal(artTierFor({ ...rich, rarity: "rare" }), "rare");
  assert.match(paintPrompt({ ...rich, rarity: "rare" }), /concept painting/);
});

test("practice-mode revision check catches tacked-on fragments like 'Red Fire'", async () => {
  const before = "Fire Godzilla came from the ground.";
  const check = (after) => NORMALIZE.quest_revise(demoReply("quest_revise", { before, after }));
  const tacked = check("Fire Godzilla came from the ground. Red Fire");
  assert.equal(tacked.woven, false);
  assert.match(tacked.frame, /___/);
  assert.equal(check("Fire Godzilla came from the ground blasting red fire.").woven, true);
  assert.equal(check("Red Fire Godzilla came from the ground.").woven, true);
  assert.equal(check(before).changed, false);
});

test("revision prompt and voice instructions keep the teaching rules", async () => {
  const { voiceInstructions } = await import("../public/js/prompts.js");
  const p = TASKS.quest_revise.build({ before: "A.", after: "A. Red", spell: "sight", prompt: "What color?", attempt: 1 });
  assert.match(p, /tacked on/);
  assert.match(p, /___/);
  assert.match(TASKS.quest_react.build(quest), /target: copy it exactly/);
  const v = voiceInstructions({ writerName: "Leo", where: "Story Quest", draft: "Fire Godzilla came from the ground.", question: "What color?" });
  assert.match(v, /Leo/);
  assert.match(v, /Fire Godzilla came from the ground/);
  assert.match(v, /personal information/);
  assert.match(v, /grown-up they trust/);
});

test("detail stars light up from the child's words and set the rarity", async () => {
  const { detectDetails, countStars, rarityFromStars, nextUnlock } = await import("../public/js/details.js");
  const poor = detectDetails("it is a big monster that roars and has powers");
  assert.equal(countStars(poor), 0, "fuzzy words don't earn stars");
  assert.equal(rarityFromStars(countStars(poor)), "common");
  assert.deepEqual(nextUnlock(1), { need: 2, icon: "🖌️", label: "a real painting" });
  const rich = detectDetails("A purple monster as tall as a skyscraper with orange bat wings. It breathes blue fire, roars like thunder, and lives in a volcano.");
  assert.equal(countStars(rich), 6);
  assert.equal(rarityFromStars(6), "legendary");
  const r = NORMALIZE.creature_create({ rarity: "legendary", details: { body: { has: true, quote: "big" } } });
  assert.equal(r.rarity, "common", "rarity comes from the stars, not the model's word");
});

test("story power: spells decide how exciting the next chapter is", async () => {
  const { powerFor, powerHint } = await import("../public/js/spells.js");
  assert.equal(powerFor(0).id, "tiny");
  assert.equal(powerFor(1).id, "spark");
  assert.equal(powerFor(2).id, "spark");
  assert.equal(powerFor(3).id, "blaze");
  assert.equal(powerFor(4).id, "blaze");
  assert.equal(powerFor(5).id, "mega");
  assert.match(powerHint(1), /2 more spells for a 🔥 Blaze chapter/);
  const tiny = TASKS.quest_continue.build({ ...quest, power: "tiny" });
  const mega = TASKS.quest_continue.build({ ...quest, power: "mega" });
  assert.match(tiny, /STORY POWER: TINY/);
  assert.match(tiny, /nothing exciting happens/);
  assert.match(mega, /STORY POWER: MEGA/);
  assert.equal(demoReply("quest_continue", { ...quest, power: "tiny" }).chapter.split(/\s+/).length < 20, true);
});

test("picture test: fuzzy writing is spotted, judged, and coached everywhere", async () => {
  const { findFuzzy, fuzzyHint } = await import("../public/js/picture.js");
  const kid = "Godzilla tranformd into fire godzilla and blue evreyon away. He rord rely loud";
  assert.deepEqual(findFuzzy(kid).map((f) => f.quote), ["rord rely loud"]);
  assert.match(fuzzyHint(kid), /How loud\? What does it sound like\?/);
  assert.deepEqual(findFuzzy("It was as big as a bus and bigger than a house."), [], "comparisons pass");
  // ("blue" for "blew" fools the quick live check; the AI reads it as meant.)
  assert.equal(detectSpells(kid.replace("blue", "blew")).length, 0, "the live check doesn't count fuzzy words as spells");
  assert.deepEqual(detectSpells("He roared like a jet. ROOOAR! His red scales glowed.").map((x) => x.id).sort(), ["likea", "sight", "sound"]);

  // Every judging task gets the picture test through the guide.
  assert.match(GUIDE, /THE PICTURE TEST/);
  assert.match(GUIDE, /roared really loud/);
  assert.match(TASKS.quest_react.build({ ...quest, kidText: kid, bonus: {} }), /0 tiny, 1-2 spark, 3-4 blaze, 5\+ mega/);
  assert.match(TASKS.epic_judge.build({ boring: "The dog ran.", attempt: "The super big dog ran really fast." }), /only fuzzy words added/);
  assert.match(TASKS.creature_create.build({ description: "it is big" }), /"it is big" doesn't earn body/);
  for (const t of ["quest_react", "epic_judge", "creature_create"]) assert.ok(TASKS[t].schema.properties.tip, `${t} has a spoken tip`);

  const r = NORMALIZE.quest_react({ fuzzy: ["rord rely loud", 7, ""], tip: "How loud?" });
  assert.deepEqual(r.fuzzy, ["rord rely loud"]);
  assert.equal(r.tip, "How loud?");
  const demo = demoReply("quest_react", { ...quest, kidText: kid, bonus: {} });
  assert.deepEqual(demo.fuzzy, ["rord rely loud"]);
  assert.match(demo.tip, /rord rely loud/);

  // The voice coach doesn't accept "really loud" as a great answer.
  const v = voiceInstructions({ writerName: "Sam", where: "Story Quest" });
  assert.match(v, /Never call it great/);
  assert.match(v, /two or three vivid ways/);
});
