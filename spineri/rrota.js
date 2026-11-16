'use strict';
const $ = id => document.getElementById(id);
const samples = ['Sa bëjnë 8 + 7?', 'Sa bëjnë 20 − 6?', 'Cili numër vjen pas 29?', 'Sa dhjetëshe ka numri 45?', 'Thuaj një numër çift.', 'Vizato një trekëndësh.'];
const key = 'bota-matematikes-rrota-v1';
const colors = ['#ffd668','#a9dcfc','#f5add3','#b7e7ac','#c9bbfa','#ffb99a'];
const svg = $('wheel'), result = $('result'), draft = $('draft');
let tasks = samples.slice(), used = new Set(), angle = 0, busy = false, last = -1;
function valid(a) { return Array.isArray(a) && a.length >= 2 && a.length <= 16 && a.every(x => typeof x === 'string' && x.trim() && x.length <= 200); }
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved && valid(saved.tasks)) { tasks = saved.tasks; $('unique').checked = saved.unique !== false; }
} catch {}
const point = (radius, deg) => [200 + radius * Math.cos(deg * Math.PI / 180), 200 + radius * Math.sin(deg * Math.PI / 180)];
function elt(name, props, label) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k,v] of Object.entries(props)) e.setAttribute(k, v);
  if (label !== undefined) e.textContent = label;
  return e;
}
function draw() {
  const step = 360 / tasks.length;
  const parts = tasks.map((_, i) => {
    const mid = -90 + i * step, [x,y] = point(140, mid);
    const group = elt('g', {opacity: $('unique').checked && used.has(i) && last !== i ? .38 : 1});
    group.append(elt('path', {d: 'M200 200 L' + point(192, mid-step/2).join(' ') + ' A192 192 0 0 1 ' + point(192, mid+step/2).join(' ') + ' Z', fill: colors[i%colors.length], stroke:'#fff', 'stroke-width':3}), elt('text', {x,y,'text-anchor':'middle','dominant-baseline':'central','font-size':tasks.length>10?21:29,'font-weight':850,fill:'#20254e'}, i+1));
    return group;
  });
  svg.replaceChildren(...parts, elt('circle',{cx:200,cy:200,r:21,fill:'#262655',stroke:'#fff','stroke-width':4}));
}
function available() { return tasks.map((_,i) => i).filter(i => !$('unique').checked || !used.has(i)); }
function controls() {
  for (const id of ['unique','restart','save','example','load','download']) $(id).disabled = busy;
  $('spin').disabled = busy || !available().length;
  $('count').textContent = $('unique').checked ? available().length + ' nga ' + tasks.length + ' detyra të mbetura' : tasks.length + ' detyra në rrotë';
}
function render() {
  draw(); controls();
  $('list').replaceChildren(...tasks.map((task,i) => {
    const li = document.createElement('li'); li.textContent = task;
    if ($('unique').checked && used.has(i)) li.className = 'done';
    return li;
  }));
}
function reset() {
  used.clear(); last = -1; angle = 0; svg.style.transform = 'rotate(0deg)';
  result.textContent = 'Gati? Shtyp «Rrotullo».';
  render();
}
function persist() {
  try { localStorage.setItem(key, JSON.stringify({tasks, unique:$('unique').checked})); return true; } catch { return false; }
}
$('spin').onclick = async () => {
  const pool = available();
  if (busy || !pool.length) return;
  busy = true; controls();
  const i = pool[Math.floor(Math.random() * pool.length)];
  const target = (360 - i * 360/tasks.length) % 360;
  const next = angle + 4*360 + (target - angle%360 + 360)%360;
  result.textContent = 'Rrota po zgjedh një detyrë…';
  try {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && svg.animate) {
      await svg.animate([{transform:'rotate('+angle+'deg)'},{transform:'rotate('+next+'deg)'}],{duration:2300,easing:'cubic-bezier(.14,.72,.18,1)'}).finished;
    }
  } catch {}
  angle = next%360; svg.style.transform = 'rotate('+angle+'deg)';
  last = i; if ($('unique').checked) used.add(i);
  const task = document.createElement('strong'); task.textContent = tasks[i];
  result.replaceChildren(document.createTextNode('Detyra '+(i+1)), task);
  if (!available().length) {
    const message = document.createElement('div');
    message.textContent = 'I përfunduat të gjitha! Për një raund të ri, shtyp «Rifillo raundin».';
    result.append(message);
  }
  busy = false; render();
};
$('restart').onclick = reset;
$('unique').onchange = () => { reset(); if(!persist()) $('feedback').textContent = 'Ky shfletues nuk i mban ndryshimet pas mbylljes.'; };
$('save').onclick = () => {
  const next = [...new Set(draft.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];
  if (!valid(next)) { $('feedback').textContent = 'Shkruani 2–16 detyra të ndryshme, deri në 200 shenja për secilën.'; return; }
  tasks = next; draft.value = tasks.join('\n'); reset();
  $('feedback').textContent = persist() ? 'Detyrat u ruajtën në këtë shfletues.' : 'Detyrat janë gati për këtë lojë. Shkarkoni listën për ta ruajtur pas mbylljes.';
};
$('example').onclick = () => { draft.value=samples.join('\n'); $('feedback').textContent='Shembujt u vendosën në kuti. Shtyp «Ruaj detyrat» për t’i përdorur.'; };
$('download').onclick = () => {
  const url = URL.createObjectURL(new Blob([tasks.join('\n')+'\n'],{type:'text/plain;charset=utf-8'}));
  const a = document.createElement('a'); a.href=url; a.download='Detyrat_e_rrotes.txt'; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
};
$('load').onclick = () => $('file').click();
$('file').onchange = async () => {
  const input=$('file'), file=input.files[0]; input.value='';
  if (!file) return;
  try {
    if (file.size>32000) throw Error();
    draft.value=await file.text();
    $('feedback').textContent='Lista u hap në kuti. Shtyp «Ruaj detyrat» për ta përdorur.';
  } catch { $('feedback').textContent='Lista nuk u hap. Provo me një skedar të vogël .txt.'; }
};
$('full').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { $('full').textContent='Përdor F11 në laptop'; }
};
draft.value=tasks.join('\n'); reset();
