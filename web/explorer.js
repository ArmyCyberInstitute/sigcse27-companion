import {SlideSync} from './slide-sync.js';
const $ = (s, root=document) => root.querySelector(s);
const el = (tag, cls, text) => { const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n; };
let catalog;
const state={thread:'',microlab:'',kind:'lessons',family:'',selected:[],artifacts:{},sourceMode:false,waypoint:'',notes:false,focus:false,sync:true,slide:''};
let generation=0;
const slideSync = new SlideSync({
  onPosition: key => {state.slide=key;state.waypoint='';$('#waypoint').value='';save();},
  preferredKeys: () => selectedArtifact('final')?.sync_keys || [],
  variants: stage => versions()[stage] || [],
  onRelated: (stage, artifact) => {
    const old=$('.preview-card[data-stage="'+stage+'"]');if(!old)return;
    slideSync.detach(stage);state.artifacts[stage]=artifact.id;save();old.replaceWith(makeCard(stage));
  }
});
const stages=()=>catalog.stages;
const additionalActivity=()=>catalog.additional_microlabs?.find(activity=>activity.id===state.microlab);
function topic(){
  const activity=additionalActivity();
  if(activity)return {id:activity.id,group:'Highlighted microlabs',title:activity.title,
    lessons:{final:[]},microlabs:{[activity.id]:activity},labs:[]};
  return catalog.threads.find(t=>t.id===state.thread);
}
function versions(){return state.kind==='microlabs' ? (topic().microlabs[state.family]?.versions || {}) : topic().lessons;}
function available(){return stages().filter(s=>versions()[s.id]?.length).map(s=>s.id);}
function defaults(){const a=available();return a.length>1?[a[0],a.at(-1)]:a;}
function selectedArtifact(stage){const a=versions()[stage]||[];return a.find(x=>x.id===state.artifacts[stage])||a[0];}
function normalize(){
  if(additionalActivity()){
    state.thread='';state.kind='microlabs';state.family=state.microlab;state.sourceMode=false;state.slide='';state.waypoint='';
  }else{
    state.microlab='';
  if(!catalog.threads.some(t=>t.id===state.thread)){state.thread='';state.selected=[];return;}
  }
  if(!['lessons','microlabs','labs'].includes(state.kind))state.kind='lessons';
  if(state.kind!=='lessons'||!topic().source_pair)state.sourceMode=false;
  if(state.sourceMode)for(const [stage,id] of Object.entries(topic().source_pair))state.artifacts[stage]||=id;
  const families=Object.keys(topic().microlabs);
  if(!families.includes(state.family))state.family=families[0]||'';
  state.selected=stages().map(s=>s.id).filter(s=>state.selected.includes(s)&&available().includes(s));
  if(!state.selected.length)state.selected=defaults();
  if(state.slide&&!topic().lessons.final.some(a=>a.sync_keys?.includes(state.slide)))state.slide='';
}
function save(){
  if(!topic()){history.replaceState(null,'',location.pathname);return;}
  const q=new URLSearchParams(state.microlab?{microlab:state.microlab}:{thread:state.thread,kind:state.kind});
  if(state.family&&state.kind==='microlabs'&&!state.microlab)q.set('activity',state.family);
  if(state.selected.length)q.set('stages',state.selected.join(','));
  if(state.waypoint)q.set('point',state.waypoint);
  if(!state.sync)q.set('sync','0');
  if(state.slide)q.set('slide',state.slide);
  if(state.sourceMode)q.set('sources','1');
  if(state.focus)q.set('view','single');
  for(const [stage,id] of Object.entries(state.artifacts))if(versions()[stage]?.some(a=>a.id===id))q.set('artifact-'+stage,id);
  history.replaceState(null,'','?'+q);
}
function read(){const q=new URLSearchParams(location.search);state.sync=q.get('sync')!=='0';state.slide=q.get('slide')||'';state.thread=q.get('thread')||'';state.microlab=q.get('microlab')||'';state.kind=q.get('kind')||'lessons';state.family=q.get('activity')||'';state.focus=q.get('view')==='single';state.selected=(q.get('stages')||'').split(',');state.waypoint=q.get('point')||'';state.sourceMode=q.get('sources')==='1';state.artifacts={};for(const s of catalog.stages)if(q.has('artifact-'+s.id))state.artifacts[s.id]=q.get('artifact-'+s.id);normalize();}
function change(fn){fn();normalize();save();render();}
function switchKind(kind){change(()=>{state.kind=kind;state.focus=false;state.sourceMode=false;state.selected=[];state.artifacts={};state.waypoint='';state.slide='';});}
function renderNav(){
  document.querySelectorAll('.thread-select').forEach(select=>{
    const placeholder=el('option','','Choose a thread…');placeholder.value='';
    select.replaceChildren(placeholder);
    let group;
    for(const thread of catalog.threads){
      if(!group||group.label!==thread.group){group=el('optgroup');group.label=thread.group;select.append(group);}
      const option=el('option','',thread.title);option.value=thread.id;group.append(option);
    }
    if(select.id==='thread-switch'&&catalog.additional_microlabs?.length){
      const extras=el('optgroup');extras.label='Highlighted microlabs';
      for(const activity of catalog.additional_microlabs){const option=el('option','',activity.title);option.value='microlab:'+activity.id;extras.append(option);}
      select.append(extras);
    }
    select.value=state.microlab&&select.id==='thread-switch'?'microlab:'+state.microlab:state.thread;
    select.onchange=()=>change(()=>{
      const wasAdditional=Boolean(state.microlab);
      state.microlab=select.value.startsWith('microlab:')?select.value.slice(9):'';
      state.thread=state.microlab?'':select.value;
      if(state.microlab)state.kind='microlabs';else if(wasAdditional)state.kind='lessons';
      state.focus=false;state.sourceMode=false;state.selected=[];state.artifacts={};state.family='';state.waypoint='';state.slide='';$('#reader-options').open=false;
    });
  });
}

