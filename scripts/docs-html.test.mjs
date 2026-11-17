import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inline, parse, statusOf, render } from './docs-html.mjs';

test('inline: code, bold, strike, links, and escapes HTML', () => {
  assert.equal(inline('**a** `<b>` ~~c~~ [d](https://x.y)'), '<strong>a</strong> <code>&lt;b&gt;</code> <del>c</del> <a href="https://x.y">d</a>');
  assert.equal(inline('`**not bold**`'), '<code>**not bold**</code>');
});

test('parse: headings, tables (separator dropped), lists, paragraphs', () => {
  const b = parse('# T\n\nHello\nworld\n\n| # | Epic | Status |\n|---|---|---|\n| 1 | A | ✅ |\n\n1. one\n2. two\n');
  assert.deepEqual(b.map((x) => x.type), ['h', 'p', 'table', 'list']);
  assert.equal(b[1].text, 'Hello world');
  assert.deepEqual(b[2].rows, [['1', 'A', '✅']]);
  assert.deepEqual(b[3].items, ['one', 'two']);
});

test('statusOf: reads the emoji and keeps the note', () => {
  assert.deepEqual(statusOf('✅ 2026-11-16'), { key: 'done', label: 'Done', note: '2026-11-16' });
  assert.equal(statusOf('🟨 hooks written').key, 'doing');
  assert.equal(statusOf('nothing'), null);
});

test('render: counts statuses across tables', () => {
  const md = '# R\n\n## P\n\n| # | Epic | Changes | Status |\n|---|---|---|---|\n| 1 | A | x · y | ✅ |\n| 2 | B | z | 🟨 |\n| 3 | C | z | ⬜ |\n| 4 | D | z | ⬜ |\n';
  const html = render(md, { generated: new Date('2026-11-16') });
  assert.match(html, /<b>25%<\/b>/);
  assert.match(html, /1 done · 1 in progress · 2 not started/);
  assert.match(html, /<span class="chip">x<\/span><span class="chip">y<\/span>/);
});

test('parse: nested list items and --- rules (product.md)', () => {
  const b = parse('- **Goals**\n  - D7\n  - Trial\n- Launch\n\n---\n\nText');
  assert.deepEqual(b.map((x) => x.type), ['list', 'p']);
  assert.deepEqual(b[0].items, ['**Goals**', 'Launch']);
  assert.deepEqual(b[0].subs[0], ['D7', 'Trial']);
});

test('render: no score without status tables, toc links to h2s', () => {
  const html = render('# Lockwords — Product\n\n## 1. Problem\n\nx\n', { source: 'docs/product.md', toc: true });
  assert.doesNotMatch(html, /class="score"/);
  assert.match(html, /<a href="#1-problem">1\. Problem<\/a>/);
  assert.match(html, /Made from docs\/product\.md/);
});
