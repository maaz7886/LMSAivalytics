/**
 * Video URL Normalization and Embed Utilities
 * Converts various video hosting links (YouTube, Vimeo, Loom, direct video) into embeddable URLs.
 */

export interface VideoEmbedInfo {
  embedUrl: string;
  provider: 'youtube' | 'vimeo' | 'loom' | 'direct' | 'unknown';
  videoId?: string;
  isValid: boolean;
}

/**
 * Extracts YouTube 11-character video ID from any format:
 * - https://youtu.be/<id>?si=...
 * - https://www.youtube.com/watch?v=<id>&t=...
 * - https://www.youtube.com/embed/<id>
 * - https://www.youtube.com/shorts/<id>
 * - https://www.youtube.com/live/<id>
 * - <iframe src="https://www.youtube.com/embed/<id>" ...>
 * - bare 11-char ID
 */
export function extractYouTubeVideoId(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // If full iframe HTML was pasted
  const iframeMatch = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const target = iframeMatch ? iframeMatch[1] : trimmed;

  // Standard YouTube URL regex
  const ytRegex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = target.match(ytRegex);
  if (match && match[1]) {
    return match[1];
  }

  // Check if string is already a raw 11-character YouTube video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(target)) {
    return target;
  }

  return null;
}

/**
 * Extracts starting timestamp in seconds from YouTube link if present.
 */
export function extractYouTubeStartTime(input: string | null | undefined): number | null {
  if (!input || typeof input !== 'string') return null;
  const tMatch = input.match(/[?&](?:t|start)=([0-9hms]+)/i);
  if (!tMatch) return null;
  const raw = tMatch[1];
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);

  let totalSec = 0;
  const hours = raw.match(/(\d+)h/i);
  const mins = raw.match(/(\d+)m/i);
  const secs = raw.match(/(\d+)s/i);
  if (hours) totalSec += parseInt(hours[1], 10) * 3600;
  if (mins) totalSec += parseInt(mins[1], 10) * 60;
  if (secs) totalSec += parseInt(secs[1], 10);
  return totalSec > 0 ? totalSec : null;
}

/**
 * Checks if a given URL is a YouTube URL.
 */
export function isYouTubeUrl(input: string | null | undefined): boolean {
  return extractYouTubeVideoId(input) !== null;
}

/**
 * Converts any YouTube URL to an embeddable YouTube URL:
 * https://www.youtube.com/embed/<videoId>
 */
export function toYouTubeEmbedUrl(
  input: string | null | undefined,
  options?: { autoplay?: boolean }
): string | null {
  const videoId = extractYouTubeVideoId(input);
  if (!videoId) return null;

  const startTime = extractYouTubeStartTime(input);
  const params = new URLSearchParams();
  if (startTime) params.set('start', startTime.toString());
  if (options?.autoplay) params.set('autoplay', '1');

  const query = params.toString();
  return `https://www.youtube.com/embed/${videoId}${query ? `?${query}` : ''}`;
}

/**
 * Analyzes any video URL and generates an embeddable URL.
 */
export function getVideoEmbedInfo(url: string | null | undefined): VideoEmbedInfo {
  if (!url || typeof url !== 'string') {
    return { embedUrl: '', provider: 'unknown', isValid: false };
  }

  const trimmed = url.trim();

  // 1. YouTube
  const ytId = extractYouTubeVideoId(trimmed);
  if (ytId) {
    const embedUrl = toYouTubeEmbedUrl(trimmed) || `https://www.youtube.com/embed/${ytId}`;
    return {
      embedUrl,
      provider: 'youtube',
      videoId: ytId,
      isValid: true,
    };
  }

  // 2. Vimeo
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      provider: 'vimeo',
      videoId: vimeoMatch[1],
      isValid: true,
    };
  }

  // 3. Loom
  const loomMatch = trimmed.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i);
  if (loomMatch && loomMatch[1]) {
    return {
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`,
      provider: 'loom',
      videoId: loomMatch[1],
      isValid: true,
    };
  }

  // 4. Direct video files (.mp4, .webm, .ogg)
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(trimmed)) {
    return {
      embedUrl: trimmed,
      provider: 'direct',
      isValid: true,
    };
  }

  // 5. If it's already an embed URL (e.g. custom iframe embed)
  if (trimmed.includes('/embed/') || trimmed.includes('player.')) {
    return {
      embedUrl: trimmed,
      provider: 'direct',
      isValid: true,
    };
  }

  // Unknown / placeholder
  return {
    embedUrl: trimmed,
    provider: 'unknown',
    isValid: false,
  };
}

