'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { countries, Country } from '@/lib/countries';

interface CountryCodeSelectorProps {
    selectedCountryCode: string;
    onSelect: (country: Country) => void;
    disabled?: boolean;
}

export default function CountryCodeSelector({
    selectedCountryCode,
    onSelect,
    disabled = false
}: CountryCodeSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedCountry = countries.find(c => c.code === selectedCountryCode) || countries[0];

    const filteredCountries = countries.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.dialCode.includes(searchQuery) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`flex items-center justify-between gap-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm transition-all focus:border-[#5a4fcf] ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
            >
                <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">{selectedCountry.flag}</span>
                    <span className="font-bold text-gray-700 text-xs tracking-tighter">{selectedCountry.dialCode}</span>
                </div>
                <ChevronDown size={12} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 z-[110] mt-2 w-64 rounded-xl border-2 border-[#5a4fcf] bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
                    <div className="sticky top-0 p-2 bg-white rounded-t-xl border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Search country or code..."
                                className="w-full rounded-lg bg-gray-50 pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5a4fcf]/20"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                        {filteredCountries.length > 0 ? (
                            filteredCountries.map((country) => (
                                <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => {
                                        onSelect(country);
                                        setIsOpen(false);
                                        setSearchQuery('');
                                    }}
                                    className={`flex items-center justify-between w-full rounded-lg p-2.5 text-left text-sm transition-colors hover:bg-indigo-50 ${selectedCountryCode === country.code ? 'bg-indigo-50 font-bold text-[#5a4fcf]' : 'text-gray-700'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg leading-none">{country.flag}</span>
                                        <span className="truncate max-w-[120px]">{country.name}</span>
                                    </div>
                                    <span className="text-gray-400 font-medium">{country.dialCode}</span>
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-center text-sm text-gray-500 italic">No countries found</div>
                        )}
                    </div>
                </div>
            )}
            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #5a4fcf;
          border-radius: 10px;
        }
      `}</style>
        </div>
    );
}
