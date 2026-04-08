'use client';

import React, { useState, useEffect, FC, ChangeEvent, useRef, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
import { Upload, Edit2, Plus, X, Trash2, Search, Image as ImageIcon, Camera, Loader2, Info, AlertTriangle, Package, Briefcase, Lock, AlertCircle } from "lucide-react";
import { motion, useAnimationControls, PanInfo, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Scanner } from "@yudiel/react-qr-scanner";
import imageCompression from 'browser-image-compression';

// --- Services Types and Sub-components ---
interface IService {
    _id: string;
    name: string;
    price: number;
    category?: string;
}

interface MobileServiceCardProps {
    service: IService;
    isSwiped: boolean;
    onSwipe: (id: string | null) => void;
    onEdit: (service: IService) => void;
    onDelete: (id: string) => void;
}

const MobileServiceCard: FC<MobileServiceCardProps> = React.memo(({ service, isSwiped, onSwipe, onEdit, onDelete }) => {
    const controls = useAnimationControls();
    const ACTION_WIDTH = 140;

    useEffect(() => {
        if (!isSwiped) {
            controls.start({ x: 0 });
        }
    }, [isSwiped, controls]);

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void => {
        if (info.offset.x < -ACTION_WIDTH / 2) {
            controls.start({ x: -ACTION_WIDTH });
            onSwipe(service._id);
        } else {
            controls.start({ x: 0 });
        }
    };

    return (
        <div className="relative w-full bg-gray-100 rounded-xl overflow-hidden shadow-sm border border-gray-100 mb-2">
            <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTION_WIDTH }}>
                <button onClick={() => onEdit(service)} className="w-1/2 h-full flex flex-col items-center justify-center bg-[#5a4fcf] text-white transition-colors hover:bg-[#4a3fb5]">
                    <Edit2 className="w-4 h-4" /><span className="text-[10px] mt-1 font-bold">Edit</span>
                </button>
                <button onClick={() => onDelete(service._id)} className="w-1/2 h-full flex flex-col items-center justify-center bg-red-500 text-white transition-colors hover:bg-red-600">
                    <Trash2 className="w-4 h-4" /><span className="text-[10px] mt-1 font-bold">Delete</span>
                </button>
            </div>
            <motion.div
                className="relative bg-white p-4 flex items-center justify-between w-full cursor-grab active:cursor-grabbing border-b border-gray-100"
                drag="x" dragConstraints={{ right: 0, left: -ACTION_WIDTH }} onDragEnd={handleDragEnd}
                animate={controls} transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={() => { if (isSwiped) { controls.start({ x: 0 }); onSwipe(null); } }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-[#5a4fcf] flex-shrink-0">
                        <Briefcase size={20} />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{service.name}</h4>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] uppercase font-bold text-gray-400 truncate">{service.category || 'General'}</p>
                        </div>
                    </div>
                </div>

                <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-sm font-bold text-gray-900">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(service.price)}</p>
                </div>
            </motion.div>
        </div>
    );
});
MobileServiceCard.displayName = 'MobileServiceCard';

interface ServicesStatsSectionProps {
    activeTab: 'total' | 'categories';
    setActiveTab: (tab: 'total' | 'categories') => void;
    servicesCount: number;
    categoriesCount: number;
    showCategoryFilter: boolean;
    setShowCategoryFilter: (show: boolean) => void;
    clearFilters: () => void;
}

const ServicesStatsSection: FC<ServicesStatsSectionProps> = ({
    activeTab,
    setActiveTab,
    servicesCount,
    categoriesCount,
    showCategoryFilter,
    setShowCategoryFilter,
    clearFilters
}) => (
    <div className="grid grid-cols-2 gap-3">
        <button
            onClick={clearFilters}
            className={`relative group flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-300 active:scale-95 text-center h-24 ${activeTab === 'total'
                ? 'bg-indigo-50 border-indigo-500'
                : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-colors ${activeTab === 'total' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                <Briefcase className="w-4 h-4" />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wide ${activeTab === 'total' ? 'text-indigo-500' : 'text-gray-400'}`}>Total Services</span>
            <p className={`text-lg font-extrabold ${activeTab === 'total' ? 'text-gray-900' : 'text-gray-700'}`}>{servicesCount}</p>
            {activeTab === 'total' && (
                <motion.div layoutId="services-active-indicator" className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-500" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
            )}
        </button>

        <button
            onClick={() => {
                setShowCategoryFilter(!showCategoryFilter);
                setActiveTab('categories');
            }}
            className={`relative group flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-300 active:scale-95 text-center h-24 ${activeTab === 'categories'
                ? 'bg-purple-50 border-purple-500'
                : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-colors ${activeTab === 'categories' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                <Briefcase className="w-4 h-4" />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wide ${activeTab === 'categories' ? 'text-purple-500' : 'text-gray-400'}`}>Categories</span>
            <p className={`text-lg font-extrabold ${activeTab === 'categories' ? 'text-gray-900' : 'text-gray-700'}`}>{categoriesCount}</p>
            {activeTab === 'categories' && (
                <motion.div layoutId="services-active-indicator" className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-purple-500" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
            )}
        </button>
    </div>
);

interface CategoryFilterBarProps {
    show: boolean;
    selectedCategory: string | null;
    setSelectedCategory: (cat: string | null) => void;
    existingCategories: string[];
}

