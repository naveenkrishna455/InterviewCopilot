import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  Flame,
  Layers3,
  MessageSquareText,
  Mic,
  MoreHorizontal,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { InterviewQuestion, InterviewSession } from "./types";

const API_BASE = "http://127.0.0.1:5187";
const ROLES = [
  "Product Designer",
  "Frontend Engineer",
  "Product Manager",
  "Data Analyst",
  "Software Engineer",
  "UX Researcher",
];

type View = "dashboard" | "interview";
type StreamMessage = { type: "answer-token"; token: string } | { type: "answer-complete" } | { type: "error"; message: string };

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [role, setRole] = useState(ROLES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [recentSessions, setRecentSessions] = useState<InterviewSession[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const health = await fetch(`${API_BASE}/api/health`);
        if (!health.ok) throw new Error("Local API health check failed.");
        const response = await fetch(`${API_BASE}/api/interviews`);
        if (!response.ok) throw new Error("Could not load recent sessions.");
        const records: InterviewSession[] = await response.json();
        if (active) {
          setApiConnected(true);
          setRecentSessions(records);
        }
      } catch {
        if (active) setApiConnected(false);
      }
    }
    void loadDashboard();
    return () => {
      active = false;
      socketRef.current?.close();
    };
  }, []);

  async function startInterview() {
    setError("");
    setIsStarting(true);
    try {
      const response = await fetch(`${API_BASE}/api/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, resumeFileName: file?.name ?? null }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const created: InterviewSession = await response.json();
      setRecentSessions((current) => [created, ...current.filter((item) => item.id !== created.id)].slice(0, 20));
      const questionResponse = await fetch(`${API_BASE}/api/questions?role=${encodeURIComponent(role)}`);
      if (!questionResponse.ok) throw new Error(await readError(questionResponse));
      const questionList: InterviewQuestion[] = await questionResponse.json();
      if (questionList.length === 0) throw new Error("No practice questions are available for this role.");
      setSession(created);
      setQuestions(questionList);
      setQuestionIndex(0);
      setAnswer("");
      setView("interview");
      void streamAnswer(questionList[0].prompt);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start the interview.");
    } finally {
      setIsStarting(false);
    }
  }

  function streamAnswer(prompt: string) {
    setAnswer("");
    setIsStreaming(true);
    setError("");
    const socket = new WebSocket("ws://127.0.0.1:5187/ws/interview");
    socketRef.current?.close();
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "answer", prompt }));
    });
    socket.addEventListener("message", (event: MessageEvent<string>) => {
      try {
        const message = JSON.parse(event.data) as StreamMessage;
        if (message.type === "answer-token") setAnswer((current) => current + message.token);
        if (message.type === "answer-complete") {
          setIsStreaming(false);
          socket.close();
        }
        if (message.type === "error") {
          setError(message.message);
          setIsStreaming(false);
          socket.close();
        }
      } catch {
        setError("The interview service returned an invalid response.");
        setIsStreaming(false);
        socket.close();
      }
    });
    socket.addEventListener("error", () => {
      setError("Couldn't connect to the interview stream. Check that the local API is running.");
      setIsStreaming(false);
    });
    socket.addEventListener("close", () => setIsStreaming(false));
  }

  function nextQuestion() {
    const nextIndex = questionIndex + 1;
    if (nextIndex >= questions.length) {
      setView("dashboard");
      setNotice("Practice complete. Your interview is saved in recent sessions.");
      return;
    }
    setQuestionIndex(nextIndex);
    void streamAnswer(questions[nextIndex].prompt);
  }

  function finishInterview() {
    socketRef.current?.close();
    setIsStreaming(false);
    setView("dashboard");
    setNotice("Interview saved. Nice work showing up to practice.");
  }

  function acceptFile(selected: File | undefined) {
    setError("");
    setNotice("");
    if (!selected) return;
    const extension = selected.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "txt"].includes(extension ?? "")) {
      setError("Choose a PDF, DOCX, or TXT resume.");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError("Resume must be smaller than 10 MB.");
      return;
    }
    setFile(selected);
    setNotice("Resume selected. Only its filename is saved; the file itself stays on this device.");
  }

  if (view === "interview" && session && questions[questionIndex]) {
    return (
      <InterviewView
        role={role}
        question={questions[questionIndex]}
        questionNumber={questionIndex + 1}
        questionTotal={questions.length}
        answer={answer}
        streaming={isStreaming}
        error={error}
        onNext={nextQuestion}
        onFinish={finishInterview}
      />
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><AudioLines size={21} strokeWidth={2.2} /></div>
          <div><span className="brand-name">interview<span>copilot</span></span><span className="brand-caption">YOUR PRACTICE SPACE</span></div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className="nav-item active"><Layers3 size={17} /> Overview</button>
          <button className="nav-item" onClick={() => setNotice("Your recent practice sessions will appear here.")}><MessageSquareText size={17} /> My sessions <span className="nav-count">03</span></button>
          <button className="nav-item" onClick={() => setNotice("Progress insights are coming soon.")}><Target size={17} /> My progress</button>
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label">YOUR PREP</div>
        <button className="nav-item" onClick={() => document.getElementById("resume-upload")?.click()}><FileText size={17} /> Resume</button>
        <button className="nav-item" onClick={() => document.getElementById("role-select")?.focus()}><BriefcaseBusiness size={17} /> Target roles</button>
        <div className="sidebar-spacer" />
        <div className="sidebar-tip">
          <div className="tip-icon"><Sparkles size={16} /></div>
          <strong>A little practice goes a long way.</strong>
          <p>Build confidence one question at a time.</p>
        </div>
        <button className="nav-item settings-item" onClick={() => setNotice("Settings are coming soon.")}><Settings2 size={17} /> Settings</button>
        <div className="profile">
          <div className="avatar">JD</div>
          <div className="profile-details"><strong>Jordan Davis</strong><span>Free plan</span></div>
          <MoreHorizontal size={19} className="profile-more" />
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-right">
            <div className="api-status"><span className={`status-dot ${apiConnected ? "" : "status-disconnected"}`} /> {apiConnected ? "Local API connected" : "Local API unavailable"}</div>
            <button className="help-button" aria-label="Help" onClick={() => setNotice("Start with a role, add a resume if you like, and begin a practice session.")}><CircleHelp size={18} /></button>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> MONDAY, OCTOBER 26, 2026</div>
              <h1>Make your next move <span>count.</span></h1>
              <p className="welcome-copy">A little practice today can change everything tomorrow.</p>
            </div>
            <div className="streak-card"><div className="streak-icon"><Flame size={18} /></div><div><strong>3 day streak</strong><span>Keep it going</span></div><div className="streak-dots"><i className="on" /><i className="on" /><i className="on" /><i /><i /><i /><i /></div></div>
          </div>

          {(error || notice) && <div className={`feedback ${error ? "feedback-error" : ""}`} role={error ? "alert" : "status"}>{error ? <X size={16} /> : <Check size={16} />}{error || notice}<button aria-label="Dismiss" onClick={() => { setError(""); setNotice(""); }}><X size={15} /></button></div>}

          <div className="section-heading">
            <div><span className="section-kicker">GET READY</span><h2>Set up your practice</h2></div>
            <span className="step-pill"><span>01</span> OF 02</span>
          </div>

          <div className="setup-grid">
            <section className="setup-card resume-card">
              <div className="card-title-row"><div className="card-icon resume-icon"><FileText size={18} /></div><div><h3>Your resume</h3><span className="card-subtitle">Optional, but helpful</span></div><button className="dots-button" aria-label="Resume options"><MoreHorizontal size={19} /></button></div>
              <label
                className={`upload-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
                htmlFor="resume-upload"
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files[0]); }}
              >
                <input id="resume-upload" type="file" accept=".pdf,.docx,.txt" onChange={(event) => acceptFile(event.target.files?.[0])} />
                <div className="upload-icon">{file ? <Check size={19} /> : <Upload size={19} />}</div>
                <div className="upload-copy"><strong>{file ? file.name : "Drop your resume here"}</strong><span>{file ? `${(file.size / 1024).toFixed(0)} KB · Ready to practice` : <>or <span className="browse-link">browse files</span></>}</span></div>
                {file && <button className="remove-file" aria-label="Remove resume" onClick={(event) => { event.preventDefault(); setFile(null); }}><X size={15} /></button>}
              </label>
              <div className="privacy-note"><ShieldCheck size={14} /><span>Your file stays on this device. We only save its name.</span><span className="file-types">PDF · DOCX · TXT</span></div>
            </section>

            <section className="setup-card role-card">
              <div className="card-title-row"><div className="card-icon role-icon"><BriefcaseBusiness size={18} /></div><div><h3>Target role</h3><span className="card-subtitle">What are you interviewing for?</span></div></div>
              <label className="select-label" htmlFor="role-select">PRACTICING FOR</label>
              <div className="select-wrap"><select id="role-select" value={role} onChange={(event) => setRole(event.target.value)}>{ROLES.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={17} /></div>
              <div className="role-hint"><span className="mini-sparkle"><Sparkles size={14} /></span> Questions tailored to your role and experience</div>
            </section>
          </div>

          <section className="start-card">
            <div className="start-decoration decoration-one" /><div className="start-decoration decoration-two" />
            <div className="start-content">
              <div className="start-overline"><span className="live-dot" /> YOUR NEXT SESSION</div>
              <h2>Ready to find your <span>flow?</span></h2>
              <p>Get comfortable with the questions that matter. No pressure, just practice.</p>
              <button className="start-button" disabled={isStarting} onClick={() => void startInterview()}>{isStarting ? "Getting things ready…" : "Start a practice session"}<ArrowRight size={17} /></button>
              <div className="start-meta"><span><Clock3 size={14} /> About 10 min</span><i /><span><MessageSquareText size={14} /> 5 questions</span><i /><span><Sparkles size={14} /> AI guided</span></div>
            </div>
            <div className="start-art" aria-hidden="true"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-orb"><AudioLines size={48} /></div><span className="art-sparkle sparkle-a">✳</span><span className="art-sparkle sparkle-b">✳</span><span className="art-star">✦</span></div>
          </section>

          <section className="recent-section">
            <div className="recent-heading"><div><span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Recent sessions</h2></div><button className="see-all" onClick={() => setNotice("Your complete session history is coming soon.")}>See all <ArrowUpRight size={15} /></button></div>
            <div className="recent-list">
              {recentSessions.length > 0
                ? recentSessions.slice(0, 3).map((recent, index) => (
                    <SessionRow
                      key={recent.id}
                      role={recent.role}
                      details={recent.resumeFileName ? `Resume · ${recent.resumeFileName}` : "Practice session · saved locally"}
                      date={formatDate(recent.createdAt)}
                      tone={["green", "blue", "violet"][index % 3]}
                    />
                  ))
                : <div className="empty-sessions">Your saved practice sessions will show up here.</div>}
            </div>
          </section>
          <footer className="dashboard-footer"><span>Made for the moment before the big moment.</span><span>Interview Copilot <span className="footer-version">v{window.desktop?.appVersion ?? "0.1.0"}</span></span></footer>
        </div>
      </section>
    </main>
  );
}

