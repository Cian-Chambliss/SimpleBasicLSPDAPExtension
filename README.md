# BASIC Language Extension

A Visual Studio Code extension that provides support for the BASIC programming language, including syntax highlighting, code completion, and debugging capabilities through the Language Server Protocol (LSP).

## Features

- **Syntax Highlighting**: Enjoy color-coded BASIC syntax for better readability.
- **Code Completion**: Get suggestions for keywords, functions, and variables as you type.
- **Hover Information**: View context-sensitive help for BASIC syntax elements.
- **Error Diagnostics**: Real-time error checking to help you catch mistakes early.
- **Debugging Support**: Integrated debugging experience with breakpoints and variable inspection.

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/basic-language-extension.git
   cd basic-language-extension
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Compile the TypeScript code:
   ```
   npm run compile
   ```

4. Open the project in Visual Studio Code:
   ```
   code .
   ```

5. Press `F5` to launch the extension in a new VS Code window.

## Usage

1. **Open a BASIC file**: Create or open a file with a `.bas` or `.basic` extension.
2. **Start coding**: Write your BASIC code and enjoy syntax highlighting and code completion.
3. **Debug your program**: Set breakpoints and use the debug toolbar to step through your code.

## Example BASIC Code

```basic
10 PRINT "Hello, World!"
20 LET X = 10
30 FOR I = 1 TO X
40   PRINT "Count: "; I
50 NEXT I
60 INPUT "Press Enter to continue", A
70 PRINT "Goodbye!"
80 END
```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments

- Inspired by classic BASIC interpreters and modern development practices.
- Built using TypeScript and the Language Server Protocol for a seamless coding experience.