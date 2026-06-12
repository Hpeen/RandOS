// calc-math.js — safe arithmetic evaluator for the Calculator app.
//
// evalCalc(expr) takes a string of numbers and + - * / operators and returns
// a Number, or the string 'Error' for ANY invalid input (including division
// by zero). It never throws and never touches eval/Function: the pipeline is
// tokenize -> shunting-yard (infix to RPN) -> stack evaluation.
//
// Plain script (no ES modules) — top-level declarations become browser
// globals; a CommonJS guard at the bottom lets Node tests require() it.

// Break the expression into number and operator tokens.
// Returns an array of tokens, or null when anything unrecognized appears.
// A '-' (or '+') in prefix position — at the start, or right after another
// operator — is folded into the number it precedes, so '-5*3' and '2*-3' work.
function calcTokenize(expr) {
  if (typeof expr !== 'string') return null;
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ' || ch === '\t') { i++; continue; }
    const prev = tokens[tokens.length - 1];
    const prefixSign = (ch === '-' || ch === '+') &&
      (prev === undefined || typeof prev !== 'number') &&
      /[0-9.]/.test(expr[i + 1] || '');
    if (/[0-9.]/.test(ch) || prefixSign) {
      let j = prefixSign ? i + 1 : i;
      let dots = 0;
      while (j < expr.length && /[0-9.]/.test(expr[j])) {
        if (expr[j] === '.') dots++;
        j++;
      }
      const raw = expr.slice(i, j);
      // Reject '2..3', a lone '.', a sign with no digits, and a trailing
      // dot like '5.' (leading '.5' stays fine — only TRAILING dot errors).
      if (dots > 1 || !/[0-9]/.test(raw) || raw.endsWith('.')) return null;
      const num = Number(raw);
      if (!Number.isFinite(num)) return null;
      tokens.push(num);
      i = j;
    } else if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push(ch);
      i++;
    } else {
      return null; // unknown character
    }
  }
  return tokens;
}

// Convert token list to Reverse Polish Notation via shunting-yard.
// Returns the RPN array, or null when the token sequence is malformed
// (e.g. two operators in a row, leading/trailing operator, empty input).
function calcToRPN(tokens) {
  if (!tokens || tokens.length === 0) return null;
  const out = [];
  const ops = [];
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
  let expectNumber = true; // valid expressions alternate number / operator
  for (const tok of tokens) {
    if (typeof tok === 'number') {
      if (!expectNumber) return null; // two numbers in a row
      out.push(tok);
      expectNumber = false;
    } else {
      if (expectNumber) return null; // operator where a number belongs
      while (ops.length && prec[ops[ops.length - 1]] >= prec[tok]) {
        out.push(ops.pop());
      }
      ops.push(tok);
      expectNumber = true;
    }
  }
  if (expectNumber) return null; // dangling trailing operator
  while (ops.length) out.push(ops.pop());
  return out;
}

// Evaluate an RPN array with a value stack.
// Returns a finite Number, or null on any failure (incl. division by zero).
function calcEvalRPN(rpn) {
  const stack = [];
  for (const tok of rpn) {
    if (typeof tok === 'number') {
      stack.push(tok);
    } else {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) return null;
      let r;
      if (tok === '+') r = a + b;
      else if (tok === '-') r = a - b;
      else if (tok === '*') r = a * b;
      else if (tok === '/') {
        if (b === 0) return null;
        r = a / b;
      } else return null;
      if (!Number.isFinite(r)) return null;
      stack.push(r);
    }
  }
  if (stack.length !== 1) return null;
  return stack[0];
}

// Public entry point. Always returns a Number or the string 'Error'.
function evalCalc(expr) {
  try {
    const tokens = calcTokenize(expr);
    if (tokens === null) return 'Error';
    const rpn = calcToRPN(tokens);
    if (rpn === null) return 'Error';
    const result = calcEvalRPN(rpn);
    if (result === null) return 'Error';
    // Snap float noise (0.1 + 0.2 -> 0.3) without distorting real values.
    return Math.round(result * 1e10) / 1e10;
  } catch (_err) {
    return 'Error';
  }
}

// Dual export: CommonJS for Node tests; top-level declarations already serve
// as globals when loaded via <script src> in the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evalCalc };
}
