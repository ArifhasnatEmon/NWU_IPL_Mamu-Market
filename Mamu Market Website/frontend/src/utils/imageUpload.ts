import { supabase } from '../lib/supabase';

function generateRandomString(length: number) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/** Rejects after `ms` milliseconds with a clear timeout error. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Upload timed out after ${ms / 1000}s (${label}). Check your connection and try again.`)),
        ms
      )
    ),
  ]);
}

export async function uploadImage(
  base64: string,
  bucket: 'product-images' | 'store-assets' | 'avatars',
  fileName?: string
): Promise<string> {
  if (!base64 || (!base64.startsWith('data:image') && !base64.startsWith('blob:'))) {
    // Already a URL or empty
    return base64;
  }

  const UPLOAD_TIMEOUT_MS = 15_000; // 15 seconds per image

  try {
    const res = await fetch(base64);
    const blob = await res.blob();
    const ext = blob.type.split('/')[1] || 'jpg';

    const finalFileName = fileName || `${Date.now()}_${generateRandomString(6)}.${ext}`;

    const { data, error } = await withTimeout(
      supabase.storage
        .from(bucket)
        .upload(finalFileName, blob, {
          cacheControl: '3600',
          upsert: false,
        }),
      UPLOAD_TIMEOUT_MS,
      finalFileName
    );

    if (error) {
      console.error('Storage upload error:', error);
      return base64; // fallback to base64 if Supabase rejects it
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  } catch (err) {
    // Re-throw timeout errors so handleSubmit can toast them to the user.
    // For other errors, fall back to base64 silently.
    const msg = (err as Error).message || '';
    if (msg.includes('timed out')) throw err;
    console.error('Failed to convert and upload image:', err);
    return base64;
  }
}

export async function uploadImages(
  images: string[],
  bucket: 'product-images' | 'store-assets' | 'avatars'
): Promise<string[]> {
  const urls = await Promise.all(
    images.filter(Boolean).map(img => uploadImage(img, bucket))
  );
  return urls;
}

