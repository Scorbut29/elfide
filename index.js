const hexify = (value, size) => {
  if (size <= 0) {
    return "";
  }

  let strValue = value.toString(16);
  let padding = size * 2 - strValue.length;

  if (padding > 0) {
    strValue = '0'.repeat(padding) + strValue;
  }
  if (padding < 0) {
    strValue = strValue.slice(-padding);
  }

  return strValue;
}

const parseLineSource = lineSource => {
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
            lineStructure.value = tokens[i].toLowerCase();
          }
        }
      }
    }

  return lineStructure;
}

const expandOperandType = operandType => {
  switch (operandType) {
    case '':
      return '';
    case 'r':
      return 'register';
    case 'a':
      return 'address (short)';
    case 'aa':
      return 'address (long)';
    case 'p':
      return 'port';
    case 'b':
      return 'immediate';
    default:
      return null;
  }
}

const hexFromString = (str, enc) => {
  //TODO enc & caractere spéciaux (\n,...)
  let hexString = "";

  for (let c of str) {
    hexString += hexify(c.charCodeAt(), 1);
  }

  return hexString;
}

const assemble = (mnemonic, operand) => {
  const assembled = {
    code: '',
    reference: '',
    shortJump: null,
    length: null,
    error: ''
  };

  if (typeof arch[mnemonic] === 'undefined') {
    assembled.error = '"' + mnemonic + '" is not a valid mnemonic';
    return assembled;
  }

  if (operand === "" && arch[mnemonic].operand !== "") {
    assembled.error = '"' + mnemonic + '" is expecting an operand of type '
      + expandOperandType(arch[mnemonic].operand);
    return assembled;
  }

  assembled.code = arch[mnemonic].opcode;

  switch (arch[mnemonic].operand) {
    case '':
      if (operand !== "") {
        assembled.error = '"' + mnemonic + '" does not take an operand';
        return assembled;
      }
      assembled.length = 1;
      break;     
    case 'b':
      const immediate = Number(operand);
      if (isNaN(immediate) || immediate < 0 || immediate > 255) {
        assembled.error = "Operand must be a number in the range 0-255";
        return assembled;
      }
      assembled.code += hexify(immediate, 1);
      assembled.length = 2;
      break;
    case 'r':
      const register = Number(operand);
      if (isNaN(register) || register < 0 || register > 15) {
        assembled.error = "Operand must be a number in the range 0-15";
        return assembled;
      }
      assembled.code += register.toString(16);
      assembled.length = 1;
      break;
    case 'p':
      let port = Number(operand);
      if (isNaN(port) || port < 1 || port > 7) {
        assembled.error = "Operand must be a number in the range 1-7";
        return assembled;
      }
      if (mnemonic === "inp") {
        port += 8;
      }
      assembled.code += port.toString(16);
      assembled.length = 1;
      break;
    case 'a':
    case 'aa':
      assembled.shortJump = arch[mnemonic].operand === 'a';
      if (operand[0] === '#') {
        const directAddress = Number(operand.slice(1));
        if (isNaN(directAddress) || directAddress < 0 || directAddress > 65535) {
          assembled.error =
            'Invalid direct address value, must be a number in range 0-65535';
          return assembled;
        }
        assembled.code += hexify(directAddress, assembled.shortJump ? 1 : 2);
      } else {
        assembled.reference = operand;
      }
      assembled.length = assembled.shortJump ? 2 : 3;
  }

  return assembled;
}

const updateAddresses = (lines, modifiedIndex) => {
  const line = lines[modifiedIndex];

  // New address for the modified line
  if (modifiedIndex > 0) {
    line.memoryAddress = lines[modifiedIndex - 1].memoryAddress;
    line.memoryAddress += lines[modifiedIndex - 1].length;
  } else {
    line.memoryAddress = 0;
  }

  // Update addresses of the subsequent lines
  for (let i = modifiedIndex + 1 ; i < lines.length ; i++) {
    lines[i].memoryAddress = lines[i - 1].memoryAddress + lines[i - 1].length;
  }

  // Update reference for the modified line
  if (line.reference !== '' && line.reference !== '*') {
    let found = false;
    for (let l of lines) {
      if (l.label === line.reference) {
        line.referenceAddress = hexify(l.memoryAddress, line.shortReference ? 1 : 2);
        found = true;
        break;
      }
    }
    if (!found) {
      line.error = 'Label "' + line.reference + '" not found';
    }
  } else if (line.reference === '*') {
    line.referenceAddress = hexify(line.memoryAddress, line.shortReference ? 1 : 2);
  }
  
  // Update references of the subsequent lines
  for (let i = modifiedIndex + 1 ; i < lines.length ; i++) {
    if (lines[i].label !== '') {
      for (l of lines) {
        if (l.reference === lines[i].label) {
          l.referenceAddress = hexify(lines[i].memoryAddress, l.shortReference ? 1 : 2);
        }
      }
    }
  }
}


