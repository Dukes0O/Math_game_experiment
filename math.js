(function(){
  const rnd = () => Math.random();
  function choice(arr){ return arr[Math.floor(rnd()*arr.length)]; }
  function range(a,b){ const arr=[]; for(let i=a;i<=b;i++) arr.push(i); return arr; }

  function withHints(base){
    const hints = base.hints || [];
    return Object.assign(base, { hints });
  }

  function integerProblem(level){
    const variant = choice(['addsub','compare','abs']);
    if(variant==='compare'){
      const a = Math.floor((rnd()*15+1)*(level+1)) * (rnd()>0.5?1:-1);
      const b = Math.floor((rnd()*15+1)*(level+1)) * (rnd()>0.5?1:-1);
      const prompt = `Which is greater: ${a} or ${b}?`;
      const answer = a>b? a : b;
      return withHints({ topic:'integers', prompt, answer, hints:[
        'Think of position on the number line.',
        `Numbers to the right are greater. Which is further right, ${a} or ${b}?`,
        `${answer} is greater.`
      ], multiChoice:[a,b], errorClassifier(val){ if(Number(val)===a+b) return 'operation confusion'; return null; }});
    }
    if(variant==='abs'){
      const n = Math.floor((rnd()*12+2)*(level+1)) * (rnd()>0.5?1:-1);
      const prompt = `Find |${n}| (absolute value).`;
      const answer = Math.abs(n);
      return withHints({ topic:'integers', prompt, answer, hints:[
        'Absolute value is distance from zero.',
        `How far is ${n} from 0 on the number line?`,
        `That distance is ${answer}.`
      ], errorClassifier(val){ if(Number(val)===n) return 'forgot absolute'; return null; }});
    }
    const a = Math.floor((rnd()*10+1)* (level+1)) * (rnd()>0.5?1:-1);
    const b = Math.floor((rnd()*10+1)* (level+1)) * (rnd()>0.5?1:-1);
    const op = choice(['+','-']);
    const answer = op==='+'? a+b : a-b;
    const prompt = `Compute: ${a} ${op} ${b}`;
    return withHints({ topic:'integers', prompt, answer, hints:[
      'Think of a number line: add moves right, subtract moves left.',
      `Start at ${a}, move ${op==='+'? 'right': 'left'} by ${Math.abs(b)}.`,
      `You land on ${answer}. Fill it in.`
    ], errorClassifier(val){
      const v = Number(val);
      if(Number.isNaN(v)) return 'not-a-number';
      if(Math.sign(v)!==Math.sign(answer)) return 'sign error';
      return null;
    }});
  }

  function decimalProblem(level){
    const variant = choice(['discount','convert','tax']);
    if(variant==='convert'){
      const pct = Math.floor(rnd()*60+5);
      const prompt = `Convert ${pct}% to a decimal.`;
      const answer = +(pct/100).toFixed(2);
      return withHints({ topic:'decimals', prompt, answer, hints:[
        'Percent means per hundred.',
        `Divide by 100: move the decimal two places left.`,
        `${pct}% = ${(pct/100).toFixed(2)}`
      ], multiChoice:[answer, +(pct/100+0.1).toFixed(2), +(pct/100-0.05).toFixed(2), +(pct/10).toFixed(2)]});
    }
    if(variant==='tax'){
      const bill = +(rnd()*30+20).toFixed(2);
      const tip = choice([10,12,15,18]);
      const prompt = `A snack bill is $${bill.toFixed(2)}. Add ${tip}% tip. What is the total?`;
      const answer = +(bill*(1+tip/100)).toFixed(2);
      return withHints({ topic:'decimals', prompt, answer, hints:[
        'Find the tip as a decimal first.',
        `${tip}% tip is ${(tip/100).toFixed(2)}. Multiply by the bill to get tip amount.`,
        `Bill + tip = ${bill.toFixed(2)} + ${(bill*tip/100).toFixed(2)} = ${answer}.`
      ], multiChoice:[answer, +(bill*(1+tip/100+0.05)).toFixed(2), +(bill*(1+tip/100-0.03)).toFixed(2), +(bill*tip/100).toFixed(2)]});
    }
    const percent = Math.floor(rnd()*30+5);
    const base = Math.floor(rnd()*40+10) * (level+1);
    const discounted = +(base*(1-percent/100)).toFixed(2);
    const prompt = `A price of $${base.toFixed(2)} is discounted ${percent}%. What is the new price?`;
    return withHints({ topic:'decimals', prompt, answer: discounted, hints:[
      'Convert percent to decimal first.',
      `${percent}% as decimal is ${(percent/100).toFixed(2)}. Multiply by price to find discount.`,
      `Price - discount = ${base.toFixed(2)} - ${(base*(percent/100)).toFixed(2)} = ${discounted}.`
    ], multiChoice:[discounted, +(base*(1-percent/100+0.05)).toFixed(2), +(base*(1-percent/100-0.03)).toFixed(2), +(base*(1-percent/100+0.1)).toFixed(2)] });
  }

  function ratioProblem(level){
    const items = ['glow badges','museum tickets','spark vials'];
    const qty = Math.floor(rnd()*5+2)*(level+1);
    const price = Math.floor(rnd()*8+2);
    const total = qty*price;
    const prompt = `${qty} ${choice(items)} cost $${total}. What is the price per item?`;
    return withHints({ topic:'ratios', prompt, answer: +(total/qty).toFixed(2), hints:[
      'Unit rate = total / quantity.',
      `Compute ${total} ÷ ${qty}.`,
      `It equals ${(total/qty).toFixed(2)}.`
    ], multiChoice: [+(total/qty).toFixed(2), +(total/(qty+1)).toFixed(2), +(total/(qty-1)).toFixed(2), +(total/qty+1).toFixed(2)] });
  }

  function orderProblem(level){
    const a = Math.floor(rnd()*6+1)*(level+1);
    const b = Math.floor(rnd()*6+1);
    const c = Math.floor(rnd()*4+1);
    const prompt = `Evaluate: ${a} + ${b} * (${c}+2)`;
    const answer = a + b*(c+2);
    return withHints({ topic:'order', prompt, answer, hints:[
      'Remember PEMDAS: parentheses first.',
      `Inside parentheses: ${c}+2=${c+2}. Then multiply by ${b}.`,
      `Compute ${b}*${c+2} then add ${a} to finish: ${answer}.`
    ], errorClassifier(val){
      const v = Number(val);
      if(v===a+b+c+2) return 'order-of-ops';
      return null;
    }});
  }

  function equationProblem(level){
    const x = Math.floor(rnd()*9+1);
    const m = Math.floor(rnd()*4+1)+level;
    const b = Math.floor(rnd()*5+1);
    const answer = x;
    const prompt = `Solve: ${m}x + ${b} = ${m*x + b}`;
    return withHints({ topic:'equations', prompt, answer, hints:[
      'Use balance: subtract the constant from both sides.',
      `Subtract ${b}: you get ${m}x = ${m*x + b - b}.`,
      `Divide both sides by ${m}: x = ${answer}.`
    ], mirror:true, errorClassifier(val){
      const v=Number(val); if(Number.isNaN(v)) return 'not-a-number'; if(v===x+b) return 'forgot divide'; if(v===x- b) return 'sign error'; return null; }, multiChoice:[x,x+1,x-1,x+2] });
  }

  function coordinateProblem(level){
    const variant = choice(['quadrant','distance']);
    if(variant==='distance'){
      const a = { x: Math.floor(rnd()*5), y: Math.floor(rnd()*5) };
      const b = { x: a.x + choice([1,2,3]), y: a.y + choice([1,2,3])*(rnd()>0.5?1:-1) };
      const prompt = `Find the grid (Manhattan) distance between (${a.x},${a.y}) and (${b.x},${b.y}).`;
      const answer = Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
      return withHints({ topic:'coordinates', prompt, answer, hints:[
        'On a grid, Manhattan distance is horizontal + vertical steps.',
        `Horizontal steps: |${a.x}-${b.x}|, vertical: |${a.y}-${b.y}|.`,
        `Total = ${Math.abs(a.x-b.x)} + ${Math.abs(a.y-b.y)} = ${answer}.`
      ], multiChoice:[answer, answer+1, Math.abs(a.x-b.x), Math.abs(a.y-b.y)]});
    }
    const x = Math.floor(rnd()*6+1)*(rnd()>0.5?1:-1);
    const y = Math.floor(rnd()*6+1)*(rnd()>0.5?1:-1);
    const prompt = `Which quadrant is point (${x}, ${y}) in?`;
    let quad = 'Origin';
    if(x>0 && y>0) quad='I';
    else if(x<0 && y>0) quad='II';
    else if(x<0 && y<0) quad='III';
    else if(x>0 && y<0) quad='IV';
    return withHints({ topic:'coordinates', prompt, answer: quad, hints:[
      'Quadrant I is (+,+). Count clockwise.',
      `x is ${x>0?'positive':'negative'}, y is ${y>0?'positive':'negative'}.`,
      `That lands in quadrant ${quad}.`
    ], multiChoice:['I','II','III','IV'], errorClassifier(val){ if(val && val.toUpperCase()!==quad) return 'quadrant mix'; return null; }});
  }

  function geometryProblem(level){
    const variant = choice(['area','perimeter']);
    if(variant==='perimeter'){
      const w = Math.floor(rnd()*4+3)*(level||1);
      const h = Math.floor(rnd()*3+2)*(level||1);
      const prompt = `A rectangular vault is ${w} by ${h}. What is its perimeter?`;
      const answer = 2*(w+h);
      return withHints({ topic:'geometry', prompt, answer, hints:[
        'Perimeter is the sum of all side lengths.',
        `Add width + height, then double: (${w}+${h})*2.`,
        `Perimeter = ${w+h} * 2 = ${answer}.`
      ], multiChoice:[answer, 2*w+h, 2*h+w, w*h]});
    }
    const w = Math.floor(rnd()*5+3)*(level);
    const h = Math.floor(rnd()*4+2)*(level);
    const extra = Math.floor(rnd()*3+1);
    const area = w*h + extra*h;
    const prompt = `An L-shaped hallway is a ${w}x${h} rectangle with a ${extra}x${h} rectangle attached. What is the total area?`;
    return withHints({ topic:'geometry', prompt, answer: area, hints:[
      'Break composite shapes into rectangles.',
      `Area1 = ${w}*${h}, Area2 = ${extra}*${h}. Add them.`,
      `Total area = ${w*h} + ${extra*h} = ${area}.`
    ], multiChoice:[area, area+5, area-5, area+10] });
  }

  function mixedProblem(level){
    const gen = choice([integerProblem, decimalProblem, ratioProblem, orderProblem, equationProblem, coordinateProblem, geometryProblem]);
    const p = gen(level);
    p.topic = 'mixed';
    return p;
  }

  const generators = {
    integers: integerProblem,
    decimals: decimalProblem,
    ratios: ratioProblem,
    order: orderProblem,
    equations: equationProblem,
    coordinates: coordinateProblem,
    geometry: geometryProblem,
    mixed: mixedProblem
  };

  window.MathContent = {
    makeProblem(topic, level=1){
      const gen = generators[topic] || mixedProblem;
      const p = gen(level);
      p.id = 'p'+Math.floor(Math.random()*1e6);
      return p;
    },
    surpriseLines(){
      return [
        'Laser Rhythm Lock engaging...',
        'Mirror Math panels hum to life.',
        'Ally Guard offers a hint.',
        'Time Refund! The timer rewinds.',
        'Heist Replay clip ready.'
      ];
    }
  };
})();
