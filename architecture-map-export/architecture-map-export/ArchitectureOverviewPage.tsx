// ArchitectureOverviewPage — Cloudflare-inspired architecture diagrams
// Tab-switched: Upload & Ingest vs Chat & RAG Query
// Side-by-side layout: step timeline (left) + SVG diagram (right) + info panel (below)
// JS-driven red circuit ball + active step highlighting
// No Durable Object — removed for clarity

import { useState, useEffect, useRef, useCallback } from "react";

// ── Inline SVG icon components ──

function IconClient() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f6821f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
function IconWorker() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f6821f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /><line x1="12" y1="22" x2="12" y2="15.5" /><polyline points="22 8.5 12 15.5 2 8.5" />
    </svg>
  );
}
function IconR2() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f6821f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4z" /><path d="M4 9h16" /><path d="M9 4v16" />
    </svg>
  );
}
function IconD1() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f6821f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}
function IconVectorize() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f6821f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" />
      <line x1="8" y1="6" x2="16" y2="6" /><line x1="6" y1="8" x2="6" y2="16" /><line x1="8" y1="7.5" x2="16.5" y2="16" /><line x1="18" y1="8" x2="18" y2="16" />
    </svg>
  );
}
function IconAI() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f6821f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4 5.6 21.2 8 14 2 9.2h7.6z" />
    </svg>
  );
}
function IconGateway() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f6821f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconDO() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f6821f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="6" rx="1" /><rect x="4" y="9" width="16" height="6" rx="1" /><rect x="4" y="16" width="16" height="6" rx="1" />
      <circle cx="8" cy="5" r="1" fill="#f6821f" /><circle cx="8" cy="12" r="1" fill="#f6821f" /><circle cx="8" cy="19" r="1" fill="#f6821f" />
    </svg>
  );
}

// ── Icon + info maps ──

const ICONS: Record<string, () => React.JSX.Element> = {
  client: IconClient, worker: IconWorker, r2: IconR2, d1: IconD1,
  vectorize: IconVectorize, ai: IconAI, gateway: IconGateway, do: IconDO,
};

const INFO: Record<string, { title: string; desc: string; details: string[] }> = {
  client: {
    title: "Browser",
    desc: "The front-end interface where users upload documents and ask questions. Served directly from Cloudflare's edge network for instant load times.",
    details: ["Served from 300+ edge locations worldwide", "No origin server needed", "Static assets cached at the edge"],
  },
  worker: {
    title: "Workers (Serverless Functions)",
    desc: "Serverless code that runs on Cloudflare's global network. Your backend logic deploys to 300+ cities and executes within milliseconds of your users — no servers to manage.",
    details: ["Replaces: AWS Lambda, traditional servers", "Sub-millisecond cold starts via V8 isolates", "Scales to millions of requests automatically", "Zero infrastructure to provision or maintain"],
  },
  r2: {
    title: "R2 (Object Storage)",
    desc: "S3-compatible object storage with zero egress fees. Store files, images, and any blob data without paying to read it back.",
    details: ["Replaces: AWS S3, Google Cloud Storage", "Zero egress fees — free to read your data", "S3-compatible API — drop-in replacement", "Globally distributed with automatic redundancy"],
  },
  d1: {
    title: "D1 (Serverless SQL Database)",
    desc: "A serverless SQLite database that runs at the edge. Full SQL support without managing database servers, connections, or scaling.",
    details: ["Replaces: AWS RDS, PlanetScale, managed Postgres", "SQLite-compatible — familiar SQL syntax", "Read replicas automatically distributed globally", "Pay only for what you use, scales to zero"],
  },
  vectorize: {
    title: "Vectorize (Vector Database)",
    desc: "A purpose-built vector database for AI search. Stores embeddings and finds similar content by meaning, not just keywords.",
    details: ["Replaces: Pinecone, Weaviate, pgvector", "Optimized for semantic / similarity search", "Native integration with Workers AI embeddings", "Cosine similarity with sub-second query times"],
  },
  ai: {
    title: "Workers AI (Serverless Inference)",
    desc: "Run AI models directly on Cloudflare's GPU network. No API keys, no external providers — inference runs at the edge, close to users.",
    details: ["Replaces: OpenAI API, AWS Bedrock, self-hosted GPUs", "Embedding model: bge-base-en-v1.5 (search vectors)", "Answer model: Llama 3.1 8B Instruct (text generation)", "Pay-per-token, no minimum commitment"],
  },
  gateway: {
    title: "AI Gateway (Observability)",
    desc: "A control plane for all your AI traffic. Logs every request, caches repeated prompts, enforces rate limits, and lets you switch providers without code changes.",
    details: ["Replaces: custom logging, prompt caching, rate limiters", "One dashboard for all AI model usage", "Built-in response caching to reduce costs", "Rate limiting and fallback routing across providers"],
  },
  do: {
    title: "Durable Objects (Stateful Coordination)",
    desc: "Single-threaded, globally unique objects with built-in storage. Perfect for sessions, real-time collaboration, or any workload that needs strong consistency without a database.",
    details: ["Replaces: Redis, WebSocket servers, session stores", "Guaranteed single-threaded — no race conditions", "Built-in SQLite storage colocated with compute", "Survives hibernation — state is never lost"],
  },
};

