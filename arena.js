/* ═══════════════════════════════════════════════════════════════
   DEV ARENA - Code Execution Engine + Test Validation
   ═══════════════════════════════════════════════════════════════ */

const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', color: '#4caf50', emoji: '🟢' },
  medium: { label: 'Medium', color: '#ff9800', emoji: '🟡' },
  hard: { label: 'Hard', color: '#f44336', emoji: '🔴' },
  expert: { label: 'Expert', color: '#9c27b0', emoji: '💀' }
};
const POINTS_MAP = { easy: 2, medium: 4, hard: 8, expert: 18 };

const CODE_PLACEHOLDERS = {
  python: '# Write your Python code here\n',
  java: '// Write your Java code here\n',
  javascript: '// Write your JavaScript code here\n',
  html: '<!-- Write your HTML code here -->\n',
  css: '/* Write your CSS code here */\n',
  php: '<?php\n// Write your PHP code here\n?>',
  c: '// Write your C code here\n',
  cpp: '// Write your C++ code here\n',
  csharp: '// Write your C# code here\n',
  rust: '// Write your Rust code here\n',
  go: '// Write your Go code here\n',
  kotlin: '// Write your Kotlin code here\n',
  swift: '// Write your Swift code here\n',
  typescript: '// Write your TypeScript code here\n',
  ruby: '# Write your Ruby code here\n',
  dart: '// Write your Dart code here\n',
  r: '# Write your R code here\n',
  scala: '// Write your Scala code here\n',
  lua: '-- Write your Lua code here\n',
  solidity: '// Write your Solidity code here\n',
  sql: '-- Write your SQL code here\n',
  assembly: '; Write your Assembly code here\n'
};

/* ═══════════════════════════════════════════════════════════════
   CODE EXECUTION ENGINE (Local + API + Simulation)
   ═══════════════════════════════════════════════════════════════ */

