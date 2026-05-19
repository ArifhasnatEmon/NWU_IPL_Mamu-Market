import React, { useState, useEffect } from 'react';
import { useGlobalSettings } from '../../../hooks/useMarketing';
import { getTimeLeft, computeExpiresAt, computeCustomExpiresAt, DURATION_PRESETS } from '../../../utils/expiry';

interface TopTickerTabProps {
  setToast: (msg: string) => void;
}

interface TickerMessage {
  text: string;
  expiresAt: string | null;
}

const TopTickerTab: React.FC<TopTickerTabProps> = ({ setToast }) => {
  const { setting: tickerSettings, updateSetting } = useGlobalSettings('top_ticker');
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const [customDays, setCustomDays] = useState<Record<number, string>>({});
  const [customHours, setCustomHours] = useState<Record<number, string>>({});
  const [, forceUpdate] = useState(0);

  // Tick every minute to update "time left" badges
  useEffect(() => {
    const timer = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (tickerSettings && Array.isArray(tickerSettings.messages)) {
      // Backward compatible: convert old string[] format to new object format
      const msgs = tickerSettings.messages.map((m: any) => {
        if (typeof m === 'string') return { text: m, expiresAt: null };
        return { text: m.text || '', expiresAt: m.expiresAt || null };
      });
      setMessages(msgs);
    } else {
      setMessages([
        { text: '🎉 Welcome to Mamu Market!', expiresAt: null },
        { text: '🚚 Free shipping on orders over ৳10000', expiresAt: null }
      ]);
    }
  }, [tickerSettings]);

  const handleSave = async () => {
    try {
      await updateSetting({ messages });
      setToast('Ticker messages saved successfully!');
    } catch (err) {
      setToast('Failed to save ticker messages');
    }
  };

  const handleAddMessage = () => {
    setMessages([...messages, { text: 'New announcement message', expiresAt: null }]);
  };

  const handleRemoveMessage = (index: number) => {
    const newMsgs = [...messages];
    newMsgs.splice(index, 1);
    setMessages(newMsgs);
  };

  const handleUpdateText = (index: number, value: string) => {
    const newMsgs = [...messages];
    newMsgs[index] = { ...newMsgs[index], text: value };
    setMessages(newMsgs);
  };

  const handleSetExpiry = (index: number, durationMs: number) => {
    const expiresAt = computeExpiresAt(durationMs);
    const newMsgs = [...messages];
    newMsgs[index] = { ...newMsgs[index], expiresAt };
    setMessages(newMsgs);
  };

  const handleSetCustomExpiry = (index: number) => {
    const days = parseFloat(customDays[index] || '0') || 0;
    const hours = parseFloat(customHours[index] || '0') || 0;
    if (days === 0 && hours === 0) {
      setToast('Enter days or hours for custom expiry');
      return;
    }
    const expiresAt = computeCustomExpiresAt(days, hours);
    const newMsgs = [...messages];
    newMsgs[index] = { ...newMsgs[index], expiresAt };
    setMessages(newMsgs);
    setToast(`Expiry set: ${days}d ${hours}h from now`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Top Ticker Announcements</h2>
          <p className="text-sm text-gray-500 font-medium">Manage the scrolling text at the top of the website. The Daily Deals timer will automatically be included in rotation.</p>
        </div>
        <button onClick={handleAddMessage} className="px-4 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors">
          + Add Message
        </button>
      </div>

      <div className="space-y-4">
        {messages.map((msg, index) => {
          const timeLeft = getTimeLeft(msg.expiresAt);
          return (
            <div key={index} className={`bg-white p-4 rounded-2xl border shadow-sm ${timeLeft === 'Expired' ? 'border-red-200 opacity-60' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Message {index + 1}</span>
                {timeLeft && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${timeLeft === 'Expired' ? 'bg-red-100 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    ⏳ {timeLeft}
                  </span>
                )}
              </div>

              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={msg.text}
                  onChange={(e) => handleUpdateText(index, e.target.value)}
                  className="flex-1 bg-gray-50 rounded-xl px-4 py-3 outline-none font-medium text-sm border border-gray-100"
                  placeholder="Enter announcement text..."
                />
                <button onClick={() => handleRemoveMessage(index)} className="px-4 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-colors">
                  <i className="fas fa-trash"></i>
                </button>
              </div>

              {/* Expiry Duration Picker */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Expiry:</span>
                {DURATION_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => handleSetExpiry(index, preset.ms)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      (preset.ms === 0 && !msg.expiresAt)
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label === '∞' ? '♾️ No Limit' : preset.label}
                  </button>
                ))}
                <span className="text-gray-300 mx-0.5">|</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Days"
                  value={customDays[index] || ''}
                  onChange={e => setCustomDays({ ...customDays, [index]: e.target.value })}
                  className="w-14 bg-gray-50 rounded-lg px-2 py-1 text-[11px] font-bold text-center border border-gray-200 outline-none focus:border-brand-400"
                />
                <span className="text-[11px] text-gray-400 font-bold">d</span>
                <input
                  type="number"
                  min="0"
                  max="23"
                  placeholder="Hrs"
                  value={customHours[index] || ''}
                  onChange={e => setCustomHours({ ...customHours, [index]: e.target.value })}
                  className="w-14 bg-gray-50 rounded-lg px-2 py-1 text-[11px] font-bold text-center border border-gray-200 outline-none focus:border-brand-400"
                />
                <span className="text-[11px] text-gray-400 font-bold">h</span>
                <button
                  onClick={() => handleSetCustomExpiry(index)}
                  className="px-2.5 py-1 bg-brand-100 text-brand-700 rounded-lg text-[11px] font-bold hover:bg-brand-200 transition-colors"
                >
                  Set
                </button>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="text-gray-400 font-medium italic">No messages. The ticker will only show the Daily Deals timer.</p>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={handleSave} className="px-8 py-4 bg-brand-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity">
          Save Ticker
        </button>
      </div>
    </div>
  );
};

export default TopTickerTab;