angular.module('elfide', [])

.directive('elfideFocus', ['$timeout', function($timeout) {
  return {
    link: (scope, element, attrs) => {      
      scope.$watch(attrs.elfideFocus, value => {        
        if (value) {
          $timeout(() => element[0].focus());
        }
      });
    }
  }
}])

.filter('hexify', () => {
  return (input, size) => {
    return hexify(input, size);
  }
})

.controller('EditorCtrl', ['$scope', '$timeout', function($scope, $timeout) {
  $scope.focusedLine = 0;
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
    'memoryAddress': 0,
    'memoryValue': '',
    'sourceCode': '',
    'length': 0,
    'error': '',
    'label': '',
    'reference': '',
    'referenceAddress': '',
    'shortReference': null
  };

  $scope.processLine = (lines, line) => {
    line.memoryValue = '';
    line.length = 0;
    line.error = '';
    line.label = '';
    line.reference = '';
    line.referenceAddress = '';
    line.shortReference = null;
    
    const lineStructure = parseLineSource(line.sourceCode);

    if (lineStructure.error !== "") {
      line.error = lineStructure.error;
      return;
    }

    if (lineStructure.label[0] === "*" || lineStructure.label[0] === '#') {
      line.error = 'A label declaration cannot start with "#" or "*"';
      return;
    }
    if (lineStructure.label !== '') {
      for (l of lines) {
        if (l.label === lineStructure.label) {
          line.error = 'A label with the same name is already defined at line '
            + (lines.indexOf(l) + 1);
          return;
        }
      }
    }
    
    line.label = lineStructure.label;

    switch (lineStructure.type) {
      case "string":
        line.memoryValue = hexFromString(lineStructure.value);
        line.length = line.memoryValue.length / 2;
        break;
      case "directValue":
        let immediate = Number(lineStructure.value);
        if (isNaN(immediate)) {
           line.error = "Invalid directValue: not a number";
           return;
        }
        line.memoryValue = immediate.toString(16);
        if (line.memoryValue.length % 2) {
          line.memoryValue = "0" + line.memoryValue;
        }
        line.length = line.memoryValue.length / 2;
        break;
      case "operation":
        const assembled = assemble(lineStructure.value, lineStructure.operand);
        if (assembled.error !== '') {
          line.error = assembled.error;
          return;
        }
        line.memoryValue = assembled.code;
        line.reference = assembled.reference;
        line.length = assembled.length;
        line.shortReference = assembled.shortJump;
    }

    line.memoryValue = line.memoryValue.toUpperCase();
    updateAddresses(lines, lines.indexOf(line));
  }

  $scope.lines = [];
  insertLine($scope.lines, blankLine, -1);

  $scope.changed = (event, line, lineNumber) => {
    switch (event.key) {
      case 'Enter':
        $scope.lines.splice(lineNumber + 1, 0, {
          'memoryAddress': line.memoryAddress,
          'memoryValue': "",
          'length': 0,
          'sourceCode': "",
          'error': "",
          'label': "",
          'reference': "",
          'referenceAddress': '',
          'shortReference': null
        });
        $scope.focusedLine = Math.min($scope.lines.length, $scope.focusedLine + 1);
        break;
      case 'ArrowUp':
        if (lineNumber > 0) {
          $scope.focusedLine = Math.max(0, $scope.focusedLine - 1);
        }
        break;
      case 'ArrowDown':
        if (lineNumber < $scope.lines.length - 1) {
          $scope.focusedLine = Math.min($scope.lines.length, $scope.focusedLine + 1);
        }
        break;
      case "Backspace":
    }
  };
}]);
