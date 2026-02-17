'use client';
import { useState } from 'react';

export default function AdminNotificationForm() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sending...');

    const res = await fetch('/api/admin/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ title, message, url: '/dashboard' }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      setStatus(`Success! Sent to ${data.sentCount} users.`);
      setTitle('');
      setMessage('');
    } else {
      setStatus('Failed to send notifications.');
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4">Send Broadcast Notification</h2>
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Notification Title</label>
          <input
            type="text"
            className="w-full p-2 border rounded mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New Feature Update"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Message Body</label>
          <textarea
            className="w-full p-2 border rounded mt-1"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What do you want to tell your users?"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Send to All Users
        </button>
        {status && <p className="text-sm mt-2 text-blue-600 font-medium">{status}</p>}
      </form>
    </div>
  );
}