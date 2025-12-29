declare module '*.svg' {
  import * as React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module 'jpeg-js' {
  export function decode(
    data: any,
    options?: { useTArray?: boolean },
  ): { width: number; height: number; data: Uint8Array };
}
