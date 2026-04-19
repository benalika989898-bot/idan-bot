import * as VideoThumbnails from 'expo-video-thumbnails';

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv'];

const thumbnailCache = new Map<string, string>();

export function isStoryVideoUrl(url: string): boolean {
  const cleanUrl = url.split('?')[0]?.split('#')[0] ?? url;
  const extension = cleanUrl.split('.').pop()?.toLowerCase();

  return extension ? VIDEO_EXTENSIONS.includes(extension) : false;
}

/**
 * Generates a local thumbnail image from a remote video URL.
 * Results are cached in memory so the video is only downloaded once per session.
 */
export async function generateVideoThumbnail(videoUrl: string): Promise<string | null> {
  const cached = thumbnailCache.get(videoUrl);
  if (cached) return cached;

  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUrl, {
      time: 0,
    });
    thumbnailCache.set(videoUrl, uri);
    return uri;
  } catch {
    return null;
  }
}
