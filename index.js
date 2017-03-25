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
