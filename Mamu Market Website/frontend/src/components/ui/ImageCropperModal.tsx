import React, { useRef, useState } from 'react';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | ArrayBuffer | null;
  onCropComplete: (blobUrl: string) => void;
  onCancel: () => void;
  aspect?: number; // Optional aspect ratio (e.g., 16/9)
  title?: string;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  onCropComplete,
  onCancel,
  aspect,
  title = 'Crop Image'
}) => {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5
  });
  
  const imgRef = useRef<HTMLImageElement>(null);

  if (!isOpen || !imageSrc) return null;

  const handleApplyCrop = () => {
    if (!imgRef.current || !crop.width || !crop.height) {
      onCancel();
      return;
    }
    
    const canvas = document.createElement('canvas');
    const image = imgRef.current;
    
    // Calculate scale between intrinsic size and rendered size
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCropX = (crop.unit === '%' ? (crop.x / 100) * image.width : crop.x) * scaleX;
    const pixelCropY = (crop.unit === '%' ? (crop.y / 100) * image.height : crop.y) * scaleY;
    const pixelCropW = (crop.unit === '%' ? (crop.width / 100) * image.width : crop.width) * scaleX;
    const pixelCropH = (crop.unit === '%' ? (crop.height / 100) * image.height : crop.height) * scaleY;

    canvas.width = pixelCropW;
    canvas.height = pixelCropH;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      pixelCropX,
      pixelCropY,
      pixelCropW,
      pixelCropH,
      0,
      0,
      pixelCropW,
      pixelCropH
    );

    // Convert to Blob instead of base64
    canvas.toBlob((blob) => {
      if (!blob) {
        onCancel();
        return;
      }
      const blobUrl = URL.createObjectURL(blob);
      onCropComplete(blobUrl);
    }, 'image/webp', 0.95);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4" onClick={onCancel}>
      <div 
        className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h3>
          <button 
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="w-full flex-1 overflow-auto flex items-center justify-center bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            aspect={aspect}
            className="max-w-full"
          >
            <img
              ref={imgRef}
              src={imageSrc as string}
              className="max-w-full max-h-[50vh] object-contain rounded-xl shadow-sm"
              alt="Crop preview"
            />
          </ReactCrop>
        </div>
        
        <div className="flex gap-4 mt-6 shrink-0">
          <button 
            onClick={onCancel} 
            className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleApplyCrop} 
            className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20"
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
