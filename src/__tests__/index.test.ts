import { runTsxStrict, setTsxKiller, getTsxKiller } from "../index";
import spawn from "cross-spawn";
import { run } from "../runner";
import { detectState, print } from "../stdout-manipulator";
import { killProcesses } from "../killer";
import { getCompilerPath } from "../compiler-provider";
import { EventEmitter } from "events";
import { createInterface } from "readline";
import nodeCleanup from "node-cleanup";

jest.mock("cross-spawn");
jest.mock("../runner");
jest.mock("../stdout-manipulator");
jest.mock("../killer");
jest.mock("../compiler-provider");
jest.mock("readline");
jest.mock("node-cleanup");

describe("runTsxStrict", () => {
  let mockTscProcess: any;
  let mockStdout: EventEmitter;
  let mockStderr: any;
  let mockReadlineInterface: any;
  let cleanupCallback: any;
  let originalProcessOn: any;

  beforeEach(() => {
    jest.clearAllMocks();

    originalProcessOn = process.on;
    process.on = jest.fn() as any;

    mockStdout = new EventEmitter();
    mockStderr = {
      pipe: jest.fn(),
    };

    mockReadlineInterface = new EventEmitter();
    (createInterface as jest.Mock).mockReturnValue(mockReadlineInterface);

    mockTscProcess = {
      stdout: mockStdout,
      stderr: mockStderr,
      on: jest.fn(),
      kill: jest.fn(),
    };

    (spawn as any as jest.Mock).mockReturnValue(mockTscProcess);
    (run as jest.Mock).mockReturnValue(jest.fn().mockResolvedValue(undefined));
    (getCompilerPath as jest.Mock).mockReturnValue("tsc");
    (killProcesses as jest.Mock).mockResolvedValue(1);
    (detectState as jest.Mock).mockReturnValue({
      compilationStarted: false,
      compilationError: false,
      compilationComplete: false,
      fileEmitted: null,
    });
    (nodeCleanup as any as jest.Mock).mockImplementation((cb) => {
      cleanupCallback = cb;
    });
  });

  afterEach(() => {
    process.on = originalProcessOn;
  });

  it("runs tsx command with default options", () => {
    runTsxStrict("index.ts", {});

    expect(run).toHaveBeenCalledWith("npx tsx index.ts");
  });

  it("runs tsx with watch flag", () => {
    runTsxStrict("index.ts", { watch: true });

    expect(run).toHaveBeenCalledWith("npx tsx --watch index.ts");
  });

  it("runs tsx with watch-preserve-output when clear is false", () => {
    runTsxStrict("index.ts", { clear: false, watch: true });

    expect(run).toHaveBeenCalledWith(
      "npx tsx --watch-preserve-output index.ts"
    );
  });

  it("adds additional tsx args", () => {
    runTsxStrict("index.ts", { tsxArgs: "--inspect" });

    expect(run).toHaveBeenCalledWith("npx tsx index.ts --inspect");
  });

  it("removes duplicate tsx args", () => {
    runTsxStrict("index.ts", { watch: true, tsxArgs: "--watch --inspect" });

    expect(run).toHaveBeenCalledWith("npx tsx --watch index.ts --inspect");
  });

  it("spawns tsc with noEmit flag", () => {
    runTsxStrict("index.ts", {});

    expect(spawn).toHaveBeenCalledWith("node", ["tsc", "--noEmit"]);
  });

  it("spawns tsc with watch flag when watch is true", () => {
    runTsxStrict("index.ts", { watch: true });

    expect(spawn).toHaveBeenCalledWith("node", ["tsc", "--noEmit", "--watch"]);
  });

  it("adds max node memory flag", () => {
    runTsxStrict("index.ts", { maxNodeMem: 4096 });

    expect(spawn).toHaveBeenCalledWith("node", [
      "--max_old_space_size=4096",
      "tsc",
      "--noEmit",
    ]);
  });

  it("adds additional tsc args", () => {
    runTsxStrict("index.ts", { tscArgs: "--strict" });

    expect(spawn).toHaveBeenCalledWith("node", ["tsc", "--noEmit", "--strict"]);
  });

  it("removes duplicate tsc args", () => {
    runTsxStrict("index.ts", { tscArgs: "--noEmit --strict" });

    expect(spawn).toHaveBeenCalledWith("node", ["tsc", "--noEmit", "--strict"]);
  });

  it("uses custom compiler", () => {
    (getCompilerPath as jest.Mock).mockReturnValue("custom-tsc");
    runTsxStrict("index.ts", { compiler: "custom" });

    expect(getCompilerPath).toHaveBeenCalledWith("custom");
    expect(spawn).toHaveBeenCalledWith("node", ["custom-tsc", "--noEmit"]);
  });

  it("skips type check when typeCheck is false", () => {
    runTsxStrict("index.ts", { typeCheck: false });

    expect(run).toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it("throws error when stdout is not available", () => {
    (spawn as any as jest.Mock).mockReturnValue({
      stdout: null,
      stderr: mockStderr,
      on: jest.fn(),
      kill: jest.fn(),
    });

    expect(() => runTsxStrict("index.ts", {})).toThrow(
      "Unable to read Typescript stdout"
    );
  });

  it("throws error when stderr is not available", () => {
    (spawn as any as jest.Mock).mockReturnValue({
      stdout: mockStdout,
      stderr: null,
      on: jest.fn(),
      kill: jest.fn(),
    });

    expect(() => runTsxStrict("index.ts", {})).toThrow(
      "Unable to read Typescript stderr"
    );
  });

  it("pipes stderr to process.stderr", () => {
    runTsxStrict("index.ts", {});

    expect(mockStderr.pipe).toHaveBeenCalledWith(process.stderr);
  });

  it("prints lines from tsc output", () => {
    runTsxStrict("index.ts", {});

    mockReadlineInterface.emit("line", "test output");

    expect(print).toHaveBeenCalledWith("test output", { clear: true });
  });

  it("prints with clear false when specified", () => {
    runTsxStrict("index.ts", { clear: false });

    mockReadlineInterface.emit("line", "test output");

    expect(print).toHaveBeenCalledWith("test output", { clear: false });
  });

  it("kills processes on compilation start", async () => {
    (detectState as jest.Mock).mockReturnValue({
      compilationStarted: true,
      compilationError: false,
      compilationComplete: false,
      fileEmitted: null,
    });

    runTsxStrict("index.ts", {});

    mockReadlineInterface.emit("line", "Starting compilation");

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(killProcesses).toHaveBeenCalledWith(1);
  });

  it("reruns tsx on successful compilation", async () => {
    (detectState as jest.Mock).mockReturnValue({
      compilationStarted: false,
      compilationError: false,
      compilationComplete: true,
      fileEmitted: null,
    });

    runTsxStrict("index.ts", {});

    mockReadlineInterface.emit("line", "Compilation complete");

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(run).toHaveBeenCalledTimes(2);
  });

  it("does not rerun tsx on compilation error", async () => {
    (detectState as jest.Mock)
      .mockReturnValueOnce({
        compilationStarted: false,
        compilationError: true,
        compilationComplete: false,
        fileEmitted: null,
      })
      .mockReturnValueOnce({
        compilationStarted: false,
        compilationError: false,
        compilationComplete: true,
        fileEmitted: null,
      });

    runTsxStrict("index.ts", {});

    mockReadlineInterface.emit("line", "Error line");
    mockReadlineInterface.emit("line", "Compilation complete");

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("sends first_success signal on first successful compilation", async () => {
    const mockSend = jest.fn();
    process.send = mockSend;

    (detectState as jest.Mock).mockReturnValue({
      compilationStarted: false,
      compilationError: false,
      compilationComplete: true,
      fileEmitted: null,
    });

    runTsxStrict("index.ts", {});

    mockReadlineInterface.emit("line", "Compilation complete");

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockSend).toHaveBeenCalledWith("first_success");

    mockReadlineInterface.emit("line", "Compilation complete");

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockSend).toHaveBeenCalledWith("success");
  });

  it("sends compile_errors signal on compilation error", async () => {
    const mockSend = jest.fn();
    process.send = mockSend;

    (detectState as jest.Mock)
      .mockReturnValueOnce({
        compilationStarted: false,
        compilationError: true,
        compilationComplete: false,
        fileEmitted: null,
      })
      .mockReturnValueOnce({
        compilationStarted: false,
        compilationError: false,
        compilationComplete: true,
        fileEmitted: null,
      });

    runTsxStrict("index.ts", {});

    mockReadlineInterface.emit("line", "Error");
    mockReadlineInterface.emit("line", "Complete");

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockSend).toHaveBeenCalledWith("compile_errors");
  });

  it("sends file_emitted signal when file is emitted", async () => {
    const mockSend = jest.fn();
    process.send = mockSend;

    (detectState as jest.Mock).mockReturnValue({
      compilationStarted: false,
      compilationError: false,
      compilationComplete: false,
      fileEmitted: "test.js",
    });

    runTsxStrict("index.ts", {});

    mockReadlineInterface.emit("line", "File emitted");

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockSend).toHaveBeenCalledWith("file_emitted:test.js");
  });

  it("sends started signal on compilation start", async () => {
    const mockSend = jest.fn();
    process.send = mockSend;

    (detectState as jest.Mock).mockReturnValue({
      compilationStarted: true,
      compilationError: false,
      compilationComplete: false,
      fileEmitted: null,
    });

    runTsxStrict("index.ts", {});

    mockReadlineInterface.emit("line", "Starting");

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockSend).toHaveBeenCalledWith("started");
  });

  it("handles run-on-success-command message", async () => {
    const mockKiller = jest.fn().mockResolvedValue(undefined);
    setTsxKiller(mockKiller);

    runTsxStrict("index.ts", {});

    const messageHandler = (process.on as jest.Mock).mock.calls.find(
      (call: any) => call[0] === "message"
    )?.[1];

    expect(messageHandler).toBeDefined();

    if (messageHandler) {
      await messageHandler("run-on-success-command");
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockKiller).toHaveBeenCalled();
      expect(run).toHaveBeenCalledTimes(2);
    }
  });

  it("handles tsc process exit with signal", () => {
    const mockKill = jest.spyOn(process, "kill").mockImplementation();

    runTsxStrict("index.ts", {});

    const exitHandler = mockTscProcess.on.mock.calls.find(
      (call: any) => call[0] === "exit"
    )?.[1];

    if (exitHandler) {
      exitHandler(0, "SIGTERM");
      expect(mockKill).toHaveBeenCalledWith(process.pid, "SIGTERM");
    }

    mockKill.mockRestore();
  });

  it("does not kill process on normal exit", () => {
    const mockKill = jest.spyOn(process, "kill").mockImplementation();

    runTsxStrict("index.ts", {});

    const exitHandler = mockTscProcess.on.mock.calls.find(
      (call: any) => call[0] === "exit"
    )?.[1];

    if (exitHandler) {
      exitHandler(0, null);
      expect(mockKill).not.toHaveBeenCalled();
    }

    mockKill.mockRestore();
  });

  it("cleans up on exit", async () => {
    runTsxStrict("index.ts", {});

    expect(nodeCleanup).toHaveBeenCalled();

    if (cleanupCallback) {
      const mockExit = jest.spyOn(process, "exit").mockImplementation();
      cleanupCallback(0, null);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(killProcesses).toHaveBeenCalledWith(0);
      mockExit.mockRestore();
    }
  });

  it("kills tsc process on cleanup with signal", async () => {
    runTsxStrict("index.ts", {});

    if (cleanupCallback) {
      const mockExit = jest.spyOn(process, "exit").mockImplementation();
      cleanupCallback(0, "SIGTERM");

      expect(mockTscProcess.kill).toHaveBeenCalledWith("SIGTERM");

      await new Promise((resolve) => setTimeout(resolve, 10));
      mockExit.mockRestore();
    }
  });
});

describe("tsxKiller getter/setter", () => {
  it("sets and gets tsx killer function", () => {
    const mockKiller = jest.fn();

    setTsxKiller(mockKiller);

    expect(getTsxKiller()).toBe(mockKiller);
  });

  it("initializes as null", () => {
    setTsxKiller(null);

    expect(getTsxKiller()).toBeNull();
  });
});