var _pyodideReady = null;
function getPyodide() {
  if (_pyodideReady) return _pyodideReady;
  _pyodideReady = new Promise(function(resolve, reject) {
    if (typeof loadPyodide === 'function') {
      loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/' }).then(resolve).catch(reject);
    } else {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';
      s.onload = function() { loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/' }).then(resolve).catch(reject); };
      s.onerror = function() { reject(new Error('Failed to load Pyodide')); };
      document.head.appendChild(s);
    }
  });
  return _pyodideReady;
}

async function executePythonLocal(code, stdin) {
  try {
    var pyodide = await getPyodide();
    if (stdin) {
      pyodide.runCode('import sys; sys.stdin = __import__("io").StringIO("' + stdin.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '")');
    }
    pyodide.runCode('import sys, io; sys.stdout = io.StringIO()');
    var error = '';
    try { pyodide.runCode(code); }
    catch (e) { error = e.message || String(e); }
    var output = pyodide.runCode('import sys; sys.stdout.getvalue()');
    output = output.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (output.endsWith('\n')) output = output.slice(0, -1);
    if (error && error.trim()) return { success: false, output: output, error: error };
    return { success: true, output: output, error: '' };
  } catch (e) {
    return { success: false, output: '', error: 'Python engine failed: ' + e.message };
  }
}

function executeJavaScript(code) {
  var logs = [];
  var fakeConsole = { log: function() { logs.push(Array.from(arguments).map(String).join(' ')); } };
  try {
    var fn = new Function('console', code);
    fn(fakeConsole);
    var output = logs.join('\n');
    output = output.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (output.endsWith('\n')) output = output.slice(0, -1);
    return { success: true, output: output, error: '' };
  } catch (e) {
    return { success: false, output: logs.join('\n'), error: e.message };
  }
}

function executeLocalSimulation(lang, code, stdin) {
  try {
    if (lang === 'lua') {
      var logs = [];
      var fp = function() { logs.push(Array.from(arguments).map(String).join(' ')); };
      (new Function('print', code))(fp);
      return { success: true, output: logs.join('\n'), error: '' };
    }
    if (lang === 'php') {
      var inner = code.replace(/<\?php/g, '').replace(/\?>/g, '').trim();
      var logs = [];
      var fc = { log: function() { logs.push(Array.from(arguments).map(String).join(' ')); } };
      (new Function('console', inner))(fc);
      return { success: true, output: logs.join('\n'), error: '' };
    }
    var syntaxMap = {
      java: /class\s+\w+|System\.out\.print/,
      c: /#include|printf|int\s+main/,
      cpp: /#include|iostream|cout|int\s+main/,
      csharp: /using\s+System|Console\.Write|class\s+\w+/,
      go: /package\s+main|fmt\.Print|func\s+main/,
      rust: /fn\s+main|println!|fn\s+\w+/,
      kotlin: /fun\s+main|println\(|class\s+\w+/,
      swift: /print\(|import\s+Swift|func\s+\w+/,
      typescript: /console\.log|function\s+\w+|const\s+/,
      dart: /void\s+main|print\(|class\s+\w+/,
      r: /print\(|cat\(|function\s*\(/,
      scala: /object\s+\w+|def\s+main|println/,
      solidity: /pragma\s+solidity|contract\s+\w+/,
      ruby: /puts|print|def\s+\w+/,
      bash: /echo|#!/,
      perl: /print|#!/,
      haskell: /main\s*=|putStrLn/,
      sql: /SELECT|INSERT|CREATE|UPDATE|DELETE|FROM|WHERE/i,
      assembly: /section|\.data|mov|eax|global/
    };
    var pat = syntaxMap[lang];
    if (pat && !pat.test(code)) {
      return { success: false, output: '', error: 'Code does not contain valid ' + lang + ' syntax' };
    }
    return { success: true, output: 'Code validated successfully', error: '' };
  } catch (e) { return { success: false, output: '', error: e.message }; }
}

async function executeViaPiston(lang, code, stdin) {
  var PISTON_LANG_MAP = {
    python:'python', javascript:'javascript', java:'java', c:'c', cpp:'c++',
    csharp:'csharp', rust:'rust', go:'go', kotlin:'kotlin', swift:'swift',
    typescript:'typescript', ruby:'ruby', dart:'dart', r:'rscript',
    scala:'scala', lua:'lua', php:'php', sql:'sqlite3', assembly:'nasm'
  };
  var pistonLang = PISTON_LANG_MAP[lang];
  if (!pistonLang) throw new Error('Unsupported');
  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, 12000);
  try {
    var resp = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: pistonLang, version: '*',
        files: [{ name: lang === 'java' ? 'Main.java' : 'code', content: code }],
        stdin: stdin || ''
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error('API ' + resp.status);
    var data = await resp.json();
    if (data.compile && data.compile.stderr) {
      return { success: false, output: '', error: data.compile.stderr, compileError: true };
    }
    var stdout = (data.run && data.run.stdout) || '';
    var stderr = (data.run && data.run.stderr) || '';
    stdout = stdout.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (stdout.endsWith('\n')) stdout = stdout.slice(0, -1);
    return { success: true, output: stdout, error: stderr };
  } catch (e) { clearTimeout(timer); throw e; }
}

async function executeCode(lang, code, stdin) {
  if (lang === 'javascript') return executeJavaScript(code);
  if (lang === 'html') return { success: true, output: 'HTML code accepted', error: '' };
  if (lang === 'css') return { success: true, output: 'CSS code accepted', error: '' };
  if (lang === 'python') {
    var pyRes = await executePythonLocal(code, stdin);
    if (pyRes.success || (pyRes.error && !pyRes.error.includes('failed'))) return pyRes;
    try { return await executeViaPiston(lang, code, stdin); } catch(_) {}
    return pyRes;
  }
  try { return await executeViaPiston(lang, code, stdin); } catch(_) {}
  return executeLocalSimulation(lang, code, stdin);
}

function validateHTML(code, tests) {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;width:800px;height:600px;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(code);
    doc.close();
    const results = tests.map(function(t) {
      if (t.selector) {
        const found = doc.querySelectorAll(t.selector);
        return found.length > 0;
      }
      if (t.textContent) {
        return doc.body && doc.body.textContent.includes(t.textContent);
      }
      return true;
    });
    document.body.removeChild(iframe);
    const passed = results.every(Boolean);
    return { success: passed, output: passed ? 'All HTML structure checks passed' : 'HTML structure validation failed', error: passed ? '' : 'Missing required elements' };
  } catch (e) {
    return { success: false, output: '', error: e.message };
  }
}

function validateCSS(code, htmlTemplate, tests) {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;width:800px;height:600px;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><style>' + code + '</style></head><body>' + (htmlTemplate || '') + '</body></html>');
    doc.close();
    const results = tests.map(function(t) {
      if (t.selector && t.property && t.value) {
        const el = doc.querySelector(t.selector);
        if (!el) return false;
        const computed = iframe.contentWindow.getComputedStyle(el);
        return computed[t.property] === t.value;
      }
      return true;
    });
    document.body.removeChild(iframe);
    const passed = results.every(Boolean);
    return { success: passed, output: passed ? 'All CSS checks passed' : 'CSS validation failed', error: passed ? '' : 'CSS properties do not match' };
  } catch (e) {
    return { success: false, output: '', error: e.message };
  }
}

async function executeCode(lang, code, stdin) {
  if (lang === 'javascript') return executeJavaScript(code);
  if (lang === 'html') return { success: true, output: 'HTML code accepted', error: '' };
  if (lang === 'css') return { success: true, output: 'CSS code accepted', error: '' };
  return await executeViaPiston(lang, code, stdin);
}

/* ═══════════════════════════════════════════════════════════════
   TEST VALIDATION
   ═══════════════════════════════════════════════════════════════ */

function normalizeOutput(str) {
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]+\n/g, '\n')
    .replace(/\n[ ]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/, '')
    .replace(/^\s+/, '')
    .trim();
}

function compareOutputs(actual, expected) {
  var normActual = normalizeOutput(actual);
  var normExpected = normalizeOutput(expected);
  if (normActual === normExpected) return true;
  var linesActual = normActual.split('\n').map(function(l) { return l.trim(); });
  var linesExpected = normExpected.split('\n').map(function(l) { return l.trim(); });
  if (linesActual.length !== linesExpected.length) return false;
  for (var i = 0; i < linesActual.length; i++) {
    if (linesActual[i] !== linesExpected[i]) return false;
  }
  return true;
}

function runTestCases(code, tests, lang) {
  if (!tests || tests.length === 0) return { passed: false, message: 'No test cases defined', details: [] };

  if (lang === 'html' && tests.some(function(t) { return t.selector || t.textContent; })) {
    return validateHTML(code, tests);
  }
  if (lang === 'css' && tests.some(function(t) { return t.property; })) {
    return validateCSS(code, tests[0] && tests[0].htmlTemplate, tests);
  }

  const details = [];
  let allPassed = true;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const stdin = test.input || '';
    try {
      const result = executeCode(lang, code, stdin);
      const promise = result instanceof Promise ? result : Promise.resolve(result);
      // For sync results, handle directly
      if (!(result instanceof Promise)) {
        if (result.compileError) {
          details.push({ test: i + 1, passed: false, message: 'Compilation Error', expected: test.expected, actual: result.error });
          allPassed = false;
          continue;
        }
        const pass = compareOutputs(result.output, test.expected);
        details.push({ test: i + 1, passed: pass, message: pass ? 'Passed' : 'Failed', expected: test.expected, actual: result.output, error: result.error });
        if (!pass) allPassed = false;
        continue;
      }
      // For async results, we handle them in the caller
      return promise.then(function(r) {
        var d = [];
        var ap = true;
        if (r.compileError) {
          d.push({ test: 1, passed: false, message: 'Compilation Error', expected: test.expected, actual: r.error });
          ap = false;
        } else {
          var p = compareOutputs(r.output, test.expected);
          d.push({ test: 1, passed: p, message: p ? 'Passed' : 'Failed', expected: test.expected, actual: r.output, error: r.error });
          if (!p) ap = false;
        }
        return { passed: ap, message: ap ? 'All tests passed' : 'Some tests failed', details: d };
      });
    } catch (e) {
      details.push({ test: i + 1, passed: false, message: 'Error: ' + e.message, expected: test.expected, actual: '' });
      allPassed = false;
    }
  }
  return { passed: allPassed, message: allPassed ? 'All tests passed' : 'Some tests failed', details: details };
}

/* ═══════════════════════════════════════════════════════════════
   LANGUAGES + CHALLENGES + TEST CASES
   ═══════════════════════════════════════════════════════════════ */

const LANGUAGES = {
  python: {
    name: 'Python', emoji: '🐍', color: '#3776ab',
    challenges: [
      { id:1, title:'Print "Hello World"', difficulty:'easy', points:2, description:'Write a program that prints "Hello World" to the console.',
        tests:[{expected:'Hello World'}] },
      { id:2, title:'Check if a number is even or odd', difficulty:'easy', points:2, description:'Write a program that reads an integer and prints "even" or "odd".',
        tests:[{input:'4',expected:'even'},{input:'7',expected:'odd'},{input:'0',expected:'even'},{input:'13',expected:'odd'}] },
      { id:3, title:'Find the largest of three numbers', difficulty:'easy', points:2, description:'Read three space-separated integers and print the largest.',
        tests:[{input:'3 7 5',expected:'7'},{input:'10 2 8',expected:'10'},{input:'1 1 1',expected:'1'}] },
      { id:4, title:'Reverse a string without using [::-1]', difficulty:'medium', points:4, description:'Read a string and print it reversed without using slice notation [::-1].',
        tests:[{input:'hello',expected:'olleh'},{input:'abc',expected:'cba'},{input:'A',expected:'A'}] },
      { id:5, title:'Count the frequency of each character in a string', difficulty:'medium', points:4, description:'Read a string and print each character and its count sorted by character. Format: "char:count" one per line.',
        tests:[{input:'aab',expected:'a:2\nb:1'},{input:'hello',expected:'e:1\nh:1\nl:2\no:1'}] },
      { id:6, title:'Remove duplicates from a list without using set()', difficulty:'medium', points:4, description:'Read space-separated integers and print unique values in order of first appearance, space-separated.',
        tests:[{input:'1 2 2 3 3 3',expected:'1 2 3'},{input:'5 5 5',expected:'5'}] },
      { id:7, title:'Find the second-largest number without sorting', difficulty:'hard', points:8, description:'Read space-separated integers and print the second largest.',
        tests:[{input:'5 3 8 1 9',expected:'8'},{input:'1 2 3 4 5',expected:'4'},{input:'10 10 9',expected:'9'}] },
      { id:8, title:'Implement a recursive Fibonacci function', difficulty:'hard', points:8, description:'Read an integer n and print the nth Fibonacci number (0-indexed: F(0)=0, F(1)=1).',
        tests:[{input:'0',expected:'0'},{input:'1',expected:'1'},{input:'6',expected:'8'},{input:'10',expected:'55'}] },
      { id:9, title:'Implement a custom map() function', difficulty:'expert', points:18, description:'Read space-separated integers. Apply double to each using your custom map and print space-separated.',
        tests:[{input:'1 2 3',expected:'2 4 6'},{input:'10 20',expected:'20 40'}] },
      { id:10, title:'Build a simple expression evaluator without using eval()', difficulty:'expert', points:18, description:'Read a single line with a simple arithmetic expression (+,-,*,/ with integers, no parentheses). Print the result as integer (integer division).',
        tests:[{input:'3+5',expected:'8'},{input:'10-3',expected:'7'},{input:'4*5',expected:'20'},{input:'10/3',expected:'3'}] }
    ]
  },
  java: {
    name: 'Java', emoji: '☕', color: '#f89820',
    challenges: [
      { id:1, title:'Print "Hello World"', difficulty:'easy', points:2, description:'Write a Java program that prints "Hello World" to the console.',
        tests:[{expected:'Hello World'}] },
      { id:2, title:'Check if a number is prime', difficulty:'easy', points:2, description:'Read an integer. Print "prime" if it is prime, "not prime" otherwise.',
        tests:[{input:'7',expected:'prime'},{input:'4',expected:'not prime'},{input:'2',expected:'prime'},{input:'1',expected:'not prime'}] },
      { id:3, title:'Calculate the factorial of a number', difficulty:'easy', points:2, description:'Read an integer n and print n! (factorial).',
        tests:[{input:'0',expected:'1'},{input:'5',expected:'120'},{input:'10',expected:'3628800'}] },
      { id:4, title:'Reverse a string without reverse()', difficulty:'medium', points:4, description:'Read a string and print it reversed without StringBuilder.reverse().',
        tests:[{input:'hello',expected:'olleh'},{input:'abc',expected:'cba'}] },
      { id:5, title:'Find duplicate elements in an array', difficulty:'medium', points:4, description:'Read space-separated integers. Print duplicates sorted, space-separated.',
        tests:[{input:'1 2 3 2 1',expected:'1 2'},{input:'1 2 3',expected:''}] },
      { id:6, title:'Implement a simple BankAccount class', difficulty:'medium', points:4, description:'Read "deposit amount" or "withdraw amount" or "balance". Print balance after each command. Start with 0.',
        tests:[{input:'deposit 100\nwithdraw 30\nbalance',expected:'70'},{input:'deposit 50\ndeposit 50\nbalance',expected:'100'}] },
      { id:7, title:'Implement a custom generic Stack', difficulty:'hard', points:8, description:'Read commands: "push value", "pop", "peek", "size". Print result of each pop/peek/size.',
        tests:[{input:'push 10\npush 20\npeek\npop\npop\nsize',expected:'20\n20\n10\n0'}] },
      { id:8, title:'Find the longest substring without repeating characters', difficulty:'hard', points:8, description:'Read a string and print its length.',
        tests:[{input:'abcabcbb',expected:'3'},{input:'bbbbb',expected:'1'},{input:'pwwkew',expected:'3'}] },
      { id:9, title:'Implement an LRU Cache', difficulty:'expert', points:18, description:'Read commands: "put key value", "get key". Print get results. Capacity=2.',
        tests:[{input:'put 1 1\nput 2 2\nget 1\nput 3 3\nget 2',expected:'1\n-1'}] },
      { id:10, title:'Build a multithreaded producer-consumer system', difficulty:'expert', points:18, description:'Print "Producer: item produced" and "Consumer: item consumed" for 3 items.',
        tests:[{expected:'Producer: item produced\nConsumer: item consumed\nProducer: item produced\nConsumer: item consumed\nProducer: item produced\nConsumer: item consumed'}] }
    ]
  },
  javascript: {
    name: 'JavaScript', emoji: '🟨', color: '#f7df1e',
    challenges: [
      { id:1, title:'Check if a number is even', difficulty:'easy', points:2, description:'Write a function isEven(n) that returns true if n is even. Call it with: console.log(isEven(4)) and console.log(isEven(7)).',
        tests:[{expected:'true\nfalse'}] },
      { id:2, title:'Find the largest number in an array', difficulty:'easy', points:2, description:'Write function largest(arr) returning the max. Call: console.log(largest([3,7,2,9,4])).',
        tests:[{expected:'9'}] },
      { id:3, title:'Reverse a string', difficulty:'easy', points:2, description:'Write function reverseStr(s). Call: console.log(reverseStr("hello")).',
        tests:[{expected:'olleh'}] },
      { id:4, title:'Remove duplicate values from an array', difficulty:'medium', points:4, description:'Write function unique(arr). Call: console.log(JSON.stringify(unique([1,2,2,3,3,3]))).',
        tests:[{expected:'[1,2,3]'}] },
      { id:5, title:'Count character occurrences', difficulty:'medium', points:4, description:'Write function charCount(s). Call: console.log(JSON.stringify(charCount("aab"))).',
        tests:[{expected:'{"a":2,"b":1}'}] },
      { id:6, title:'Implement a debounce function', difficulty:'medium', points:4, description:'Write function debounce(fn, delay). Call: var d = debounce(function(){console.log("done")},100); console.log(typeof d);',
        tests:[{expected:'function'}] },
      { id:7, title:'Implement a deep clone function', difficulty:'hard', points:8, description:'Write function deepClone(obj). Call: var o={a:1,b:{c:2}}; var c=deepClone(o); c.b.c=99; console.log(o.b.c, c.b.c).',
        tests:[{expected:'2 99'}] },
      { id:8, title:'Create a Promise-based retry system', difficulty:'hard', points:8, description:'Write function retry(fn, attempts). Call: retry(function(){return Promise.resolve("ok")},3).then(console.log).',
        tests:[{expected:'ok'}] },
      { id:9, title:'Implement your own Promise.all()', difficulty:'expert', points:18, description:'Write function myPromiseAll(promises). Call: myPromiseAll([Promise.resolve(1),Promise.resolve(2)]).then(r=>console.log(JSON.stringify(r))).',
        tests:[{expected:'[1,2]'}] },
      { id:10, title:'Build a small event emitter system', difficulty:'expert', points:18, description:'Write class EventEmitter with on/emit. Call: var ee=new EventEmitter(); ee.on("data",function(d){console.log(d)}); ee.emit("data","hello").',
        tests:[{expected:'hello'}] }
    ]
  },
  html: {
    name: 'HTML', emoji: '🌐', color: '#e34c26',
    challenges: [
      { id:1, title:'Create a basic HTML page', difficulty:'easy', points:2, description:'Create a valid HTML5 page with doctype, html, head, title, and body tags.',
        tests:[{selector:'html'},{selector:'head'},{selector:'title'},{selector:'body'}] },
      { id:2, title:'Create a form with name and email', difficulty:'easy', points:2, description:'Create a form with name and email input fields.',
        tests:[{selector:'form'},{selector:'input[name]'},{selector:'input[type="email"], input[name*="email"]'}] },
      { id:3, title:'Create a navigation menu', difficulty:'easy', points:2, description:'Create a navigation menu using semantic HTML elements.',
        tests:[{selector:'nav'},{selector:'nav a'}] },
      { id:4, title:'Build a semantic webpage using HTML5 elements', difficulty:'medium', points:4, description:'Build a webpage using header, nav, main, article, aside, footer.',
        tests:[{selector:'header'},{selector:'nav'},{selector:'main'},{selector:'article'},{selector:'aside'},{selector:'footer'}] },
      { id:5, title:'Create an accessible form', difficulty:'medium', points:4, description:'Create a form with proper labels using for attribute.',
        tests:[{selector:'form'},{selector:'label[for]'},{selector:'input[id]'}] },
      { id:6, title:'Create a responsive image gallery structure', difficulty:'medium', points:4, description:'Create a figure element with an img and figcaption.',
        tests:[{selector:'figure'},{selector:'figure img'},{selector:'figcaption'}] },
      { id:7, title:'Build a complex accessible data table', difficulty:'hard', points:8, description:'Build a table with thead, tbody, th with scope attribute.',
        tests:[{selector:'table'},{selector:'thead'},{selector:'tbody'},{selector:'th[scope]'}] },
      { id:8, title:'Create a complete article layout using semantic HTML', difficulty:'hard', points:8, description:'Create article with header, section, figure, and figcaption.',
        tests:[{selector:'article'},{selector:'article header'},{selector:'article section'},{selector:'figure'}] },
      { id:9, title:'Build a complex multi-step form structure', difficulty:'expert', points:18, description:'Create a form with fieldset elements and legend.',
        tests:[{selector:'form'},{selector:'fieldset'},{selector:'legend'}] },
      { id:10, title:'Design the HTML architecture for a large web application', difficulty:'expert', points:18, description:'Design HTML with header, nav, main, aside, section, article, and footer.',
        tests:[{selector:'header'},{selector:'nav'},{selector:'main'},{selector:'aside'},{selector:'section'},{selector:'article'},{selector:'footer'}] }
    ]
  },
  css: {
    name: 'CSS', emoji: '🎨', color: '#264de4',
    challenges: [
      { id:1, title:'Center an element horizontally and vertically', difficulty:'easy', points:2, description:'Center a div with class "box" horizontally and vertically on the page.',
        tests:[{selector:'.box',property:'display',value:'flex',htmlTemplate:'<div class="box"></div>'}] },
      { id:2, title:'Create a Flexbox navigation bar', difficulty:'easy', points:2, description:'Style nav.bar with flexbox display.',
        tests:[{selector:'.bar',property:'display',value:'flex',htmlTemplate:'<nav class="bar"></nav>'}] },
      { id:3, title:'Change an element on hover', difficulty:'easy', points:2, description:'Set .btn background-color to #333.',
        tests:[{selector:'.btn',property:'background-color',value:'rgb(51, 51, 51)',htmlTemplate:'<div class="btn"></div>'}] },
      { id:4, title:'Create a responsive grid', difficulty:'medium', points:4, description:'Set .grid display to grid.',
        tests:[{selector:'.grid',property:'display',value:'grid',htmlTemplate:'<div class="grid"></div>'}] },
      { id:5, title:'Build a CSS card component', difficulty:'medium', points:4, description:'Set .card border-radius to 8px.',
        tests:[{selector:'.card',property:'border-radius',value:'8px',htmlTemplate:'<div class="card"></div>'}] },
      { id:6, title:'Build a dark/light theme using CSS variables', difficulty:'medium', points:4, description:'Define a CSS variable --bg with value white on :root.',
        tests:[{selector:':root',property:'--bg',value:'white',htmlTemplate:''}] },
      { id:7, title:'Build a responsive dashboard without frameworks', difficulty:'hard', points:8, description:'Set .sidebar width to 250px and position fixed.',
        tests:[{selector:'.sidebar',property:'width',value:'250px',htmlTemplate:'<div class="sidebar"></div>'}] },
      { id:8, title:'Create complex CSS animations', difficulty:'hard', points:8, description:'Define a @keyframes named "slide" that moves from left 0 to left 100px.',
        tests:[{selector:'.animated',property:'animation-name',value:'slide',htmlTemplate:'<div class="animated"></div>'}] },
      { id:9, title:'Build a responsive layout using advanced Grid techniques', difficulty:'expert', points:18, description:'Set .layout display to grid with grid-template-columns: 1fr 2fr.',
        tests:[{selector:'.layout',property:'display',value:'grid',htmlTemplate:'<div class="layout"></div>'}] },
      { id:10, title:'Recreate a complete modern UI using only HTML/CSS', difficulty:'expert', points:18, description:'Set .card box-shadow to contain "rgba".',
        tests:[{selector:'.card',property:'box-shadow',value:'rgba(0, 0, 0, 0.1) 0px 2px 4px 0px',htmlTemplate:'<div class="card"></div>'}] }
    ]
  },
  php: {
    name: 'PHP', emoji: '🐘', color: '#777bb4',
    challenges: [
      { id:1, title:'Print "Hello World"', difficulty:'easy', points:2, description:'Write a PHP script that prints "Hello World".',
        tests:[{expected:'Hello World'}] },
      { id:2, title:'Check if a number is even', difficulty:'easy', points:2, description:'Read an integer. Print "even" or "odd".',
        tests:[{input:'4',expected:'even'},{input:'7',expected:'odd'}] },
      { id:3, title:'Create a simple function', difficulty:'easy', points:2, description:'Read two integers separated by space. Print their sum.',
        tests:[{input:'3 5',expected:'8'},{input:'10 20',expected:'30'}] },
      { id:4, title:'Process a form using POST', difficulty:'medium', points:4, description:'Read "name" from stdin and print "Hello, {name}".',
        tests:[{input:'Alice',expected:'Hello, Alice'},{input:'Bob',expected:'Hello, Bob'}] },
      { id:5, title:'Create a session-based login system', difficulty:'medium', points:4, description:'Read "user pass" and print "logged_in" if user is "admin" and pass is "1234", else "denied".',
        tests:[{input:'admin 1234',expected:'logged_in'},{input:'user pass',expected:'denied'}] },
      { id:6, title:'Connect PHP to MySQL', difficulty:'medium', points:4, description:'Read integers. Print their sorted unique values.',
        tests:[{input:'3 1 2 3',expected:'1 2 3'},{input:'5 5 5',expected:'5'}] },
      { id:7, title:'Build CRUD operations', difficulty:'hard', points:8, description:'Read lines: "add value", "list", "remove value". Print list results.',
        tests:[{input:'add 10\nadd 20\nlist\nremove 10\nlist',expected:'10 20\n20'}] },
      { id:8, title:'Create a REST API', difficulty:'hard', points:8, description:'Read a JSON object and print keys sorted.',
        tests:[{input:'{"b":2,"a":1}',expected:'a\nb'}] },
      { id:9, title:'Build a secure authentication system', difficulty:'expert', points:18, description:'Read lines of "register user pass" and "login user pass". Print "registered"/"logged_in"/"denied".',
        tests:[{input:'register admin secret\nlogin admin secret\nlogin admin wrong',expected:'registered\nlogged_in\ndenied'}] },
      { id:10, title:'Create a complete MVC-style application', difficulty:'expert', points:18, description:'Read a number and print "MVC" repeated that many times, one per line.',
        tests:[{input:'3',expected:'MVC\nMVC\nMVC'}] }
    ]
  },
  c: {
    name: 'C', emoji: '🔵', color: '#a8b9cc',
    challenges: [
      { id:1, title:'Print "Hello World"', difficulty:'easy', points:2, description:'Write a C program that prints "Hello World".',
        tests:[{expected:'Hello World'}] },
      { id:2, title:'Find the largest number', difficulty:'easy', points:2, description:'Read three integers and print the largest.',
        tests:[{input:'3 7 5',expected:'7'},{input:'10 2 8',expected:'10'}] },
      { id:3, title:'Calculate factorial', difficulty:'easy', points:2, description:'Read an integer n and print n!.',
        tests:[{input:'0',expected:'1'},{input:'5',expected:'120'},{input:'10',expected:'3628800'}] },
      { id:4, title:'Reverse an array', difficulty:'medium', points:4, description:'Read integers then print them reversed.',
        tests:[{input:'1 2 3 4 5',expected:'5 4 3 2 1'},{input:'10 20',expected:'20 10'}] },
      { id:5, title:'Work with pointers', difficulty:'medium', points:4, description:'Read two integers a b. Print "b a" (swap using pointers).',
        tests:[{input:'3 7',expected:'7 3'},{input:'10 20',expected:'20 10'}] },
      { id:6, title:'Implement a linked list', difficulty:'medium', points:4, description:'Read integers until 0. Print them in reverse order.',
        tests:[{input:'1 2 3 0',expected:'3 2 1'},{input:'5 0',expected:'5'}] },
      { id:7, title:'Implement a binary search tree', difficulty:'hard', points:8, description:'Read integers then a search value. Print "found" or "not found".',
        tests:[{input:'5 3 7 1\n7',expected:'found'},{input:'5 3 7 1\n2',expected:'not found'}] },
      { id:8, title:'Build a dynamic memory allocator concept', difficulty:'hard', points:8, description:'Read integers. Print their sum.',
        tests:[{input:'1 2 3 4 5',expected:'15'},{input:'10 20',expected:'30'}] },
      { id:9, title:'Implement a hash table from scratch', difficulty:'expert', points:18, description:'Read "set key value" and "get key" commands. Print get results.',
        tests:[{input:'set a 10\nset b 20\nget a\nget b',expected:'10\n20'}] },
      { id:10, title:'Build a miniature command-line shell', difficulty:'expert', points:18, description:'Read lines and echo them with "> " prefix.',
        tests:[{input:'hello\nworld',expected:'> hello\n> world'}] }
    ]
  },
  cpp: {
    name: 'C++', emoji: '⚙️', color: '#00599c',
    challenges: [
      { id:1, title:'Print "Hello World"', difficulty:'easy', points:2, description:'Write a C++ program that prints "Hello World".',
        tests:[{expected:'Hello World'}] },
      { id:2, title:'Find the largest number', difficulty:'easy', points:2, description:'Read three integers and print the largest.',
        tests:[{input:'3 7 5',expected:'7'},{input:'10 2 8',expected:'10'}] },
      { id:3, title:'Check for prime numbers', difficulty:'easy', points:2, description:'Read an integer. Print "prime" or "not prime".',
        tests:[{input:'7',expected:'prime'},{input:'4',expected:'not prime'},{input:'2',expected:'prime'}] },
      { id:4, title:'Use classes to create a Student system', difficulty:'medium', points:4, description:'Read name grade pairs. Print "name:grade" format.',
        tests:[{input:'Alice 90\nBob 85',expected:'Alice:90\nBob:85'}] },
      { id:5, title:'Implement a vector-like container', difficulty:'medium', points:4, description:'Read integers, push them, then print them in reverse.',
        tests:[{input:'1 2 3',expected:'3 2 1'},{input:'10 20',expected:'20 10'}] },
      { id:6, title:'Implement a linked list', difficulty:'medium', points:4, description:'Read integers until 0. Print them.',
        tests:[{input:'1 2 3 0',expected:'1 2 3'},{input:'5 0',expected:'5'}] },
      { id:7, title:'Implement a binary search tree', difficulty:'hard', points:8, description:'Read integers then search value. Print "found" or "not found".',
        tests:[{input:'5 3 7\n7',expected:'found'},{input:'5 3 7\n2',expected:'not found'}] },
      { id:8, title:'Create a custom smart pointer', difficulty:'hard', points:8, description:'Read a number and print "Smart ptr holds: {number}".',
        tests:[{input:'42',expected:'Smart ptr holds: 42'},{input:'0',expected:'Smart ptr holds: 0'}] },
      { id:9, title:'Implement a thread-safe queue', difficulty:'expert', points:18, description:'Read integers and print them in FIFO order.',
        tests:[{input:'1 2 3',expected:'1 2 3'},{input:'10 20 30',expected:'10 20 30'}] },
      { id:10, title:'Build a memory pool allocator', difficulty:'expert', points:18, description:'Read n then print n blocks allocated, one per line.',
        tests:[{input:'3',expected:'Block 1 allocated\nBlock 2 allocated\nBlock 3 allocated'}] }
    ]
  },
  csharp: {
    name: 'C#', emoji: '#️⃣', color: '#178600',
    challenges: [
      { id:1, title:'Print "Hello World"', difficulty:'easy', points:2, description:'Write a C# program that prints "Hello World".',
        tests:[{expected:'Hello World'}] },
      { id:2, title:'Check even/odd', difficulty:'easy', points:2, description:'Read an integer. Print "even" or "odd".',
        tests:[{input:'4',expected:'even'},{input:'7',expected:'odd'}] },
      { id:3, title:'Calculate factorial', difficulty:'easy', points:2, description:'Read n and print n!.',
        tests:[{input:'5',expected:'120'},{input:'0',expected:'1'}] },
      { id:4, title:'Create a Student class', difficulty:'medium', points:4, description:'Read name score. Print "name scored score".',
        tests:[{input:'Alice 95',expected:'Alice scored 95'},{input:'Bob 80',expected:'Bob scored 80'}] },
      { id:5, title:'Work with LINQ to filter data', difficulty:'medium', points:4, description:'Read integers. Print only even ones sorted.',
        tests:[{input:'3 1 4 1 5 9',expected:'4'},{input:'2 4 6 8',expected:'2 4 6 8'}] },
      { id:6, title:'Build a simple file manager', difficulty:'medium', points:4, description:'Read commands: "create name", "list", "delete name". Print results.',
        tests:[{input:'create a.txt\ncreate b.txt\nlist\ndelete a.txt\nlist',expected:'a.txt b.txt\nb.txt'}] },
      { id:7, title:'Create an async task system', difficulty:'hard', points:8, description:'Read integers and print them squared.',
        tests:[{input:'2 3 4',expected:'4 9 16'},{input:'5',expected:'25'}] },
      { id:8, title:'Build a REST API', difficulty:'hard', points:8, description:'Read lines of "method path". Print formatted routes.',
        tests:[{input:'GET /users\nPOST /users',expected:'GET /users\nPOST /users'}] },
      { id:9, title:'Implement a custom dependency injection container', difficulty:'expert', points:18, description:'Read service names and print "Registered: {name}".',
        tests:[{input:'Logger Cache',expected:'Registered: Logger\nRegistered: Cache'}] },
      { id:10, title:'Build a multithreaded application architecture', difficulty:'expert', points:18, description:'Read n and print "Worker {i} done" for each.',
        tests:[{input:'3',expected:'Worker 1 done\nWorker 2 done\nWorker 3 done'}] }
    ]
  },
  rust: {
    name: 'Rust', emoji: '🦀', color: '#dea584',
    challenges: [
      { id:1, title:'Print "Hello World"', difficulty:'easy', points:2, description:'Write a Rust program that prints "Hello World".',
        tests:[{expected:'Hello World'}] },
      { id:2, title:'Check if a number is even', difficulty:'easy', points:2, description:'Read an integer. Print "even" or "odd".',
        tests:[{input:'4',expected:'even'},{input:'7',expected:'odd'}] },
      { id:3, title:'Calculate factorial', difficulty:'easy', points:2, description:'Read n and print n!.',
        tests:[{input:'5',expected:'120'},{input:'0',expected:'1'}] },
      { id:4, title:'Work with struct and impl', difficulty:'medium', points:4, description:'Read width height. Print "Area: {area}".',
        tests:[{input:'5 3',expected:'Area: 15'},{input:'10 10',expected:'Area: 100'}] },
      { id:5, title:'Manipulate Vec<T>', difficulty:'medium', points:4, description:'Read integers. Print them doubled, space-separated.',
        tests:[{input:'1 2 3',expected:'2 4 6'},{input:'10 20',expected:'20 40'}] },
      { id:6, title:'Handle Result and Option', difficulty:'medium', points:4, description:'Read an integer. Print "Some(n)" or "None" if 0.',
        tests:[{input:'5',expected:'Some(5)'},{input:'0',expected:'None'}] },
      { id:7, title:'Implement a linked list', difficulty:'hard', points:8, description:'Read integers until 0. Print them.',
        tests:[{input:'1 2 3 0',expected:'1 2 3'},{input:'5 0',expected:'5'}] },
      { id:8, title:'Build a concurrent worker system', difficulty:'hard', points:8, description:'Read n. Print "Task {i} completed" for each.',
        tests:[{input:'3',expected:'Task 1 completed\nTask 2 completed\nTask 3 completed'}] },
      { id:9, title:'Implement a custom smart pointer', difficulty:'expert', points:18, description:'Read a number and print "Value: {number}, Count: 1".',
        tests:[{input:'42',expected:'Value: 42, Count: 1'}] },
      { id:10, title:'Build a small asynchronous runtime concept', difficulty:'expert', points:18, description:'Read n. Print "Spawned {i}" then "Completed {i}" for each.',
        tests:[{input:'2',expected:'Spawned 1\nSpawned 2\nCompleted 1\nCompleted 2'}] }
    ]
  },
  go: {
    name: 'Go', emoji: '🔷', color: '#00add8',
    challenges: [
      { id:1, title:'Print "Hello World"', difficulty:'easy', points:2, description:'Write a Go program that prints "Hello World".',
        tests:[{expected:'Hello World'}] },
      { id:2, title:'Check even/odd', difficulty:'easy', points:2, description:'Read an integer. Print "even" or "odd".',
        tests:[{input:'4',expected:'even'},{input:'7',expected:'odd'}] },
      { id:3, title:'Find the largest number', difficulty:'easy', points:2, description:'Read three integers and print the largest.',
        tests:[{input:'3 7 5',expected:'7'},{input:'10 2 8',expected:'10'}] },
      { id:4, title:'Work with structs', difficulty:'medium', points:4, description:'Read name age. Print "name is age years old".',
        tests:[{input:'Alice 30',expected:'Alice is 30 years old'}] },
      { id:5, title:'Create a goroutine', difficulty:'medium', points:4, description:'Print "goroutine started" then "main done".',
        tests:[{expected:'goroutine started\nmain done'}] },
      { id:6, title:'Use channels for communication', difficulty:'medium', points:4, description:'Print numbers 1 to 5 using channel pattern.',
        tests:[{expected:'1\n2\n3\n4\n5'}] },
      { id:7, title:'Build a concurrent worker pool', difficulty:'hard', points:8, description:'Read n. Print "Processed {i}" for each.',
        tests:[{input:'3',expected:'Processed 1\nProcessed 2\nProcessed 3'}] },
      { id:8, title:'Create a REST API', difficulty:'hard', points:8, description:'Print "GET /api" then "POST /api".',
        tests:[{expected:'GET /api\nPOST /api'}] },
      { id:9, title:'Build a distributed task queue', difficulty:'expert', points:18, description:'Read n. Print "Task {i} queued" then "Task {i} done".',
        tests:[{input:'2',expected:'Task 1 queued\nTask 2 queued\nTask 1 done\nTask 2 done'}] },
      { id:10, title:'Implement a concurrent in-memory database', difficulty:'expert', points:18, description:'Print "DB started" then "DB ready".',
        tests:[{expected:'DB started\nDB ready'}] }
    ]
  },
  kotlin: {
    name: 'Kotlin', emoji: '🟪', color: '#a97bff',
    challenges: [
      { id:1, title:'Print "Hello World"', difficulty:'easy', points:2, description:'Write a Kotlin program that prints "Hello World".',
        tests:[{expected:'Hello World'}] },
      { id:2, title:'Check even/odd', difficulty:'easy', points:2, description:'Read an integer. Print "even" or "odd".',
        tests:[{input:'4',expected:'even'},{input:'7',expected:'odd'}] },
      { id:3, title:'Calculate factorial', difficulty:'easy', points:2, description:'Read n and print n!.',
        tests:[{input:'5',expected:'120'},{input:'0',expected:'1'}] },
      { id:4, title:'Use data classes', difficulty:'medium', points:4, description:'Read name score. Print "Person(name=name, score=score)".',
        tests:[{input:'Alice 95',expected:'Person(name=Alice, score=95)'}] },
      { id:5, title:'Work with collections', difficulty:'medium', points:4, description:'Read integers. Print doubled values space-separated.',
        tests:[{input:'1 2 3',expected:'2 4 6'},{input:'10',expected:'20'}] },
      { id:6, title:'Use coroutines', difficulty:'medium', points:4, description:'Print "Coroutine launched" then "Main finished".',
        tests:[{expected:'Coroutine launched\nMain finished'}] },
      { id:7, title:'Build a coroutine-based task system', difficulty:'hard', points:8, description:'Read n. Print "Task {i} done" for each.',
        tests:[{input:'3',expected:'Task 1 done\nTask 2 done\nTask 3 done'}] },
      { id:8, title:'Create a REST API', difficulty:'hard', points:8, description:'Print "Server started on port 8080".',
        tests:[{expected:'Server started on port 8080'}] },
      { id:9, title:'Design a concurrent cache', difficulty:'expert', points:18, description:'Print "Cache initialized" then "Cache hit: key1".',
        tests:[{expected:'Cache initialized\nCache hit: key1'}] },
      { id:10, title:'Build a complete backend architecture', difficulty:'expert', points:18, description:'Print "Router ready" then "Handler registered" then "App running".',
        tests:[{expected:'Router ready\nHandler registered\nApp running'}] }
    ]
  },
  swift: {
    name: 'Swift', emoji: '🍎', color: '#fa7343',
    challenges: [
      { id:1, title:'Print "Hello World"', difficulty:'easy', points:2, description:'Write a Swift program that prints "Hello World".',
        tests:[{expected:'Hello World'}] },
      { id:2, title:'Check even/odd', difficulty:'easy', points:2, description:'Read an integer. Print "even" or "odd".',
        tests:[{input:'4',expected:'even'},{input:'7',expected:'odd'}] },
      { id:3, title:'Find the largest number', difficulty:'easy', points:2, description:'Read three integers and print the largest.',
        tests:[{input:'3 7 5',expected:'7'},{input:'10 2 8',expected:'10'}] },
      { id:4, title:'Work with structs', difficulty:'medium', points:4, description:'Read name age. Print "name is age years old".',
        tests:[{input:'Alice 25',expected:'Alice is 25 years old'}] },
      { id:5, title:'Use optionals safely', difficulty:'medium', points:4, description:'Read an integer. Print "Value: n" if non-zero, "nil" if zero.',
        tests:[{input:'5',expected:'Value: 5'},{input:'0',expected:'nil'}] },
      { id:6, title:'Work with protocols', difficulty:'medium', points:4, description:'Print "Protocol conforming" then "Method called".',
        tests:[{expected:'Protocol conforming\nMethod called'}] },
      { id:7, title:'Build an asynchronous networking layer', difficulty:'hard', points:8, description:'Print "Request sent" then "Response received".',
        tests:[{expected:'Request sent\nResponse received'}] },
      { id:8, title:'Implement a custom data structure', difficulty:'hard', points:8, description:'Read integers and print them in FIFO order.',
        tests:[{input:'1 2 3',expected:'1 2 3'},{input:'10 20',expected:'10 20'}] },
      { id:9, title:'Build a concurrent task manager', difficulty:'expert', points:18, description:'Read n. Print "Task {i} started" then "Task {i} completed".',
        tests:[{input:'2',expected:'Task 1 started\nTask 2 started\nTask 1 completed\nTask 2 completed'}] },
      { id:10, title:'Design a complete application architecture', difficulty:'expert', points:18, description:'Print "View loaded" then "Model ready" then "ViewModel bound".',
        tests:[{expected:'View loaded\nModel ready\nViewModel bound'}] }
    ]
  },
  typescript: {
    name: 'TypeScript', emoji: '🟦', color: '#3178c6',
    challenges: [
      { id:1, title:'Create a typed variable', difficulty:'easy', points:2, description:'Declare a string variable and print it.',
        tests:[{expected:'hello'}] },
      { id:2, title:'Create a typed function', difficulty:'easy', points:2, description:'Write a function add(a:number,b:number):number. Print add(3,5).',
        tests:[{expected:'8'}] },
      { id:3, title:'Define an interface', difficulty:'easy', points:2, description:'Define interface User{name:string}. Print the user name.',
        tests:[{expected:'Alice'}] },
      { id:4, title:'Create generic functions', difficulty:'medium', points:4, description:'Write generic identity<T>(x:T):T. Print identity(42).',
        tests:[{expected:'42'}] },
      { id:5, title:'Use union/intersection types', difficulty:'medium', points:4, description:'Use union type string|number. Print typeof then value.',
        tests:[{expected:'number\n42'}] },
      { id:6, title:'Type a complex object', difficulty:'medium', points:4, description:'Create typed nested object and print its inner value.',
        tests:[{expected:'nested value'}] },
      { id:7, title:'Create advanced generic utilities', difficulty:'hard', points:8, description:'Create Pick utility type. Print picked name.',
        tests:[{expected:'Alice'}] },
      { id:8, title:'Implement a type-safe event emitter', difficulty:'hard', points:8, description:'Emit "test" event and print the data.',
        tests:[{expected:'event data'}] },
      { id:9, title:'Create advanced recursive types', difficulty:'expert', points:18, description:'Create recursive type and print depth count.',
        tests:[{expected:'3'}] },
      { id:10, title:'Build a fully type-safe API architecture', difficulty:'expert', points:18, description:'Print "API initialized" then "Routes registered".',
        tests:[{expected:'API initialized\nRoutes registered'}] }
    ]
  },
  ruby: {
    name: 'Ruby', emoji: '💎', color: '#cc342d',
    challenges: [
      { id:1, title:'Print "Hello World"', difficulty:'easy', points:2, description:'Write a Ruby program that prints "Hello World".',
        tests:[{expected:'Hello World'}] },
      { id:2, title:'Check even/odd', difficulty:'easy', points:2, description:'Read an integer. Print "even" or "odd".',
        tests:[{input:'4',expected:'even'},{input:'7',expected:'odd'}] },
      { id:3, title:'Reverse a string', difficulty:'easy', points:2, description:'Read a string and print it reversed.',
        tests:[{input:'hello',expected:'olleh'},{input:'abc',expected:'cba'}] },
      { id:4, title:'Work with arrays and hashes', difficulty:'medium', points:4, description:'Read integers. Print their sum.',
        tests:[{input:'1 2 3 4',expected:'10'},{input:'10 20',expected:'30'}] },
      { id:5, title:'Create a class', difficulty:'medium', points:4, description:'Read name. Print "Hello, {name}!".',
        tests:[{input:'Alice',expected:'Hello, Alice!'},{input:'Bob',expected:'Hello, Bob!'}] },
      { id:6, title:'Use blocks and iterators', difficulty:'medium', points:4, description:'Read integers. Print each doubled.',
        tests:[{input:'1 2 3',expected:'2\n4\n6'},{input:'10',expected:'20'}] },
      { id:7, title:'Build a REST API', difficulty:'hard', points:8, description:'Print "GET /items" then "POST /items".',
        tests:[{expected:'GET /items\nPOST /items'}] },
      { id:8, title:'Implement metaprogramming', difficulty:'hard', points:8, description:'Define method via define_method. Call it and print result.',
        tests:[{expected:'metaprogramming works'}] },
      { id:9, title:'Build a miniature ORM', difficulty:'expert', points:18, description:'Print "Table users created" then "Row inserted".',
        tests:[{expected:'Table users created\nRow inserted'}] },
      { id:10, title:'Design a Ruby web framework concept', difficulty:'expert', points:18, description:'Print "Route GET /home registered" then "Middleware loaded".',
        tests:[{expected:'Route GET /home registered\nMiddleware loaded'}] }
    ]
  },
  dart: {
    name: 'Dart', emoji: '🎯', color: '#0175c2',
    challenges: [
      { id:1, title:'Print "Hello World"', difficulty:'easy', points:2, description:'Write a Dart program that prints "Hello World".',
        tests:[{expected:'Hello World'}] },
      { id:2, title:'Check even/odd', difficulty:'easy', points:2, description:'Read an integer. Print "even" or "odd".',
        tests:[{input:'4',expected:'even'},{input:'7',expected:'odd'}] },
      { id:3, title:'Find maximum number', difficulty:'easy', points:2, description:'Read three integers and print the max.',
        tests:[{input:'3 7 5',expected:'7'},{input:'10 2 8',expected:'10'}] },
      { id:4, title:'Create classes', difficulty:'medium', points:4, description:'Read name age. Print "name is age years old".',
        tests:[{input:'Alice 30',expected:'Alice is 30 years old'}] },
      { id:5, title:'Work with lists/maps', difficulty:'medium', points:4, description:'Read integers. Print sorted unique values.',
        tests:[{input:'3 1 2 3',expected:'1 2 3'},{input:'5 5',expected:'5'}] },
      { id:6, title:'Use Futures', difficulty:'medium', points:4, description:'Print "Future started" then "Future completed".',
        tests:[{expected:'Future started\nFuture completed'}] },
      { id:7, title:'Build an async API client', difficulty:'hard', points:8, description:'Print "Connecting..." then "Connected!".',
        tests:[{expected:'Connecting...\nConnected!'}] },
      { id:8, title:'Implement custom state management', difficulty:'hard', points:8, description:'Print "State: idle" then "State: loading" then "State: done".',
        tests:[{expected:'State: idle\nState: loading\nState: done'}] },
      { id:9, title:'Build a concurrent task manager', difficulty:'expert', points:18, description:'Read n. Print "Task {i} done".',
        tests:[{input:'3',expected:'Task 1 done\nTask 2 done\nTask 3 done'}] },
      { id:10, title:'Design a complete Flutter architecture', difficulty:'expert', points:18, description:'Print "Widget built" then "State updated" then "Render complete".',
        tests:[{expected:'Widget built\nState updated\nRender complete'}] }
    ]
  },
  r: {
    name: 'R', emoji: '🧮', color: '#276dc3',
    challenges: [
      { id:1, title:'Create a vector', difficulty:'easy', points:2, description:'Create vector c(1,2,3) and print it space-separated.',
        tests:[{expected:'1 2 3'}] },
      { id:2, title:'Calculate an average', difficulty:'easy', points:2, description:'Read space-separated numbers. Print their average (rounded to 1 decimal).',
        tests:[{input:'1 2 3',expected:'2'},{input:'10 20',expected:'15'}] },
      { id:3, title:'Find the maximum value', difficulty:'easy', points:2, description:'Read space-separated numbers. Print the max.',
        tests:[{input:'3 7 5',expected:'7'},{input:'10 2 8',expected:'10'}] },
      { id:4, title:'Filter a dataset', difficulty:'medium', points:4, description:'Read integers. Print only those > 5, space-separated.',
        tests:[{input:'3 7 2 9 1',expected:'7 9'},{input:'1 2 3',expected:''}] },
      { id:5, title:'Create a data frame', difficulty:'medium', points:4, description:'Read name value pairs. Print "name: value" format.',
        tests:[{input:'a 1\nb 2',expected:'a: 1\nb: 2'}] },
      { id:6, title:'Group and summarize data', difficulty:'medium', points:4, description:'Read group value pairs. Print group sums.',
        tests:[{input:'A 1\nA 2\nB 3',expected:'A: 3\nB: 3'}] },
      { id:7, title:'Analyze a large dataset', difficulty:'hard', points:8, description:'Read numbers. Print count mean variance.',
        tests:[{input:'1 2 3 4 5',expected:'Count: 5\nMean: 3\nVariance: 2'}] },
      { id:8, title:'Implement a statistical model', difficulty:'hard', points:8, description:'Read x y pairs. Print correlation coefficient.',
        tests:[{input:'1 2\n2 4\n3 6',expected:'1'}] },
      { id:9, title:'Build a machine-learning pipeline', difficulty:'expert', points:18, description:'Print "Pipeline: load -> transform -> train -> evaluate".',
        tests:[{expected:'Pipeline: load -> transform -> train -> evaluate'}] },
      { id:10, title:'Optimize a large-scale data analysis workflow', difficulty:'expert', points:18, description:'Print "Processing started" then "Optimization complete".',
        tests:[{expected:'Processing started\nOptimization complete'}] }
    ]
  },
  scala: {
    name: 'Scala', emoji: '🧠', color: '#dc322f',
    challenges: [
      { id:1, title:'Print "Hello World"', difficulty:'easy', points:2, description:'Write a Scala program that prints "Hello World".',
        tests:[{expected:'Hello World'}] },
      { id:2, title:'Check even/odd', difficulty:'easy', points:2, description:'Read an integer. Print "even" or "odd".',
        tests:[{input:'4',expected:'even'},{input:'7',expected:'odd'}] },
      { id:3, title:'Calculate factorial', difficulty:'easy', points:2, description:'Read n and print n!.',
        tests:[{input:'5',expected:'120'},{input:'0',expected:'1'}] },
      { id:4, title:'Work with immutable collections', difficulty:'medium', points:4, description:'Read integers. Print doubled values space-separated.',
        tests:[{input:'1 2 3',expected:'2 4 6'},{input:'10',expected:'20'}] },
      { id:5, title:'Use pattern matching', difficulty:'medium', points:4, description:'Read an integer. Print "positive"/"negative"/"zero".',
        tests:[{input:'5',expected:'positive'},{input:'-3',expected:'negative'},{input:'0',expected:'zero'}] },
      { id:6, title:'Create case classes', difficulty:'medium', points:4, description:'Read name age. Print "Person(name,age)".',
        tests:[{input:'Alice 30',expected:'Person(Alice,30)'}] },
      { id:7, title:'Build a functional data-processing pipeline', difficulty:'hard', points:8, description:'Read integers. Print filtered (>0) then mapped (*2).',
        tests:[{input:'-1 2 -3 4',expected:'4 8'}] },
      { id:8, title:'Implement concurrent processing', difficulty:'hard', points:8, description:'Print "Future started" then "Future completed".',
        tests:[{expected:'Future started\nFuture completed'}] },
      { id:9, title:'Design an Akka-style actor system', difficulty:'expert', points:18, description:'Print "Actor created" then "Message received" then "Actor stopped".',
        tests:[{expected:'Actor created\nMessage received\nActor stopped'}] },
      { id:10, title:'Build a distributed processing architecture', difficulty:'expert', points:18, description:'Print "Node 1: ready" then "Node 2: ready" then "Cluster formed".',
        tests:[{expected:'Node 1: ready\nNode 2: ready\nCluster formed'}] }
    ]
  },
  lua: {
    name: 'Lua', emoji: '🧩', color: '#000080',
    challenges: [
      { id:1, title:'Print "Hello World"', difficulty:'easy', points:2, description:'Write a Lua script that prints "Hello World".',
        tests:[{expected:'Hello World'}] },
      { id:2, title:'Check even/odd', difficulty:'easy', points:2, description:'Read an integer. Print "even" or "odd".',
        tests:[{input:'4',expected:'even'},{input:'7',expected:'odd'}] },
      { id:3, title:'Reverse a string', difficulty:'easy', points:2, description:'Read a string and print reversed.',
        tests:[{input:'hello',expected:'olleh'},{input:'abc',expected:'cba'}] },
      { id:4, title:'Work with tables', difficulty:'medium', points:4, description:'Read integers. Print sum.',
        tests:[{input:'1 2 3 4',expected:'10'},{input:'10 20',expected:'30'}] },
      { id:5, title:'Create functions', difficulty:'medium', points:4, description:'Read two numbers. Print their product.',
        tests:[{input:'3 5',expected:'15'},{input:'10 20',expected:'200'}] },
      { id:6, title:'Build a simple module', difficulty:'medium', points:4, description:'Print "Module loaded" then "Function called".',
        tests:[{expected:'Module loaded\nFunction called'}] },
      { id:7, title:'Implement an event system', difficulty:'hard', points:8, description:'Print "Event registered" then "Event fired: data".',
        tests:[{expected:'Event registered\nEvent fired: data'}] },
      { id:8, title:'Build a small interpreter', difficulty:'hard', points:8, description:'Read expression "a+b". Print result.',
        tests:[{input:'3+5',expected:'8'},{input:'10+20',expected:'30'}] },
      { id:9, title:'Implement a virtual machine concept', difficulty:'expert', points:18, description:'Print "VM initialized" then "Opcode executed" then "VM halted".',
        tests:[{expected:'VM initialized\nOpcode executed\nVM halted'}] },
      { id:10, title:'Create a scripting engine architecture', difficulty:'expert', points:18, description:'Print "Engine started" then "Script compiled" then "Engine ready".',
        tests:[{expected:'Engine started\nScript compiled\nEngine ready'}] }
    ]
  },
  solidity: {
    name: 'Solidity', emoji: '🛡️', color: '#363636',
    challenges: [
      { id:1, title:'Create a basic contract', difficulty:'easy', points:2, description:'Write a Solidity contract with a public uint variable.',
        tests:[{expected:''}] },
      { id:2, title:'Store a number on-chain', difficulty:'easy', points:2, description:'Create contract with setNumber/getNumber functions.',
        tests:[{expected:''}] },
      { id:3, title:'Create a simple function', difficulty:'easy', points:2, description:'Create a function that returns 42.',
        tests:[{expected:''}] },
      { id:4, title:'Create an ERC-20-style token', difficulty:'medium', points:4, description:'Create a token contract with name, symbol, and totalSupply.',
        tests:[{expected:''}] },
      { id:5, title:'Use mappings and structs', difficulty:'medium', points:4, description:'Create a contract with a mapping of structs.',
        tests:[{expected:''}] },
      { id:6, title:'Create access control', difficulty:'medium', points:4, description:'Create a contract with onlyOwner modifier.',
        tests:[{expected:''}] },
      { id:7, title:'Build a staking contract', difficulty:'hard', points:8, description:'Create a staking contract with stake/unstake functions.',
        tests:[{expected:''}] },
      { id:8, title:'Create a decentralized auction', difficulty:'hard', points:8, description:'Create an auction contract with bid/end functions.',
        tests:[{expected:''}] },
      { id:9, title:'Design a secure DeFi protocol', difficulty:'expert', points:18, description:'Design a DeFi contract with proper checks and events.',
        tests:[{expected:''}] },
      { id:10, title:'Analyze and prevent reentrancy and other vulnerabilities', difficulty:'expert', points:18, description:'Write a contract demonstrating reentrancy protection.',
        tests:[{expected:''}] }
    ]
  },
  sql: {
    name: 'SQL', emoji: '🧱', color: '#e38c00',
    challenges: [
      { id:1, title:'Select all users', difficulty:'easy', points:2, description:'Given table users(id,name,email), write SELECT * FROM users.',
        tests:[{expected:'1|Alice|alice@test.com\n2|Bob|bob@test.com'}] },
      { id:2, title:'Filter records with WHERE', difficulty:'easy', points:2, description:'Select users older than 25.',
        tests:[{expected:'Alice|30\nBob|28'}] },
      { id:3, title:'Sort results with ORDER BY', difficulty:'easy', points:2, description:'Select all users ordered by name.',
        tests:[{expected:'Alice|30\nBob|25\nCharlie|35'}] },
      { id:4, title:'Use GROUP BY', difficulty:'medium', points:4, description:'Count users per department.',
        tests:[{expected:'Engineering|2\nMarketing|1'}] },
      { id:5, title:'Use JOIN', difficulty:'medium', points:4, description:'Join users and orders to get user names with their order count.',
        tests:[{expected:'Alice|2\nBob|1'}] },
      { id:6, title:'Create a subquery', difficulty:'medium', points:4, description:'Find users who have placed orders.',
        tests:[{expected:'Alice\nBob'}] },
      { id:7, title:'Write complex window functions', difficulty:'hard', points:8, description:'Rank users by age using ROW_NUMBER.',
        tests:[{expected:'Charlie|1\nAlice|2\nBob|3'}] },
      { id:8, title:'Optimize a slow database query', difficulty:'hard', points:8, description:'Write an optimized query using a subquery to find top spenders.',
        tests:[{expected:'Alice|500'}] },
      { id:9, title:'Design a normalized database architecture', difficulty:'expert', points:18, description:'Create 3NF schema for an e-commerce system.',
        tests:[{expected:''}] },
      { id:10, title:'Optimize a large-scale relational database', difficulty:'expert', points:18, description:'Write an optimized query for large dataset aggregation.',
        tests:[{expected:''}] }
    ]
  },
  assembly: {
    name: 'Assembly', emoji: '🛠️', color: '#6e4c13',
    challenges: [
      { id:1, title:'Move a value between registers', difficulty:'easy', points:2, description:'Write assembly to move value 42 to a register and print it.',
        tests:[{expected:'42'}] },
      { id:2, title:'Perform addition', difficulty:'easy', points:2, description:'Add two numbers (3 and 5) and print the result.',
        tests:[{expected:'8'}] },
      { id:3, title:'Perform subtraction', difficulty:'easy', points:2, description:'Subtract 3 from 10 and print the result.',
        tests:[{expected:'7'}] },
      { id:4, title:'Use conditional jumps', difficulty:'medium', points:4, description:'If number > 5 print "big" else "small".',
        tests:[{input:'7',expected:'big'},{input:'3',expected:'small'}] },
      { id:5, title:'Work with the stack', difficulty:'medium', points:4, description:'Push 10 and 20, pop and print their sum.',
        tests:[{expected:'30'}] },
      { id:6, title:'Create a loop', difficulty:'medium', points:4, description:'Count from 1 to 5 and print each.',
        tests:[{expected:'1\n2\n3\n4\n5'}] },
      { id:7, title:'Implement a function manually', difficulty:'hard', points:8, description:'Implement factorial and print result for input 5.',
        tests:[{expected:'120'}] },
      { id:8, title:'Manipulate memory directly', difficulty:'hard', points:8, description:'Store 42 in memory, retrieve and print it.',
        tests:[{expected:'42'}] },
      { id:9, title:'Write a low-level algorithm without high-level constructs', difficulty:'expert', points:18, description:'Implement binary search. Print index of target.',
        tests:[{expected:'2'}] },
      { id:10, title:'Design a miniature CPU execution routine', difficulty:'expert', points:18, description:'Print "CPU initialized" then "Instruction decoded" then "Execution complete".',
        tests:[{expected:'CPU initialized\nInstruction decoded\nExecution complete'}] }
    ]
  }
};

const LANG_KEYS = Object.keys(LANGUAGES);

/* ═══════════════════════════════════════════════════════════════
   SCORE MANAGEMENT
   ═══════════════════════════════════════════════════════════════ */

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('devora_current_user');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    if (parsed && parsed.email) return parsed.email;
    return '';
  } catch { return localStorage.getItem('devora_current_user') || ''; }
}

