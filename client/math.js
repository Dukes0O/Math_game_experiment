(function(){
  const rnd = () => Math.random();
  const choice = (arr) => arr[Math.floor(rnd() * arr.length)];
  const randInt = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
  const sign = () => (rnd() > 0.5 ? 1 : -1);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function uniq(arr){
    const out = [];
    arr.forEach(x => { if(!out.includes(x)) out.push(x); });
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

    let percent = false;
    if(s.endsWith('%')) { percent = true; s = s.slice(0,-1); }

    if(/^-?\d+\/\d+$/.test(s)){
      const [a,b] = s.split('/');
      const n = Number(a), d = Number(b);
      if(d===0) return NaN;
      const frac = n/d;
      return percent ? frac/100 : frac;
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
    return 0.01;
  }

  function makeChoicesNumber(answer, spread){
    const deltas = uniq([spread, -spread, spread*2, -spread*2, spread/2, -spread/2]);
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

  function withHints(base){
    const hints = base.hints || [];
    return Object.assign(base, { hints });
  }

  // ---------- Problem generators ----------
  function integerProblem(level){
    const variant = choice(['addsub','compare','abs','multsign']);
    const mag = 6 + level*6;

    if(variant === 'compare'){
      const a = randInt(1, mag) * sign();
      const b = randInt(1, mag) * sign();
      const answer = a > b ? a : b;
      return {
        topic:'integers',
        prompt: `Which is greater on the number line: ${a} or ${b}?`,
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
      const answer = Math.abs(n);
      return {
        topic:'integers',
        prompt: `Find |${n}| (absolute value).`,
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
      const answer = a*b;
      return {
        topic:'integers',
        prompt: `Compute: (${a}) × ${b}`,
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

    const a = randInt(1, mag) * sign();
    const b = randInt(1, mag) * sign();
    const op = choice(['+','-']);
    const answer = op==='+' ? a+b : a-b;
    return {
      topic:'integers',
      prompt: `Compute: ${a} ${op} ${b}`,
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
      const pct = randInt(5, 90);
      const answer = +(pct/100).toFixed(2);
      return withHints({
        topic:'decimals',
        prompt: `Convert ${pct}% to a decimal.`,
        answer,
        multiChoice: [answer, +(pct/100+0.1).toFixed(2), +(pct/100-0.05).toFixed(2), +(pct/10).toFixed(2)],
        hints: [
          'Percent means per hundred.',
          'Move the decimal two places left.',
          `${pct}% = ${(pct/100).toFixed(2)}`
        ]
      });
    }

    if(variant === 'tax'){
      const bill = +(rnd()*30+20).toFixed(2);
      const tip = choice([10,12,15,18,20]);
      const answer = +(bill*(1+tip/100)).toFixed(2);
      return withHints({
        topic:'decimals',
        prompt: `A snack bill is $${bill.toFixed(2)}. Add ${tip}% tip. What is the total?`,
        answer,
        multiChoice:[answer, +(bill*(1+tip/100+0.05)).toFixed(2), +(bill*(1+tip/100-0.03)).toFixed(2), +(bill*tip/100).toFixed(2)],
        hints: [
          'Convert the tip percent to decimal.',
          `${tip}% as decimal is ${(tip/100).toFixed(2)}. Multiply by the bill.`,
          `Bill + tip = ${bill.toFixed(2)} + ${(bill*tip/100).toFixed(2)} = ${answer}.`
        ]
      });
    }

    if(variant === 'percent-of'){
      const base = +(randInt(10,40)*(level+1)).toFixed(2);
      const pct = randInt(5, 40);
      const answer = +(base*(pct/100)).toFixed(2);
      return withHints({
        topic:'decimals',
        prompt: `Find ${pct}% of $${base.toFixed(2)}.`,
        answer,
        multiChoice: makeChoicesNumber(answer, answer*0.15 || 1),
        hints: [
          'Percent to decimal: divide by 100.',
          `${pct}% = ${(pct/100).toFixed(2)}. Multiply by ${base.toFixed(2)}.`,
          `Result ≈ ${answer}.`
        ]
      });
    }

    const percent = randInt(5, 35);
    const base = randInt(10, 40) * (level+1);
    const discounted = +(base*(1-percent/100)).toFixed(2);
    return withHints({
      topic:'decimals',
      prompt: `A price of $${base.toFixed(2)} is discounted ${percent}%. What is the new price?`,
      answer: discounted,
      multiChoice:[discounted, +(base*(1-percent/100+0.05)).toFixed(2), +(base*(1-percent/100-0.03)).toFixed(2), +(base*(1-percent/100+0.1)).toFixed(2)],
      hints: [
        'Convert percent to decimal first.',
        `${percent}% as decimal is ${(percent/100).toFixed(2)}. Multiply by price to find discount.`,
        `Price - discount = ${base.toFixed(2)} - ${(base*(percent/100)).toFixed(2)} = ${discounted}.`
      ]
    });
  }

  function ratioProblem(level){
    const items = ['glow badges','museum tickets','spark vials'];
    const qty = randInt(2, 7) * (level+1);
    const price = randInt(2, 9);
    const total = qty*price;
    return withHints({
      topic:'ratios',
      prompt: `${qty} ${choice(items)} cost $${total}. What is the price per item?`,
      answer: +(total/qty).toFixed(2),
      multiChoice: makeChoicesNumber(total/qty, 1 + level),
      hints: [
        'Unit rate = total ÷ quantity.',
        `Compute ${total} ÷ ${qty}.`,
        `It equals ${(total/qty).toFixed(2)}.`
      ]
    });
  }

  function orderProblem(level){
    const a = randInt(2, 8) * (level+1);
    const b = randInt(2, 7);
    const c = randInt(2, 5);
    const answer = a + b*(c+2);
    return withHints({
      topic:'order',
      prompt: `Evaluate: ${a} + ${b} * (${c}+2)`,
      answer,
      multiChoice: makeChoicesInt(answer, 6),
      hints: [
        'Remember PEMDAS: parentheses first.',
        `Inside parentheses: ${c}+2=${c+2}. Then multiply by ${b}.`,
        `Compute ${b}*${c+2} then add ${a} to finish: ${answer}.`
      ],
      errorClassifier(val){
        const v = parseNumberInput(val);
        if(v === a + b + c + 2) return 'order-of-ops';
        return null;
      }
    });
  }

  function equationProblem(level){
    if(level >= 3 && rnd() > 0.6){
      const x = randInt(2, 9);
      const m1 = randInt(2, 5);
      const m2 = randInt(2, Math.max(6, 4+level));
      const b1 = randInt(1, 12) * sign();
      const b2 = randInt(1, 10) * sign();
      const prompt = `Solve: ${m1}x ${b1>=0?'+':'−'} ${Math.abs(b1)} = ${m2}x ${b2>=0?'+':'−'} ${Math.abs(b2)}`;
      const answer = Math.round((b2 - b1)/(m1 - m2));
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
      const answer = Math.abs(ax-bx) + Math.abs(ay-by);
      return {
        topic:'coordinates',
        prompt: `Grid distance (Manhattan) between (${ax},${ay}) and (${bx},${by})?`,
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
      const format = (pt)=>normalizeText(pt).replace(/\s+/g,'');
      return {
        topic:'coordinates',
        prompt: `Reflect point (${x}, ${y}) over the ${axis}. Write the new point as (x, y).`,
        answer,
        answerType:'text',
        multiChoice: shuffle([answer, `(${x}, ${y})`, `(${-x}, ${-y})`, axis==='x-axis'?`(${-x}, ${y})`:`(${x}, ${-y})`]).slice(0,4),
        hints: [
          'Reflection flips one sign.',
          axis==='x-axis' ? 'Over the x-axis: y changes sign.' : 'Over the y-axis: x changes sign.',
          `New point is ${answer}.`
        ],
        checkAnswer(input){
          return format(input) === format(answer);
        }
      };
    }

    let x = 0, y = 0;
    while(x===0) x = randInt(-7-level, 7+level);
    while(y===0) y = randInt(-7-level, 7+level);
    let quad = 'I';
    if(x<0 && y>0) quad='II';
    else if(x<0 && y<0) quad='III';
    else if(x>0 && y<0) quad='IV';

    return withHints({
      topic:'coordinates',
      prompt: `Which quadrant is point (${x}, ${y}) in?`,
      answer: quad,
      multiChoice:['I','II','III','IV'],
      hints: [
        'Quadrant I is (+,+). Count clockwise.',
        `x is ${x>0?'positive':'negative'}, y is ${y>0?'positive':'negative'}.`,
        `That lands in quadrant ${quad}.`
      ],
      errorClassifier(val){
        if(val && val.toUpperCase()!==quad) return 'quadrant mix';
        return null;
      }
    });
  }

  function geometryProblem(level){
    const variant = choice(['area','perimeter']);
    if(variant==='perimeter'){
      const w = Math.floor(rnd()*4+3)*(level||1);
      const h = Math.floor(rnd()*3+2)*(level||1);
      const answer = 2*(w+h);
      return withHints({
        topic:'geometry',
        prompt: `A rectangular vault is ${w} by ${h}. What is its perimeter?`,
        answer,
        multiChoice:[answer, 2*w+h, 2*h+w, w*h],
        hints: [
          'Perimeter is the sum of all side lengths.',
          `Add width + height, then double: (${w}+${h})*2.`,
          `Perimeter = ${w+h} * 2 = ${answer}.`
        ]
      });
    }

    const w = Math.floor(rnd()*5+3)*(level);
    const h = Math.floor(rnd()*4+2)*(level);
    const extra = Math.floor(rnd()*3+1);
    const area = w*h + extra*h;
    return withHints({
      topic:'geometry',
      prompt: `An L-shaped hallway is a ${w}x${h} rectangle with a ${extra}x${h} rectangle attached. What is the total area?`,
      answer: area,
      multiChoice:[area, area+5, area-5, area+10],
      hints: [
        'Break composite shapes into rectangles.',
        `Area1 = ${w}*${h}, Area2 = ${extra}*${h}. Add them.`,
        `Total area = ${w*h} + ${extra*h} = ${area}.`
      ]
    });
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
    normalizeText,
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
