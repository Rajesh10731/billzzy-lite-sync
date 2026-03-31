'use client';

import React, { useState, useEffect, FC, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Plus, Search, Edit2, Trash2, X, 
  Loader2, Briefcase, Info
} from 'lucide-react';
import { motion, AnimatePresence, useAnimationControls, PanInfo } from 'framer-motion';

interface IService {
  _id: string;
  name: string;
  price: number;
  category?: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
};

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
          <p className="text-sm font-bold text-gray-900">{formatCurrency(service.price)}</p>
        </div>
      </motion.div>
    </div>
  );
});
MobileServiceCard.displayName = 'MobileServiceCard';

const LoadingState: FC = () => (
    <div className="flex h-full items-center justify-center pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#5a4fcf]" />
    </div>
);

interface StatsSectionProps {
    activeTab: 'total' | 'categories';
    setActiveTab: (tab: 'total' | 'categories') => void;
    servicesCount: number;
    categoriesCount: number;
    showCategoryFilter: boolean;
    setShowCategoryFilter: (show: boolean) => void;
    clearFilters: () => void;
}

const StatsSection: FC<StatsSectionProps> = ({
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

const SearchBar: FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => (
    <div className="relative w-full group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
        <input
            type="text"
            placeholder="Search services by name or category..."
            className="w-full pl-11 pr-4 py-3 text-sm border-2 border-transparent bg-white rounded-2xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-gray-400 font-medium"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

interface PageHeaderProps {
    onAddService: () => void;
}

const PageHeader: FC<PageHeaderProps> = ({ onAddService }) => (
    <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#5a4fcf] rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div>
                <h3 className="text-sm font-bold text-gray-900 leading-tight">Services</h3>
                <p className="text-xs text-gray-500">Manage business services</p>
            </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
            <button
                onClick={onAddService}
                className="flex items-center gap-2 bg-[#5a4fcf] hover:bg-[#4a3fb5] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
                <Plus size={14} />
                Add New Service
            </button>
        </div>
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
                                <p className="text-sm font-bold text-gray-900">{formatCurrency(service.price)}</p>
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
                            <label className="text-xs font-medium text-gray-700">Service Name</label>
                            <input
                                type="text"
                                required
                                className="w-full border-2 border-gray-200 px-3 py-2 rounded-xl focus:border-[#5a4fcf] focus:ring-2 focus:ring-[#5a4fcf]/20 transition-all outline-none text-sm"
                                placeholder="e.g., Haircut, Consultation"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700">Service Price</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
                                <input
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
                            <label className="text-xs font-medium text-gray-700">Category</label>
                            <input
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
                                                    <div
                                                        key={cat}
                                                        className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer transition-colors"
                                                        onClick={() => {
                                                            setFormData({ ...formData, category: cat });
                                                            setShowCategoryDropdown(false);
                                                        }}
                                                    >
                                                        {cat}
                                                    </div>
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


export default function ServicesPage() {
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

  useEffect(() => {
    if (status === 'authenticated') {
      fetchServices();
    }
  }, [status]);

  const fetchServices = async () => {
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
  };

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
      price: parseFloat(formData.price)
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
    return <LoadingState />;
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header Section matching Inventory */}
        <div className={`bg-white rounded-xl shadow-sm border transition-all duration-300 p-3.5 space-y-3.5 ${
          activeTab === 'total' 
            ? 'border-indigo-200 ring-2 ring-indigo-50/50 shadow-indigo-50/20' 
            : 'border-[#5a4fcf]/40 ring-2 ring-[#5a4fcf]/10 shadow-[#5a4fcf]/5'
        }`}>
          <PageHeader onAddService={() => handleOpenModal()} />
          <StatsSection 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            servicesCount={services.length} 
            categoriesCount={new Set(services.map(s => s.category?.toLowerCase().trim() || 'general')).size}
            showCategoryFilter={showCategoryFilter}
            setShowCategoryFilter={setShowCategoryFilter}
            clearFilters={clearFilters}
          />
        </div>

        <CategoryFilterBar 
          show={showCategoryFilter} 
          selectedCategory={selectedCategory} 
          setSelectedCategory={setSelectedCategory} 
          existingCategories={existingCategories} 
        />

        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        <ServiceTable services={filteredServices} onEdit={handleOpenModal} onDelete={handleDelete} />

        <MobileServiceList 
          services={filteredServices} 
          swipedId={swipedId} 
          setSwipedId={setSwipedId} 
          onEdit={handleOpenModal} 
          onDelete={handleDelete} 
        />

        {/* Floating FAB for mobile like Inventory */}
        <div className="sm:hidden fixed bottom-24 right-4 z-40">
          <button 
            onClick={() => handleOpenModal()}
            className="w-14 h-14 flex items-center justify-center bg-[#5a4fcf] hover:bg-[#4a3fb5] text-white rounded-full shadow-xl border-2 border-white transition-transform active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <ServiceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingService={editingService}
        formData={formData}
        setFormData={setFormData}
        submitting={submitting}
        onSubmit={handleSubmit}
        existingCategories={existingCategories}
        showCategoryDropdown={showCategoryDropdown}
        setShowCategoryDropdown={setShowCategoryDropdown}
        categoryDropdownRef={categoryDropdownRef}
      />
    </div>
  );
}