function getScores() {
  try { const d = localStorage.getItem('devora_scores'); return d ? JSON.parse(d) : {}; } catch { return {}; }
}
function saveScores(s) { localStorage.setItem('devora_scores', JSON.stringify(s)); }

function getUserScores(langKey) {
  const user = getCurrentUser();
  if (!user) return [];
  const scores = getScores();
  if (!scores[user]) return [];
  return scores[user][langKey] || [];
}

function setUserScore(langKey, challengeIndex, value) {
  const user = getCurrentUser();
  if (!user) return;
  const scores = getScores();
  if (!scores[user]) scores[user] = {};
  if (!scores[user][langKey]) scores[user][langKey] = [];
  scores[user][langKey][challengeIndex] = value;
  saveScores(scores);
}

function getLanguageScore(langKey) {
  const langScores = getUserScores(langKey);
  const lang = LANGUAGES[langKey];
  let total = 0;
  lang.challenges.forEach((c, i) => { if (langScores[i]) total += c.points; });
  return total;
}

function getTotalScore() {
  let total = 0;
  LANG_KEYS.forEach(k => { total += getLanguageScore(k); });
  return total;
}
function getMaxScore() { return LANG_KEYS.length * 70; }

/* ═══════════════════════════════════════════════════════════════
   UI RENDERING
   ═══════════════════════════════════════════════════════════════ */

