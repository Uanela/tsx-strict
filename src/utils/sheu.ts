export default class sheu {
  static red(text: string): string {
    return `\x1b[31m${text}\x1b[0m`;
  }

  static green(text: string): string {
    return `\x1b[32m${text}\x1b[0m`;
  }

  static yellow(text: string): string {
    return `\x1b[33m${text}\x1b[0m`;
  }

  static blue(text: string): string {
    return `\x1b[34m${text}\x1b[0m`;
  }

  static magenta(text: string): string {
    return `\x1b[35m${text}\x1b[0m`;
  }

  static cyan(text: string): string {
    return `\x1b[36m${text}\x1b[0m`;
  }
}
