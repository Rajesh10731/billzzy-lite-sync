// //src/components/AdminNotifactionForm.tsx
// 'use client';
// import { useState } from 'react';

// export default function AdminNotificationForm() {
//   const [title, setTitle] = useState('');
//   const [message, setMessage] = useState('');
//   const [status, setStatus] = useState('');

//   const handleSend = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setStatus('Sending...');

//     const res = await fetch('/api/admin/notifications/send', {
//       method: 'POST',
//       body: JSON.stringify({ title, message, url: '/dashboard' }),
//       headers: { 'Content-Type': 'application/json' },
//     });

//     if (res.ok) {
//       const data = await res.json();
//       setStatus(`Success! Sent to ${data.sentCount} users.`);
//       setTitle('');
//       setMessage('');
//     } else {
//       setStatus('Failed to send notifications.');
//     }
//   };

//   return (
//     <div className="p-6 bg-white rounded-xl shadow-md border border-gray-200">
//       <h2 className="text-xl font-bold mb-4">Send Broadcast Notification</h2>
//       <form onSubmit={handleSend} className="space-y-4">
//         <div>
//           <label className="block text-sm font-medium">Notification Title</label>
//           <input
//             type="text"
//             className="w-full p-2 border rounded mt-1"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//             placeholder="e.g. New Feature Update"
//             required
//           />
//         </div>
//         <div>
//           <label className="block text-sm font-medium">Message Body</label>
//           <textarea
//             className="w-full p-2 border rounded mt-1"
//             value={message}
//             onChange={(e) => setMessage(e.target.value)}
//             placeholder="What do you want to tell your users?"
//             required
//           />
//         </div>
//         <button
//           type="submit"
//           className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
//         >
//           Send to All Users
//         </button>
//         {status && <p className="text-sm mt-2 text-blue-600 font-medium">{status}</p>}
//       </form>
//     </div>
//   );
// }

// 'use client';
// import { useState, useEffect } from 'react';

// export default function AdminNotificationForm() {
//   const [clients, setClients] = useState([]);
//   const [selectedUserId, setSelectedUserId] = useState('');
//   const [title, setTitle] = useState('');
//   const [message, setMessage] = useState('');
//   const [status, setStatus] = useState({ type: '', msg: '' });

//   // Fetch onboarded clients (Ensure this API returns { _id, name, email })
//   useEffect(() => {
//     fetch('/api/admin/tenants')
//       .then(res => res.json())
//       .then(data => setClients(data))
//       .catch(err => console.error("Failed to load clients", err));
//   }, []);

//   const handleSend = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setStatus({ type: 'info', msg: 'Sending...' });

//     const res = await fetch('/api/admin/notifications/send', {
//       method: 'POST',
//       body: JSON.stringify({ 
//         title, 
//         message, 
//         targetUserId: selectedUserId, // Sending the MongoDB _id
//         url: '/dashboard' 
//       }),
//       headers: { 'Content-Type': 'application/json' },
//     });

//     const data = await res.json();
//     if (res.ok) {
//       setStatus({ type: 'success', msg: `Sent to ${data.sentCount} device(s).` });
//       setMessage('');
//     } else {
//       setStatus({ type: 'error', msg: data.message || 'Failed to send' });
//     }
//   };

//   return (
//     <div className="p-6 bg-white rounded-xl shadow-md border">
//       <h2 className="text-xl font-bold mb-4">Send Push Notification</h2>
//       <form onSubmit={handleSend} className="space-y-4">
//         <div>
//           <label className="block text-sm font-medium">Select Target Client</label>
//           {/* <select 
//             className="w-full p-2 border rounded mt-1"
//             value={selectedUserId}
//             onChange={(e) => setSelectedUserId(e.target.value)}
//             required
//           >
//             <option value="">-- All Subscribed Users --</option>
//             {clients.map((client: any) => (
//               <option key={client._id} value={client._id}>
//                 {client.name || client.email}
//               </option>
//             ))}
//           </select> */}
          
// <select 
//   value={selectedUserId}
//   onChange={(e) => setSelectedUserId(e.target.value)}
//   className="..."
// >
//   <option value="">Select a Client</option>
//   {clients.map((client: any) => (
//     <option key={client._id} value={client._id}> {/* CRITICAL: MUST BE _id */}
//       {client.name || client.email}
//     </option>
//   ))}
// </select>
//         </div>
//         <input 
//           type="text" placeholder="Title" className="w-full p-2 border rounded"
//           value={title} onChange={(e) => setTitle(e.target.value)} required
//         />
//         <textarea 
//           placeholder="Message content..." className="w-full p-2 border rounded"
//           value={message} onChange={(e) => setMessage(e.target.value)} required
//         />
//         <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold">
//           Send Notification
//         </button>
//         {status.msg && (
//           <p className={`text-sm mt-2 ${status.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
//             {status.msg}
//           </p>
//         )}
//       </form>
//     </div>
//   );
// }


'use client';
import { useState, useEffect } from 'react';

// 1. Define the Client interface to satisfy TypeScript
interface OnboardedClient {
  _id: string;
  name?: string;
  email?: string;
}

export default function AdminNotificationForm() {
  // 2. Type the state with the interface
  const [clients, setClients] = useState<OnboardedClient[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState({ type: '', msg: '' });

  useEffect(() => {
    fetch('/api/admin/tenants')
      .then(res => res.json())
      .then((data: OnboardedClient[]) => setClients(data))
      // 3. Prefix unused 'err' with underscore to fix build warning
      .catch(_err => console.error("Failed to load clients"));
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'info', msg: 'Sending...' });

    const res = await fetch('/api/admin/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ 
        title, 
        message, 
        targetUserId: selectedUserId, 
        url: '/dashboard' 
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    if (res.ok) {
      setStatus({ type: 'success', msg: `Sent to ${data.sentCount} device(s).` });
      setMessage('');
    } else {
      setStatus({ type: 'error', msg: data.message || 'Failed to send' });
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md border">
      <h2 className="text-xl font-bold mb-4">Send Push Notification</h2>
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Select Target Client</label>
          <select 
            className="w-full p-2 border rounded mt-1 bg-white"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            required
          >
            <option value="">-- All Subscribed Users --</option>
            {/* 4. Removed ': any' here. TypeScript now knows 'client' is an OnboardedClient */}
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name || client.email}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input 
            type="text" 
            placeholder="e.g. New Order Received" 
            className="w-full p-2 border rounded mt-1"
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Message Body</label>
          <textarea 
            placeholder="What would you like to say?" 
            className="w-full p-2 border rounded mt-1 h-24"
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            required
          />
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition">
          Send Notification
        </button>

        {status.msg && (
          <p className={`text-sm mt-2 font-medium ${status.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
            {status.msg}
          </p>
        )}
      </form>
    </div>
  );
}