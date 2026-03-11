# Architecture Map — Cloudflare Developer Platform

An interactive, animated architecture diagram showing how a RAG (Retrieval-Augmented Generation) application works on the Cloudflare Developer Platform. Two tabbed views show the **Upload & Ingest** flow and the **Chat & RAG Query** flow.

## Live Demo Features

- **Animated circuit ball** travels between architecture components in real-time
- **Two flow tabs**: Upload & Ingest (6 steps) and Chat & RAG Query (7 steps)
- **Clickable component nodes** — click any box (Worker, R2, D1, etc.) to see detailed info
- **Playback controls** — Pause, Resume, and Step-through the animation
- **Step timeline** — left sidebar highlights the current step with descriptions
- **Responsive** — stacks vertically on narrow screens
- **Zero external dependencies** — only React (no icons, no UI libraries, no images)

## Files Included

```
architecture-map-export/
├── ArchitectureOverviewPage.tsx   # The full React component (551 lines)
├── architecture-map.css           # All required CSS styles (self-contained)
└── README.md                      # This file
```

## Quick Start (React Project)

### 1. Copy files into your project

```bash
cp ArchitectureOverviewPage.tsx  your-project/src/components/
cp architecture-map.css          your-project/src/styles/
```

### 2. Import the CSS

In your main entry file (e.g., `main.tsx` or `App.tsx`):

```tsx
import "./styles/architecture-map.css";
```

### 3. Render the component

```tsx
import ArchitectureOverviewPage from "./components/ArchitectureOverviewPage";

function App() {
  const [showArchMap, setShowArchMap] = useState(false);

  if (showArchMap) {
    return <ArchitectureOverviewPage onClose={() => setShowArchMap(false)} />;
  }

  return (
    <div>
      <button onClick={() => setShowArchMap(true)}>
        View Architecture Map
      </button>
      {/* ...rest of your app */}
    </div>
  );
}
```

### That's it. No other dependencies needed.

## Component API

```tsx
interface Props {
  onClose: () => void;  // Called when user clicks "← Back to App" button
}

export default function ArchitectureOverviewPage({ onClose }: Props): JSX.Element
```

## Dependencies

| Dependency | Version | Notes |
|-----------|---------|-------|
| `react` | 18+ | Only import: `useState`, `useEffect`, `useRef`, `useCallback` |
| `react-dom` | 18+ | For rendering |

**No other packages are needed.** All icons are inline SVGs. All animations use `requestAnimationFrame`. All styles are plain CSS.

## Architecture Components Shown

| Component | Role in the diagram |
|-----------|-------------------|
| **Client (Browser)** | React SPA — uploads files and asks questions |
| **Worker** | API router + pipeline orchestrator |
| **R2** | Object storage for raw uploaded files |
| **D1** | SQL database for metadata, chunks, messages |
| **Vectorize** | Vector database for semantic search |
| **Workers AI** | Runs 3 models: embeddings, vision, answer generation |
| **AI Gateway** | Observability, caching, rate limiting for AI calls |

## Upload & Ingest Flow (6 steps)

```
1. Client → Worker        (file upload via multipart form)
2. Worker → R2            (store raw file bytes)
3. Worker → D1            (save metadata + text chunks)
4. Worker → AI Gateway    (route embedding request)
5. AI Gateway → Workers AI (create vector embeddings)
6. Workers AI → Vectorize  (index vectors for search)
```

## Chat & RAG Query Flow (7 steps)

```
1. Client → Worker             (send question)
2. Worker → AI Gateway         (route embedding request)
3. AI Gateway → Workers AI     (embed the question)
4. Workers AI → Vectorize      (semantic search top-K)
5. Vectorize → D1              (fetch matched chunk text)
6. D1 → Workers AI → Gateway   (generate grounded answer)
7. Worker → Client             (return answer + sources)
```

## Customization Guide

### Change the accent color
Replace all instances of `#f6821f` (Cloudflare orange) in both `.tsx` and `.css` files.

### Change component descriptions
Edit the `INFO` object near the top of `ArchitectureOverviewPage.tsx` (line ~69). Each entry has `title`, `desc`, and `details[]`.

### Change step descriptions
Edit `UPLOAD_STEPS` (line ~116) and `CHAT_STEPS` (line ~125). Each step has `num`, `action`, `detail`, and `services`.

### Adjust animation speed
Edit `UPLOAD_SEGMENTS` (line ~238) and `CHAT_SEGMENTS` (line ~251). Each segment has:
- `travelMs` — how long the ball takes to travel this path (milliseconds)
- `pauseMs` — how long the ball pauses at the destination

### Change the SVG diagram layout
Node positions are defined as `x, y` in the `<DiagramNode>` JSX (lines ~460-466 for upload, ~509-514 for chat). Arrow paths are SVG path strings in `<FlowArrow>` components.

## CSS Class Naming Convention

All CSS classes use the `aop-` prefix (Architecture Overview Page) to avoid conflicts with your existing styles.

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

Uses: `requestAnimationFrame`, SVG `<foreignObject>`, CSS `animation`, `position: sticky`.
