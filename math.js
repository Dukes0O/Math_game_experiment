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
  function rnd(){ return Math.random(); }
  function choice(arr){ return arr[Math.floor(rnd()*arr.length)]; }
  function randInt(min, max){ return Math.floor(rnd()*(max-min+1))+min; }
  function sign(){ return rnd() > 0.5 ? 1 : -1; }
  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

  function uniq(arr){
    const out = [];
    arr.forEach(x=>{ if(!out.includes(x)) out.push(x); });
    return out;
  }

  function shuffle(arr){
    const a = [...arr];
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(rnd()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function sanitizeInput(v){
    return String(v ?? '').trim();
  }

  function normalizeText(v){
    return sanitizeInput(v)
      .toLowerCase()
      .replace(/\s+/g,' ')
      .replace(/[^a-z0-9\-\+\.%\/ ]/g,'')
      .trim();
  }

  function parseNumberInput(v){
    let s = sanitizeInput(v).toLowerCase();
    if(!s) return NaN;
    s = s.replace(/[,\$]/g,'').replace(/\s+/g,'');

    // Accept 15% as 0.15 so kids can type what they think.
    let percent = false;
    if(s.endsWith('%')) { percent = true; s = s.slice(0,-1); }

    // Fractions like -3/4
    if(/^-?\d+\/\d+$/.test(s)){
      const parts = s.split('/');
      const a = Number(parts[0]), b = Number(parts[1]);
      if(b===0) return NaN;
      const n = a/b;
      return percent ? n/100 : n;
    }

    const n = Number(s);
    if(!Number.isFinite(n)) return NaN;
    return percent ? n/100 : n;
  }

  function numberClose(a,b,tol){
    if(!isFinite(a) || !isFinite(b)) return false;
    return Math.abs(a-b) <= tol;
  }

  function autoTol(answer){
    if(Number.isInteger(answer)) return 0;
    // Default tolerance handles 0.300 vs 0.3 and typical rounding.
    return 0.01;
  }

  function makeChoicesNumber(answer, spread){
    // spread is roughly how far wrong answers should be.
    const deltas = uniq([
      spread, -spread,
      spread*2, -spread*2,
      spread/2, -spread/2
    ]);
    const opts = [answer];
    deltas.forEach(d=>{
      const v = +(answer + d).toFixed(2);
      if(!opts.includes(v)) opts.push(v);
    });
    return shuffle(opts).slice(0,4);
  }

  function makeChoicesInt(answer, spread){
    const deltas = uniq([1,-1,2,-2,spread,-spread,spread+1,-(spread+1)]);
    const opts = [answer];
    deltas.forEach(d=>{
      const v = answer + d;
      if(!opts.includes(v)) opts.push(v);
    });
    return shuffle(opts).slice(0,4);
  }

  // ---------- Problem generators ----------

  function integerProblem(level){
    const variant = choice(['addsub','compare','abs','multsign']);
    const mag = 6 + level*6;

    if(variant === 'compare'){
      const a = randInt(1, mag) * sign();
      const b = randInt(1, mag) * sign();
      const prompt = `Which is greater on the number line: ${a} or ${b}?`;
      const answer = a > b ? a : b;
      return {
        topic:'integers',
        prompt,
        answer,
        multiChoice: shuffle([a,b, answer+1, answer-1]).slice(0,4),
        hints: [
          'Draw a quick number line in your head.',
          'Numbers to the right are greater.',
          `The greater number is ${answer}.`
        ],
        errorClassifier(val){
          const n = parseNumberInput(val);
          if(Number.isNaN(n)) return 'not-a-number';
          return null;
        }
      };
    }

    if(variant === 'abs'){
      const n = randInt(2, mag) * sign();
      const prompt = `Find |${n}| (absolute value).`;
      const answer = Math.abs(n);
      return {
        topic:'integers',
        prompt,
        answer,
        multiChoice: makeChoicesInt(answer, 3),
        hints: [
          'Absolute value is distance from zero.',
          `How far is ${n} from 0? Ignore the sign.`,
          `The distance is ${answer}.`
        ],
        errorClassifier(val){
          const v = parseNumberInput(val);
          if(v===n) return 'forgot absolute';
          return null;
        }
      };
    }

    if(variant === 'multsign'){
      const a = randInt(2, Math.max(4, 3+level)) * sign();
      const b = randInt(2, Math.max(6, 4+level));
      const prompt = `Compute: (${a}) × ${b}`;
      const answer = a*b;
      return {
        topic:'integers',
        prompt,
        answer,
        multiChoice: makeChoicesInt(answer, 4),
        hints: [
          'Ignore the sign first: multiply the absolute values.',
          'Then apply the sign rule: negative × positive is negative.',
          `Answer: ${answer}.`
        ],
        errorClassifier(val){
          const v = parseNumberInput(val);
          if(Number.isNaN(v)) return 'not-a-number';
          if(Math.abs(v)===Math.abs(answer) && Math.sign(v)!==Math.sign(answer)) return 'sign error';
          return null;
        }
      };
    }

    // add/sub
    const a = randInt(1, mag) * sign();
    const b = randInt(1, mag) * sign();
    const op = choice(['+','-']);
    const answer = op==='+' ? a+b : a-b;
    const prompt = `Compute: ${a} ${op} ${b}`;

    return {
      topic:'integers',
      prompt,
      answer,
      multiChoice: makeChoicesInt(answer, 4+level),
      hints: [
        'Think number line: add → move right, subtract → move left.',
        `Start at ${a}. Then ${op==='+'?'add':'subtract'} ${b}.`,
        `You land on ${answer}.`
      ],
      errorClassifier(val){
        const v = parseNumberInput(val);
        if(Number.isNaN(v)) return 'not-a-number';
        if(Math.abs(v)===Math.abs(answer) && Math.sign(v)!==Math.sign(answer)) return 'sign error';
        return null;
      }
    };
  }

  function decimalProblem(level){
    const variant = choice(['convert','discount','tax','percent-of']);
    if(variant === 'convert'){
      const pct = randInt(5, 85);
      const prompt = `Convert ${pct}% to a decimal.`;
      const answer = +(pct/100).toFixed(2);
      return {
        topic:'decimals',
        prompt,
        answer,
        tolerance: 0.005,
        multiChoice: uniq([answer, +(answer+0.1).toFixed(2), +(answer-0.05).toFixed(2), +(pct/10).toFixed(1)]),
        hints: [
          'Percent means “per 100.”',
          'Divide by 100: move the decimal two places left.',
          `${pct}% = ${(pct/100).toFixed(2)}.`
        ],
        errorClassifier(val){
          const v = parseNumberInput(val);
          if(Number.isNaN(v)) return 'not-a-number';
          if(numberClose(v, pct/10, 0.0001)) return 'moved decimal one place';
          return null;
        }
      };
    }

    if(variant === 'tax'){
      const bill = +( (rnd()*35 + 18).toFixed(2) );
      const tip = choice([10,12,15,18,20]);
      const prompt = `A snack bill is $${bill.toFixed(2)}. Add ${tip}% tip. What is the total?`;
      const answer = +(bill*(1+tip/100)).toFixed(2);
      return {
        topic:'decimals',
        prompt,
        answer,
        tolerance: 0.01,
        multiChoice: makeChoicesNumber(answer, 1.25 + level*0.25),
        hints: [
          'Turn the percent into a decimal.',
          `${tip}% = ${(tip/100).toFixed(2)}. Tip = bill × decimal.`,
          `Total = bill + tip = ${answer.toFixed(2)}.`
        ],
        errorClassifier(val){
          const v = parseNumberInput(val);
          if(Number.isNaN(v)) return 'not-a-number';
          const tipOnly = +(bill*(tip/100)).toFixed(2);
          if(numberClose(v, tipOnly, 0.01)) return 'gave tip only';
          return null;
        }
      };
    }

    if(variant === 'percent-of'){
      const pct = choice([5,10,12,15,18,20,25,30,40]);
      const base = randInt(40, 220) + level*20;
      const prompt = `Find ${pct}% of ${base}.`;
      const answer = +(base*(pct/100)).toFixed(2);
      return {
        topic:'decimals',
        prompt,
        answer,
        tolerance: 0.01,
        multiChoice: makeChoicesNumber(answer, Math.max(2, base*0.05)),
        hints: [
          'Convert the percent to a decimal.',
          `${pct}% = ${(pct/100).toFixed(2)}.`,
          `Multiply: ${base} × ${(pct/100).toFixed(2)} = ${answer.toFixed(2)}.`
        ]
      };
    }

    // discount
    const percent = randInt(5, 40);
    const base = randInt(25, 160) + level*15;
    const discounted = +(base*(1-percent/100)).toFixed(2);
    const prompt = `A price of $${base.toFixed(2)} is discounted ${percent}%. What is the new price?`;

    return {
      topic:'decimals',
      prompt,
      answer: discounted,
      tolerance: 0.01,
      multiChoice: makeChoicesNumber(discounted, 1.5 + level*0.35),
      hints: [
        'Discount means you pay (100% − percent).',
        `You pay ${(100-percent)}% = ${((100-percent)/100).toFixed(2)} of the price.`,
        `New price = ${base.toFixed(2)} × ${((100-percent)/100).toFixed(2)} = ${discounted.toFixed(2)}.`
      ],
      errorClassifier(val){
        const v = parseNumberInput(val);
        if(Number.isNaN(v)) return 'not-a-number';
        const discountOnly = +(base*(percent/100)).toFixed(2);
        if(numberClose(v, discountOnly, 0.01)) return 'computed discount only';
        return null;
      }
    };
  }

  function ratioProblem(level){
    const variant = choice(['unit','scale','speed']);
    if(variant === 'speed'){
      const minutes = choice([10,12,15,18,20]) + level*2;
      const meters = (choice([120,150,180,200,240]) + level*30);
      const prompt = `A drone travels ${meters} meters in ${minutes} minutes. What is the unit rate in meters per minute?`;
      const answer = +(meters/minutes).toFixed(2);
      return {
        topic:'ratios',
        prompt,
        answer,
        tolerance: 0.01,
        multiChoice: makeChoicesNumber(answer, 2+level),
        hints: [
          'Unit rate means “per 1 minute.”',
          `Divide distance by time: ${meters} ÷ ${minutes}.`,
          `Rate = ${answer.toFixed(2)} meters/min.`
        ]
      };
    }

    if(variant === 'scale'){
      const baseServings = choice([2,3,4]);
      const newServings = baseServings + choice([2,3,4,5]);
      const flour = choice([3,4,5,6]) * baseServings;
      const prompt = `A recipe uses ${flour} cups of flour for ${baseServings} servings. How many cups for ${newServings} servings (same ratio)?`;
      const answer = +(flour/baseServings*newServings).toFixed(1);
      return {
        topic:'ratios',
        prompt,
        answer,
        tolerance: 0.05,
        multiChoice: uniq([answer, +(answer+1).toFixed(1), +(answer-1).toFixed(1), +(flour/newServings).toFixed(1)]),
        hints: [
          'Find cups per serving first (unit rate).',
          `${flour} ÷ ${baseServings} = ${(flour/baseServings).toFixed(1)} cups per serving.`,
          `Multiply by ${newServings}: ${(flour/baseServings*newServings).toFixed(1)} cups.`
        ]
      };
    }

    // unit price
    const items = ['glow badges','museum tickets','spark vials','snack chips','mystery stickers'];
    const qty = randInt(2, 8) + level;
    const price = randInt(2, 9);
    const total = qty * price;
    const prompt = `${qty} ${choice(items)} cost $${total}. What is the price per item?`;
    const answer = +(total/qty).toFixed(2);
    return {
      topic:'ratios',
      prompt,
      answer,
      tolerance: 0.01,
      multiChoice: makeChoicesNumber(answer, 1+level*0.25),
      hints: [
        'Unit rate = total ÷ quantity.',
        `Compute ${total} ÷ ${qty}.`,
        `Price per item = ${answer.toFixed(2)}.`
      ]
    };
  }

  function orderProblem(level){
    const variant = choice(['paren','mixed']);
    if(variant === 'mixed' && level >= 3){
      const a = randInt(2, 9);
      const b = randInt(2, 9);
      const c = randInt(2, 6);
      const d = randInt(2, 8);
      const prompt = `Evaluate: ${a}² + ${b}×${c} − ${d}`;
      const answer = a*a + b*c - d;
      return {
        topic:'order',
        prompt,
        answer,
        multiChoice: makeChoicesInt(answer, 5),
        hints: [
          'Exponents first (²).',
          `Compute ${a}² = ${a*a}. Then multiply ${b}×${c} = ${b*c}.`,
          `Combine: ${a*a} + ${b*c} − ${d} = ${answer}.`
        ],
        errorClassifier(val){
          const v = parseNumberInput(val);
          if(v === a + b*c - d) return 'forgot exponent';
          return null;
        }
      };
    }

    const a = randInt(3, 8) + level;
    const b = randInt(2, 9);
    const c = randInt(1, 7);
    const d = randInt(1, 6);
    const prompt = `Evaluate: ${a} + ${b} × (${c} + ${d})`;
    const answer = a + b*(c+d);

    return {
      topic:'order',
      prompt,
      answer,
      multiChoice: makeChoicesInt(answer, 6),
      hints: [
        'Parentheses first.',
        `(${c}+${d}) = ${c+d}. Then multiply by ${b}.`,
        `${b}×${c+d} = ${b*(c+d)}. Add ${a}: ${answer}.`
      ],
      errorClassifier(val){
        const v = parseNumberInput(val);
        if(v === (a+b)* (c+d)) return 'multiplied too early';
        if(v === a + b*c + d) return 'ignored parentheses';
        return null;
      }
    };
  }

  function equationProblem(level){
    const variant = choice(level >= 3 ? ['twostep','x-both','dist'] : ['onestep','twostep']);
    if(variant === 'onestep'){
      const x = randInt(2, 12);
      const b = randInt(2, 15) * sign();
      const op = b >= 0 ? '+' : '−';
      const rhs = x + b;
      const prompt = `Solve for x: x ${op} ${Math.abs(b)} = ${rhs}`;
      const answer = x;
      return {
        topic:'equations',
        prompt,
        answer,
        mirror:true,
        multiChoice: makeChoicesInt(answer, 4),
        hints: [
          'Undo the constant term to isolate x.',
          `Do the opposite of “${op} ${Math.abs(b)}” on both sides.`,
          `x = ${answer}.`
        ],
        errorClassifier(val){
          const v = parseNumberInput(val);
          if(v === rhs) return 'returned RHS';
          return null;
        }
      };
    }

    if(variant === 'dist'){
      const x = randInt(2, 10);
      const a = randInt(2, 5) + Math.floor(level/2);
      const b = randInt(2, 7);
      const rhs = a*(x+b);
      const prompt = `Solve: ${a}(x + ${b}) = ${rhs}`;
      const answer = x;
      return {
        topic:'equations',
        prompt,
        answer,
        mirror:true,
        multiChoice: makeChoicesInt(answer, 4),
        hints: [
          'Divide both sides by the number outside parentheses.',
          `${rhs} ÷ ${a} = ${rhs/a}. Now you have x + ${b} = ${rhs/a}.`,
          `Subtract ${b}: x = ${answer}.`
        ]
      };
    }

    if(variant === 'x-both'){
      const x = randInt(2, 10);
      const m1 = randInt(2, 6);
      let m2 = randInt(1, 5);
      if(m2 === m1) m2 = Math.max(1, m2-1);

      const b = randInt(1, 10) * sign();

      // Build an equation that *guarantees* solution x:
      // m1x + b = m2x + k  where k = (m1-m2)x + b
      const k = (m1 - m2) * x + b;

      const bStr = `${b>=0?'+':'−'} ${Math.abs(b)}`;
      const kStr = k===0 ? '' : ` ${k>=0?'+':'−'} ${Math.abs(k)}`;

      const prompt = `Solve: ${m1}x ${bStr} = ${m2}x${kStr}`;
      const answer = x;

      return {
        topic:'equations',
        prompt,
        answer,
        mirror:true,
        multiChoice: makeChoicesInt(answer, 4),
        hints: [
          'Get all x terms on one side.',
          `Subtract ${m2}x from both sides, then undo the constant.`,
          `You should end with x = ${answer}.`
        ],
        errorClassifier(val){
          const v = parseNumberInput(val);
          if(Number.isNaN(v)) return 'not-a-number';
          return null;
        }
      };
    }

    // Two-step ax + b = c
    const x = randInt(2, 12);
    const a = randInt(2, 6) + Math.floor(level/2);
    const b = randInt(1, 12) * sign();
    const c = a*x + b;
    const prompt = `Solve: ${a}x ${b>=0?'+':'−'} ${Math.abs(b)} = ${c}`;
    const answer = x;

    return {
      topic:'equations',
      prompt,
      answer,
      mirror:true,
      multiChoice: makeChoicesInt(answer, 5),
      hints: [
        'Subtract (or add) the constant from both sides first.',
        `That gives ${a}x = ${c} ${b>=0?'-':'+'} ${Math.abs(b)} = ${a*x}.`,
        `Divide by ${a}: x = ${answer}.`
      ],
      errorClassifier(val){
        const v = parseNumberInput(val);
        if(Number.isNaN(v)) return 'not-a-number';
        if(v === c-b) return 'stopped too early';
        return null;
      }
    };
  }

  function coordinateProblem(level){
    const variant = choice(['quadrant','distance','reflect']);
    if(variant === 'distance'){
      const ax = randInt(-3-level, 3+level);
      const ay = randInt(-3-level, 3+level);
      const bx = ax + choice([1,2,3,4]) * sign();
      const by = ay + choice([1,2,3,4]) * sign();
      const prompt = `Grid distance (Manhattan) between (${ax},${ay}) and (${bx},${by})?`;
      const answer = Math.abs(ax-bx) + Math.abs(ay-by);
      return {
        topic:'coordinates',
        prompt,
        answer,
        multiChoice: makeChoicesInt(answer, 3),
        hints: [
          'Manhattan distance = horizontal steps + vertical steps.',
          `Horizontal: |${ax}−${bx}| = ${Math.abs(ax-bx)}. Vertical: |${ay}−${by}| = ${Math.abs(ay-by)}.`,
          `Total = ${answer}.`
        ]
      };
    }

    if(variant === 'reflect'){
      const x = randInt(1, 6+level) * sign();
      const y = randInt(1, 6+level) * sign();
      const axis = choice(['x-axis','y-axis']);
      const answer = axis==='x-axis' ? `(${x}, ${-y})` : `(${-x}, ${y})`;
      const prompt = `Reflect point (${x}, ${y}) over the ${axis}. Write the new point as (x, y).`;
      return {
        topic:'coordinates',
        prompt,
        answer,
        answerType:'text',
        multiChoice: shuffle([answer, `(${x}, ${y})`, `(${-x}, ${-y})`, axis==='x-axis'?`(${-x}, ${y})`:`(${x}, ${-y})`]).slice(0,4),
        hints: [
          'Reflection flips one sign.',
          axis==='x-axis' ? 'Over the x-axis: y changes sign.' : 'Over the y-axis: x changes sign.',
          `New point is ${answer}.`
        ],
        checkAnswer(input){
          const t = normalizeText(input).replace(/\s+/g,'');
          const a = normalizeText(answer).replace(/\s+/g,'');
          return t === a;
        }
      };
    }

    // quadrant (avoid axis)
    let x = 0, y = 0;
    while(x===0) x = randInt(-7-level, 7+level);
    while(y===0) y = randInt(-7-level, 7+level);

    const prompt = `Which quadrant is point (${x}, ${y}) in?`;
    let quad = 'I';
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

    return {
      topic:'coordinates',
      prompt,
      answer: quad,
      answerType:'text',
      multiChoice: ['I','II','III','IV'],
      hints: [
        'Quadrant I is (+,+). Count counterclockwise.',
        `x is ${x>0?'positive':'negative'}, y is ${y>0?'positive':'negative'}.`,
        `That is quadrant ${quad}.`
      ],
      checkAnswer(input){
        const t = normalizeText(input);
        const cleaned = t.replace('quadrant','').replace('quad','').replace(/[^iv]/g,'').toUpperCase();
        return cleaned === quad;
      },
      errorClassifier(val){
        if(val && normalizeText(val).includes('origin')) return 'origin confusion';
        return null;
      }
    };
  }

  function geometryProblem(level){
    const variant = choice(['area','perimeter','composite']);
    const scale = 1 + Math.floor(level/2);

    if(variant === 'perimeter'){
      const w = randInt(4, 10) * scale;
      const h = randInt(3, 8) * scale;
      const prompt = `A rectangular vault is ${w} by ${h}. What is its perimeter?`;
      const answer = 2*(w+h);
      return {
        topic:'geometry',
        prompt,
        answer,
        multiChoice: makeChoicesInt(answer, 6),
        hints: [
          'Perimeter is the distance around the outside.',
          `Perimeter = 2×(w + h) = 2×(${w}+${h}).`,
          `Perimeter = ${answer}.`
        ]
      };
    }

    if(variant === 'composite'){
      const h = randInt(3, 7) * scale;
      const w1 = randInt(4, 10) * scale;
      const w2 = randInt(2, 6) * scale;
      const area = w1*h + w2*h;
      const prompt = `An L-shaped hallway is a ${w1}×${h} rectangle with a ${w2}×${h} rectangle attached. Total area?`;
      const answer = area;
      return {
        topic:'geometry',
        prompt,
        answer,
        multiChoice: makeChoicesInt(answer, 10),
        hints: [
          'Break composite shapes into rectangles.',
          `Area = (${w1}×${h}) + (${w2}×${h}).`,
          `Area = ${w1*h} + ${w2*h} = ${answer}.`
        ]
      };
    }

    // area
    const w = randInt(4, 12) * scale;
    const h = randInt(3, 9) * scale;
    const prompt = `A laser floor tile is ${w} by ${h}. What is its area?`;
    const answer = w*h;
    return {
      topic:'geometry',
      prompt,
      answer,
      multiChoice: makeChoicesInt(answer, 12),
      hints: [
        'Area of a rectangle = width × height.',
        `Multiply: ${w}×${h}.`,
        `Area = ${answer}.`
      ]
    };
  }

  function mixedProblem(level){
    const gen = choice([integerProblem, decimalProblem, ratioProblem, orderProblem, equationProblem, coordinateProblem, geometryProblem]);
    const p = gen(level);
    p.topic = 'mixed';
    return p;
  }

  // Rhythm mini-locks: fast mental math with choices.
  function rhythmBeat(level){
    const variant = choice(['pct200','times','intAdd']);
    if(variant === 'pct200'){
      const pct = choice([5,10,15,20,25,30,35,40]);
      const answer = (pct/100)*200;
      return {
        topic:'decimals',
        mode:'rhythm',
        timeLimitMs: 3200 - (level*250),
        prompt: `Beat lock: ${pct}% of 200 = ?`,
        answer: +(answer.toFixed(2)),
        tolerance: 0.01,
        multiChoice: makeChoicesInt(answer, 10)
      };
    }
    if(variant === 'times'){
      const a = randInt(3, 9);
      const b = randInt(3, 9);
      return {
        topic:'integers',
        mode:'rhythm',
        timeLimitMs: 3000 - (level*200),
        prompt: `Beat lock: ${a}×${b} = ?`,
        answer: a*b,
        multiChoice: makeChoicesInt(a*b, 8)
      };
    }
    const a = randInt(10, 30) * sign();
    const b = randInt(10, 30) * sign();
    const op = choice(['+','-']);
    const ans = op==='+'? a+b : a-b;
    return {
      topic:'integers',
      mode:'rhythm',
      timeLimitMs: 3200 - (level*250),
      prompt: `Beat lock: ${a} ${op} ${b} = ?`,
      answer: ans,
      multiChoice: makeChoicesInt(ans, 10)
    };
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
    mixed: mixedProblem,
    rhythm: rhythmBeat
  };

  // ---------- Answer checking ----------
  function checkAnswer(problem, input){
    if(problem && typeof problem.checkAnswer === 'function'){
      const ok = !!problem.checkAnswer(input);
      return { correct: ok, parsed: input, errorType: ok ? null : (problem.errorClassifier ? problem.errorClassifier(input) : null) };
    }

    const ans = problem ? problem.answer : undefined;

    if(typeof ans === 'number'){
      const v = parseNumberInput(input);
      if(Number.isNaN(v)) return { correct:false, parsed: NaN, errorType: 'not-a-number' };

      const tol = typeof problem.tolerance === 'number' ? problem.tolerance : autoTol(ans);
      const ok = numberClose(v, ans, tol);

      let err = null;
      if(!ok && typeof problem.errorClassifier === 'function') err = problem.errorClassifier(input);

      return { correct: ok, parsed: v, errorType: err };
    }

    // Text answers: normalize.
    const t = normalizeText(input);
    const a = normalizeText(ans);
    const ok = t === a;
    let err = null;
    if(!ok && typeof problem.errorClassifier === 'function') err = problem.errorClassifier(input);
    return { correct: ok, parsed: t, errorType: err };
  }

  function formatAnswer(problem){
    if(!problem) return '';
    const ans = problem.answer;
    if(typeof ans === 'number'){
      if(Number.isInteger(ans)) return String(ans);
      // Keep two decimals for money-ish answers when it helps.
      if(problem.topic === 'decimals') return ans.toFixed(2);
      return String(ans);
    }
    return String(ans);
  }

  window.MathContent = {
    makeProblem(topic, level){
      const gen = generators[topic] || mixedProblem;
      const p = gen(level || 1);
      p.id = 'p' + Math.floor(Math.random()*1e9);
      return p;
    },
    makeRhythmBeat(level){
      return rhythmBeat(level || 1);
    },
    checkAnswer,
    formatAnswer,
    parseNumberInput,
    normalizeText
  };
})();
