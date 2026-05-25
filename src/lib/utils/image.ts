import { getAuthToken } from '@/lib/auth/token';

export function processImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;
  // Douban images are referer-locked. Always serve them through the
  // server-side image proxy which sets the correct referer.
  if (originalUrl.includes('doubanio.com') || originalUrl.includes('douban.com')) {
    const token = getAuthToken();
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    return `/api/image?url=${encodeURIComponent(originalUrl)}${tokenParam}`;
  }
  return originalUrl;
}
