'use client';
import { useState, useEffect } from 'react';
import {
  Bell,
  Users,
  Link as LinkIcon,
  Image as ImageIcon,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronDown
} from 'lucide-react';

// 1. Define the Client interface to satisfy TypeScript
interface OnboardedClient {
  _id: string;
  name?: string;
  email?: string;
}

export default function AdminNotificationForm() {
  const [clients, setClients] = useState<OnboardedClient[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [targetCategory, setTargetCategory] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('/dashboard');
  const [icon, setIcon] = useState('/assets/icon-192.png');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  useEffect(() => {
    fetch('/api/admin/tenants')
      .then(res => res.json())
      .then((data: OnboardedClient[]) => setClients(data))
      .catch(() => console.error("Failed to load clients"));
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: 'info', msg: 'Sending system broadcast...' });

    const res = await fetch('/api/admin/notifications/send', {
      method: 'POST',
      body: JSON.stringify({
        title,
        message,
        url,
        icon,
        image,
        targetUserId: selectedUserId,
        category: targetCategory
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (data.sentCount === 0) {
        setStatus({ type: 'info', msg: data.message || 'No push subscriptions found for target.' });
      } else {
        setStatus({ type: 'success', msg: `Sent to ${data.sentCount}/${data.totalSubscriptions || data.sentCount} device(s).` });
      }
      setMessage('');
      setImage('');
    } else {
      setStatus({ type: 'error', msg: data.message || 'Failed to send' });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-[24px] shadow-xl border border-gray-100 overflow-hidden mb-2">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
            <Bell size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Send Broadcast</h2>
            <p className="text-xs text-indigo-100 font-medium">Deliver instant updates to your merchants</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSend} className="p-6 space-y-6">
        {/* Targeting Section */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Users size={12} /> Target Audience
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative group">
              <label className="text-[11px] font-bold text-gray-500 ml-1 mb-1 block">Recipient Group</label>
              <div className="relative">
                <select
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none"
                  value={targetCategory}
                  onChange={(e) => {
                    setTargetCategory(e.target.value);
                    if (e.target.value !== 'single') setSelectedUserId('');
                  }}
                >
                  <option value="all">All Subscribed Users</option>
                  <option value="onboarded">Onboarded Clients</option>
                  <option value="unonboarded">Unonboarded (Pending)</option>
                  <option value="single">Specific Individual</option>
                </select>
                <Users size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className={`relative group transition-opacity duration-300 ${targetCategory === 'single' || targetCategory === 'all' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <label className="text-[11px] font-bold text-gray-500 ml-1 mb-1 block">Select Merchant</label>
              <div className="relative">
                <select
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none"
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    if (e.target.value) setTargetCategory('single');
                  }}
                  disabled={targetCategory !== 'single' && targetCategory !== 'all'}
                >
                  <option value="">-- Select Specific User --</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name || client.email}
                    </option>
                  ))}
                </select>
                <Users size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-4 pt-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <MessageSquare size={12} /> Notification Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group">
              <label className="text-[11px] font-bold text-gray-500 ml-1 mb-1 block">Title</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. New Order Received"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <Bell size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
            </div>
            <div className="group">
              <label className="text-[11px] font-bold text-gray-500 ml-1 mb-1 block">Action Link (Route)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. /inventory"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <LinkIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="group">
              <label className="text-[11px] font-bold text-gray-500 ml-1 mb-1 block">Icon (Internal Path)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="/assets/icon-192.png"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                />
                <ImageIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
            </div>
            <div className="group">
              <label className="text-[11px] font-bold text-gray-500 ml-1 mb-1 block">Banner Image URL (HTTPS)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                />
                <ImageIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
            </div>
          </div>

          <div className="group pt-2">
            <label className="text-[11px] font-bold text-gray-500 ml-1 mb-1 block">Broadcast Message</label>
            <div className="relative">
              <textarea
                placeholder="Write your message here..."
                className="w-full pl-10 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all h-32 resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
              <MessageSquare size={18} className="absolute left-3.5 top-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all disabled:opacity-70 group"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Broadcasting...</span>
              </>
            ) : (
              <>
                <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                <span>SEND SYSTEM BROADCAST</span>
              </>
            )}
          </button>
        </div>

        {/* Status Area */}
        {status.msg && (
          <div className={`mt-4 p-4 rounded-2xl animate-in slide-in-from-bottom-2 duration-300 flex items-center gap-3 ${status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' :
              status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' :
                'bg-blue-50 text-blue-700 border border-blue-100'
            }`}>
            {status.type === 'error' ? <AlertCircle size={20} /> :
              status.type === 'success' ? <CheckCircle size={20} /> :
                <Info size={20} />}
            <p className="text-xs font-bold uppercase tracking-tight">{status.msg}</p>
          </div>
        )}
      </form>
    </div>
  );
}