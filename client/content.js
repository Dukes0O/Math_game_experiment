(function(){
  // Wing themes and story flavor
  const wings = [
    {
      id:'frozen-hall',
      name:'Frozen Integers Wing',
      topics:['integers','order'],
      flavor:'Temperature alarms hum inside a hall of icy statues.',
      theme: { a:'#6af0c6', b:'#1b6cff', floor:'ice' }
    },
    {
      id:'glimmer-market',
      name:'Glimmer Market Wing',
      topics:['decimals','ratios'],
      flavor:'Holographic stalls flicker with floating price tags.',
      theme: { a:'#f08dff', b:'#ffb347', floor:'neon' }
    },
    {
      id:'gear-lab',
      name:'Gear Lab Wing',
      topics:['equations','order','coordinates'],
      flavor:'Balancing arms and mirror panels reveal math secrets.',
      theme: { a:'#7af09b', b:'#f08dff', floor:'steel' }
    },
    {
      id:'atrium',
      name:'Grand Atrium',
      topics:['geometry','mixed'],
      flavor:'Marble grids and shimmering light panels form puzzles.',
      theme: { a:'#ffb347', b:'#6af0c6', floor:'marble' }
    }
  ];

  const TOPIC_META = {
    integers:    { label:'Integers', icon:'❄️', blurb:'Negatives, number lines, absolute value.' },
    decimals:    { label:'Percents', icon:'💸', blurb:'Percents, decimals, discounts, tax/tip.' },
    ratios:      { label:'Ratios', icon:'⚖️', blurb:'Unit rates, scaling, proportional thinking.' },
    order:       { label:'Order of Ops', icon:'🧠', blurb:'Parentheses, multiply/divide, add/subtract.' },
    equations:   { label:'Equations', icon:'🪞', blurb:'Balance both sides, solve for x.' },
    coordinates: { label:'Coordinates', icon:'🗺️', blurb:'Quadrants, grid distance, plotting.' },
    geometry:    { label:'Geometry', icon:'📐', blurb:'Area, perimeter, composite rectangles.' },
    mixed:       { label:'Mixed', icon:'🎭', blurb:'A mash-up of everything.' }
  };

  // Curator voice changes based on the player
  const curatorPersonalities = {
    default: [
      'Curator: “Security nominal. Try not to trip the lasers.”',
      'Curator: “Prove you can balance thought and action.”',
      'Curator: “The Artifact responds to clear reasoning.”'
    ],
    hintHeavy: [
      'Curator: “You like hints. I pre-warmed the mirror panels.”',
      'Curator: “I will slow the room. Think.”'
    ],
    speedy: [
      'Curator (fast): “You move like a rumor. Next lock—go!”',
      'Curator: “Speed is cute. Accuracy is cooler.”'
    ],
    signSlip: [
      'Curator: “Negatives are sneaky. I highlighted the minus signs.”',
      'Curator glitch: “Minus… plus? Let me rewind time for clarity.”'
    ]
  };

  // Obstacles define how many locks must be solved to open exits.
  const obstacleTemplates = {
    door:  { name:'Door Lock',    problems:1, reward: 2 },
    laser: { name:'Laser Grid',   problems:2, reward: 3 },
    keys:  { name:'Key Fragments',problems:3, reward: 4 },
    jammer:{ name:'Signal Jammer',problems:2, reward: 3 },
    boss:  { name:'Boss Vault',   problems:4, reward: 8 }
  };

  const narration = {
    streak:[
      'Time bends. You stole 3 seconds back.',
      'A guard nods: “Clean streak.”',
      'The museum lights flicker in respect.'
    ],
    miss:[
      'The floor hums: “Try a smaller version first.”',
      'A projector shows your last step in slow motion.',
      'The panel repeats the hint: precision first.'
    ],
    ally:[
      'A guard lowers a visor: “I can tutor once. Ask.”',
      'Ally whispers: “Mirror math helps. Try Balance Beam.”'
    ],
    glitch:[
      'Curator glitches: “Solve before I... zzzip. Okay, slower now.”',
      'Neon text stutters: “Mist…ake detected. Recenter.”'
    ]
  };

  const bossScripts = [
    { id:'balance-core', topic:'equations',  steps:['Check both sides of the equation visually.','Isolate x by moving one term.','Divide or multiply to finish.','Verify by plugging back in.'] },
    { id:'neon-grid',    topic:'coordinates',steps:['Locate the quadrant.','Count grid steps (Manhattan).','Plot treasure point.','Check mirror symmetry.'] },
    { id:'percent-pulse',topic:'decimals',   steps:['Turn percent into decimal.','Find part of the whole.','Recombine price and adjustment.','Sense-check with rounding.'] },
    { id:'shape-warden', topic:'geometry',   steps:['Split the shape.','Find each rectangle measure.','Add totals.','Check perimeter or area.'] },
  ];

  // Shop items (gadgets + cosmetics)
  const shopItems = [
    { id:'g_xray', type:'gadget', name:'X-Ray Goggles', price:14, desc:'Removes one wrong option in a choice lock.' },
    { id:'g_balance', type:'gadget', name:'Balance Beam', price:16, desc:'Reveals a mirror-math hint for equations.' },
    { id:'g_percent', type:'gadget', name:'Percent Lens', price:14, desc:'Shows a percent-to-decimal nudge.' },
    { id:'g_checkpoint', type:'gadget', name:'Checkpoint Token', price:22, desc:'One “undo” for a mistake in a boss vault.' },
    { id:'g_smoke', type:'gadget', name:'Smoke Bomb', price:16, desc:'Temporarily blocks roaming sentry orbs in a room.' },

    { id:'o_prismatic', type:'cosmetic', category:'outfits', name:'Prismatic Cloak', price:28, desc:'A sparkly cloak that makes your trail shimmer.' },
    { id:'t_comet', type:'cosmetic', category:'trails', name:'Comet Tail', price:18, desc:'A longer trail that looks faster.' },
    { id:'p_victory', type:'cosmetic', category:'poses', name:'Victory Spin', price:16, desc:'A silly victory pose for the replay clip.' }
  ];

  // Run missions: one is chosen each run.
  const missions = [
    { id:'no-hints-3',   title:'Ghost Hacker',    desc:'Clear 3 locks without using a hint.',                reward: 10 },
    { id:'streak-5',     title:'Combo Artist',    desc:'Hit a streak of 5 correct locks.',                   reward: 12 },
    { id:'no-sentry-hit',title:'Quiet Feet',      desc:'Finish the run without touching a sentry orb.',      reward: 10 },
    { id:'boss-clean',   title:'Vault Whisperer', desc:'Beat the boss vault with at most 1 hint.',           reward: 14 }
  ];

  // Simple cosmetic metadata for visuals.
  const cosmeticMeta = {
    outfits: {
      'Stealth Hoodie': { color:'#6af0c6' },
      'Prismatic Cloak': { color:'#f08dff' }
    },
    trails: {
      'Neon Wisp': { length: 18 },
      'Comet Tail': { length: 28 }
    }
  };

  window.Content = {
    wings,
    TOPIC_META,
    curatorPersonalities,
    obstacleTemplates,
    narration,
    bossScripts,
    shopItems,
    missions,
    cosmeticMeta
  };
})();
  // Wing themes and story flavor
  const wings = [
    {
      id:'frozen-hall',
      name:'Frozen Integers Wing',
      topics:['integers','order'],
      flavor:'Temperature alarms hum inside a hall of icy statues.',
      theme: { a:'#6af0c6', b:'#1b6cff', floor:'ice' }
    },
    {
      id:'glimmer-market',
      name:'Glimmer Market Wing',
      topics:['decimals','ratios'],
      flavor:'Holographic stalls flicker with floating price tags.',
      theme: { a:'#f08dff', b:'#ffb347', floor:'neon' }
    },
    {
      id:'gear-lab',
      name:'Gear Lab Wing',
      topics:['equations','order','coordinates'],
      flavor:'Balancing arms and mirror panels reveal math secrets.',
      theme: { a:'#7af09b', b:'#f08dff', floor:'steel' }
    },
    {
      id:'atrium',
      name:'Grand Atrium',
      topics:['geometry','mixed'],
      flavor:'Marble grids and shimmering light panels form puzzles.',
      theme: { a:'#ffb347', b:'#6af0c6', floor:'marble' }
    }
  ];

  const TOPIC_META = {
    integers:    { label:'Integers', icon:'❄️', blurb:'Negatives, number lines, absolute value.' },
    decimals:    { label:'Percents', icon:'💸', blurb:'Percents, decimals, discounts, tax/tip.' },
    ratios:      { label:'Ratios', icon:'⚖️', blurb:'Unit rates, scaling, proportional thinking.' },
    order:       { label:'Order of Ops', icon:'🧠', blurb:'Parentheses, multiply/divide, add/subtract.' },
    equations:   { label:'Equations', icon:'🪞', blurb:'Balance both sides, solve for x.' },
    coordinates: { label:'Coordinates', icon:'🗺️', blurb:'Quadrants, grid distance, plotting.' },
    geometry:    { label:'Geometry', icon:'📐', blurb:'Area, perimeter, composite rectangles.' },
    mixed:       { label:'Mixed', icon:'🎭', blurb:'A mash-up of everything.' }
  };

  // Curator voice changes based on the player
  const curatorPersonalities = {
    default: [
      'Curator: “Security nominal. Try not to trip the lasers.”',
      'Curator: “Prove you can balance thought and action.”',
      'Curator: “The Artifact responds to clear reasoning.”'
    ],
    hintHeavy: [
      'Curator: “You like hints. I pre-warmed the mirror panels.”',
      'Curator: “I will slow the room. Think.”'
    ],
    speedy: [
      'Curator (fast): “You move like a rumor. Next lock—go!”',
      'Curator: “Speed is cute. Accuracy is cooler.”'
    ],
    signSlip: [
      'Curator: “Negatives are sneaky. I highlighted the minus signs.”',
      'Curator glitch: “Minus… plus? Let me rewind time for clarity.”'
    ]
  };

  // Obstacles define how many locks must be solved to open exits.
  const obstacleTemplates = {
    door:  { name:'Door Lock',    problems:1, reward: 2 },
    laser: { name:'Laser Grid',   problems:2, reward: 3 },
    keys:  { name:'Key Fragments',problems:3, reward: 4 },
    jammer:{ name:'Signal Jammer',problems:2, reward: 3 },
    boss:  { name:'Boss Vault',   problems:4, reward: 8 }
  };

  const narration = {
    streak:[
      'Time bends. You stole 3 seconds back.',
      'A guard nods: “Clean streak.”',
      'The museum lights flicker in respect.'
    ],
    miss:[
      'The floor hums: “Try a smaller version first.”',
      'A projector shows your last step in slow motion.',
      'The panel repeats the hint: precision first.'
    ],
    ally:[
      'A guard lowers a visor: “I can tutor once. Ask.”',
      'Ally whispers: “Mirror math helps. Try Balance Beam.”'
    ],
    glitch:[
      'Curator glitches: “Solve before I... zzzip. Okay, slower now.”',
      'Neon text stutters: “Mist…ake detected. Recenter.”'
      'A projector replays your last step in slow motion.'
    ],
    ally:[
      'A guard lowers a visor: “I can tutor once. Ask.”'
    ],
    glitch:[
      'Curator glitches: “Solve before I… zzzip. Okay, slower now.”'
    ],
    doorChoices:[
      'Two exits appear. One is safe. One is spicy.',
      'Pick a route. Your future self will judge you.'
    ]
  };

  const bossScripts = [
    { id:'balance-core', topic:'equations',  steps:['Check both sides of the equation visually.','Isolate x by moving one term.','Divide or multiply to finish.','Verify by plugging back in.'] },
    { id:'neon-grid',    topic:'coordinates',steps:['Locate the quadrant.','Count grid steps (Manhattan).','Plot treasure point.','Check mirror symmetry.'] },
    { id:'percent-pulse',topic:'decimals',   steps:['Turn percent into decimal.','Find part of the whole.','Recombine price and adjustment.','Sense-check with rounding.'] },
    { id:'shape-warden', topic:'geometry',   steps:['Split the shape.','Find each rectangle measure.','Add totals.','Check perimeter or area.'] },
  ];

  // Shop items (gadgets + cosmetics)
  const shopItems = [
    { id:'g_xray', type:'gadget', name:'X-Ray Goggles', price:14, desc:'Removes one wrong option in a choice lock.' },
    { id:'g_balance', type:'gadget', name:'Balance Beam', price:16, desc:'Reveals a mirror-math hint for equations.' },
    { id:'g_percent', type:'gadget', name:'Percent Lens', price:14, desc:'Shows a percent-to-decimal nudge.' },
    { id:'g_checkpoint', type:'gadget', name:'Checkpoint Token', price:22, desc:'One “undo” for a mistake in a boss vault.' },
    { id:'g_smoke', type:'gadget', name:'Smoke Bomb', price:16, desc:'Temporarily blocks roaming sentry orbs in a room.' },

    { id:'o_prismatic', type:'cosmetic', category:'outfits', name:'Prismatic Cloak', price:28, desc:'A sparkly cloak that makes your trail shimmer.' },
    { id:'t_comet', type:'cosmetic', category:'trails', name:'Comet Tail', price:18, desc:'A longer trail that looks faster.' },
    { id:'p_victory', type:'cosmetic', category:'poses', name:'Victory Spin', price:16, desc:'A silly victory pose for the replay clip.' }
  ];

  // Run missions: one is chosen each run.
  const missions = [
    { id:'no-hints-3',   title:'Ghost Hacker',    desc:'Clear 3 locks without using a hint.',                reward: 10 },
    { id:'streak-5',     title:'Combo Artist',    desc:'Hit a streak of 5 correct locks.',                   reward: 12 },
    { id:'no-sentry-hit',title:'Quiet Feet',      desc:'Finish the run without touching a sentry orb.',      reward: 10 },
    { id:'boss-clean',   title:'Vault Whisperer', desc:'Beat the boss vault with at most 1 hint.',           reward: 14 }
    { id:'balance-core', topic:'equations', steps:['Spot the x term.','Move constants to one side.','Divide or multiply to finish.','Verify by plugging back in.'] },
    { id:'neon-grid', topic:'coordinates', steps:['Identify the quadrant.','Count grid steps.','Plot the point.','Double-check the signs.'] },
    { id:'percent-pulse', topic:'decimals', steps:['Convert percent to decimal.','Find the part of the whole.','Add/subtract adjustment.','Sense-check by rounding.'] },
    { id:'shape-warden', topic:'geometry', steps:['Split the shape.','Find each area/perimeter piece.','Combine totals.','Check your units.'] },
  ];

  // Shop inventory (buy with Gems)
  const shopItems = [
    { id:'g_balance', type:'gadget', name:'Balance Beam', price:18, desc:'Turns on Mirror Math visuals for equation locks (and some tricky steps).' },
    { id:'g_percent', type:'gadget', name:'Percent Lens', price:14, desc:'Adds a quick percent→decimal nudge on percent locks.' },
    { id:'g_checkpoint', type:'gadget', name:'Checkpoint Token', price:22, desc:'One “undo” for a mistake in a boss vault.' },
    { id:'g_smoke', type:'gadget', name:'Smoke Bomb', price:16, desc:'Temporarily blocks roaming sentry orbs in a room.' },

    { id:'o_prismatic', type:'cosmetic', category:'outfits', name:'Prismatic Cloak', price:28, desc:'A sparkly cloak that makes your trail shimmer.' },
    { id:'t_comet', type:'cosmetic', category:'trails', name:'Comet Tail', price:18, desc:'A longer trail that looks faster.' },
    { id:'p_victory', type:'cosmetic', category:'poses', name:'Victory Spin', price:16, desc:'A silly victory pose for the replay clip.' }
  ];

  // Run missions: one is chosen each run.
  const missions = [
    { id:'no-hints-3', title:'Ghost Hacker', desc:'Clear 3 locks without using a hint.', reward: 10 },
    { id:'streak-5', title:'Combo Artist', desc:'Hit a streak of 5 correct locks.', reward: 12 },
    { id:'no-sentry-hit', title:'Quiet Feet', desc:'Finish the run without touching a sentry orb.', reward: 10 },
    { id:'boss-clean', title:'Vault Whisperer', desc:'Beat the boss vault with at most 1 hint.', reward: 14 }
  ];

  // Simple cosmetic metadata for visuals.
  const cosmeticMeta = {
    outfits: {
      'Stealth Hoodie': { color:'#6af0c6' },
      'Prismatic Cloak': { color:'#f08dff' }
    },
    trails: {
      'Neon Wisp': { length: 18 },
      'Comet Tail': { length: 28 }
    }
  };

  window.Content = {
    wings,
    TOPIC_META,
    curatorPersonalities,
    obstacleTemplates,
    narration,
    bossScripts,
    shopItems,
    missions,
    cosmeticMeta
  };
})();
