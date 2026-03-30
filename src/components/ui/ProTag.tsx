import React from 'react';
import { Crown } from 'lucide-react';

interface ProTagProps {
    className?: string;
}

export const ProTag: React.FC<ProTagProps> = ({ className = '' }) => {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-sm ring-1 ring-amber-400/20 ${className}`}>
            <Crown size={10} className="text-white drop-shadow-sm" fill="currentColor" />
            <span>PRO</span>
        </span>
    );
};

export default ProTag;
