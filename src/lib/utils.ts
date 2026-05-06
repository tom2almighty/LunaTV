import { getAuthToken } from './auth-token';

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

// Source descriptions sometimes contain <p>, <br>, or HTML entities used
// as field separators. Convert those to newlines and strip remaining tags.
// Render the result with `whitespace-pre-line` to preserve paragraphs.
export function stripDescriptionHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/<\s*\/p\s*>/gi, '\n\n')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
