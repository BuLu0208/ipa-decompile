const fs = require('fs');
const path = 'C:\\Users\\Administrator\\.openclaw-autoclaw\\workspace\\逆向对比\\decompile-workflow';

function parseFunctions(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const funcs = {};
  const parts = text.split(/(?=\/\/ === )/);
  for (const p of parts) {
    const m = p.match(/^\/\/ === (.+?) @ ([0-9a-f]+) ===/);
    if (m) funcs[m[1]] = p.trim();
  }
  return funcs;
}

const orig = parseFunctions(path + '/original/TrollInstallerX_original_decompiled.c');
const mod = parseFunctions(path + '/modified/TrollInstallerX_modified_decompiled.c');

// Keywords to find important functions
const keywords = ['kernelcache','firmware','download','grab_kernel','install','partialZip','bestLink','appledb','source','_fetch','credit','Credit','kext','kernel','patch','boot','jailbreak','exploit','pwn','trollstore','tar','version','build','device','model','board','chip','ota','update','restore','ipsw','dfu','recovery','ssh','server','url','request','api','mirror','proxy','cache','decompress','extract','xz','partial'];
const skipPrefixes = ['$','_swift','accessibility','descriptor','witness','__ block_','metadata','_Tt'];

function isImportant(name) {
  for (const p of skipPrefixes) { if (name.startsWith(p)) return false; }
  if (name.length < 4) return false;
  for (const kw of keywords) {
    if (name.toLowerCase().includes(kw.toLowerCase())) return true;
  }
  return false;
}

function hasSubstantialCode(funcText) {
  if (!funcText) return false;
  const codeLines = funcText.split('\n').filter(l => !l.trim().startsWith('//') && l.trim().length > 0);
  return codeLines.length > 5;
}

// Collect important functions
const important = new Set();
for (const name of Object.keys(mod)) {
  if (isImportant(name) && hasSubstantialCode(mod[name])) important.add(name);
}
for (const name of Object.keys(orig)) {
  if (isImportant(name) && hasSubstantialCode(orig[name]) && !mod[name]) important.add(name);
}

// Get function body (skip the header comment)
function getBody(funcText) {
  if (!funcText) return '';
  const lines = funcText.split('\n');
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\w/) || lines[i].match(/^\//)) { start = i; break; }
  }
  return lines.slice(start).join('\n').trim();
}

