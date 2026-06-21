import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useGlobalSettings } from '../../../hooks/useMarketing';
import ImageCropperModal from '../../ui/ImageCropperModal';
import { uploadImage } from '../../../utils/imageUpload';
import { getTimeLeft, computeExpiresAt, computeCustomExpiresAt, DURATION_PRESETS } from '../../../utils/expiry';

interface HeroBannersTabProps {
  setToast: (msg: string) => void;
}

const HeroBannersTab: React.FC<HeroBannersTabProps> = ({ setToast }) => {
  const { setting: heroBanners, updateSetting } = useGlobalSettings('hero_banners');
  const [slides, setSlides] = useState<any[]>([]);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [currentSlideId, setCurrentSlideId] = useState<number | null>(null);
  const [upImg, setUpImg] = useState<string | ArrayBuffer | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customDays, setCustomDays] = useState<Record<number, string>>({});
  const [customHours, setCustomHours] = useState<Record<number, string>>({});
  const [, forceUpdate] = useState(0);

  // Tick every minute to update "time left" badges
  useEffect(() => {
    const timer = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (heroBanners && Array.isArray(heroBanners.slides)) {
      setSlides(heroBanners.slides);
    } else {
      setSlides([]);
    }
  }, [heroBanners]);

  const handleSave = async () => {
    try {
      setSaving(true);
      // Upload any blob/base64 images to Supabase Storage first
      const uploadedSlides = await Promise.all(
        slides.map(async (slide: any) => {
          if (slide.image && (slide.image.startsWith('blob:') || slide.image.startsWith('data:image'))) {
            const url = await uploadImage(slide.image, 'store-assets', `hero_${slide.id}_${Date.now()}.jpg`);
            return { ...slide, image: url };
          }
          return slide;
        })
      );
      await updateSetting({ slides: uploadedSlides });
      setSlides(uploadedSlides);
      setToast('Hero Banners saved successfully!');
    } catch (err) {
      setToast('Failed to save Hero Banners');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlide = () => {
    setSlides([...slides, { id: Date.now(), title: 'New Slide', subtitle: 'Slide subtitle', image: '', buttonText: '', buttonLink: '', expiresAt: null }]);
  };

  const handleRemoveSlide = (id: number) => {
    setSlides(slides.filter(s => s.id !== id));
  };

  const handleUpdateSlide = (id: number, field: string, value: string) => {
    setSlides(slides.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSetExpiry = (id: number, durationMs: number) => {
    const expiresAt = computeExpiresAt(durationMs);
    setSlides(slides.map(s => s.id === id ? { ...s, expiresAt } : s));
  };

  const handleSetCustomExpiry = (id: number) => {
    const days = parseFloat(customDays[id] || '0') || 0;
    const hours = parseFloat(customHours[id] || '0') || 0;
    if (days === 0 && hours === 0) {
      setToast('Enter days or hours for custom expiry');
      return;
    }
    const expiresAt = computeCustomExpiresAt(days, hours);
    setSlides(slides.map(s => s.id === id ? { ...s, expiresAt } : s));
    setToast(`Expiry set: ${days}d ${hours}h from now`);
  };

  const handleImageUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setUpImg(reader.result);
        setCurrentSlideId(id);
        setCropModalOpen(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
    e.target.value = ''; // Reset input
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Hero Banners</h2>
          <p className="text-sm text-gray-500 font-medium">Manage the homepage hero slider images and text.</p>
        </div>
        <button onClick={handleAddSlide} className="px-4 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors">
          + Add Slide
        </button>
      </div>

      <div className="space-y-4">
        {slides.map((slide, index) => {
          const timeLeft = getTimeLeft(slide.expiresAt);
          return (
            <div key={slide.id} className={`bg-white p-6 rounded-2xl border shadow-sm relative ${timeLeft === 'Expired' ? 'border-red-200 opacity-60' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Slide {index + 1}</span>
                  {timeLeft && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${timeLeft === 'Expired' ? 'bg-red-100 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                      ⏳ {timeLeft}
                    </span>
                  )}
                </div>
                <button onClick={() => handleRemoveSlide(slide.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                  <i className="fas fa-trash"></i>
                </button>
              </div>

              <div className="flex gap-6">
                <div className="w-1/3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Hero Image</label>
                  
                  {slide.image ? (
                    <div className="rounded-xl overflow-hidden h-32 relative group bg-gray-100">
                      <img src={slide.image} referrerPolicy="no-referrer" alt="preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button 
                          onClick={() => { setCurrentSlideId(slide.id); fileInputRef.current?.click(); }}
                          className="p-2 bg-white rounded-lg text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                          <i className="fas fa-upload"></i>
                        </button>
                        <button 
                          onClick={() => handleUpdateSlide(slide.id, 'image', '')}
                          className="p-2 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => { setCurrentSlideId(slide.id); fileInputRef.current?.click(); }}
                      className="h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-50/50 transition-all"
                    >
                      <i className="fas fa-cloud-upload-alt text-2xl text-gray-400 mb-2"></i>
                      <span className="text-xs font-bold text-gray-500">Upload Image</span>
                    </div>
                  )}
                </div>
                <div className="w-2/3 space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Badge Text (Glassmorphic)</label>
                    <input
                      type="text"
                      value={slide.badge !== undefined ? slide.badge : 'New Season Arrival'}
                      onChange={(e) => handleUpdateSlide(slide.id, 'badge', e.target.value)}
                      className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-black text-xs uppercase tracking-widest border-none"
                      placeholder="Leave empty to hide badge"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Bold Title</label>
                    <input
                      type="text"
                      value={slide.title}
                      onChange={(e) => handleUpdateSlide(slide.id, 'title', e.target.value)}
                      className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-black text-lg border-none"
                      placeholder="Premium Collection"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Subtitle (Small)</label>
                    <input
                      type="text"
                      value={slide.subtitle}
                      onChange={(e) => handleUpdateSlide(slide.id, 'subtitle', e.target.value)}
                      className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-medium text-sm border-none"
                      placeholder="Elevate your lifestyle"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Button Text</label>
                      <input
                        type="text"
                        value={slide.buttonText || ''}
                        onChange={(e) => handleUpdateSlide(slide.id, 'buttonText', e.target.value)}
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-bold text-sm border-none"
                        placeholder="Explore Shop"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Button Link</label>
                      <input
                        type="text"
                        value={slide.buttonLink || ''}
                        onChange={(e) => handleUpdateSlide(slide.id, 'buttonLink', e.target.value)}
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-bold text-sm border-none"
                        placeholder="/products"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Expiry Duration Picker */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Auto-Expiry</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {DURATION_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => handleSetExpiry(slide.id, preset.ms)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        (preset.ms === 0 && !slide.expiresAt)
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {preset.label === '∞' ? '♾️ No Limit' : preset.label}
                    </button>
                  ))}
                  <span className="text-gray-300 mx-1">|</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Days"
                    value={customDays[slide.id] || ''}
                    onChange={e => setCustomDays({ ...customDays, [slide.id]: e.target.value })}
                    className="w-16 bg-gray-50 rounded-lg px-2 py-1.5 text-xs font-bold text-center border border-gray-200 outline-none focus:border-brand-400"
                  />
                  <span className="text-xs text-gray-400 font-bold">d</span>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    placeholder="Hrs"
                    value={customHours[slide.id] || ''}
                    onChange={e => setCustomHours({ ...customHours, [slide.id]: e.target.value })}
                    className="w-16 bg-gray-50 rounded-lg px-2 py-1.5 text-xs font-bold text-center border border-gray-200 outline-none focus:border-brand-400"
                  />
                  <span className="text-xs text-gray-400 font-bold">h</span>
                  <button
                    onClick={() => handleSetCustomExpiry(slide.id)}
                    className="px-3 py-1.5 bg-brand-100 text-brand-700 rounded-lg text-xs font-bold hover:bg-brand-200 transition-colors"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={handleSave} disabled={saving} className="px-8 py-4 bg-brand-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? '⏳ Uploading & Saving...' : 'Save Banners'}
        </button>
      </div>

      {/* Hidden file input */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={(e) => currentSlideId && handleImageUpload(currentSlideId, e)} 
      />

      {/* Cropper Modal */}
      <ImageCropperModal
        isOpen={cropModalOpen}
        imageSrc={upImg}
        aspect={1920 / 600} // Hero banner typical aspect
        title="Crop Hero Banner"
        onCancel={() => { setCropModalOpen(false); setUpImg(null); }}
        onCropComplete={(blobUrl) => {
          if (currentSlideId) {
            handleUpdateSlide(currentSlideId, 'image', blobUrl);
          }
          setCropModalOpen(false);
          setUpImg(null);
        }}
      />
    </div>
  );
};

export default HeroBannersTab;
