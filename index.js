angular.module('elfide', [])

.controller('EditorCtrl', function($scope, $window, $timeout) {
  const insertLine = (lines, newLine, position) => {
    if (position < 0) {
      lines.push(newLine);
    }
    lines.slice(position, 0, newLine);
  };
  const removeLine = (lines, newLine, position) => {
    if (position < 0) {
      lines.push(newLine);
    }
    lines.slice(position, 0, newLine);
  };

  const blankLine = {
    'memoryaddress': 0,
    'memoryValue': "",
    'sourceCode': "",
    'length': 0,
    'error': ""
  };

  const parseLineSource = (lineSource) => {
    const lineStructure = {
      label: "",
      type: "",
      value: "",
      operand: "",
      comment: "",
      error: ""
    };

    const tokens = lineSource.match(/#|:|"|\.\.|\s+|[^\s#":]+/ig);
    if (tokens === null) {
      return lineStructure;
    }

    for (let i = 0 ; i < tokens.length ; i++) {
      if (tokens[i].search(/\s/) !== -1) continue;

      if (tokens[i].search(/\.\./) !== -1) {
        if (++i < tokens.length && tokens[i].search(/\s/) !== -1) i++;
        for (; i < tokens.length ; i++) {
          lineStructure.comment = lineStructure.comment.concat(tokens[i]);
        }
        return lineStructure;
      }

      switch (tokens[i]) {
        case ":":
          lineStructure.error = "Empty label";
          return lineStructure;
          break;
        case "#":
          if (lineStructure.type !== "") {
            lineStructure.error = "Data of type " + lineStructure.type + " already defined";
            return lineStructure;
          }
          lineStructure.type = "directValue";
          i++;
          if (tokens[i].search(/\s/) !== -1) i++;
          lineStructure.value = tokens[i];
          break;
        case "\"":
          if (lineStructure.type !== "") {
            lineStructure.error = "Data of type " + lineStructure.type + " already defined";
            return lineStructure;
          }
          lineStructure.type = "string";
          i++;
          for (; i < tokens.length && tokens[i] !== "\"" ; i++) {
            lineStructure.value = lineStructure.value.concat(tokens[i]);
          }
          break;
        default:
          if (i + 1 < tokens.length && tokens[i + 1] === ":") {
            if (lineStructure.label !== "") {
              lineStructure.error = "Multiple label declaration";
              return lineStructure;
            }
            lineStructure.label = tokens[i++];
          } else if (i + 2 < tokens.length
              && tokens[i + 1].search(/\s/) !== -1 && tokens[i + 2] === ":") {
              if (lineStructure.label !== "") {
                lineStructure.error = "Multiple label declaration";
                return lineStructure;
            }
            lineStructure.label = tokens[i];
            i += 2;
          } else {
            if (lineStructure.type === "operation") {
              if (lineStructure.operand !== "") {
                lineStructure.error = "Multiple operand declaration";
                return lineStructure;
              }
              lineStructure.operand = tokens[i];
            } else {
              if (lineStructure.type !== "") {
                lineStructure.error = "Data of type " + lineStructure.type + " already defined";
                return lineStructure;
              }
              lineStructure.type = "operation";
              lineStructure.value = tokens[i];
            }
          }
        }
      }

    return lineStructure;
  }

  $scope.processLine = (lines, line) => {
    line.memoryValue = "";
    line.error = "";
    
    const lineStructure = parseLineSource(line.sourceCode);

    if (lineStructure.error !== "") {
      line.error = lineStructure.error;
      return;
    }

    switch (lineStructure.type) {
      case "string":
        let char;
        for (let i = 0 ; i < lineStructure.value.length ; i++) {
          line.memoryValue = line.memoryValue.concat(
            lineStructure.value.charCodeAt(i).toString(16).toUpperCase());
        }
        line.length = lineStructure.value.length;
        break;
      case "directValue":
        if (isNaN(Number(lineStructure.value))) {
           line.error = "Invalid directValue : not a number";
           return;
        }
        line.memoryValue = Number(lineStructure.value).toString(16).toUpperCase();
        if (line.memoryValue.length % 2) {
          line.memoryValue = "0" + line.memoryValue;
        }
        line.length = line.memoryValue.length / 2;
        break;
      case "operation":
      case "":
    }

    if (lines.indexOf(line) > 0) {
      line.memoryaddress = lines[lines.indexOf(line) - 1].memoryaddress;
      line.memoryaddress += lines[lines.indexOf(line) - 1].length;
    } else {
      line.memoryaddress = 0;
    }

    for (let i = lines.indexOf(line) + 1 ; i < lines.length ; i++) {
      lines[i].memoryaddress = lines[i - 1].memoryaddress + lines[i - 1].length;
    }
  }

  $scope.lines = [];
  insertLine($scope.lines, blankLine, -1);

  $scope.changed = (event, line, lineNumber) => {
    switch (event.key) {
      case 'Enter':
        $scope.lines.splice(lineNumber + 1, 0, {
          'memoryaddress': line.memoryaddress,
          'memoryValue': "",
          'length': 0,
          'sourceCode': ""
        });
        $timeout(() => {
          const newLine = $window.document.getElementById('elfide-editor-line-source-' + (lineNumber + 1));
          if (newLine) newLine.focus();
        });
        break;
      case 'ArrowUp':
        if (lineNumber > 0) {
          const previousLine = $window.document.getElementById('elfide-editor-line-source-' + (lineNumber - 1));
          if (previousLine) {
            previousLine.focus();
          }
        }
        break;
      case 'ArrowDown':
        if (lineNumber < $scope.lines.length - 1) {
          const nextLine = $window.document.getElementById('elfide-editor-line-source-' + (lineNumber + 1));
          if (nextLine) {
            nextLine.focus();
          }
        }
        break;
      case "Backspace":
    }
  };
});

arch = {
  "adc": {
    "opcode": "74",
    "operand": "",
    "cycles": 2,
    "description": "Add with Carry"
  },
  "adci": {
    "opcode": "7C",
    "operand": "b",
    "cycles": 2,
    "description": "Add with Carry Immediate"
  },
  "add": {
    "opcode": "F4",
    "operand": "",
    "cycles": 2,
    "description": "Add"
  },
  "adi": {
    "opcode": "FC",
    "operand": "b",
    "cycles": 2,
    "description": "Add Immediate"
  },
  "and": {
    "opcode": "F2",
    "operand": "",
    "cycles": 2,
    "description": "Logical AND"
  },
  "ani": {
    "opcode": "FA",
    "operand": "b",
    "cycles": 2,
    "description": "AND Immediate"
  },
  "b1": {
    "opcode": "34",
    "operand": "a",
    "cycles": 2,
    "description": "Branch on External Flag 1"
  },
  "b2": {
    "opcode": "35",
    "operand": "a",
    "cycles": 2,
    "description": "Branch on External Flag 2"
  },
  "b3": {
    "opcode": "36",
    "operand": "a",
    "cycles": 2,
    "description": "Branch on External Flag 3"
  },
  "b4": {
    "opcode": "37",
    "operand": "a",
    "cycles": 2,
    "description": "Branch on External Flag 4"
  },
  "bdf": {
    "opcode": "33",
    "operand": "a",
    "cycles": 2,
    "description": "Branch if DF is 1"
  },
  "bn1": {
    "opcode": "3C",
    "operand": "a",
    "cycles": 2,
    "description": "Branch on Not External Flag 1"
  },
  "bn2": {
    "opcode": "3D",
    "operand": "a",
    "cycles": 2,
    "description": "Branch on Not External Flag 2"
  },
  "bn3": {

    "opcode": "3E",
    "operand": "a",
    "cycles": 2,
    "description": "Branch on Not External Flag 3"
  },
  "bn4": {
    "opcode": "3F",
    "operand": "a",
    "cycles": 2,
    "description": "Branch on Not External Flag 4"
  },
  "bnf": {
    "opcode": "3B",
    "operand": "a",
    "cycles": 2,
    "description": "Branch if DF is 0"
  },
  "bnq": {
    "opcode": "39",
    "operand": "a",
    "cycles": 2,
    "description": "Branch if Q is off"
  },
  "bnz": {
    "opcode": "3A",
    "operand": "a",
    "cycles": 2,
    "description": "Branch on Not Zero"
  },
  "bq": {
    "opcode": "31",
    "operand": "a",
    "cycles": 2,
    "description": "Branch if Q is on"
  },
  "br": {
    "opcode": "30",
    "operand": "a",
    "cycles": 2,
    "description": "Branch unconditionally"
  },
  "bz": {
    "opcode": "32",
    "operand": "a",
    "cycles": 2,
    "description": "Branch on Zero"
  },
  "dec": {// TODO
    "opcode": "2",
    "operand": "r",
    "cycles": 2,
    "description": "Decrement Register"
  },
  "dis": {
    "opcode": "71",
    "operand": "",
    "cycles": 2,
    "description": "Return and Disable Interrupts"
  },
  "ghi": {// TODO
    "opcode": "9",
    "operand": "r",
    "cycles": 2,
    "description": "Get High byte of Register"
  },
  "glo": {// TODO
    "opcode": "8",
    "operand": "r",
    "cycles": 2,
    "description": "Get Low byte of Register"
  },
  "idl": {
    "opcode": "00",
    "operand": "",
    "cycles": 2,
    "description": "Idle"
  },
  "inc": {// TODO
    "opcode": "1",
    "operand": "r",
    "cycles": 2,
    "description": "Increment Register"
  },
  "inp": {// TODO
    "opcode": "6",
    "operand": "p",
    "cycles": 2,
    "description": "Input to memory and D (for p = 9 to F)"
  },
  "irx": {
    "opcode": "60",
    "operand": "",
    "cycles": 2,
    "description": "Increment R(X)"
  },
  "lbdf": {
    "opcode": "C3",
    "operand": "aa",
    "cycles": 3,
    "description": "Long Branch if DF is 1"
  },
  "lbnf": {
    "opcode": "CB",
    "operand": "aa",
    "cycles": 3,
    "description": "Long Branch if DF is 0"
  },
  "lbnq": {
    "opcode": "C9",
    "operand": "aa",
    "cycles": 3,
    "description": "Long Branch if Q is off"
  },
  "lbnz": {
    "opcode": "CA",
    "operand": "aa",
    "cycles": 3,
    "description": "Long Branch if Not Zero"
  },
  "lbq": {
    "opcode": "C1",
    "operand": "aa",
    "cycles": 3,
    "description": "Long Branch if Q is on"
  },
  "lbr": {
    "opcode": "C0",
    "operand": "aa",
    "cycles": 3,
    "description": "Long Branch unconditionally"
  },
  "lbz": {
    "opcode": "C2",
    "operand": "aa",
    "cycles": 3,
    "description": "Long Branch if Zero"
  },
  "lda": {// TODO
    "opcode": "4",
    "operand": "r",
    "cycles": 2,
    "description": "Load D and Advance"
  },
  "ldi": {
    "opcode": "F8",
    "operand": "b",
    "cycles": 2,
    "description": "Load D Immediate"
  },
  "ldn": {// TODO
    "opcode": "0",
    "operand": "r",
    "cycles": 2,
    "description": "Load D via N (for r = 1 to F)"
  },
  "ldx": {
    "opcode": "F0",
    "operand": "",
    "cycles": 2,
    "description": "Load D via R(X)"
  },
  "ldxa": {
    "opcode": "72",
    "operand": "",
    "cycles": 2,
    "description": "Load D via R(X) and Advance"
  },
  "lsdf": {
    "opcode": "CF",
    "operand": "",
    "cycles": 3,
    "description": "Long Skip if DF is 1"
  },
  "lsie": {
    "opcode": "CC",
    "operand": "",
    "cycles": 3,
    "description": "Long Skip if Interrupts Enabled"
  },
  "lskp": {
    "opcode": "C8",
    "operand": "",
    "cycles": 3,
    "description": "Long Skip"
  },
  "lsnf": {
    "opcode": "C7",
    "operand": "",
    "cycles": 3,
    "description": "Long Skip if DF is 0"
  },
  "lsnq": {
    "opcode": "C5",
    "operand": "",
    "cycles": 3,
    "description": "Long Skip if Q is off"
  },
  "lsnz": {
    "opcode": "C6",
    "operand": "",
    "cycles": 3,
    "description": "Long Skip if Not Zero"
  },
  "lsq": {
    "opcode": "CD",
    "operand": "",
    "cycles": 3,
    "description": "Long Skip if Q is on"
  },
  "lsz": {
    "opcode": "CE",
    "operand": "",
    "cycles": 3,
    "description": "Long Skip if Zero"
  },
  "mark": {
    "opcode": "79",
    "operand": "",
    "cycles": 2,
    "description": "Save X and P in T"
  },
  "nop": {
    "opcode": "C4",
    "operand": "",
    "cycles": 3,
    "description": "No Operation"
  },
  "or": {
    "opcode": "F1",
    "operand": "",
    "cycles": 2,
    "description": "Logical OR"
  },
  "ori": {
    "opcode": "F9",
    "operand": "b",
    "cycles": 2,
    "description": "OR Immediate"
  },
  "out": {// TODO
    "opcode": "6",
    "operand": "p",
    "cycles": 2,
    "description": "Output from memory (for p = 1 to 7)"
  },
  "phi": {// TODO
    "opcode": "B",
    "operand": "r",
    "cycles": 2,
    "description": "Put D in High byte of register"
  },
  "plo": {
    "opcode": "A",
    "operand": "r",
    "cycles": 2,
    "description": "Put D in Low byte of register"
  },
  "req": {
    "opcode": "7A",
    "operand": "",
    "cycles": 2,
    "description": "Reset Q"
  },
  "ret": {
    "opcode": "70",
    "operand": "",
    "cycles": 2,
    "description": "Return"
  },
  "sav": {
    "opcode": "78",
    "operand": "",
    "cycles": 2,
    "description": "Save T"
  },
  "sd": {
    "opcode": "F5",
    "operand": "",
    "cycles": 2,
    "description": "Subtract D from memory"
  },
  "sdb": {
    "opcode": "75",
    "operand": "",
    "cycles": 2,
    "description": "Subtract D from memory with Borrow"
  },
  "sdbi": {
    "opcode": "7D",
    "operand": "b",
    "cycles": 2,
    "description": "Subtract D with Borrow, Immediate"
  },
  "sdi": {
    "opcode": "FD",
    "operand": "b",
    "cycles": 2,
    "description": "Subtract D from memory Immediate byte"
  },
  "sep": {// TODO
    "opcode": "D",
    "operand": "r",
    "cycles": 2,
    "description": "Set P"
  },
  "seq": {
    "opcode": "7B",
    "operand": "",
    "cycles": 2,
    "description": "Set Q"
  },
  "sex": {// TODO
    "opcode": "E",
    "operand": "r",
    "cycles": 2,
    "description": "Set X"
  },
  "shl": {
    "opcode": "FE",
    "operand": "",
    "cycles": 2,
    "description": "Shift D Left"
  },
  "shlc": {
    "opcode": "7E",
    "operand": "",
    "cycles": 2,
    "description": "Shift D Left with Carry"
  },
  "shr": {
    "opcode": "F6",
    "operand": "",
    "cycles": 2,
    "description": "Shift D Right"
  },
  "shrc": {
    "opcode": "76",
    "operand": "",
    "cycles": 2,
    "description": "Shift D Right with Carry"
  },
  "skp": {
    "opcode": "38",
    "operand": "",
    "cycles": 2,
    "description": "Skip one byte"
  },
  "sm": {
    "opcode": "F7",
    "operand": "",
    "cycles": 2,
    "description": "Subtract Memory from D"
  },
  "smb": {
    "opcode": "77",
    "operand": "",
    "cycles": 2,
    "description": "Subtract Memory from D with Borrow"
  },
  "smbi": {
    "opcode": "7F",
    "operand": "b",
    "cycles": 2,
    "description": "Subtract Memory with Borrow, Immediate"
  },
  "smi": {
    "opcode": "FF",
    "operand": "b",
    "cycles": 2,
    "description": "Subtract Memory from D, Immediate"
  },
  "str": {// TODO
    "opcode": "5",
    "operand": "r",
    "cycles": 2,
    "description": "Store D into memory"
  },
  "stxd": {
    "opcode": "73",
    "operand": "",
    "cycles": 2,
    "description": "Store D via R(X) and Decrement"
  },
  "xor": {
    "opcode": "F3",
    "operand": "",
    "cycles": 2,
    "description": "Exclusive OR"
  },
  "xri": {
    "opcode": "FB",
    "operand": "b",
    "cycles": 2,
    "description": "Exclusive OR, Immediate"
  }
};
