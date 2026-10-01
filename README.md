# 🐉 Story Quest

A creative-writing game for young writers (built for a 3rd grader who loves magic, fantasy, creatures, and sci-fi). The AI runs on OpenAI: `gpt-6.1-sol` for stories and coaching, `gpt-image-2.5-flare` for creature art, and `gpt-realtime-2.1` for the voice coach. Claude helps review the activity reports and improve the game.

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

Spells light up while the child types. The AI then confirms which ones they really cast, quoting the child's own words back to them. Each spell earns gems and fills a page of the Spellbook, with Bronze, Silver, and Gold ranks.

## Game modes

- **🗺️ Story Quest**: pick a world (Kaiju Coast, Galaxy Rebellion, Dino Island, Dragon Kingdom...) and invent a hero. The AI writes a chapter that ends on a cliffhanger, the child writes what happens next, and they take turns. After each turn comes a **power-up**: Sparky picks **one sentence the child wrote** and asks one question about it ("What color is Godzilla's fire?"). The child edits that sentence in place, with a quick before/after example of the move ("The ship landed." → "The **silver, spiky** ship landed."). If they tack the detail on the end instead ("Fire Godzilla came from the ground. Red Fire"), Sparky celebrates the detail and offers a fill-in-the-blank frame built from their sentence ("Fire Godzilla burst from the ground, blasting ___ fire.") for one more try. Finished stories become books in the library.
- **⚡ Boring-to-EPIC**: the Boring-o-Tron 3000 shows a dull sentence ("The dog ran."). The child rewrites it and the Epic-o-meter scores it 1–10. Gems come only from beating your own best, so the fun is in revising. A movie-trailer voice reads the result aloud.
- **🐲 Creature Lab**: describe a creature and get a collectible trading card with an AI drawing. The catch is that **the artist draws only what you write**. "A monster" gets you a plain blob; "purple scales, three glowing eyes, and bat wings" gets you a real beast with higher stats. Evolve the creature by answering the artist's question.

## 🎙️ Voice coach: talk it out with Sparky (OpenAI key)

Kids can usually say far more than they can write, so on the Story Quest, power-up, and Creature Lab screens a **🎙️ Talk it out with Sparky** button starts a short spoken conversation using OpenAI's realtime voice (`gpt-realtime-2.1`). Sparky:

- asks one question at a time about details (looks, sounds, feelings, what someone says)
- waits patiently while they think
- after a few exchanges, says their own ideas back as one sentence and tells them to go write it

What the child says shows up on screen as **"Your ideas"** notes to write from. Sparky never dictates the writing, never corrects grammar, never asks for personal information, and points them to a trusted grown-up if something sounds wrong in real life.

- Sessions last up to 5 minutes. A daily limit (20 minutes by default) is set in the Grown-ups corner, where the voice coach can also be turned off.
- The browser connects using a key that expires in 2 minutes. On the server version, your real OpenAI key never reaches the browser.
- It needs a microphone, so it works on the github.io site and the self-hosted server, but not inside claude.ai.

## Activity log: see how your child actually plays

Every step is recorded **on that device only**: each piece of writing (with how long it took), what Sparky said, which power-ups were woven in, tacked on, or skipped, voice-coach conversations, Epic scores, creature descriptions, and any errors. The **Grown-ups corner → Recent activity** section shows sessions as timelines. **📋 Copy report for Claude** produces a plain-text report you can paste into a chat with Claude to adjust the game around what your child really does.

## Rules the AI follows

The full prompt is in `public/js/prompts.js`. In short:

- It never mentions spelling or grammar, and reads misspellings the way the child meant them.
- It never writes the child's part. The 🔮 Idea crystal gives questions, not sentences to copy.
- Praise is specific and quotes the child's actual words.
- Each nudge is one question, never a list of fixes.
- The child's ideas are canon. If they add a laser-shooting penguin, the story has one now.
- Content stays kid-safe: cartoon peril is fine, gore and real scares are not.

## Playing it

Everything runs on **one OpenAI API key** (from platform.openai.com). A ChatGPT subscription doesn't include API access; API use is billed separately per use. **Set a monthly spending limit** on your OpenAI account.

### Option A: GitHub Pages (recommended)

The game lives at **https://andylewisart.github.io/Creative-Writing-Pal/**. A workflow (`.github/workflows/pages.yml`) runs the tests, builds a static copy of the game, and republishes it on every push.

There's no server on GitHub Pages, so the key is entered on each device:

1. Open the site and go to **Grown-ups corner → AI connection**.
2. Paste your OpenAI key and tap **Check key**. Checking is free.

The key is saved only in that browser and is sent only to OpenAI. Visitors without a key get practice magic. Anyone using that device could find the key in the browser's developer tools, which is why the spending limit matters. Per device, the page allows 25 paintings a day and 20 minutes of voice coaching a day; the voice limit can be changed in the Grown-ups corner.

