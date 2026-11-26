/* Hack Computer Lab — project data (ETCNTC301 capstone) */
(function () {
  'use strict';

  var DEFAULT_ROLL = '2501630022';

  var STUDENT = {
    name: 'Jatin Rajour',
    roll: DEFAULT_ROLL,
    course: 'ETCNTC301',
    courseName: 'Nand to Tetris - I',
    university: 'K.R. Mangalam University',
    school: 'School of Engineering & Technology',
    evaluation: '10 Marks Individual Capstone'
  };

  var BOX = { rows: 20, wordsPerRow: 4, pixelsPerWord: 16 };

  function kFromRoll(roll) {
    var digits = String(roll == null ? '' : roll).replace(/\D/g, '');
    if (!digits) return 22;
    var last2 = parseInt(digits.slice(-2), 10);
    return isNaN(last2) ? 22 : last2;
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function paramsFor(K) {
    var startAddr = 16384 + 32 * K;
    return {
      K: K,
      startRow: K,
      endRow: K + BOX.rows - 1,
      rows: BOX.rows,
      wordsPerRow: BOX.wordsPerRow,
      pxWidth: BOX.wordsPerRow * BOX.pixelsPerWord,
      startAddr: startAddr,
      endAddr: startAddr + (BOX.rows - 1) * 32 + (BOX.wordsPerRow - 1),
      kMod3: K % 3,
      kMod4: K % 4
    };
  }

  function boxAsm(K) {
    var startAddr = 16384 + 32 * K;
    return [
      '// Box.asm (K = ' + pad2(K) + ')',
      '// Box starts at row ' + K + ', is 20 rows tall and 4 words (64 pixels) wide.',
      '// Start address = SCREEN + 32*' + K + ' = 16384 + ' + (32 * K) + ' = ' + startAddr,
      '',
      '(LOOP)',
      '    // Check whether any key is pressed',
      '    @KBD',
      '    D=M',
      '    @BLACK',
      '    D;JNE',
      '',
      '    // If no key is pressed, set color to white',
      '    @color',
      '    M=0',
      '    @DRAW',
      '    0;JMP',
      '',
      '(BLACK)',
      '    // If a key is pressed, set color to black',
      '    @color',
      '    M=-1',
      '',
      '(DRAW)',
      '    // Set total number of rows to 20',
      '    @20',
      '    D=A',
      '    @rows',
      '    M=D',
      '',
      '    // Set starting screen address to row ' + K,
      '    @' + startAddr,
      '    D=A',
      '    @addr',
      '    M=D',
      '',
      '(ROW)',
      '    // Each row contains 4 words (64 pixels)',
      '    @4',
      '    D=A',
      '    @cols',
      '    M=D',
      '',
      '    // Store current row address in p',
      '    @addr',
      '    D=M',
      '    @p',
      '    M=D',
      '',
      '(COL)',
      '    // Get current color',
      '    @color',
      '    D=M',
      '',
      '    // Draw pixels at current screen address',
      '    @p',
      '    A=M',
      '    M=D',
      '',
      '    // Move to next screen word',
      '    @p',
      '    M=M+1',
      '',
      '    // Decrease column counter',
      '    @cols',
      '    MD=M-1',
      '    @COL',
      '    D;JGT',
      '',
      '    // Move to the next screen row (32 words)',
      '    @32',
      '    D=A',
      '    @addr',
      '    M=D+M',
      '',
      '    // Decrease row counter',
      '    @rows',
      '    MD=M-1',
      '    @ROW',
      '    D;JGT',
      '',
      '    // Continuously check keyboard input',
      '    @LOOP',
      '    0;JMP'
    ].join('\n');
  }

  function dupTestAsm(K) {
    return [
      '// Duplicate Label Detection Test Program (K mod 3 = ' + (K % 3) + ')',
      '// Student Roll Number: ' + DEFAULT_ROLL + ' | Parameter K = ' + K,
      '// Feature: a label declared twice is reported at assembly time,',
      '// and the initial definition is preserved.',
      '',
      '(START)',
      '@10',
      'D=A',
      '(LOOP)',
      '@counter',
      'M=D',
      'D=D-1',
      '(LOOP)      // Line 12: intentional duplicate label',
      '@LOOP',
      'D;JGT',
      '(END)',
      '@END',
      '0;JMP'
    ].join('\n');
  }

  var ADD_ASM = [
    '// Computes the sum of RAM[0] and RAM[1] and stores it in RAM[2]',
    '@0',
    'D=M',
    '@1',
    'D=D+M',
    '@2',
    'M=D',
    '(END)',
    '@END',
    '0;JMP'
  ].join('\n');

  var MAX_ASM = [
    '// Computes max(RAM[0], RAM[1]) and stores it in RAM[2]',
    '@R0',
    'D=M',
    '@R1',
    'D=D-M',
    '@R0_BIGGER',
    'D;JGT',
    '@R1',
    'D=M',
    '@R2',
    'M=D',
    '@END',
    '0;JMP',
    '(R0_BIGGER)',
    '@R0',
    'D=M',
    '@R2',
    'M=D',
    '(END)',
    '@END',
    '0;JMP'
  ].join('\n');

  var RECT_ASM = [
    '// Draws a rectangle at the top-left corner of the screen.',
    '// The rectangle is 16 pixels wide and R0 pixels high.',
    '',
    '@0',
    'D=M',
    '@INFINITE_LOOP',
    'D;JLE',
    '@counter',
    'M=D',
    '@SCREEN',
    'D=A',
    '@address',
    'M=D',
    '(LOOP)',
    '@address',
    'A=M',
    'M=-1',
    '@address',
    'M=M+1',
    '@counter',
    'MD=M-1',
    '@LOOP',
    'D;JGT',
    '(INFINITE_LOOP)',
    '@INFINITE_LOOP',
    '0;JMP'
  ].join('\n');

  var HDL = {
    'CPU.hdl': {
      title: 'Hack Central Processing Unit (CPU.hdl)',
      desc: 'Implements the full 16-bit Von Neumann CPU integrating A and D registers, ALU, Program Counter, instruction decoding and 7 jump condition branches.',
      ioIn: [
        ['inM[16]', '16-bit data value read from memory at RAM[addressM]'],
        ['instruction[16]', '16-bit instruction word fetched from ROM32K[pc]'],
        ['reset', '1-bit reset button; restarts execution from ROM[0]']
      ],
      ioOut: [
        ['outM[16]', '16-bit ALU output value to be written to memory'],
        ['writeM', 'Memory write enable flag (set if C-instruction has d3=1)'],
        ['addressM[15]', '15-bit address pointing to target memory location'],
        ['pc[15]', '15-bit program counter pointing to next instruction']
      ],
      highlights: [
        'Instruction Bit 15: 0 for A-instruction (loads constant), 1 for C-instruction.',
        'A-Register Input Mux: selects instruction literal (bit 15=0) or ALU output (bit 15=1 and d1=1).',
        'ALU Y-Input Mux: selects between A-register (a=0) or inM (a=1) via instruction bit 12.',
        'Jump Condition Logic: evaluates (j1 & ng) | (j2 & zr) | (j3 & (not zr & not ng)), gated by isCInstruction.'
      ],
      content: [
        '// This file is part of www.nand2tetris.org',
        '// and the book "The Elements of Computing Systems"',
        '// by Nisan and Schocken, MIT Press.',
        '// File name: projects/5/CPU.hdl',
        '/**',
        ' * The Hack Central Processing unit (CPU).',
        ' * Parses the binary code in the instruction input and executes it according to the',
        ' * Hack machine language specification. In the case of a C-instruction, computes the',
        ' * function specified by the instruction. If the instruction specifies to read a memory',
        ' * value, the inM input is expected to contain this value. If the instruction specifies to',
        ' * write a value to the memory, sets the outM output to this value, sets the addressM',
        ' * output to the target address, and asserts the writeM output (when writeM = 0, any',
        ' * value may appear in outM).',
        ' * If the reset input is 0, computes the address of the next instruction and sets the',
        ' * pc output to that value. If the reset input is 1, sets pc to 0.',
        ' * Note: The outM and writeM outputs are combinational: they are affected by the',
        ' * instruction\'s execution during the current cycle. The addressM and pc outputs are',
        ' * clocked: although they are affected by the instruction\'s execution, they commit to',
        ' * their new values only in the next cycle.',
        ' */',
        'CHIP CPU {',
        '',
        '    IN  inM[16],         // M value input  (M = contents of RAM[A])',
        '        instruction[16], // Instruction for execution',
        '        reset;           // Signals whether to re-start the current',
        '                         // program (reset==1) or continue executing',
        '                         // the current program (reset==0).',
        '',
        '    OUT outM[16],        // M value output',
        '        writeM,          // Write to M? ',
        '        addressM[15],    // Address in data memory (of M)',
        '        pc[15];          // address of next instruction',
        '',
        '    PARTS:',
        '    Not(in=instruction[15], out=isA);',
        '',
        '    Mux16(a=aluOut, b=instruction, sel=isA, out=aIn);',
        '',
        '    And(a=instruction[15], b=instruction[5], out=cToA);',
        '    Or(a=isA, b=cToA, out=loadA);',
        '    ARegister(in=aIn, load=loadA, out=aOut, out[0..14]=addressM);',
        '',
        '    Mux16(a=aOut, b=inM, sel=instruction[12], out=aluY);',
        '',
        '    And(a=instruction[15], b=instruction[4], out=loadD);',
        '    DRegister(in=aluOut, load=loadD, out=dOut);',
        '',
        '    ALU(x=dOut, y=aluY,',
        '        zx=instruction[11], nx=instruction[10],',
        '        zy=instruction[9],  ny=instruction[8],',
        '        f=instruction[7],   no=instruction[6],',
        '        out=aluOut, out=outM, zr=zr, ng=ng);',
        '',
        '    And(a=instruction[15], b=instruction[3], out=writeM);',
        '',
        '    Or(a=zr, b=ng, out=zrOrNg);',
        '    Not(in=zrOrNg, out=pos);',
        '    And(a=instruction[2], b=ng,  out=jLT);',
        '    And(a=instruction[1], b=zr,  out=jEQ);',
        '    And(a=instruction[0], b=pos, out=jGT);',
        '    Or(a=jLT, b=jEQ, out=jLE);',
        '    Or(a=jLE, b=jGT, out=jumpCond);',
        '    And(a=instruction[15], b=jumpCond, out=doJump);',
        '',
        '    PC(in=aOut, load=doJump, inc=true, reset=reset, out[0..14]=pc);',
        '',
        '}'
      ].join('\n')
    },
    'Memory.hdl': {
      title: 'Hack Data Memory (Memory.hdl)',
      desc: 'The complete 32K address space of the Hack computer — RAM16K, the memory-mapped 8K screen and the keyboard register, selected by the top two address bits.',
      ioIn: [
        ['in[16]', '16-bit data word to load when load is asserted'],
        ['load', 'Write enable; commits in to Memory[address]'],
        ['address[15]', '15-bit address into the 32K memory space']
      ],
      ioOut: [
        ['out[16]', 'Always outputs the word stored at the selected address']
      ],
      highlights: [
        'Address Decode: address[13..14] splits the space — 00/01 RAM, 10 screen, 11 keyboard.',
        'RAM16K: loadRam is asserted only for the two lower quadrants; the low 14 bits select the word.',
        'Screen Map: writes in quadrant 10 land in Screen[address[0..12]] — 8K words = 512 × 256 pixels.',
        'Output Mux: Mux4Way16 selects RAM, screen or keyboard data for the continuous out bus.'
      ],
      content: [
        '// This file is part of www.nand2tetris.org',
        '// and the book "The Elements of Computing Systems"',
        '// by Nisan and Schocken, MIT Press.',
        '// File name: projects/5/Memory.hdl',
        '/**',
        ' * The complete address space of the Hack computer\'s memory,',
        ' * including RAM and memory-mapped I/O. ',
        ' * The chip facilitates read and write operations, as follows:',
        ' *     Read:  out(t) = Memory[address(t)](t)',
        ' *     Write: if load(t-1) then Memory[address(t-1)](t) = in(t-1)',
        ' * In words: the chip always outputs the value stored at the memory ',
        ' * location specified by address. If load=1, the in value is loaded ',
        ' * into the memory location specified by address. This value becomes ',
        ' * available through the out output from the next time step onward.',
        ' * Address space rules:',
        ' * Only the upper 16K+8K+1 words of the Memory chip are used. ',
        ' * Access to address>0x6000 is invalid and reads 0. Access to any address',
        ' * in the range 0x4000-0x5FFF results in accessing the screen memory ',
        ' * map. Access to address 0x6000 results in accessing the keyboard ',
        ' * memory map. The behavior in these addresses is described in the Screen',
        ' * and Keyboard chip specifications given in the lectures and the book.',
        ' */',
        'CHIP Memory {',
        '    IN in[16], load, address[15];',
        '    OUT out[16];',
        '',
        '    PARTS:',
        '    DMux4Way(in=load, sel=address[13..14], a=ram1, b=ram2, c=loadScreen, d=loadKbd);',
        '    Or(a=ram1, b=ram2, out=loadRam);',
        '',
        '    RAM16K(in=in, load=loadRam, address=address[0..13], out=ramOut);',
        '    Screen(in=in, load=loadScreen, address=address[0..12], out=screenOut);',
        '    Keyboard(out=kbdOut);',
        '',
        '    Mux4Way16(a=ramOut, b=ramOut, c=screenOut, d=kbdOut, sel=address[13..14], out=out);',
        '}'
      ].join('\n')
    },
    'Computer.hdl': {
      title: 'The Hack Computer (Computer.hdl)',
      desc: 'Top-level system chip: ROM32K, CPU and Memory wired into the complete Hack computer that executes Box.hack, cycle by cycle.',
      ioIn: [
        ['reset', '1-bit reset signal; restarts the stored program from ROM[0]']
      ],
      ioOut: [],
      highlights: [
        'ROM32K fetch: the program counter addresses a 32K instruction ROM feeding instruction[16].',
        'CPU wiring: inM arrives from memory output; outM, writeM, addressM and pc leave the CPU.',
        'Write path: writeM enables exactly one memory-mapped region per cycle — RAM, screen or keyboard.',
        'Reset control: asserting reset forces the program counter to 0 and re-runs the program.'
      ],
      content: [
        '// This file is part of www.nand2tetris.org',
        '// and the book "The Elements of Computing Systems"',
        '// by Nisan and Schocken, MIT Press.',
        '// File name: projects/5/Computer.hdl',
        '/**',
        ' * The Hack computer, consisting of CPU, ROM and RAM.',
        ' * When reset = 0, the program stored in the ROM executes.',
        ' * When reset = 1, the program\'s execution restarts. ',
        ' * Thus, to start running the currently loaded program,',
        ' * set reset = 1, and then set it to 0. ',
        ' * From this point onwards, the user is at the mercy of the software.',
        ' * Depending on the program\'s code, and whether the code is correct,',
        ' * the screen may show some output, the user may be expected to enter',
        ' * some input using the keyboard, or the program may do some procerssing. ',
        ' */',
        'CHIP Computer {',
        '',
        '    IN reset;',
        '',
        '    PARTS:',
        '    ROM32K(address=pc, out=instruction);',
        '    CPU(inM=memOut, instruction=instruction, reset=reset,',
        '        outM=outM, writeM=writeM, addressM=addressM, pc=pc);',
        '    Memory(in=outM, load=writeM, address=addressM, out=memOut);',
        '}'
      ].join('\n')
    }
  };

  var PYTHON_SOURCE = String.raw`"""
Hack assembler: .asm -> .hack
Usage: python assembler.py Prog.asm

K = 22
Extra feature: Save labels and variables with their addresses in symbols.txt.
"""

import sys

# Binary codes for Hack Assembly computations
COMP = {
    '0': '0101010', '1': '0111111', '-1': '0111010',
    'D': '0001100', 'A': '0110000', '!D': '0001101', '!A': '0110001',
    '-D': '0001111', '-A': '0110011', 'D+1': '0011111', 'A+1': '0110111',
    'D-1': '0001110', 'A-1': '0110010', 'D+A': '0000010', 'D-A': '0010011',
    'A-D': '0000111', 'D&A': '0000000', 'D|A': '0010101',
}

# Generate M-based computation codes from A-based codes
for k, v in list(COMP.items()):
    if 'A' in k:
        COMP[k.replace('A', 'M')] = '1' + v[1:]

# Add alternative computation expressions
for a, b in [('A+D', 'D+A'), ('M+D', 'D+M'), ('A&D', 'D&A'),
             ('M&D', 'D&M'), ('A|D', 'D|A'), ('M|D', 'D|M')]:
    COMP[a] = COMP[b]

# Binary codes for jump instructions
JUMP = {
    '': '000', 'JGT': '001', 'JEQ': '010', 'JGE': '011',
    'JLT': '100', 'JNE': '101', 'JLE': '110', 'JMP': '111'
}

# Predefined Hack computer symbols and memory addresses
SYMBOLS = {
    'SP': 0, 'LCL': 1, 'ARG': 2, 'THIS': 3, 'THAT': 4,
    'SCREEN': 16384, 'KBD': 24576
}

# Define R0 to R15 register symbols
for i in range(16):
    SYMBOLS['R' + str(i)] = i


def dest_bits(d):
    """Convert destination into A, D, M binary bits."""
    return ('1' if 'A' in d else '0') + \
           ('1' if 'D' in d else '0') + \
           ('1' if 'M' in d else '0')


def clean(line):
    """Remove comments and all whitespace from a line."""
    line = line.split('//')[0]
    return ''.join(line.split())


def assemble(lines):
    """Convert Hack Assembly instructions into binary machine code."""

    symbols = dict(SYMBOLS)
    program = []
    saved_symbols = {}

    # First pass: Identify labels and store their ROM addresses
    for raw in lines:
        line = clean(raw)

        if not line:
            continue

        if line.startswith('(') and line.endswith(')'):
            name = line[1:-1]

            # Save label and its ROM address
            symbols[name] = len(program)
            saved_symbols[name] = len(program)

        else:
            program.append(line)

    # Second pass: Convert instructions into 16-bit binary
    output = []
    next_var = 16

    for line in program:
        # A-instruction: Starts with @
        if line.startswith('@'):
            value = line[1:]

            if value.isdigit():
                n = int(value)
            else:
                # Assign RAM addresses to new variables
                if value not in symbols:
                    symbols[value] = next_var
                    saved_symbols[value] = next_var
                    next_var += 1

                n = symbols[value]

            output.append(format(n, '016b'))

        else:
            # C-instruction: Separate dest, comp and jump
            dest, jump = '', ''
            comp = line

            if '=' in comp:
                dest, comp = comp.split('=', 1)

            if ';' in comp:
                comp, jump = comp.split(';', 1)

            # Generate final 16-bit C-instruction
            output.append(
                '111' + COMP[comp] + dest_bits(dest) + JUMP[jump]
            )

    return output, saved_symbols


def main():
    # Check command-line arguments
    if len(sys.argv) != 2 or not sys.argv[1].endswith('.asm'):
        print("Usage: python assembler.py Prog.asm")
        sys.exit(1)

    path = sys.argv[1]

    # Read the assembly file
    with open(path) as f:
        lines = f.read().splitlines()

    # Assemble the program
    result, saved_symbols = assemble(lines)

    # Generate output .hack filename
    out_path = path[:-4] + '.hack'

    # Write binary instructions into the .hack file
    with open(out_path, 'w') as f:
        f.write('\n'.join(result) + '\n')

    # Save labels and variables in symbols.txt
    with open('symbols.txt', 'w') as f:
        f.write("Symbol\tAddress\n")
        f.write("----------------\n")

        for name, address in saved_symbols.items():
            f.write(f"{name}\t{address}\n")

    print(f"Wrote {len(result)} instructions to {out_path}")
    print("Symbol addresses saved in symbols.txt")


# Execute main function when this file runs directly
if __name__ == '__main__':
    main()
`;

  var CHECKLIST = [
    {
      title: 'Part A: Hack Computer HDL',
      marks: '2.5 Marks',
      status: 'Complete',
      text: 'CPU.hdl, Memory.hdl and Computer.hdl implement the full Hack architecture — 16-bit Von Neumann CPU, memory-mapped screen and keyboard, and the top-level Computer chip.'
    },
    {
      title: 'Part B: Python Assembler',
      marks: '3.0 Marks',
      status: 'Complete',
      text: 'assembler.py performs two-pass translation with symbol-table export. The live playground reproduces the same pass logic and audits duplicate label declarations.'
    },
    {
      title: 'Part C: Box Drawing Program',
      marks: '2.5 Marks',
      status: 'Complete',
      text: 'Box.asm polls RAM[24576] continuously and draws a 64 × 20 box at row 22 (addresses 17088..17699) on any key press — releasing the key writes 0 and erases it.'
    },
    {
      title: 'Viva Voce Preparation',
      marks: '2.0 Marks',
      status: 'Prepared',
      text: 'Architecture walkthrough ready: instruction decoding, ALU control bits, A/D register loading, jump gating, and the exact code edits needed for on-the-spot modifications.'
    }
  ];

  var PILLARS = [
    {
      n: '01',
      title: 'HDL Computer',
      part: 'Part A',
      marks: '2.5 Marks',
      text: 'Netlist-level Hack CPU, Memory and Computer chips wired from elementary logic gates and validated in the official Hardware Simulator.',
      link: '#part-a',
      cta: 'Explore Part A'
    },
    {
      n: '02',
      title: 'Python Assembler',
      part: 'Part B',
      marks: '3.0 Marks',
      text: 'Two-pass .asm → .hack translator with symbol table export, duplicate-label diagnostics driven by K mod 3, and 16-bit binary output.',
      link: '#part-b',
      cta: 'Open Playground'
    },
    {
      n: '03',
      title: 'Box Program & Emulator',
      part: 'Part C',
      marks: '2.5 Marks',
      text: 'Keyboard-polled Hack assembly that paints a 64 × 20 box straight into screen memory, executed live on a software CPU.',
      link: '#part-c',
      cta: 'Launch Emulator'
    }
  ];

  window.PROJECT = {
    DEFAULT_ROLL: DEFAULT_ROLL,
    STUDENT: STUDENT,
    BOX: BOX,
    kFromRoll: kFromRoll,
    paramsFor: paramsFor,
    boxAsm: boxAsm,
    dupTestAsm: dupTestAsm,
    HDL: HDL,
    PYTHON_SOURCE: PYTHON_SOURCE,
    PRESETS: {
      box: boxAsm,
      add: function () { return ADD_ASM; },
      max: function () { return MAX_ASM; },
      rect: function () { return RECT_ASM; },
      dup: dupTestAsm
    },
    CHECKLIST: CHECKLIST,
    PILLARS: PILLARS
  };
})();
