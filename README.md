# 🐉 Story Quest

A creative-writing game for young writers (built for a 3rd grader who loves magic, fantasy, creatures, and sci-fi), powered by Claude.

The player raises **Sparky**, a dragon who eats words. Great writing earns gems, and gems hatch and grow Sparky from a Mystery Egg into a Legendary Word Dragon.

## The big idea: detail = power

Kids whose writing is short and literal usually don't need correcting. They need a reason to add more. In every mode, the game rewards the same eight real writing moves, called **spells**:

| Spell | Writing move |
|---|---|
| 🎨 Color | what things look like: color, shape, size |
| 💥 Sound | sound words (KABOOM!) or what something sounds like |
| 👃 Senses | smell, taste, touch |
| 💬 Talking | dialogue |
| 💓 Feelings | what a character feels or thinks inside |
| 🪞 Like-a | similes ("fast as a comet") |
| ⚡ Power-Word | strong verbs ("zoomed" instead of "went") |
| 🌀 Twist | a surprise |

Spells light up while the child types. Claude then confirms which ones they really cast, quoting the child's own words back to them. Each spell earns gems and fills a page of the Spellbook, with Bronze, Silver, and Gold ranks.

## Game modes

- **🗺️ Story Quest**: pick a world (Kaiju Coast, Galaxy Rebellion, Dino Island, Dragon Kingdom...) and invent a hero. Claude writes a chapter that ends on a cliffhanger, the child writes what happens next, and they take turns. After each turn, Sparky asks **one** curious question ("What did the troll's roar sound like?"). Answering it is a **power-up** that adds a sentence to the child's part and earns bonus gems. This is revision, framed as a reward. Finished stories become books in the library, with a title, an award, and Sparky's favorite line.
- **⚡ Boring-to-EPIC**: the Boring-o-Tron 3000 shows a dull sentence ("The dog ran."). The child rewrites it and the Epic-o-meter scores it 1–10. Gems come only from beating your own best, so the fun is in revising. A movie-trailer voice reads the result aloud.
- **🐲 Creature Lab**: describe a creature and get a collectible trading card with an AI drawing. The catch is that **the artist draws only what you write**. "A monster" gets you a plain blob; "purple scales, three glowing eyes, and bat wings" gets you a real beast with higher stats. Evolve the creature by answering the artist's question.

## Rules the AI follows

The full prompt is in `public/js/prompts.js`. In short:

- It never mentions spelling or grammar, and reads misspellings the way the child meant them.
- It never writes the child's part. The 🔮 Idea crystal gives questions, not sentences to copy.
- Praise is specific and quotes the child's actual words.
- Each nudge is one question, never a list of fixes.
- The child's ideas are canon. If they add a laser-shooting penguin, the story has one now.
- Content stays kid-safe: cartoon peril is fine, gore and real scares are not.

## Playing it

### Option A: as a Claude artifact (no setup)

Run `npm run build:artifact` and publish `dist/story-quest.html` as a claude.ai artifact with the `sample` capability. When you open the link while signed in to Claude, the game asks Claude through **your Claude account**, so no API key is needed. The first AI step asks you to allow it. Progress is saved in that browser.

### Option B: on GitHub Pages (a github.io link that works on any device)

The repo includes a workflow (`.github/workflows/pages.yml`) that builds a static copy of the game and publishes it to `https://<your-username>.github.io/Creative-Writing-Pal/` on every push.

There's no server on GitHub Pages, so keys are entered on each device instead:

1. Open the site, go to **Grown-ups corner → AI connection**, and paste your Anthropic key. The OpenAI key is optional and turns on painted creature art.
2. Tap **Check keys** to confirm they work. Checking is free.

The keys are saved only in that browser and are sent only to Anthropic and OpenAI. Visitors without keys get practice magic. Anyone using that device could find the keys in the browser's developer tools, so **set a monthly spending limit** in both accounts (console.anthropic.com and platform.openai.com). The page caps paintings at 25 per day per device.

One-time GitHub setup:

1. GitHub Pages needs a **public** repo unless you have GitHub Pro: Settings → General → Danger Zone → Change visibility. No keys are stored in the code.
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Actions → "Publish to GitHub Pages" → **Run workflow**, or push any change.

To build the static copy locally: `npm run build:pages` (output in `site/`).

### Option C: run it yourself with an API key

