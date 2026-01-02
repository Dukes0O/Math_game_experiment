(function(){
  const qs = (sel)=>document.querySelector(sel);
  const panel = qs('#question-panel');
  const titleEl = panel.querySelector('.q-title');
  const progressEl = panel.querySelector('.q-progress');
  const promptEl = panel.querySelector('.prompt');
  const choicesEl = panel.querySelector('.choices');
  const inputEl = qs('#answer-input');
  const submitBtn = qs('#submit-answer');
  const hintsEl = panel.querySelector('.hints');
  const feedbackEl = panel.querySelector('.feedback');
  const gadgetRow = panel.querySelector('.gadget-row');
  const hintBtn = qs('#hint-btn');
  const leaveBtn = qs('#leave-btn');

  const timebar = panel.querySelector('.timebar');
  const timebarFill = qs('#q-timebar');

  const toast = qs('#toast');

  let currentProblem = null;
  let onSubmitCb = null;
  let onHintRequest = null;
  let onGadget = null;
  let onLeave = null;
  let allowChoices = true;
  let preferFree = false;

  function showPanel(){ panel.classList.remove('hidden'); }
  function hidePanel(){ panel.classList.add('hidden'); }

  function setHeader(problem){
    const ui = (problem && problem.ui) ? problem.ui : {};
    titleEl.textContent = ui.title || 'Lock';
    progressEl.textContent = ui.progress || '';
  }

  function setTimebarVisible(visible){
    timebar.style.display = visible ? 'block' : 'none';
  }

  function renderProblem(problem, allowChoice, preferFreeResponse){
    showPanel();
    currentProblem = problem;
    allowChoices = allowChoice;
    preferFree = preferFreeResponse;

    setHeader(problem);

    promptEl.textContent = problem.prompt;
    choicesEl.innerHTML = '';
    hintsEl.innerHTML = '';
    feedbackEl.textContent = '';

    const timed = !!problem.timeLimitMs;
    setTimebarVisible(timed);
    if(timed) updateTimeBar(1);

    const showChoices = allowChoice && (!preferFreeResponse || problem.mode === 'rhythm') && Array.isArray(problem.multiChoice);
    if(showChoices){
      drawChoices(problem.multiChoice);
    }

    inputEl.value = '';
    inputEl.disabled = (problem.mode === 'rhythm') && showChoices;
    submitBtn.disabled = inputEl.disabled;

    inputEl.focus();
    renderGadgets();
  }

  function drawChoices(options){
    choicesEl.innerHTML = '';
    const opts = [...options];
    opts.forEach(c=>{
      const btn = document.createElement('button');
      btn.textContent = c;
      btn.onclick = ()=>submitAnswer(c);
      choicesEl.appendChild(btn);
    });
  }

  function renderGadgets(){
    const profile = window.gameState?.profile;
    if(!profile){ gadgetRow.innerHTML=''; return; }
    gadgetRow.innerHTML = '';

    Object.entries(profile.gadgets||{}).forEach(([name, data])=>{
      if(!data.owned) return;
      const btn = document.createElement('button');
      btn.disabled = data.charges <= 0;
      btn.textContent = `${name} (${data.charges})`;
      btn.title = data.charges<=0 ? 'No charges left this run' : 'Use gadget';
      btn.onclick = ()=> onGadget && onGadget(name);
      gadgetRow.appendChild(btn);
    });
  }

  function showFeedback(msg, good){
    feedbackEl.textContent = msg;
    feedbackEl.style.color = good ? 'var(--success)' : 'var(--warning)';
  }

  function appendHint(text){
    const div = document.createElement('div');
    div.textContent = text;
    hintsEl.appendChild(div);
  }

  function submitAnswer(value){
    if(!currentProblem) return;
    onSubmitCb && onSubmitCb(value);
  }

  submitBtn.onclick = ()=>submitAnswer(inputEl.value.trim());
  inputEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter') submitAnswer(inputEl.value.trim()); });

  hintBtn.onclick = ()=>{ onHintRequest && onHintRequest(); };

  leaveBtn.onclick = ()=>{
    if(onLeave) onLeave();
    else hidePanel();
  };

  // Toast helper
  let toastTimer = null;
  function showToast(message, kind){
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    toast.style.borderColor = kind==='good' ? 'rgba(122,240,155,0.85)' : (kind==='bad' ? 'rgba(255,107,107,0.85)' : 'rgba(29,44,66,0.95)');

    if(toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>{
      toast.classList.remove('show');
    }, 1800);
  }

  function updateTimeBar(ratio){
    const r = Math.max(0, Math.min(1, ratio));
    timebarFill.style.width = (r*100).toFixed(1) + '%';
  }

  // Modal helpers
  function openModal(id, content){
    const modal = qs(id);
    modal.innerHTML = `<div class="card">${content}</div>`;
    modal.classList.remove('hidden');

    modal.onclick = (e)=>{
      if(e.target === modal) modal.classList.add('hidden');
    };
  }

  function closeModal(id){
    const modal = qs(id);
    modal.classList.add('hidden');
  }

  // Settings / Report / Board / Shop
  function renderSettings(state, onChange){
    const modal = qs('#settings-modal');
    modal.innerHTML = `<div class="card">
      <h2>Settings</h2>
      <p class="small-muted">These change visuals and comfort, not difficulty.</p>
      <label><input type="checkbox" id="hc"> High contrast</label><br>
      <label><input type="checkbox" id="lt"> Large text</label><br>
      <label><input type="checkbox" id="rm"> Reduce motion</label><br>
      <label><input type="checkbox" id="mute"> Mute sounds</label><br>
      <label><input type="checkbox" id="seeded"> Seeded RNG</label>
      <div style="margin-top:10px; display:flex; gap:8px; align-items:center;">
        <span class="small-muted">Seed</span>
        <input id="seed" type="number" min="1" step="1" style="width:120px; padding:8px; border-radius:10px; border:1px solid #1d2740; background:#0f1628; color:var(--text);" />
      </div>
      <div style="margin-top:14px; display:flex; gap:8px;">
        <button id="close-settings">Close</button>
        <button id="reset-save" title="Clears v2 save only">Reset Save</button>
      </div>
    </div>`;
    modal.classList.remove('hidden');

    modal.querySelector('#hc').checked = !!state.settings.highContrast;
    modal.querySelector('#lt').checked = !!state.settings.largeText;
    modal.querySelector('#rm').checked = !!state.settings.reduceMotion;
    modal.querySelector('#mute').checked = !!state.settings.mute;
    modal.querySelector('#seeded').checked = !!state.settings.seededRng;
    modal.querySelector('#seed').value = state.settings.seed || 42;

    modal.querySelector('#close-settings').onclick = ()=>modal.classList.add('hidden');
    modal.querySelector('#reset-save').onclick = ()=>{
      if(confirm('Reset save data (v2) and restart?')) {
        window.StorageAPI.reset();
        location.reload();
      }
    };

    ['hc','lt','rm','mute','seeded','seed'].forEach(id=>{
      modal.querySelector('#'+id).onchange = ()=>{
        state.settings.highContrast = modal.querySelector('#hc').checked;
        state.settings.largeText = modal.querySelector('#lt').checked;
        state.settings.reduceMotion = modal.querySelector('#rm').checked;
        state.settings.mute = modal.querySelector('#mute').checked;
        state.settings.seededRng = modal.querySelector('#seeded').checked;
        state.settings.seed = parseInt(modal.querySelector('#seed').value || '42', 10);
        onChange(state.settings);
      };
    });
  }

  function renderReport(state){
    const modal = qs('#report-modal');
    const rows = (state.sessions||[]).map(s=>{
      const when = new Date(s.timestamp).toLocaleString();
      const acc = (s.accuracy*100).toFixed(0)+'%';
      const mission = s.mission ? ` • Mission: ${s.mission}${s.missionComplete?' ✅':' ❌'}` : '';
      return `<li>${when} • Rooms ${s.roomsCleared||'?'} • Acc ${acc} • Hints ${s.hints||0}${mission}</li>`;
    }).join('');

    modal.innerHTML = `<div class="card">
      <h2>Session Report</h2>
      <p class="small-muted">Last 20 runs stored locally on this device.</p>
      <ul>${rows || '<li>No sessions yet.</li>'}</ul>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
        <button id="copy-json">Copy sessions as JSON</button>
        <button id="close-report">Close</button>
      </div>
    </div>`;
    modal.classList.remove('hidden');
    modal.onclick = (e)=>{ if(e.target===modal) modal.classList.add('hidden'); };

    modal.querySelector('#close-report').onclick = ()=>modal.classList.add('hidden');
    modal.querySelector('#copy-json').onclick = ()=>{
      navigator.clipboard.writeText(JSON.stringify(state.sessions||[], null, 2));
      showToast('Copied JSON to clipboard.', 'good');
    };
  }

  function masteryPct(state, topic){
    const m = (state.mastery && state.mastery[topic]) ? state.mastery[topic] : { correct:0, attempts:0 };
    return m.attempts ? Math.round((m.correct/m.attempts)*100) : 0;
  }

  function renderHeistBoard(state){
    const modal = qs('#menu-modal');

    const wingHtml = Content.wings.map(w=>{
      const topicRows = w.topics.map(t=>{
        const meta = Content.TOPIC_META[t] || {label:t};
        return `<div class="small-muted">${meta.icon || ''} ${meta.label}: <strong>${masteryPct(state, t)}%</strong></div>`;
      }).join('');

      return `<div class="shop-item">
        <div class="title">${w.name}</div>
        <div class="desc">${w.flavor}</div>
        ${topicRows}
      </div>`;
    }).join('');

    modal.innerHTML = `<div class="card">
      <h2>Heist Board</h2>
      <p class="small-muted">Pick a wing when you start a heist. The board shows what you've practiced.</p>
      <div class="grid">${wingHtml}</div>
      <div style="margin-top:14px;">
        <button id="close-menu">Close</button>
      </div>
    </div>`;
    modal.classList.remove('hidden');
    modal.onclick = (e)=>{ if(e.target===modal) modal.classList.add('hidden'); };
    modal.querySelector('#close-menu').onclick = ()=>modal.classList.add('hidden');
  }

  function renderShop(state, onBuy, onEquip){
    const modal = qs('#shop-modal');

    const itemsHtml = Content.shopItems.map(item=>{
      let owned = false;
      let canEquip = false;

      if(item.type === 'gadget'){
        owned = !!(state.gadgets && state.gadgets[item.name] && state.gadgets[item.name].owned);
      } else if(item.type === 'cosmetic'){
        const list = (state.cosmetics && state.cosmetics[item.category]) ? state.cosmetics[item.category] : [];
        owned = list.includes(item.name);
        canEquip = owned;
      }

      const btnText = owned ? (canEquip ? 'Equip' : 'Owned') : 'Buy';
      const disabled = owned && !canEquip;

      return `<div class="shop-item" data-id="${item.id}">
        <div class="title">${item.name}</div>
        <div class="desc">${item.desc}</div>
        <div class="row">
          <div class="price">💎 ${item.price}</div>
          <button class="shop-action" ${disabled?'disabled':''}>${btnText}</button>
        </div>
      </div>`;
    }).join('');

    modal.innerHTML = `<div class="card">
      <h2>Shop</h2>
      <p class="small-muted">Spend Gems you earn during runs. No internet, no accounts.</p>
      <div class="small-muted">Your Gems: <strong>💎 ${state.gems||0}</strong></div>
      <div class="grid" style="margin-top:10px;">${itemsHtml}</div>
      <div style="margin-top:14px; display:flex; gap:8px;">
        <button id="close-shop">Close</button>
      </div>
    </div>`;

    modal.classList.remove('hidden');
    modal.onclick = (e)=>{ if(e.target===modal) modal.classList.add('hidden'); };

    modal.querySelector('#close-shop').onclick = ()=>modal.classList.add('hidden');

    modal.querySelectorAll('.shop-item').forEach(el=>{
      const id = el.getAttribute('data-id');
      const item = Content.shopItems.find(x=>x.id===id);
      const actionBtn = el.querySelector('.shop-action');
      actionBtn.onclick = ()=>{
        if(!item) return;
        if(item.type === 'gadget'){
          const owned = !!(state.gadgets && state.gadgets[item.name] && state.gadgets[item.name].owned);
          if(owned) return;
          onBuy && onBuy(item);
        } else {
          const list = (state.cosmetics && state.cosmetics[item.category]) ? state.cosmetics[item.category] : [];
          const owned = list.includes(item.name);
          if(!owned) onBuy && onBuy(item);
          else onEquip && onEquip(item);
        }
      };
    });
  }

  function renderWingSelect(onSelect){
    const modal = qs('#boss-modal');
    const cards = Content.wings.map(w=>{
      const topics = w.topics.map(t=>{
        const meta = Content.TOPIC_META[t] || {label:t};
        return `${meta.icon || ''} ${meta.label}`;
      }).join(' • ');
      return `<div class="shop-item">
        <div class="title">${w.name}</div>
        <div class="desc">${w.flavor}</div>
        <div class="small-muted">Topics: ${topics}</div>
        <div class="row" style="margin-top:10px;">
          <button class="wing-select" data-wing="${w.id}">Start in this wing</button>
        </div>
      </div>`;
    }).join('');

    modal.innerHTML = `<div class="card">
      <h2>Choose a Wing</h2>
      <p class="small-muted">Each wing has different kinds of locks. Pick what you want to practice.</p>
      <div class="grid">${cards}</div>
      <div style="margin-top:14px;">
        <button id="close-wing">Cancel</button>
      </div>
    </div>`;
    modal.classList.remove('hidden');
    modal.onclick = (e)=>{ if(e.target===modal) modal.classList.add('hidden'); };
    modal.querySelector('#close-wing').onclick = ()=>modal.classList.add('hidden');

    modal.querySelectorAll('.wing-select').forEach(btn=>{
      btn.onclick = ()=>{
        const id = btn.getAttribute('data-wing');
        modal.classList.add('hidden');
        onSelect && onSelect(id);
      };
    });
  }

  // Public API
  window.UI = {
    showProblem(problem, allowChoice, preferFreeResponse, submitCb, hintCb, gadgetCb, leaveCb){
      onSubmitCb = submitCb;
      onHintRequest = hintCb;
      onGadget = gadgetCb;
      onLeave = leaveCb || null;
      renderProblem(problem, allowChoice, preferFreeResponse);
    },
    hideProblem(){ hidePanel(); currentProblem = null; },
    showHint(step){ if(currentProblem && currentProblem.hints && currentProblem.hints[step]) appendHint(currentProblem.hints[step]); },
    showFeedback,
    appendHint,
    updateTimeBar,
    showToast,
    openModal,
    closeModal,
    renderSettings,
    renderReport,
    renderHeistBoard,
    renderShop,
    renderWingSelect,
    revealChoices(problem){
      if(!allowChoices || !problem.multiChoice) return;
      drawChoices(problem.multiChoice);
    },
    rerenderGadgets(){ renderGadgets(); }
  };
})();
