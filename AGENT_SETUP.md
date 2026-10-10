# Setup prompt: "Shrinav weds Vidushi" wedding invitation site

Paste everything below the line into your coding agent (Claude Code, Codex, Cursor, etc.), run from the folder where you want the project.

---

You are setting up an existing project on this machine: the animated wedding invitation site for Shrinav and Vidushi (#RViShCameTrue). The code lives in a public GitHub repository:

**https://github.com/AnshulRastogi20/vidushi-weds-shrinav**

It is a static site (HTML, CSS, JavaScript with GSAP from a CDN). There is no build step and no npm install. Work through these steps in order, and stop to tell me if any step fails.

## Step 1: Check the tools
Run these and report the versions:
```bash
git --version
python --version     # if this fails, try: python3 --version
```
- Git and Python 3.9 or newer are required. If either is missing, tell me how to install it for this operating system and stop.
- Node.js 18 or newer is only needed if I later want to deploy to Vercel. Check `node --version`, but do not stop if it is missing.

## Step 2: Get the code into the right folder
Look at the current working directory.

- **If it is empty** (no files and no folders; ignore hidden OS files such as `.DS_Store` or `Thumbs.db`): clone directly into it.
  ```bash
  git clone https://github.com/AnshulRastogi20/vidushi-weds-shrinav.git .
  ```
- **If it already contains this project** (a `.git` folder whose `origin` points to the repository above): do not clone again. Update it instead.
  ```bash
  git pull
  ```
- **If it contains anything else:** do not touch the existing files. Clone into a new subfolder and work from there.
  ```bash
  git clone https://github.com/AnshulRastogi20/vidushi-weds-shrinav.git
  cd vidushi-weds-shrinav
  ```

The repository is public, so no GitHub login or collaborator invite is needed to clone it. Confirm the folder now contains `CLAUDE.md`, `index.html`, `main.js`, `styles.css`, `tools/` and `assets/`.

## Step 3: Set up the agent instructions (CLAUDE.md)
1. Read `CLAUDE.md` from top to bottom before changing anything. It explains how the site works, which files do what, how the three invite links are built, the design decisions that must not be undone, and how to test and deploy. Treat it as the project's rulebook.
2. If you are **Claude Code**, `CLAUDE.md` loads automatically in future sessions. Nothing else is needed.
3. If you are **another agent**, copy `CLAUDE.md` to the file your tool reads automatically, so the rules carry into every session:
   - Codex and most other agents: `AGENTS.md` in the project root.
   - Cursor: `.cursor/rules/project.mdc`.

   Do not commit these copies unless I ask.
4. Create `CLAUDE.local.md` in the project root for notes specific to this machine: operating system, the Python command that works here (`python` or `python3`), and the local preview URL. It is for this machine only, so add `CLAUDE.local.md` to `.git/info/exclude` and do not commit it.

## Step 4: Run it and check it works
Start the local preview server and leave it running:
```bash
python tools/serve.py
```
(Use `python3` if that is what worked in Step 1.) It prints a local URL (http://127.0.0.1:5173) and a LAN URL for a phone on the same Wi-Fi.

Open **http://127.0.0.1:5173/i/3oyocz** (the link that shows all three events) and confirm each of these. If you can drive a browser, check them yourself; otherwise ask me to.
1. A gold ॐ appears with a ring filling up, then an envelope tied with a red-and-gold thread, with two cartoon characters walking in from the sides.
2. Tapping or clicking opens the envelope within about 2 seconds, and music starts.
3. The characters hold hands, turn into gold dust that fills the **S** and **V** of the logo, and the full logo builds itself: hashtag, ornament, elephants, gold ring, flowers, balloons.
4. Scrolling down shows the Ganesh blessing, then three framed cards in this order: Engagement (dark indigo with stars), Haldi (yellow with pink text), Wedding (deep red with a countdown).
5. The browser console shows no errors.

Also open **http://127.0.0.1:5173/** (wedding only) and **http://127.0.0.1:5173/i/ct1r4q** (Engagement + Wedding) and confirm each shows only its own events.

## Step 5: How to make changes safely
- All wording, dates, venues and the event list for each link live in `tools/invites.json`. After editing it, run `python tools/build_invites.py`. Never hand-edit the generated files in `invites/`.
- Follow the "Locked decisions" section of `CLAUDE.md`. In particular: never redraw or retype the logo or hashtag, always use the gold foil gradient instead of flat gold, and keep each event card's own colours.
- To check animations in slow motion, run `gsap.globalTimeline.timeScale(0.1)` in the browser console before tapping the envelope.

## Step 6: Sharing changes back (no collaborator access needed)
I am not a collaborator on the original repository, so I cannot push to it directly. To send changes back:
1. Fork the repository to my own GitHub account and point this clone at the fork:
   ```bash
   gh repo fork --remote=true
   ```
   (Without the GitHub CLI: press "Fork" on the repository page, then `git remote rename origin upstream` and `git remote add origin <my fork URL>`.)
2. Commit on a new branch, push it to my fork, and open a pull request to `AnshulRastogi20/vidushi-weds-shrinav`.
3. To get the latest changes from the original repository later: `git pull upstream master`.

## Step 7 (optional, only if I ask): Deploy my own copy
The live site and its domain belong to the repository owner. To publish a separate copy on my own Vercel account:
```bash
npx vercel login
npx vercel deploy --prod
```
Do not run this unless I ask.

## When you finish
Report back with:
- where the project now lives (full path)
- which Python command works
- which agent-instruction file you set up (CLAUDE.md as-is, AGENTS.md, or Cursor rules)
- the preview URL
- the result of each check in Step 4
- anything that failed, and the exact error message