// ── Step definitions (no Durable Object) ──

interface StepDef {
  num: number;
  action: string;
  detail: string;
  services: string;
}

const UPLOAD_STEPS: StepDef[] = [
  { num: 1, action: "File sent to Worker", detail: "The browser uploads the file via multipart form data to the Worker API.", services: "Client → Worker" },
  { num: 2, action: "Raw file stored in R2", detail: "Original file bytes are saved as an object in R2 before any processing.", services: "Worker → R2" },
  { num: 3, action: "Metadata + chunks saved in D1", detail: "Document metadata, extracted text, and text chunks are written to D1. Chunk IDs are needed before embedding.", services: "Worker → D1" },
  { num: 4, action: "Routed through AI Gateway", detail: "Chunk text is sent to AI Gateway for logging and observability.", services: "Worker → AI Gateway" },
  { num: 5, action: "Embeddings created by Workers AI", detail: "Workers AI creates vector embeddings (or extracts text from images via vision model).", services: "AI Gateway → Workers AI" },
  { num: 6, action: "Vectors indexed in Vectorize", detail: "Embedding vectors are upserted into Vectorize for semantic search.", services: "Workers AI → Vectorize" },
];

const CHAT_STEPS: StepDef[] = [
  { num: 1, action: "Question sent to Worker", detail: "The browser sends the user's question to the Worker API.", services: "Client → Worker" },
  { num: 2, action: "Session loaded from Durable Object", detail: "The Worker sends the request to the Durable Object to load session state and persist the new message.", services: "Worker → Durable Object" },
  { num: 3, action: "Routed through AI Gateway", detail: "The question is sent to AI Gateway for logging and observability.", services: "Worker → AI Gateway" },
  { num: 4, action: "Question embedded by Workers AI", detail: "Workers AI converts the question text into a 768-dimensional search vector.", services: "AI Gateway → Workers AI" },
  { num: 5, action: "Semantic search in Vectorize", detail: "The question vector is matched against stored document chunk vectors (top-K).", services: "Workers AI → Vectorize" },
  { num: 6, action: "Chunk text fetched from D1", detail: "Full text content of the matched chunks is retrieved from D1 by their IDs.", services: "Vectorize → D1" },
  { num: 7, action: "Grounded answer generated", detail: "Context sent back through AI Gateway → Workers AI to generate an answer.", services: "D1 → Workers AI → AI Gateway → Worker" },
  { num: 8, action: "Answer + sources returned", detail: "The answer and source citations are sent back to the browser.", services: "Worker → Client" },
];

// ── Reusable diagram node ──

interface NodeProps {
  id: string; label: string; sublabel?: string;
  x: number; y: number; dashed?: boolean;
  selected: string | null; onSelect: (id: string) => void;
}

