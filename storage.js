(function(){
  const KEY = 'math_heist_profile_v1';
  const DEFAULT_STATE = {
    gems: 0,
    cosmetics: { outfits: ['Stealth Hoodie'], trails: ['Neon Wisp'], poses: ['Thumbs-Up'] },
    gadgets: {},
    mastery: {},
    sessions: [],
    settings: { highContrast: false, largeText: false, reduceMotion: false, mute: false, seededRng: false, seed: 42 }
  };

  const GADGET_DEFAULTS = {
    'X-Ray Goggles': { owned: true, charges: 2, max: 2 },
    'Balance Beam': { owned: true, charges: 2, max: 2 },
    'Percent Lens': { owned: true, charges: 2, max: 2 },
    'Checkpoint Token': { owned: true, charges: 1, max: 1 }
  };

  window.StorageAPI = {
    defaults(){ return structuredClone(GADGET_DEFAULTS); },
    load(){
      try {
        const raw = localStorage.getItem(KEY);
        if(!raw) return Object.assign(structuredClone(DEFAULT_STATE), { gadgets: structuredClone(GADGET_DEFAULTS) });
        const parsed = JSON.parse(raw);
        return Object.assign(structuredClone(DEFAULT_STATE), parsed, { gadgets: parsed.gadgets||structuredClone(GADGET_DEFAULTS) });
      } catch(e){
        console.warn('Resetting storage', e);
        return Object.assign(structuredClone(DEFAULT_STATE), { gadgets: structuredClone(GADGET_DEFAULTS) });
      }
    },
    save(state){
      localStorage.setItem(KEY, JSON.stringify(state));
    },
    addSession(state, summary){
      const list = state.sessions || [];
      list.unshift(Object.assign(summary, { timestamp: Date.now() }));
      state.sessions = list.slice(0,20);
      this.save(state);
    },
    reset(){ localStorage.removeItem(KEY); }
  };
})();
