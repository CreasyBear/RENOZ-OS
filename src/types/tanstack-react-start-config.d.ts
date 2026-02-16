declare module '@tanstack/react-start/config' {
  export function defineConfig(config: Record<string, unknown>): Record<string, unknown>;
}

declare module '*.ttf' {
  const src: string;
  export default src;
}

declare module '*.md?raw' {
  const content: string;
  export default content;
}