function DiagramNode({ id, label, sublabel, x, y, dashed, selected, onSelect, highlighted }: NodeProps & { highlighted?: boolean }) {
  const IconComp = ICONS[id];
  const active = selected === id;
  const isHighlighted = highlighted;
  return (
    <g onClick={() => onSelect(id)} style={{ cursor: "pointer" }}>
      {/* Glow ring when the ball is at this component */}
      {isHighlighted && (
        <rect x={x - 4} y={y - 4} width={148} height={72} rx={12}
          fill="none" stroke="#ff2222" strokeWidth={2.5} opacity={0.5}>
          <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1.2s" repeatCount="indefinite" />
        </rect>
      )}
      <rect x={x} y={y} width={140} height={64} rx={8}
        fill={isHighlighted ? "#fff5f5" : (active ? "#fff7ed" : "#fff")}
        stroke={isHighlighted ? "#ff2222" : (active ? "#f6821f" : (dashed ? "#f6821f" : "#d4d4d8"))}
        strokeWidth={isHighlighted ? 2.2 : (active ? 2.2 : 1.2)}
        strokeDasharray={dashed && !isHighlighted ? "5 3" : "none"} />
      <foreignObject x={x + 8} y={y + 10} width={28} height={28}>
        {IconComp && <IconComp />}
      </foreignObject>
      <text x={x + 44} y={y + 27} fontSize={12} fontWeight={600} fill="#1a1a1a" fontFamily="inherit">{label}</text>
      {sublabel && <text x={x + 44} y={y + 43} fontSize={8} fill="#888" fontFamily="inherit">{sublabel}</text>}
    </g>
  );
}

// ── Static arrow (no animated dot) ──

interface ArrowProps {
  path: string; label: string; step?: number;
  labelX: number; labelY: number;
  badgeX?: number; badgeY?: number;
  labelAnchor?: "start" | "middle" | "end";
}

