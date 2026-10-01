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

### The picture test: plain writing gets plain results

Every judgment in the game (spells, story power, Creature Lab stars, Epic-o-meter scores) is made by the AI with one rule: **a detail only counts if a reader can see or hear something specific.**

- Fuzzy words don't count: big, huge, loud, really, very, super, cool, awesome, scary, fast. "He roared really loud" names a sound, but nobody can hear it. "ROOOAR!", "roared like a jet engine", or "roared so loud the windows shattered" passes.
- Naming an event isn't describing it: "Godzilla transformed into fire Godzilla" is a fun idea, but what does fire Godzilla look like?
- Simple but specific passes: "red fire", "three eyes", "BOOM!", "Max was scared".
- Spelling never counts against the child.

For example, "Godzilla tranformd into fire godzilla and blue evreyon away. He rord rely loud" earns **no spells** (🕯️ Tiny power). Sparky quotes back the three fuzzy bits and asks what fire Godzilla looks like. "Godzillas scales turned red hot and flames shot out of his back spikes. He let out a ROOOAR that shatterd every window in the city. Max yelled "Hold on!" and zoomed his silver ship under Godzillas tail" earns four (🔥 Blaze).

How the child finds out what to fix:

- **While typing:** a hint under the writing box points at a fuzzy word, with a question: 🔍 "rord rely loud" is fuzzy. How loud? What does it sound like?
- **After sending:** the AI lists the fuzzy words (🔍 Fuzzy: "rord rely loud"), and **Sparky says a tip out loud** whenever the writing misses the mark (Tiny or Spark story power, a sketch-only creature, or an Epic score under 7). The tip names one fuzzy bit and offers two vivid choices ("Does it go ROOOAAAR, or rumble like a truck?"). A 🔊 **Sparky's tip** button replays it. Grown-ups can turn spoken tips off.
- **Talking it out:** the voice coach follows the same test. If the child answers "really loud", Sparky doesn't call it great. He offers two or three vivid ways to say it and lets the child pick or invent one; if they repeat themselves, he switches to an easy either/or.

## Game modes

- **🗺️ Story Quest**: pick a world (Kaiju Coast, Galaxy Rebellion, Dino Island, Dragon Kingdom...) and invent a hero. The AI writes a chapter that ends on a cliffhanger, the child writes what happens next, and they take turns. After each turn comes a **power-up**: Sparky picks **one sentence the child wrote** and asks one question about it ("What color is Godzilla's fire?"). The child edits that sentence in place, with a quick before/after example of the move ("The ship landed." → "The **silver, spiky** ship landed."). If they tack the detail on the end instead ("Fire Godzilla came from the ground. Red Fire"), Sparky celebrates the detail and offers a fill-in-the-blank frame built from their sentence ("Fire Godzilla burst from the ground, blasting ___ fire.") for one more try. Finished stories become books in the library.

  **Story power:** the spells in the child's part (judged with the picture test) decide how exciting the next chapter is: 0 spells → 🕯️ Tiny (2–3 plain sentences, nothing much happens), 1–2 → ⚡ Spark (a small surprise), 3–4 → 🔥 Blaze (an exciting new event or creature), 5+ → 🌋 MEGA (a big twist and an epic cliffhanger). A power line under the writing box updates as they type ("⚡ Spark power · 2 more spells for a 🔥 Blaze chapter!"), the reward names the power they earned, a power-up that adds a spell boosts it, and every chapter wears a badge, so plain writing visibly gets a plain chapter.
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

## 🔊 Read-aloud

"Read to me" (story chapters and whole books) uses OpenAI's voice, `gpt-4o-mini-tts`, with directions for a warm, dramatic storyteller who makes sound words like KABOOM punchy. Boring-to-EPIC's movie-trailer button uses a deep announcer voice. Audio is generated per chapter (a few seconds), cached so replays are free, and read in chunks for long books. Without an OpenAI key, or if a request fails, it falls back to the browser's built-in voice.

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
| (read-aloud) | `gpt-4o-mini-tts` | voices `marin` (stories) and `onyx` (movie trailer), set in `public/js/engine.js` |

Every story request uses strict structured output (the reply always matches the game's format) and `store: false`, so OpenAI doesn't keep your child's writing.

### Option C: practice magic (no AI)

Without a key the game still works. It uses simple word patterns to spot spells, pre-written chapters, and a code-drawn creature. That's good for trying it out, but the real AI is much better at reacting to what your child actually wrote.

### Legacy: the claude.ai artifact

`npm run build:artifact` builds a single HTML file that can be published as a claude.ai artifact. There the game runs on Claude through the viewer's Claude account, because claude.ai pages can't reach OpenAI. It has no painting and no voice coach. GitHub Pages is the main version now.

## Creature Lab: detail stars and painted art

The artist needs six things, shown as **detail stars**: ⭐ Body, Colors, Parts (wings, horns, tails, eyes), Powers, Sounds, and Home. Stars light up **while the child types**, and the star count decides the art:

| Stars | Rarity | What they get |
|---|---|---|
| 0–2 | Common | 📐 only a plain vector sketch, with a banner on it: "Just a sketch: 2 more ⭐ unlock a real painting!" |
| 3 | Rare | 🖌️ a real painting (concept art) |
| 4–5 | Epic | 🎬 a movie-poster painting |
| 6 | Legendary | 🏆 the most epic cinematic reveal |

- The AI decides which stars were really earned, quoting the child's words for each; the rarity follows the count, so the reward always matches the stars shown. Stars follow the picture test: "it is big" doesn't earn Body ("as tall as a skyscraper" does), "it roars" doesn't earn Sounds ("SKREEEE!" does), and "it has powers" doesn't earn Powers ("it shoots ice lasers" does).
- Rare and better go **straight to painting**, with no sketch first (and the model skips drawing an SVG, which saves time).
- **Evolving means improving the whole description**: the result screen shows the child's own description in an editable box ("it is a big monster" → "it is a big purple monster with bat wings that roars"). Stars light up for new words as they edit, the message says what they'll unlock, and one hint question points at a missing star.
- The painting prompt uses only the child's own words: anything they didn't describe stays plain.
- OpenAI won't paint lookalikes of famous characters (a creature with dark scales and glowing blue back spikes gets blocked for looking like Godzilla). When that happens, Sparky explains that creature designers make theirs one-of-a-kind and suggests a twist; the sketch stays.
- Paintings are shrunk to about 50 KB before saving. If storage fills up, the oldest paintings are dropped first; gems and books are never lost.

## Grown-ups corner

Tap **Grown-ups corner** on the home screen. A quick multiplication question keeps kids out. Inside you'll find:

- total words written
- average words per story turn, first five vs. latest five
- a chart of recent writing lengths
- which spells your child uses most
- settings: story length, sound, read-aloud, spoken tips, voice coach, writer name

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
public/js/picture.js      the live picture-test hint (spots fuzzy words while typing)
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
