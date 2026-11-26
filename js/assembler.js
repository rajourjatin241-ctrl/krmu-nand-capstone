/* Two-pass Hack assembler — mirrors assembler.py, plus duplicate-label diagnostics */
(function () {
  'use strict';

  var COMP = {
    '0': '0101010', '1': '0111111', '-1': '0111010',
    'D': '0001100', 'A': '0110000', '!D': '0001101', '!A': '0110001',
    '-D': '0001111', '-A': '0110011', 'D+1': '0011111', 'A+1': '0110111',
    'D-1': '0001110', 'A-1': '0110010', 'D+A': '0000010', 'D-A': '0010011',
    'A-D': '0000111', 'D&A': '0000000', 'D|A': '0010101'
  };
  Object.keys(COMP).forEach(function (k) {
    if (k.indexOf('A') !== -1) COMP[k.replace('A', 'M')] = '1' + COMP[k].slice(1);
  });
  [['A+D', 'D+A'], ['M+D', 'D+M'], ['A&D', 'D&A'], ['M&D', 'D&M'], ['A|D', 'D|A'], ['M|D', 'D|M']]
    .forEach(function (pair) { COMP[pair[0]] = COMP[pair[1]]; });

  var JUMP = {
    '': '000', 'JGT': '001', 'JEQ': '010', 'JGE': '011',
    'JLT': '100', 'JNE': '101', 'JLE': '110', 'JMP': '111'
  };

  var PREDEFINED = { SP: 0, LCL: 1, ARG: 2, THIS: 3, THAT: 4, SCREEN: 16384, KBD: 24576 };
  for (var r = 0; r < 16; r++) PREDEFINED['R' + r] = r;

  function clean(line) {
    return line.split('//')[0].replace(/\s+/g, '');
  }

  function destBits(dest, lineNo) {
    var bits = ['0', '0', '0'];
    for (var i = 0; i < dest.length; i++) {
      var c = dest[i];
      if (c === 'A') bits[0] = '1';
      else if (c === 'D') bits[1] = '1';
      else if (c === 'M') bits[2] = '1';
      else return { error: 'Invalid destination "' + dest + '" on line ' + lineNo };
    }
    return { bits: bits.join('') };
  }

  function assemble(source) {
    var rawLines = String(source || '').split(/\r?\n/);
    var program = [];
    var labels = new Map();
    var warnings = [];
    var errors = [];

    rawLines.forEach(function (raw, idx) {
      var lineNo = idx + 1;
      var text = clean(raw);
      if (!text) return;
      if (text[0] === '(' && text[text.length - 1] === ')') {
        var name = text.slice(1, -1);
        if (!name) {
          errors.push({ line: lineNo, message: 'Empty label declaration' });
          return;
        }
        if (labels.has(name)) {
          warnings.push({
            label: name,
            line: lineNo,
            firstLine: labels.get(name).line,
            message: 'Duplicate label "' + name + '" on line ' + lineNo +
              ' — first definition on line ' + labels.get(name).line + ' preserved.'
          });
          return;
        }
        labels.set(name, { addr: program.length, line: lineNo });
        return;
      }
      program.push({ text: text, line: lineNo });
    });

    var symbols = Object.assign({}, PREDEFINED);
    var symbolRows = [];
    labels.forEach(function (v, k) {
      symbols[k] = v.addr;
      symbolRows.push({ name: k, addr: v.addr, kind: 'label' });
    });

    var vars = new Map();
    var nextVar = 16;
    var rom = [];
    var listing = [];

    program.forEach(function (ins) {
      var bits = null;
      if (ins.text[0] === '@') {
        var value = ins.text.slice(1);
        var n;
        if (/^\d+$/.test(value)) {
          n = parseInt(value, 10);
        } else if (Object.prototype.hasOwnProperty.call(symbols, value)) {
          n = symbols[value];
        } else {
          if (!/^[A-Za-z_.$:][\w.$:]*$/.test(value)) {
            errors.push({ line: ins.line, message: 'Invalid symbol "' + value + '" on line ' + ins.line });
            return;
          }
          if (!vars.has(value)) {
            vars.set(value, nextVar);
            symbols[value] = nextVar;
            symbolRows.push({ name: value, addr: nextVar, kind: 'variable' });
            nextVar++;
          }
          n = vars.get(value);
        }
        if (n > 32767) {
          errors.push({ line: ins.line, message: 'Constant out of 16-bit range on line ' + ins.line });
          return;
        }
        bits = n.toString(2).padStart(16, '0');
        listing.push({ addr: rom.length, bits: bits, type: 'A', line: ins.line });
      } else {
        var dest = '';
        var comp = ins.text;
        var jump = '';
        if (comp.indexOf('=') !== -1) {
          dest = comp.split('=')[0];
          comp = comp.split('=', 2)[1];
        }
        if (comp.indexOf(';') !== -1) {
          jump = comp.split(';')[1];
          comp = comp.split(';')[0];
        }
        if (!Object.prototype.hasOwnProperty.call(COMP, comp)) {
          errors.push({ line: ins.line, message: 'Unknown computation "' + comp + '" on line ' + ins.line });
          return;
        }
        if (!Object.prototype.hasOwnProperty.call(JUMP, jump)) {
          errors.push({ line: ins.line, message: 'Invalid jump "' + jump + '" on line ' + ins.line });
          return;
        }
        var d = destBits(dest, ins.line);
        if (d.error) { errors.push({ line: ins.line, message: d.error }); return; }
        bits = '111' + COMP[comp] + d.bits + JUMP[jump];
        listing.push({ addr: rom.length, bits: bits, type: 'C', line: ins.line });
      }
      rom.push(bits);
    });

    return {
      ok: errors.length === 0,
      rom: rom,
      listing: listing,
      symbols: symbolRows,
      warnings: warnings,
      errors: errors,
      stats: {
        instructions: rom.length,
        labels: labels.size,
        variables: vars.size,
        warnings: warnings.length
      }
    };
  }

  window.HackAssembler = { assemble: assemble };
})();