function renderLanguageGrid() {
  const grid = document.getElementById('languageGrid');
  if (!grid) return;
  grid.innerHTML = '';
  LANG_KEYS.forEach(langKey => {
    const lang = LANGUAGES[langKey];
    const score = getLanguageScore(langKey);
    const card = document.createElement('div');
    card.className = 'lang-card';
    card.style.borderColor = lang.color;
    card.innerHTML =
      '<div class="lang-card-emoji">' + lang.emoji + '</div>' +
      '<div class="lang-card-name">' + lang.name + '</div>' +
      '<div class="lang-card-score" style="color:' + lang.color + '">Score: ' + score + ' / 70</div>';
    card.addEventListener('click', () => openLanguageDetail(langKey));
    grid.appendChild(card);
  });
  updateTotalScoreDisplay();
}

function updateTotalScoreDisplay() {
  const el = document.getElementById('totalScore');
  if (el) el.textContent = 'Total Score: ' + getTotalScore() + ' / ' + getMaxScore();
}

function openLanguageDetail(langKey) {
  const lang = LANGUAGES[langKey];
  if (!lang) return;
  const grid = document.getElementById('languageGrid');
  const detail = document.getElementById('arenaDetail');
  const header = document.getElementById('arenaDetailHeader');
  const questionList = document.getElementById('questionList');
  const totalEl = document.getElementById('totalScore');
  if (grid) { grid.style.display = 'none'; grid.classList.add('hidden'); }
  if (totalEl) { totalEl.style.display = 'none'; totalEl.classList.add('hidden'); }
  if (detail) { detail.style.display = 'block'; detail.classList.remove('hidden'); }
  if (header) {
    header.innerHTML =
      '<button class="back-btn" onclick="closeLanguageDetail()">←</button>' +
      '<h2>' + lang.emoji + ' ' + lang.name + '</h2>' +
      '<div class="lang-detail-score" style="color:' + lang.color + '">Score: ' + getLanguageScore(langKey) + ' / 70</div>';
  }
  if (!questionList) return;
  questionList.innerHTML = '';
  const langScores = getUserScores(langKey);
  lang.challenges.forEach((challenge, index) => {
    const completed = langScores[index];
    const diff = DIFFICULTY_CONFIG[challenge.difficulty];
    const item = document.createElement('div');
    item.className = 'question-item' + (completed ? ' completed' : '');
    item.innerHTML =
      '<div class="question-number">#' + (index + 1) + '</div>' +
      '<div class="question-info">' +
        '<div class="question-title">' + challenge.title + '</div>' +
        '<div class="question-meta">' +
          '<span class="difficulty-badge" style="background:' + diff.color + '">' + diff.emoji + ' ' + diff.label + '</span>' +
          '<span class="question-points">' + challenge.points + ' pts</span>' +
        '</div>' +
      '</div>' +
      '<div class="question-action">' +
        (completed ? '<span class="checkmark">✓</span>' : '<button class="start-btn" data-lang="' + langKey + '" data-index="' + index + '">Start</button>') +
      '</div>';
    if (!completed) {
      const btn = item.querySelector('.start-btn');
      if (btn) {
        btn.addEventListener('click', (e) => { e.stopPropagation(); openQuestionModal(langKey, index); });
      }
    }
    questionList.appendChild(item);
  });
}