const CategoryFilterBar: FC<CategoryFilterBarProps> = ({ show, selectedCategory, setSelectedCategory, existingCategories }) => (
    <AnimatePresence>
        {show && (
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
            >
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!selectedCategory ? 'bg-[#5a4fcf] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        All
                    </button>
                    {existingCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === cat ? 'bg-[#5a4fcf] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </motion.div>
        )}
    </AnimatePresence>
);

const ServicesSearchBar: FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => (
    <div className="relative w-full group">
        <label htmlFor="search-services" className="sr-only">Search services</label>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
        <input
            id="search-services"
            type="text"
            placeholder="Search services by name or category..."
            className="w-full pl-11 pr-4 py-3 text-sm border-2 border-transparent bg-white rounded-2xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-gray-400 font-medium"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

interface ServiceTableProps {
    services: IService[];
    onEdit: (service: IService) => void;
    onDelete: (id: string) => void;
}

const ServiceTable: FC<ServiceTableProps> = ({ services, onEdit, onDelete }) => (
    <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {services.length === 0 ? (
            <div className="text-center p-12 bg-gray-50">
                <Info className="w-8 h-8 mb-2 text-gray-400 mx-auto" />
                <h3 className="font-semibold">No Services Found</h3>
                <p className="text-gray-500">Add your first service to get started.</p>
            </div>
        ) : (
            <div className="divide-y divide-gray-100">
                {services.map((service) => (
                    <div key={service._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-[#5a4fcf]">
                                <Briefcase size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">{service.name}</h4>
                                <p className="text-[10px] uppercase font-bold text-gray-400">{service.category || 'General'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(service.price)}</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onEdit(service)}
                                    className="p-1.5 text-gray-400 hover:text-[#5a4fcf] hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => onDelete(service._id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

interface MobileServiceListProps {
    services: IService[];
    swipedId: string | null;
    setSwipedId: (id: string | null) => void;
    onEdit: (service: IService) => void;
    onDelete: (id: string) => void;
}

const MobileServiceList: FC<MobileServiceListProps> = ({ services, swipedId, setSwipedId, onEdit, onDelete }) => (
    <div className="md:hidden space-y-2">
        {services.map(service => (
            <MobileServiceCard
                key={service._id}
                service={service}
                isSwiped={swipedId === service._id}
                onSwipe={setSwipedId}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        ))}
    </div>
);

interface ServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingService: IService | null;
    formData: { name: string; price: string; category: string };
    setFormData: React.Dispatch<React.SetStateAction<{ name: string; price: string; category: string }>>;
    submitting: boolean;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    existingCategories: string[];
    showCategoryDropdown: boolean;
    setShowCategoryDropdown: React.Dispatch<React.SetStateAction<boolean>>;
    categoryDropdownRef: React.RefObject<HTMLDivElement | null>;
}

const ServiceModal: FC<ServiceModalProps> = ({
    isOpen,
    onClose,
    editingService,
    formData,
    setFormData,
    submitting,
    onSubmit,
    existingCategories,
    showCategoryDropdown,
    setShowCategoryDropdown,
    categoryDropdownRef
}) => (
    <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-3 animate-in fade-in duration-200">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.3 }}
                    className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                >
                    <div className="bg-gradient-to-r from-[#5a4fcf] to-[#7b68ee] px-4 py-4 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-white">{editingService ? 'Edit Service' : 'Add New Service'}</h2>
                            <p className="text-indigo-100 text-xs mt-0.5">{editingService ? 'Update service details' : 'Define your business service'}</p>
                        </div>
                        <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={onSubmit} className="p-4 space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor="service-modal-name" className="text-xs font-medium text-gray-700">Service Name</label>
                            <input
                                id="service-modal-name"
                                type="text"
                                required
                                className="w-full border-2 border-gray-200 px-3 py-2 rounded-xl focus:border-[#5a4fcf] focus:ring-2 focus:ring-[#5a4fcf]/20 transition-all outline-none text-sm"
                                placeholder="e.g., Haircut, Consultation"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="service-modal-price" className="text-xs font-medium text-gray-700">Service Price</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
                                <input
                                    id="service-modal-price"
                                    type="number"
                                    required
                                    className="w-full border-2 border-gray-200 pl-7 pr-3 py-2 rounded-xl focus:border-[#5a4fcf] focus:ring-2 focus:ring-[#5a4fcf]/20 transition-all outline-none text-sm"
                                    placeholder="0.00"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 relative" ref={categoryDropdownRef as React.RefObject<HTMLDivElement>}>
                            <label htmlFor="service-modal-category" className="text-xs font-medium text-gray-700">Category</label>
                            <input
                                id="service-modal-category"
                                type="text"
                                className="w-full border-2 border-gray-200 px-3 py-2 rounded-xl focus:border-[#5a4fcf] focus:ring-2 focus:ring-[#5a4fcf]/20 transition-all outline-none text-sm"
                                placeholder="e.g., Styling, Advisory"
                                value={formData.category}
                                onFocus={() => setShowCategoryDropdown(true)}
                                onChange={(e) => {
                                    setFormData({ ...formData, category: e.target.value });
                                    setShowCategoryDropdown(true);
                                }}
                            />
                            <AnimatePresence>
                                {showCategoryDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto"
                                    >
                                        {existingCategories.filter(cat =>
                                            cat.toLowerCase().includes(formData.category.toLowerCase())
                                        ).length > 0 ? (
                                            existingCategories
                                                .filter(cat => cat.toLowerCase().includes(formData.category.toLowerCase()))
                                                .map(cat => (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer transition-colors"
                                                        onClick={() => {
                                                            setFormData({ ...formData, category: cat });
                                                            setShowCategoryDropdown(false);
                                                        }}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))
                                        ) : (
                                            formData.category && (
                                                <div className="px-3 py-2 text-sm text-gray-500 italic">
                                                    New Category: &quot;{formData.category}&quot;
                                                </div>
                                            )
                                        )}
                                        {!formData.category && existingCategories.length === 0 && (
                                            <div className="px-3 py-2 text-sm text-gray-500 italic">
                                                No categories yet
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="bg-gray-50 -mx-4 -mb-4 px-4 py-3 flex justify-end gap-2.5 border-t mt-6">
                            <button type="button" onClick={onClose} className="px-5 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors text-sm">Cancel</button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className={`px-5 py-2 text-white rounded-xl font-medium shadow-lg transition-all text-sm flex items-center justify-center min-w-[120px] 
                      ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#5a4fcf] to-[#7b68ee] hover:from-[#4a3fb5] hover:to-[#6b58de] shadow-[#5a4fcf]/30'}`}
                            >
                                {submitting ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                ) : (
                                    <>{editingService ? 'Save Changes' : 'Add Service'}</>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);

const ServicesView: FC<{ isLocked?: boolean }> = ({ isLocked }) => {
    const { status } = useSession();
    const [services, setServices] = useState<IService[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [swipedId, setSwipedId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showCategoryFilter, setShowCategoryFilter] = useState(false);
    const [activeTab, setActiveTab] = useState<'total' | 'categories'>('total');

    // Modal / Form state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<IService | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);

    // Extract unique categories for dropdown
    const existingCategories: string[] = Array.from(new Set(services.map(s => s.category?.trim()).filter((cat): cat is string => Boolean(cat))))
        .sort((a, b) => {
            const indexA = services.findIndex(s => s.category?.trim() === a);
            const indexB = services.findIndex(s => s.category?.trim() === b);
            return indexA - indexB;
        });

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
                setShowCategoryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchServices = useCallback(async () => {
        try {
            const res = await fetch('/api/services');
            if (res.ok) {
                const data = await res.json();
                setServices(data);
            }
        } catch (error) {
            console.error("Failed to fetch services:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchServices();
        }
    }, [status, fetchServices]);

    const handleOpenModal = (service?: IService) => {
        if (service) {
            setEditingService(service);
            setFormData({
                name: service.name,
                price: service.price.toString(),
                category: service.category || ''
            });
        } else {
            setEditingService(null);
            setFormData({
                name: '',
                price: '',
                category: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const payload = {
            ...formData,
            price: Number.parseFloat(formData.price)
        };

        try {
            const url = editingService ? `/api/services/${editingService._id}` : '/api/services';
            const method = editingService ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                fetchServices();
                setIsModalOpen(false);
            }
        } catch (error) {
            console.error("Error saving service:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service?')) return;

        try {
            const res = await fetch(`/api/services/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setServices(services.filter(s => s._id !== id));
                setSwipedId(null);
            }
        } catch (error) {
            console.error("Error deleting service:", error);
        }
    };

    const filteredServices = services.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.category?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || s.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const clearFilters = () => {
        setSelectedCategory(null);
        setSearchQuery('');
        setShowCategoryFilter(false);
        setActiveTab('total');
    };

    if (status === 'loading' || (loading && services.length === 0)) {
        return <div className="flex h-full items-center justify-center pt-20"><Loader2 className="h-8 w-8 animate-spin text-[#5a4fcf]" /></div>;
    }

    return (
        <div className="space-y-3.5">
            <div className="flex flex-col md:flex-row justify-end md:items-center gap-3">
                <div className="hidden sm:flex items-center gap-2">
                    <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-[#5a4fcf] hover:bg-[#4a3fb5] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"><Plus size={14} />Add New Service</button>
                </div>
            </div>
            <ServicesStatsSection activeTab={activeTab} setActiveTab={setActiveTab} servicesCount={services.length} categoriesCount={new Set(services.map(s => s.category?.toLowerCase().trim() || 'general')).size} showCategoryFilter={showCategoryFilter} setShowCategoryFilter={setShowCategoryFilter} clearFilters={clearFilters} />
            <CategoryFilterBar show={showCategoryFilter} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} existingCategories={existingCategories} />
            <ServicesSearchBar value={searchQuery} onChange={setSearchQuery} />
            <ServiceTable services={filteredServices} onEdit={handleOpenModal} onDelete={handleDelete} />
            <MobileServiceList services={filteredServices} swipedId={swipedId} setSwipedId={setSwipedId} onEdit={handleOpenModal} onDelete={handleDelete} />
            {!isLocked && (
                <div className="sm:hidden fixed bottom-24 right-4 z-40">
                    <button onClick={() => handleOpenModal()} className="w-14 h-14 flex items-center justify-center bg-[#5a4fcf] hover:bg-[#4a3fb5] text-white rounded-full shadow-xl border-2 border-white transition-transform active:scale-95"><Plus className="w-6 h-6" /></button>
                </div>
            )}
            <ServiceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingService={editingService} formData={formData} setFormData={setFormData} submitting={submitting} onSubmit={handleSubmit} existingCategories={existingCategories} showCategoryDropdown={showCategoryDropdown} setShowCategoryDropdown={setShowCategoryDropdown} categoryDropdownRef={categoryDropdownRef as React.RefObject<HTMLDivElement>} />
        </div>
    );
};
// --- End Services Types and Sub-components ---

const LOW_STOCK_THRESHOLD = 10;

export interface Product {
    id: string;
    name: string;
    quantity: number;
    buyingPrice: number;
    sellingPrice: number;
    gstRate: number;
    profitPerUnit?: number;
    image?: string;
    sku?: string;
    lowStockThreshold?: number;
}

interface ExcelRow {
    [key: string]: string | number;
}

type DetectedBarcode = {
    rawValue: string;
}

interface UpdateInfo {
    id: string;
    change: number;
}

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
};

const getExcelColumn = (row: ExcelRow, headers: string[]): string | number | undefined => {
    const lowerHeaders = headers.map(h => h.toLowerCase());
    for (const lowerHeader of lowerHeaders) {
        for (const key in row) {
            if (key.trim().toLowerCase() === lowerHeader) {
                return row[key];
            }
        }
    }
    return undefined;
};

const mapExcelRowsToProducts = (rows: ExcelRow[]) => {
    return rows.map((row) => ({
        sku: String(getExcelColumn(row, ["Product ID", "SKU"]) || ""),
        name: String(getExcelColumn(row, ["Product Name", "Name"]) || ""),
        quantity: Number(getExcelColumn(row, ["Quantity", "Qty"])) || 0,
        buyingPrice: Number(getExcelColumn(row, ["Buying Price"])) || 0,
        sellingPrice: Number(getExcelColumn(row, ["Selling Price"])) || 0,
        gstRate: Number(getExcelColumn(row, ["GST Rate", "GST"])) || 0,
        profitPerUnit: Number(getExcelColumn(row, ["Profit Per Unit", "Profit"])) || undefined
    }));
};

interface MobileProductCardProps {
    product: Product;
    isSwiped: boolean;
    onSwipe: (id: string | null) => void;
    onEdit: (product: Product) => void;
    onDelete: (id: string) => void;
    updatedProductInfo: UpdateInfo | null;
}

const MobileProductCard: FC<MobileProductCardProps> = React.memo(({ product, isSwiped, onSwipe, onEdit, onDelete, updatedProductInfo }) => {
    const controls = useAnimationControls();
    const ACTION_WIDTH = 160;
    const alertThreshold = product.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
    const isLowStock = product.quantity <= alertThreshold;
    const updateInfo = updatedProductInfo?.id === product.id ? updatedProductInfo : null;

    useEffect(() => {
        if (!isSwiped) {
            controls.start({ x: 0 });
        }
    }, [isSwiped, controls]);

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void => {
        if (info.offset.x < -ACTION_WIDTH / 2) {
            controls.start({ x: -ACTION_WIDTH });
            onSwipe(product.id);
        } else {
            controls.start({ x: 0 });
        }
    };

    return (
        <div className={`relative w-full bg-gray-200 rounded-lg overflow-hidden shadow-sm ${isLowStock ? 'ring-2 ring-red-500' : ''}`}>
            <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTION_WIDTH }}>
                <button onClick={() => onEdit(product)} className="w-1/2 h-full flex flex-col items-center justify-center bg-[#5a4fcf] text-white transition-colors hover:bg-[#4a3fb5]">
                    <Edit2 className="w-5 h-5" /><span className="text-xs mt-1">Edit</span>
                </button>
                <button onClick={() => onDelete(product.id)} className="w-1/2 h-full flex flex-col items-center justify-center bg-red-500 text-white transition-colors hover:bg-red-600">
                    <Trash2 className="w-5 h-5" /><span className="text-xs mt-1">Delete</span>
                </button>
            </div>
            <motion.div
                className="relative bg-white p-2.5 flex items-center gap-2.5 w-full cursor-grab"
                drag="x" dragConstraints={{ right: 0, left: -ACTION_WIDTH }} onDragEnd={handleDragEnd}
                animate={controls} transition={{ type: "spring", stiffness: 300, damping: 30 }}
                role="button"
                aria-label={isSwiped ? "Close actions" : "View product details"}
                tabIndex={0}
                onClick={() => { if (isSwiped) { controls.start({ x: 0 }); onSwipe(null); } }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        if (isSwiped) {
                            controls.start({ x: 0 });
                            onSwipe(null);
                        }
                    }
                }}
            >
                {product.image ? (
                    <Image src={product.image} alt={product.name} width={56} height={56} className="w-14 h-14 object-cover rounded-md bg-gray-100 flex-shrink-0" />
                ) : (
                    <button onClick={() => onEdit(product)} className="w-14 h-14 flex-shrink-0 flex flex-col items-center justify-center bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
                        <Upload className="w-4 h-4 text-gray-500" />
                        <span className="text-[10px] mt-0.5 text-gray-600">Upload</span>
                    </button>
                )}
                <div className="flex-1 overflow-hidden min-w-0">
                    <h3 className="font-semibold text-sm text-gray-800 truncate">{product.name}</h3>
                    <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-gray-500 truncate">ID: {product.sku || 'N/A'}</p>
                        <div className="flex items-center gap-2 flex-shrink-0 relative">
                            {isLowStock && (
                                <div className="flex items-center gap-0.5 text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span className="text-[10px] font-medium">Low</span>
                                </div>
                            )}
                            <p className="text-xs text-gray-700 font-medium">Qty: {product.quantity}</p>
                            <AnimatePresence>
                                {updateInfo && (
                                    <motion.div
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.2 } }}
                                        className={`absolute -right-2 -top-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-lg z-10 ${updateInfo.change > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                                    >
                                        {updateInfo.change > 0 ? `+${updateInfo.change}` : updateInfo.change}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
});
MobileProductCard.displayName = 'MobileProductCard';

const DesktopProductTable: FC<{ products: Product[]; onEdit: (p: Product) => void; onDelete: (id: string) => void; updatedProductInfo: UpdateInfo | null; }> = ({ products, onEdit, onDelete, updatedProductInfo }) => (
    <div className="hidden md:block overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Image</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Product Name</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Product ID</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Quantity</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Selling Price</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Profit/Unit</th>
                    <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                <AnimatePresence>
                    {products.map((p) => {
                        const alertThreshold = p.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
                        const isLowStock = p.quantity <= alertThreshold;
                        const updateInfo = updatedProductInfo?.id === p.id ? updatedProductInfo : null;
                        return (
                            <motion.tr layout key={p.id} className={isLowStock ? 'bg-red-50' : ''}>
                                <td className="px-3 py-2">
                                    {p.image ? (
                                        <Image src={p.image} alt={p.name} width={56} height={56} className="w-14 h-14 object-cover rounded-md" />
                                    ) : (
                                        <button onClick={() => onEdit(p)} className="w-14 h-14 flex flex-col items-center justify-center bg-gray-50 rounded-md hover:bg-gray-100 transition-colors border">
                                            <Upload className="w-5 h-5 text-gray-400" />
                                        </button>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-sm font-medium text-gray-900">{p.name}</td>
                                <td className="px-3 py-2 text-sm text-gray-500 truncate max-w-xs">{p.sku || 'N/A'}</td>
                                <td className="px-3 py-2 text-sm relative">
                                    <div className="flex items-center gap-2">
                                        {isLowStock && (
                                            <span title={`Alert set for ${alertThreshold}`}>
                                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                            </span>
                                        )}
                                        <span className={isLowStock ? 'text-red-600 font-semibold' : 'text-gray-500'}>{p.quantity}</span>
                                        {updateInfo && (
                                            <motion.div
                                                key={updateInfo.id}
                                                initial={{ y: 10, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className={`absolute left-1/2 -top-1 px-1.5 py-0.5 rounded-full text-xs font-bold shadow ${updateInfo.change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                            >
                                                {updateInfo.change > 0 ? `+${updateInfo.change}` : updateInfo.change}
                                            </motion.div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-500">{formatCurrency(p.sellingPrice)}</td>
                                <td className="px-3 py-2 text-sm text-green-600 font-medium">{p.profitPerUnit ? formatCurrency(p.profitPerUnit) : '-'}</td>
                                <td className="px-3 py-2 text-right">
                                    <div className="flex justify-end gap-4">
                                        <button onClick={() => onEdit(p)} className="text-[#5a4fcf] hover:text-[#4a3fb5] flex items-center gap-1"><Edit2 className="w-4 h-4" /> Edit</button>
                                        <button onClick={() => onDelete(p.id)} className="text-red-600 hover:text-red-900 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button>
                                    </div>
                                </td>
                            </motion.tr>
                        );
                    })}
                </AnimatePresence>
            </tbody>
        </table>
    </div>
);

type ProductFormData = Omit<Product, 'id'> & { id?: string };
type ProductFormState = Omit<ProductFormData, 'quantity' | 'buyingPrice' | 'sellingPrice' | 'gstRate' | 'lowStockThreshold' | 'profitPerUnit'> & {
    quantity: number | '';
    buyingPrice?: number | '';
    sellingPrice?: number | '';
    gstRate?: number | '';
    lowStockThreshold?: number | '';
    profitPerUnit?: number | '';
};

interface ProductFormModalProps {
    product: ProductFormData | null;
    onSave: (productData: ProductFormData, imageFile: File | null) => Promise<void>;
    onClose: () => void;
}

interface ProductHeaderProps {
    isEditing: boolean;
    onClose: () => void;
    isSubmitting: boolean;
}

const ProductHeader: FC<ProductHeaderProps> = ({ isEditing, onClose, isSubmitting }) => (
    <div className="bg-gradient-to-r from-[#5a4fcf] to-[#7b68ee] px-4 py-4 flex justify-between items-center">
        <div>
            <h2 className="text-lg font-bold text-white">{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
            <p className="text-indigo-100 text-xs mt-0.5">{isEditing ? 'Update product information' : 'Fill in the details below'}</p>
        </div>
        <button onClick={onClose} disabled={isSubmitting} className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"><X className="w-5 h-5" /></button>
    </div>
);

interface ProductImageUploadProps {
    isSubmitting: boolean;
    imagePreview: string | null;
    handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const ProductImageUpload: FC<ProductImageUploadProps> = ({ isSubmitting, imagePreview, handleImageChange, fileInputRef }) => (
    <div className="space-y-1.5">
        <label htmlFor="product-image" className="text-xs font-medium text-gray-700">Product Image</label>
        <button
            type="button"
            onClick={() => !isSubmitting && fileInputRef.current?.click()}
            disabled={isSubmitting}
            className={`w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#5a4fcf] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5a4fcf]/50 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Upload product image"
        >
            <input id="product-image" type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
            {imagePreview ? (
                <div className="relative w-full h-full">
                    <Image src={imagePreview} alt="Product Preview" fill sizes="(max-width: 768px) 100vw, 512px" style={{ objectFit: 'contain' }} className="p-2" />
                </div>
            ) : (
                <div className="text-center text-gray-500">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1.5" />
                    <p className="text-xs">Click to upload</p>
                </div>
            )}
        </button>
    </div>
);

interface ProductBasicDetailsProps {
    formData: ProductFormState;
    handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    isSubmitting: boolean;
    setIsScannerOpen: (open: boolean) => void;
}

const ProductBasicDetails: FC<ProductBasicDetailsProps> = ({ formData, handleInputChange, isSubmitting, setIsScannerOpen }) => (
    <>
        <div className="space-y-1.5">
            <label htmlFor="product-name" className="text-xs font-medium text-gray-700">Product Name</label>
            <input id="product-name" type="text" name="name" placeholder="Enter product name" className="w-full border-2 border-gray-200 px-3 py-2 rounded-xl focus:border-[#5a4fcf] focus:ring-2 focus:ring-[#5a4fcf]/20 transition-all outline-none text-sm" value={formData.name} onChange={handleInputChange} disabled={isSubmitting} />
        </div>
        <div className="space-y-1.5">
            <label htmlFor="product-sku" className="text-xs font-medium text-gray-700">Product ID (SKU)</label>
            <div className="relative">
                <input id="product-sku" type="text" name="sku" placeholder="SKU, Barcode, or custom ID" className="w-full border-2 border-gray-200 px-3 py-2 pr-12 rounded-xl focus:border-[#5a4fcf] focus:ring-2 focus:ring-[#5a4fcf]/20 transition-all outline-none font-mono text-xs" value={formData.sku || ''} onChange={handleInputChange} disabled={isSubmitting} />
                <button type="button" onClick={() => setIsScannerOpen(true)} disabled={isSubmitting} className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 bg-gradient-to-r from-[#5a4fcf] to-[#7b68ee] text-white rounded-xl hover:from-[#4a3fb5] hover:to-[#6b58de] shadow-md shadow-[#5a4fcf]/20 transition-all active:scale-95" aria-label="Scan barcode"><Camera className="w-4 h-4" /></button>
            </div>
        </div>
    </>
);

interface StockManagementProps {
    isEditing: boolean;
    isSubmitting: boolean;
    formData: ProductFormState;
    product: ProductFormData | null;
    handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    stockAdjustment: number | '';
    setStockAdjustment: (val: number | '') => void;
}

const StockManagement: FC<StockManagementProps> = ({ isEditing, isSubmitting, formData, product, handleInputChange, stockAdjustment, setStockAdjustment }) => (
    <>
        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
                <label htmlFor="product-quantity" className="text-xs font-medium text-gray-700">{isEditing ? 'Current Quantity' : 'Quantity'}</label>
                <input id="product-quantity" type="number" name="quantity" placeholder="e.g., 50" value={isEditing ? product?.quantity : formData.quantity} readOnly={isEditing} onChange={!isEditing ? handleInputChange : undefined} className={`w-full border-2 border-gray-200 px-3 py-2 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none text-sm ${isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`} disabled={isSubmitting && !isEditing} />
            </div>
            <div className="space-y-1.5">
                <label htmlFor="low-stock-threshold" className="text-xs font-medium text-gray-700 flex items-center gap-1" title="Set a custom alert when quantity falls to this level. Leave blank for default.">Low Stock Alert <Info className="w-3 h-3 text-gray-400 cursor-help" /></label>
                <input id="low-stock-threshold" type="number" name="lowStockThreshold" placeholder={`Default: ${LOW_STOCK_THRESHOLD}`} className="w-full border-2 border-gray-200 px-3 py-2 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none text-sm" value={formData.lowStockThreshold} onChange={handleInputChange} disabled={isSubmitting} />
            </div>
        </div>
        {isEditing && product && (
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 space-y-2">
                <label htmlFor="stock-adjustment" className="text-xs font-medium text-indigo-800 block">Stock Adjustment</label>
                <div className="flex items-center gap-2">
                    <div className="flex-1 text-center">
                        <p className="text-xs text-gray-600">Adjustment (+/-)</p>
                        <input id="stock-adjustment" type="number" placeholder="e.g., 10 or -5" value={stockAdjustment} onChange={(e) => setStockAdjustment(e.target.value === '' ? '' : Number(e.target.value))} className="w-full mt-1 border-2 text-center border-gray-200 px-3 py-2 rounded-xl focus:border-[#5a4fcf] focus:ring-2 focus:ring-[#5a4fcf]/20 transition-all outline-none text-sm" disabled={isSubmitting} />
                    </div>
                    <div className="text-2xl text-gray-400 font-light">=</div>
                    <div className="flex-1 text-center">
                        <p className="text-xs text-gray-600">New Total Stock</p>
                        <div className="mt-1 font-bold text-lg text-[#5a4fcf]">{(product.quantity || 0) + (Number(stockAdjustment) || 0)}</div>
                    </div>
                </div>
            </div>
        )}
    </>
);

interface PricingSectionProps {
    isSubmitting: boolean;
    formData: ProductFormState;
    handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    isGstInclusive: boolean;
    setIsGstInclusive: (val: boolean) => void;
    showCalculation: boolean;
    priceCalculations: { basePrice: number; gstAmount: number; totalPrice: number };
}

const PricingSection: FC<PricingSectionProps> = ({ isSubmitting, formData, handleInputChange, isGstInclusive, setIsGstInclusive, showCalculation, priceCalculations }) => (
    <>
        <div className={`grid grid-cols-1 ${!isGstInclusive ? 'sm:grid-cols-2' : ''} gap-3`}>
            <div className="space-y-1.5">
                <label htmlFor="selling-price" className="text-xs font-medium text-gray-700">{isGstInclusive ? 'Total Price (incl. GST)' : 'Selling Price (excl. GST)'}</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
                    <input id="selling-price" type="number" name="sellingPrice" placeholder="e.g., 199.99" className="w-full border-2 border-gray-200 pl-7 pr-3 py-2 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-sm" value={formData.sellingPrice} onChange={handleInputChange} disabled={isSubmitting} />
                </div>
            </div>
            {!isGstInclusive && (
                <div className="space-y-1.5">
                    <label htmlFor="gst-rate" className="text-xs font-medium text-gray-700">GST Rate</label>
                    <div className="relative">
                        <input id="gst-rate" type="number" name="gstRate" placeholder="e.g., 18" className="w-full border-2 border-gray-200 px-3 py-2 pr-10 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all outline-none text-sm" value={formData.gstRate} onChange={handleInputChange} disabled={isSubmitting} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">%</span>
                    </div>
                </div>
            )}
        </div>
        <div className="flex items-center justify-center p-0.5 rounded-lg bg-gray-200">
            <button type="button" onClick={() => setIsGstInclusive(false)} disabled={isSubmitting} className={`w-1/2 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${!isGstInclusive ? 'bg-white text-[#5a4fcf] shadow-sm' : 'text-gray-600'}`}>Exclusive GST</button>
            <button type="button" onClick={() => setIsGstInclusive(true)} disabled={isSubmitting} className={`w-1/2 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${isGstInclusive ? 'bg-white text-[#5a4fcf] shadow-sm' : 'text-gray-600'}`}>Inclusive GST</button>
        </div>
        {showCalculation && !isGstInclusive && (
            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border animate-in fade-in duration-300">
                <div className="text-center"><span className="text-[10px] font-medium text-gray-500 block">Base Price</span><div className="text-gray-800 font-semibold text-xs mt-0.5">{formatCurrency(priceCalculations.basePrice)}</div></div>
                <div className="text-center"><span className="text-[10px] font-medium text-gray-500 block">GST Amount</span><div className="text-gray-800 font-semibold text-xs mt-0.5">{formatCurrency(priceCalculations.gstAmount)}</div></div>
                <div className="text-center"><span className="text-[10px] font-medium text-gray-500 block">Total Price</span><div className="text-gray-900 font-bold text-sm mt-0.5">{formatCurrency(priceCalculations.totalPrice)}</div></div>
            </div>
        )}
    </>
);

interface ProfitSectionProps {
    isSubmitting: boolean;
    formData: ProductFormState;
    handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    showProfitCalculation: boolean;
    profitCalculations: { profitPerUnit: number; totalProfit: number; quantity: number };
}

const ProfitSection: FC<ProfitSectionProps> = ({ isSubmitting, formData, handleInputChange, showProfitCalculation, profitCalculations }) => (
    <>
        <div className="space-y-1.5">
            <label htmlFor="profit-per-unit" className="text-xs font-medium text-gray-700">Profit Per Unit</label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
                <input id="profit-per-unit" type="number" name="profitPerUnit" placeholder="e.g., 50.00" className="w-full border-2 border-gray-200 pl-7 pr-3 py-2 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none text-sm" value={formData.profitPerUnit} onChange={handleInputChange} disabled={isSubmitting} />
            </div>
        </div>
        {showProfitCalculation && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                        <span className="text-[10px] font-medium text-gray-600 block">Profit/Unit</span>
                        <div className="text-green-700 font-semibold text-xs mt-0.5">{formatCurrency(profitCalculations.profitPerUnit)}</div>
                    </div>
                    <div className="text-xl text-gray-400 font-light px-2">×</div>
                    <div className="text-center flex-1">
                        <span className="text-[10px] font-medium text-gray-600 block">Quantity</span>
                        <div className="text-gray-700 font-semibold text-xs mt-0.5">{profitCalculations.quantity}</div>
                    </div>
                    <div className="text-xl text-gray-400 font-light px-2">=</div>
                    <div className="text-center flex-1">
                        <span className="text-[10px] font-medium text-gray-600 block">Total Profit</span>
                        <div className="text-green-600 font-bold text-sm mt-0.5">{formatCurrency(profitCalculations.totalProfit)}</div>
                    </div>
                </div>
            </div>
        )}
    </>
);

interface ProductFormFooterProps {
    onClose: () => void;
    isSubmitting: boolean;
    handleFormSubmit: () => Promise<void>;
    isEditing: boolean;
}

const ProductFormFooter: FC<ProductFormFooterProps> = ({ onClose, isSubmitting, handleFormSubmit, isEditing }) => (
    <div className="bg-gray-50 px-4 py-3 flex justify-end gap-2.5 border-t">
        <button onClick={onClose} disabled={isSubmitting} className="px-5 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors text-sm disabled:opacity-50">Cancel</button>
        <button
            onClick={handleFormSubmit}
            disabled={isSubmitting}
            className={`px-5 py-2 text-white rounded-xl font-medium shadow-lg transition-all text-sm flex items-center justify-center min-w-[120px] ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#5a4fcf] to-[#7b68ee] hover:from-[#4a3fb5] hover:to-[#6b58de] shadow-[#5a4fcf]/30'}`}
        >
            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : (isEditing ? 'Save Changes' : 'Add Product')}
        </button>
    </div>
);

const ProductFormModal: FC<ProductFormModalProps> = ({ product, onSave, onClose }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getInitialState = useCallback((): ProductFormState => {
        if (product) {
            return {
                ...product,
                quantity: product.quantity ?? '',
                buyingPrice: product.buyingPrice ?? '',
                sellingPrice: product.sellingPrice ?? '',
                gstRate: product.gstRate ?? '',
                lowStockThreshold: product.lowStockThreshold ?? '',
                profitPerUnit: product.profitPerUnit ?? ''
            };
        }
        return {
            name: "", sku: "", quantity: '', buyingPrice: '', sellingPrice: '',
            gstRate: '', image: '', lowStockThreshold: '', profitPerUnit: ''
        };
    }, [product]);

    const [formData, setFormData] = useState<ProductFormState>(getInitialState);
    const [imagePreview, setImagePreview] = useState<string | null>(product?.image || null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isGstInclusive, setIsGstInclusive] = useState(false);
    const [stockAdjustment, setStockAdjustment] = useState<number | ''>('');
    const isEditing = !!product?.id;

    const priceCalculations = useMemo(() => {
        const priceInput = Number(formData.sellingPrice) || 0;
        const rate = Number(formData.gstRate) || 0;
        if (priceInput <= 0 || rate < 0) return { basePrice: priceInput, gstAmount: 0, totalPrice: priceInput };
        if (isGstInclusive) {
            const totalPrice = priceInput;
            const basePrice = totalPrice / (1 + rate / 100);
            return { basePrice, gstAmount: totalPrice - basePrice, totalPrice };
        }
        const basePrice = priceInput;
        const gstAmount = basePrice * (rate / 100);
        return { basePrice, gstAmount, totalPrice: basePrice + gstAmount };
    }, [formData.sellingPrice, formData.gstRate, isGstInclusive]);

    const profitCalculations = useMemo(() => {
        const profitPerUnit = Number(formData.profitPerUnit) || 0;
        const quantity = isEditing
            ? Math.max(0, (product.quantity || 0) + (Number(stockAdjustment) || 0))
            : Number(formData.quantity) || 0;
        const totalProfit = profitPerUnit * quantity;
        return { profitPerUnit, totalProfit, quantity };
    }, [formData.profitPerUnit, formData.quantity, stockAdjustment, isEditing, product?.quantity]);

    const handleModalScan = useCallback((result: DetectedBarcode[]) => {
        if (result && result[0]) {
            setFormData(prev => ({ ...prev, sku: result[0].rawValue }));
            setIsScannerOpen(false);
        }
    }, []);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value }));
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleFormSubmit = async () => {
        if (isSubmitting) return;

        const finalQuantity = isEditing
            ? Math.max(0, (product.quantity || 0) + (Number(stockAdjustment) || 0))
            : Number(formData.quantity) || 0;

        const dataToSave: ProductFormData = {
            ...formData,
            quantity: finalQuantity,
            sellingPrice: priceCalculations.basePrice,
            gstRate: Number(formData.gstRate) || 0,
            buyingPrice: Number(formData.buyingPrice) || 0,
            lowStockThreshold: Number(formData.lowStockThreshold) || undefined,
            profitPerUnit: Number(formData.profitPerUnit) || undefined,
        };

        setIsSubmitting(true);
        try {
            await onSave(dataToSave, imageFile);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const showCalculation = Number(formData.sellingPrice) > 0 && Number(formData.gstRate) >= 0;
    const showProfitCalculation = Number(formData.profitPerUnit) > 0 && profitCalculations.quantity > 0;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-3 animate-in fade-in duration-200">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.3 }} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                <ProductHeader isEditing={isEditing} isSubmitting={isSubmitting} onClose={onClose} />

                <div className="p-4 space-y-3.5 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
                    {isScannerOpen ? (
                        <div className="space-y-3">
                            <div className="w-full rounded-xl overflow-hidden border-2 border-gray-200 aspect-square">
                                <Scanner onScan={handleModalScan} constraints={{ facingMode: "environment" }} scanDelay={300} styles={{ container: { width: '100%', height: '100%' } }} />
                            </div>
                            <button onClick={() => setIsScannerOpen(false)} className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-medium transition-colors text-sm">Cancel Scan</button>
                        </div>
                    ) : (
                        <>
                            <ProductImageUpload isSubmitting={isSubmitting} imagePreview={imagePreview} handleImageChange={handleImageChange} fileInputRef={fileInputRef} />
                            <ProductBasicDetails formData={formData} handleInputChange={handleInputChange} isSubmitting={isSubmitting} setIsScannerOpen={setIsScannerOpen} />
                            <StockManagement isEditing={isEditing} isSubmitting={isSubmitting} formData={formData} product={product} handleInputChange={handleInputChange} stockAdjustment={stockAdjustment} setStockAdjustment={setStockAdjustment} />
                            <PricingSection isSubmitting={isSubmitting} formData={formData} handleInputChange={handleInputChange} isGstInclusive={isGstInclusive} setIsGstInclusive={setIsGstInclusive} showCalculation={showCalculation} priceCalculations={priceCalculations} />
                            <ProfitSection isSubmitting={isSubmitting} formData={formData} handleInputChange={handleInputChange} showProfitCalculation={showProfitCalculation} profitCalculations={profitCalculations} />
                        </>
                    )}
                </div>

                <ProductFormFooter isSubmitting={isSubmitting} onClose={onClose} handleFormSubmit={handleFormSubmit} isEditing={isEditing} />
            </motion.div>
        </div>
    );
};

const LockedOverlay = ({ title }: { title: string }) => (
    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300 m-[-1px]">
        <div className="bg-white p-3 rounded-full shadow-lg mb-2">
            <Lock className="w-5 h-5 text-amber-500" />
        </div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Free Tier Selection</p>
        <h3 className="text-sm font-bold text-gray-800 mb-1">{title}</h3>
        <p className="text-[10px] text-gray-500 font-bold">Switch your active module in Settings</p>
    </div>
);

const Inventory: FC = () => {
    const { data: session, status: sessionStatus, update } = useSession();
    const [products, setProducts] = useState<Product[]>([]);
    const [fetchStatus, setFetchStatus] = useState<'loading' | 'succeeded' | 'failed'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; product: ProductFormData | null }>({ isOpen: false, product: null });
    const [swipedProductId, setSwipedProductId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [activeFilter, setActiveFilter] = useState<'all' | 'low' | 'out'>('all');
    const [isMounted, setIsMounted] = useState(false);
    const [updatedProductInfo, setUpdatedProductInfo] = useState<UpdateInfo | null>(null);
    const [activeView, setActiveView] = useState<'inventory' | 'services'>('inventory');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refreshProducts = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    useEffect(() => { setIsMounted(true); }, []);
 

    useEffect(() => {
        if (updatedProductInfo) {
            const timer = setTimeout(() => setUpdatedProductInfo(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [updatedProductInfo]);

    const filteredProducts = useMemo(() => {
        let result = products;

        if (activeFilter === 'low') {
            result = result.filter(p => p.quantity > 0 && p.quantity <= (p.lowStockThreshold ?? LOW_STOCK_THRESHOLD));
        } else if (activeFilter === 'out') {
            result = result.filter(p => p.quantity === 0);
        }

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(lowercasedQuery) ||
                (p.sku && p.sku.toLowerCase().includes(lowercasedQuery))
            );
        }

        return result;
    }, [products, searchQuery, activeFilter]);

    const stats = useMemo(() => {
        return {
            totalProducts: products.length,
            lowStock: products.filter(p => p.quantity > 0 && p.quantity <= (p.lowStockThreshold ?? LOW_STOCK_THRESHOLD)).length,
            outOfStock: products.filter(p => p.quantity === 0).length,
        };
    }, [products]);

    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({ count: filteredProducts.length, getScrollElement: () => parentRef.current, estimateSize: () => 90, overscan: 5 });

    useEffect(() => {
        if (sessionStatus === 'authenticated') {
            const fetchProducts = async () => {
                setFetchStatus('loading');
                try {
                    const response = await fetch('/api/products');
                    if (!response.ok) throw new Error('Failed to fetch products');
                    const data = await response.json();
                    setProducts(Array.isArray(data) ? data : []);
                    setFetchStatus('succeeded');
                } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'An unknown error occurred');
                    setFetchStatus('failed');
                }
            };
            fetchProducts();
        } else if (sessionStatus === 'unauthenticated') {
            setProducts([]);
            setFetchStatus('succeeded');
        }
    }, [sessionStatus, refreshTrigger, activeView]);

    const handleExcelUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet) as ExcelRow[];

            const uploaded = mapExcelRowsToProducts(rows);

            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(uploaded)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to upload products');
            }

            refreshProducts();
            alert(`${uploaded.length} products processed successfully!`);
        } catch (err: unknown) {
            alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            e.target.value = '';
        }
    }, [refreshProducts]);

    const uploadProductImage = async (imageFile: File): Promise<string> => {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1024, useWebWorker: true };
        const compressedFile = await imageCompression(imageFile, options);
        const formData = new FormData();
        formData.append('file', compressedFile);
        const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.message || 'Image upload failed');
        return uploadData.url;
    };

    const handleSaveSuccess = async (response: Response, isEditing: boolean, productData: ProductFormData, originalQuantity: number) => {
        if (isEditing) {
            const savedProductRaw = await response.json();
            const savedProduct = {
                ...savedProductRaw,
                id: savedProductRaw.id || savedProductRaw._id?.toString() || productData.id
            };
            setProducts(prevProducts => prevProducts.map(p => p.id === productData.id ? savedProduct : p));
            const quantityChange = savedProduct.quantity - originalQuantity;
            if (quantityChange !== 0) setUpdatedProductInfo({ id: savedProduct.id, change: quantityChange });
        } else {
            const allProducts = await response.json();
            setProducts(allProducts);
        }
        setModalState({ isOpen: false, product: null });
    };

    const handleSaveProduct = useCallback(async (productData: ProductFormData, imageFile: File | null) => {
        const isEditing = !!productData.id;
        const originalQuantity = isEditing ? (products.find(p => p.id === productData.id)?.quantity || 0) : 0;

        try {
            let imageUrl = productData.image || '';
            if (imageFile) {
                try {
                    imageUrl = await uploadProductImage(imageFile);
                } catch (error) {
                    console.error("Compression/Upload Error:", error);
                    alert("Failed to process image. Please try a smaller file.");
                    return;
                }
            }

            const response = await fetch(isEditing ? `/api/products/${productData.id}` : '/api/products', {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...productData, image: imageUrl })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'create'} product`);
            }

            await handleSaveSuccess(response, isEditing, productData, originalQuantity);
        } catch (err: unknown) {
            alert(`Error: ${err instanceof Error ? err.message : 'Could not save product'}`);
        }
    }, [products]);

    const handleDeleteProduct = useCallback(async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            if (response.ok || response.status === 404) {
                setProducts(prevProducts => prevProducts.filter(p => p.id !== id));
            } else {
                throw new Error('Failed to delete product on the server.');
            }
        } catch (err: unknown) {
            alert(`Error: ${err instanceof Error ? err.message : 'Could not delete product'}`);
        }
    }, []);

    const renderContent = () => {
        if (!isMounted || sessionStatus === 'loading' || fetchStatus === 'loading') {
            return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[#5a4fcf]" /> <span className="ml-2">Loading Products...</span></div>;
        }
        if (sessionStatus === 'unauthenticated') return <div className="text-center h-64 flex flex-col justify-center items-center bg-gray-50 rounded-lg"><Info className="w-8 h-8 mb-2 text-gray-400" /> <h3 className="font-semibold">Please Log In</h3><p className="text-gray-500">Log in to manage your inventory.</p></div>;
        if (fetchStatus === 'failed') return <div className="flex flex-col items-center justify-center h-64 bg-red-50 text-red-700 rounded-lg p-4"><Info className="w-8 h-8 mb-2" /><strong>Error:</strong> {error}</div>;
        if (products.length === 0) return <div className="text-center h-64 flex flex-col justify-center items-center bg-gray-50 rounded-lg"><Info className="w-8 h-8 mb-2 text-gray-400" /> <h3 className="font-semibold">No Products Found</h3><p className="text-gray-500">Click &quot;Add Product&quot; to get started.</p></div>;
        if (filteredProducts.length === 0) return (
            <div className="text-center h-64 flex flex-col justify-center items-center bg-gray-50 rounded-lg">
                <Search className="w-8 h-8 mb-2 text-gray-400" />
                <h3 className="font-semibold">No Matching Products</h3>
                <p className="text-gray-500">Try clearing filters or search query.</p>
                <button onClick={() => { setActiveFilter('all'); setSearchQuery(''); }} className="mt-4 text-[#5a4fcf] font-medium underline">Clear all filters</button>
            </div>
        );

        return (
            <>
                <DesktopProductTable products={filteredProducts} onEdit={(p) => setModalState({ isOpen: true, product: p })} onDelete={handleDeleteProduct} updatedProductInfo={updatedProductInfo} />
                <div ref={parentRef} className="md:hidden pb-20 h-[calc(100vh-280px)] overflow-y-auto">
                    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                        {rowVirtualizer.getVirtualItems().map(virtualItem => (
                            <div key={virtualItem.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)`, padding: '4px 0' }}>
                                <MobileProductCard product={filteredProducts[virtualItem.index]} isSwiped={swipedProductId === filteredProducts[virtualItem.index].id} onSwipe={setSwipedProductId} onEdit={(p) => setModalState({ isOpen: true, product: p })} onDelete={handleDeleteProduct} updatedProductInfo={updatedProductInfo} />
                            </div>
                        ))}
                    </div>
                </div>
            </>
        );
    };

    if (!isMounted) {
        return <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 font-sans"><div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[#5a4fcf]" /></div></div>;
    }

    return (
        <div className="p-4 space-y-4 pb-10">
            <div className="max-w-2xl mx-auto space-y-4">
                {/* Unified Toggle Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="grid grid-cols-2 p-1.5 gap-1.5">
                        <button
                            onClick={() => setActiveView('inventory')}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${activeView === 'inventory'
                                ? 'bg-indigo-50 ring-1 ring-indigo-200'
                                : 'hover:bg-gray-50'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${activeView === 'inventory' ? 'bg-[#5a4fcf] text-white shadow-md' : 'bg-gray-100 text-gray-400'
                                }`}>
                                <Package className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h3 className={`text-sm font-bold leading-tight ${activeView === 'inventory' ? 'text-[#5a4fcf]' : 'text-gray-400'}`}>Inventory</h3>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">Stock levels</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveView('services')}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${activeView === 'services'
                                ? 'bg-indigo-50 ring-1 ring-indigo-200'
                                : 'hover:bg-gray-50'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${activeView === 'services' ? 'bg-[#5a4fcf] text-white shadow-md' : 'bg-gray-100 text-gray-400'
                                }`}>
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h3 className={`text-sm font-bold leading-tight ${activeView === 'services' ? 'text-[#5a4fcf]' : 'text-gray-400'}`}>Services</h3>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">Business list</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Content Area with Lock Overlay */}
                <div className="relative">
                    {session?.user?.plan !== 'PRO' && (
                        <>
                            {activeView === 'inventory' && session?.user?.selectedModule === 'SERVICE' && (
                                <LockedOverlay title="Inventory Inactive" />
                            )}
                            {activeView === 'services' && session?.user?.selectedModule === 'INVENTORY' && (
                                <LockedOverlay title="Services Inactive" />
                            )}
                        </>
                    )}

                    {activeView === 'inventory' ? (
                        <div className="space-y-4">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-3.5">
                                <div className="space-y-3.5">
                                    <div className="flex flex-col md:flex-row justify-end md:items-center gap-3">
                                        <div className="hidden sm:flex items-center gap-2">
                                            <label className="flex items-center cursor-pointer bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                                                <Upload className="w-3.5 h-3.5 mr-1.5" />
                                                Upload Excel
                                                <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} className="hidden" />
                                            </label>
                                            <button
                                                onClick={() => setModalState({ isOpen: true, product: null })}
                                                className="flex items-center gap-1 bg-[#5a4fcf] hover:bg-[#4a3fb5] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add Product
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            onClick={() => setActiveFilter('all')}
                                            className={`relative group flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-300 active:scale-95 text-center h-24 ${activeFilter === 'all'
                                                ? 'bg-indigo-50 border-indigo-500'
                                                : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-colors ${activeFilter === 'all' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                                                <Package className="w-4 h-4" />
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wide ${activeFilter === 'all' ? 'text-indigo-500' : 'text-gray-400'}`}>All Stock</span>
                                            <p className={`text-lg font-extrabold ${activeFilter === 'all' ? 'text-gray-900' : 'text-gray-700'}`}>{stats.totalProducts}</p>
                                            {activeFilter === 'all' && (
                                                <motion.div layoutId="inventory-active-indicator" className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-500" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                                            )}
                                        </button>

                                        <button
                                            onClick={() => setActiveFilter('low')}
                                            className={`relative group flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-300 active:scale-95 text-center h-24 ${activeFilter === 'low'
                                                ? 'bg-orange-50 border-orange-500'
                                                : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-colors ${activeFilter === 'low' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                                                <AlertTriangle className="w-4 h-4" />
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wide ${activeFilter === 'low' ? 'text-orange-500' : 'text-gray-400'}`}>Low Stock</span>
                                            <p className={`text-lg font-extrabold ${activeFilter === 'low' ? 'text-gray-900' : 'text-gray-700'}`}>{stats.lowStock}</p>
                                            {activeFilter === 'low' && (
                                                <motion.div layoutId="inventory-active-indicator" className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-orange-500" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                                            )}
                                        </button>

                                        <button
                                            onClick={() => setActiveFilter('out')}
                                            className={`relative group flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-300 active:scale-95 text-center h-24 ${activeFilter === 'out'
                                                ? 'bg-red-50 border-red-500'
                                                : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-colors ${activeFilter === 'out' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                                                <AlertCircle className="w-4 h-4" />
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wide ${activeFilter === 'out' ? 'text-red-500' : 'text-gray-400'}`}>Out Stock</span>
                                            <p className={`text-lg font-extrabold ${activeFilter === 'out' ? 'text-gray-900' : 'text-gray-700'}`}>{stats.outOfStock}</p>
                                            {activeFilter === 'out' && (
                                                <motion.div layoutId="inventory-active-indicator" className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-red-500" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="relative w-full group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search products by name or SKU..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 text-sm border-2 border-transparent bg-white rounded-2xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-gray-400 font-medium"
                                />
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                {renderContent()}
                            </div>

                            {session?.user?.plan !== 'PRO' && (activeView === 'inventory' && session?.user?.selectedModule === 'SERVICE') ? null : (
                                <div className="sm:hidden fixed bottom-24 right-4 flex flex-col items-center gap-3 z-40">
                                    <label className="w-12 h-12 flex items-center justify-center cursor-pointer bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg border-2 border-white transition-transform active:scale-95">
                                        <Upload className="w-5 h-5" />
                                        <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} className="hidden" />
                                    </label>
                                    <button
                                        onClick={() => setModalState({ isOpen: true, product: null })}
                                        className="w-14 h-14 flex items-center justify-center bg-[#5a4fcf] hover:bg-[#4a3fb5] text-white rounded-full shadow-xl border-2 border-white transition-transform active:scale-95"
                                    >
                                        <Plus className="w-6 h-6" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-3.5">
                            <ServicesView isLocked={session?.user?.plan !== 'PRO' && session?.user?.selectedModule === 'INVENTORY'} />
                        </div>
                    )}
                </div>
            </div>
            {modalState.isOpen && <ProductFormModal product={modalState.product} onSave={handleSaveProduct} onClose={() => setModalState({ isOpen: false, product: null })} />}
        </div>
    );

};

export default Inventory;