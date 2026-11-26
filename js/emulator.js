/* Minimal Hack computer: 16-bit CPU + 32K RAM with screen / keyboard memory maps */
(function () {
  'use strict';

  var SCREEN_BASE = 16384;
  var KBD_ADDR = 24576;
  var SCREEN_WORDS = 8192;

  // 0xAABBGGRR little-endian pixels
  var PAPER = 0xffdff2f6;
  var INK = 0xff142723;

  function HackMachine() {
    this.rom = new Uint16Array(32768);
    this.ram = new Uint16Array(24577);
    this.A = 0;
    this.D = 0;
    this.PC = 0;
    this.cycles = 0;
    this.instr = 0;
    this.kbdHeld = false;
  }

  HackMachine.prototype.loadRom = function (bits) {
    this.rom.fill(0);
    var n = Math.min(bits.length, 32768);
    for (var i = 0; i < n; i++) this.rom[i] = parseInt(bits[i], 2) || 0;
  };

  HackMachine.prototype.reset = function () {
    this.ram.fill(0);
    this.A = 0;
    this.D = 0;
    this.PC = 0;
    this.cycles = 0;
    this.instr = 0;
    this.ram[KBD_ADDR] = this.kbdHeld ? 0xffff : 0;
  };

  HackMachine.prototype.setKey = function (held) {
    this.kbdHeld = !!held;
    this.ram[KBD_ADDR] = held ? 0xffff : 0;
  };

  HackMachine.prototype.step = function () {
    var instruction = this.rom[this.PC & 0x7fff];
    this.instr = instruction;
    var A = this.A;
    var jumped = false;

    if ((instruction & 0x8000) === 0) {
      this.A = instruction & 0x7fff;
    } else {
      var x = this.D;
      var y = (instruction & 0x1000) ? this.ram[A & 0x7fff] : A;
      if (instruction & 0x0800) x = 0;
      if (instruction & 0x0400) x = (~x) & 0xffff;
      if (instruction & 0x0200) y = 0;
      if (instruction & 0x0100) y = (~y) & 0xffff;
      var out = (instruction & 0x0080) ? (x + y) : (x & y);
      out &= 0xffff;
      if (instruction & 0x0040) out = (~out) & 0xffff;

      if (instruction & 0x0008) this.ram[A & 0x7fff] = out;
      if (instruction & 0x0020) this.A = out;
      if (instruction & 0x0010) this.D = out;

      var zr = out === 0;
      var ng = (out & 0x8000) !== 0;
      var jump =
        ((instruction & 0x0004) !== 0 && ng) ||
        ((instruction & 0x0002) !== 0 && zr) ||
        ((instruction & 0x0001) !== 0 && !ng && !zr);
      if (jump) {
        this.PC = this.A & 0x7fff;
        jumped = true;
      }
    }

    if (!jumped) this.PC = (this.PC + 1) & 0x7fff;
    this.cycles++;
  };

  HackMachine.prototype.run = function (n) {
    for (var i = 0; i < n; i++) this.step();
  };

  HackMachine.prototype.paint = function (imageData) {
    var data = new Uint32Array(imageData.data.buffer);
    for (var i = 0; i < SCREEN_WORDS; i++) {
      var word = this.ram[SCREEN_BASE + i];
      var base = i * 16;
      for (var b = 0; b < 16; b++) {
        data[base + b] = (word & (0x8000 >> b)) ? INK : PAPER;
      }
    }
  };

  HackMachine.prototype.read = function (addr) {
    return this.ram[addr & 0x7fff] || 0;
  };

  HackMachine.SCREEN_BASE = SCREEN_BASE;
  HackMachine.KBD_ADDR = KBD_ADDR;

  window.HackMachine = HackMachine;
})();
