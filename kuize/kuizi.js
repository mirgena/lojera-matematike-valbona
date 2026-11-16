'use strict';
const $ = id => document.getElementById(id);
const normalized = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.!?]+$/,'').trim().replace(/\s+/g,' ');
function parseTopic(s) {
  const m = /^(mbledhje|mbledhja|zbritje|zbritja|krahasim|krahasimi)(?: (?:i numrave|me numra))?(?: deri(?: ne)? (\d{1,3}))?$/.exec(normalized(s));
  if (!m) return null;
  const cap = Number(m[2] || 20);
  if (cap < 5 || cap > 100) return null;
  return {kind:m[1].startsWith('mbledh')?'add':m[1].startsWith('zbrit')?'sub':'compare',cap};
}
function shuffle(array, random=Math.random) {
  for(let i=array.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[array[i],array[j]]=[array[j],array[i]];}
  return array;
}
function makeQuestions({kind,cap}, count, random=Math.random) {
  const pool=[];
  const same=[];
  for(let a=0;a<=cap;a++) for(let b=0;b<=cap;b++){
    if(kind==='add' && (b<a || a+b>cap)) continue;
    if(kind==='sub' && b>a) continue;
    if(kind==='compare' && a===b) same.push([a,b]);
    else pool.push([a,b]);
  }
  const pairs=kind==='compare' ? shuffle([...shuffle(same,random).slice(0,Math.floor(count/3)),...shuffle(pool,random).slice(0,count-Math.floor(count/3))],random):shuffle(pool,random).slice(0,count);
  return pairs.map(([a,b])=>{
    const compare=kind==='compare';
    const answer=compare?(a===b?'=':a<b?'<':'>'):String(kind==='add'?a+b:a-b);
    const prompt=compare?`Cila shenjë mungon? ${a} □ ${b}`:`Sa bëjnë ${a} ${kind==='add'?'+':'−'} ${b}?`;
    const n=Number(answer);
    const distractors=compare?['<','=','>'].filter(x=>x!==answer):shuffle([-3,-2,-1,1,2,3].map(d=>n+d).filter(x=>x>=0&&x<=cap),random).slice(0,2).map(String);
    const options=shuffle([answer,...distractors],random);
    return {prompt,options,correct:options.indexOf(answer)};
  });
}
let quiz=[], idx=0, selected=-1, attempts=[];
const create=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
function show(screen, focus) {
  for(const id of ['make','review','play','end']) $(id).hidden=screen==='review'?!['make','review'].includes(id):id!==screen;
  if(focus) $(focus).focus();
}
for (const b of $('examples').querySelectorAll('button')) b.onclick=()=>{$('topic').value=b.textContent;$('topic').focus();};
$('generate').onsubmit=e=>{
  e.preventDefault();
  const spec=parseTopic($('topic').value);
  if(!spec){$('feedback').textContent='Provo me mbledhje, zbritje ose krahasim. Shembull: «Zbritja deri në 30». Zgjidh një kufi nga 5 deri në 100.';return;}
  $('feedback').textContent='';$('editError').textContent='';
  const previous=JSON.stringify(quiz.map(q=>q.prompt));
  for(let i=0;i<4;i++){quiz=makeQuestions(spec,Number($('amount').value));if(JSON.stringify(quiz.map(q=>q.prompt))!==previous)break;}
  $('editors').replaceChildren(...quiz.map((q,i)=>{
    const field=create('fieldset');field.className='editor';field.append(create('legend','Pyetja '+(i+1)));
    const input=(label,value,max)=>{
      const l=create('label',label), el=create('input');el.required=true;el.maxLength=max;el.value=value;l.append(el);return l;
    };
    field.append(input('Teksti i pyetjes',q.prompt,200));
    const row=create('div');row.className='edit-options';row.append(...q.options.map((x,j)=>input('Alternativa '+(j+1),x,80)));field.append(row);
    const label=create('label','Përgjigjja e saktë'), select=create('select');
    q.options.forEach((_,j)=>{const o=create('option','Alternativa '+(j+1));o.value=j;select.append(o);});select.value=q.correct;label.append(select);field.append(label);
    return field;
  }));
  show('review','reviewTitle');
};
$('confirm').onsubmit=e=>{
  e.preventDefault();
  const revised=[...$('editors').children].map(el=>{
    const [prompt,...options]=[...el.querySelectorAll('input')].map(i=>i.value.trim());
    return {prompt,options,correct:Number(el.querySelector('select').value)};
  });
  const bad=revised.findIndex(q=>!q.prompt||q.options.some(x=>!x)||new Set(q.options.map(normalized)).size!==3);
  if(bad>=0){$('editError').textContent='Te pyetja '+(bad+1)+' shkruaj një pyetje dhe tri alternativa të ndryshme.';return;}
  $('editError').textContent=''; quiz=revised;start();
};
function start(){idx=0;attempts=[];show('play');render();}
function render(){
  selected=-1;$('progress').textContent='PYETJA '+(idx+1)+' NGA '+quiz.length;
  const q=quiz[idx];$('question').textContent=q.prompt;
  $('next').textContent=idx===quiz.length-1?'Shiko rezultatin →':'Vazhdo →';$('next').disabled=true;
  const buttons=q.options.map((text,i)=>{
    const b=create('button',text);b.setAttribute('aria-pressed','false');
    b.onclick=()=>{selected=i;buttons.forEach((button,j)=>button.setAttribute('aria-pressed',String(i===j)));$('next').disabled=false;};return b;
  });
  $('choices').replaceChildren(...buttons);$('question').focus();
}
$('next').onclick=()=>{
  if(selected<0||idx>=quiz.length)return;
  attempts.push(selected);idx++;if(idx<quiz.length){render();return;}
  selected=-1;
  const points=quiz.filter((q,i)=>q.correct===attempts[i]).length;
  $('score').textContent=points+' nga '+quiz.length+' përgjigje të sakta';
  $('results').replaceChildren(...quiz.map((q,i)=>{
    const item=create('li');item.append(create('strong',q.prompt));
    item.append(create('div',q.correct===attempts[i]?'✓ Saktë: '+q.options[q.correct]:'Përgjigjja jote: '+q.options[attempts[i]]+' · E sakta: '+q.options[q.correct]));return item;
  }));
  show('end','finish');
};
$('returnEdit').onclick=()=>show('review','reviewTitle');
$('again').onclick=start;
$('new').onclick=()=>show('make','topic');
