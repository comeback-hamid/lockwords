#!/usr/bin/env node
// Turns docs/roadmap.md and docs/product.md into read-only HTML pages for people.
// Never edit the .html files by hand: edit the .md, then run `npm run docs:html`.
// The pre-commit hook runs this when one of those .md files is staged.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const STATUS = [
  ['✅', 'done', 'Done'],
  ['🟨', 'doing', 'In progress'],
  ['⬜', 'todo', 'Not started'],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u.replace(/"/g, '&quot;')}">${t}</a>`);
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
}

const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

// Markdown → simple blocks. Only what our docs use: headings, paragraphs, lists (one nested level), tables, ---.
export function parse(md) {
  const blocks = [];
  const lines = md.replace(/\r/g, '').split('\n');
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) { blocks.push({ type: 'h', level: h[1].length, text: h[2] }); i++; continue; }
    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      const [head, , ...body] = rows; // second row is the |---| separator
      blocks.push({ type: 'table', head: cells(head), rows: body.map(cells) });
      continue;
    }
    if (/^-{3,}$/.test(line.trim())) { i++; continue; } // section rules: sections already get panels
    if (/^\s*(\d+\.|[-*])\s/.test(line)) {
      const ordered = /^\d+\./.test(line.trim());
      const items = [];
      const subs = [];
      while (i < lines.length && /^\s*(\d+\.|[-*])\s/.test(lines[i])) {
        const text = lines[i].replace(/^\s*(\d+\.|[-*])\s+/, '');
        if (/^\s{2,}/.test(lines[i]) && items.length) (subs[items.length - 1] ||= []).push(text);
        else items.push(text);
        i++;
      }
      blocks.push(subs.length ? { type: 'list', ordered, items, subs } : { type: 'list', ordered, items });
      continue;
    }
    const para = [lines[i++]];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\||(\d+\.|[-*])\s|-{3,}$)/.test(lines[i].trim())) para.push(lines[i++]);
    blocks.push({ type: 'p', text: para.join(' ') });
  }
  return blocks;
}

export function statusOf(cell = '') {
  const found = STATUS.find(([emoji]) => cell.includes(emoji));
  if (!found) return null;
  const [emoji, key, label] = found;
  return { key, label, note: cell.replace(emoji, '').trim() };
}

const pill = (st) =>
  `<span class="pill ${st.key}"><i></i>${st.label}</span>${st.note ? `<span class="note">${inline(st.note)}</span>` : ''}`;

const chips = (cell) =>
  cell.includes(' · ')
    ? `<div class="chips">${cell.split(' · ').map((c) => `<span class="chip">${inline(c)}</span>`).join('')}</div>`
    : `<p>${inline(cell)}</p>`;

function statusTable(t, statusCol) {
  const counts = { done: 0, doing: 0, todo: 0 };
  const cards = t.rows.map((r) => {
    const st = statusOf(r[statusCol]) || { key: 'todo', label: 'Not started', note: '' };
    counts[st.key]++;
    const [num, title] = r;
    const rest = t.head
      .map((label, i) => ({ label, value: r[i] }))
      .filter((_, i) => i > 1 && i !== statusCol && r[i]);
    return `<article class="card ${st.key}">
  <header><span class="num">${inline(num || '')}</span><h3>${inline(title || '')}</h3><div class="status">${pill(st)}</div></header>
  ${rest.map((c) => `<div class="field"><span class="label">${inline(c.label)}</span>${chips(c.value)}</div>`).join('\n  ')}
</article>`;
  });
  const total = t.rows.length || 1;
  const bar = `<div class="bar" title="${counts.done} done · ${counts.doing} in progress · ${counts.todo} not started">
  <span class="done" style="width:${(counts.done / total) * 100}%"></span><span class="doing" style="width:${(counts.doing / total) * 100}%"></span></div>
<p class="counts">${counts.done} of ${t.rows.length} done${counts.doing ? ` · ${counts.doing} in progress` : ''}</p>`;
  return { html: `${bar}<div class="cards">${cards.join('\n')}</div>`, counts };
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function render(md, { generated = new Date(), source = 'docs/roadmap.md', toc = false } = {}) {
  const blocks = parse(md);
  const totals = { done: 0, doing: 0, todo: 0 };
  let title = 'Roadmap';
  const body = blocks.map((b) => {
    if (b.type === 'h' && b.level === 1) { title = b.text; return ''; }
    if (b.type === 'h') return `<h${b.level}${b.level === 2 ? ` id="${slug(b.text)}"` : ''}>${inline(b.text)}</h${b.level}>`;
    if (b.type === 'p') return `<p class="lead">${inline(b.text)}</p>`;
    if (b.type === 'list') {
      const tag = b.ordered ? 'ol' : 'ul';
      const sub = (k) => (b.subs?.[k] ? `<ul>${b.subs[k].map((x) => `<li>${inline(x)}</li>`).join('')}</ul>` : '');
      return `<${tag}>${b.items.map((x, k) => `<li>${inline(x)}${sub(k)}</li>`).join('')}</${tag}>`;
    }
    const statusCol = b.head.findIndex((h) => /^status$/i.test(h));
    if (statusCol > 1) {
      const { html, counts } = statusTable(b, statusCol);
      for (const k in totals) totals[k] += counts[k];
      return html;
    }
    return `<div class="scroll"><table><thead><tr>${b.head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${b.rows
      .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table></div>`;
  });

  // Group everything after each h2 into a section, so each phase gets its own panel.
  const sections = [];
  let current = { head: '', parts: [] };
  body.forEach((html, i) => {
    if (blocks[i].type === 'h' && blocks[i].level === 2) {
      sections.push(current);
      current = { head: html, parts: [] };
    } else if (html) current.parts.push(html);
  });
  sections.push(current);
  const [intro, ...rest] = sections;

  const tracked = totals.done + totals.doing + totals.todo > 0;
  const h2s = blocks.filter((b) => b.type === 'h' && b.level === 2);
  const all = totals.done + totals.doing + totals.todo || 1;
  const pct = Math.round((totals.done / all) * 100);
  const date = generated.toISOString().slice(0, 10);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title.includes('Lockwords') ? title : `Lockwords ${title}`)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Mona+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--canvas:#f6f8fa;--surface:#fff;--chip:#eff2f5;--line:#d1d9e0;--text:#1f2328;--text2:#3d444d;--muted:#59636e;--green:#1f883d;--green-text:#116329;--green-bg:#dafbe1;--amber:#9a6700;--amber-bg:#fff8c5;--s1:#aceebb;--s3:#4ac26b}
@media (prefers-color-scheme:dark){:root{--canvas:#0d1117;--surface:#151b23;--chip:#212830;--line:#3d444d;--text:#f0f6fc;--text2:#d1d7e0;--muted:#9198a1;--green:#238636;--green-text:#3fb950;--green-bg:#12261e;--amber:#d29922;--amber-bg:#272115;--s1:#033a16;--s3:#196c2e}}
*{box-sizing:border-box}
body{margin:0;background:var(--canvas);color:var(--text);font:400 15px/1.55 "Mona Sans",system-ui,-apple-system,sans-serif}
.wrap{max-width:960px;margin:0 auto;padding:40px 20px 80px}
.mono,.num,.label,.counts,.pill,.meta{font-family:ui-monospace,"SF Mono",Menlo,monospace}
.hero{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-end;justify-content:space-between;margin-bottom:24px}
.hero h1{font-size:34px;line-height:1.15;font-weight:600;margin:6px 0 0;letter-spacing:-.01em}
.eyebrow{font:500 12px/16px ui-monospace,"SF Mono",Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--green-text)}
.score{text-align:right}.score b{display:block;font-size:44px;line-height:1;font-weight:600}
.score span{color:var(--muted);font-size:13px}
.lead{color:var(--text2);margin:8px 0}
section{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:20px;margin-top:20px}
section.intro{background:none;border:none;padding:0;margin:0}
h2{font-size:20px;font-weight:600;margin:0 0 12px}
h3{font-size:17px;font-weight:600;margin:0;flex:1}
section>h3{margin:20px 0 6px}
section>p{color:var(--text2);margin:8px 0}
.toc{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0 4px}.toc a{background:var(--surface);border:1px solid var(--line);border-radius:99px;padding:4px 12px;font-size:13px;color:var(--text2);text-decoration:none}.toc a:hover{border-color:var(--green);color:var(--green-text)}
.scroll{overflow-x:auto;margin:8px 0}
td{overflow-wrap:anywhere}
th{font-weight:600;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
ul ul{margin-top:4px}
.bar{height:8px;border-radius:99px;background:var(--chip);overflow:hidden;display:flex;margin:4px 0 6px}
.bar .done{background:var(--green)}.bar .doing{background:var(--amber)}
.counts{font-size:12px;color:var(--muted);margin:0 0 14px}
.cards{display:grid;gap:10px}
.card{border:1px solid var(--line);border-left:4px solid var(--line);border-radius:12px;padding:14px 16px;background:var(--surface)}
.card.done{border-left-color:var(--green)}.card.doing{border-left-color:var(--amber)}
.card header{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.num{min-width:32px;height:28px;padding:0 8px;border-radius:6px;background:var(--chip);display:grid;place-items:center;font-size:12px;color:var(--muted)}
.status{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.pill{display:inline-flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:99px;background:var(--chip);color:var(--muted);white-space:nowrap}
.pill i{width:8px;height:8px;border-radius:2px;background:var(--line)}
.pill.done{background:var(--green-bg);color:var(--green-text)}.pill.done i{background:var(--green)}
.pill.doing{background:var(--amber-bg);color:var(--amber)}.pill.doing i{background:var(--amber)}
.note{font-size:13px;color:var(--muted)}
.field{margin-top:10px;padding-left:44px}
.label{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.field p{margin:0;color:var(--text2)}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{background:var(--chip);border-radius:6px;padding:3px 8px;font-size:13px;color:var(--text2)}
code{font:12.5px ui-monospace,"SF Mono",Menlo,monospace;background:var(--chip);padding:1px 5px;border-radius:5px;color:var(--text)}
.chip code{background:none;padding:0;font-weight:600}
del{color:var(--muted)}
ol,ul{margin:0;padding-left:22px}li{margin:6px 0;color:var(--text2)}li::marker{color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px;border-bottom:1px solid var(--line)}
a{color:var(--green-text)}
.meta{margin-top:28px;font-size:12px;color:var(--muted);text-align:center}
@media (max-width:600px){.field{padding-left:0}.hero h1{font-size:28px}.score{text-align:left}}
</style>
</head>
<body><div class="wrap">
<div class="hero">
  <div><div class="eyebrow">Lockwords · v1</div><h1>${inline(title)}</h1></div>
  ${tracked ? `<div class="score"><b>${pct}%</b><span>${totals.done} done · ${totals.doing} in progress · ${totals.todo} not started</span></div>` : ''}
</div>
<section class="intro">${intro.parts.join('\n')}</section>
${toc ? `<nav class="toc">${h2s.map((h) => `<a href="#${slug(h.text)}">${inline(h.text)}</a>`).join('')}</nav>` : ''}
${rest.map((s) => `<section>${s.head}\n${s.parts.join('\n')}</section>`).join('\n')}
<p class="meta">Made from ${source} on ${date}. Do not edit this page: edit ${source}.</p>
</div></body></html>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  for (const [name, opts] of [['roadmap', {}], ['product', { toc: true }]]) {
    const source = `docs/${name}.md`;
    writeFileSync(join(root, `docs/${name}.html`), render(readFileSync(join(root, source), 'utf8'), { source, ...opts }));
    console.log(`docs/${name}.html updated`);
  }
}
