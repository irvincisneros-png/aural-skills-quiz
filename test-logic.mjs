import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "index.html"), "utf8");

function slice(start, end, label) {
  const i = html.indexOf(start);
  const j = html.indexOf(end, i + start.length);
  if (i < 0 || j < 0) throw new Error("Could not locate region: " + label);
  return html.slice(i, j);
}

// CONFIG object literal — sentinel-delimited (immune to internal `\n}` patterns)
const cfgSrc = slice("const CONFIG = {", "/* ====================  END CONFIG", "CONFIG");
// Pure logic region: generators..buildQuiz (no DOM references at top level)
const gens = slice(
  "/* ---------- Question generators ---------- */",
  "/* ---------- App state ---------- */",
  "generators"
);
// bandFor + encodeCode
const bandM = html.match(/function bandFor\(pct\)\{[\s\S]*?\n\}/);
const encM  = html.match(/function encodeCode\(p\)\{[\s\S]*?\n\}/);
if (!bandM || !encM) throw new Error("bandFor/encodeCode not found");

const sandbox = new Function(`
  ${cfgSrc}
  ${gens}
  ${bandM[0]}
  ${encM[0]}
  const decode = c => JSON.parse(decodeURIComponent(escape(atob(c.slice(4)))));
  return { CONFIG, buildQuiz, bandFor, encodeCode, decode, rhythmSchedule, RPATTERNS_EASY, RPATTERNS_HARD, rhythmWords };
`)();

const { CONFIG, buildQuiz, bandFor, encodeCode, decode, rhythmSchedule, RPATTERNS_EASY, RPATTERNS_HARD, rhythmWords } = sandbox;

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log("FAIL:", msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

// --- Quiz assembly ---
const qs = buildQuiz();
eq(qs.length, CONFIG.questionsPerSkill * 3, "buildQuiz total length");
for (const skill of ["High–Same–Low", "Rhythm Dictation", "Tempo & Dynamics"]) {
  eq(qs.filter(q => q.skill === skill).length, CONFIG.questionsPerSkill, `count of ${skill}`);
}
for (const q of qs) {
  const n = (q.optionsHTML || q.options).length;
  ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < n,
     `correct index in range for ${q.skill}`);
}

// --- Band mapping (cut-offs 90/75/60/45/0) ---
eq(bandFor(95).name, "Outstanding", "bandFor 95");
eq(bandFor(90).name, "Outstanding", "bandFor 90 boundary");
eq(bandFor(89).name, "Excellent",   "bandFor 89");
eq(bandFor(75).name, "Excellent",   "bandFor 75 boundary");
eq(bandFor(67).name, "Strong",      "bandFor 67");
eq(bandFor(60).name, "Strong",      "bandFor 60 boundary");
eq(bandFor(50).name, "Sound",       "bandFor 50");
eq(bandFor(45).name, "Sound",       "bandFor 45 boundary");
eq(bandFor(44).name, "Developing",  "bandFor 44");
eq(bandFor(0).name,  "Developing",  "bandFor 0");

// --- Encode round-trip ---
const sample = { quizId:"Y8-Aural", name:"Tëst Nâme", cls:"8MUS1",
  score:10, total:15, pct:67, band:"Strong", report:"-",
  perSkill:{ "High–Same–Low":"2/5" }, answers:"a:1", ts:"2026-05-19T00:00:00.000Z" };
eq(decode(encodeCode(sample)), sample, "encode→decode round-trip");

// --- Reference code regression ---
const REF = "AQ1-eyJxdWl6SWQiOiJZOC1BdXJhbCIsIm5hbWUiOiJJcnZpbiBDaXNuZXJvcyIsImNscyI6IjhNVVMxIiwic2NvcmUiOjEwLCJ0b3RhbCI6MTUsInBjdCI6NjcsImJhbmQiOiJTdHJvbmciLCJyZXBvcnQiOiItIGRpc3BsYXllZCBzdHJvbmcgYXVyYWwgc2tpbGxzIGluIGEgcmFuZ2Ugb2YgbGlzdGVuaW5nIGFjdGl2aXRpZXMiLCJwZXJTa2lsbCI6eyJIaWdo4oCTU2FtZeKAk0xvdyI6IjIvNSIsIlRlbXBvICYgRHluYW1pY3MiOiI1LzUiLCJSaHl0aG0gRGljdGF0aW9uIjoiMy81In0sImFuc3dlcnMiOiJIaWdo4oCTU2FtZeKAk0xvdzowfFRlbXBvICYgRHluYW1pY3M6MXxSaHl0aG0gRGljdGF0aW9uOjB8SGlnaOKAk1NhbWXigJNMb3c6MHxUZW1wbyAmIER5bmFtaWNzOjF8SGlnaOKAk1NhbWXigJNMb3c6MXxUZW1wbyAmIER5bmFtaWNzOjF8Umh5dGhtIERpY3RhdGlvbjowfFJoeXRobSBEaWN0YXRpb246MXxUZW1wbyAmIER5bmFtaWNzOjF8VGVtcG8gJiBEeW5hbWljczoxfEhpZ2jigJNTYW1l4oCTTG93OjB8Umh5dGhtIERpY3RhdGlvbjoxfEhpZ2jigJNTYW1l4oCTTG93OjF8Umh5dGhtIERpY3RhdGlvbjoxIiwidHMiOiIyMDI2LTA1LTE5VDAyOjU1OjEyLjQ3OFoifQ==";
const r = decode(REF);
eq(r.name, "Irvin Cisneros", "ref name");
eq(r.cls, "8MUS1", "ref cls");
eq([r.score, r.total, r.pct, r.band], [10, 15, 67, "Strong"], "ref score/total/pct/band");