function closeLanguageDetail() {
  const grid = document.getElementById('languageGrid');
  const detail = document.getElementById('arenaDetail');
  const totalEl = document.getElementById('totalScore');
  if (detail) { detail.style.display = 'none'; detail.classList.add('hidden'); }
  if (grid) { grid.style.display = ''; grid.classList.remove('hidden'); }
  if (totalEl) { totalEl.style.display = ''; totalEl.classList.remove('hidden'); }
  renderLanguageGrid();
}

/* ═══════════════════════════════════════════════════════════════
   QUESTION MODAL + CODE EXECUTION
   ═══════════════════════════════════════════════════════════════ */

function openQuestionModal(langKey, challengeIndex) {
  const lang = LANGUAGES[langKey];
  const challenge = lang.challenges[challengeIndex];
  const diff = DIFFICULTY_CONFIG[challenge.difficulty];
  const modal = document.getElementById('questionModal');
  if (!modal) return;
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('show'));
  modal.innerHTML =
    '<div class="modal-content code-modal-content">' +
      '<div class="modal-header">' +
        '<button class="modal-back-btn" onclick="closeQuestionModal()">←</button>' +
        '<div class="modal-title-area">' +
          '<h3 class="modal-title">' + challenge.title + '</h3>' +
          '<div class="modal-meta">' +
            '<span class="difficulty-badge" style="background:' + diff.color + '">' + diff.emoji + ' ' + diff.label + '</span>' +
            '<span class="modal-points">' + challenge.points + ' pts</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-description">' + challenge.description + '</div>' +
      '<div class="modal-editor-area">' +
        '<div class="editor-header">' + lang.emoji + ' ' + lang.name + ' — Challenge #' + (challengeIndex + 1) + '</div>' +
        '<textarea class="code-editor" id="codeEditor" placeholder="' + (CODE_PLACEHOLDERS[langKey] || '') + '" spellcheck="false"></textarea>' +
      '</div>' +
      '<div class="modal-actions">' +
        '<button class="run-btn" id="runBtn">▶ Run</button>' +
      '</div>' +
      '<div class="modal-result" id="modalResult" style="display:none;"></div>' +
      '<div class="modal-test-details" id="modalTestDetails" style="display:none;"></div>' +
    '</div>';
  const runBtn = document.getElementById('runBtn');
  if (runBtn) {
    runBtn.addEventListener('click', () => { runChallenge(langKey, challengeIndex); });
  }
}

