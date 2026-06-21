export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_DOC_SIZE_MB = 2;
export const MAX_IMAGE_DIMENSION = 1280;
export const COMPRESSION_QUALITY = 0.7; // 70% JPEG quality

/**
 * Validates file size based on its type.
 */
export function validateFileSize(file: File): { valid: boolean; error?: string } {
  const sizeInMB = file.size / (1024 * 1024);
  const isImage = file.type.startsWith('image/');
  
  if (isImage && sizeInMB > MAX_IMAGE_SIZE_MB) {
    return { valid: false, error: `Image must be less than ${MAX_IMAGE_SIZE_MB}MB.` };
  }
  
  if (!isImage && sizeInMB > MAX_DOC_SIZE_MB) {
    return { valid: false, error: `Document must be less than ${MAX_DOC_SIZE_MB}MB.` };
  }
  
  return { valid: true };
}

/**
 * Compresses an image file using an HTML5 Canvas and returns a base64 string.
 * Documents (PDF, etc) or unrecognized files are just returned as raw base64.
 */
export function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // If not an image, just read it as base64 without compression
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    // For images, compress via canvas
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let width = img.width;
      let height = img.height;

      // Scale down if dimensions exceed maximum
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
          height = MAX_IMAGE_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      // Draw and compress to JPEG
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', COMPRESSION_QUALITY);
      resolve(dataUrl);
    };

    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = url;
  });
}
