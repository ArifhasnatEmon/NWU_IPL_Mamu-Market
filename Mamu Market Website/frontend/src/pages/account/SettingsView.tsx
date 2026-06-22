import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import ImageCropperModal from '../../components/ui/ImageCropperModal';
import { User, UserAddress } from '../../types';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useApp } from '../../context/AppContext';
import { uploadImage } from '../../utils/imageUpload';
import { useVendorRequests } from '../../hooks/useVendorRequests';
import { supabase } from '../../lib/supabase';

const SettingsView: React.FC = () => {
  const { user, setUser } = useAuth();
  const { setToast } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [name, setName] = useState(user?.name || '');

  const [bio, setBio] = useState((user as any)?.bio || '');
  const [address, setAddress] = useState((user as any)?.address || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [socialFacebook, setSocialFacebook] = useState(user?.socialFacebook || '');
  const [socialInstagram, setSocialInstagram] = useState(user?.socialInstagram || '');
  const [socialYoutube, setSocialYoutube] = useState(user?.socialYoutube || '');
  const [socialWhatsapp, setSocialWhatsapp] = useState(user?.socialWhatsapp || '');
  
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passError, setPassError] = useState('');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailChangeStep, setEmailChangeStep] = useState<'form' | 'success'>('form');
  const [emailChangeSending, setEmailChangeSending] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(name);

  const { submitRequest } = useVendorRequests();
  const [addresses, setAddresses] = useState<UserAddress[]>(() => {
    return (user as any)?.addresses || [];
  });
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [newAddressText, setNewAddressText] = useState('');


  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [upImg, setUpImg] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const onSelectFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => setUpImg(reader.result as string));
    reader.readAsDataURL(file);
    setCropModalOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      setToast('Updating profile...');
      // Future Supabase: Upload avatar if changed
      let avatarUrl = avatar;
      if (avatar && (avatar.startsWith('data:') || avatar.startsWith('blob:'))) {
         avatarUrl = await uploadImage(avatar, 'avatars');
      }

      // Check phone change
      const previousPhone = (user as any)?.phone || '';
      const phoneChanged = phone !== previousPhone;

      const updated = {
        name, 
        address, 
        phone, 
        bio, 
        avatar: avatarUrl,
        social_facebook: socialFacebook, 
        social_instagram: socialInstagram, 
        social_youtube: socialYoutube, 
        social_whatsapp: socialWhatsapp
      };

      if (!user?.id) throw new Error("No user logged in");

      const { error: dbErr } = await supabase
        .from('profiles')
        .update(updated)
        .eq('id', user.id);

      if (dbErr) throw dbErr;

      // Also update Supabase auth metadata so name/avatar sync to auth user list
      await supabase.auth.updateUser({
        data: { name, avatar: avatarUrl }
      });

      setUser({ ...user, ...updated, socialFacebook, socialInstagram, socialYoutube, socialWhatsapp } as any);
      
      if (phoneChanged && phone) {
        setToast('Phone number updated. If you did not make this change, contact support immediately.');
      } else {
        setToast('Profile updated successfully!');
      }
    } catch (error: any) {
      console.error(error);
      setToast(error.message || 'Error updating profile');
    }
  };

  const handleChangePassword = async () => {
    setPassError('');
    if (newPass.length < 8) { setPassError('Password must be at least 8 characters.'); return; }
    if (newPass !== confirmPass) { setPassError('Passwords do not match!'); return; }
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;

      setCurrentPass(''); setNewPass(''); setConfirmPass('');
      setToast('Password changed successfully!');
      setActiveTab('security');
    } catch (err: any) {
      setPassError(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    await submitRequest('account_delete', '', '', '');
    setShowDeleteConfirm(false);
    setToast('Account deletion requested. Please allow 24 hours to 7 days for our administrative team to process your request.');
  };

  // Cooldown check
  const EMAIL_COOLDOWN_DAYS = 60;
  const getEmailCooldownInfo = () => {
    const changedAt = (user as any)?.emailChangedAt;
    if (!changedAt) return { allowed: true, nextDate: null, daysLeft: 0 };
    const changedDate = new Date(changedAt);
    const nextAllowed = new Date(changedDate.getTime() + EMAIL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    if (now >= nextAllowed) return { allowed: true, nextDate: null, daysLeft: 0 };
    const daysLeft = Math.ceil((nextAllowed.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return { allowed: false, nextDate: nextAllowed, daysLeft };
  };

  const handleEmailChangeRequest = async () => {
    if (!newEmail) { setToast('Please enter a new email address'); return; }
    if (newEmail === user?.email) { setToast('New email must be different from your current email'); return; }
    
    // Check cooldown
    const cooldown = getEmailCooldownInfo();
    if (!cooldown.allowed) {
      setToast(`You can only change your email once every ${EMAIL_COOLDOWN_DAYS} days. Try again in ${cooldown.daysLeft} day${cooldown.daysLeft > 1 ? 's' : ''}.`);
      return;
    }

    setEmailChangeSending(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailChangeSending(false);
    
    if (error) {
      setToast(error.message);
      return;
    }
    
    // Animate success
    setEmailChangeStep('success');
    
    // Auto close
    setTimeout(() => {
      setShowEmailModal(false);
      setEmailChangeStep('form');
      setNewEmail('');
      setEmailPassword('');
    }, 5000);
  };

  const handleAddAddress = async () => {
    if (!newAddressLabel || !newAddressText) { setToast('Please fill all fields'); return; }
    if (!user?.id) return;
    
    try {
      const newAddr = {
        user_id: user.id,
        label: newAddressLabel,
        address: newAddressText,
        is_default: addresses.length === 0,
      };

      const { data, error } = await supabase
        .from('addresses')
        .insert(newAddr)
        .select()
        .single();

      if (error) throw error;

      const formattedAddr = {
        id: data.id,
        label: data.label,
        address: data.address,
        isDefault: data.is_default
      };

      const updated = [...addresses, formattedAddr];
      setAddresses(updated);
      setUser({ ...user, addresses: updated } as any);
      setNewAddressLabel(''); setNewAddressText('');
      setToast('Address saved.');
    } catch (err: any) {
      console.error(err);
      setToast(err.message || 'Error saving address');
    }
  };

  const handleRemoveAddress = async (id: string) => {
    try {
      const { error } = await supabase.from('addresses').delete().eq('id', id);
      if (error) throw error;

      const updated = addresses.filter((a: any) => a.id !== id);
      setAddresses(updated);
      setUser({ ...user, addresses: updated } as any);
      setToast('Address removed.');
    } catch (err: any) {
      console.error(err);
      setToast('Error removing address');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // Unset old default
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user?.id).eq('is_default', true);
      // Set new default
      const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id);
      if (error) throw error;

      const updated = addresses.map((a: any) => ({ ...a, isDefault: a.id === id }));
      setAddresses(updated);
      setUser({ ...user, addresses: updated } as any);
      setToast('Default address updated.');
    } catch (err: any) {
      console.error(err);
      setToast('Error setting default address');
    }
  };



  const tabs = [
    { id: 'general', label: 'General', icon: 'fa-user' },
    { id: 'security', label: 'Password & Security', icon: 'fa-shield-alt' },
    ...(user?.role === 'vendor' ? [{ id: 'social', label: 'Social Media', icon: 'fa-share-alt' }] : []),
    ...(user?.role === 'customer' ? [{ id: 'addresses', label: 'Address Book', icon: 'fa-map-marker-alt' }] : []),

  ];

  const inputClass = "w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold";
  const labelClass = "text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block";

  return (
    <div className="container mx-auto px-4 py-20">
      <PageTitle title="Account Settings" />
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Account Settings</h1>
          <button onClick={() => navigate(user?.role === 'vendor' ? '/dashboard' : '/')} className="text-gray-500 font-bold hover:text-gray-900 flex items-center gap-2">
            <i className="fas fa-arrow-left text-sm"></i> {user?.role === 'vendor' ? 'Dashboard' : 'Home'}
          </button>
        </div>
        <p className="text-gray-400 font-medium mb-12">Manage your profile, security and preferences</p>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Profile Card - Large */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
                <i className="fas fa-user text-white text-xs"></i>
              </div>
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Profile</h2>
            </div>
            <div className="flex items-center gap-6 mb-8">
              <div className="relative shrink-0">
                {avatar ? (
                  <img src={avatar || 'https://via.placeholder.com/150?text=User'} referrerPolicy="no-referrer" className="w-20 h-20 rounded-2xl object-cover" alt="avatar" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-white text-2xl" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                    {(name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <button onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-brand-700 transition-all">
                  <i className="fas fa-camera text-xs"></i>
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onSelectFile(f); }} />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{name || 'Your Name'}</p>
                <p className="text-gray-400 font-medium text-sm">{user?.email ? (() => { const [local, domain] = user.email.split('@'); return local.charAt(0) + '*'.repeat(Math.min(local.length - 1, 4)) + '@' + domain; })() : ''}</p>
                <span className={`text-xs font-black uppercase px-3 py-1 rounded-full mt-2 inline-block ${user?.role === 'vendor' ? 'bg-brand-50 text-brand-600' : 'bg-emerald-50 text-emerald-600'}`}>{user?.role || 'customer'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+880 1XXX XXXXXX" className={inputClass} />
              </div>
              {user?.role === 'customer' && (
                <div>
                  <label className={labelClass}>Default Address</label>
                  <div className={`${inputClass} flex items-center gap-2`}>
                    <span className="flex-1 truncate text-gray-500">
                      {(() => {
                        const def = addresses.find((a: any) => a.isDefault);
                        return def ? `${def.label} — ${def.address}` : 'No default set';
                      })()}
                    </span>
                    <button onClick={() => setActiveTab('addresses')} className="text-xs font-black text-brand-600 shrink-0 hover:underline">Change</button>
                  </div>
                </div>
              )}
              <div className="col-span-2">
                <label className={labelClass}>Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={2} className={inputClass + " resize-none"} />
              </div>
            </div>
            <button onClick={handleSaveProfile} className="mt-6 px-10 py-4 gradient-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
              Save Changes
            </button>
          </div>

          {/* Quick Nav Cards - Right Column */}
          <div className="flex flex-col gap-6">

            {/* Security Card */}
            <button onClick={() => setActiveTab(activeTab === 'security' ? 'general' : 'security')} className={`text-left bg-white rounded-[2rem] border-2 shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all w-full ${activeTab === 'security' ? 'border-gray-900' : 'border-gray-100'}`}>
              <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center mb-4">
                <i className="fas fa-shield-alt text-white"></i>
              </div>
              <h3 className="font-black text-gray-900 mb-1">Password & Security</h3>
              <p className="text-xs text-gray-400 font-medium">Change password, manage security</p>
              <div className="mt-3 flex items-center gap-1 text-xs font-black text-brand-600">
                {activeTab === 'security' ? 'Close' : 'Manage'} <i className={`fas fa-arrow-${activeTab === 'security' ? 'up' : 'right'} text-xs`}></i>
              </div>
            </button>

            {user?.role === 'vendor' && (
              <button onClick={() => navigate('/settings/store')} className="text-left bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all w-full">
                <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center mb-4">
                  <i className="fas fa-store text-white"></i>
                </div>
                <h3 className="font-black text-gray-900 mb-1">Store Settings</h3>
                <p className="text-xs text-gray-400 font-medium">Banner, categories, location</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-black text-brand-600">Manage <i className="fas fa-arrow-right text-xs"></i></div>
              </button>
            )}

            {user?.role === 'vendor' && (
              <button onClick={() => setActiveTab(activeTab === 'social' ? 'general' : 'social')} className={`text-left bg-white rounded-[2rem] border-2 shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all w-full ${activeTab === 'social' ? 'border-gray-900' : 'border-gray-100'}`}>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mb-4">
                  <i className="fas fa-share-alt text-white"></i>
                </div>
                <h3 className="font-black text-gray-900 mb-1">Social Media</h3>
                <p className="text-xs text-gray-400 font-medium">Link your social pages</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-black text-brand-600">
                  {activeTab === 'social' ? 'Close' : 'Manage'} <i className={`fas fa-arrow-${activeTab === 'social' ? 'up' : 'right'} text-xs`}></i>
                </div>
              </button>
            )}

            {user?.role === 'customer' && (
              <button onClick={() => setActiveTab(activeTab === 'addresses' ? 'general' : 'addresses')} className={`text-left bg-white rounded-[2rem] border-2 shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all w-full ${activeTab === 'addresses' ? 'border-gray-900' : 'border-gray-100'}`}>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center mb-4">
                  <i className="fas fa-map-marker-alt text-white"></i>
                </div>
                <h3 className="font-black text-gray-900 mb-1">Address Book</h3>
                <p className="text-xs text-gray-400 font-medium">{addresses.length} saved address{addresses.length !== 1 ? 'es' : ''}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-black text-brand-600">
                  {activeTab === 'addresses' ? 'Close' : 'Manage'} <i className={`fas fa-arrow-${activeTab === 'addresses' ? 'up' : 'right'} text-xs`}></i>
                </div>
              </button>
            )}



          </div>

          {/* Expanded Tab Content */}
          {activeTab !== 'general' && (
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10">

                  {activeTab === 'security' && (
                    <div>
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
                          <i className="fas fa-shield-alt text-white text-xs"></i>
                        </div>
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Password & Security</h2>
                      </div>
                      <div className="max-w-md space-y-4">
                        <div>
                          <label className={labelClass}>Current Password</label>
                          <div className="relative">
                            <input type={showCurrentPass ? 'text' : 'password'} value={currentPass} onChange={e => setCurrentPass(e.target.value)} className={inputClass} />
                            <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              <i className={`fas ${showCurrentPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>New Password</label>
                          <div className="relative">
                            <input type={showNewPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} className={inputClass} />
                            <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              <i className={`fas ${showNewPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>Confirm New Password</label>
                          <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className={inputClass} />
                        </div>
                        {passError && <p className="text-red-500 text-sm font-bold">{passError}</p>}
                        <button onClick={handleChangePassword} className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all">Update Password</button>
                      </div>
                      <div className="mt-12 pt-8 border-t border-gray-100">
                        <h3 className="text-lg font-black text-gray-900 mb-4">Email Address</h3>
                        <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{user?.email}</p>
                            <p className="text-xs text-gray-400 font-medium">Verified</p>
                          </div>
                          {(() => {
                            const cooldown = getEmailCooldownInfo();
                            if (!cooldown.allowed) {
                              return (
                                <div className="text-right">
                                  <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg block">
                                    Change available in {cooldown.daysLeft} day{cooldown.daysLeft > 1 ? 's' : ''}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <button onClick={() => { setShowEmailModal(true); setEmailChangeStep('form'); }} className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Change</button>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="mt-12 pt-8 border-t border-gray-100">
                        <h3 className="text-lg font-black text-red-500 mb-4">Danger Zone</h3>
                        {!showDeleteConfirm ? (
                          <button onClick={() => setShowDeleteConfirm(true)} className="px-8 py-4 bg-red-50 text-red-500 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-100 transition-all">Delete Account</button>
                        ) : (
                          <div className="bg-red-50 rounded-2xl p-6 max-w-md">
                            <p className="font-black text-red-700 mb-4">Are you sure? This cannot be undone.</p>
                            <div className="flex gap-3">
                              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-white text-gray-700 rounded-xl font-black text-sm hover:bg-gray-50">Cancel</button>
                              <button onClick={handleDeleteAccount} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black text-sm hover:bg-red-600">Delete</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'addresses' && user?.role === 'customer' && (
                    <div>
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
                          <i className="fas fa-map-marker-alt text-white text-xs"></i>
                        </div>
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Address Book</h2>
                      </div>
                      <div className="space-y-3 mb-8">
                        {addresses.length === 0 && <p className="text-gray-400 font-bold text-center py-8">No saved addresses yet</p>}
                        {addresses.map((addr: any) => (
                          <div key={addr.id} className={`p-5 rounded-2xl border-2 transition-all ${addr.isDefault ? 'border-brand-500 bg-brand-50/30' : 'border-gray-100 bg-gray-50'}`}>
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-black text-gray-900">{addr.label}</span>
                                  {addr.isDefault && <span className="text-[10px] font-black text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full uppercase">Default</span>}
                                </div>
                                <p className="text-gray-500 text-sm font-medium">{addr.address}</p>
                              </div>
                              <div className="flex gap-3 shrink-0">
                                {!addr.isDefault && <button onClick={() => handleSetDefault(addr.id)} className="text-xs font-black text-brand-600 hover:underline">Set Default</button>}
                                <button onClick={() => handleRemoveAddress(addr.id)} className="text-xs font-black text-red-400 hover:text-red-600">Remove</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 pt-8">
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Add New Address</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Label (e.g. Home, Office)</label>
                            <input type="text" value={newAddressLabel} onChange={e => setNewAddressLabel(e.target.value)} placeholder="Home" className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>Full Address</label>
                            <input type="text" value={newAddressText} onChange={e => setNewAddressText(e.target.value)} placeholder="House #, Road #, Area, City" className={inputClass} />
                          </div>
                        </div>
                        <button onClick={handleAddAddress} className="mt-4 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all">Add Address</button>
                      </div>
                    </div>
                  )}



                  {activeTab === 'social' && user?.role === 'vendor' && (
                    <div>
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                          <i className="fas fa-share-alt text-white text-xs"></i>
                        </div>
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Social Media Links</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className={`flex items-center gap-3 rounded-2xl px-5 py-3 ${socialFacebook ? 'bg-blue-50' : 'bg-gray-50'}`}>
                          <i className={`fab fa-facebook text-lg ${socialFacebook ? 'text-blue-600' : 'text-gray-300'}`}></i>
                          <input type="text" value={socialFacebook} onChange={e => setSocialFacebook(e.target.value)} placeholder="facebook.com/yourpage" className="flex-1 bg-transparent outline-none font-bold text-gray-700 placeholder-gray-300 min-w-0" />
                        </div>
                        <div className={`flex items-center gap-3 rounded-2xl px-5 py-3 ${socialInstagram ? 'bg-pink-50' : 'bg-gray-50'}`}>
                          <i className={`fab fa-instagram text-lg ${socialInstagram ? 'text-pink-500' : 'text-gray-300'}`}></i>
                          <input type="text" value={socialInstagram} onChange={e => setSocialInstagram(e.target.value)} placeholder="instagram.com/yourprofile" className="flex-1 bg-transparent outline-none font-bold text-gray-700 placeholder-gray-300 min-w-0" />
                        </div>
                        <div className={`flex items-center gap-3 rounded-2xl px-5 py-3 ${socialWhatsapp ? 'bg-green-50' : 'bg-gray-50'}`}>
                          <i className={`fab fa-whatsapp text-lg ${socialWhatsapp ? 'text-green-500' : 'text-gray-300'}`}></i>
                          <input type="text" value={socialWhatsapp} onChange={e => setSocialWhatsapp(e.target.value)} placeholder="01XXXXXXXXX" className="flex-1 bg-transparent outline-none font-bold text-gray-700 placeholder-gray-300 min-w-0" />
                        </div>
                        <div className={`flex items-center gap-3 rounded-2xl px-5 py-3 ${socialYoutube ? 'bg-red-50' : 'bg-gray-50'}`}>
                          <i className={`fab fa-youtube text-lg ${socialYoutube ? 'text-red-500' : 'text-gray-300'}`}></i>
                          <input type="text" value={socialYoutube} onChange={e => setSocialYoutube(e.target.value)} placeholder="youtube.com/@yourchannel" className="flex-1 bg-transparent outline-none font-bold text-gray-700 placeholder-gray-300 min-w-0" />
                        </div>
                      </div>
                      <button onClick={handleSaveProfile} className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all">
                        Save Social Links
                      </button>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>
          )}

        </div>
      </div>

      {/* Crop Modal */}
      <ImageCropperModal
        isOpen={cropModalOpen}
        imageSrc={upImg}
        title="Crop Profile Photo"
        onCancel={() => { setCropModalOpen(false); setUpImg(null); }}
        onCropComplete={(blobUrl) => {
          setAvatar(blobUrl);
          setCropModalOpen(false);
          setUpImg(null);
        }}
      />

      {/* Email Change Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2rem] p-8 w-full max-w-md"
          >
            <AnimatePresence mode="wait">
              {emailChangeStep === 'form' ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h3 className="text-xl font-black text-gray-900 mb-2">Change Email</h3>
                  <p className="text-gray-400 text-sm font-medium mb-6">A confirmation link will be sent to both your current and new email address.</p>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Current Email</label>
                      <div className={`${inputClass} text-gray-400 cursor-not-allowed`}>{user?.email}</div>
                    </div>
                    <div>
                      <label className={labelClass}>New Email</label>
                      <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="your-new-email@example.com" className={inputClass} />
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => { setShowEmailModal(false); setNewEmail(''); setEmailChangeStep('form'); }} className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
                      <button
                        onClick={handleEmailChangeRequest}
                        disabled={emailChangeSending}
                        className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {emailChangeSending ? (
                          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Sending...</>
                        ) : (
                          'Send Confirmation'
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-center py-6"
                >
                  {/* Animated Checkmark */}
                  <div className="mx-auto mb-6 relative w-20 h-20">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                      className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
                      >
                        <i className="fas fa-check text-3xl text-emerald-600"></i>
                      </motion.div>
                    </motion.div>
                    {/* Pulse ring */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.8 }}
                      animate={{ scale: 1.6, opacity: 0 }}
                      transition={{ duration: 1, repeat: 2, repeatDelay: 0.5 }}
                      className="absolute inset-0 rounded-full border-2 border-emerald-300"
                    />
                  </div>

                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl font-black text-gray-900 mb-2"
                  >
                    Confirmation Sent!
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-gray-400 text-sm font-medium mb-2 leading-relaxed"
                  >
                    We've sent a confirmation link to both your current<br/>and new email address.
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-xs text-gray-300 font-bold mb-6"
                  >
                    Please confirm from both inboxes to complete the change.
                  </motion.p>

                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    onClick={() => { setShowEmailModal(false); setEmailChangeStep('form'); setNewEmail(''); }}
                    className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all"
                  >
                    Got It
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
