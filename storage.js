(function(){
  // v2 storage keeps old saves (v1) and migrates forward.
  const KEY_V2 = 'math_heist_profile_v2';
  const KEY_V1 = 'math_heist_profile_v1';

  const DEFAULT_STATE = {
    gems: 0,
    cosmetics: {
      outfits: ['Stealth Hoodie'],
      trails: ['Neon Wisp'],
      poses: ['Thumbs-Up']
    },
    equipped: { outfit: 'Stealth Hoodie', trail: 'Neon Wisp', pose: 'Thumbs-Up' },
    gadgets: {},
    mastery: {},
    sessions: [],
    settings: {
      highContrast: false,
      largeText: false,
      reduceMotion: false,
      mute: false,
      seededRng: false,
      seed: 42
    },
    stats: { totalLocks: 0, bestStreak: 0 }
  };

  const GADGET_DEFAULTS = {
    'X-Ray Goggles': { owned: true, charges: 2, max: 2 },
    'Balance Beam': { owned: false, charges: 0, max: 2 },
    'Percent Lens': { owned: false, charges: 0, max: 2 },
    'Checkpoint Token': { owned: false, charges: 0, max: 1 },
    'Smoke Bomb': { owned: false, charges: 0, max: 1 }
  };

  function clone(x){
    try { return structuredClone(x); } catch(e){ return JSON.parse(JSON.stringify(x)); }
  }

  function ensureShape(state){
    // Merge defaults (but do not overwrite user choices).
    state = Object.assign(clone(DEFAULT_STATE), state || {});
    state.cosmetics = Object.assign(clone(DEFAULT_STATE.cosmetics), state.cosmetics || {});
    state.equipped = Object.assign(clone(DEFAULT_STATE.equipped), state.equipped || {});
    state.settings = Object.assign(clone(DEFAULT_STATE.settings), state.settings || {});
    state.stats = Object.assign(clone(DEFAULT_STATE.stats), state.stats || {});

    // Gadgets: merge per gadget entry.
    const merged = clone(GADGET_DEFAULTS);
    const existing = state.gadgets || {};
    Object.keys(merged).forEach(name=>{
      if(existing[name]){
        merged[name] = Object.assign(clone(merged[name]), existing[name]);
      }
    });
    // Preserve any unknown gadgets that might exist from future versions.
    Object.keys(existing).forEach(name=>{
      if(!merged[name]) merged[name] = existing[name];
    });
    state.gadgets = merged;

    // Equip safety: if equipped item missing, fallback to first owned.
    if(!state.cosmetics.outfits.includes(state.equipped.outfit)) state.equipped.outfit = state.cosmetics.outfits[0];
    if(!state.cosmetics.trails.includes(state.equipped.trail)) state.equipped.trail = state.cosmetics.trails[0];
    if(!state.cosmetics.poses.includes(state.equipped.pose)) state.equipped.pose = state.cosmetics.poses[0];

    // Sessions cap
    state.sessions = (state.sessions || []).slice(0, 20);

    return state;
  }

  function migrateFromV1(v1){
    // v1 had similar fields, but missing equipped/stats and had all gadgets owned.
    const out = ensureShape(v1);
    if(!out.equipped) out.equipped = clone(DEFAULT_STATE.equipped);
    if(!out.stats) out.stats = clone(DEFAULT_STATE.stats);
    return out;
  }

  window.StorageAPI = {
    defaults(){ return clone(GADGET_DEFAULTS); },

    load(){
      try {
        const rawV2 = localStorage.getItem(KEY_V2);
        if(rawV2){
          return ensureShape(JSON.parse(rawV2));
        }

        const rawV1 = localStorage.getItem(KEY_V1);
        if(rawV1){
          const migrated = migrateFromV1(JSON.parse(rawV1));
          localStorage.setItem(KEY_V2, JSON.stringify(migrated));
          return migrated;
        }

        return ensureShape(null);
      } catch(e){
        console.warn('Resetting storage', e);
        return ensureShape(null);
      }
    },

    save(state){
      const safe = ensureShape(state);
      localStorage.setItem(KEY_V2, JSON.stringify(safe));
      return safe;
    },

    addSession(state, summary){
      const safe = ensureShape(state);
      const list = safe.sessions || [];
      list.unshift(Object.assign(summary, { timestamp: Date.now() }));
      safe.sessions = list.slice(0, 20);
      return this.save(safe);
    },

    spendGems(state, amount){
      const safe = ensureShape(state);
      if(safe.gems < amount) return { ok:false, state: safe };
      safe.gems -= amount;
      return { ok:true, state: this.save(safe) };
    },

    earnGems(state, amount){
      const safe = ensureShape(state);
      safe.gems += amount;
      return this.save(safe);
    },

    reset(){
      localStorage.removeItem(KEY_V2);
    }
  };
})();