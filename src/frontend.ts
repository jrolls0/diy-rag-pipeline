import { UserContext } from "./types";

/**
 * Returns the full single-page HTML for the RAG app.
 * Cloudflare-branded, 3-column layout for customer demos.
 */
export function getHtml(user: UserContext): string {
  return /*html*/ `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RAG Demo — Cloudflare Developer Platform</title>
  <link rel="icon" href="https://www.cloudflare.com/favicon.ico" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            cf: {
              orange: '#f6821f',
              orangeLight: '#fbad41',
              bg: '#ffffff',
              surface: '#fafafa',
              surface2: '#f3f4f6',
              border: '#e5e7eb',
              text: '#374151',
              muted: '#9ca3af',
              dark: '#1a1a1a',
            }
          },
          fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
        }
      }
    }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner { animation: spin .6s linear infinite; border: 2.5px solid #e5e7eb; border-top-color: #f6821f; border-radius: 50%; width: 16px; height: 16px; display: inline-block; }
    .drop-active { border-color: #f6821f !important; background: rgba(246,130,31,.06) !important; }
    @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .step-animate { animation: fadeSlideIn .3s ease-out forwards; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    .cursor-blink { display:inline-block; width:2px; height:0.9em; background:#6b7280; margin-left:1px; vertical-align:text-bottom; animation:blink 0.9s step-end infinite; }
    @keyframes pulse-dot { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
    .pulse-dot { animation: pulse-dot 1.2s ease-in-out infinite; }
    .answer-text p { margin-bottom: .4rem; }
    .answer-text code { background: #fff7ed; padding: 1px 5px; border-radius: 4px; font-size: .85em; color: #f6821f; }
  </style>
</head>

<body class="h-full bg-cf-bg text-cf-text font-sans flex flex-col">

  <!-- ─── Header ─────────────────────────────────────────────────── -->
  <header class="flex items-center justify-between px-5 py-2.5 bg-white border-b-2 border-cf-orange">
    <div class="flex items-center gap-3">
      <svg class="w-7 h-7" viewBox="0 0 64 64" fill="none"><path d="M32 4L4 18l28 14 28-14L32 4z" fill="#f6821f"/><path d="M4 46l28 14 28-14" stroke="#f6821f" stroke-width="3" fill="none"/><path d="M4 32l28 14 28-14" stroke="#fbad41" stroke-width="3" fill="none"/></svg>
      <div>
        <h1 class="text-sm font-bold text-cf-dark tracking-tight">RAG Demo</h1>
        <p class="text-[10px] text-cf-muted -mt-0.5">Built on the Cloudflare Developer Platform</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-[11px] text-gray-400 border border-cf-border rounded-lg px-2.5 py-1 bg-cf-surface flex items-center gap-1.5">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
        ${user.email}
      </span>
      <a href="/architecture" class="text-[11px] font-semibold text-cf-orange border border-cf-orange/40 rounded-lg px-3 py-1.5 hover:bg-orange-50 transition flex items-center gap-1.5">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg>
        Architecture Map &rarr;
      </a>
    </div>
  </header>

  <!-- ─── Main 3-column layout ───────────────────────────────────── -->
  <main class="flex flex-1 overflow-hidden">

    <!-- ══ LEFT: Knowledge Library ════════════════════════════════ -->
    <aside class="w-72 flex flex-col border-r border-cf-border bg-white flex-shrink-0">
      <!-- ── KB selector ──────────────────────────────────────────── -->
      <div class="px-4 pt-4 pb-3 border-b border-cf-border">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-cf-muted mb-3">Knowledge Library</h2>
        <!-- Grouped KB list rendered by renderKbs() -->
        <div id="kb-list" class="space-y-0.5"></div>
        <!-- Create KB inline form (hidden by default) -->
        <div id="create-kb-form" class="hidden mt-2">
          <p class="text-[10px] text-cf-muted mb-1.5">Shared KBs are visible and writable by everyone.</p>
          <input id="kb-name-input" type="text" placeholder="e.g. Engineering Docs"
                 class="w-full text-xs border border-cf-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cf-orange"
                 onkeydown="if(event.key==='Enter')createKb()" />
          <div class="flex gap-1.5 mt-1.5">
            <button onclick="createKb()" class="flex-1 text-[11px] font-semibold bg-cf-orange text-white rounded-lg py-1 hover:bg-cf-orangeLight transition">Create</button>
            <button onclick="hideCreateKbForm()" class="flex-1 text-[11px] font-semibold bg-gray-100 text-gray-500 rounded-lg py-1 hover:bg-gray-200 transition">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Upload zone -->
      <div id="drop-zone"
           class="mx-3 mb-3 p-5 border border-dashed border-gray-300 rounded-xl text-center cursor-pointer transition-all hover:border-cf-orange/50"
           ondragover="event.preventDefault(); this.classList.add('drop-active')"
           ondragleave="this.classList.remove('drop-active')"
           ondrop="handleDrop(event)"
           onclick="document.getElementById('file-input').click()">
        <input id="file-input" type="file" accept=".txt,.md" class="hidden" onclick="event.stopPropagation()" onchange="handleFileSelect(event)" />
        <div class="w-9 h-9 mx-auto mb-2 rounded-lg bg-cf-surface2 flex items-center justify-center">
          <svg class="w-4 h-4 text-cf-orange" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        </div>
        <p class="text-xs text-cf-text">Drop a file or <span class="text-cf-orange font-medium">browse</span></p>
        <p class="text-[10px] text-cf-muted mt-0.5">.txt  .md</p>
      </div>

      <!-- Upload progress (simple) -->
      <div id="upload-bar" class="mx-3 mb-3 hidden">
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-cf-surface2 text-xs">
          <div class="spinner"></div>
          <span id="upload-bar-text" class="text-cf-muted">Processing…</span>
        </div>
      </div>

      <!-- Read-only overlay (shown when user doesn't own the selected KB) -->
      <div id="read-only-indicator" class="mx-3 mb-3 p-4 border border-dashed border-gray-200 rounded-xl text-center hidden">
        <div class="w-8 h-8 mx-auto mb-2 rounded-lg bg-gray-50 flex items-center justify-center">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
        </div>
        <p class="text-xs text-gray-500 font-medium">Read only</p>
        <p id="kb-owner-label" class="text-[10px] text-gray-400 mt-0.5"></p>
      </div>

      <!-- Document list -->
      <div class="flex items-center justify-between px-4 mb-1">
        <span class="text-[10px] font-medium uppercase tracking-wider text-cf-muted">Documents</span>
        <span id="doc-count" class="text-[10px] text-cf-muted bg-cf-surface2 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">0</span>
      </div>
      <ul id="doc-list" class="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
      </ul>
    </aside>

    <!-- ══ CENTER: Chat ══════════════════════════════════════════ -->
    <section class="flex-1 flex flex-col min-w-0 bg-white">
      <div id="chat-messages" class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <div id="chat-placeholder" class="flex flex-col items-center justify-center h-full text-center">
          <div class="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
            <svg class="w-7 h-7 text-cf-orange" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"/></svg>
          </div>
          <p class="text-sm text-cf-muted max-w-xs">Upload a document to the Knowledge Library, then ask questions about it here.</p>
        </div>
      </div>

      <form id="chat-form" class="px-5 pb-4 pt-2 border-t border-cf-border" onsubmit="handleAsk(event)">
        <div class="flex gap-2 items-center bg-white border border-gray-300 rounded-xl px-4 py-1 focus-within:border-cf-orange transition shadow-sm">
          <input id="chat-input" type="text" placeholder="Ask a question about your documents…" autocomplete="off"
                 class="flex-1 bg-transparent py-2 text-sm text-cf-dark placeholder:text-cf-muted focus:outline-none" />
          <button type="submit" id="ask-btn"
                  class="bg-cf-orange hover:bg-cf-orangeLight text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>
            Ask
          </button>
        </div>
      </form>
    </section>

    <!-- ══ RIGHT: Live Trace (collapsible) ═════════════════════════ -->
    <aside id="activity-panel" class="w-[400px] flex flex-col border-l border-cf-border bg-white flex-shrink-0 hidden">
      <div class="px-4 pt-3 pb-2 flex items-center justify-between border-b border-cf-border">
        <h2 class="text-[11px] font-bold uppercase tracking-widest text-gray-500">Live Trace</h2>
        <button onclick="togglePanel()" class="text-gray-400 hover:text-gray-600 transition p-1" title="Close">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- PoP badge -->
      <div id="trace-header" class="px-4 py-2 border-b border-cf-border hidden">
        <span class="text-[11px] text-gray-500">PoP: <span id="trace-pop" class="font-bold text-cf-orange text-xs">—</span></span>
      </div>

      <!-- Trace rows -->
      <div id="activity-feed" class="flex-1 overflow-y-auto px-4 py-3">
        <div id="activity-placeholder" class="flex flex-col items-center justify-center h-full text-center px-2">
          <p class="text-[11px] text-gray-400 leading-relaxed">Upload a document or ask a question to see a live trace of every Cloudflare service involved.</p>
        </div>
      </div>
    </aside>

    <!-- Toggle tab (attached to right edge) -->
    <button id="activity-toggle" onclick="togglePanel()" class="fixed right-0 top-1/2 -translate-y-1/2 z-20 bg-cf-orange text-white rounded-l-lg pl-2.5 pr-2 py-3 shadow-lg hover:bg-cf-orangeLight transition-all flex flex-col items-center gap-1.5 group" style="writing-mode:vertical-lr">
      <svg class="w-4 h-4 rotate-180 group-hover:translate-x-[-2px] transition" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      <span class="text-[11px] font-semibold tracking-wide">Live Trace</span>
    </button>
  </main>

<script>
// =====================================================================
// Service colors for trace rows
// =====================================================================
const SVC = {
  'Worker':         { color: '#f6821f', label: 'Worker' },
  'R2':             { color: '#f6821f', label: 'R2' },
  'Workers AI':     { color: '#7c3aed', label: 'Workers AI' },
  'D1':             { color: '#2563eb', label: 'D1' },
  'Vectorize':      { color: '#059669', label: 'Vectorize' },
  'AI Gateway':     { color: '#d97706', label: 'AI Gateway' },
  'Durable Object': { color: '#0891b2', label: 'Durable Object' },
};

let documents = [];
let kbs = [];
let selectedKbId = null;
const currentUserId = ${JSON.stringify(user.email)};
let traceStartTime = 0;
let traceStepIndex = 0;
// Silently warm the LLM on this edge node so the first query doesn't cold-start
fetch('/api/warmup', { method: 'POST' }).catch(() => {});
(async () => { await loadKbs(); })();

// =====================================================================
// Panel toggle
// =====================================================================
function togglePanel() {
  const panel = document.getElementById('activity-panel');
  const btn = document.getElementById('activity-toggle');
  const isHidden = panel.classList.contains('hidden');
  if (isHidden) {
    panel.classList.remove('hidden');
    btn.classList.add('hidden');
  } else {
    panel.classList.add('hidden');
    btn.classList.remove('hidden');
  }
}

// =====================================================================
// Knowledge Bases
// =====================================================================
async function loadKbs() {
  try {
    const res = await fetch('/api/kbs');
    const data = await res.json();
    kbs = data.kbs || [];
    renderKbs();
    if (kbs.length > 0 && !selectedKbId) {
      await selectKb(kbs[0].id);
    } else {
      updateUploadZone();
      await refreshDocuments();
    }
  } catch(e) { console.error('Failed to load KBs', e); }
}

function renderKbs() {
  var list = document.getElementById('kb-list');
  if (kbs.length === 0) {
    list.innerHTML = '<p class="text-xs text-gray-400 text-center py-2">No knowledge bases yet.</p>';
    return;
  }

  var myKbs = kbs.filter(function(kb) { return kb.is_personal === 1; });
  var sharedKbs = kbs.filter(function(kb) { return kb.is_personal === 0; });

  function kbRow(kb) {
    var isActive = kb.id === selectedKbId;
    var cls = isActive ? 'bg-orange-50 text-cf-orange font-semibold border border-orange-200' : 'text-cf-dark hover:bg-gray-50 border border-transparent';
    var badge = isActive ? '<span class="text-[10px] font-medium ml-1 flex-shrink-0 opacity-70">active</span>' : '';
    return '<button data-kbid="' + kb.id + '" onclick="selectKb(this.dataset.kbid)" class="w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between ' + cls + '">' + '<span class="truncate">' + esc(kb.name) + '</span>' + badge + '</button>';
  }

  var html = '';

  if (myKbs.length > 0) {
    html += '<div class="mb-2">';
    html += '<div class="flex items-center gap-1 px-1 mb-1">';
    html += '<svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>';
    html += '<span class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Mine (private)</span>';
    html += '</div>';
    html += myKbs.map(kbRow).join('');
    html += '</div>';
  }

  if (sharedKbs.length > 0) {
    html += '<div class="mb-2">';
    html += '<div class="flex items-center gap-1 px-1 mb-1">';
    html += '<svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>';
    html += '<span class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Shared (everyone)</span>';
    html += '</div>';
    html += sharedKbs.map(kbRow).join('');
    html += '</div>';
  }

  html += '<button onclick="showCreateKbForm()" id="new-kb-btn" class="w-full mt-1 text-[11px] font-semibold text-cf-orange border border-dashed border-orange-200 rounded-lg py-1.5 hover:bg-orange-50 transition flex items-center justify-center gap-1">';
  html += '<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>';
  html += ' New shared KB</button>';

  list.innerHTML = html;
}

async function selectKb(kbId) {
  selectedKbId = kbId;
  renderKbs();
  // Reset chat when switching KBs so context doesn't bleed across
  document.getElementById('chat-messages').innerHTML =
    '<div id="chat-placeholder" class="flex flex-col items-center justify-center h-full text-center">' +
      '<div class="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">' +
        '<svg class="w-7 h-7 text-cf-orange" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"/></svg>' +
      '</div>' +
      '<p class="text-sm text-cf-muted max-w-xs">Upload a document to this knowledge base, then ask questions about it here.</p>' +
    '</div>';
  updateUploadZone();
  await refreshDocuments();
}

function updateUploadZone() {
  var kb = kbs.find(function(k) { return k.id === selectedKbId; });
  // Every KB in the list is writable: personal KBs are only shown to their owner,
  // shared KBs are open to everyone.
  var canUpload = !!kb;
  document.getElementById('drop-zone').classList.toggle('hidden', !canUpload);
  document.getElementById('read-only-indicator').classList.toggle('hidden', true);
}

async function createKb() {
  var input = document.getElementById('kb-name-input');
  var name = input.value.trim();
  if (!name) { input.focus(); return; }
  try {
    var res = await fetch('/api/kbs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name }),
    });
    var data = await res.json();
    if (!data.success) { alert(data.error || 'Failed to create knowledge base.'); return; }
    input.value = '';
    hideCreateKbForm();
    await loadKbs();
    await selectKb(data.kb.id);
  } catch(e) { alert('Error: ' + e.message); }
}

function showCreateKbForm() {
  document.getElementById('create-kb-form').classList.remove('hidden');
  document.getElementById('new-kb-btn').classList.add('hidden');
  setTimeout(function() { document.getElementById('kb-name-input').focus(); }, 50);
}

function hideCreateKbForm() {
  document.getElementById('create-kb-form').classList.add('hidden');
  document.getElementById('new-kb-btn').classList.remove('hidden');
  document.getElementById('kb-name-input').value = '';
}

// =====================================================================
// Live Request Trace
// =====================================================================
function clearTrace() {
  document.getElementById('activity-feed').innerHTML = '';
  document.getElementById('trace-header').classList.add('hidden');
  traceStepIndex = 0;
}

function showTraceHeader(meta) {
  var hdr = document.getElementById('trace-header');
  hdr.classList.remove('hidden');
  document.getElementById('trace-pop').textContent = meta.colo;
}

function addTraceRow(step) {
  var ph = document.getElementById('activity-placeholder');
  if (ph) ph.remove();

  traceStepIndex++;
  var feed = document.getElementById('activity-feed');
  var svc = SVC[step.service] || SVC['Worker'];
  var isLast = false; // will be connected by line to next step
  var rowId = 'trace-row-' + traceStepIndex;

  var el = document.createElement('div');
  el.className = 'step-animate relative';
  var ms = step.durationMs > 0 ? step.durationMs + 'ms' : '';

  el.innerHTML =
    // Vertical connecting line
    '<div class="trace-line absolute left-[11px] top-[22px] bottom-0 w-px bg-gray-200"></div>' +
    // Clickable row
    '<div class="flex items-start gap-3 py-2.5 cursor-pointer group" onclick="toggleTraceDetail(\\'' + rowId + '\\')">'+
      // Dot
      '<div class="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 border-2 mt-0.5" style="border-color:' + svc.color + ';background:white">' +
        '<div class="w-2 h-2 rounded-full" style="background:' + svc.color + '"></div>' +
      '</div>' +
      // Content
      '<div class="flex-1 min-w-0">' +
        // Row 1: Title
        '<div class="flex items-center justify-between gap-2">' +
          '<span class="text-[12px] font-semibold text-gray-800 group-hover:text-cf-orange transition whitespace-nowrap">' + esc(step.title) + '</span>' +
          '<svg class="w-3.5 h-3.5 text-gray-300 flex-shrink-0 group-hover:text-gray-500 transition" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>' +
        '</div>' +
        // Row 2: Service badge
        '<div class="mt-1">' +
          '<span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style="color:' + svc.color + ';background:' + svc.color + '10;border:1px solid ' + svc.color + '25">' + esc(step.service) + '</span>' +
        '</div>' +
        // Row 3: Expandable description (hidden by default)
        '<div id="' + rowId + '" class="hidden mt-1.5">' +
          '<p class="text-[11px] text-gray-500 leading-relaxed">' + esc(step.detail) + '</p>' +
        '</div>' +
      '</div>' +
    '</div>';
  feed.appendChild(el);
  feed.scrollTop = feed.scrollHeight;
}

function toggleTraceDetail(id) {
  var el = document.getElementById(id);
  if (el) el.classList.toggle('hidden');
}

function addTraceSpinner() {
  var feed = document.getElementById('activity-feed');
  var el = document.createElement('div');
  el.id = 'activity-spinner';
  el.className = 'flex items-center gap-2.5 py-3 step-animate';
  el.innerHTML = '<div class="spinner"></div><span class="text-[11px] text-gray-400">Tracing…</span>';
  feed.appendChild(el);
  feed.scrollTop = feed.scrollHeight;
}

function removeTraceSpinner() {
  var el = document.getElementById('activity-spinner');
  if (el) el.remove();
}

// =====================================================================
// SSE helper: consume a streaming endpoint, calling handlers per event
// =====================================================================
function consumeSSE(response, handlers) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  function pump() {
    return reader.read().then(function(result) {
      if (result.done) { if (handlers.close) handlers.close(); return; }
      buffer += decoder.decode(result.value, { stream: true });
      // Parse SSE events from the buffer
      const parts = buffer.split('\\n\\n');
      buffer = parts.pop(); // keep incomplete chunk
      parts.forEach(function(block) {
        let event = 'message';
        let data = '';
        block.split('\\n').forEach(function(line) {
          if (line.startsWith('event: ')) event = line.slice(7);
          else if (line.startsWith('data: ')) data = line.slice(6);
        });
        if (data && handlers[event]) {
          try { handlers[event](JSON.parse(data)); } catch(e) { console.error('SSE parse error', e); }
        }
      });
      return pump();
    });
  }
  pump();
}

// =====================================================================
// Documents
// =====================================================================
async function refreshDocuments() {
  try {
    const url = selectedKbId ? '/api/documents?kb_id=' + encodeURIComponent(selectedKbId) : '/api/documents';
    const res = await fetch(url);
    const data = await res.json();
    documents = data.documents || [];
    renderDocuments();
  } catch (e) { console.error('Failed to load documents', e); }
}

function renderDocuments() {
  const list = document.getElementById('doc-list');
  const count = document.getElementById('doc-count');
  count.textContent = documents.length;
  if (documents.length === 0) {
    list.innerHTML = '<li class="text-xs text-gray-400 text-center py-8">No documents uploaded yet.</li>';
    return;
  }
  list.innerHTML = documents.map(function(d) {
    const sizeKb = (d.size_bytes / 1024).toFixed(1);
    return '<li class="group flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2 hover:bg-orange-50/50 transition border border-transparent hover:border-orange-100">' +
      '<div class="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">' +
        '<svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>' +
      '</div>' +
      '<div class="min-w-0 flex-1">' +
        '<p class="text-xs font-medium text-gray-800 truncate">' + esc(d.filename) + '</p>' +
        '<p class="text-[10px] text-gray-400">' + sizeKb + ' KB &middot; ' + d.chunk_count + ' chunks</p>' +
      '</div>' +
      '<button onclick="deleteDoc(\\'' + d.id + '\\')" class="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition p-1">' +
        '<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
      '</button>' +
    '</li>';
  }).join('');
}

// =====================================================================
// Upload (SSE)
// =====================================================================
function handleDrop(e) { e.preventDefault(); e.currentTarget.classList.remove('drop-active'); var f = e.dataTransfer.files[0]; if (f) uploadFile(f); }
function handleFileSelect(e) { var f = e.target.files[0]; if (f) uploadFile(f); e.target.value = ''; }

async function uploadFile(file) {
  const bar = document.getElementById('upload-bar');
  const barText = document.getElementById('upload-bar-text');
  bar.classList.remove('hidden');
  barText.textContent = 'Processing ' + file.name + '…';

  clearTrace();
  addTraceSpinner();

  // Disable chat during upload to prevent querying before embeddings are ready
  document.getElementById('ask-btn').disabled = true;
  document.getElementById('chat-input').setAttribute('placeholder', 'Processing document…');

  const form = new FormData();
  form.append('file', file);
  if (selectedKbId) form.append('kb_id', selectedKbId);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    removeTraceSpinner();

    consumeSSE(res, {
      meta: function(m) { showTraceHeader(m); },
      step: function(s) { addTraceRow(s); },
      done: function(d) {
        barText.textContent = file.name + ' ready!';
        bar.querySelector('.spinner').style.display = 'none';
        refreshDocuments();
        document.getElementById('ask-btn').disabled = false;
        document.getElementById('chat-input').setAttribute('placeholder', 'Ask a question about your documents…');
        setTimeout(function() { bar.classList.add('hidden'); bar.querySelector('.spinner').style.display = ''; }, 2000);
      },
      error: function(e) {
        barText.textContent = e.error || 'Upload failed.';
        document.getElementById('ask-btn').disabled = false;
        document.getElementById('chat-input').setAttribute('placeholder', 'Ask a question about your documents…');
        setTimeout(function() { bar.classList.add('hidden'); }, 4000);
      },
    });
  } catch (err) {
    removeTraceSpinner();
    document.getElementById('ask-btn').disabled = false;
    document.getElementById('chat-input').setAttribute('placeholder', 'Ask a question about your documents…');
    barText.textContent = 'Error: ' + err.message;
    setTimeout(function() { bar.classList.add('hidden'); }, 4000);
  }
}

async function deleteDoc(id) {
  if (!confirm('Delete this document and all its data?')) return;
  await fetch('/api/documents/' + id, { method: 'DELETE' });
  await refreshDocuments();
}

// =====================================================================
// Chat (SSE)
// =====================================================================
async function handleAsk(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const question = input.value.trim();
  if (!question) return;

  removePlaceholder();
  appendMessage('user', esc(question));
  input.value = '';
  document.getElementById('ask-btn').disabled = true;

  var streamingMsgId = null;
  var streamingText = '';

  var thinkId = appendMessage('assistant', '<div class="flex items-center gap-2"><div class="spinner"></div><span class="text-gray-400 text-xs">Thinking…</span></div>');
  clearTrace();
  addTraceSpinner();

  function buildSourcesHtml(sources) {
    if (!sources || sources.length === 0) return '';
    var h = '<div class="mt-3 pt-2 border-t border-gray-200">';
    h += '<p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Sources</p>';
    sources.forEach(function(s, i) {
      h += '<details class="text-[11px] text-gray-500 mb-1">' +
        '<summary class="cursor-pointer hover:text-gray-700 transition">' +
          '<span class="font-medium text-cf-orange">[' + (i+1) + ']</span> ' + esc(s.filename) + ' &middot; chunk ' + s.chunk_index +
        '</summary>' +
        '<p class="mt-1 ml-4 text-gray-400 whitespace-pre-wrap text-[10px] leading-relaxed">' + esc(s.text_snippet) + '</p>' +
      '</details>';
    });
    h += '</div>';
    return h;
  }

  try {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, kb_id: selectedKbId }),
    });
    removeTraceSpinner();

    consumeSSE(res, {
      meta: function(m) { showTraceHeader(m); },
      step: function(s) { addTraceRow(s); },
      token: function(t) {
        if (!streamingMsgId) {
          // First token — swap out the thinking bubble for a live streaming one
          removeMessage(thinkId);
          streamingMsgId = appendMessage('assistant',
            '<span id="stream-content" class="answer-text"></span><span class="cursor-blink"></span>');
        }
        streamingText += t.token;
        // Update as plain text while streaming (fast + safe)
        var contentEl = document.getElementById('stream-content');
        if (contentEl) {
          contentEl.innerHTML = formatAnswer(streamingText);
          // Keep chat scrolled to bottom as tokens arrive
          var msgs = document.getElementById('chat-messages');
          msgs.scrollTop = msgs.scrollHeight;
        }
      },
      done: function(d) {
        if (streamingMsgId) {
          // Replace the raw streamed text with properly formatted HTML + sources
          var el = document.getElementById(streamingMsgId);
          if (el) {
            el.querySelector('div').innerHTML =
              '<div class="answer-text">' + formatAnswer(streamingText) + '</div>' +
              buildSourcesHtml(d.sources);
          }
          streamingMsgId = null;
          streamingText = '';
        } else {
          // Fallback: no tokens were streamed (e.g. error before first token)
          removeMessage(thinkId);
          if (!d.success) {
            appendMessage('assistant', '<span class="text-red-500">' + esc(d.error || 'Something went wrong.') + '</span>');
          } else {
            appendMessage('assistant',
              '<div class="answer-text">' + formatAnswer(d.answer) + '</div>' + buildSourcesHtml(d.sources));
          }
        }
        document.getElementById('ask-btn').disabled = false;
        input.focus();
      },
      error: function(e) {
        removeMessage(streamingMsgId || thinkId);
        streamingMsgId = null; streamingText = '';
        appendMessage('assistant', '<span class="text-red-500">Error: ' + esc(e.error) + '</span>');
        document.getElementById('ask-btn').disabled = false;
        input.focus();
      },
      close: function() {
        document.getElementById('ask-btn').disabled = false;
      }
    });
  } catch (err) {
    removeTraceSpinner();
    removeMessage(thinkId);
    appendMessage('assistant', '<span class="text-red-500">Network error: ' + esc(err.message) + '</span>');
    document.getElementById('ask-btn').disabled = false;
    input.focus();
  }
}

// =====================================================================
// Chat helpers
// =====================================================================
let msgCounter = 0;

function removePlaceholder() {
  const ph = document.getElementById('chat-placeholder');
  if (ph) ph.remove();
}

function appendMessage(role, html) {
  const container = document.getElementById('chat-messages');
  const id = 'msg-' + (++msgCounter);
  const isUser = role === 'user';
  const el = document.createElement('div');
  el.id = id;
  el.className = 'flex ' + (isUser ? 'justify-end' : 'justify-start') + ' step-animate';
  el.innerHTML = '<div class="' +
    (isUser ? 'bg-orange-50 text-gray-800 border border-orange-200 max-w-md' : 'bg-gray-50 text-gray-700 max-w-2xl border border-gray-200') +
    ' rounded-2xl px-4 py-3 text-sm leading-relaxed">' + html + '</div>';
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeMessage(id) { const el = document.getElementById(id); if (el) el.remove(); }

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function formatAnswer(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
    .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
    .replace(/\\n{2,}/g, '</p><p>')
    .replace(/\\n/g, '<br/>')
    .replace(/^/, '<p>').replace(/$/, '</p>');
}
</script>

</body>
</html>`;
}
