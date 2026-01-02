(function(){
  const TOPICS = ['integers','decimals','ratios','order','equations','coordinates','geometry','mixed'];

  function emptyStats(){
    const base = {};
    TOPICS.forEach(t=> base[t] = { correct: 0, attempts: 0, recent: [], hints: 0, times: [], errorTypes: [] });
    return base;
  }

  window.Progression = {
    ensure(state){
      if(!state.mastery || Object.keys(state.mastery).length===0){
        state.mastery = emptyStats();
      }
    },
    masteryFor(state, topic){
      this.ensure(state);
      if(!state.mastery[topic]) state.mastery[topic] = { correct:0, attempts:0, recent:[], hints:0, times:[], errorTypes:[] };
      return state.mastery[topic];
    },
    record(state, topic, result){
      this.ensure(state);
      const m = this.masteryFor(state, topic);
      m.attempts += 1;
      if(result.correct) m.correct +=1;
      m.recent.push(result.correct);
      if(m.recent.length>12) m.recent.shift();
      if(result.timeMs) m.times.push(result.timeMs);
      if(m.times.length>20) m.times.shift();
      if(result.hintsUsed) m.hints += result.hintsUsed;
      if(result.errorType) m.errorTypes.push(result.errorType);
    },
    estimate(topicData){
      const acc = topicData.recent.length? topicData.recent.filter(Boolean).length/topicData.recent.length : 0.5;
      const sorted = [...topicData.times].sort((a,b)=>a-b);
      const mid = sorted.length? sorted[Math.floor(sorted.length/2)] : 4000;
      const hintRate = topicData.hints/(topicData.attempts||1);
      return { accuracy: acc, medianTime: mid, hintRate };
    },
    difficulty(topicData){
      const e = this.estimate(topicData);
      let level = 1;
      if(e.accuracy>0.8 && e.medianTime<5000) level=3;
      else if(e.accuracy>0.65) level=2;
      if(e.hintRate>0.5) level = Math.max(1, level-1);
      return level;
    },
    allowMultipleChoice(topicData){
      const e = this.estimate(topicData);
      return e.accuracy<0.75 || e.hintRate>0.3;
    },
    preferFreeResponse(topicData){
      const e = this.estimate(topicData);
      return e.accuracy>0.75 && e.hintRate<0.25;
    },
    bossSteps(topicData){
      const level = this.difficulty(topicData);
      return level+2; // 3-5 steps
    },
    hintDelayMs(topicData){
      const e = this.estimate(topicData);
      if(e.accuracy<0.6 || e.hintRate>0.4) return 1500;
      if(e.accuracy>0.8) return 4000;
      return 2500;
    }
  };
})();
