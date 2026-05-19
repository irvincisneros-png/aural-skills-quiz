# Year 8 Aural Skills Quiz

A single-file website that quizzes Year 8 students on **High–Same–Low**,
**Rhythm dictation**, and **Tempo & dynamics**, gives **instant feedback**, and
sends each student's results to a **Google Sheet** you own. Maps the score to
your report bands (Outstanding → Developing) with the matching comment.

No libraries, no audio files, works on locked-down school Chromebooks.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole quiz (student) + teacher decode page. The only file students open. |
| `apps-script.gs` | Paste into Google Apps Script so results land in your Sheet. |

## Setup (about 10 minutes, once)

### 1. Results Sheet + Apps Script
1. Create a new **Google Sheet**.
2. In it: **Extensions → Apps Script**.
3. Delete the sample code, paste all of `apps-script.gs`, **Save**.
4. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. **Authorise** when asked, then **copy the Web app URL**.

### 2. Configure the quiz
Open `index.html` and edit the **TEACHER CONFIG** block at the top:
- `scriptUrl`: paste the Web app URL from step 1.5.
- `classList`: your class codes.
- `quizId`: a label for this round (e.g. `Y8-Aural-T2`).
- Optionally adjust `bands` cut-offs, `questionsPerSkill`, `maxReplays`.

### 3. Publish on GitHub Pages
1. New repo (e.g. `aural-skills-quiz`), upload `index.html`.
2. **Settings → Pages →** deploy from `main`, root.
3. Copy the published URL (e.g. `https://you.github.io/aural-skills-quiz/`).

### 4. Google Classroom
Create an assignment, paste the GitHub Pages URL as a link. Done.

## Collecting data
Open your Google Sheet — one row per student per attempt: name, class, score,
percent, **band**, the **report comment** to paste, per-skill breakdown, and
every answer. Export anytime via **File → Download → CSV / Excel**.

## If a device blocks auto-submit
The student screen shows a **Download my results** button and a **backup code**.
Either: the student submits the downloaded CSV to the Classroom assignment, or
gives you the code. Open `index.html?mode=teacher`, paste codes (one per line),
and download a combined CSV.

## Test before rollout
- Open `index.html` (locally or the Pages URL), do the quiz with `scriptUrl`
  set, then check a row appears in the Sheet.
- Visit `?mode=teacher` and paste a backup code to confirm decoding works.
