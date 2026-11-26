/* Hack Computer Lab — app wiring */
(function () {
  'use strict';

  var P = window.PROJECT;
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  var state = {
    K: P.kFromRoll(P.DEFAULT_ROLL),
    roll: P.DEFAULT_ROLL,
    preset: 'box',
    chip: 'CPU.hdl',
    running: true,
    speed: 20000,
    held: false,
    result: null,
    imageData: null
  };

  /* ------------------------------------------------------------------ */
  /* helpers                                                             */
  /* ------------------------------------------------------------------ */

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  function copyText(text, note) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }
    toast(note || 'Copied to clipboard');
  }

  function isTyping(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
  }

  /* ------------------------------------------------------------------ */
  /* parameter K                                                         */
  /* ------------------------------------------------------------------ */

  function renderParams(K) {
    var p = P.paramsFor(K);
    var mod3 = p.kMod3;
    var reqText = 'Case ' + mod3 + ': duplicate label declarations are detected while parsing — the initial definition is preserved and a diagnostic is reported.';

    $('#rollChipK').textContent = K;
    $('#kValue').textContent = K;
    $('#kDerived').textContent = '(derived from Roll ending in ' + K + ')';
    $('#kMod3').textContent = mod3;
    $('#kMod4').textContent = p.kMod4;
    $('#kStartRow').textContent = 'Row ' + K;
    $('#kDims').textContent = p.pxWidth + 'px × 20h';
    $('#kWords').textContent = p.wordsPerRow + ' words (' + (p.wordsPerRow * 16) + ' bits)';
    $('#kAddr').textContent = p.startAddr + ' .. ' + p.endAddr;
    $('#kReqTitle').textContent = 'Part B Requirement (K mod 3 = ' + mod3 + '):';
    $('#kReqText').textContent = reqText;
    $('#dupPreset').textContent = 'Duplicate Label Test (K mod 3 = ' + mod3 + ')';
    $('#pipeScreen').textContent = 'RAM[' + p.startAddr + '..' + p.endAddr + '] pixels';
    $('#axisBox').textContent = 'Box Location: Row ' + K + ' to ' + p.endRow + ' · Cols 0 to 63';
    $('#noteRows').textContent = K + ' to ' + p.endRow;
    $('#footK').textContent = K;
    $('#footStartRow').textContent = 'Row ' + K;
    $('#footDims').textContent = p.pxWidth + ' × 20 rows';
    $('#footStartAddr').textContent = p.startAddr + ' (Word 0)';
    $('#footEndAddr').textContent = p.endAddr + ' (Word 3)';
    $('#checkRoll').textContent = state.roll;
    $('#footRoll').textContent = state.roll;
    $('#footStudent').textContent = P.STUDENT.name;
  }

  function currentParams() { return P.paramsFor(state.K); }

  /* ------------------------------------------------------------------ */
  /* static lists                                                        */
  /* ------------------------------------------------------------------ */

  function renderPillars() {
    var host = $('#pillars');
    host.innerHTML = P.PILLARS.map(function (item) {
      return '<article class="pillar">' +
        '<div class="pillar-top"><span class="eyebrow">' + item.part + ' · ' + item.n + '</span>' +
        '<span class="marks">' + item.marks + '</span></div>' +
        '<h3>' + item.title + '</h3>' +
        '<p>' + item.text + '</p>' +
        '<a class="pillar-link" href="' + item.link + '">' + item.cta + ' <span>→</span></a>' +
        '</article>';
    }).join('');
  }

  function renderChecklist() {
    var p = currentParams();
    var items = P.CHECKLIST.map(function (it) { return Object.assign({}, it); });
    items[2].text = 'Box.asm polls RAM[24576] continuously and draws a ' + p.pxWidth + ' × 20 box at row ' + p.K +
      ' (addresses ' + p.startAddr + '..' + p.endAddr + ') on any key press — releasing the key writes 0 and erases it.';
    $('#checklist').innerHTML = items.map(function (it) {
      return '<div class="check-item">' +
        '<svg class="icon"><use href="#i-check"/></svg>' +
        '<div class="check-item-txt">' +
        '<div class="check-item-top"><b>' + it.title + ' (' + it.marks + ')</b><span class="status">' + it.status + '</span></div>' +
        '<p>' + esc(it.text) + '</p>' +
        '</div></div>';
    }).join('');
  }

  function fileList() {
    var p = currentParams();
    return [
      { tag: 'PART A · HDL', name: 'CPU.hdl', size: '2.8 KB', desc: 'Central processing unit: instruction decode, ALU control, A/D registers, jump logic and program counter.', path: 'assets/downloads/CPU.hdl' },
      { tag: 'PART A · HDL', name: 'Memory.hdl', size: '1.6 KB', desc: '32K address space — RAM16K, the 8K screen memory map and the keyboard register at 24576.', path: 'assets/downloads/Memory.hdl' },
      { tag: 'PART A · HDL', name: 'Computer.hdl', size: '1.0 KB', desc: 'Top-level Hack computer: ROM32K, CPU and Memory wired into one executable system chip.', path: 'assets/downloads/Computer.hdl' },
      { tag: 'PART C · ASSEMBLY', name: 'Box.asm', size: '1.1 KB', desc: 'Capstone program. Polls RAM[24576] and paints the ' + p.pxWidth + ' × 20 box at row ' + p.K + ' (addresses ' + p.startAddr + '..' + p.endAddr + ') while a key is held.', path: 'assets/downloads/Box.asm' },
      { tag: 'PART C · ASSEMBLY', name: 'Box.hack', size: '799 B', desc: 'Compiled 16-bit machine code generated by assembler.py for the box drawing program.', path: 'assets/downloads/Box.hack' },
      { tag: 'PART B · TOOLCHAIN', name: 'assembler.py', size: '4.3 KB', desc: 'Two-pass Hack assembler: label handling, variable allocation and symbol table export.', path: 'assets/downloads/assembler.py' },
      { tag: 'PART B · OUTPUT', name: 'symbols.txt', size: '107 B', desc: 'Assembler symbol dump for Box.asm — label and variable RAM / ROM addresses.', path: 'assets/downloads/symbols.txt' },
      { tag: 'DOCUMENTATION', name: 'README.md', size: '16 B', desc: 'Repository readme for the nand-capstone submission.', path: 'assets/downloads/README.md' },
      { tag: 'COMPLETE PACKAGE', name: 'project-files.zip', size: '5.5 KB', desc: 'All chips, sources and compiled binaries bundled into one submission-ready archive.', path: 'assets/downloads/project-files.zip' }
    ];
  }

  function renderFiles() {
    var files = fileList();
    $('#fileCount').textContent = files.length + ' Deliverable Files Available';
    $('#files').innerHTML = files.map(function (f) {
      return '<article class="file-card">' +
        '<div class="file-top"><span class="file-tag">' + f.tag + '</span><span class="file-size">' + f.size + '</span></div>' +
        '<b>' + f.name + '</b>' +
        '<p>' + esc(f.desc) + '</p>' +
        '<div class="file-foot"><span class="avail"><svg class="icon"><use href="#i-check"/></svg>Available</span>' +
        '<a class="btn btn-dark" href="' + f.path + '" download="' + f.name + '"><svg class="icon"><use href="#i-download"/></svg>Download</a></div>' +
        '</article>';
    }).join('');
  }

  /* ------------------------------------------------------------------ */
  /* part A — HDL                                                        */
  /* ------------------------------------------------------------------ */

  function renderChip(name) {
    var chip = P.HDL[name];
    if (!chip) return;
    state.chip = name;
    $('#chipTitle').textContent = chip.title;
    $('#chipDesc').textContent = chip.desc;
    $('#codeFileName').textContent = name;
    $('#codeMeta').textContent = chip.content.split('\n').length + ' lines · Hardware Description Language';

    $('#ioIn').innerHTML = chip.ioIn.length
      ? chip.ioIn.map(function (pin) {
        return '<div class="io-pin"><b>' + esc(pin[0]) + '</b><span>' + esc(pin[1]) + '</span></div>';
      }).join('')
      : '<div class="io-empty">No input pins — the computer is driven by its internal clock and reset line.</div>';

    $('#ioOut').innerHTML = chip.ioOut.length
      ? chip.ioOut.map(function (pin) {
        return '<div class="io-pin"><b>' + esc(pin[0]) + '</b><span>' + esc(pin[1]) + '</span></div>';
      }).join('')
      : '<div class="io-empty">No external outputs — observe it through screen memory, the keyboard and CPU registers.</div>';

    $('#highlights').innerHTML = chip.highlights.map(function (h, i) {
      return '<div class="hl"><b>[' + (i + 1) + ']</b> ' + esc(h) + '</div>';
    }).join('');

    $('#hdlCode').innerHTML = chip.content.split('\n').map(function (line, i) {
      var idx = line.indexOf('//');
      var body = idx === -1
        ? esc(line)
        : esc(line.slice(0, idx)) + '<span class="cm">' + esc(line.slice(idx)) + '</span>';
      return '<div class="code-line"><span class="ln">' + (i + 1) + '</span><span class="lt">' + (body || ' ') + '</span></div>';
    }).join('');

    $('#chipDownload').setAttribute('href', 'assets/downloads/' + name);
    $('#chipDownload').setAttribute('download', name);
    $('#chipDownload').innerHTML = '<svg class="icon"><use href="#i-download"/></svg>Download ' + name;

    $$('#hdlTabs .ptab').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-chip') === name);
    });
  }

  function initPartA() {
    $$('#hdlTabs .ptab').forEach(function (b) {
      b.addEventListener('click', function () { renderChip(b.getAttribute('data-chip')); });
    });
    $('#copyHdlBtn').addEventListener('click', function () {
      copyText(P.HDL[state.chip].content, state.chip + ' copied');
    });
    renderChip('CPU.hdl');
  }

  /* ------------------------------------------------------------------ */
  /* part B — assembler playground                                       */
  /* ------------------------------------------------------------------ */

  var editor = $('#asmEditor');
  var gutter = $('#asmGutter');
  var editorTimer = null;

  function presetSource(key) {
    var fn = P.PRESETS[key];
    if (!fn) return P.boxAsm(state.K);
    return fn(state.K);
  }

  function updateGutter() {
    var lines = editor.value.split('\n').length;
    var html = '';
    for (var i = 1; i <= lines; i++) html += '<div>' + i + '</div>';
    gutter.innerHTML = html;
    $('#lineCount').textContent = lines + ' lines';
    gutter.scrollTop = editor.scrollTop;
  }

  function renderListing(result) {
    var list = $('#hackList');
    if (!result.listing.length) { list.innerHTML = ''; return; }
    list.innerHTML = result.listing.map(function (row) {
      return '<div class="hrow"><span class="idx">' + row.addr + '</span>' +
        '<span>' + row.bits + '</span>' +
        '<span class="typ">' + (row.type === 'A' ? 'A-instr' : 'C-instr') + '</span></div>';
    }).join('');
  }

  function renderSymbols(result) {
    if (!result.symbols.length) {
      $('#symbolTable').innerHTML = '<div class="io-empty" style="padding:16px">No labels or variables in this program.</div>';
      return;
    }
    $('#symbolTable').innerHTML = '<table><thead><tr><th>SYMBOL</th><th>KIND</th><th class="num">ADDRESS</th></tr></thead><tbody>' +
      result.symbols.map(function (s) {
        return '<tr><td>' + esc(s.name) + '</td><td class="kind">' + s.kind + '</td><td class="num">' + s.addr + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function renderStats(result) {
    $('#statRom').textContent = result.stats.instructions;
    $('#statLabels').textContent = result.stats.labels;
    $('#statVars').textContent = result.stats.variables;
    $('#statWarn').textContent = result.stats.warnings;
  }

  function renderStatus(result) {
    var chip = $('#asmStatus');
    chip.classList.remove('warn', 'error');
    if (!result.ok) {
      chip.classList.add('error');
      chip.innerHTML = '<span class="dot"></span>Assembly failed';
      chip.title = result.errors[0] ? result.errors[0].message : '';
    } else if (result.warnings.length) {
      chip.classList.add('warn');
      chip.innerHTML = '<span class="dot"></span>' + result.warnings.length + ' Warning · duplicate label';
      chip.title = result.warnings.map(function (w) { return w.message; }).join('\n');
    } else {
      chip.innerHTML = '<span class="dot"></span>100% Assembled Cleanly';
      chip.title = '';
    }
  }

  function assembleEditor() {
    var result = window.HackAssembler.assemble(editor.value);
    state.result = result;
    renderListing(result);
    renderSymbols(result);
    renderStats(result);
    renderStatus(result);
    $('#downloadHackBtn').disabled = !result.ok;
    $('#downloadHackBtn').style.opacity = result.ok ? '' : '.45';
    var p = currentParams();
    $('#downloadNote').textContent = state.preset === 'box'
      ? 'Box.hack · ' + p.startAddr + '..' + p.endAddr
      : state.preset.toUpperCase() + '.hack';
  }

  function setEditorSource(text, presetKey) {
    editor.value = text;
    if (presetKey) state.preset = presetKey;
    updateGutter();
    assembleEditor();
    editor.scrollTop = 0;
  }

  function setPresetActive(key) {
    $$('#presets .preset').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-preset') === key);
    });
  }

  function initPartB() {
    $('#pyCode').textContent = P.PYTHON_SOURCE;

    editor.addEventListener('input', function () {
      updateGutter();
      clearTimeout(editorTimer);
      editorTimer = setTimeout(assembleEditor, 140);
    });
    editor.addEventListener('scroll', function () { gutter.scrollTop = editor.scrollTop; });
    editor.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var start = editor.selectionStart;
        var end = editor.selectionEnd;
        editor.value = editor.value.slice(0, start) + '    ' + editor.value.slice(end);
        editor.selectionStart = editor.selectionEnd = start + 4;
        updateGutter();
      }
    });

    $$('#presets .preset').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-preset');
        setPresetActive(key);
        setEditorSource(presetSource(key), key);
      });
    });

    $('#resetAsmBtn').addEventListener('click', function () {
      setPresetActive('box');
      setEditorSource(P.boxAsm(state.K), 'box');
    });

    $$('#outputTabs .ptab').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#outputTabs .ptab').forEach(function (x) { x.classList.toggle('active', x === b); });
        var tab = b.getAttribute('data-tab');
        $$('.tab-pane').forEach(function (pane) {
          pane.classList.toggle('active', pane.getAttribute('data-pane') === tab);
        });
      });
    });

    $('#copyOutBtn').addEventListener('click', function () {
      var active = $('.tab-pane.active').getAttribute('data-pane');
      var text = active === 'python' ? P.PYTHON_SOURCE
        : active === 'symbols'
          ? (state.result ? state.result.symbols.map(function (s) { return s.name + '\t' + s.addr; }).join('\n') : '')
          : (state.result ? state.result.rom.join('\n') : '');
      copyText(text, 'Output copied');
    });

    $('#downloadHackBtn').addEventListener('click', function () {
      if (!state.result || !state.result.ok) return;
      var name = state.preset === 'box' ? 'Box.hack' : (state.preset.charAt(0).toUpperCase() + state.preset.slice(1) + '.hack');
      var blob = new Blob([state.result.rom.join('\n') + '\n'], { type: 'text/plain' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
      toast(name + ' downloaded');
    });

    setEditorSource(P.boxAsm(state.K), 'box');
  }

  /* ------------------------------------------------------------------ */
  /* part C — emulator                                                   */
  /* ------------------------------------------------------------------ */

  var machine = null;
  var canvas = null;
  var ctx = null;

  function monitorDescriptors() {
    var p = currentParams();
    return [
      { addr: p.startAddr - 1, main: 'Row ' + (p.K - 1) + ' End', sub: 'Boundary row above the box' },
      { addr: p.startAddr, main: 'Row ' + p.K + ', Word 0 · Box Start', sub: 'First screen word painted' },
      { addr: p.startAddr + 1, main: 'Row ' + p.K + ', Word 1 · 16px', sub: 'Second word of the first row' },
      { addr: p.startAddr + 2, main: 'Row ' + p.K + ', Word 2 · 32px', sub: 'Third word of the first row' },
      { addr: p.endAddr, main: 'Row ' + p.endRow + ', Word ' + (p.wordsPerRow - 1) + ' · Box End', sub: 'Last screen word painted' },
      { addr: p.endAddr + 1, main: 'Row ' + p.endRow + ', Word ' + p.wordsPerRow, sub: 'First word after the box' }
    ];
  }

  function buildMonitor() {
    $('#monitorRows').innerHTML = monitorDescriptors().map(function (m) {
      return '<div class="mon" data-addr="' + m.addr + '">' +
        '<span class="lbl">RAM[' + m.addr + ']<small>' + esc(m.main) + '</small></span>' +
        '<span class="val"><span class="num">0</span><span class="tag white">White</span></span>' +
        '</div>';
    }).join('');
  }

  function updateMonitor() {
    $$('#monitorRows .mon').forEach(function (row) {
      var addr = parseInt(row.getAttribute('data-addr'), 10);
      var v = machine.ram[addr];
      var num = row.querySelector('.num');
      var tag = row.querySelector('.tag');
      num.textContent = v === 0xffff ? '−1' : String(v);
      if (v === 0xffff) {
        tag.className = 'tag black';
        tag.textContent = 'Black';
      } else {
        tag.className = 'tag white';
        tag.textContent = 'White';
      }
    });
  }

  function loadEmulatorProgram() {
    var program = window.HackAssembler.assemble(P.boxAsm(state.K));
    machine.loadRom(program.rom);
    machine.reset();
    machine.setKey(state.held);
  }

  function paintScreen() {
    machine.paint(state.imageData);
    ctx.putImageData(state.imageData, 0, 0);
  }

  function updateRegisters() {
    $('#regPC').textContent = machine.PC;
    $('#regA').textContent = machine.A;
    $('#regD').textContent = machine.D;
    $('#regKbd').textContent = machine.ram[24576] === 0xffff ? '−1' : '0';
    $('#romBits').textContent = machine.instr.toString(2).padStart(16, '0');
    $('#cycleChip').textContent = 'Cycle #' + fmt(machine.cycles);
    updateMonitor();
  }

  function setHeld(held) {
    state.held = !!held;
    if (!machine) return;
    machine.setKey(state.held);
    var btn = $('#btnHold');
    btn.classList.toggle('held', state.held);
    var chip = $('#emuStatus');
    chip.innerHTML = '<svg class="icon"><use href="#i-keyboard"/></svg>' +
      (state.held ? 'Key Held · Drawing Box' : 'Key Released (Box Erased)');
    chip.classList.toggle('warn', state.held);
    paintScreen();
    updateRegisters();
  }

  function setPaused(paused) {
    state.running = !paused;
    var btn = $('#btnPause');
    btn.innerHTML = state.running
      ? '<svg class="icon"><use href="#i-pause"/></svg><span>Pause CPU</span>'
      : '<svg class="icon"><use href="#i-play"/></svg><span>Resume CPU</span>';
  }

  function initPartC() {
    canvas = $('#emuCanvas');
    ctx = canvas.getContext('2d');
    state.imageData = ctx.createImageData(512, 256);
    machine = new window.HackMachine();
    loadEmulatorProgram();

    buildMonitor();
    paintScreen();
    updateRegisters();

    $('#btnPause').addEventListener('click', function () { setPaused(state.running); });

    $('#btnStep').addEventListener('click', function () {
      setPaused(true);
      machine.step();
      paintScreen();
      updateRegisters();
    });

    $('#btnReset').addEventListener('click', function () {
      machine.reset();
      machine.setKey(state.held);
      paintScreen();
      updateRegisters();
    });

    var holdBtn = $('#btnHold');
    function press(e) { e.preventDefault(); setHeld(true); }
    function release(e) { if (e) e.preventDefault(); setHeld(false); }
    holdBtn.addEventListener('pointerdown', press);
    holdBtn.addEventListener('pointerup', release);
    holdBtn.addEventListener('pointerleave', release);
    holdBtn.addEventListener('pointercancel', release);

    window.addEventListener('keydown', function (e) {
      if (isTyping(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Tab') return;
      setHeld(true);
    });
    window.addEventListener('keyup', function (e) {
      if (isTyping(e.target)) return;
      setHeld(false);
    });
    window.addEventListener('blur', function () { setHeld(false); });

    var speed = $('#speedRange');
    speed.addEventListener('input', function () {
      state.speed = parseInt(speed.value, 10);
      $('#speedVal').textContent = fmt(state.speed) + 'c';
    });
    $('#speedVal').textContent = fmt(state.speed) + 'c';

    var last = performance.now();
    var acc = 0;
    var frame = 0;
    function loop(now) {
      var dt = Math.min(now - last, 120);
      last = now;
      if (state.running) {
        acc += state.speed * dt / 1000;
        var n = Math.floor(acc);
        if (n > 0) {
          acc -= n;
          machine.run(n);
        }
      }
      paintScreen();
      frame++;
      if (frame % 4 === 0) updateRegisters();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------------ */
  /* roll / K engine                                                     */
  /* ------------------------------------------------------------------ */

  function applyK(roll) {
    state.roll = String(roll || '').replace(/\D/g, '') || P.DEFAULT_ROLL;
    state.K = P.kFromRoll(state.roll);

    $('#rollInput').value = state.roll;
    $('#rollChipNum').textContent = state.roll;

    renderParams(state.K);
    renderChecklist();
    renderFiles();
    buildMonitor();
    updateMonitor();

    if (state.preset === 'box' || state.preset === 'dup') {
      setEditorSource(presetSource(state.preset), state.preset);
    }

    loadEmulatorProgram();
    paintScreen();
    updateRegisters();
  }

  function initKEngine() {
    var input = $('#rollInput');
    var timer = null;
    input.addEventListener('input', function () {
      input.value = input.value.replace(/\D/g, '').slice(0, 12);
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (input.value.trim()) applyK(input.value.trim());
      }, 260);
    });
    input.addEventListener('change', function () {
      if (input.value.trim()) applyK(input.value.trim());
    });
    $('#rollReset').addEventListener('click', function () {
      applyK(P.DEFAULT_ROLL);
      toast('Restored submitted roll number');
    });
  }

  /* ------------------------------------------------------------------ */
  /* nav + reveal                                                        */
  /* ------------------------------------------------------------------ */

  function initNav() {
    var links = $$('#mainNav a');
    var sections = links.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);

    function setActive(id) {
      links.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) setActive(en.target.id);
        });
      }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
      sections.forEach(function (s) { io.observe(s); });
    }

    links.forEach(function (a) {
      a.addEventListener('click', function () {
        setActive(a.getAttribute('href').slice(1));
      });
    });

    ['#navEmulator', '.rubric-cta'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener('click', function () {
        setPaused(false);
      });
    });
  }

  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    var targets = $$('.card, .pillar, .section-head, .stage');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .06 });
    targets.forEach(function (el) {
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------------ */
  /* boot                                                                */
  /* ------------------------------------------------------------------ */

  renderPillars();
  initKEngine();
  initPartA();
  renderParams(state.K);
  renderChecklist();
  renderFiles();
  initPartB();
  initPartC();
  initNav();
  initReveal();

  applyK(P.DEFAULT_ROLL);
})();