// --- rhythmSchedule (beat-indicator fix) ---
{
  const bps = 0.7;
  for (const p of [...RPATTERNS_EASY, ...RPATTERNS_HARD]) {
    // Both sides below use (b+1)*bps multiplication (not accumulation) — avoids fp drift
    const s = rhythmSchedule(p, bps);
    eq(s.length, p.length + 1, `sched length ${p}`);
    eq(s[0].t, 0, `ready t=0 ${p}`);
    eq(s[0].kind, "ready", `ready kind ${p}`);
    ok(s[0].clicks === undefined, `ready has no clicks ${p}`);
    const clickTimes = [];
    for (let b = 0; b < p.length; b++) {
      const ev = s[b + 1];
      eq(ev.t, (b + 1) * bps, `beat ${b+1} t ${p}`);
      eq(ev.kind, "beat", `beat ${b+1} kind ${p}`);
      eq(ev.beat, b + 1, `beat ${b+1} num ${p}`);
      const bpsT = 0.7;
      let exp;
      if (p[b]==="q") exp=[(b+1)*bpsT];
      else if (p[b]==="ee") exp=[(b+1)*bpsT,(b+1)*bpsT+bpsT/2];
      else if (p[b]==="ssss") exp=[(b+1)*bpsT,(b+1)*bpsT+bpsT/4,(b+1)*bpsT+bpsT/2,(b+1)*bpsT+3*bpsT/4];
      else if (p[b]==="ess") exp=[(b+1)*bpsT,(b+1)*bpsT+bpsT/2,(b+1)*bpsT+3*bpsT/4];
      else if (p[b]==="sse") exp=[(b+1)*bpsT,(b+1)*bpsT+bpsT/4,(b+1)*bpsT+bpsT/2];
      else exp=[];
      eq(ev.rest, p[b]==="r", `rest flag ${p}@${b}`);
      eq(ev.clicks, exp, `clicks ${p}@${b}`);
      (s[b + 1].clicks || []).forEach(c => clickTimes.push(c));
    }
    const restTimes = p.map((t, b) => t === "r" ? (b + 1) * bps : null).filter(x => x !== null);
    ok(!clickTimes.some(ct => restTimes.some(rt => Math.abs(ct - rt) < 1e-9)), `no click on rest ${p}`);
    ok(!clickTimes.some(ct => Math.abs(ct) < 1e-9), `no audio at t=0 ${p}`);
  }
}

// --- rhythmWords (school vocabulary) ---
{
  eq(rhythmWords(["q"]), "Tea", "word q");
  eq(rhythmWords(["ee"]), "Coffee", "word ee");
  eq(rhythmWords(["ssss"]), "Coca-Cola", "word ssss");
  eq(rhythmWords(["ess"]), "Strawberry", "word ess");
  eq(rhythmWords(["sse"]), "Berry-Straw", "word sse");
  eq(rhythmWords(["r"]), "(rest)", "word r");
  eq(rhythmWords(["q","ee","r","ssss"]), "Tea – Coffee – (rest) – Coca-Cola", "word join");
}

// --- rhythmSchedule sixteenth tokens ---
{
  const bps = 0.7;
  const s = rhythmSchedule(["ssss","ess","sse","r"], bps);
  eq(s.length, 5, "16th sched length");
  eq(s[0].kind, "ready", "16th ready");
  eq(s[1].clicks, [1*bps, 1*bps+bps/4, 1*bps+bps/2, 1*bps+3*bps/4], "ssss clicks");
  eq(s[1].rest, false, "ssss not rest");
  eq(s[2].clicks, [2*bps, 2*bps+bps/2, 2*bps+3*bps/4], "ess clicks");
  eq(s[3].clicks, [3*bps, 3*bps+bps/4, 3*bps+bps/2], "sse clicks");
  eq(s[4].rest, true, "r rest");
  eq(s[4].clicks, [], "r no clicks");
  const all = s.flatMap(e=>e.clicks||[]);
  ok(!all.some(c=>Math.abs(c)<1e-9), "16th no audio at t=0");
  ok(!all.some(c=>Math.abs(c-4*bps)<1e-9), "16th no click on rest beat");
}

// --- tiered pools + buildQuiz ordering ---
{
  const SIX = ["ssss","ess","sse"];
  ok(RPATTERNS_EASY.length>0 && RPATTERNS_HARD.length>0, "pools non-empty");
  for (const p of RPATTERNS_EASY) {
    eq(p.length, 4, `easy len ${p}`);
    ok(p.every(t=>["q","ee","r"].includes(t)), `easy only q/ee/r ${p}`);
  }
  for (const p of RPATTERNS_HARD) {
    eq(p.length, 4, `hard len ${p}`);
    ok(p.some(t=>SIX.includes(t)), `hard has a 16th ${p}`);
  }
  const qs = buildQuiz();
  const rh = qs.filter(q=>q.skill==="Rhythm Dictation");
  eq(rh.length, CONFIG.questionsPerSkill, "rhythm question count");
  const n=CONFIG.questionsPerSkill, easyCount=Math.ceil(n*0.6);
  rh.forEach((q,i)=>{ eq(q.tier, i<easyCount?"easy":"hard", `rhythm[${i}] tier`); });
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
