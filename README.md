# Elfide


Elfide is an easy-to-use IDE for 1802-based computers (like the COSMAC
Elf). This is a very early version so bugs and strange behavior are to
be expected. Currently, only the editor/assembler part is implemented,
but more will come.

## Installing

```
git clone https://github.com/Scorbut29/elfide.git
cd elfide
npm install
npm start
```

## Usage

Just type some stuff in the _Source_ column and Elfide will
automatically translate your input into code, or display an error. A
line can contain three types of data : a direct value, a string or an
operation. Any line can additionally contain a label and a comment.

### Direct value
If you want to put a value directly into memory, just write a number
prefixed by `#`. Use `0x` for hexadecimal (e.g. `#0x9f`).

### String
Just enclose your string with `"` (e.g. `"your string"`).

### Operation
Anything that is not a direct value or a string is interpreted as
being assembly code. For operation requiring an address operand, you
can either type a label name or `*` for referring to the same address
as the operation.

### Label
Any word followed by `:` is a label. A label name cannot start with
`*` (see above).

### Comment
Anything following `..` until the end of the line is a comment.