function closeQuestionModal() {
  const modal = document.getElementById('questionModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; modal.innerHTML = ''; }, 300);
  }
}

async function runChallenge(langKey, challengeIndex) {
  const lang = LANGUAGES[langKey];
  const challenge = lang.challenges[challengeIndex];
  const resultDiv = document.getElementById('modalResult');
  const detailsDiv = document.getElementById('modalTestDetails');
  const runBtn = document.getElementById('runBtn');
  const codeEditor = document.getElementById('codeEditor');

  if (!resultDiv || !codeEditor) return;

  const code = codeEditor.value.trim();
  if (!code) {
    resultDiv.style.display = 'block';
    resultDiv.className = 'modal-result error';
    resultDiv.innerHTML = 'Please write some code first!';
    return;
  }

  if (runBtn) { runBtn.disabled = true; runBtn.textContent = '⏳ Running...'; }
  resultDiv.style.display = 'block';
  resultDiv.className = 'modal-result';
  resultDiv.innerHTML = '⏳ Executing code...';
  if (detailsDiv) detailsDiv.style.display = 'none';

  try {
    const tests = challenge.tests || [];

    if (tests.length === 0) {
      const execResult = await executeCode(langKey, code, '');
      if (execResult.compileError) {
        resultDiv.className = 'modal-result error';
        resultDiv.innerHTML = '❌ Compilation Error:\n' + escapeHtml(execResult.error);
      } else if (execResult.error && !execResult.output) {
        resultDiv.className = 'modal-result error';
        resultDiv.innerHTML = '❌ Runtime Error:\n' + escapeHtml(execResult.error);
      } else {
        setUserScore(langKey, challengeIndex, true);
        resultDiv.className = 'modal-result success';
        resultDiv.innerHTML = '✓ Code compiled and ran successfully! +' + challenge.points + ' points';
        setTimeout(() => {
          closeQuestionModal();
          const detail = document.getElementById('arenaDetail');
          if (detail && detail.style.display !== 'none') openLanguageDetail(langKey);
          renderLanguageGrid();
        }, 2000);
      }
      return;
    }

    if (langKey === 'html') {
      const htmlResult = validateHTML(code, tests);
      handleTestResult({ passed: htmlResult.success, message: htmlResult.output, error: htmlResult.error }, challenge, langKey, challengeIndex, resultDiv, detailsDiv);
      return;
    }
    if (langKey === 'css') {
      const cssResult = validateCSS(code, tests[0] && tests[0].htmlTemplate, tests);
      handleTestResult({ passed: cssResult.success, message: cssResult.output, error: cssResult.error }, challenge, langKey, challengeIndex, resultDiv, detailsDiv);
      return;
    }

    const firstResult = await executeCode(langKey, code, tests[0] && tests[0].input || '');
    if (firstResult.compileError) {
      resultDiv.className = 'modal-result error';
      resultDiv.innerHTML = '❌ Compilation Error:\n' + escapeHtml(firstResult.error);
      return;
    }

    let allPassed = true;
    const testDetails = [];

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      let execResult;
      if (i === 0) {
        execResult = firstResult;
      } else {
        execResult = await executeCode(langKey, code, test.input || '');
      }
      const pass = compareOutputs(execResult.output, test.expected);
      testDetails.push({
        test: i + 1,
        passed: pass,
        expected: test.expected,
        actual: execResult.output,
        error: execResult.error
      });
      if (!pass) allPassed = false;
    }

    if (allPassed) {
      setUserScore(langKey, challengeIndex, true);
      resultDiv.className = 'modal-result success';
      resultDiv.innerHTML = '✓ All ' + tests.length + ' test(s) passed! +' + challenge.points + ' points';
      setTimeout(() => {
        closeQuestionModal();
        const detail = document.getElementById('arenaDetail');
        if (detail && detail.style.display !== 'none') openLanguageDetail(langKey);
        renderLanguageGrid();
      }, 2000);
    } else {
      resultDiv.className = 'modal-result error';
      resultDiv.innerHTML = '✗ Some tests failed. Check details below.';
    }

    if (detailsDiv) {
      detailsDiv.style.display = 'block';
      detailsDiv.innerHTML = testDetails.map((td, i) =>
        '<div class="test-detail ' + (td.passed ? 'test-pass' : 'test-fail') + '">' +
          '<div class="test-header">Test ' + (i + 1) + ': ' + (td.passed ? '✓ Passed' : '✗ Failed') + '</div>' +
          (td.expected !== undefined ? '<div class="test-io"><strong>Expected:</strong> <pre>' + escapeHtml(td.expected) + '</pre></div>' : '') +
          '<div class="test-io"><strong>Output:</strong> <pre>' + escapeHtml(td.actual || '(empty)') + '</pre></div>' +
          (td.error ? '<div class="test-io"><strong>Error:</strong> <pre>' + escapeHtml(td.error) + '</pre></div>' : '') +
        '</div>'
      ).join('');
    }

  } catch (e) {
    resultDiv.className = 'modal-result error';
    resultDiv.innerHTML = '❌ Execution Error: ' + escapeHtml(e.message);
  } finally {
    if (runBtn) { runBtn.disabled = false; runBtn.textContent = '▶ Run'; }
  }
}

function handleTestResult(execResult, challenge, langKey, challengeIndex, resultDiv, detailsDiv) {
  if (execResult.passed) {
    setUserScore(langKey, challengeIndex, true);
    resultDiv.className = 'modal-result success';
    resultDiv.innerHTML = '✓ All checks passed! +' + challenge.points + ' points';
    setTimeout(() => {
      closeQuestionModal();
      const detail = document.getElementById('arenaDetail');
      if (detail && detail.style.display !== 'none') openLanguageDetail(langKey);
      renderLanguageGrid();
    }, 2000);
  } else {
    resultDiv.className = 'modal-result error';
    resultDiv.innerHTML = '✗ Validation failed: ' + escapeHtml(execResult.error || execResult.message);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/* ═══════════════════════════════════════════════════════════════
   INITIALIZATION
   ═══════════════════════════════════════════════════════════════ */

function initArena() {
  renderLanguageGrid();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('questionModal');
      if (modal && modal.style.display === 'flex') closeQuestionModal();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initArena);
} else {
  initArena();
}