function renderGallery(){
  const activities=catalog.additional_microlabs||[];
  $('#additional-microlabs').hidden=!activities.length;
  $('#microlab-gallery').replaceChildren(...activities.map(activity=>{
    const card=el('article','microlab-card');
    const heading=el('h3');const link=el('a','',activity.title);link.href='?microlab='+encodeURIComponent(activity.id);heading.append(link);
    card.append(heading,el('p','',activity.description));return card;
  }));
}

function render(){
  generation++;slideSync.clear();renderNav();renderGallery();
  const chosen=Boolean(topic());
  document.body.classList.toggle('reading',chosen);$('#welcome').hidden=chosen;$('#workspace').hidden=!chosen;
  if(!chosen){$('#previews').replaceChildren();$('#related').replaceChildren();document.title='Choose a thread · Curriculum in progress';return;}
  $('#kinds').hidden=Boolean(additionalActivity());
  slideSync.reset({enabled:state.sync&&state.kind==='lessons'&&!state.sourceMode,key:state.slide,allowedKeys:topic().lessons.final.flatMap(a=>a.sync_keys||[]),preferredStage:state.selected.find(s=>s==='final'&&selectedArtifact(s)?.format==='Quarto')||state.selected.find(s=>selectedArtifact(s)?.format==='Quarto')});
  $('#slide-sync').hidden=state.kind!=='lessons';$('#slide-sync').disabled=state.sourceMode;$('#slide-sync').setAttribute('aria-pressed',String(state.sync));$('#slide-sync').textContent='Slide sync '+(state.sync?'on':'off');
  $('#formats').hidden=state.kind!=='lessons'||!topic().source_pair;$('#formats').setAttribute('aria-pressed',String(state.sourceMode));
  $('#topic-group').textContent=topic().group;$('#topic-title').textContent=topic().title;
  document.title=topic().title+' · Curriculum in progress';
  document.querySelectorAll('[data-kind]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.kind===state.kind));b.tabIndex=b.dataset.kind===state.kind?0:-1;});
  $('#micro-count').textContent=Object.keys(topic().microlabs).length||'—';$('#lab-count').textContent=topic().labs.length;
  $('#family-control').hidden=state.kind!=='microlabs'||Object.keys(topic().microlabs).length<2;
  $('#family').replaceChildren(...Object.entries(topic().microlabs).map(([id,f])=>{const o=el('option','',f.title);o.value=id;o.selected=id===state.family;return o;}));
  $('#history').hidden=state.kind==='labs';$('#previews').replaceChildren();$('#related').replaceChildren();$('#status').textContent='';
  $('.layout-controls').hidden=state.kind==='labs';$('#previews').hidden=state.kind==='labs';$('#related').hidden=state.kind!=='labs';
  if(state.kind==='labs'){renderLabs(true);return;}
  $('#timeline').style.setProperty('--stage-count',Math.max(1,available().length));
  $('#timeline').replaceChildren(...stages().filter(s=>versions()[s.id]?.length).map((s,i)=>{
    const items=versions()[s.id]||[];const b=el('button','stage');b.type='button';b.disabled=!items.length;b.setAttribute('aria-pressed',String(state.selected.includes(s.id)));b.setAttribute('aria-label',s.title+(items.length?' — toggle preview':' — no artifact available'));
    b.append(el('span','step','0'+(i+1)),el('strong','',s.title),el('small','',items.length?(items.length===1?'1 artifact':items.length+' related lessons'):'No artifact available'));
    if(items[0]?.also_in?.length)b.append(el('small','same-version','Also '+items[0].also_in.map(id=>stages().find(x=>x.id===id).title.toLowerCase()).join(', ')));
    if(state.selected.includes(s.id))b.append(el('span','selected-mark','●'));
    b.onclick=()=>change(()=>{$('#reader-options').open=false;state.selected=state.focus?[s.id]:state.selected.includes(s.id)?(state.selected.length>1?state.selected.filter(x=>x!==s.id):state.selected):[...state.selected,s.id];});return b;
  }));
  const count=state.selected.length;$('#selection-description').textContent=count?`${count} ${count===1?'version':'versions'} selected`:'No microlabs for this topic';
  $('#single').setAttribute('aria-pressed',String(count===1));$('#pair').setAttribute('aria-pressed',String(count===2&&JSON.stringify(state.selected)===JSON.stringify(defaults())));$('#all').setAttribute('aria-pressed',String(count>2&&count===available().length));
  for(const id of ['single','pair','all'])$('#'+id).disabled=!available().length;
  $('#notes-control').hidden=state.kind!=='lessons';$('#waypoint').closest('label').hidden=state.kind!=='lessons';$('#waypoint').disabled=state.kind!=='lessons';$('#notes').checked=state.notes;
  $('#waypoint').value=state.waypoint;
  const grid=$('#previews');grid.className='preview-grid'+(count===1?' single':count>2?' many':'');
  if(!count){const empty=el('div','empty');empty.append(el('h3','','No microlabs for this topic'));grid.append(empty);}
  state.selected.forEach(s=>grid.append(makeCard(s)));

}
function jump(frame,id){
  try{const win=frame.contentWindow;const node=win.document.getElementById(id);if(!node)return false;const reveal=win.Reveal;if(reveal?.isReady?.()){const indices=reveal.getIndices(node);reveal.slide(indices.h,indices.v);return true;}win.location.hash='/'+id;return true;}catch{return false;}
}
function applyPoint(frame,select,note){
  const point=catalog.waypoints.find(w=>w.id===state.waypoint);if(!point)return;
  const option=[...select.options].find(o=>o.value&&new RegExp(point.pattern,'i').test(o.textContent));
  if(option){select.value=option.value;jump(frame,option.value);note.textContent='Comparison point: '+option.textContent;}
  else note.textContent='No section matches this comparison point.';
}
function attachSections(frame,select,note){
  try{
    const sections=[...frame.contentDocument.querySelectorAll('.slides section[id]')].filter(s=>s.querySelector(':scope > h1,:scope > h2,:scope > h3'));
    if(!sections.length){select.hidden=true;return;}
    select.hidden=false;select.replaceChildren(...sections.map(s=>{const o=el('option','',s.querySelector('h1,h2,h3').textContent);o.value=s.id;return o;}));select.onchange=()=>{jump(frame,select.value);note.textContent='Section: '+select.selectedOptions[0].textContent;};
    if(frame.contentWindow.Reveal?.configure)frame.contentWindow.Reveal.configure({showNotes:state.notes});
    if(!state.slide)applyPoint(frame,select,note);
  }catch{note.textContent='Section navigation unavailable.';}
}
function makeCard(stage){
  const artifact=selectedArtifact(stage);
  const sourceOnly=artifact.format==='Beamer';
  const card=el('article','preview-card');card.dataset.stage=stage;
  const header=el('header');const heading=el('div');
  const stageTitle=stages().find(s=>s.id===stage).title;
  const badge=el('span','sync-badge');badge.hidden=true;badge.setAttribute('role','status');
  heading.append(el('span','card-stage',stageTitle+(state.sourceMode?' · '+artifact.format:'')),el('p','card-title',artifact.title));
  const tools=el('div','card-tools');
  const details=el('details','card-options');details.append(el('summary','','Details'));
  const panel=el('div','card-panel');details.append(panel);
  const source=el('button','','Source');source.type='button';
  const focus=el('button','','Focus');focus.type='button';focus.onclick=()=>change(()=>{state.focus=true;state.selected=[stage];});
  const open=el('a','','Open ↗');open.href=artifact.url;open.target='_blank';open.rel='noopener';
  tools.append(source,focus,open,details);header.append(heading,tools);card.append(header,badge);
  if(versions()[stage].length>1){
    const select=el('select','artifact-select');select.setAttribute('aria-label','Related lesson in '+stage);
    select.append(...versions()[stage].map(a=>{const o=el('option','',a.title+(a.format==='Beamer'?' (Beamer)':''));o.value=a.id;o.selected=a.id===artifact.id;return o;}));
    select.onchange=()=>change(()=>{state.artifacts[stage]=select.value;state.slide='';state.waypoint='';});panel.append(select);
  }
  panel.append(el('h3','artifact-title',artifact.title));
  const sections=el('select','section-select');sections.setAttribute('aria-label','Section in '+stageTitle);sections.hidden=true;panel.append(sections);
  const note=el('p','frame-status');panel.append(note);
  const files=artifact.source_files||[artifact.source];
  const picker=el('label','source-picker','File');
  const fileSelect=el('select','source-file-select');fileSelect.setAttribute('aria-label','Source file in '+stageTitle);
  fileSelect.append(...files.map(path=>{const o=el('option','',path.split('/').at(-1));o.value=path;return o;}));picker.append(fileSelect);picker.hidden=true;card.append(picker);
  let frame,pre,showingSource=false;const token=generation;
  async function showSource(){
    source.disabled=true;
    try{
      const response=await fetch('source/'+fileSelect.value);if(!response.ok)throw Error('Source unavailable');
      const text=await response.text();
      if(token!==generation||!card.isConnected)return;
      if(!pre){pre=el('pre');card.append(pre);}
      pre.textContent=text;pre.dataset.source=fileSelect.value;pre.hidden=false;
      if(frame)frame.hidden=true;slideSync.detach(stage);badge.hidden=true;
      sections.hidden=true;picker.hidden=files.length<2;showingSource=true;
      source.textContent=sourceOnly?'Source':'Preview';source.setAttribute('aria-pressed','true');note.textContent='';
    }catch{note.textContent='Source unavailable.';}
    finally{source.disabled=sourceOnly;}
  }
  function showPreview(){
    if(pre)pre.hidden=true;picker.hidden=true;showingSource=false;
    source.textContent='Source';source.setAttribute('aria-pressed','false');note.textContent='';
    if(frame){frame.hidden=false;sections.hidden=state.kind!=='lessons';register();return;}
    frame=el('iframe');frame.title=stageTitle+' — '+artifact.title;frame.src=artifact.url;frame.loading='lazy';frame.allowFullscreen=true;
    frame.onload=()=>{if(token!==generation||!card.isConnected)return;if(!register())slideSync.detach(stage);};card.append(frame);
    if(state.kind==='lessons'){
      let attempts=0;
      const timer=setInterval(()=>{
        if(token!==generation||!card.isConnected||++attempts>80){clearInterval(timer);return;}
        if(register())clearInterval(timer);
      },250);
    }
  }
  function register(){
    if(token!==generation||showingSource||!card.isConnected||state.kind!=='lessons')return false;
    try{
      const reveal=frame?.contentWindow.Reveal;if(!reveal?.isReady?.())return false;
      if(slideSync.entries.get(stage)?.reveal===reveal)return true;
      attachSections(frame,sections,note);
      slideSync.attach({stage,frame,reveal,select:sections,note,badge,card,artifact});return true;
    }catch{return false;}
  }
  source.onclick=()=>showingSource?showPreview():showSource();fileSelect.onchange=showSource;
  // Fetch after the card has been inserted into the comparison grid.
  if(state.sourceMode||sourceOnly)queueMicrotask(showSource);else showPreview();
  return card;
}
function renderLabs(full){
  const wrap=$('#related');wrap.append(el('h3','','Final labs'));
  const grid=el('div','lab-grid');for(const id of topic().labs){const lab=catalog.labs[id];const card=el('article','lab-card');card.append(el('h4','',lab.title),el('p','',lab.description));const launch=el('a','launch','Open lab ↗');launch.href=lab.url;launch.target='_blank';launch.rel='noopener';const guide=el('a','','Guide');guide.href=lab.guide_url;guide.target='_blank';guide.rel='noopener';const source=el('a','','Source');source.href='source/'+lab.guide;source.target='_blank';source.rel='noopener';const actions=el('div','lab-actions');actions.append(launch,guide,source);card.append(actions);
    if(full){const preview=el('button','','Preview here');preview.type='button';preview.onclick=()=>{const old=$('.lab-preview',wrap);if(old)old.remove();const box=el('div','lab-preview');const header=el('header');const close=el('button','','Close preview');close.onclick=()=>box.remove();header.append(el('strong','',lab.title),close);const frame=el('iframe');frame.src=lab.url;frame.title=lab.title+' — final example';box.append(header,frame);grid.append(box);box.scrollIntoView({block:'nearest',behavior:'smooth'});};actions.append(preview);}
    grid.append(card);
  }wrap.append(grid);
}
async function init(){
  try{const response=await fetch('web/catalog.json');if(!response.ok)throw Error('Catalog unavailable');catalog=await response.json();read();
    catalog.waypoints.forEach(w=>{const o=el('option','',w.title);o.value=w.id;$('#waypoint').append(o);});
    document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>switchKind(b.dataset.kind));
    $('#kinds').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...$('#kinds').querySelectorAll('button')];let i=tabs.indexOf(document.activeElement);i=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[i].click();tabs[i].focus();};
    $('#formats').onclick=()=>change(()=>{state.sourceMode=!state.sourceMode;state.focus=false;state.artifacts=state.sourceMode?{...topic().source_pair}:{};state.selected=defaults();$('#reader-options').open=false;});
    $('#family').onchange=()=>change(()=>{state.family=$('#family').value;state.focus=false;state.selected=[];state.artifacts={};});
    $('#single').onclick=()=>change(()=>{state.focus=true;state.selected=[state.selected.at(-1)||available().at(-1)];$('#reader-options').open=false;});$('#pair').onclick=()=>change(()=>{state.focus=false;state.selected=defaults();});$('#all').onclick=()=>change(()=>{state.focus=false;state.selected=available();});
    $('#waypoint').onchange=()=>{state.waypoint=$('#waypoint').value;save();
      const entries=[...slideSync.entries.values()];
      if(slideSync.enabled&&entries.length){
        const point=catalog.waypoints.find(w=>w.id===state.waypoint);
        if(point){const preferred=[...entries].sort((a,b)=>(b.stage==='final')-(a.stage==='final'));const driver=preferred.find(e=>[...e.select.options].some(o=>new RegExp(point.pattern,'i').test(o.textContent)));if(driver)applyPoint(driver.frame,driver.select,driver.note);}
      }else document.querySelectorAll('.preview-card').forEach(card=>{const frame=$('iframe',card);if(frame&&!frame.hidden)applyPoint(frame,$('.section-select',card),$('.frame-status',card));});
    };
    $('#slide-sync').onclick=()=>{state.sync=!state.sync;slideSync.setEnabled(state.sync&&!state.sourceMode);$('#slide-sync').setAttribute('aria-pressed',String(state.sync));$('#slide-sync').textContent='Slide sync '+(state.sync?'on':'off');$('#reader-options').open=false;save();};
    $('#notes').onchange=()=>{state.notes=$('#notes').checked;document.querySelectorAll('.preview-card iframe').forEach(f=>{try{f.contentWindow.Reveal?.configure({showNotes:state.notes});}catch{}});};
    $('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('#status').textContent='Link copied.';}catch{$('#status').textContent='Copy the address bar to share this comparison.';}};
    document.addEventListener('click',event=>{document.querySelectorAll('details[open]').forEach(d=>{if(!d.contains(event.target))d.open=false;});});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('details[open]').forEach(d=>d.open=false);});
    window.addEventListener('popstate',()=>{read();render();});save();render();
  }catch(error){$('#status').textContent='The collection could not be loaded. Open All artifacts to browse the source snapshots.';console.error(error);}
}
init();
