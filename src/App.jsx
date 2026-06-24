import { useState, useEffect, useRef } from "react";

const AVAIL_KEY = "ws-avail";
const TRIALS_KEY = "ws-trials";

const FULL_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const DEFAULT_AVAIL = {
  1: { on: true,  start: "14:00", end: "19:00" },
  2: { on: true,  start: "14:00", end: "19:00" },
  3: { on: true,  start: "14:00", end: "19:00" },
  4: { on: true,  start: "14:00", end: "19:00" },
  5: { on: true,  start: "14:00", end: "19:00" },
  6: { on: false, start: "09:00", end: "17:00" },
  0: { on: false, start: "09:00", end: "17:00" },
};

function formatHour(t) {
  const [h] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:00 ${ampm}`;
}

const EXPERIENCE_OPTIONS = [
  { value: "beginner",     label: "Complete Beginner",      desc: "No prior violin experience" },
  { value: "some",         label: "Some Experience",        desc: "Self-taught or a few prior lessons" },
  { value: "intermediate", label: "Intermediate",           desc: "Several years of study" },
  { value: "returning",    label: "Returning Student",      desc: "Took lessons before, stepping back in" },
];

const GOAL_OPTIONS = [
  { value: "enjoyment",    label: "Personal Enjoyment",          desc: "Playing for the love of music and personal expression" },
  { value: "school",       label: "School Orchestra & Ensemble", desc: "Building skills for group performance and ensemble playing" },
  { value: "performance",  label: "Performance & Competition",   desc: "Recitals, auditions, and competitive musical development" },
  { value: "conservatory", label: "Pre-Conservatory Studies",    desc: "Serious college audition preparation — this path demands significant daily practice, long-term commitment, and full family investment" },
];

const LENGTH_OPTIONS = [
  { value: 30, label: "30 Minutes", desc: "Focused skill maintenance" },
  { value: 45, label: "45 Minutes", desc: "Standard progression" },
  { value: 60, label: "60 Minutes", desc: "Serious, in-depth study" },
];

const TOTAL_STEPS = 5;

export default function BelCantoBooking() {
  const [step, setStep] = useState(0);
  const [avail, setAvail] = useState(DEFAULT_AVAIL);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef(null);

  const [form, setForm] = useState({
    studentFirstName: "", studentLastName: "", age: "",
    experience: "", experienceDesc: "",
    goal: "",
    lessonLength: "", inHome: false,
    availability: "",
    parentFirstName: "", parentLastName: "", parentPhone: "", parentEmail: "",
    studentPhone: "",
    referral: "", anythingElse: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(AVAIL_KEY, true);
        if (r) setAvail(JSON.parse(r.value));
      } catch {}
    })();
  }, []);

  const scrollTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const validate = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.studentFirstName.trim()) e.studentFirstName = "Required";
      if (!form.studentLastName.trim()) e.studentLastName = "Required";
      if (!form.age.trim()) e.age = "Required";
      if (!form.experience) e.experience = "Please select one";
    }
    if (s === 2) { if (!form.goal) e.goal = "Please select one"; }
    if (s === 3) {
      if (!form.lessonLength) e.lessonLength = "Please select one";
      if (!form.availability) e.availability = "Please select a time";
    }
    if (s === 4) {
      if (!form.parentFirstName.trim()) e.parentFirstName = "Required";
      if (!form.parentLastName.trim()) e.parentLastName = "Required";
      if (!form.parentPhone.trim()) e.parentPhone = "Required";
      if (!form.parentEmail.trim()) e.parentEmail = "Required";
      else if (!/\S+@\S+\.\S+/.test(form.parentEmail)) e.parentEmail = "Invalid email";
    }
    return e;
  };

  const next = () => {
    const e = validate(step);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setStep(s => s + 1); scrollTop();
  };
  const back = () => { setStep(s => s - 1); scrollTop(); };

  const submit = async () => {
    const e = validate(step);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const trial = {
        id: Date.now(),
        name: `${form.studentFirstName} ${form.studentLastName}`,
        phone: form.parentPhone.replace(/\D/g,""),
        email: form.parentEmail,
        studentPhone: form.studentPhone,
        age: form.age,
        experience: form.experience,
        experienceDesc: form.experienceDesc,
        goal: form.goal,
        lessonLength: form.lessonLength,
        inHome: form.inHome,
        requestedDate: form.availability,
        referral: form.referral,
        anythingElse: form.anythingElse,
        parentName: `${form.parentFirstName} ${form.parentLastName}`,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      const existing = await window.storage.get(TRIALS_KEY, true).catch(() => null);
      const list = existing ? JSON.parse(existing.value) : [];
      await window.storage.set(TRIALS_KEY, JSON.stringify([...list, trial]), true);
    } catch {}
    setSubmitting(false);
    setSubmitted(true);
    scrollTop();
  };

  // Build slots
  const availSlots = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dow = d.getDay();
    const day = avail[dow];
    if (!day?.on) continue;
    const [sh] = day.start.split(":").map(Number);
    const [eh] = day.end.split(":").map(Number);
    for (let h = sh; h < eh; h++) {
      const slot = new Date(d);
      slot.setHours(h, 0, 0, 0);
      availSlots.push(slot);
    }
  }

  const progressPct = step === 0 ? 0 : Math.round((step / TOTAL_STEPS) * 100);
  const STEP_NAMES = ["", "The Student", "Musical Vision", "Preferences", "Family", "Final"];

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=JetBrains+Mono:wght@300;400&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #0e0806; }

    ::-webkit-scrollbar { width: 2px; }
    ::-webkit-scrollbar-thumb { background: #8B1A2444; }

    /* ── Root vars ── */
    :root {
      --rouge:    #8B1A24;
      --rouge-l:  #A8262F;
      --rouge-d:  #5C0F16;
      --gold:     #C9A05A;
      --gold-l:   #E8C882;
      --cream:    #F0E6D0;
      --parchment:#D4C4A0;
      --ink:      #1A1008;
      --ink-l:    #241810;
      --ink-m:    #2E2018;
      --border:   #3A2418;
      --muted:    #A89880;
      --faint:    #7A6858;
    }

    .wrap {
      min-height: 100vh;
      background: var(--ink);
      color: var(--cream);
      font-family: 'Cormorant Garamond', Georgia, serif;
      position: relative;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* Vignette corners */
    .wrap::after {
      content: '';
      position: fixed;
      inset: 0;
      background: radial-gradient(ellipse at center, transparent 40%, rgba(10,4,2,0.7) 100%);
      pointer-events: none;
      z-index: 0;
    }

    /* Noise texture */
    .wrap::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 0;
      opacity: 0.8;
    }

    /* Progress */
    .progress {
      position: fixed; top: 0; left: 0; right: 0;
      height: 1px; background: var(--ink-m); z-index: 200;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--rouge), var(--gold));
      transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
    }

    /* Inner container */
    .inner {
      position: relative; z-index: 1;
      max-width: 580px; margin: 0 auto;
      padding: 0 28px 100px;
    }

    /* Step nav */
    .step-nav {
      padding: 40px 0 52px;
      display: flex; align-items: center; gap: 8px;
    }
    .step-pip {
      height: 1px; background: var(--faint);
      transition: all 0.4s; flex: 1; max-width: 28px;
    }
    .step-pip.done { background: var(--rouge); }
    .step-pip.active { background: var(--gold); max-width: 44px; }
    .step-name {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--faint);
      margin-left: 10px;
    }
    .step-name span { color: var(--gold); }

    /* ── Typography ── */
    .eyebrow {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px; letter-spacing: 0.28em;
      text-transform: uppercase; color: var(--rouge-l);
      display: block; margin-bottom: 20px;
    }

    h1 {
      font-family: 'IM Fell English', serif;
      font-size: clamp(38px, 7vw, 62px);
      font-weight: 400; line-height: 1.05;
      letter-spacing: 0.01em;
      color: var(--cream);
      margin-bottom: 32px;
    }
    h1 em { color: var(--rouge-l); font-style: italic; }

    h2 {
      font-family: 'IM Fell English', serif;
      font-size: clamp(26px, 5vw, 40px);
      font-weight: 400; line-height: 1.15;
      color: var(--cream); margin-bottom: 18px;
    }
    h2 em { color: var(--rouge-l); font-style: italic; }

    .manifesto {
      border-left: 1px solid var(--rouge-d);
      padding: 4px 0 4px 28px;
      margin: 36px 0 32px;
    }
    .manifesto p {
      font-family: 'Cormorant Garamond', serif;
      font-size: clamp(18px, 2.8vw, 22px);
      line-height: 1.85;
      color: var(--parchment);
      font-weight: 300;
      font-style: italic;
    }
    .manifesto p em { color: var(--gold-l); font-style: normal; }

    .lead {
      font-size: clamp(16px, 2.5vw, 19px);
      line-height: 1.75; color: var(--muted);
      font-weight: 300; margin-bottom: 20px;
    }
    .body-text {
      font-size: 15px; line-height: 1.7;
      color: var(--faint); font-weight: 300;
    }

    hr.rule {
      border: none;
      border-top: 1px solid var(--ink-m);
      margin: 32px 0;
    }

    /* ── Option cards ── */
    .options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 28px; }

    .opt {
      border: 1px solid var(--border);
      border-radius: 2px;
      padding: 16px 18px;
      cursor: pointer;
      transition: all 0.2s;
      background: var(--ink-l);
      display: flex; align-items: flex-start; gap: 16px;
    }
    .opt:hover { border-color: var(--rouge-d); background: var(--ink-m); }
    .opt.sel { border-color: var(--rouge); background: var(--ink-m); }

    .opt-radio {
      width: 14px; height: 14px; border-radius: 50%;
      border: 1px solid var(--faint);
      flex-shrink: 0; margin-top: 4px;
      transition: all 0.2s;
      position: relative;
    }
    .opt.sel .opt-radio { border-color: var(--rouge); }
    .opt.sel .opt-radio::after {
      content: ''; position: absolute;
      inset: 3px; border-radius: 50%;
      background: var(--rouge);
    }

    .opt-title {
      font-family: 'IM Fell English', serif;
      font-size: 18px; color: var(--cream);
      margin-bottom: 3px; line-height: 1.2;
    }
    .opt.sel .opt-title { color: var(--cream); }
    .opt-desc {
      font-size: 13px; color: var(--faint);
      line-height: 1.5; font-weight: 300;
    }
    .opt.sel .opt-desc { color: var(--muted); }

    /* ── Inputs ── */
    .fgroup { margin-bottom: 20px; }
    .flabel {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--faint);
      display: block; margin-bottom: 8px;
    }
    .finput {
      width: 100%;
      background: var(--ink-l);
      border: 1px solid var(--border);
      border-radius: 2px;
      color: var(--cream);
      font-family: 'Cormorant Garamond', serif;
      font-size: 17px; font-weight: 300;
      padding: 11px 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    .finput:focus { border-color: var(--rouge-d); }
    textarea.finput { resize: vertical; min-height: 88px; line-height: 1.6; }
    .ferr {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px; color: #c04040;
      letter-spacing: 0.1em; margin-top: 5px;
    }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

    /* ── Slots ── */
    .slots { display: grid; grid-template-columns: repeat(2,1fr); gap: 7px; margin-bottom: 24px; }
    .slot {
      border: 1px solid var(--border);
      border-radius: 2px; background: var(--ink-l);
      color: var(--muted);
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px; letter-spacing: 0.06em;
      padding: 12px 12px; cursor: pointer;
      transition: all 0.2s; text-align: left; line-height: 1.6;
    }
    .slot:hover { border-color: var(--rouge-d); color: var(--parchment); }
    .slot.sel { border-color: var(--rouge); background: var(--ink-m); color: var(--gold-l); }
    .slot-day { display: block; font-size: 8px; color: var(--faint); letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 3px; }
    .slot.sel .slot-day { color: var(--rouge-l); }

    /* ── Toggle ── */
    .toggle {
      display: flex; align-items: flex-start; gap: 16px;
      padding: 18px 20px;
      border: 1px solid var(--border);
      border-radius: 2px; background: var(--ink-l);
      cursor: pointer; transition: all 0.2s; margin-bottom: 24px;
    }
    .toggle:hover { border-color: var(--rouge-d); }
    .toggle.on { border-color: var(--rouge-d); background: var(--ink-m); }
    .tsw {
      width: 34px; height: 18px; border-radius: 9px;
      background: var(--ink-m); border: 1px solid var(--border);
      flex-shrink: 0; position: relative; transition: all 0.2s; margin-top: 3px;
    }
    .toggle.on .tsw { background: var(--rouge-d); border-color: var(--rouge); }
    .tthumb {
      position: absolute; top: 2px; left: 2px;
      width: 12px; height: 12px; border-radius: 50%;
      background: var(--faint); transition: all 0.2s;
    }
    .toggle.on .tthumb { left: 18px; background: var(--gold); }
    .ttitle {
      font-family: 'IM Fell English', serif;
      font-size: 17px; color: var(--cream); margin-bottom: 5px;
    }
    .tdesc {
      font-size: 13px; color: var(--faint);
      line-height: 1.55; font-weight: 300;
    }

    /* ── Buttons ── */
    .btn-primary {
      background: var(--rouge);
      color: var(--cream);
      border: none; border-radius: 2px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px; letter-spacing: 0.18em;
      text-transform: uppercase; padding: 14px 36px;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-primary:hover { background: var(--rouge-l); }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

    .btn-back {
      background: none; border: none;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px; letter-spacing: 0.16em;
      text-transform: uppercase; color: var(--faint);
      cursor: pointer; padding: 0; transition: color 0.2s;
    }
    .btn-back:hover { color: var(--muted); }

    .btn-row { display: flex; align-items: center; justify-content: space-between; margin-top: 40px; }

    /* ── Review box ── */
    .review-box {
      border: 1px solid var(--border); border-radius: 2px;
      background: var(--ink-l); padding: 20px 22px; margin-bottom: 28px;
    }
    .review-row {
      display: flex; justify-content: space-between;
      padding: 7px 0; border-bottom: 1px solid var(--ink-m);
    }
    .review-row:last-child { border-bottom: none; }
    .rk { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--faint); letter-spacing: 0.14em; text-transform: uppercase; }
    .rv { font-size: 14px; color: var(--muted); font-weight: 300; }

    /* ── Rates ── */
    .rates {
      margin-top: 48px; padding-top: 32px;
      border-top: 1px solid var(--ink-m);
    }
    .rate-row { display: flex; gap: 28px; }
    .rate-item { text-align: center; }
    .rate-amt {
      font-family: 'IM Fell English', serif;
      font-size: 26px; color: var(--gold);
      display: block; margin-bottom: 2px;
    }
    .rate-dur {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px; letter-spacing: 0.16em;
      text-transform: uppercase; color: var(--faint);
    }

    /* ── Ornament ── */
    .ornament {
      text-align: center; color: var(--rouge-d);
      font-size: 22px; margin: 28px 0; letter-spacing: 12px;
      opacity: 0.6;
    }

    /* ── Submitted ── */
    .sub-wrap { text-align: center; padding: 80px 0 60px; }
    .sub-icon { font-size: 36px; margin-bottom: 28px; color: var(--rouge-l); }

    /* Animation */
    .panel { animation: panelIn 0.45s cubic-bezier(0.4,0,0.2,1); }
    @keyframes panelIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    /* Sub-section label */
    .sub-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--rouge-d);
      display: block; margin-bottom: 12px;
    }

    @media (max-width: 480px) {
      .grid2 { grid-template-columns: 1fr; }
      .slots { grid-template-columns: 1fr; }
      .rate-row { gap: 18px; }
    }
  `;

  if (submitted) return (
    <div className="wrap" ref={containerRef} style={{ overflowY:"auto" }}>
      <style>{css}</style>
      <div className="inner">
        <div className="sub-wrap panel">
          <div className="sub-icon">𝄞</div>
          <span className="eyebrow" style={{ justifyContent:"center", display:"block", textAlign:"center" }}>Bel Canto Violin Studio</span>
          <h2 style={{ textAlign:"center", marginBottom:20 }}>Request <em>Received</em></h2>
          <p className="lead" style={{ textAlign:"center", maxWidth:400, margin:"0 auto 20px" }}>
            Your inquiry has been received. Will reviews each request personally and will be in touch to confirm your trial lesson.
          </p>
          <p className="body-text" style={{ textAlign:"center" }}>Please allow 1–2 business days for a response.</p>
          <div className="ornament">· · ·</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="wrap" ref={containerRef} style={{ overflowY:"auto" }}>
      <style>{css}</style>

      <div className="progress">
        <div className="progress-fill" style={{ width:`${progressPct}%` }} />
      </div>

      <div className="inner">

        {/* Step nav */}
        {step > 0 && (
          <div className="step-nav">
            {Array.from({ length: TOTAL_STEPS }).map((_,i) => (
              <div key={i} className={`step-pip ${i+1 < step ? "done" : i+1 === step ? "active" : ""}`} />
            ))}
            <span className="step-name"><span>{STEP_NAMES[step]}</span> · {step} of {TOTAL_STEPS}</span>
          </div>
        )}

        {/* ── WELCOME ── */}
        {step === 0 && (
          <div className="panel" style={{ paddingTop:60 }}>
            <span className="eyebrow">Fresno · Clovis, California</span>
            <h1>Bel Canto<br /><em>Violin Studio</em></h1>

            <div className="manifesto">
              <p>
                The golden age of violin wasn't defined by standardization. It was defined by the diversity of personal voices — each player bringing their own authenticity to the instrument. But here's what's often forgotten: those voices only flourished because of <em>unshakeable fundamentals.</em> Without a true foundation, there is no voice. Bel Canto Violin Studio is built on this principle — we develop the technique that frees you to speak.
              </p>
            </div>

            <p className="lead">
              This studio exists to restore that balance. Technique first — always. Not as an end in itself, but as the only path toward authentic personal expression.
            </p>

            <p className="body-text" style={{ marginBottom:48 }}>
              The questionnaire ahead takes about five minutes. It exists to ensure this is the right fit — for you, and for the student.
            </p>

            <button className="btn-primary" onClick={() => { setStep(1); scrollTop(); }}>
              Begin Inquiry →
            </button>

            <div className="rates">
              <p className="body-text" style={{ fontSize:13 }}>
                In-home lessons available on a selective, case-by-case basis.
              </p>
            </div>

            <div className="ornament" style={{ marginTop:52 }}>𝄢 · 𝄞 · 𝄢</div>
          </div>
        )}

        {/* ── STEP 1: STUDENT ── */}
        {step === 1 && (
          <div className="panel">
            <span className="eyebrow">Step One</span>
            <h2>About the<br /><em>Student</em></h2>
            <p className="lead">Tell us who we're working with. Understanding where a student is determines everything about where they can go.</p>
            <hr className="rule" />

            <div className="grid2">
              <div className="fgroup">
                <label className="flabel">First Name</label>
                <input className="finput" value={form.studentFirstName} onChange={e=>setField("studentFirstName",e.target.value)} />
                {errors.studentFirstName && <div className="ferr">{errors.studentFirstName}</div>}
              </div>
              <div className="fgroup">
                <label className="flabel">Last Name</label>
                <input className="finput" value={form.studentLastName} onChange={e=>setField("studentLastName",e.target.value)} />
                {errors.studentLastName && <div className="ferr">{errors.studentLastName}</div>}
              </div>
            </div>

            <div className="fgroup" style={{ maxWidth:140 }}>
              <label className="flabel">Age</label>
              <input className="finput" type="number" min="3" max="99" value={form.age} onChange={e=>setField("age",e.target.value)} />
              {errors.age && <div className="ferr">{errors.age}</div>}
            </div>

            <div className="fgroup">
              <label className="flabel">Experience Level</label>
              {errors.experience && <div className="ferr" style={{ marginBottom:8 }}>{errors.experience}</div>}
              <div className="options">
                {EXPERIENCE_OPTIONS.map(o => (
                  <div key={o.value} className={`opt ${form.experience===o.value?"sel":""}`} onClick={()=>setField("experience",o.value)}>
                    <div className="opt-radio" />
                    <div>
                      <div className="opt-title">{o.label}</div>
                      <div className="opt-desc">{o.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="fgroup">
              <label className="flabel">Tell us about their background <span style={{ color:"var(--faint)", fontFamily:"'Cormorant Garamond',serif", textTransform:"none", letterSpacing:0, fontSize:13 }}> — optional</span></label>
              <textarea className="finput" value={form.experienceDesc} onChange={e=>setField("experienceDesc",e.target.value)} />
            </div>

            <div className="btn-row">
              <button className="btn-back" onClick={back}>← Back</button>
              <button className="btn-primary" onClick={next}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 2: GOALS ── */}
        {step === 2 && (
          <div className="panel">
            <span className="eyebrow">Step Two</span>
            <h2>The Musical<br /><em>Vision</em></h2>
            <p className="lead">Be honest here. There's no wrong answer — but the right path forward depends entirely on what you are truly building toward.</p>
            <hr className="rule" />

            {errors.goal && <div className="ferr" style={{ marginBottom:12 }}>{errors.goal}</div>}
            <div className="options">
              {GOAL_OPTIONS.map(o => (
                <div key={o.value} className={`opt ${form.goal===o.value?"sel":""}`} onClick={()=>setField("goal",o.value)}>
                  <div className="opt-radio" />
                  <div>
                    <div className="opt-title">{o.label}</div>
                    <div className="opt-desc">{o.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="btn-row">
              <button className="btn-back" onClick={back}>← Back</button>
              <button className="btn-primary" onClick={next}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: PREFERENCES ── */}
        {step === 3 && (
          <div className="panel">
            <span className="eyebrow">Step Three</span>
            <h2>Lesson<br /><em>Preferences</em></h2>
            <p className="lead">Choose what fits your schedule and level of commitment.</p>
            <hr className="rule" />

            <div className="fgroup">
              <label className="flabel">Lesson Length</label>
              {errors.lessonLength && <div className="ferr" style={{ marginBottom:8 }}>{errors.lessonLength}</div>}
              <div className="options">
                {LENGTH_OPTIONS.map(o => (
                  <div key={o.value} className={`opt ${form.lessonLength===o.value?"sel":""}`} onClick={()=>setField("lessonLength",o.value)}>
                    <div className="opt-radio" />
                    <div>
                      <div className="opt-title">{o.label}</div>
                      <div className="opt-desc">{o.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="fgroup">
              <label className="flabel">Preferred Time Slot</label>
              {errors.availability && <div className="ferr" style={{ marginBottom:8 }}>{errors.availability}</div>}
              {availSlots.length === 0
                ? <p className="body-text" style={{ fontSize:14 }}>No available slots at this time. Please check back soon.</p>
                : <div className="slots">
                    {availSlots.slice(0,20).map((slot,i) => {
                      const iso = slot.toISOString();
                      return (
                        <button key={i} className={`slot ${form.availability===iso?"sel":""}`} onClick={()=>setField("availability",iso)}>
                          <span className="slot-day">{FULL_DAYS[slot.getDay()]}, {slot.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
                          {formatHour(`${String(slot.getHours()).padStart(2,"0")}:00`)}
                        </button>
                      );
                    })}
                  </div>}
            </div>

            <div className={`toggle ${form.inHome?"on":""}`} onClick={()=>setField("inHome",!form.inHome)}>
              <div className="tsw"><div className="tthumb" /></div>
              <div>
                <div className="ttitle">Request In-Home Lesson</div>
                <div className="tdesc">In-home instruction is available on a selective, case-by-case basis and is not a default option. Submitting a request does not guarantee availability. Custom pricing is determined by location and scheduling.</div>
              </div>
            </div>

            <div className="btn-row">
              <button className="btn-back" onClick={back}>← Back</button>
              <button className="btn-primary" onClick={next}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: CONTACT ── */}
        {step === 4 && (
          <div className="panel">
            <span className="eyebrow">Step Four</span>
            <h2>Family<br /><em>Contact</em></h2>
            <p className="lead">All confirmations and communications go to the parent or guardian on file.</p>
            <hr className="rule" />

            <span className="sub-label">Parent / Guardian</span>
            <div className="grid2">
              <div className="fgroup">
                <label className="flabel">First Name</label>
                <input className="finput" value={form.parentFirstName} onChange={e=>setField("parentFirstName",e.target.value)} />
                {errors.parentFirstName && <div className="ferr">{errors.parentFirstName}</div>}
              </div>
              <div className="fgroup">
                <label className="flabel">Last Name</label>
                <input className="finput" value={form.parentLastName} onChange={e=>setField("parentLastName",e.target.value)} />
                {errors.parentLastName && <div className="ferr">{errors.parentLastName}</div>}
              </div>
            </div>
            <div className="fgroup">
              <label className="flabel">Phone Number</label>
              <input className="finput" type="tel" value={form.parentPhone} onChange={e=>setField("parentPhone",e.target.value)} />
              {errors.parentPhone && <div className="ferr">{errors.parentPhone}</div>}
            </div>
            <div className="fgroup">
              <label className="flabel">Email Address</label>
              <input className="finput" type="email" value={form.parentEmail} onChange={e=>setField("parentEmail",e.target.value)} />
              {errors.parentEmail && <div className="ferr">{errors.parentEmail}</div>}
            </div>

            <hr className="rule" />
            <span className="sub-label">Student <span style={{ color:"var(--faint)", textTransform:"none", letterSpacing:0, fontFamily:"'Cormorant Garamond',serif", fontSize:13 }}> — if applicable</span></span>
            <div className="fgroup">
              <label className="flabel">Student Phone <span style={{ color:"var(--faint)", fontFamily:"'Cormorant Garamond',serif", textTransform:"none", letterSpacing:0, fontSize:13 }}> — optional, for older students</span></label>
              <input className="finput" type="tel" value={form.studentPhone} onChange={e=>setField("studentPhone",e.target.value)} />
            </div>

            <div className="btn-row">
              <button className="btn-back" onClick={back}>← Back</button>
              <button className="btn-primary" onClick={next}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 5: FINAL ── */}
        {step === 5 && (
          <div className="panel">
            <span className="eyebrow">Step Five</span>
            <h2>One Last<br /><em>Thing</em></h2>
            <p className="lead">A couple of final questions before your request is submitted.</p>
            <hr className="rule" />

            <div className="fgroup">
              <label className="flabel">How did you hear about Bel Canto Violin Studio?</label>
              <input className="finput" value={form.referral} onChange={e=>setField("referral",e.target.value)} />
            </div>

            <div className="fgroup">
              <label className="flabel">Anything else Will should know? <span style={{ color:"var(--faint)", fontFamily:"'Cormorant Garamond',serif", textTransform:"none", letterSpacing:0, fontSize:13 }}> — optional</span></label>
              <textarea className="finput" value={form.anythingElse} onChange={e=>setField("anythingElse",e.target.value)} />
            </div>

            <hr className="rule" />
            <span className="sub-label" style={{ marginBottom:14 }}>Review Your Request</span>
            <div className="review-box">
              {[
                ["Student",       `${form.studentFirstName} ${form.studentLastName}, age ${form.age}`],
                ["Experience",    EXPERIENCE_OPTIONS.find(o=>o.value===form.experience)?.label || "—"],
                ["Goal",          GOAL_OPTIONS.find(o=>o.value===form.goal)?.label || "—"],
                ["Lesson Length", LENGTH_OPTIONS.find(o=>o.value===form.lessonLength)?.label || "—"],
                ["Requested Slot",form.availability ? `${new Date(form.availability).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})} · ${formatHour(String(new Date(form.availability).getHours()).padStart(2,"0")+":00")}` : "—"],
                ["In-Home",       form.inHome ? "Requested" : "No"],
                ["Parent",        `${form.parentFirstName} ${form.parentLastName}`],
              ].map(([k,v]) => (
                <div className="review-row" key={k}>
                  <span className="rk">{k}</span>
                  <span className="rv">{v}</span>
                </div>
              ))}
            </div>

            <p className="body-text" style={{ fontSize:13, marginBottom:28, lineHeight:1.7 }}>
              By submitting, you understand this is an inquiry — not a confirmed booking. Will reviews each request personally and will respond within 1–2 business days.
            </p>

            <div className="btn-row">
              <button className="btn-back" onClick={back}>← Back</button>
              <button className="btn-primary" onClick={submit} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Inquiry →"}
              </button>
            </div>

            <div className="ornament" style={{ marginTop:52 }}>𝄢 · 𝄞 · 𝄢</div>
          </div>
        )}
      </div>
    </div>
  );
}
