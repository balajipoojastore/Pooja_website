declare module 'sharp' {
  interface Metadata { width?: number; height?: number }
  interface SharpInstance {
    metadata(): Promise<Metadata>;
    webp(options?: { quality?: number }): SharpInstance;
    toBuffer(): Promise<Buffer>;
  }
  export default function sharp(input: string | Buffer, options?: { failOn?: 'none' | 'truncated' | 'error' | 'warning' }): SharpInstance;
}