You need Node.js 20 or newer and an Anthropic API key.

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
npm start
# open http://localhost:3000
```

Other devices on your Wi-Fi, like a tablet, can open `http://<this-computer's-IP>:3000`. The server uses `claude-opus-5-5` by default; set `STORY_QUEST_MODEL` to change it.

#### Painted creature art (optional, needs an OpenAI API key)

Add an OpenAI API key, and the Creature Lab gets a **🎨 Paint it!** button. It turns the artist's quick sketch into real artwork on the trading card. **The art gets cooler as the writing gets more detailed.** The card's rarity, which Claude judges from the description, picks the style:

| Rarity | Art style |
|---|---|
| Common (bare-bones, or under 12 words) | ✏️ rough pencil sketch, no color |
| Rare | 🖌️ movie concept art: realistic textures, dramatic light |
| Epic | 🎬 blockbuster monster-movie shot: huge scale, low camera angle, atmosphere |
| Legendary | 🏆 the most epic cinematic reveal |

The card shows the ladder and what the next tier unlocks. Creatures can look fierce, but the prompt rules out blood and gore.

```bash
# in .env, next to the Anthropic key
OPENAI_API_KEY=sk-proj-...
```

- The painting prompt uses only your child's own words, plus a fixed kid-friendly cartoon style. Anything they didn't describe comes out plain: "it is a monster" gets a simple gray blob, and a detailed description gets the full beast.
- You get one painting per creature level. Evolving a creature lets you paint the new version, and older paintings can still be viewed with "Show the painting".
- The server allows 25 paintings per day by default. When the cap is reached, the artist says the paint ran out until tomorrow.
- Paintings are shrunk to about 50 KB in the browser before saving. If storage ever fills up, the oldest paintings are dropped first; the sketch stays, and gems and books are never lost.
- OpenAI won't paint lookalikes of famous characters. A creature with dark scales and glowing blue back spikes gets blocked for looking like Godzilla. When that happens, Sparky explains that real creature designers make theirs one-of-a-kind and suggests a Twist Spell (new colors, a body part no movie monster has), and the sketch stays. Claude's evolve question also nudges toward originality when a creature is a copy.
- A ChatGPT subscription doesn't include API access. The key comes from platform.openai.com, and each painting is billed there.
- Painting only works through this server, not the claude.ai artifact version.

| Setting | Default | |
|---|---|---|
| `OPENAI_IMAGE_MODEL` | `gpt-image-2.5-flare` | `gpt-image-2.5-sunburst` also works (a bit slower) |
| `OPENAI_IMAGE_QUALITY` | `medium` | `low` is cheaper; `high`, `xhigh`, `max` cost more |
| `OPENAI_IMAGE_SIZE` | `1024x1024` | |
| `PAINTS_PER_DAY` | `25` | |

### Option D: practice magic (no AI)

With no API key and outside claude.ai, the game still works. It uses simple word patterns to spot spells, pre-written chapters, and a code-drawn creature. That's good for trying it out, but the real AI is much better at reacting to what your child actually wrote.

## Grown-ups corner

Tap **Grown-ups corner** on the home screen. A quick multiplication question keeps kids out. Inside you'll find:

- total words written
- average words per story turn, first five vs. latest five
- a chart of recent writing lengths
- which spells your child uses most
- settings: story length, sound, read-aloud, writer name

## Project layout

```
server.js                 Node server: serves the game, calls Claude (structured JSON output)
public/index.html         page shell
public/css/style.css      all styles
public/js/prompts.js      the AI guide, each task's prompt + JSON schema, reply cleanup
public/js/ai.js           picks the backend: claude.ai artifact, server, browser keys, or practice
public/js/engine.js       the Claude and image-model calls (shared by server and github.io build)
public/js/direct.js       github.io build: calls the APIs from the browser with saved keys
public/js/keys.js         keys saved on this device (github.io build)
public/js/demo.js         practice-mode magic + live spell lights
public/js/state.js        saved progress (browser localStorage), gems, Sparky's levels
public/js/modes/*.js      quest, epic, creature, library, grown-ups screens
scripts/build-artifact.mjs  bundles everything into one HTML file (claude.ai artifact)
scripts/build-pages.mjs   builds the static github.io site into site/
.github/workflows/pages.yml publishes site/ to GitHub Pages
test/                     unit tests + server tests against a fake Claude API
```

```bash
npm test
```
