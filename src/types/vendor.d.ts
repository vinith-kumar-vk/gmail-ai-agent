// Type declarations for packages that lack TypeScript definitions
declare module 'quoted-printable' {
  export function encode(str: string): string;
  export function decode(str: string): string;
}

declare module 'utf8' {
  export function encode(str: string): string;
  export function decode(str: string): string;
}