function escapeH(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function safeId(name) {
  return name.replace(/[^a-zA-Z0-9_$]/g, '_');
}

// Build HTML
const sorted = [...important].sort();
const newCount = [...important].filter(n => !orig[n]).length;
const removedCount = [...important].filter(n => !mod[n]).length;
const bothCount = [...important].filter(n => orig[n] && mod[n]).length;

let html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>TrollInstallerX 原版 vs 修改版</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace; background: #1a1a2e; color: #e0e0e0; }
  .header { background: #16213e; padding: 20px; text-align: center; border-bottom: 2px solid #0f3460; }
  .header h1 { color: #e94560; font-size: 24px; }
  .header p { color: #888; margin-top: 8px; font-size: 13px; }
  .stats { display: flex; justify-content: center; gap: 30px; margin-top: 14px; }
  .stat { text-align: center; }
  .stat-num { font-size: 28px; font-weight: bold; }
  .stat-label { font-size: 11px; color: #888; }
  .nav { background: #16213e; padding: 10px 20px; display: flex; flex-wrap: wrap; gap: 6px; border-bottom: 1px solid #0f3460; position: sticky; top: 0; z-index: 100; max-height: 150px; overflow-y: auto; }
  .nav a { color: #53a8b6; text-decoration: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; background: #0f3460; transition: background 0.2s; }
  .nav a:hover { background: #e94560; color: #fff; }
  .nav a.new-func { border: 1px solid #4ecca3; }
  .nav a.removed-func { border: 1px solid #e94560; text-decoration: line-through; opacity: 0.7; }
  .nav a.changed-func { border: 1px solid #f7d060; }
  .section { margin: 16px; border: 1px solid #0f3460; border-radius: 8px; overflow: hidden; }
  .section-header { background: #16213e; padding: 10px 16px; font-size: 13px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
  .section-header .func-name { color: #f7d060; font-weight: bold; }
  .badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; }
  .badge-new { background: #4ecca3; color: #000; }
  .badge-removed { background: #e94560; color: #fff; }
  .badge-changed { background: #f7d060; color: #000; }
  .badge-unchanged { background: #555; color: #aaa; }
  .diff-container { display: flex; }
  .diff-panel { flex: 1; min-width: 0; overflow-x: auto; }
  .diff-panel pre { padding: 12px; font-size: 11.5px; line-height: 1.5; white-space: pre; margin: 0; }
  .diff-left { background: #1a1a2e; border-right: 2px solid #0f3460; }
  .diff-right { background: #1a1a2e; }
  .panel-label { background: #0f3460; color: #888; padding: 5px 12px; font-size: 11px; }
  .not-found { padding: 20px; text-align: center; color: #e94560; font-style: italic; }
</style></head><body>
<div class="header">
  <h1>TrollInstallerX 逆向对比</h1>
  <p>原版 (1617 functions) vs 修改版 (1436 functions) — Ghidra 反编译代码左右对比</p>
  <div class="stats">
    <div class="stat"><div class="stat-num" style="color:#4ecca3">${newCount}</div><div class="stat-label">新增函数</div></div>
    <div class="stat"><div class="stat-num" style="color:#e94560">${removedCount}</div><div class="stat-label">删除函数</div></div>
    <div class="stat"><div class="stat-num" style="color:#f7d060">${bothCount}</div><div class="stat-label">两版共有</div></div>
  </div>
</div>
<div class="nav">
`;

for (const name of sorted) {
  const isNew = !orig[name], isRemoved = !mod[name];
  const cls = isNew ? 'new-func' : isRemoved ? 'removed-func' : 'changed-func';
  const prefix = isNew ? '🟢 ' : isRemoved ? '🔴 ' : '🟡 ';
  html += `<a class="${cls}" href="#fn-${safeId(name)}">${prefix}${escapeH(name)}</a>\n`;
}

html += `</div>\n`;

for (const name of sorted) {
  const origBody = orig[name] ? getBody(orig[name]) : '';
  const modBody = mod[name] ? getBody(mod[name]) : '';
  const isNew = !orig[name], isRemoved = !mod[name];
  const isChanged = origBody && modBody && origBody !== modBody;
  const isUnchanged = origBody && modBody && origBody === modBody;

  let badge = '';
  if (isNew) badge = '<span class="badge badge-new">新增</span>';
  else if (isRemoved) badge = '<span class="badge badge-removed">已删除</span>';
  else if (isChanged) badge = '<span class="badge badge-changed">有改动</span>';
  else badge = '<span class="badge badge-unchanged">无变化</span>';

  const origAddr = orig[name]?.match(/@ ([0-9a-f]+)/)?.[1] || '';
  const modAddr = mod[name]?.match(/@ ([0-9a-f]+)/)?.[1] || '';
  const addrInfo = (origAddr ? '原版:0x'+origAddr : '') + ' ' + (modAddr ? '修改版:0x'+modAddr : '');

  html += `<div class="section" id="fn-${safeId(name)}">
  <div class="section-header"><span class="func-name">${escapeH(name)}</span><span>${badge} ${addrInfo}</span></div>
  <div class="diff-container">
    <div class="diff-panel diff-left">
      <div class="panel-label">原版</div>
      ${origBody ? '<pre>'+escapeH(origBody)+'</pre>' : '<div class="not-found">此函数在原版中不存在</div>'}
    </div>
    <div class="diff-panel diff-right">
      <div class="panel-label">修改版</div>
      ${modBody ? '<pre>'+escapeH(modBody)+'</pre>' : '<div class="not-found">此函数在修改版中不存在</div>'}
    </div>
  </div></div>\n`;
}

html += '</body></html>';

fs.writeFileSync(path + '/对比页面.html', html, 'utf8');
console.log('Done! Total important functions:', sorted.length);
console.log('New:', newCount, 'Removed:', removedCount, 'Both:', bothCount);
