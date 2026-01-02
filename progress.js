(function(){
  const TOPICS = ['integers','decimals','ratios','order','equations','coordinates','geometry','mixed'];

  function emptyStats(){
    const base = {};
    TOPICS.forEach(t=> base[t] = { correct: 0, attempts: 0, recent: [], hints: 0, times: [], errorTypes: [] });
    return base;
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  window.Progression = {
    ensure(state){
      if(!state.mastery || Object.keys(state.mastery).length===0){
        state.mastery = emptyStats();
      }
    },

    masteryFor(state, topic){
      this.ensure(state);
      if(!state.mastery[topic]){
        state.mastery[topic] = { correct:0, attempts:0, recent:[], hints:0, times:[], errorTypes:[] };
      }
      return state.mastery[topic];
    },

    record(state, topic, result){
      this.ensure(state);
      const m = this.masteryFor(state, topic);
      m.attempts += 1;
      if(result.correct) m.correct += 1;

      m.recent.push(!!result.correct);
      if(m.recent.length > 12) m.recent.shift();

      if(typeof result.timeMs === 'number' && isFinite(result.timeMs)){
        m.times.push(clamp(result.timeMs, 300, 60000));
        if(m.times.length > 25) m.times.shift();
      }

      if(result.hintsUsed) m.hints += result.hintsUsed;
      if(result.errorType) m.errorTypes.push(result.errorType);
      if(m.errorTypes.length > 25) m.errorTypes.shift();
    },

    estimate(topicData){
      const recent = topicData.recent || [];
      const acc = recent.length ? recent.filter(Boolean).length / recent.length : 0.6;

      const times = (topicData.times || []).slice().sort((a,b)=>a-b);
      const mid = times.length ? times[Math.floor(times.length/2)] : 6500;

      const hintRate = (topicData.hints || 0) / (topicData.attempts || 1);

      // Confidence rises with attempts.
      const attempts = topicData.attempts || 0;
      const confidence = clamp(attempts / 18, 0.15, 1);

      return { accuracy: acc, medianTime: mid, hintRate, confidence };
    },

    difficulty(topicData){
      const e = this.estimate(topicData);

      // Start gentle while confidence is low.
      if(e.confidence < 0.35) return 1;

      let level = 2;

      if(e.accuracy > 0.82 && e.medianTime < 6500) level = 3;
      if(e.accuracy > 0.9 && e.medianTime < 4200) level = 4;

      if(e.accuracy < 0.62) level = 1;
      if(e.hintRate > 0.55) level = Math.max(1, level - 1);

      return clamp(level, 1, 4);
    },

    allowMultipleChoice(topicData){
      const e = this.estimate(topicData);
      return e.accuracy < 0.78 || e.hintRate > 0.28 || e.confidence < 0.45;
    },

    preferFreeResponse(topicData){
      const e = this.estimate(topicData);
      return e.accuracy > 0.78 && e.hintRate < 0.28 && e.confidence > 0.55;
    },

    bossSteps(topicData){
      const level = this.difficulty(topicData); // 1-4
      return 3 + (level - 1); // 3-6 steps
    },

    hintDelayMs(topicData){
      const e = this.estimate(topicData);
      if(e.accuracy < 0.62 || e.hintRate > 0.45) return 1600;
      if(e.accuracy > 0.85) return 4200;
      return 2600;
    }
  };
})();