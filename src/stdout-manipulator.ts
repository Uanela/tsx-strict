import sheu from "./sheu";

const ANSI_REGEX = new RegExp(
  "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))",
  "g"
);
const stripAnsi = (str: string) => str.replace(ANSI_REGEX, "");

const tscUsageSyntaxRegex = / -w, --watch.*Watch input files\./;
const typescriptPrettyErrorRegex = /:\d+:\d+ \- error TS\d+: /;
const typescriptErrorRegex = /\(\d+,\d+\): error TS\d+: /;
const typescriptEmittedFileRegex = /(TSFILE:)\s*(.*)/;

// errors
const compilationCompleteWithErrorRegex =
  / Found [^0][0-9]* error[s]?\. Watching for file changes\./;
const nativeCompilationCompleteWithErrorRegex = /Found [^0]?\d* error[s]? in /;

// no errors
const compilationCompleteWithoutErrorRegex =
  / Found 0 errors\. Watching for file changes\./;

// compilation started
const compilationStartedRegex =
  /( Starting compilation in watch mode\.\.\.| File change detected\. Starting incremental compilation\.\.\.)/;

const nativeCompilationStartedRegex = /build starting at /;

// compilation complete
const compilationCompleteRegex =
  /( Compilation complete\. Watching for file changes\.| Found \d+ error[s]?\. Watching for file changes\.)/;

const nativeCompilationCompleteRegex = /build finished in /;

function color(line: string): string {
  // coloring errors:
  line = line.replace(typescriptErrorRegex, (m) => `\u001B[36m${m}\u001B[39m`); // Cyan
  line = line.replace(
    typescriptPrettyErrorRegex,
    (m) => `\u001B[36m${m}\u001B[39m`
  ); // Cyan

  // completed with error:
  line = line.replace(
    compilationCompleteWithErrorRegex,
    (m) => `\u001B[31m${m}\u001B[39m`
  ); // Red
  line = line.replace(
    nativeCompilationCompleteWithErrorRegex,
    (m) => `\u001B[31m${m}\u001B[39m`
  ); // Red

  // completed without error:
  line = line.replace(
    compilationCompleteWithoutErrorRegex,
    (m) => `\u001B[32m${m}\u001B[39m`
  ); // Green

  // usage
  line = line.replace(tscUsageSyntaxRegex, (m) => `\u001B[33m${m}\u001B[39m`); // Yellow

  return line;
}

type TPrintParams = {
  noColors?: boolean;
  clear?: boolean;
  requestedToListEmittedFiles?: boolean;
  signalEmittedFiles?: boolean;
};

let tsErrorMessagePrinted = false;
let prevLine = "";

export function print(
  line: string,
  {
    noColors = false,
    requestedToListEmittedFiles = false,
    signalEmittedFiles = false,
  }: TPrintParams = {}
): void {
  if (
    (signalEmittedFiles &&
      !requestedToListEmittedFiles &&
      line.startsWith("TSFILE:")) ||
    (!line &&
      (prevLine.includes("Starting") || prevLine.includes("Found 0 Errors")))
  ) {
    return;
  }

  if (line.includes("Starting") || line.includes("Found 0 errors")) {
    tsErrorMessagePrinted = false;
    prevLine = line;
    return;
  }

  if (line.includes(": error TS") && !tsErrorMessagePrinted) {
    console.error(`[${sheu.red("Error")}] Unable to compile TypeScript:`);
    tsErrorMessagePrinted = true;
  }

  // Beautify TypeScript errors
  if (line.includes(": error TS")) {
    const errorPattern = /^(.+?)\((\d+),(\d+)\):\s*(error)\s+(TS\d+):\s*(.+)$/;
    const match = line.match(errorPattern);

    if (match) {
      const [, filepath, lineNum, colNum, errorText, tsCode, message] = match;
      line =
        "\n- " +
        sheu.cyan(filepath) +
        sheu.cyan("(") +
        sheu.yellow(lineNum) +
        sheu.cyan(",") +
        sheu.yellow(colNum) +
        sheu.cyan("):") +
        " " +
        sheu.red(errorText) +
        " " +
        sheu.gray(tsCode) +
        sheu.gray(":") +
        " " +
        message;
    }
  }

  if (line.includes("Found ") || line.includes("Watching for file changes."))
    line = sheu.red(line.split(" - ")[1]);

  if (line.replaceAll(" ", "")) prevLine = line;
  console.info(!noColors ? line : color(line));
}

export function deleteClear(line: string): string {
  // '\x1bc11:40:16 - Starting compilation in watch mode...'
  // '\x1b[2J\x1b[3J\x1b[H11:33:28 - Starting compilation in watch mode...'
  const result = line
    .replace(/^\x1b\[2J/, "")
    .replace(/^\x1b\[3J/, "")
    .replace(/^\x1b\[H/, "")
    .replace(/^\x1bc/, "");
  return result;
}

export function detectState(line: string) {
  const clearLine = stripAnsi(line);
  const compilationStarted = compilationStartedRegex.test(clearLine);

  const compilationError = line.includes("): error TS");
  const compilationCompleteWithoutError = line.includes("Found 0 errors");

  const compilationComplete =
    compilationCompleteRegex.test(clearLine) ||
    nativeCompilationCompleteRegex.test(clearLine);
  const fileEmittedExec = typescriptEmittedFileRegex.exec(clearLine);
  const fileEmitted = fileEmittedExec !== null ? fileEmittedExec[2] : null; // if the regex is not null it will return an array with 3 elements

  return {
    compilationStarted,
    compilationError,
    compilationComplete,
    fileEmitted,
    compilationCompleteWithoutError,
  };
}