function SessionRow({ role, details, date, tone }: { role: string; details: string; date: string; tone: string }) {
  return <div className="session-row"><div className={`session-role-icon ${tone}`}><BriefcaseBusiness size={17} /></div><div className="session-info"><strong>{role}</strong><span>{details}</span></div><div className="session-date"><Clock3 size={13} /> {date}</div><div className={`session-score ${tone}`}>Saved</div><button className="session-open" aria-label={`Open ${role} session`}><ArrowUpRight size={16} /></button></div>;
}

function InterviewView({
  role,
  question,
  questionNumber,
  questionTotal,
  answer,
  streaming,
  error,
  onNext,
  onFinish,
}: {
  role: string;
  question: InterviewQuestion;
  questionNumber: number;
  questionTotal: number;
  answer: string;
  streaming: boolean;
  error: string;
  onNext: () => void;
  onFinish: () => void;
}) {
  return (
    <main className="interview-shell">
      <header className="interview-topbar"><button className="back-button" onClick={onFinish}><ArrowLeft size={17} /> Exit practice</button><div className="interview-brand"><div className="brand-mark"><AudioLines size={18} /></div> interview<span>copilot</span></div><div className="interview-progress"><span>QUESTION {String(questionNumber).padStart(2, "0")}</span><div className="progress-track"><div style={{ width: `${(questionNumber / questionTotal) * 100}%` }} /></div><span>{String(questionTotal).padStart(2, "0")}</span></div><div className="session-live"><span className="status-dot" /> SESSION LIVE</div></header>
      <div className="interview-layout">
        <section className="interview-main">
          <div className="interview-intro"><span className="section-kicker">PRACTICE SESSION · {role.toUpperCase()}</span><h1>Show them what <span>you bring.</span></h1><p>Take a breath. This is your space to think out loud and get comfortable.</p></div>
          <div className="question-card"><div className="question-topline"><span className="question-tag"><Sparkles size={13} /> {question.category}</span><span className="question-counter">{String(questionNumber).padStart(2, "0")} <span>/ {String(questionTotal).padStart(2, "0")}</span></span></div><h2>{question.prompt}</h2><div className="question-footer"><span><Clock3 size={14} /> Take your time</span><span>There are no wrong first drafts.</span></div></div>
          <div className="answer-card"><div className="answer-header"><div className="answer-avatar"><Sparkles size={17} /></div><div><strong>Your AI copilot</strong><span>{streaming ? <><i className="typing-indicator" /> Thinking through this one</> : "A sample answer to get you started"}</span></div><button className="answer-action" aria-label="Answer options"><MoreHorizontal size={19} /></button></div><div className={`answer-body ${streaming ? "answer-streaming" : ""}`}>{error ? <p className="answer-error">{error}</p> : answer ? <>{answer}{streaming && <span className="typing-cursor" />}</> : <span className="answer-placeholder">Your answer is on its way…</span>}</div><div className="answer-footer"><span><ShieldCheck size={14} /> A starting point, not a script. Make it your own.</span><button aria-label="Save answer" onClick={(event) => { event.currentTarget.innerText = "Saved"; }}><ArrowDownToLine size={14} /> Save</button></div></div>
          <div className="interview-actions"><button className="text-button" onClick={onFinish}>End session</button><button className="next-button" onClick={onNext} disabled={streaming}>{questionNumber === questionTotal ? "Finish practice" : "Next question"}<ArrowRight size={16} /></button></div>
        </section>
        <aside className="interview-sidebar"><div className="session-panel"><div className="session-panel-label"><span className="live-dot" /> IN THIS SESSION</div><h3>Your practice<br />at a glance</h3><div className="session-stat"><div className="session-stat-icon"><MessageSquareText size={16} /></div><div><strong>{String(questionTotal).padStart(2, "0")} questions</strong><span>Thoughtful practice, no pressure</span></div></div><div className="session-stat"><div className="session-stat-icon"><Clock3 size={16} /></div><div><strong>~10 minutes</strong><span>Go at your own pace</span></div></div><div className="session-panel-divider" /><div className="question-list-label">YOUR QUESTIONS</div>{Array.from({ length: questionTotal }, (_, index) => <div className={`question-list-row ${index === questionNumber - 1 ? "current" : ""} ${index < questionNumber - 1 ? "completed" : ""}`} key={index}><span className="question-list-number">{index < questionNumber - 1 ? <Check size={13} /> : `0${index + 1}`}</span><span>{index === questionNumber - 1 ? question.category : index < questionNumber - 1 ? questionsTitle(index) : "Coming up next"}</span>{index === questionNumber - 1 && <span className="current-marker" />}</div>)}<div className="encouragement"><div className="encouragement-icon"><Flame size={17} /></div><div><strong>You’re doing great.</strong><p>Showing up is the hardest part. Keep going.</p></div></div></div><div className="audio-note"><Mic size={16} /><span><strong>Audio practice</strong><br />Not enabled. Your microphone is never accessed without your permission.</span></div></aside>
      </div>
      <footer className="interview-footer"><span><ShieldCheck size={14} /> Your practice is private and stays on this device.</span><button onClick={onFinish}>Need a break? Exit <X size={14} /></button></footer>
    </main>
  );
}

function questionsTitle(index: number) {
  return ["Getting started", "Your experience", "Problem solving", "Working together", "Looking ahead"][index] ?? "Previous question";
}

async function readError(response: Response) {
  try {
    const body = await response.json() as { error?: string; title?: string };
    return body.error ?? body.title ?? `The local API returned ${response.status}.`;
  } catch {
    return `The local API returned ${response.status}.`;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default App;
