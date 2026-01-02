(function(){
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const statusText = document.getElementById('status-text');
  const debugOverlay = document.getElementById('debug-overlay');
  const replayModal = document.getElementById('replay-modal');

  const WIDTH = canvas.width, HEIGHT = canvas.height;
  const player = { x: WIDTH/2, y: HEIGHT/2, vx:0, vy:0, speed: 150, trail: [] };
  const keys = {};
  const touchDir = { x:0, y:0 };

  const surprises = ['time-refund','unreliable-curator','mirror-math','laser-rhythm','ally-guard','replay'];

  const state = {
    profile: StorageAPI.load(),
    wing: Content.wings[0],
    currentTopic: 'integers',
    focus: 100,
    gems: 0,
    gadgetsUsed: [],
    runActive: false,
    runRooms: [],
    currentRoomIndex: 0,
    currentProblem: null,
    streak: 0,
    hintStep: 0,
    debug: false,
    timerMs: 60000,
    musicPhase: 0,
    lastError: '',
    lastSurprise: '',
    hintTimer: null,
    perfectChain: 0,
    allyTutor: false,
    mirrorActive: false,
    runStats: { correct:0, attempts:0, hints:0, topics:[] },
    attemptsOnCurrent: 0
  };

  window.gameState = state;
  Progression.ensure(state.profile);

  function randSeeded(){
    if(!state.profile.settings.seededRng) return Math.random();
    const seed = state.profile.settings.seed = (state.profile.settings.seed*16807)%2147483647;
    return (seed-1)/2147483646;
  }

  Math.random = randSeeded;

  function resetRun(){
    state.profile.gadgets = StorageAPI.defaults();
    StorageAPI.save(state.profile);
    state.focus = 100;
    state.gems = 0;
    state.streak = 0;
    state.timerMs = 70000;
    state.runRooms = buildRun();
    state.currentRoomIndex = 0;
    state.runActive = true;
    state.perfectChain = 0;
    state.allyTutor = false;
    state.mirrorActive = false;
    state.runStats = { correct:0, attempts:0, hints:0, topics:[] };
    bossProgress = 0;
    statusText.textContent = `Wing: ${state.wing.name}`;
    updateCuratorPersonality();
  }

  function buildRun(){
    const rooms = [];
    const obstacles = ['door','laser','keys','jammer'];
    for(let i=0;i<6;i++){
      const topic = choice(state.wing.topics);
      rooms.push({ obstacle: choice(obstacles), topic });
    }
    rooms.push({ obstacle: 'boss', topic: choice(state.wing.topics) });
    return rooms;
  }

  function choice(arr){ return arr[Math.floor(randSeeded()*arr.length)]; }

  function loop(ts){
    requestAnimationFrame(loop);
    const dt = 16/1000;
    update(dt);
    render();
  }
  requestAnimationFrame(loop);

  function update(dt){
    if(state.runActive){
      state.timerMs -= dt*1000;
      if(state.timerMs<0) state.timerMs = 0;
    }
    const speed = player.speed;
    player.vx = (keys['ArrowRight']||keys['d']?1:0) - (keys['ArrowLeft']||keys['a']?1:0) + touchDir.x;
    player.vy = (keys['ArrowDown']||keys['s']?1:0) - (keys['ArrowUp']||keys['w']?1:0) + touchDir.y;
    const mag = Math.hypot(player.vx, player.vy) || 1;
    player.x += (player.vx/mag)*speed*dt;
    player.y += (player.vy/mag)*speed*dt;
    player.x = Math.max(20, Math.min(WIDTH-20, player.x));
    player.y = Math.max(20, Math.min(HEIGHT-20, player.y));
    player.trail.push({x:player.x,y:player.y,life:1});
    if(player.trail.length>20) player.trail.shift();
    if(state.debug) updateDebug();
  }

  function render(){
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    ctx.fillStyle = '#0a0d18';
    ctx.fillRect(0,0,WIDTH,HEIGHT);
    drawRoom();
    drawPlayer();
    drawUI();
  }

  function drawRoom(){
    const room = state.runRooms[state.currentRoomIndex];
    if(!room){
      ctx.fillStyle = '#1d273d';
      ctx.fillRect(0,0,WIDTH,HEIGHT);
      return;
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.strokeRect(40,40,WIDTH-80,HEIGHT-80);
    ctx.fillStyle = '#132240';
    ctx.fillText(`${Content.obstacleTemplates[room.obstacle].name} • ${room.topic}`, 50,60);
    // lasers
    ctx.strokeStyle = 'rgba(110,255,200,0.4)';
    for(let i=0;i<5;i++){
      ctx.beginPath();
      const y = 100 + i*80 + Math.sin(performance.now()/500 + i)*10;
      ctx.moveTo(60,y); ctx.lineTo(WIDTH-60,y);
      ctx.stroke();
    }
    if(state.mirrorActive || state.lastSurprise==='mirror-math'){
      ctx.strokeStyle = '#f0a';
      ctx.strokeRect(WIDTH/2-120, HEIGHT/2-80, 240, 160);
      ctx.fillStyle = 'rgba(240,160,255,0.08)';
      ctx.fillRect(WIDTH/2-120, HEIGHT/2-80, 240, 160);
      ctx.fillStyle = '#f8d';
      ctx.fillText('Mirror Math: balance shown!', WIDTH/2-110, HEIGHT/2);
    }
  }

  function drawPlayer(){
    ctx.fillStyle = '#6af0c6';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 12, 0, Math.PI*2);
    ctx.fill();
    player.trail.forEach((p,i)=>{
      ctx.fillStyle = `rgba(106,240,198,${i/player.trail.length})`;
      ctx.fillRect(p.x-4,p.y-4,8,8);
    });
  }

  function drawUI(){
    ctx.fillStyle = '#e5ecff';
    ctx.fillText(`Focus ${Math.round(state.focus)} | Gems ${state.gems} | Timer ${(state.timerMs/1000).toFixed(1)}s`, 50, HEIGHT-30);
    if(!state.runActive){
      ctx.fillText('Press Start Heist to begin.', WIDTH/2-80, HEIGHT/2);
    }
  }

  document.addEventListener('keydown', (e)=>{
    keys[e.key]=true;
    if(e.key==='Escape'){ pause(); }
    if(e.key==='~'){ state.debug=!state.debug; debugOverlay.classList.toggle('hidden', !state.debug); }
  });
  document.addEventListener('keyup', (e)=>{ keys[e.key]=false; });

  function pause(){
    state.runActive=false;
    UI.openModal('#menu-modal', '<div class="card"><h2>Paused</h2><button id="resume">Resume</button></div>');
    document.querySelector('#resume').onclick=()=>{ UI.closeModal('#menu-modal'); state.runActive=true; };
  }

  // Problem handling
  function nextProblem(){
    const room = state.runRooms[state.currentRoomIndex];
    if(!room){ endRun(); return; }
    state.currentTopic = room.topic;
    const mastery = Progression.masteryFor(state.profile, room.topic);
    const level = Progression.difficulty(mastery);
    const p = MathContent.makeProblem(room.obstacle==='boss'? room.topic: room.topic, level);
    state.currentProblem = p;
    state.hintStep = 0;
    state.attemptsOnCurrent = 0;
    const allowChoice = Progression.allowMultipleChoice(mastery);
    const preferFree = Progression.preferFreeResponse(mastery);
    UI.showProblem(p, allowChoice, preferFree, submitAnswer, requestHint, useGadget);
    resetHintTimer(Progression.hintDelayMs(mastery));
    if(triggerSurprise()) handleSurprise();
  }

  function submitAnswer(value){
    const startTime = performance.now();
    const p = state.currentProblem;
    state.attemptsOnCurrent +=1;
    const correct = String(value).toLowerCase() === String(p.answer).toLowerCase();
    state.runStats.attempts +=1;
    state.runStats.topics.push(state.currentTopic);
    if(correct){
      state.streak +=1;
      state.gems += 2;
      state.focus = Math.min(100, state.focus+3);
      UI.showFeedback('Unlocked! Gems +2', true);
      state.runStats.correct +=1;
      state.perfectChain = (state.hintStep===0? state.perfectChain+1 : 0);
      if(state.perfectChain>=2){ state.allyTutor=true; UI.appendHint('Ally Guard steps in with a tutor hint next time.'); }
      if(state.streak%3===0){ state.timerMs += 4000; state.lastSurprise='time-refund'; UI.appendHint('Time Refund! +4s'); }
    } else {
      state.streak = 0;
      state.focus = Math.max(0, state.focus-5);
      const err = p.errorClassifier? p.errorClassifier(value):null;
      state.lastError = err||'';
      UI.showFeedback(err? `Check: ${err}`:'Try again, smaller steps.', false);
      const easier = easePath(p.topic);
      if(easier){ state.currentProblem = easier; UI.showProblem(easier,true,false,submitAnswer, requestHint, useGadget); resetHintTimer(Progression.hintDelayMs(Progression.masteryFor(state.profile, state.currentTopic))); return; }
      if(Progression.allowMultipleChoice(state.profile.mastery[state.currentTopic]||{recent:[],hints:0,attempts:0})){ UI.revealChoices(p); }
    }
    clearHintTimer();
    Progression.record(state.profile, state.currentTopic||p.topic, { correct, timeMs: performance.now()-startTime, hintsUsed: state.hintStep, errorType: state.lastError });
    StorageAPI.save(state.profile);
    advanceRoom(correct);
  }

  function easePath(topic){
    if(state.attemptsOnCurrent<2) return null;
    if(topic==='equations') return MathContent.makeProblem('integers',1);
    if(topic==='order') return MathContent.makeProblem('integers',1);
    if(topic==='geometry') return MathContent.makeProblem('integers',1);
    return MathContent.makeProblem(topic,1);
  }

  function requestHint(){
    if(!state.currentProblem) return;
    const step = state.hintStep;
    if(step>=state.currentProblem.hints.length) return;
    state.runStats.hints +=1;
    UI.showHint(step);
    if(state.allyTutor){ UI.appendHint('Tutor: balance both sides or sketch on the mirror panel.'); state.allyTutor=false; }
    state.hintStep+=1;
  }

  function useGadget(name){
    const g = state.profile.gadgets[name];
    if(!g || g.charges<=0) return;
    g.charges -=1;
    state.gadgetsUsed.push(name);
    if(name==='X-Ray Goggles' && state.currentProblem.multiChoice){
      state.currentProblem.multiChoice = state.currentProblem.multiChoice.slice(0,2);
      UI.showFeedback('X-Ray removes one wrong option.', true);
      UI.showProblem(state.currentProblem,true,false,submitAnswer,requestHint,useGadget);
    }
    if(name==='Balance Beam'){ state.lastSurprise='mirror-math'; state.mirrorActive=true; UI.appendHint('Balance Beam: visualize both sides staying equal.'); }
    if(name==='Percent Lens' && state.currentProblem.topic==='decimals'){
      UI.appendHint('Percent Lens: remember 10% = divide by 10.');
    }
    if(name==='Checkpoint Token'){ state.focus = Math.min(100, state.focus+10); }
    StorageAPI.save(state.profile);
  }

  function advanceRoom(success){
    const room = state.runRooms[state.currentRoomIndex];
    if(room.obstacle==='boss'){
      handleBossStep(success);
      return;
    }
    if(success){
      branchChoice();
    } else {
      requestHint();
    }
  }

  let bossProgress = 0;
  function handleBossStep(success){
    const mastery = state.profile.mastery[state.currentProblem.topic]||{recent:[],times:[]};
    let stepsNeeded = Progression.bossSteps(mastery);
    if(state.focus<40 || (mastery.recent.filter(Boolean).length/mastery.recent.length||0)<0.5) stepsNeeded = Math.max(3, stepsNeeded-1);
    if(success) bossProgress +=1;
    else { bossProgress = Math.max(0,bossProgress-1); requestHint(); }
    if(bossProgress>=stepsNeeded){
      endRun(true);
    } else {
      const script = Content.bossScripts.find(b=>b.topic===state.currentProblem.topic) || Content.bossScripts[0];
      UI.appendHint(`Boss sequence step ${bossProgress+1}/${stepsNeeded}`);
      UI.appendHint(script.steps[Math.min(script.steps.length-1,bossProgress)]);
      state.currentProblem = MathContent.makeProblem(state.currentProblem.topic,2);
      UI.showProblem(state.currentProblem,true,false,submitAnswer,requestHint,useGadget);
    }
  }

  function endRun(victory){
    state.runActive=false;
    const topicsPracticed = state.runRooms.map(r=>r.topic);
    const accuracy = state.runStats.attempts? state.runStats.correct/state.runStats.attempts:1;
    StorageAPI.addSession(state.profile, { topics: topicsPracticed, accuracy, hints: state.runStats.hints, bestStreak: state.streak });
    showReplay();
    statusText.textContent = victory? 'Boss cracked!' : 'Run ended';
    state.profile.gems = (state.profile.gems||0)+state.gems;
    checkUnlocks();
    StorageAPI.save(state.profile);
  }

  function showReplay(){
    const off = document.createElement('canvas');
    off.width = 400; off.height=200;
    const c = off.getContext('2d');
    c.fillStyle='#0c0f1a'; c.fillRect(0,0,400,200);
    for(let i=0;i<20;i++){
      c.fillStyle = `rgba(106,240,198,${i/20})`;
      c.fillRect(20+i*15, 100+Math.sin(i)*20, 10, 10);
    }
    c.fillStyle='#e5ecff';
    c.fillText('Heist Replay: "Math echoes through the halls."', 20, 30);
    replayModal.innerHTML = `<div class="card"><h2>Heist Replay Clip</h2><p>Stats: Gems ${state.gems}, Streak ${state.streak}</p><canvas id="replay-canvas" width="400" height="200"></canvas><button id="close-replay">Close</button></div>`;
    replayModal.classList.remove('hidden');
    replayModal.querySelector('#close-replay').onclick = ()=> replayModal.classList.add('hidden');
    replayModal.querySelector('#replay-canvas').getContext('2d').drawImage(off,0,0);
  }

  function triggerSurprise(){
    if(randSeeded()>0.3) return false;
    state.lastSurprise = choice(surprises);
    return true;
  }

  function handleSurprise(){
    switch(state.lastSurprise){
      case 'time-refund': state.timerMs += 3000; UI.appendHint('Time Refund: +3s'); break;
      case 'unreliable-curator': UI.appendHint(choice(Content.narration.glitch)); break;
      case 'mirror-math': UI.appendHint('Mirror panels show balancing.'); state.mirrorActive=true; break;
      case 'laser-rhythm': rhythmLock(); break;
      case 'ally-guard': UI.appendHint('Ally Guard ready: next hint stronger.'); state.allyTutor=true; break;
      case 'replay': UI.appendHint('Replay camera starts recording.'); break;
    }
  }

  function rhythmLock(){
    let beat = 0;
    const timer = setInterval(()=>{
      beat++;
      UI.appendHint(`Laser beat ${beat}: mental math ${5*beat}% of 200 = ${10*beat}`);
      if(beat===2 && state.hintStep===0) UI.appendHint('The beat slows kindly when you miss; breathe and retry.');
      if(beat>=3) clearInterval(timer);
    }, 600);
  }

  function updateDebug(){
    const topicData = state.profile.mastery[state.currentTopic] || { recent:[], times:[], hints:0, attempts:0 };
    const est = Progression.estimate(topicData);
    debugOverlay.innerHTML = `FPS ~60<br>Wing: ${state.wing.name}<br>Topic: ${state.currentTopic}<br>Accuracy: ${(est.accuracy*100).toFixed(0)}%<br>Median: ${est.medianTime}ms<br>Hint rate: ${est.hintRate.toFixed(2)}<br>Difficulty: ${Progression.difficulty(topicData)}<br>Last error: ${state.lastError}`;
  }

  // Buttons
  document.getElementById('start-run').onclick = ()=>{ resetRun(); nextProblem(); };
  document.getElementById('heist-board').onclick = ()=> UI.renderHeistBoard(state.profile);
  document.getElementById('report-screen-btn').onclick = ()=> UI.renderReport(state.profile);
  document.getElementById('settings-btn').onclick = ()=> UI.renderSettings(state.profile, applySettings);
  document.getElementById('mute-btn').onclick = toggleMute;

  // Touch controls (coarse pointer devices)
  const touchControls = document.getElementById('touch-controls');
  if(window.matchMedia && window.matchMedia('(pointer: coarse)').matches){
    touchControls.style.display = 'block';
    const joy = document.getElementById('joy');
    const center = { x:0, y:0 };
    const updateDir = (ev)=>{
      const rect = joy.getBoundingClientRect();
      center.x = rect.left + rect.width/2;
      center.y = rect.top + rect.height/2;
      const dx = ev.touches? ev.touches[0].clientX-center.x : ev.clientX-center.x;
      const dy = ev.touches? ev.touches[0].clientY-center.y : ev.clientY-center.y;
      touchDir.x = Math.max(-1, Math.min(1, dx/40));
      touchDir.y = Math.max(-1, Math.min(1, dy/40));
    };
    ['touchstart','touchmove','pointerdown','pointermove'].forEach(evt=> joy.addEventListener(evt, updateDir));
    ['touchend','pointerup','mouseleave'].forEach(evt=> joy.addEventListener(evt, ()=>{ touchDir.x=0; touchDir.y=0; }));
    document.getElementById('touch-submit').onclick = ()=> submitAnswer(document.getElementById('answer-input').value.trim());
  }

  function applySettings(settings){
    document.body.classList.toggle('high-contrast', settings.highContrast);
    document.body.classList.toggle('large-text', settings.largeText);
    document.body.classList.toggle('reduce-motion', settings.reduceMotion);
    state.profile.settings = settings; StorageAPI.save(state.profile);
  }
  applySettings(state.profile.settings);

  function toggleMute(){
    state.profile.settings.mute = !state.profile.settings.mute;
    StorageAPI.save(state.profile);
    document.getElementById('mute-btn').textContent = state.profile.settings.mute? 'Unmute':'Mute';
  }

  // Basic audio tones
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playTone(freq){
    if(state.profile.settings.mute) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type='sine'; o.frequency.value=freq;
    o.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.2, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.3);
    o.start(); o.stop(audioCtx.currentTime+0.3);
  }

  // Focus drain and streak effects
  setInterval(()=>{
    if(state.runActive){ state.focus = Math.max(0, state.focus-0.2); if(state.focus===0) endRun(false); }
    else { state.focus = Math.min(100, state.focus+0.1); }
  }, 300);

  // Gentle regen for focus during runs
  setInterval(()=>{ if(state.runActive) state.focus = Math.min(100, state.focus+0.05); }, 1200);

  function branchChoice(){
    const options = [choice(Content.wings).topics[0], choice(Content.wings).topics[1]||'mixed'];
    UI.openModal('#boss-modal', `<div class="card"><h3>Choose your next route</h3>
      <p>Pick a topic path. Riskier ones grant extra gems.</p>
      <button id="path-a">${options[0]}</button>
      <button id="path-b">${options[1]}</button>
      </div>`);
    document.getElementById('path-a').onclick = ()=> selectPath(options[0]);
    document.getElementById('path-b').onclick = ()=> selectPath(options[1]);
  }

  function selectPath(topic){
    UI.closeModal('#boss-modal');
    state.currentRoomIndex +=1;
    if(state.currentRoomIndex >= state.runRooms.length-1){
      state.runRooms[state.runRooms.length-1] = { obstacle:'boss', topic };
    } else {
      state.runRooms[state.currentRoomIndex] = { obstacle: choice(['door','laser','keys','jammer']), topic };
    }
    if(topic===state.currentTopic) state.gems +=1; // reward familiarity
    state.currentTopic = topic;
    updateCuratorPersonality();
    nextProblem();
  }

  function updateCuratorPersonality(){
    const m = state.profile.mastery[state.currentTopic] || { recent:[], times:[], hints:0, attempts:1 };
    const est = Progression.estimate(m);
    const errors = state.profile.mastery[state.currentTopic]?.errorTypes||[];
    let mode = 'default';
    if(est.hintRate>0.4) mode='hintHeavy';
    else if(est.medianTime<2500) mode='speedy';
    else if(errors.slice(-3).includes('sign error')) mode='signSlip';
    statusText.textContent = choice(Content.curatorPersonalities[mode]);
  }

  function resetHintTimer(ms){
    clearHintTimer();
    state.hintTimer = setTimeout(()=>{ requestHint(); }, ms);
  }
  function clearHintTimer(){
    if(state.hintTimer){ clearTimeout(state.hintTimer); state.hintTimer=null; }
  }

  function checkUnlocks(){
    if(state.profile.gems>20 && !state.profile.cosmetics.outfits.includes('Prismatic Cloak')){
      state.profile.cosmetics.outfits.push('Prismatic Cloak');
      UI.appendHint('Unlocked cosmetic: Prismatic Cloak!');
    }
    if(state.profile.gems>30 && !state.profile.gadgets['Checkpoint Token']?.owned){
      state.profile.gadgets['Checkpoint Token'] = { owned:true, charges:1, max:1 };
      UI.appendHint('Unlocked gadget: Checkpoint Token!');
    }
  }

})();
