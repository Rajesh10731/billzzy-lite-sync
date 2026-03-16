'use client';

import React from 'react';
import { 
  Copy, 
  Terminal, 
  Database, 
  ExternalLink,
} from 'lucide-react';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  category: 'External' | 'Standard' | 'Analytics';
}

const endpoints: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/external/v1/billing-history',
    description: 'Fetch complete billing and sales transaction history.',
    category: 'External'
  },
  {
    method: 'GET',
    path: '/api/external/customers',
    description: 'Fetch raw customer records and contact information.',
    category: 'External'
  },
  {
    method: 'GET',
    path: '/api/sales',
    description: 'Access standard platform sales records.',
    category: 'Standard'
  },
  {
    method: 'GET',
    path: '/api/products',
    description: 'Retrieve full inventory list and stock details.',
    category: 'Standard'
  },
  {
    method: 'GET',
    path: '/api/services',
    description: 'List all offered services and their current pricing.',
    category: 'Standard'
  },
  {
    method: 'GET',
    path: '/api/purchase',
    description: 'Fetch retail purchase and inventory restock documents.',
    category: 'Standard'
  },
  {
    method: 'GET',
    path: '/api/customers',
    description: 'Alternative access to customer relationship data.',
    category: 'Standard'
  },
  {
    method: 'GET',
    path: '/api/analytics/sales-chart',
    description: 'Pre-calculated metrics for revenue charts and dashboards.',
    category: 'Analytics'
  }
];

export default function ApiDocumentation() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 text-left">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Technical Endpoints</h1>
        <p className="text-gray-600 font-medium">
          Quick reference for all integration paths available in your project.
        </p>
      </div>

      {/* Endpoints List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Terminal size={20} className="text-indigo-600" /> API Endpoint Registry
            </h3>
          </div>
          <span className="bg-white px-4 py-1.5 rounded-xl border border-gray-200 shadow-sm text-xs font-bold text-gray-600 flex items-center gap-2">
            <Database size={14} /> {endpoints.length} Active Routes
          </span>
        </div>

        <div className="overflow-x-auto overflow-visible">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-white text-[11px] uppercase font-black text-gray-400 tracking-widest leading-none">
              <tr>
                <th className="px-8 py-5 text-left font-black">Route Purpose</th>
                <th className="px-8 py-5 text-left font-black">Method & Endpoint</th>
                <th className="px-8 py-5 text-right font-black">Integration Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {endpoints.map((endpoint, index) => (
                <tr key={index} className="hover:bg-gray-50/70 transition-colors group/row">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 w-fit px-2 py-0.5 rounded-md border ${
                        endpoint.category === 'External' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                        endpoint.category === 'Analytics' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {endpoint.category}
                      </span>
                      <span className="text-sm font-bold text-gray-800 leading-tight">
                        {endpoint.description}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span className="w-14 text-center py-1 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">
                        {endpoint.method}
                      </span>
                      <code className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200/50">
                        {endpoint.path}
                      </code>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-all transform group-hover/row:translate-x-0 translate-x-4">
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}${endpoint.path}`)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm"
                      >
                        <Copy size={13} /> Copy URL
                      </button>
                      <a
                        href={endpoint.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 text-xs font-bold rounded-xl border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
                      >
                        <ExternalLink size={13} /> Test Endpoint
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
