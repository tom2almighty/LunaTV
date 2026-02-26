import { serwist } from '@serwist/next/config';

export default await serwist({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  // 排除流媒体分片，避免被加入预缓存清单
  globIgnores: ['**/*.{m3u8,ts,m4s,mpd}'],
});
