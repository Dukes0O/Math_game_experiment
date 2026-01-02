(function(){
  const wings = [
    { id:'frozen-hall', name:'Frozen Integers Wing', topics:['integers','order'], flavor:'Temperature alarms hum inside a hall of icy statues.' },
    { id:'glimmer-market', name:'Glimmer Market Wing', topics:['decimals','ratios'], flavor:'Holographic stalls flicker with floating price tags.' },
    { id:'gear-lab', name:'Gear Lab Wing', topics:['equations','order','coordinates'], flavor:'Balancing arms and glowing mirrors reveal math secrets.' },
    { id:'atrium', name:'Grand Atrium', topics:['geometry','mixed'], flavor:'Marble grids and shimmering light panels form puzzles.' }
  ];

  const curatorPersonalities = {
    default: ['Curator: "Security nominal."','Curator: "Prove you can balance thought and action."'],
    hintHeavy: ['Curator: "You like hints? I buffered extra glow on the mirrors."','Curator: "I will slow my narration while you think."'],
    speedy: ['Curator (fast): "You move like a rumor. Try this before I finish—" ... "fine, I will slow down."'],
    signSlip: ['Curator: "Negatives are sneaky; I mirrored the panel for you."','Curator glitch: "Minus... plus? Let me rewind time for clarity."']
  };

  const obstacleTemplates = {
    door: { name:'Door Lock', problems:1 },
    laser: { name:'Laser Grid', problems:2 },
    keys: { name:'Key Fragments', problems:3 },
    jammer: { name:'Signal Jammer', problems:2 },
    boss: { name:'Boss Room', problems:4 }
  };

  const narration = {
    streak:['The museum lights rewind a few seconds—Time Refund!','A guard blinks and nods: "Keep that streak."'],
    miss:['The floor hums: "Try a smaller version first."','A projector shows your last step in slow motion.'],
    ally:['A guard lowers a visor: "I can tutor once. Ask."'],
    glitch:['Curator glitches: "Solve before I... zzzip. Okay, slower now."']
  };

  const bossScripts = [
    { id:'balance-core', topic:'equations', steps:['Check both sides of the equation visually.','Isolate x by moving one term.','Divide or multiply to finish.','Verify by plugging back in.'] },
    { id:'neon-grid', topic:'coordinates', steps:['Locate the quadrant.','Count grid steps (Manhattan).','Plot treasure point.','Check mirror symmetry.'] },
    { id:'percent-pulse', topic:'decimals', steps:['Turn percent into decimal.','Find part of the whole.','Recombine price and adjustment.','Sense-check with rounding.'] },
    { id:'shape-warden', topic:'geometry', steps:['Split the shape.','Find each rectangle measure.','Add totals.','Check perimeter or area.'] },
  ];

  window.Content = { wings, curatorPersonalities, obstacleTemplates, narration, bossScripts };
})();
