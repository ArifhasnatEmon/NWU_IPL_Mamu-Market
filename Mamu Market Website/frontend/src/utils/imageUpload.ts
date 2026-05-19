import { supabase } from '../lib/supabase';

function generateRandomString(length: number) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
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

  try {
    const res = await fetch(base64);
    const blob = await res.blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    
    const finalFileName = fileName || `${Date.now()}_${generateRandomString(6)}.${ext}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(finalFileName, blob, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return base64; // fallback to base64 if it fails
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  } catch (err) {
    console.error('Failed to convert and upload image:', err);
    return base64; // fallback
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
