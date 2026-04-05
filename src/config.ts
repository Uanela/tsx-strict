import { ProgramOptions } from ".";

export type WatchOptions = {
  include?: string[];
  ignore?: (string | RegExp | ((path: string) => boolean))[];
  extensions?: string[];
};

export type TsxStrictConfig = ProgramOptions & {
  watch?: boolean | WatchOptions;
};

export function defineConfig(config: TsxStrictConfig): TsxStrictConfig {
  return config;
}