function FlowArrow({ path, label, step, labelX, labelY, badgeX, badgeY, labelAnchor }: ArrowProps) {
  const pid = `ah-${path.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}-${step || 0}`;
  return (
    <g>
      <defs>
        <marker id={pid} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,1 L8,5 L0,9z" fill="#f6821f" />
        </marker>
      </defs>
      <path d={path} fill="none" stroke="#e8cdb0" strokeWidth={1.5} markerEnd={`url(#${pid})`} />
      {step !== undefined && badgeX !== undefined && badgeY !== undefined && (
        <>
          <circle cx={badgeX} cy={badgeY} r={10} fill="#f6821f" />
          <text x={badgeX} y={badgeY + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff" fontFamily="inherit">{step}</text>
        </>
      )}
      {label && (
        <text x={labelX} y={labelY} fontSize={9} fill="#666" fontFamily="inherit" textAnchor={labelAnchor || "start"}>{label}</text>
      )}
    </g>
  );
}

// ── Step timeline with active step highlighting ──

function StepTimeline({ steps, activeStep }: { steps: StepDef[]; activeStep?: number }) {
  return (
    <div className="aop-steps-col">
      {steps.map((s, i) => (
        <div key={s.num} className={`aop-step-card ${activeStep === s.num ? "active" : ""}`}>
          <div className={`aop-step-num ${activeStep === s.num ? "active" : ""}`}>{s.num}</div>
          <div className="aop-step-body">
            <div className="aop-step-action">{s.action}</div>
            <div className="aop-step-detail">{s.detail}</div>
            <div className="aop-step-services">{s.services}</div>
          </div>
          {i < steps.length - 1 && <div className="aop-step-connector" />}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════
// Circuit ball animation engine
// ══════════════════════════════════════════

interface Segment {
  points: [number, number][];
  stepNum: number;
  travelMs: number;
  pauseMs: number;
  destId: string; // which component the ball arrives at
}

// ── Upload flow segments (all horizontal/vertical) ──
// Layout: Row1: Client(20,30) Worker(240,30) R2(500,30)
//         Row2: D1(500,180) Vectorize(730,180)
//         Row3: AI Gateway(500,320) Workers AI(730,320)
const UPLOAD_SEGMENTS: Segment[] = [
  { points: [[160,62],[240,62]], stepNum: 1, travelMs: 1200, pauseMs: 800, destId: "worker" },
  { points: [[380,50],[500,50]], stepNum: 2, travelMs: 1400, pauseMs: 800, destId: "r2" },
  { points: [[380,62],[460,62],[460,210],[500,210]], stepNum: 3, travelMs: 1600, pauseMs: 800, destId: "d1" },
  { points: [[310,94],[310,320],[500,352]], stepNum: 4, travelMs: 1800, pauseMs: 800, destId: "gateway" },
  { points: [[640,352],[730,352]], stepNum: 5, travelMs: 1200, pauseMs: 800, destId: "ai" },
  { points: [[800,320],[800,244]], stepNum: 6, travelMs: 1200, pauseMs: 1000, destId: "vectorize" },
];

// ── Chat flow segments (with Durable Object) ──
// Layout: Row1: Client(20,30) Worker(240,30) AI Gateway(500,30) Workers AI(730,30)
//         Row2: DO(240,200) Vectorize(500,180)
//         Row3: D1(500,320)
const CHAT_SEGMENTS: Segment[] = [
  { points: [[160,50],[240,50]], stepNum: 1, travelMs: 1200, pauseMs: 800, destId: "worker" },
  { points: [[290,94],[290,200]], stepNum: 2, travelMs: 1200, pauseMs: 800, destId: "do" },
  { points: [[340,200],[340,94]], stepNum: 2, travelMs: 800, pauseMs: 400, destId: "worker" },
  { points: [[380,50],[500,50]], stepNum: 3, travelMs: 1400, pauseMs: 800, destId: "gateway" },
  { points: [[640,62],[730,62]], stepNum: 4, travelMs: 1200, pauseMs: 800, destId: "ai" },
  { points: [[770,94],[640,185]], stepNum: 5, travelMs: 1400, pauseMs: 800, destId: "vectorize" },
  { points: [[570,244],[570,320]], stepNum: 6, travelMs: 1200, pauseMs: 800, destId: "d1" },
  { points: [[640,340],[840,340],[840,94]], stepNum: 7, travelMs: 2200, pauseMs: 800, destId: "ai" },
  { points: [[730,80],[640,80]], stepNum: 7, travelMs: 800, pauseMs: 400, destId: "gateway" },
  { points: [[500,80],[380,80]], stepNum: 7, travelMs: 800, pauseMs: 600, destId: "worker" },
  // Step 8: Worker → Client
  { points: [[240,82],[160,82]], stepNum: 8, travelMs: 1200, pauseMs: 1000, destId: "client" },
];

/** Interpolate position along a polyline at progress t (0→1) */
function interpolatePolyline(points: [number, number][], t: number): [number, number] {
  if (points.length < 2) return points[0];
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    segLens.push(Math.sqrt(dx * dx + dy * dy));
    totalLen += segLens[segLens.length - 1];
  }
  const targetDist = t * totalLen;
  let accum = 0;
  for (let i = 0; i < segLens.length; i++) {
    if (accum + segLens[i] >= targetDist) {
      const localT = (targetDist - accum) / segLens[i];
      return [
        points[i][0] + (points[i + 1][0] - points[i][0]) * localT,
        points[i][1] + (points[i + 1][1] - points[i][1]) * localT,
      ];
    }
    accum += segLens[i];
  }
  return points[points.length - 1];
}

/** Reusable hook: drives a circuit ball through segments with pause/resume/next-step */
function useCircuit(segments: Segment[], active: boolean) {
  const [ballPos, setBallPos] = useState<[number, number] | null>(null);
  const [ballVisible, setBallVisible] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const [activeCompId, setActiveCompId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const segIdx = useRef(0);
  const phase = useRef<"travel" | "pause" | "waiting">("travel");
  const startTs = useRef(0);
  const raf = useRef(0);
  const pausedRef = useRef(false); // mirrors isPaused for use inside rAF

  const advanceToNext = useCallback(() => {
    segIdx.current = (segIdx.current + 1) % segments.length;
    phase.current = "travel";
    startTs.current = Date.now();
    const next = segments[segIdx.current];
    setBallPos(next.points[0]);
    setBallVisible(true);
    setActiveStep(next.stepNum);
    setActiveCompId(null);
  }, [segments]);

  const tick = useCallback(() => {
    const now = Date.now();
    const seg = segments[segIdx.current];
    const elapsed = now - startTs.current;

    if (phase.current === "travel") {
      const t = Math.min(elapsed / seg.travelMs, 1);
      setBallPos(interpolatePolyline(seg.points, t));
      setBallVisible(true);
      setActiveStep(seg.stepNum);
      if (t >= 1) {
        // Arrived at destination box
        phase.current = "pause";
        startTs.current = now;
        setBallVisible(false);
        setActiveCompId(seg.destId);
      }
    } else if (phase.current === "pause") {
      setBallVisible(false);
      if (elapsed >= seg.pauseMs) {
        if (pausedRef.current) {
          // User paused — hold here until resume or next-step
          phase.current = "waiting";
        } else {
          advanceToNext();
        }
      }
    } else if (phase.current === "waiting") {
      // Sitting at a component, waiting for user action — do nothing
      setBallVisible(false);
    }

    raf.current = requestAnimationFrame(tick);
  }, [segments, advanceToNext]);

  // Sync ref with state
  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);

  // Start/stop the animation loop
  useEffect(() => {
    if (!active) { cancelAnimationFrame(raf.current); return; }
    segIdx.current = 0;
    phase.current = "travel";
    startTs.current = Date.now();
    setBallPos(segments[0].points[0]);
    setBallVisible(true);
    setActiveStep(segments[0].stepNum);
    setIsPaused(false);
    pausedRef.current = false;
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active, tick, segments]);

  const pause = useCallback(() => { setIsPaused(true); }, []);
  const resume = useCallback(() => {
    setIsPaused(false);
    if (phase.current === "waiting") {
      advanceToNext();
    }
  }, [advanceToNext]);
  const nextStep = useCallback(() => {
    if (phase.current === "waiting") {
      advanceToNext();
      // Stay paused — ball will travel this segment then wait again
    }
  }, [advanceToNext]);

  return { ballPos, ballVisible, activeStep, activeCompId, isPaused, pause, resume, nextStep };
}

// ── Red circuit ball SVG element ──
function CircuitBall({ pos, visible }: { pos: [number, number] | null; visible: boolean }) {
  if (!pos || !visible) return null;
  return (
    <g>
      <circle cx={pos[0]} cy={pos[1]} r="10" fill="#ff2222" opacity="0.15">
        <animate attributeName="r" values="10;14;10" dur="0.8s" repeatCount="indefinite" />
      </circle>
      <circle cx={pos[0]} cy={pos[1]} r="6" fill="#ff2222" opacity="0.95">
        <animate attributeName="r" values="6;7;6" dur="0.8s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

// ══════════════════════════════════════════
// Main page component
// ══════════════════════════════════════════

interface Props { onClose: () => void; }

export default function ArchitectureOverviewPage({ onClose }: Props) {
  const [tab, setTab] = useState<"upload" | "chat">("upload");
  const [selected, setSelected] = useState<string | null>(null);
  const info = selected ? INFO[selected] : null;
  const SelectedIcon = selected ? ICONS[selected] : null;

  // Circuit ball animations for each tab (with pause/resume/nextStep)
  const upload = useCircuit(UPLOAD_SEGMENTS, tab === "upload");
  const chat = useCircuit(CHAT_SEGMENTS, tab === "chat");
  // Pick the active circuit's controls based on current tab
  const circuit = tab === "upload" ? upload : chat;

  return (
    <div className="aop">
      <header className="aop-header">
        <div>
          <h1 className="aop-title">Architecture Overview</h1>
          <p className="aop-sub">RAG Demo — Built on the Cloudflare Developer Platform</p>
        </div>
        <button className="aop-back" onClick={onClose}>← Back to App</button>
      </header>

      <div className="aop-tabs">
        <button className={`aop-tab ${tab === "upload" ? "active" : ""}`}
          onClick={() => { setTab("upload"); setSelected(null); }}>
          Upload &amp; Ingest Flow
        </button>
        <button className={`aop-tab ${tab === "chat" ? "active" : ""}`}
          onClick={() => { setTab("chat"); setSelected(null); }}>
          Chat &amp; RAG Query Flow
        </button>
      </div>

      {/* Playback controls */}
      <div className="aop-controls">
        <span className="aop-controls-label">Simulation</span>
        {circuit.isPaused ? (
          <>
            <button className="aop-ctrl-btn aop-ctrl-resume" onClick={circuit.resume}>&#9654; Resume</button>
            <button className="aop-ctrl-btn aop-ctrl-next" onClick={circuit.nextStep}>Next Step &#8594;</button>
          </>
        ) : (
          <button className="aop-ctrl-btn aop-ctrl-pause" onClick={circuit.pause}>&#10074;&#10074; Pause</button>
        )}
      </div>

      {/* ─── UPLOAD & INGEST TAB ─── */}
      {tab === "upload" && (
        <section className="aop-section">
          <p className="aop-section-desc">What happens when a user uploads a document</p>
          <div className="aop-flow-row">
            <StepTimeline steps={UPLOAD_STEPS} activeStep={upload.activeStep} />
            <div className="aop-right-col">
              <svg viewBox="0 0 900 420" className="aop-svg">
                <rect width="900" height="420" rx="12" fill="#fafafa" />
                <DiagramNode id="client" label="Client" sublabel="Browser" x={20} y={30} selected={selected} onSelect={setSelected} highlighted={upload.activeCompId === "client"} />
                <DiagramNode id="worker" label="Worker" sublabel="Serverless Functions" x={240} y={30} selected={selected} onSelect={setSelected} highlighted={upload.activeCompId === "worker"} />
                <DiagramNode id="r2" label="R2" sublabel="Object Storage" x={500} y={30} dashed selected={selected} onSelect={setSelected} highlighted={upload.activeCompId === "r2"} />
                <DiagramNode id="d1" label="D1" sublabel="Serverless SQL DB" x={500} y={180} dashed selected={selected} onSelect={setSelected} highlighted={upload.activeCompId === "d1"} />
                <DiagramNode id="vectorize" label="Vectorize" sublabel="Vector Database" x={730} y={180} dashed selected={selected} onSelect={setSelected} highlighted={upload.activeCompId === "vectorize"} />
                <DiagramNode id="gateway" label="AI Gateway" sublabel="AI Observability" x={500} y={320} dashed selected={selected} onSelect={setSelected} highlighted={upload.activeCompId === "gateway"} />
                <DiagramNode id="ai" label="Workers AI" sublabel="Serverless AI Inference" x={730} y={320} dashed selected={selected} onSelect={setSelected} highlighted={upload.activeCompId === "ai"} />
                <FlowArrow path="M160,62 L240,62" label="File upload" step={1} labelX={175} labelY={46} badgeX={200} badgeY={62} />
                <FlowArrow path="M380,50 L500,50" label="Store raw file" step={2} labelX={405} labelY={36} badgeX={440} badgeY={50} />
                <FlowArrow path="M380,62 L460,62 L460,210 L500,210" label="Save metadata + chunks" step={3} labelX={390} labelY={158} badgeX={460} badgeY={138} />
                <FlowArrow path="M310,94 L310,320 L500,352" label="Route AI call" step={4} labelX={318} labelY={220} badgeX={310} badgeY={208} />
                <FlowArrow path="M640,352 L730,352" label="Embed / Vision" step={5} labelX={652} labelY={340} badgeX={685} badgeY={352} />
                <FlowArrow path="M800,320 L800,244" label="Index vectors" step={6} labelX={816} labelY={288} badgeX={800} badgeY={280} />
                <CircuitBall pos={upload.ballPos} visible={upload.ballVisible} />
              </svg>
              <div className="aop-info-area">
                {info && (
                  <div className="aop-info">
                    <div className="aop-info-header">
                      {SelectedIcon && <SelectedIcon />}
                      <h3>{info.title}</h3>
                      <button className="aop-info-close" onClick={() => setSelected(null)}>✕</button>
                    </div>
                    <p className="aop-info-desc">{info.desc}</p>
                    <ul className="aop-info-list">
                      {info.details.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── CHAT & RAG TAB ─── */}
      {tab === "chat" && (
        <section className="aop-section">
          <p className="aop-section-desc">What happens when a user asks a question about uploaded content</p>
          <div className="aop-flow-row">
            <StepTimeline steps={CHAT_STEPS} activeStep={chat.activeStep} />
            <div className="aop-right-col">
              <svg viewBox="0 0 900 420" className="aop-svg">
                <rect width="900" height="420" rx="12" fill="#fafafa" />
                <defs>
                  <marker id="ah-chat-ret" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M0,1 L8,5 L0,9z" fill="#ccc" />
                  </marker>
                </defs>
                <DiagramNode id="client" label="Client" sublabel="Browser" x={20} y={30} selected={selected} onSelect={setSelected} highlighted={chat.activeCompId === "client"} />
                <DiagramNode id="worker" label="Worker" sublabel="Serverless Functions" x={240} y={30} selected={selected} onSelect={setSelected} highlighted={chat.activeCompId === "worker"} />
                <DiagramNode id="do" label="Durable Object" sublabel="Stateful Coordination" x={240} y={200} dashed selected={selected} onSelect={setSelected} highlighted={chat.activeCompId === "do"} />
                <DiagramNode id="gateway" label="AI Gateway" sublabel="AI Observability" x={500} y={30} dashed selected={selected} onSelect={setSelected} highlighted={chat.activeCompId === "gateway"} />
                <DiagramNode id="ai" label="Workers AI" sublabel="Serverless AI Inference" x={730} y={30} dashed selected={selected} onSelect={setSelected} highlighted={chat.activeCompId === "ai"} />
                <DiagramNode id="vectorize" label="Vectorize" sublabel="Vector Database" x={500} y={180} dashed selected={selected} onSelect={setSelected} highlighted={chat.activeCompId === "vectorize"} />
                <DiagramNode id="d1" label="D1" sublabel="Serverless SQL DB" x={500} y={320} dashed selected={selected} onSelect={setSelected} highlighted={chat.activeCompId === "d1"} />
                <FlowArrow path="M160,50 L240,50" label="Question" step={1} labelX={175} labelY={38} badgeX={200} badgeY={50} />
                <FlowArrow path="M240,82 L160,82" label="Answer + sources" step={8} labelX={168} labelY={100} badgeX={200} badgeY={82} />
                <FlowArrow path="M290,94 L290,200" label="Load session" step={2} labelX={278} labelY={152} badgeX={290} badgeY={148} labelAnchor="end" />
                <path d="M340,200 L340,94" fill="none" stroke="#ddd" strokeWidth={1.2} markerEnd="url(#ah-chat-ret)" />
                <text x={348} y={155} fontSize={8} fill="#bbb" fontFamily="inherit">return</text>
                <FlowArrow path="M380,50 L500,50" label="Route AI call" step={3} labelX={405} labelY={36} badgeX={440} badgeY={50} />
                <FlowArrow path="M640,62 L730,62" label="Embed question" step={4} labelX={652} labelY={48} badgeX={685} badgeY={62} />
                <FlowArrow path="M770,94 L640,185" label="Search top-K" step={5} labelX={688} labelY={158} badgeX={712} badgeY={138} />
                <FlowArrow path="M570,244 L570,320" label="Fetch chunks" step={6} labelX={578} labelY={288} badgeX={570} badgeY={282} />
                <FlowArrow path="M640,340 L840,340 L840,94" label="Generate answer" step={7} labelX={818} labelY={224} badgeX={840} badgeY={214} labelAnchor="end" />
                <path d="M730,80 L640,80" fill="none" stroke="#ddd" strokeWidth={1.2} markerEnd="url(#ah-chat-ret)" />
                <path d="M500,80 L380,80" fill="none" stroke="#ddd" strokeWidth={1.2} markerEnd="url(#ah-chat-ret)" />
                <text x={660} y={76} fontSize={8} fill="#bbb" fontFamily="inherit">return</text>
                <text x={420} y={76} fontSize={8} fill="#bbb" fontFamily="inherit">return</text>
                <CircuitBall pos={chat.ballPos} visible={chat.ballVisible} />
              </svg>
              <div className="aop-info-area">
                {info && (
                  <div className="aop-info">
                    <div className="aop-info-header">
                      {SelectedIcon && <SelectedIcon />}
                      <h3>{info.title}</h3>
                      <button className="aop-info-close" onClick={() => setSelected(null)}>✕</button>
                    </div>
                    <p className="aop-info-desc">{info.desc}</p>
                    <ul className="aop-info-list">
                      {info.details.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
