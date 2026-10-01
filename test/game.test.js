import { test } from "node:test";
import assert from "node:assert/strict";
import { TASKS, NORMALIZE, fullPrompt, describeShape, sanitizeSvg } from "../public/js/prompts.js";
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
  const plain = { description: "it is a monster", habitat: "somewhere mysterious", rarity: "epic" };
  assert.equal(artTierFor(plain), "common", "a very short description is always a sketch");
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
