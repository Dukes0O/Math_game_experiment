(function(){
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const statusText = document.getElementById('status-text');
  const gemsText = document.getElementById('profile-gems');
  const debugOverlay = document.getElementById('debug-overlay');
  const replayModal = document.getElementById('replay-modal');

  ctx.imageSmoothingEnabled = true;

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  const keys = {};
  const touchDir = { x:0, y:0 };

  const player = {
    x: WIDTH * 0.18,
    y: HEIGHT * 0.75,
    vx: 0,
    vy: 0,
    speed: 180,
    radius: 14,
    trail: []
  };

  const state = {
    profile: StorageAPI.load(),
    scene: 'idle', // idle | explore | challenge | paused | ended
    run: null,
    room: null,

    currentProblem: null,
    problemStartTs: 0,
    timeRemainingMs: 0,
    hintStep: 0,
    attemptsOnProblem: 0,
    autoHintAt: 0,
    lastError: '',
    lastSurprise: '',
    debug: false,

    particles: [],
    shake: 0,

    sentryChallenge: false,
    timeoutArmed: false
  };

  window.gameState = state; // UI reads profile + gadgets from here
  Progression.ensure(state.profile);

  // ---------------- RNG (optional seeded) ----------------
  function randSeeded(){
    const s = state.profile.settings;
    if(!s.seededRng) return Math.random.__native ? Math.random.__native() : Math.random();

    // Keep seed in a safe range (Park–Miller requires 1..2147483646).
    const raw = Number.isFinite(s.seed) ? Math.floor(s.seed) : 42;
    s.seed = raw > 0 ? raw : 42;

    const seed = s.seed = (s.seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  // Preserve native Math.random so UI can choose to avoid reshuffle if needed.
  if(!Math.random.__native) Math.random.__native = Math.random.bind(Math);
  Math.random = randSeeded;

  // ---------------- Audio (lazy) ----------------
  let audioCtx = null;
  function ensureAudio(){
    try {
      if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if(audioCtx.state === 'suspended') audioCtx.resume();
    } catch(e){}
  }

  function playTone(freq, dur=0.16, gain=0.18){
    if(state.profile.settings.mute) return;
    ensureAudio();
    if(!audioCtx) return;

    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    o.connect(g);
    g.connect(audioCtx.destination);

    const t = audioCtx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t);
    o.stop(t + dur);
  }

  function playSuccess(){
    playTone(660, 0.12, 0.16);
    setTimeout(()=>playTone(990, 0.10, 0.12), 70);
  }

  function playFail(){
    playTone(220, 0.16, 0.14);
    setTimeout(()=>playTone(180, 0.12, 0.10), 70);
  }

  // ---------------- Utilities ----------------
  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function dist(ax,ay,bx,by){ return Math.hypot(ax-bx, ay-by); }
  function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function shuffle(arr){
    const a = [...arr];
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function topicLabel(topic){
    const meta = Content.TOPIC_META[topic] || { label: topic };
    return `${meta.icon || ''} ${meta.label}`.trim();
  }

  function obstacleName(obstacle){
    return (Content.obstacleTemplates[obstacle] || {name: obstacle}).name;
  }

  function updateTopBar(){
    gemsText.textContent = `💎 ${state.profile.gems || 0}`;
  }

  }

  function playTone(freq, dur=0.16, gain=0.18){
    if(state.profile.settings.mute) return;
    ensureAudio();
    if(!audioCtx) return;

    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    o.connect(g);
    g.connect(audioCtx.destination);

    const t = audioCtx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t);
    o.stop(t + dur);
  }

  function playSuccess(){
    playTone(660, 0.12, 0.16);
    setTimeout(()=>playTone(990, 0.10, 0.12), 70);
  }

  function playFail(){
    playTone(220, 0.16, 0.14);
    setTimeout(()=>playTone(180, 0.12, 0.10), 70);
  }

  // ---------------- Utilities ----------------
  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function dist(ax,ay,bx,by){ return Math.hypot(ax-bx, ay-by); }
  function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function topicLabel(topic){
    const meta = Content.TOPIC_META[topic] || { label: topic };
    return `${meta.icon || ''} ${meta.label}`.trim();
  }

  function obstacleName(obstacle){
    return (Content.obstacleTemplates[obstacle] || {name: obstacle}).name;
  }

  function updateTopBar(){
    gemsText.textContent = `💎 ${state.profile.gems || 0}`;
  }

  function toast(msg, kind){
    UI.showToast(msg, kind);
  }

  // ---------------- Settings ----------------
  function applySettings(settings){
    document.body.classList.toggle('high-contrast', !!settings.highContrast);
    document.body.classList.toggle('large-text', !!settings.largeText);
    document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);

    settings.seededRng = !!settings.seededRng;
    settings.seed = Math.max(1, Math.floor(Number(settings.seed) || 42));
    state.profile.settings = settings;
    state.profile = StorageAPI.save(state.profile);
    updateTopBar();
    document.getElementById('mute-btn').textContent = state.profile.settings.mute ? 'Unmute' : 'Mute';
  }
  applySettings(state.profile.settings);

  // ---------------- Run / Room generation ----------------
  const NORMAL_ROOMS = 6;

  function pickWing(wingId){
    return Content.wings.find(w=>w.id===wingId) || Content.wings[0];
  }

  function pickMission(){
    return choice(Content.missions);
  }

  function startRun(wingId){
    const wing = pickWing(wingId);
    state.profile = StorageAPI.save(state.profile);

    // Refill gadget charges at run start (owned only).
    Object.values(state.profile.gadgets).forEach(g=>{
      if(g.owned) g.charges = g.max;
    });

    const firstTopic = choice(wing.topics);

    state.run = {
      wingId: wing.id,
      wing,
      roomIndex: 0,
      focus: 100,
      timerMs: 90000,
      streak: 0,
      bestStreak: 0,
      combo: 1,
      gemsRun: 0,
      roomsCleared: 0,

      mission: pickMission(),
      noHintLocks: 0,
      bossHintsUsed: 0,
      sentryTouched: false,

      stats: { correct:0, attempts:0, hints:0, topics:[] }
    };

    enterRoom({ topic: firstTopic, obstacle: randomObstacle(false), isBoss: false });
    state.scene = 'explore';
    toast(`${wing.name} • Mission: ${state.run.mission.title}`, 'good');
    statusText.textContent = choice(Content.curatorPersonalities.default);
    updateCuratorPersonality();
    updateTopBar();
  }

  function randomObstacle(isBoss){
    if(isBoss) return 'boss';
    const pool = ['door','laser','keys','jammer'];
    return choice(pool);
  }

  function ensureChoiceHasAnswer(problem){
    if(!problem || !Array.isArray(problem.multiChoice)) return;
    const ans = problem.answer;
    const tol = typeof problem.tolerance === 'number' ? problem.tolerance : (typeof ans === 'number' ? 0.01 : 0);

    const same = (a,b)=>{
      if(typeof ans === 'number'){
        const n1 = Number(a), n2 = Number(b);
        if(!Number.isFinite(n1) || !Number.isFinite(n2)) return false;
        return Math.abs(n1 - n2) <= tol;
      }
      return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
    };

    const unique = [];
    problem.multiChoice.forEach(opt=>{
      if(!unique.some(x=>same(x,opt))) unique.push(opt);
    });

    if(!unique.some(opt=>same(opt, ans))) unique.unshift(ans);

    const answerFirst = unique.filter(opt=>same(opt, ans));
    const rest = unique.filter(opt=>!same(opt, ans));
    const options = [...answerFirst, ...shuffle(rest)];
    problem.multiChoice = options.slice(0,4);
  }

  function spawnGems(count, avoid){
    const gems = [];
    for(let i=0;i<count;i++){
      let x=0,y=0;
      for(let tries=0;tries<40;tries++){
        x = 80 + Math.random()*(WIDTH-160);
        y = 90 + Math.random()*(HEIGHT-160);
        if(avoid && dist(x,y, avoid.x, avoid.y) < 120) continue;
        break;
      }
      gems.push({ x, y, r: 8, value: 1, collected:false, bob: Math.random()*10 });
    }
    return gems;
  }

  function spawnSentry(room){
    if(room.isBoss) return null;
    if(Math.random() > 0.45) return null;
    const y = 130 + Math.random()*(HEIGHT-220);
    const s = {
      x: 120 + Math.random()*(WIDTH-240),
      y,
      r: 14,
      vx: (Math.random()>0.5?1:-1) * (90 + Math.random()*70),
      cooldownMs: 2000,
      disabledMs: 0
    };
    return s;
  }

  function makeExitChoices(currentTopic){
    const wing = state.run.wing;
    const allTopics = Object.keys(Content.TOPIC_META);
    const mastery = (t)=>Progression.difficulty(Progression.masteryFor(state.profile, t));
    const wingTopics = wing.topics.slice();

    // Safe: prefer a wing topic with lower difficulty.
    let safe = wingTopics.slice().sort((a,b)=>mastery(a)-mastery(b))[0] || currentTopic;

    // Spicy: prefer a topic that's not safe, slightly harder, or mixed.
    const candidates = allTopics.filter(t=>t!==safe);
    candidates.sort((a,b)=>mastery(b)-mastery(a)); // harder first
    let spicy = candidates[0] || 'mixed';
    if(Math.random() < 0.25) spicy = 'mixed';

    // If currentTopic is already challenging, keep spicy closer.
    if(mastery(currentTopic) >= 3 && Math.random() < 0.55){
      spicy = choice(wingTopics.filter(t=>t!==safe) || ['mixed']);
    }

    const left = { kind:'safe', topic: safe, bonus: 0 };
    const right = { kind:'spicy', topic: spicy, bonus: 2 };

    return { left, right };
  }

  function enterRoom({ topic, obstacle, isBoss }){
    const wing = state.run.wing;
    const theme = wing.theme || { a:'#6af0c6', b:'#f08dff', floor:'neon' };

    const room = {
      index: state.run.roomIndex,
      isBoss: !!isBoss,
      topic,
      obstacle: isBoss ? 'boss' : obstacle,
      theme,
      terminal: { x: WIDTH/2, y: HEIGHT/2, w: 150, h: 84 },
      requiredLocks: 1,
      locksSolved: 0,
      complete: false,
      exits: null,
      gems: spawnGems(isBoss ? 3 : 7, { x: WIDTH/2, y: HEIGHT/2 }),
      sentry: null,
      rhythmMode: false
    };

    const mastery = Progression.masteryFor(state.profile, topic);
    if(room.isBoss){
      room.requiredLocks = Progression.bossSteps(mastery);
    } else {
      room.requiredLocks = (Content.obstacleTemplates[room.obstacle] || {problems:1}).problems;
    }

    room.sentry = spawnSentry(room);

    // Laser rooms sometimes turn into rhythm locks (surprise).
    if(room.obstacle === 'laser' && !room.isBoss && Math.random() < 0.33){
      room.rhythmMode = true;
    }

    }

    const left = { kind:'safe', topic: safe, bonus: 0 };
    const right = { kind:'spicy', topic: spicy, bonus: 2 };

    return { left, right };
  }

  function enterRoom({ topic, obstacle, isBoss }){
    const wing = state.run.wing;
    const theme = wing.theme || { a:'#6af0c6', b:'#f08dff', floor:'neon' };

    const room = {
      index: state.run.roomIndex,
      isBoss: !!isBoss,
      topic,
      obstacle: isBoss ? 'boss' : obstacle,
      theme,
      terminal: { x: WIDTH/2, y: HEIGHT/2, w: 150, h: 84 },
      requiredLocks: 1,
      locksSolved: 0,
      complete: false,
      exits: null,
      gems: spawnGems(isBoss ? 3 : 7, { x: WIDTH/2, y: HEIGHT/2 }),
      sentry: null,
      rhythmMode: false
    };

    const mastery = Progression.masteryFor(state.profile, topic);
    if(room.isBoss){
      room.requiredLocks = Progression.bossSteps(mastery);
    } else {
      room.requiredLocks = (Content.obstacleTemplates[room.obstacle] || {problems:1}).problems;
    }

    room.sentry = spawnSentry(room);

    // Laser rooms sometimes turn into rhythm locks (surprise).
    if(room.obstacle === 'laser' && !room.isBoss && Math.random() < 0.33){
      room.rhythmMode = true;
    }

    state.room = room;

    // Reset player position and trail
    player.x = WIDTH * 0.18;
    player.y = HEIGHT * 0.75;
    player.trail.length = 0;

    // Message
    const meta = Content.TOPIC_META[topic] || { label: topic };
    statusText.textContent = `${obstacleName(room.obstacle)} • ${meta.label}`;
    toast(`Room ${room.index+1}/${NORMAL_ROOMS+1}: ${obstacleName(room.obstacle)}`, 'good');
  }

  function roomProgressText(room){
    const label = room.isBoss ? 'Step' : 'Lock';
    return `${label} ${room.locksSolved + 1}/${room.requiredLocks}`;
  }

  // ---------------- Challenge flow ----------------
  function openChallenge(){
    if(state.scene === 'challenge') return;
    state.scene = 'challenge';
    state.sentryChallenge = false;
    nextLock();
  }

  function openSentryChallenge(){
    if(state.scene === 'challenge') return;
    state.scene = 'challenge';
    state.sentryChallenge = true;

    // Sentry challenge is always timed and a bit mixed.
    const mastery = Progression.masteryFor(state.profile, state.room.topic);
    const level = Math.max(1, Progression.difficulty(mastery) - 1);
    const p = MathContent.makeProblem('mixed', level);
    p.timeLimitMs = 8000;
    p.timeLimitMs = 5500;
    p.ui = {
      title: 'Alarm Hack • quick!',
      progress: 'Beat the alarm before it calls backup'
    };
    state.currentProblem = p;
    state.problemStartTs = performance.now();
    state.timeRemainingMs = p.timeLimitMs;
    state.hintStep = 0;
    state.attemptsOnProblem = 0;
    state.autoHintAt = performance.now() + 2200;
    state.timeoutArmed = false;

    ensureChoiceHasAnswer(p);
    UI.showProblem(p, true, false, submitAnswer, requestHint, useGadget, leaveChallenge);
  }

  function nextLock(){
    const room = state.room;
    const mastery = Progression.masteryFor(state.profile, room.topic);
    const level = Progression.difficulty(mastery);

    let p;
    if(room.rhythmMode){
      p = MathContent.makeRhythmBeat(level);
      p.ui = {
        title: `Laser Rhythm • ${topicLabel(p.topic)}`,
        progress: `Beat ${room.locksSolved + 1}/${room.requiredLocks}`
      };
    } else {
      p = MathContent.makeProblem(room.topic, level);
      p.ui = {
        title: `${obstacleName(room.obstacle)} • ${topicLabel(room.topic)}`,
        progress: roomProgressText(room)
      };
    }

    // Boss: add a micro-script line each step.
    if(room.isBoss){
      const script = Content.bossScripts.find(b=>b.topic===room.topic);
      if(script && script.steps && script.steps[room.locksSolved]){
        p.hints = p.hints || [];
        p.hints.unshift(`Boss tip: ${script.steps[room.locksSolved]}`);
      }
      p.ui.title = `Boss Vault • ${topicLabel(room.topic)}`;
      p.ui.progress = `Step ${room.locksSolved + 1}/${room.requiredLocks}`;
    }

    ensureChoiceHasAnswer(p);
    state.currentProblem = p;
    state.problemStartTs = performance.now();
    state.timeRemainingMs = p.timeLimitMs || 0;
    state.hintStep = 0;
    state.attemptsOnProblem = 0;
    state.lastError = '';
    state.autoHintAt = performance.now() + Progression.hintDelayMs(mastery);
    state.timeoutArmed = false;

    const allowChoice = Progression.allowMultipleChoice(mastery) || p.mode==='rhythm';
    const preferFree = Progression.preferFreeResponse(mastery) && p.mode!=='rhythm';

    UI.showProblem(p, allowChoice, preferFree, submitAnswer, requestHint, useGadget, leaveChallenge);
  }

  function leaveChallenge(){
    if(state.scene !== 'challenge') return;
    // Allow leaving only when not in a sentry panic hack (that one is urgent).
    if(state.sentryChallenge) return;
    UI.hideProblem();
    state.scene = 'explore';
    toast('Back to the room.', 'neutral');
  }

  function requestHint(){
    const p = state.currentProblem;
    if(!p || !p.hints) return;
    if(state.hintStep >= p.hints.length) return;

    UI.showHint(state.hintStep);
    state.hintStep += 1;

    state.run.stats.hints += 1;
    if(state.room.isBoss) state.run.bossHintsUsed += 1;

    playTone(420, 0.08, 0.08);
  }

  function submitAnswer(value){
    const p = state.currentProblem;
    if(!p) return;

    ensureAudio();
    const room = state.room;

    // Timed locks: if empty input, treat as attempt anyway (kids can click choices).
    const elapsed = performance.now() - state.problemStartTs;

    // Evaluate
    const res = MathContent.checkAnswer(p, value);

    state.run.stats.attempts += 1;
    state.run.stats.topics.push(room.topic);

    state.profile.stats.totalLocks = (state.profile.stats.totalLocks || 0) + 1;

    if(res.correct){
      // Rewards
      state.run.stats.correct += 1;

      state.run.streak += 1;
      state.run.bestStreak = Math.max(state.run.bestStreak, state.run.streak);
      state.profile.stats.bestStreak = Math.max(state.profile.stats.bestStreak || 0, state.run.bestStreak);

      // Combo ramps gently.
      state.run.combo = clamp(1 + Math.floor(state.run.streak/3), 1, 4);

      const baseReward = (Content.obstacleTemplates[room.obstacle] || {reward:2}).reward;
      const lockReward = 1 + Math.floor(baseReward / room.requiredLocks);
      const gained = lockReward * state.run.combo;

      state.run.gemsRun += gained;
      state.run.focus = clamp(state.run.focus + 3, 0, 100);
      state.run.timerMs += (state.run.streak % 3 === 0) ? 2500 : 0;

      if(state.hintStep === 0) state.run.noHintLocks += 1;

      playSuccess();
      UI.showFeedback(`Unlocked! +${gained} gems (×${state.run.combo})`, true);
      toast(choice(Content.narration.streak), 'good');

      spawnBurst(WIDTH/2, HEIGHT/2, room.theme.a);

      // Record mastery
      Progression.record(state.profile, room.topic, {
        correct: true,
        timeMs: elapsed,
        hintsUsed: state.hintStep,
        errorType: null
      });

      state.profile = StorageAPI.save(state.profile);
      updateCuratorPersonality();

      // Advance lock progress
      if(state.sentryChallenge){
        // Sentry hack ends immediately.
        UI.hideProblem();
        state.scene = 'explore';
        state.sentryChallenge = false;
        if(room.sentry) room.sentry.cooldownMs = 4500;
        toast('Alarm silenced. Nice.', 'good');
        return;
      }

      room.locksSolved += 1;

      // Room complete?
      if(room.locksSolved >= room.requiredLocks){
        completeRoom();
        return;
      }

      // Next lock (short delay makes feedback readable)
      setTimeout(()=>{ if(state.scene==='challenge') nextLock(); }, 320);

    } else {
      // Penalties
      state.run.streak = 0;
      state.run.combo = 1;
      state.run.focus = clamp(state.run.focus - 6, 0, 100);
      state.run.timerMs = Math.max(0, state.run.timerMs - 1200);

      state.attemptsOnProblem += 1;
      state.lastError = res.errorType || '';

      playFail();

      let msg = res.errorType ? `Check: ${res.errorType}` : 'Try again.';
      if(p.mode === 'rhythm') msg = 'Missed the beat—try the next one.';

      UI.showFeedback(msg, false);

      // Helpful auto-scaffold after 2 tries.
      if(state.attemptsOnProblem >= 2){
        requestHint();
        UI.revealChoices(p);
      }

      // Record mastery
      Progression.record(state.profile, room.topic, {
        correct: false,
        timeMs: elapsed,
        hintsUsed: state.hintStep,
        errorType: state.lastError
      });
      state.profile = StorageAPI.save(state.profile);
      updateCuratorPersonality();

      // Boss: do not reset progress harshly; just give a hint and retry.
      if(room.isBoss){
        requestHint();
      }

      // Sentry: failing ends the hack (alarm hurts).
      if(state.sentryChallenge){
        UI.hideProblem();
        state.scene = 'explore';
        state.sentryChallenge = false;
        state.run.focus = clamp(state.run.focus - 10, 0, 100);
        toast('Alarm screamed. You got out, but it stung.', 'bad');
      }
    }

    if(state.run.focus <= 0 || state.run.timerMs <= 0){
      endRun(false);
    }
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

  function goToNextRoom(choiceSide){
    const room = state.room;
    if(!room.complete || !room.exits) return;

    const pick = room.exits[choiceSide];
    if(!pick) return;

    // Apply route bonus
    if(pick.bonus){
      state.run.gemsRun += pick.bonus;
      toast(`Route bonus +${pick.bonus} gems`, 'good');
    }

    state.run.roomIndex += 1;
    state.run.roomsCleared += 1;

    const isBoss = state.run.roomIndex >= NORMAL_ROOMS;

    enterRoom({
      topic: pick.topic,
      obstacle: randomObstacle(isBoss),
      isBoss
    });

    // Exit choice makes next room slightly different.
    if(pick.kind === 'spicy'){
      state.run.timerMs = Math.max(15000, state.run.timerMs - 2000);
    } else {
      state.run.focus = clamp(state.run.focus + 4, 0, 100);
    }

    if(state.run.roomIndex > NORMAL_ROOMS){
      // safety
      endRun(true);
    }
  }

  // ---------------- Mission evaluation ----------------
  function missionComplete(){
    const m = state.run.mission;
    if(!m) return false;
    if(m.id === 'no-hints-3') return state.run.noHintLocks >= 3;
    if(m.id === 'streak-5') return state.run.bestStreak >= 5;
    if(m.id === 'no-sentry-hit') return !state.run.sentryTouched;
    if(m.id === 'boss-clean') return state.run.bossHintsUsed <= 1;
    return false;
  }

  // ---------------- End run ----------------
  function endRun(victory){
    if(!state.run) return;
    if(state.scene === 'ended') return;

    state.scene = 'ended';

    const missionOk = missionComplete();
    const missionReward = missionOk ? (state.run.mission.reward || 0) : 0;

    const totalEarned = state.run.gemsRun + missionReward;

    state.profile.gems = (state.profile.gems || 0) + totalEarned;
    state.profile = StorageAPI.save(state.profile);

    updateTopBar();

    const accuracy = state.run.stats.attempts ? (state.run.stats.correct / state.run.stats.attempts) : 1;
    const topicsPracticed = uniqTopics(state.run.stats.topics);

    state.profile = StorageAPI.addSession(state.profile, {
      roomsCleared: state.run.roomsCleared + (victory ? 1 : 0),
      topics: topicsPracticed,
      accuracy,
      hints: state.run.stats.hints,
      bestStreak: state.run.bestStreak,
      mission: state.run.mission.id,
      missionComplete: missionOk
    });

    // Unlock cosmetics automatically as a fun drip.
    checkAutoUnlocks();

    showEndModal(victory, accuracy, missionOk, missionReward, totalEarned);

    state.run = null;
    state.room = null;
    state.currentProblem = null;
    UI.hideProblem();
  }

  function uniqTopics(list){
    const out = [];
    (list||[]).forEach(t=>{ if(t && !out.includes(t)) out.push(t); });
    return out;
  }

  }

  function uniqTopics(list){
    const out = [];
    (list||[]).forEach(t=>{ if(t && !out.includes(t)) out.push(t); });
    return out;
  }

  function checkAutoUnlocks(){
    // Soft unlocks based on total gems (encourages return).
    if(state.profile.gems >= 25 && !state.profile.cosmetics.outfits.includes('Prismatic Cloak')){
      state.profile.cosmetics.outfits.push('Prismatic Cloak');
      toast('Unlocked outfit: Prismatic Cloak', 'good');
    }
    if(state.profile.gems >= 40 && !state.profile.cosmetics.trails.includes('Comet Tail')){
      state.profile.cosmetics.trails.push('Comet Tail');
      toast('Unlocked trail: Comet Tail', 'good');
    }
    }
    if(state.profile.gems >= 40 && !state.profile.cosmetics.trails.includes('Comet Tail')){
      state.profile.cosmetics.trails.push('Comet Tail');
      toast('Unlocked trail: Comet Tail', 'good');
    }
    state.profile = StorageAPI.save(state.profile);
  }

  function showEndModal(victory, accuracy, missionOk, missionReward, totalEarned){
    const title = victory ? 'Artifact Secured!' : 'Heist Interrupted';
    const msg = victory
      ? 'You cracked the vault and escaped through a hallway of confused lasers.'
      : 'You escaped. The museum stays smug. Next run will be different.';

    const missionLine = missionOk
      ? `Mission complete ✅ (+${missionReward} gems)`
      : 'Mission not complete (no bonus this time)';

    const content = `
      <h2>${title}</h2>
      <p>${msg}</p>
      <div class="shop-item">
        <div class="title">Run Summary</div>
        <div class="desc">
          Accuracy: <strong>${(accuracy*100).toFixed(0)}%</strong><br>
          Gems earned: <strong>💎 ${totalEarned}</strong><br>
          Best streak: <strong>${state.profile.stats.bestStreak || 0}</strong><br>
          ${missionLine}
        </div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
        <button id="end-close">Close</button>
        <button id="end-shop">Open Shop</button>
        <button id="end-report">Report</button>
        <button id="end-new">New Heist</button>
      </div>
    `;
    UI.openModal('#replay-modal', content);

    document.getElementById('end-close').onclick = ()=>UI.closeModal('#replay-modal');
    document.getElementById('end-shop').onclick = ()=>{ UI.closeModal('#replay-modal'); openShop(); };
    document.getElementById('end-report').onclick = ()=>{ UI.closeModal('#replay-modal'); UI.renderReport(state.profile); };
    document.getElementById('end-new').onclick = ()=>{
      UI.closeModal('#replay-modal');
      UI.renderWingSelect((wingId)=> startRun(wingId));
    };
  }

  // ---------------- Drawing ----------------
  function drawBackground(room){
    // Subtle animated background noise / stars
    const t = performance.now()/1000;
    ctx.fillStyle = '#0a0d18';
    ctx.fillRect(0,0,WIDTH,HEIGHT);

    // gradient floor
    const g = ctx.createLinearGradient(0,0,WIDTH,HEIGHT);
    const a = room.theme.a, b = room.theme.b;
    g.addColorStop(0, hexAlpha(a, 0.10));
    g.addColorStop(1, hexAlpha(b, 0.06));
    ctx.fillStyle = g;
    ctx.fillRect(0,0,WIDTH,HEIGHT);

    // dots
    for(let i=0;i<50;i++){
      const x = (i*97 % WIDTH) + (Math.sin(t + i)*8);
      const y = (i*57 % HEIGHT) + (Math.cos(t*0.7 + i)*6);
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      ctx.fillRect(x,y,2,2);
    }
  }

  function hexAlpha(hex, a){
    // hex like #rrggbb
    if(!hex || hex[0] !== '#') return `rgba(255,255,255,${a})`;
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function drawWalls(){
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, WIDTH-100, HEIGHT-100);
  }

  function drawTerminal(room){
    const t = performance.now()/1000;
    const r = room.terminal;

    // glow
    ctx.fillStyle = hexAlpha(room.theme.a, 0.10);
    ctx.fillRect(r.x-r.w/2-10, r.y-r.h/2-10, r.w+20, r.h+20);

    ctx.fillStyle = 'rgba(17,23,42,0.85)';
    roundRect(r.x-r.w/2, r.y-r.h/2, r.w, r.h, 12);
    ctx.fill();

    ctx.strokeStyle = hexAlpha(room.theme.a, 0.55);
    ctx.stroke();

    // display line
    ctx.fillStyle = hexAlpha(room.theme.a, 0.9);
    ctx.font = '16px ui-sans-serif, system-ui';
    const label = room.complete ? 'ACCESS GRANTED' : (room.rhythmMode ? 'RHYTHM LOCK' : 'HACK TERMINAL');
    ctx.fillText(label, r.x - r.w/2 + 14, r.y - 6);

    ctx.fillStyle = 'rgba(229,236,255,0.75)';
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.fillText(`${obstacleName(room.obstacle)} • ${topicLabel(room.topic)}`, r.x - r.w/2 + 14, r.y + 16);

    // pulse dot
    ctx.beginPath();
    ctx.fillStyle = hexAlpha(room.theme.b, 0.9);
    ctx.arc(r.x + r.w/2 - 18, r.y - r.h/2 + 18, 6 + Math.sin(t*4)*1.5, 0, Math.PI*2);
    ctx.fill();
  }

  function drawGems(room){
    room.gems.forEach(g=>{
      if(g.collected) return;
      const bob = Math.sin((performance.now()/300) + g.bob) * 3;
      ctx.fillStyle = 'rgba(106,240,198,0.18)';
      ctx.beginPath();
      ctx.arc(g.x, g.y + bob, g.r + 8, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = 'rgba(106,240,198,0.85)';
      ctx.beginPath();
      ctx.moveTo(g.x, g.y + bob - g.r);
      ctx.lineTo(g.x + g.r, g.y + bob);
      ctx.lineTo(g.x, g.y + bob + g.r);
      ctx.lineTo(g.x - g.r, g.y + bob);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawSentry(room, dt){
    if(!room.sentry) return;
    const s = room.sentry;

    if(s.disabledMs > 0){
      // Draw faint disabled sentry
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r+4, 0, Math.PI*2);
      ctx.fill();
      return;
    }

    ctx.fillStyle = 'rgba(255,107,107,0.22)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r+10, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,107,107,0.85)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = 'rgba(12,15,26,0.85)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 4, 0, Math.PI*2);
    ctx.fill();
  }

  function drawExits(room){
    if(!room.complete || !room.exits) return;
    const leftDoor = { x: 140, y: 90, w: 190, h: 68 };
    const rightDoor = { x: WIDTH-140, y: 90, w: 190, h: 68 };

    room.exitRects = { left:leftDoor, right:rightDoor };

    drawDoor(leftDoor, room.exits.left, room.theme, true);
    drawDoor(rightDoor, room.exits.right, room.theme, false);
  }

  function drawDoor(rect, pick, theme, isLeft){
    const x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    ctx.fillStyle = 'rgba(17,23,42,0.85)';
    roundRect(x-w/2, y-h/2, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = isLeft ? hexAlpha(theme.a, 0.65) : hexAlpha(theme.b, 0.65);
    ctx.stroke();

    ctx.font = '13px ui-sans-serif, system-ui';
    ctx.fillStyle = 'rgba(229,236,255,0.85)';
    const kind = pick.kind === 'spicy' ? 'Wildcard' : 'Safe';
    ctx.fillText(`${kind} Route`, x - w/2 + 14, y - 6);
    ctx.fillStyle = 'rgba(229,236,255,0.75)';
    ctx.fillText(`${topicLabel(pick.topic)}`, x - w/2 + 14, y + 14);

    const bonus = pick.bonus ? `+${pick.bonus}💎` : '+0💎';
    ctx.fillStyle = pick.kind === 'spicy' ? 'rgba(255,179,71,0.9)' : 'rgba(122,240,155,0.9)';
    ctx.fillText(bonus, x + w/2 - 60, y + 14);
  }

  function drawMirror(room){
    if(!room.mirrorUntil) return;
    if(performance.now() > room.mirrorUntil) return;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = 'rgba(240,141,255,0.8)';
    ctx.fillStyle = 'rgba(240,141,255,0.08)';
    roundRect(WIDTH/2 - 150, HEIGHT/2 - 120, 300, 240, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(229,236,255,0.85)';
    ctx.font = '14px ui-sans-serif, system-ui';
    ctx.fillText('Mirror Math', WIDTH/2 - 45, HEIGHT/2 - 88);

    ctx.fillStyle = 'rgba(229,236,255,0.70)';
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.fillText('Undo the same step on both sides.', WIDTH/2 - 122, HEIGHT/2 - 64);

    // Decorative balance bar
    ctx.strokeStyle = 'rgba(106,240,198,0.55)';
    ctx.beginPath();
    ctx.moveTo(WIDTH/2 - 110, HEIGHT/2);
    ctx.lineTo(WIDTH/2 + 110, HEIGHT/2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(WIDTH/2 - 70, HEIGHT/2 + 26, 18, 0, Math.PI*2);
    ctx.arc(WIDTH/2 + 70, HEIGHT/2 + 26, 18, 0, Math.PI*2);
    ctx.stroke();

    ctx.restore();
  }

  function roundRect(x,y,w,h,r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

  function drawPlayer(){
    const trailLen = getTrailLength();
    player.trail.push({ x: player.x, y: player.y, life: 1 });
    if(player.trail.length > trailLen) player.trail.shift();

    const color = getOutfitColor();

    // trail
    for(let i=0;i<player.trail.length;i++){
      const p = player.trail[i];
      const a = i/player.trail.length;
      ctx.fillStyle = hexAlpha(color, 0.10 + a*0.25);
      ctx.fillRect(p.x-4, p.y-4, 8, 8);
    }

    // body
    ctx.fillStyle = hexAlpha(color, 0.85);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
    ctx.fill();

    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(player.x-5, player.y-6, 5, 0, Math.PI*2);
    ctx.fill();
  }

  function getOutfitColor(){
    const o = state.profile.equipped?.outfit || 'Stealth Hoodie';
    const meta = Content.cosmeticMeta?.outfits?.[o];
    return meta?.color || '#6af0c6';
  }

  function getTrailLength(){
    const t = state.profile.equipped?.trail || 'Neon Wisp';
    const meta = Content.cosmeticMeta?.trails?.[t];
    return meta?.length || 18;
  }


    ctx.fillStyle = 'rgba(17,23,42,0.85)';
    roundRect(r.x-r.w/2, r.y-r.h/2, r.w, r.h, 12);
    ctx.fill();

    ctx.strokeStyle = hexAlpha(room.theme.a, 0.55);
    ctx.stroke();

    // display line
    ctx.fillStyle = hexAlpha(room.theme.a, 0.9);
    ctx.font = '16px ui-sans-serif, system-ui';
    const label = room.complete ? 'ACCESS GRANTED' : (room.rhythmMode ? 'RHYTHM LOCK' : 'HACK TERMINAL');
    ctx.fillText(label, r.x - r.w/2 + 14, r.y - 6);

    ctx.fillStyle = 'rgba(229,236,255,0.75)';
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.fillText(`${obstacleName(room.obstacle)} • ${topicLabel(room.topic)}`, r.x - r.w/2 + 14, r.y + 16);

    // pulse dot
    ctx.beginPath();
    ctx.fillStyle = hexAlpha(room.theme.b, 0.9);
    ctx.arc(r.x + r.w/2 - 18, r.y - r.h/2 + 18, 6 + Math.sin(t*4)*1.5, 0, Math.PI*2);
    ctx.fill();
  }

  function drawGems(room){
    room.gems.forEach(g=>{
      if(g.collected) return;
      const bob = Math.sin((performance.now()/300) + g.bob) * 3;
      ctx.fillStyle = 'rgba(106,240,198,0.18)';
      ctx.beginPath();
      ctx.arc(g.x, g.y + bob, g.r + 8, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = 'rgba(106,240,198,0.85)';
      ctx.beginPath();
      ctx.moveTo(g.x, g.y + bob - g.r);
      ctx.lineTo(g.x + g.r, g.y + bob);
      ctx.lineTo(g.x, g.y + bob + g.r);
      ctx.lineTo(g.x - g.r, g.y + bob);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawSentry(room, dt){
    if(!room.sentry) return;
    const s = room.sentry;

    if(s.disabledMs > 0){
      // Draw faint disabled sentry
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r+4, 0, Math.PI*2);
      ctx.fill();
      return;
    }

    ctx.fillStyle = 'rgba(255,107,107,0.22)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r+10, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,107,107,0.85)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = 'rgba(12,15,26,0.85)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 4, 0, Math.PI*2);
    ctx.fill();
  }

  function drawExits(room){
    if(!room.complete || !room.exits) return;
    const leftDoor = { x: 140, y: 90, w: 190, h: 68 };
    const rightDoor = { x: WIDTH-140, y: 90, w: 190, h: 68 };

    room.exitRects = { left:leftDoor, right:rightDoor };

    drawDoor(leftDoor, room.exits.left, room.theme, true);
    drawDoor(rightDoor, room.exits.right, room.theme, false);
  }

  function drawDoor(rect, pick, theme, isLeft){
    const x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    ctx.fillStyle = 'rgba(17,23,42,0.85)';
    roundRect(x-w/2, y-h/2, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = isLeft ? hexAlpha(theme.a, 0.65) : hexAlpha(theme.b, 0.65);
    ctx.stroke();

    ctx.font = '13px ui-sans-serif, system-ui';
    ctx.fillStyle = 'rgba(229,236,255,0.85)';
    const kind = pick.kind === 'spicy' ? 'Wildcard' : 'Safe';
    ctx.fillText(`${kind} Route`, x - w/2 + 14, y - 6);
    ctx.fillStyle = 'rgba(229,236,255,0.75)';
    ctx.fillText(`${topicLabel(pick.topic)}`, x - w/2 + 14, y + 14);

    const bonus = pick.bonus ? `+${pick.bonus}💎` : '+0💎';
    ctx.fillStyle = pick.kind === 'spicy' ? 'rgba(255,179,71,0.9)' : 'rgba(122,240,155,0.9)';
    ctx.fillText(bonus, x + w/2 - 60, y + 14);
  }

  function drawMirror(room){
    if(!room.mirrorUntil) return;
    if(performance.now() > room.mirrorUntil) return;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = 'rgba(240,141,255,0.8)';
    ctx.fillStyle = 'rgba(240,141,255,0.08)';
    roundRect(WIDTH/2 - 150, HEIGHT/2 - 120, 300, 240, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(229,236,255,0.85)';
    ctx.font = '14px ui-sans-serif, system-ui';
    ctx.fillText('Mirror Math', WIDTH/2 - 45, HEIGHT/2 - 88);

    ctx.fillStyle = 'rgba(229,236,255,0.70)';
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.fillText('Undo the same step on both sides.', WIDTH/2 - 122, HEIGHT/2 - 64);

    // Decorative balance bar
    ctx.strokeStyle = 'rgba(106,240,198,0.55)';
    ctx.beginPath();
    ctx.moveTo(WIDTH/2 - 110, HEIGHT/2);
    ctx.lineTo(WIDTH/2 + 110, HEIGHT/2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(WIDTH/2 - 70, HEIGHT/2 + 26, 18, 0, Math.PI*2);
    ctx.arc(WIDTH/2 + 70, HEIGHT/2 + 26, 18, 0, Math.PI*2);
    ctx.stroke();

    ctx.restore();
  }

  function roundRect(x,y,w,h,r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

  function drawPlayer(){
    const trailLen = getTrailLength();
    player.trail.push({ x: player.x, y: player.y, life: 1 });
    if(player.trail.length > trailLen) player.trail.shift();

    const color = getOutfitColor();

    // trail
    for(let i=0;i<player.trail.length;i++){
      const p = player.trail[i];
      const a = i/player.trail.length;
      ctx.fillStyle = hexAlpha(color, 0.10 + a*0.25);
      ctx.fillRect(p.x-4, p.y-4, 8, 8);
    }

    // body
    ctx.fillStyle = hexAlpha(color, 0.85);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
    ctx.fill();

    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(player.x-5, player.y-6, 5, 0, Math.PI*2);
    ctx.fill();
  }

  function getOutfitColor(){
    const o = state.profile.equipped?.outfit || 'Stealth Hoodie';
    const meta = Content.cosmeticMeta?.outfits?.[o];
    return meta?.color || '#6af0c6';
  }

  function getTrailLength(){
    const t = state.profile.equipped?.trail || 'Neon Wisp';
    const meta = Content.cosmeticMeta?.trails?.[t];
    return meta?.length || 18;
  }

  function drawParticles(dt){
    const parts = state.particles;
    for(let i=parts.length-1;i>=0;i--){
      const p = parts[i];
      p.vy += 20*dt;
      p.x += p.vx*dt;
      p.y += p.vy*dt;
      p.life -= dt;
      if(p.life <= 0){ parts.splice(i,1); continue; }
      ctx.fillStyle = hexAlpha(p.color, clamp(p.life,0,1));
      ctx.fillRect(p.x, p.y, 3, 3);
    }
  }

  function spawnBurst(x,y,color){
    for(let i=0;i<22;i++){
      const a = Math.random()*Math.PI*2;
      const sp = 80 + Math.random()*160;
      state.particles.push({
        x, y,
        vx: Math.cos(a)*sp,
        vy: Math.sin(a)*sp,
        life: 0.6 + Math.random()*0.4,
        color
      });
    }
  }

  function drawHUD(){
    if(!state.run){
      ctx.fillStyle = 'rgba(229,236,255,0.85)';
      ctx.font = '18px ui-sans-serif, system-ui';
      ctx.fillText('Start a heist. Crack locks. Steal time. Learn math.', 120, HEIGHT - 34);
      ctx.font = '12px ui-sans-serif, system-ui';
      ctx.fillStyle = 'rgba(229,236,255,0.65)';
      ctx.fillText('Tip: walk to the terminal and press E to hack. Collect gems in the room.', 120, HEIGHT - 16);
      return;
    }

    // Bars
    const focus = state.run.focus;
    const time = state.run.timerMs;

    const x = 60, y = HEIGHT - 52;

    // Focus bar
    drawBar(x, y, 220, 10, focus/100, 'Focus');
    // Time bar (relative)
    const timePct = clamp(time/90000, 0, 1);
    drawBar(x, y+16, 220, 10, timePct, 'Time');

    // Text stats
    ctx.font = '14px ui-sans-serif, system-ui';
    ctx.fillStyle = 'rgba(229,236,255,0.85)';
    ctx.fillText(`Room ${state.room.index+1}/${NORMAL_ROOMS+1} • Streak ${state.run.streak} • ×${state.run.combo}`, x + 250, y + 10);

    ctx.fillStyle = 'rgba(229,236,255,0.75)';
    ctx.fillText(`Run Gems: 💎 ${state.run.gemsRun}`, x + 250, y + 28);

    // Mission
    ctx.fillStyle = 'rgba(229,236,255,0.75)';
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.fillText(`Mission: ${state.run.mission.title} (${state.run.mission.reward}💎)`, x + 250, y + 44);
  }

  function drawBar(x,y,w,h,pct,label){
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(x,y,w,h,999);
    ctx.fill();
    ctx.fillStyle = 'rgba(29,44,66,0.85)';
    ctx.strokeStyle = 'rgba(29,44,66,0.85)';
    ctx.stroke();

    ctx.fillStyle = 'rgba(106,240,198,0.75)';
    roundRect(x,y,w*pct,h,999);
    ctx.fill();

    ctx.font = '10px ui-sans-serif, system-ui';
    ctx.fillStyle = 'rgba(229,236,255,0.70)';
    ctx.fillText(label, x, y-3);
  }

  function drawInteractPrompt(){
    if(!state.run || state.scene !== 'explore' || !state.room) return;
    const room = state.room;

    const nearTerminal = isNearTerminal(room);
    const nearDoor = room.complete && room.exitRects && (isNearRect(room.exitRects.left) || isNearRect(room.exitRects.right));
    const nearGem = room.gems.some(g=>!g.collected && dist(player.x,player.y,g.x,g.y) < 26);

    ctx.font = '14px ui-sans-serif, system-ui';
    ctx.fillStyle = 'rgba(229,236,255,0.80)';

    if(nearDoor){
      ctx.fillText('Walk into a door to choose your route.', 60, 78);
    } else if(nearTerminal && !room.complete){
      ctx.fillText('Press E to hack the terminal.', 60, 78);
    } else if(nearGem){
      ctx.fillText('Collect gems by touching them.', 60, 78);
    }
  }

  // ---------------- Input ----------------
  document.addEventListener('keydown', (e)=>{
    keys[e.key] = true;

    if(e.key === 'Escape'){
      if(state.scene === 'challenge'){
        leaveChallenge();
      } else {
        togglePause();
      }
    }

    if(e.key === '~'){
      state.debug = !state.debug;
      debugOverlay.classList.toggle('hidden', !state.debug);
    }

    if(e.key.toLowerCase() === 'h' && state.scene === 'challenge'){
      requestHint();
    }

    if(e.key.toLowerCase() === 'e'){
      tryInteract();
    }
  });

  document.addEventListener('keyup', (e)=>{ keys[e.key] = false; });

  // Touch controls (coarse pointers)
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
    document.getElementById('touch-interact').onclick = ()=> tryInteract();
    document.getElementById('touch-submit').onclick = ()=> submitAnswer(document.getElementById('answer-input').value.trim());
  }

  function tryInteract(){
    ensureAudio();
    if(!state.run || state.scene !== 'explore') return;

    const room = state.room;
    if(!room) return;

    if(room.complete && room.exitRects){
      if(isNearRect(room.exitRects.left)) return goToNextRoom('left');
      if(isNearRect(room.exitRects.right)) return goToNextRoom('right');
    }

    if(!room.complete && isNearTerminal(room)){
      openChallenge();
    }
  }

  function togglePause(){
    if(!state.run) return;
    if(state.scene === 'paused'){
      state.scene = 'explore';
      UI.closeModal('#menu-modal');
      toast('Resume', 'neutral');
      return;
    }

    if(state.scene === 'challenge'){
      // Pause from within a lock just hides the panel. Timer continues lightly.
      UI.hideProblem();
    }

    }

    if(state.scene === 'challenge'){
      // Pause from within a lock just hides the panel. Timer continues lightly.
      UI.hideProblem();
    }

    state.scene = 'paused';
    UI.openModal('#menu-modal', `
      <h2>Paused</h2>
      <p class="small-muted">Your brain deserves breaks.</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="resume">Resume</button>
        <button id="open-shop">Shop</button>
        <button id="open-report">Report</button>
      </div>
    `);
    document.getElementById('resume').onclick = ()=>togglePause();
    document.getElementById('open-shop').onclick = ()=>{ UI.closeModal('#menu-modal'); openShop(); };
    document.getElementById('open-report').onclick = ()=>{ UI.closeModal('#menu-modal'); UI.renderReport(state.profile); };
  }

  function isNearTerminal(room){
    const r = room.terminal;
    return dist(player.x, player.y, r.x, r.y) < 80;
  }

  function isNearRect(rect){
    if(!rect) return false;
    const left = rect.x - rect.w/2;
    const right = rect.x + rect.w/2;
    const top = rect.y - rect.h/2;
    const bottom = rect.y + rect.h/2;

    const px = player.x, py = player.y;
    const dx = (px < left) ? left - px : (px > right) ? px - right : 0;
    const dy = (py < top) ? top - py : (py > bottom) ? py - bottom : 0;
    return Math.hypot(dx,dy) < 18;
  }

  // ---------------- Loop ----------------
  let lastTs = 0;
  function loop(ts){
    requestAnimationFrame(loop);
    if(!lastTs) lastTs = ts;
    const dt = clamp((ts - lastTs) / 1000, 0, 0.05);
    lastTs = ts;

    update(dt);
    render(dt);
  }
  requestAnimationFrame(loop);


  function handleTimeout(){
    if(state.timeoutArmed) return;
    state.timeoutArmed = true;

    const p = state.currentProblem;
    if(!p || !state.run || !state.room) return;

    const room = state.room;

    // Count the timeout as an attempt (kids feel the pressure, but the game stays fair).
    state.run.stats.attempts += 1;
    state.run.stats.topics.push(room.topic);
    state.profile.stats.totalLocks = (state.profile.stats.totalLocks || 0) + 1;

    // Penalties are gentle, but real.
    state.run.streak = 0;
    state.run.combo = 1;
    state.run.focus = clamp(state.run.focus - 5, 0, 100);
    state.run.timerMs = Math.max(0, state.run.timerMs - 900);

    playFail();
    UI.showFeedback('Time!', false);

    Progression.record(state.profile, room.topic, {
      correct: false,
      timeMs: p.timeLimitMs || 0,
      hintsUsed: state.hintStep,
      errorType: 'timeout'
    });
    state.profile = StorageAPI.save(state.profile);
    updateCuratorPersonality();

    if(state.sentryChallenge){
      // Timeout ends a sentry hack.
      UI.hideProblem();
      state.scene = 'explore';
      state.sentryChallenge = false;
      if(room.sentry) room.sentry.cooldownMs = 8500;
      toast('Alarm went off. You escaped, barely.', 'bad');
      return;
    }

    if(p.mode === 'rhythm'){
      // In rhythm locks, you move on, but you don't get paid.
      toast('Missed the beat.', 'bad');
      room.locksSolved += 1;
      if(room.locksSolved >= room.requiredLocks){
        completeRoom();
      } else {
        setTimeout(()=>{ if(state.scene==='challenge') nextLock(); }, 220);
      }
      return;
    }

    // Fallback: reset timer for another attempt.
    state.timeRemainingMs = p.timeLimitMs || 0;
    state.timeoutArmed = false;
  }

  function update(dt){
    if(!state.run) return;

    // Timer and focus drain
    if(state.scene !== 'paused' && state.scene !== 'ended'){
      const drain = (state.scene === 'challenge') ? 0.6 : 0.9; // per second
      state.run.focus = clamp(state.run.focus - drain*dt, 0, 100);

      state.run.timerMs = Math.max(0, state.run.timerMs - dt*1000);

      // Slight regen if you're doing well
      if(state.run.streak >= 2 && state.scene === 'explore'){
        state.run.focus = clamp(state.run.focus + 0.25, 0, 100);
      }
    }

    // Movement only during explore
    if(state.scene === 'explore'){
      const mvx = (keys['ArrowRight']||keys['d']?1:0) - (keys['ArrowLeft']||keys['a']?1:0) + touchDir.x;
      const mvy = (keys['ArrowDown']||keys['s']?1:0) - (keys['ArrowUp']||keys['w']?1:0) + touchDir.y;
      const mag = Math.hypot(mvx, mvy) || 1;

      player.x += (mvx/mag) * player.speed * dt;
      player.y += (mvy/mag) * player.speed * dt;

      player.x = clamp(player.x, 70, WIDTH-70);
      player.y = clamp(player.y, 70, HEIGHT-70);

      // Collect gems
      state.room.gems.forEach(g=>{
        if(g.collected) return;
        if(dist(player.x, player.y, g.x, g.y) < 24){
          g.collected = true;
          state.run.gemsRun += g.value;
          spawnBurst(g.x, g.y, state.room.theme.a);
          playTone(840, 0.08, 0.08);
          toast('+1 gem', 'good');
        }
      });

      // Update sentry
      if(state.room.sentry){
        const s = state.room.sentry;
        if(s.disabledMs > 0) s.disabledMs = Math.max(0, s.disabledMs - dt*1000);
        if(s.cooldownMs > 0) s.cooldownMs = Math.max(0, s.cooldownMs - dt*1000);

        if(s.disabledMs <= 0){
          s.x += s.vx * dt;
          if(s.x < 120){ s.x = 120; s.vx *= -1; }
          if(s.x > WIDTH-120){ s.x = WIDTH-120; s.vx *= -1; }
        }

        // Collision triggers panic hack
        if(s.cooldownMs <= 0 && s.disabledMs <= 0){
          if(dist(player.x, player.y, s.x, s.y) < (player.radius + s.r + 2)){
            s.cooldownMs = 6000;
            state.run.sentryTouched = true;
            toast('Sentry spotted you! Panic hack!', 'bad');
            playTone(160, 0.20, 0.12);
            openSentryChallenge();
          }
        }
      }
    }

    // Timed lock countdown
    if(state.scene === 'challenge' && state.currentProblem && state.currentProblem.timeLimitMs){
      state.timeRemainingMs = Math.max(0, state.timeRemainingMs - dt*1000);
      UI.updateTimeBar(state.timeRemainingMs / state.currentProblem.timeLimitMs);

      // Auto-hint (only if time is not extremely short)
      if(state.autoHintAt && performance.now() > state.autoHintAt){
        if(state.currentProblem.hints && state.hintStep < state.currentProblem.hints.length){
          requestHint();
          state.autoHintAt = 0;
        }
      }

      if(state.timeRemainingMs <= 0){
        handleTimeout();
      }
    } else if(state.scene === 'challenge' && state.currentProblem){
      // Non-timed auto-hint
      if(state.autoHintAt && performance.now() > state.autoHintAt){
        if(state.currentProblem.hints && state.hintStep < state.currentProblem.hints.length){
          requestHint();
          state.autoHintAt = 0;
        }
      }
    }

    // End conditions
    if(state.run.focus <= 0 || state.run.timerMs <= 0){
      endRun(false);
    }

    if(state.debug) updateDebug(dt);
  }

  function render(dt){
    if(!state.room){
      ctx.fillStyle = '#0a0d18';
      ctx.fillRect(0,0,WIDTH,HEIGHT);
      drawHUD();
      return;
    }

    const room = state.room;

    // Screen shake
    let sx = 0, sy = 0;
    if(state.shake > 0){
      state.shake = Math.max(0, state.shake - dt*8);
      sx = (Math.random()-0.5) * state.shake * 6;
      sy = (Math.random()-0.5) * state.shake * 6;
    }

    ctx.save();
    ctx.translate(sx, sy);

    drawBackground(room);
    drawWalls();
    drawTerminal(room);
    drawMirror(room);
    drawGems(room);
    drawExits(room);
    drawSentry(room, dt);
    drawPlayer();
    drawParticles(dt);
    drawInteractPrompt();

    ctx.restore();

    drawHUD();
  }

  function updateDebug(dt){
    const topic = state.room ? state.room.topic : 'none';
    const tData = state.profile.mastery && state.profile.mastery[topic] ? state.profile.mastery[topic] : { recent:[], times:[], hints:0, attempts:0, errorTypes:[] };
    const est = Progression.estimate(tData);
    debugOverlay.innerHTML =
      `FPS ~${Math.round(1/dt)}<br>` +
      `Scene: ${state.scene}<br>` +
      `Wing: ${state.run ? state.run.wing.name : '-'}<br>` +
      `Topic: ${topic}<br>` +
      `Difficulty: ${Progression.difficulty(tData)}<br>` +
      `Accuracy: ${(est.accuracy*100).toFixed(0)}%<br>` +
      `Median: ${Math.round(est.medianTime)}ms<br>` +
      `Hint rate: ${est.hintRate.toFixed(2)}<br>` +
      `Last error: ${state.lastError || '-'}<br>` +
      `Sentry touched: ${state.run ? state.run.sentryTouched : false}`;
  }

  function updateCuratorPersonality(){
    if(!state.run || !state.room) return;

    const m = Progression.masteryFor(state.profile, state.room.topic);
    const est = Progression.estimate(m);
    const errors = m.errorTypes || [];

    let mode = 'default';
    if(est.hintRate > 0.45) mode = 'hintHeavy';
    else if(est.medianTime < 2600) mode = 'speedy';
    else if(errors.slice(-4).includes('sign error')) mode = 'signSlip';

    statusText.textContent = choice(Content.curatorPersonalities[mode] || Content.curatorPersonalities.default);
  }

  // ---------------- UI buttons ----------------
  document.getElementById('start-run').onclick = ()=>{
    ensureAudio();
    UI.renderWingSelect((wingId)=> startRun(wingId));
  };

  document.getElementById('heist-board').onclick = ()=> UI.renderHeistBoard(state.profile);

  document.getElementById('report-screen-btn').onclick = ()=> UI.renderReport(state.profile);

  document.getElementById('settings-btn').onclick = ()=> UI.renderSettings(state.profile, applySettings);

  document.getElementById('mute-btn').onclick = ()=>{
    state.profile.settings.mute = !state.profile.settings.mute;
    state.profile = StorageAPI.save(state.profile);
    applySettings(state.profile.settings);
    toast(state.profile.settings.mute ? 'Muted' : 'Sound on', 'neutral');
  };

  document.getElementById('shop-btn').onclick = ()=> openShop();

  function openShop(){
    UI.renderShop(state.profile, buyItem, equipItem);
  }

  function buyItem(item){
    if(!item) return;
    const cost = item.price || 0;
    if((state.profile.gems || 0) < cost){
      toast('Not enough gems yet.', 'bad');
      playTone(140, 0.18, 0.08);
      return;
    }

    const spend = StorageAPI.spendGems(state.profile, cost);
    if(!spend.ok){
      toast('Not enough gems.', 'bad');
      return;
    }
    state.profile = spend.state;

    if(item.type === 'gadget'){
      const g = state.profile.gadgets[item.name] || { owned:false, charges:0, max:1 };
      g.owned = true;
      g.charges = g.max;
      state.profile.gadgets[item.name] = g;
      toast(`Bought gadget: ${item.name}`, 'good');
    } else if(item.type === 'cosmetic'){
      const list = state.profile.cosmetics[item.category] || [];
      if(!list.includes(item.name)) list.push(item.name);
      state.profile.cosmetics[item.category] = list;
      toast(`Bought: ${item.name}`, 'good');
      equipItem(item); // auto-equip
    }

    state.profile = StorageAPI.save(state.profile);
    updateTopBar();
    UI.renderShop(state.profile, buyItem, equipItem);
  }

  function equipItem(item){
    if(!item || item.type !== 'cosmetic') return;
    const cat = item.category;
    if(cat === 'outfits') state.profile.equipped.outfit = item.name;
    if(cat === 'trails') state.profile.equipped.trail = item.name;
    if(cat === 'poses') state.profile.equipped.pose = item.name;
    state.profile = StorageAPI.save(state.profile);
    toast(`Equipped: ${item.name}`, 'good');
    UI.renderShop(state.profile, buyItem, equipItem);
  }

  // Init top bar
  updateTopBar();
})();
