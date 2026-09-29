const state = JSON.parse(localStorage.getItem('metaState') || '{}');
Object.assign(state, {
  name: state.name || 'Coder',
  level: state.level || 'beginner',
  xp: state.xp || 0,
  streak: state.streak || 1,
  completed: state.completed || [],
  grades: state.grades || [],
  progress: state.progress || {},
  avatar: state.avatar || '',
  language: state.language || 'English',
  reducedHints: state.reducedHints || false
});

const courses = {
  beginner: [
    {id:'html',icon:'<>',name:'HTML',desc:'Structure pages',file:'index.html',lessons:[
      {id:'html-1',title:'Build your first heading',prompt:'Create an <h1> heading that says Welcome to Meta and a paragraph below it.',requirements:['Use one <h1> element','The heading must say "Welcome to Meta"','Add at least one <p> paragraph'],starter:'<!doctype html>\n<html>\n  <body>\n    \n  </body>\n</html>',hint:'Start with <h1>Welcome to Meta</h1>, then add a <p> underneath.',check:c=>[/<h1[^>]*>\s*Welcome to Meta\s*<\/h1>/i.test(c),/<p[\s>]/i.test(c)]},
      {id:'html-2',title:'Make a navigation list',prompt:'Create an unordered list with links for Home, Learn, and Projects.',requirements:['Use <ul> and <li>','Include three links','Links should say Home, Learn, Projects'],starter:'<nav>\n  <!-- build your menu here -->\n</nav>',hint:'Use <ul>, put each <a> inside its own <li>.',check:c=>[/<ul[\s>]/i.test(c),(c.match(/<a[\s>]/gi)||[]).length>=3,/Home/i.test(c)&&/Learn/i.test(c)&&/Projects/i.test(c)]}
    ]},
    {id:'css',icon:'#',name:'CSS',desc:'Style interfaces',file:'styles.css',lessons:[
      {id:'css-1',title:'Style a card',prompt:'Give .card a dark background, rounded corners, and padding.',requirements:['Set background or background-color','Use border-radius','Add padding'],starter:'.card {\n  \n}',hint:'Try background: #111827; border-radius: 12px; padding: 16px;',check:c=>[/background(-color)?\s*:/i.test(c),/border-radius\s*:/i.test(c),/padding\s*:/i.test(c)]}
    ]},
    {id:'js',icon:'JS',name:'JavaScript',desc:'Add logic',file:'script.js',lessons:[
      {id:'js-1',title:'Create a greeting function',prompt:'Write a function named greet that accepts name and returns "Hello, " plus the name.',requirements:['Function is named greet','It accepts a name parameter','It returns a greeting'],starter:'function greet(name) {\n  \n}',hint:'Use return "Hello, " + name;',check:c=>[/function\s+greet\s*\(\s*name\s*\)/i.test(c),/return\s+['"`]Hello,\s*['"`]\s*\+\s*name/i.test(c)]}
    ]}
  ],
  intermediate: [
    {id:'react',icon:'⚛',name:'React',desc:'Build components',file:'App.jsx',lessons:[
      {id:'react-1',title:'Build a reusable button',prompt:'Create a Button component that accepts children and onClick props.',requirements:['Create Button component','Accept children','Accept and attach onClick'],starter:'export function Button({ children, onClick }) {\n  \n}',hint:'Return <button onClick={onClick}>{children}</button>.',check:c=>[/function\s+Button|const\s+Button/i.test(c),/children/i.test(c),/onClick=\{onClick\}/i.test(c)]}
    ]},
    {id:'node',icon:'N',name:'Node.js',desc:'Server-side JavaScript',file:'server.js',lessons:[
      {id:'node-1',title:'Create an API response',prompt:'Write an Express GET route at /api/hello that returns JSON with message: "Hello Meta".',requirements:['Use app.get','Route is /api/hello','Return JSON'],starter:"app.get('/api/hello', (req, res) => {\n  \n});",hint:'Use res.json({ message: "Hello Meta" }).',check:c=>[/app\.get\s*\(\s*['"]\/api\/hello['"]/i.test(c),/res\.json\s*\(/i.test(c),/Hello Meta/i.test(c)]}
    ]}
  ],
  pro: [
    {id:'architecture',icon:'◇',name:'Architecture',desc:'Design larger systems',file:'design.md',lessons:[
      {id:'arch-1',title:'Design a rate limiter',prompt:'Describe a production rate-limiting design using a shared store and explain how it handles multiple servers.',requirements:['Mention a shared store','Explain a key/window strategy','Address multiple app instances'],starter:'# Rate limiter design\n\n',hint:'Think Redis, request keys, expiration windows, and atomic counters.',check:c=>[/redis|shared store|shared database/i.test(c),/window|ttl|expire|token bucket|sliding/i.test(c),/multiple|distributed|instances|servers/i.test(c)]}
    ]},
    {id:'mcbe',icon:'MC',name:'MC Bedrock',desc:'Build addons',file:'main.js',lessons:[
      {id:'mcbe-1',title:'React to a player spawn',prompt:'Write a Bedrock Script API listener for playerSpawn and send a welcome message to the player.',requirements:['Use playerSpawn event','Subscribe to the event','Send a message'],starter:'import { world } from "@minecraft/server";\n\n',hint:'Use world.afterEvents.playerSpawn.subscribe(event => { ... }).',check:c=>[/playerSpawn/i.test(c),/\.subscribe\s*\(/i.test(c),/sendMessage\s*\(/i.test(c)]}
    ]}
  ]
};

let currentLevel=state.level;
let currentCourse=null;
let currentLesson=null;
let hintUsed=false;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
function save(){localStorage.setItem('metaState',JSON.stringify(state)); updateStats();}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function setView(view){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  $('#view-'+view).classList.add('active');
  $('#pageTitle').textContent={learn:'Learn',projects:'Projects',coach:'AI Coach',progress:'Progress',settings:'Settings'}[view];
  if(view==='progress') renderProgress();
}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));

function renderCourses(){
  const wrap=$('#courseCards');wrap.innerHTML='';
  courses[currentLevel].forEach(course=>{
    const done=course.lessons.filter(l=>state.completed.includes(l.id)).length;
    const pct=Math.round(done/course.lessons.length*100);
    const b=document.createElement('button');b.className='course'+(currentCourse?.id===course.id?' active':'');
    b.innerHTML='<span class="courseIcon">'+course.icon+'</span><span><b>'+course.name+'</b><small>'+course.desc+'</small></span><span class="pct">'+pct+'%</span>';
    b.onclick=()=>selectCourse(course);wrap.appendChild(b);
  });
}
function selectCourse(course){
  currentCourse=course;currentLesson=course.lessons.find(l=>!state.completed.includes(l.id))||course.lessons[0];hintUsed=false;
  renderCourses();renderLesson();
}
function renderLesson(){
  $('#lessonEmpty').classList.add('hidden');$('#lessonActive').classList.remove('hidden');
  $('#lessonCourse').textContent=currentCourse.name;$('#lessonTitle').textContent=currentLesson.title;$('#lessonDifficulty').textContent=currentLevel[0].toUpperCase()+currentLevel.slice(1);
  $('#lessonPrompt').textContent=currentLesson.prompt;$('#fileName').textContent=currentCourse.file;
  $('#requirements').innerHTML=currentLesson.requirements.map(r=>'<span>'+r+'</span>').join('');
  $('#codeEditor').value=currentLesson.starter;$('#hintBox').classList.add('hidden');$('#gradeBox').classList.add('hidden');
}
$$('.level').forEach(b=>b.onclick=()=>{currentLevel=b.dataset.level;state.level=currentLevel;save();$$('.level').forEach(x=>x.classList.toggle('active',x===b));currentCourse=null;renderCourses();$('#lessonActive').classList.add('hidden');$('#lessonEmpty').classList.remove('hidden')});
$('#resetCode').onclick=()=>currentLesson&&($('#codeEditor').value=currentLesson.starter);
$('#hintBtn').onclick=()=>{
  if(!currentLesson)return;
  hintUsed=true;const box=$('#hintBox');box.classList.remove('hidden');box.textContent=(state.reducedHints?'Small hint: ':'Hint: ')+currentLesson.hint;
};
$('#gradeBtn').onclick=()=>{
  if(!currentLesson)return;
  const code=$('#codeEditor').value;const checks=currentLesson.check(code);const passed=checks.filter(Boolean).length;let grade=Math.round((passed/checks.length)*100)-(hintUsed?5:0);grade=Math.max(0,grade);
  const box=$('#gradeBox');box.classList.remove('hidden','success','error');
  if(passed===checks.length){
    box.classList.add('success');box.innerHTML='<b>Grade: '+grade+'%</b><br>Your solution meets the requirements.'+(hintUsed?' A hint was used, so 5 points were deducted.':'')+'<br><small>Next improvement: try simplifying or naming your code clearly.</small>';
    if(!state.completed.includes(currentLesson.id)){state.completed.push(currentLesson.id);state.xp+=Math.max(10,Math.round(grade/2));state.grades.push(grade);state.progress[currentCourse.id]=(state.progress[currentCourse.id]||0)+1;save();renderCourses();}
  } else {
    box.classList.add('error');box.innerHTML='<b>Grade: '+grade+'%</b><br>You passed '+passed+' of '+checks.length+' checks. Compare your code with the requirements and try again.';
  }
};
function updateStats(){
  $('#xpValue').textContent=state.xp+' XP';$('#sideStreak').textContent=state.streak+' day'+(state.streak===1?'':'s');$('#profileName').textContent=state.name;$('#profileLevel').textContent=state.level[0].toUpperCase()+state.level.slice(1);
  $('#statStreak').textContent=state.streak;$('#statXp').textContent=state.xp;$('#statLessons').textContent=state.completed.length;$('#statGrade').textContent=state.grades.length?Math.round(state.grades.reduce((a,b)=>a+b,0)/state.grades.length)+'%':'—';
  const all=Object.values(courses).flat().flatMap(c=>c.lessons);const pct=Math.round(state.completed.length/all.length*100);$('#overallPercent').textContent=pct+'%';$('.ring').style.setProperty('--p',pct+'%');$('#overallText').textContent=state.completed.length?state.completed.length+' of '+all.length+' lessons completed':'Start your first lesson';
  const av=$('#avatarPreview');if(state.avatar){av.style.backgroundImage='url("'+state.avatar.replace(/"/g,'')+'")';av.textContent=''}else{av.style.backgroundImage='';av.textContent=(state.name||'C')[0].toUpperCase()}
}
function renderProjects(){
  const items=[['🌐','Portfolio Website','Build a responsive personal site from scratch.'],['🎮','Mini Game','Practice JavaScript with a small browser game.'],['⛏️','Minecraft Addon','Plan and write a Bedrock Script API addon.'],['＋','Blank Sandbox','Start with an empty workspace and experiment.']];
  $('#projectGrid').innerHTML=items.map(x=>'<article class="projectCard"><span class="icon">'+x[0]+'</span><h3>'+x[1]+'</h3><p>'+x[2]+'</p><button class="secondaryBtn" onclick="openProject(\''+x[1].replace(/'/g,"\\'")+'\')">Open project</button></article>').join('');
}
window.openProject=name=>toast(name+' workspace is ready for the next build step.');
$('#newProjectBtn').onclick=()=>toast('New blank project created');
function renderProgress(){
  const entries=[...courses.beginner,...courses.intermediate,...courses.pro];
  $('#skillProgress').innerHTML=entries.map(c=>{const n=state.progress[c.id]||0,p=Math.min(100,Math.round(n/c.lessons.length*100));return '<div class="skillRow"><b>'+c.name+'</b><div class="bar"><i style="width:'+p+'%"></i></div><small>'+p+'%</small></div>'}).join('');
}
$('#coachForm').onsubmit=e=>{e.preventDefault();const input=$('#coachInput');const q=input.value.trim();if(!q)return;const chat=$('#chatMessages');chat.insertAdjacentHTML('beforeend','<div class="message user"><p>'+escapeHtml(q)+'</p></div>');input.value='';setTimeout(()=>{chat.insertAdjacentHTML('beforeend','<div class="message ai"><b>Meta Coach</b><p>'+coachReply(q)+'</p></div>');chat.scrollTop=chat.scrollHeight},250);};
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function coachReply(q){q=q.toLowerCase();if(q.includes('flex'))return 'Check the parent first. Is it actually display: flex? Then decide whether you need justify-content for the main axis or align-items for the cross axis.';if(q.includes('function'))return 'A function is a reusable block of instructions. Inputs go in as parameters, the function does some work, and it can return a result. Try writing a tiny function that doubles a number.';if(currentLesson)return 'For your current lesson, focus on this requirement first: '+currentLesson.requirements[0]+'. Get that working before worrying about the rest.';return 'Break the problem into one small thing you can verify. Tell me what you expected to happen and what happened instead.'}
$$('.coachExamples button').forEach(b=>b.onclick=()=>{$('#coachInput').value=b.textContent;$('#coachForm').requestSubmit()});
$('#dailyBtn').onclick=()=>{state.streak=Math.max(1,state.streak);save();toast('Daily challenge ready — complete a lesson to keep your streak.')};
$('#nameInput').value=state.name;$('#avatarInput').value=state.avatar;$('#levelSelect').value=state.level;$('#languageSelect').value=state.language;$('#reducedHints').checked=state.reducedHints;
$('#saveSettings').onclick=()=>{state.name=$('#nameInput').value.trim()||'Coder';state.avatar=$('#avatarInput').value.trim();state.level=$('#levelSelect').value;state.language=$('#languageSelect').value;state.reducedHints=$('#reducedHints').checked;currentLevel=state.level;$$('.level').forEach(x=>x.classList.toggle('active',x.dataset.level===currentLevel));save();renderCourses();toast('Profile saved')};
renderCourses();renderProjects();updateStats();