To build the static copy locally: `npm run build:pages` (output in `site/`).

### Option B: run the server yourself

You need Node.js 20 or newer.

```bash
npm install
echo "OPENAI_API_KEY=sk-proj-..." > .env
npm start
# open http://localhost:3000
```

Other devices on your Wi-Fi, like a tablet, can open `http://<this-computer's-IP>:3000`. On the server version the key stays on the server: browsers only ever get short-lived voice keys.

| Setting (in `.env`) | Default | |
|---|---|---|
| `STORY_QUEST_MODEL` | `gpt-6.1-sol` | stories, coaching, judging, creature sketches |
| `STORY_QUEST_EFFORT` | `low` | thinking level ("Light" in ChatGPT); `minimal`, `medium`, `high` also work |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2.5-flare` | `gpt-image-2.5-sunburst` also works (a bit slower) |
| `OPENAI_IMAGE_QUALITY` | `medium` | `low` is cheaper; `high`, `xhigh`, `max` cost more |
| `OPENAI_IMAGE_SIZE` | `1024x1024` | |
| `PAINTS_PER_DAY` | `25` | |
| `OPENAI_VOICE_MODEL` | `gpt-realtime-2.1` | voice coach model (`gpt-realtime-2.1-mini` is cheaper) |
| `OPENAI_VOICE` | `marin` | Sparky's voice |
| `VOICE_SESSIONS_PER_DAY` | `20` | |

Every story request uses strict structured output (the reply always matches the game's format) and `store: false`, so OpenAI doesn't keep your child's writing.

### Option C: practice magic (no AI)

Without a key the game still works. It uses simple word patterns to spot spells, pre-written chapters, and a code-drawn creature. That's good for trying it out, but the real AI is much better at reacting to what your child actually wrote.

### Legacy: the claude.ai artifact

`npm run build:artifact` builds a single HTML file that can be published as a claude.ai artifact. There the game runs on Claude through the viewer's Claude account, because claude.ai pages can't reach OpenAI. It has no painting and no voice coach. GitHub Pages is the main version now.

## Painted creature art

**The art gets cooler as the writing gets more detailed.** The card's rarity, which the AI judges from the description, picks what the child gets:

| Rarity | Art style |
|---|---|
| Common (bare-bones, or under 12 words) | 📐 only the AI's plain vector sketch, no painting, with a nudge to add details |
| Rare | 🖌️ movie concept art: realistic textures, dramatic light |
| Epic | 🎬 blockbuster monster-movie shot: huge scale, low camera angle, atmosphere |
| Legendary | 🏆 the most epic cinematic reveal |

- Rare and better go **straight to painting**: no sketch first. The creature's picture is shown large, with its name and rarity on top.
- The painting prompt uses only the child's own words: anything they didn't describe stays plain.
- Each creature level gets one painting. Evolving a creature (adding details) paints the new version, and the earlier sketch stays viewable.
- Paintings are shrunk to about 50 KB before saving. If storage fills up, the oldest paintings are dropped first; gems and books are never lost.
- OpenAI won't paint lookalikes of famous characters. A creature with dark scales and glowing blue back spikes gets blocked for looking like Godzilla. When that happens, Sparky explains that real creature designers make theirs one-of-a-kind and suggests a Twist Spell, and the sketch stays. The AI's evolve question also nudges toward originality when a creature is a copy.

## Grown-ups corner

Tap **Grown-ups corner** on the home screen. A quick multiplication question keeps kids out. Inside you'll find:

- total words written
- average words per story turn, first five vs. latest five
- a chart of recent writing lengths
- which spells your child uses most
- settings: story length, sound, read-aloud, writer name

## Project layout

```
server.js                 Node server: serves the game, calls OpenAI with the key in .env
public/index.html         page shell
public/css/style.css      all styles
public/js/prompts.js      the AI guide, each task's prompt + JSON schema, reply cleanup
public/js/ai.js           picks the backend: server, browser key (github.io), claude.ai artifact, or practice
public/js/engine.js       the OpenAI calls: stories, paintings, voice keys (shared by server and github.io build)
public/js/direct.js       github.io build: calls OpenAI from the browser with the saved key
public/js/keys.js         the key saved on this device (github.io build)
public/js/voice.js        the voice coach (OpenAI realtime over WebRTC)
public/js/log.js          the activity log (this device only)
public/js/report.js       turns the log into sessions, timelines, and the copyable report
public/js/demo.js         practice-mode magic + live spell lights
public/js/state.js        saved progress (browser localStorage), gems, Sparky's levels
public/js/modes/*.js      quest, epic, creature, library, grown-ups screens
scripts/build-artifact.mjs  bundles everything into one HTML file (legacy claude.ai artifact)
scripts/build-pages.mjs   builds the static github.io site into site/
.github/workflows/pages.yml publishes site/ to GitHub Pages
test/                     unit tests + server tests against a fake OpenAI API
```

```bash
npm test
```
