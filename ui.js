(function(){
  const qs = (sel)=>document.querySelector(sel);
  const panel = qs('#question-panel');
  const promptEl = panel.querySelector('.prompt');
  const choicesEl = panel.querySelector('.choices');
  const inputEl = qs('#answer-input');
  const submitBtn = qs('#submit-answer');
  const hintsEl = panel.querySelector('.hints');
  const feedbackEl = panel.querySelector('.feedback');
  const gadgetRow = panel.querySelector('.gadget-row');

  let currentProblem = null;
  let onSubmitCb = null;
  let onHintRequest = null;
  let onGadget = null;
  let allowChoices = true;
  let preferFree = false;

  function renderProblem(problem, allowChoice, preferFreeResponse){
    panel.classList.remove('hidden');
    allowChoices = allowChoice;
    preferFree = preferFreeResponse;
    promptEl.textContent = problem.prompt;
    choicesEl.innerHTML='';
    hintsEl.innerHTML='';
    feedbackEl.textContent='';
    if(allowChoice && !preferFree && problem.multiChoice){
      drawChoices(problem.multiChoice);
    }
    inputEl.value='';
    inputEl.focus();
    renderGadgets();
  }

  function drawChoices(options){
    choicesEl.innerHTML='';
    const shuffled = [...options].sort(()=>Math.random()-0.5);
    shuffled.forEach(c=>{
      const btn = document.createElement('button');
      btn.textContent = c;
      btn.onclick = ()=>submitAnswer(c);
      choicesEl.appendChild(btn);
    });
  }

  function renderGadgets(){
    const state = window.gameState.profile;
    gadgetRow.innerHTML='';
    Object.entries(state.gadgets).forEach(([name, data])=>{
      if(!data.owned || data.charges<=0) return;
      const btn = document.createElement('button');
      btn.textContent = `${name} (${data.charges})`;
      btn.onclick = ()=>onGadget && onGadget(name);
      gadgetRow.appendChild(btn);
    });
  }

  function showFeedback(msg, good){
    feedbackEl.textContent = msg;
    feedbackEl.style.color = good? 'var(--success)':'var(--warning)';
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

  window.UI = {
    showProblem(problem, allowChoice, preferFreeResponse, submitCb, hintCb, gadgetCb){
      currentProblem = problem; onSubmitCb = submitCb; onHintRequest = hintCb; onGadget = gadgetCb;
      renderProblem(problem, allowChoice, preferFreeResponse);
    },
    hideProblem(){ panel.classList.add('hidden'); },
    showHint(step){ if(currentProblem && currentProblem.hints[step]) appendHint(currentProblem.hints[step]); },
    showFeedback,
    appendHint,
    openModal(id, content){
      const modal = qs(id);
      modal.innerHTML = `<div class="card">${content}</div>`;
      modal.classList.remove('hidden');
    },
    closeModal(id){ qs(id).classList.add('hidden'); },
    renderSettings(state, onChange){
      const modal = qs('#settings-modal');
      modal.innerHTML = `<div class="card">
        <h2>Settings</h2>
        <label><input type="checkbox" id="hc"> High contrast</label><br>
        <label><input type="checkbox" id="lt"> Large text</label><br>
        <label><input type="checkbox" id="rm"> Reduce motion</label><br>
        <label><input type="checkbox" id="seeded"> Seeded RNG</label>
        <div style="margin-top:10px;"><button id="close-settings">Close</button></div>
      </div>`;
      modal.classList.remove('hidden');
      modal.querySelector('#hc').checked = state.settings.highContrast;
      modal.querySelector('#lt').checked = state.settings.largeText;
      modal.querySelector('#rm').checked = state.settings.reduceMotion;
      modal.querySelector('#seeded').checked = state.settings.seededRng;
      modal.querySelector('#close-settings').onclick = ()=>modal.classList.add('hidden');
      ['hc','lt','rm','seeded'].forEach(id=>{
        modal.querySelector('#'+id).onchange = ()=>{
          state.settings.highContrast = modal.querySelector('#hc').checked;
          state.settings.largeText = modal.querySelector('#lt').checked;
          state.settings.reduceMotion = modal.querySelector('#rm').checked;
          state.settings.seededRng = modal.querySelector('#seeded').checked;
          onChange(state.settings);
        };
      });
    },
    renderReport(state){
      const modal = qs('#report-modal');
      const rows = state.sessions.map(s=>`<li>${new Date(s.timestamp).toLocaleString()} • Topics: ${s.topics.join(', ')} • Acc ${(s.accuracy*100).toFixed(0)}% • Hints ${s.hints}</li>`).join('');
      modal.innerHTML = `<div class="card">
        <h2>Session Report</h2>
        <ul>${rows||'<li>No sessions yet.</li>'}</ul>
        <button id="copy-json">Copy as JSON</button>
        <button id="close-report">Close</button>
      </div>`;
      modal.classList.remove('hidden');
      modal.querySelector('#close-report').onclick = ()=>modal.classList.add('hidden');
      modal.querySelector('#copy-json').onclick = ()=>{
        navigator.clipboard.writeText(JSON.stringify(state.sessions,null,2));
      };
    },
    renderHeistBoard(state){
      const modal = qs('#menu-modal');
      const wingHtml = Content.wings.map(w=>{
        const stats = state.mastery[w.topics[0]] || {correct:0, attempts:0};
        const pct = stats.attempts? Math.round((stats.correct/stats.attempts)*100):0;
        return `<div class="boss-step"><strong>${w.name}</strong><div>${w.flavor}</div><div>Mastery: ${pct}%</div></div>`;
      }).join('');
      const cosmetics = Object.values(state.cosmetics).flat().join(', ');
      modal.innerHTML = `<div class="card"><h2>Heist Board</h2>${wingHtml}<p>Cosmetics: ${cosmetics}</p><button id="close-menu">Close</button></div>`;
      modal.classList.remove('hidden');
      modal.querySelector('#close-menu').onclick = ()=>modal.classList.add('hidden');
    },
    revealChoices(problem){
      if(!allowChoices || !problem.multiChoice) return;
      drawChoices(problem.multiChoice);
    }
  };
})();
