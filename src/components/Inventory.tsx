'use client';

import React, { useState, useEffect, FC, ChangeEvent, useRef, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
import { Upload, Edit2, Plus, X, Trash2, Search, Image as ImageIcon, Camera, Loader2, Info, AlertTriangle, Package, AlertCircle } from "lucide-react";
import { motion, useAnimationControls, PanInfo, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Scanner } from "@yudiel/react-qr-scanner";
import imageCompression from 'browser-image-compression';

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
                onClick={() => { if (isSwiped) { controls.start({ x: 0 }); onSwipe(null); } }}
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
                <div className="bg-gradient-to-r from-[#5a4fcf] to-[#7b68ee] px-4 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-white">{product?.id ? 'Edit Product' : 'Add New Product'}</h2>
                        <p className="text-indigo-100 text-xs mt-0.5">{product?.id ? 'Update product information' : 'Fill in the details below'}</p>
                    </div>
                    <button onClick={onClose} disabled={isSubmitting} className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"><X className="w-5 h-5" /></button>
                </div>

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
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Product Image</label>
                                <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#5a4fcf] transition-colors" onClick={() => !isSubmitting && fileInputRef.current?.click()}>
                                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                                    {imagePreview ? <div className="relative w-full h-full"><Image src={imagePreview} alt="Product Preview" fill sizes="(max-width: 768px) 100vw, 512px" style={{ objectFit: 'contain' }} className="p-2" /></div> : <div className="text-center text-gray-500"><ImageIcon className="w-8 h-8 mx-auto mb-1.5" /><p className="text-xs">Click to upload</p></div>}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Product Name</label>
                                <input type="text" name="name" placeholder="Enter product name" className="w-full border-2 border-gray-200 px-3 py-2 rounded-xl focus:border-[#5a4fcf] focus:ring-2 focus:ring-[#5a4fcf]/20 transition-all outline-none text-sm" value={formData.name} onChange={handleInputChange} disabled={isSubmitting} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Product ID (SKU)</label>
                                <div className="relative">
                                    <input type="text" name="sku" placeholder="SKU, Barcode, or custom ID" className="w-full border-2 border-gray-200 px-3 py-2 pr-12 rounded-xl focus:border-[#5a4fcf] focus:ring-2 focus:ring-[#5a4fcf]/20 transition-all outline-none font-mono text-xs" value={formData.sku || ''} onChange={handleInputChange} disabled={isSubmitting} />
                                    <button type="button" onClick={() => setIsScannerOpen(true)} disabled={isSubmitting} className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 bg-gradient-to-r from-[#5a4fcf] to-[#7b68ee] text-white rounded-xl hover:from-[#4a3fb5] hover:to-[#6b58de] shadow-md shadow-[#5a4fcf]/20 transition-all active:scale-95" aria-label="Scan barcode"><Camera className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-700">{isEditing ? 'Current Quantity' : 'Quantity'}</label>
                                    <input type="number" name="quantity" placeholder="e.g., 50" value={isEditing ? product.quantity : formData.quantity} readOnly={isEditing} onChange={!isEditing ? handleInputChange : undefined} className={`w-full border-2 border-gray-200 px-3 py-2 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none text-sm ${isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`} disabled={isSubmitting && !isEditing} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-700 flex items-center gap-1" title="Set a custom alert when quantity falls to this level. Leave blank for default.">Low Stock Alert <Info className="w-3 h-3 text-gray-400 cursor-help" /></label>
                                    <input type="number" name="lowStockThreshold" placeholder={`Default: ${LOW_STOCK_THRESHOLD}`} className="w-full border-2 border-gray-200 px-3 py-2 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none text-sm" value={formData.lowStockThreshold} onChange={handleInputChange} disabled={isSubmitting} />
                                </div>
                            </div>

                            {isEditing && (
                                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 space-y-2">
                                    <label className="text-xs font-medium text-indigo-800 block">Stock Adjustment</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 text-center">
                                            <p className="text-xs text-gray-600">Adjustment (+/-)</p>
                                            <input type="number" placeholder="e.g., 10 or -5" value={stockAdjustment} onChange={(e) => setStockAdjustment(e.target.value === '' ? '' : Number(e.target.value))} className="w-full mt-1 border-2 text-center border-gray-200 px-3 py-2 rounded-xl focus:border-[#5a4fcf] focus:ring-2 focus:ring-[#5a4fcf]/20 transition-all outline-none text-sm" disabled={isSubmitting} />
                                        </div>
                                        <div className="text-2xl text-gray-400 font-light">=</div>
                                        <div className="flex-1 text-center">
                                            <p className="text-xs text-gray-600">New Total Stock</p>
                                            <div className="mt-1 font-bold text-lg text-[#5a4fcf]">{(product.quantity || 0) + (Number(stockAdjustment) || 0)}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className={`grid grid-cols-1 ${!isGstInclusive ? 'sm:grid-cols-2' : ''} gap-3`}>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-700">{isGstInclusive ? 'Total Price (incl. GST)' : 'Selling Price (excl. GST)'}</label>
                                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span><input type="number" name="sellingPrice" placeholder="e.g., 199.99" className="w-full border-2 border-gray-200 pl-7 pr-3 py-2 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-sm" value={formData.sellingPrice} onChange={handleInputChange} disabled={isSubmitting} /></div>
                                </div>
                                {!isGstInclusive && <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">GST Rate</label><div className="relative"><input type="number" name="gstRate" placeholder="e.g., 18" className="w-full border-2 border-gray-200 px-3 py-2 pr-10 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all outline-none text-sm" value={formData.gstRate} onChange={handleInputChange} disabled={isSubmitting} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">%</span></div></div>}
                            </div>
                            <div className="flex items-center justify-center p-0.5 rounded-lg bg-gray-200"><button type="button" onClick={() => setIsGstInclusive(false)} disabled={isSubmitting} className={`w-1/2 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${!isGstInclusive ? 'bg-white text-[#5a4fcf] shadow-sm' : 'text-gray-600'}`}>Exclusive GST</button><button type="button" onClick={() => setIsGstInclusive(true)} disabled={isSubmitting} className={`w-1/2 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${isGstInclusive ? 'bg-white text-[#5a4fcf] shadow-sm' : 'text-gray-600'}`}>Inclusive GST</button></div>
                            {showCalculation && !isGstInclusive && <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border animate-in fade-in duration-300"><div className="text-center"><label className="text-[10px] font-medium text-gray-500 block">Base Price</label><div className="text-gray-800 font-semibold text-xs mt-0.5">{formatCurrency(priceCalculations.basePrice)}</div></div><div className="text-center"><label className="text-[10px] font-medium text-gray-500 block">GST Amount</label><div className="text-gray-800 font-semibold text-xs mt-0.5">{formatCurrency(priceCalculations.gstAmount)}</div></div><div className="text-center"><label className="text-[10px] font-medium text-gray-500 block">Total Price</label><div className="text-gray-900 font-bold text-sm mt-0.5">{formatCurrency(priceCalculations.totalPrice)}</div></div></div>}

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Profit Per Unit</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
                                    <input
                                        type="number"
                                        name="profitPerUnit"
                                        placeholder="e.g., 50.00"
                                        className="w-full border-2 border-gray-200 pl-7 pr-3 py-2 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none text-sm"
                                        value={formData.profitPerUnit}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            {showProfitCalculation && (
                                <div className="bg-green-50 p-3 rounded-lg border border-green-200 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="text-center flex-1">
                                            <label className="text-[10px] font-medium text-gray-600 block">Profit/Unit</label>
                                            <div className="text-green-700 font-semibold text-xs mt-0.5">{formatCurrency(profitCalculations.profitPerUnit)}</div>
                                        </div>
                                        <div className="text-xl text-gray-400 font-light px-2">×</div>
                                        <div className="text-center flex-1">
                                            <label className="text-[10px] font-medium text-gray-600 block">Quantity</label>
                                            <div className="text-gray-700 font-semibold text-xs mt-0.5">{profitCalculations.quantity}</div>
                                        </div>
                                        <div className="text-xl text-gray-400 font-light px-2">=</div>
                                        <div className="text-center flex-1">
                                            <label className="text-[10px] font-medium text-gray-600 block">Total Profit</label>
                                            <div className="text-green-600 font-bold text-sm mt-0.5">{formatCurrency(profitCalculations.totalProfit)}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="bg-gray-50 px-4 py-3 flex justify-end gap-2.5 border-t">
                    <button onClick={onClose} disabled={isSubmitting} className="px-5 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors text-sm disabled:opacity-50">Cancel</button>
                    <button
                        onClick={handleFormSubmit}
                        disabled={isSubmitting}
                        className={`px-5 py-2 text-white rounded-xl font-medium shadow-lg transition-all text-sm flex items-center justify-center min-w-[120px] 
                            ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#5a4fcf] to-[#7b68ee] hover:from-[#4a3fb5] hover:to-[#6b58de] shadow-[#5a4fcf]/30'}`}
                    >
                        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : (product?.id ? 'Save Changes' : 'Add Product')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const Inventory: FC = () => {
    const { status: sessionStatus } = useSession();
    const [products, setProducts] = useState<Product[]>([]);
    const [fetchStatus, setFetchStatus] = useState<'loading' | 'succeeded' | 'failed'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; product: ProductFormData | null }>({ isOpen: false, product: null });
    const [swipedProductId, setSwipedProductId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [activeFilter, setActiveFilter] = useState<'all' | 'low' | 'out'>('all');
    const [isMounted, setIsMounted] = useState(false);
    const [updatedProductInfo, setUpdatedProductInfo] = useState<UpdateInfo | null>(null);
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

    // Summary Statistics Calculation - UPDATED for unique product count
    const stats = useMemo(() => {
        return products.reduce((acc, p) => {
            const threshold = p.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
            if (p.quantity === 0) {
                acc.outOfStock++;
            } else if (p.quantity <= threshold) {
                acc.lowStock++;
            }
            return acc;
        }, { totalProducts: products.length, lowStock: 0, outOfStock: 0 });
    }, [products]);

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
    }, [sessionStatus, refreshTrigger]);

    const handleExcelUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event: ProgressEvent<FileReader>) => {
            if (!event.target?.result) return;
            try {
                const data = new Uint8Array(event.target.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);

                const getColumn = (row: ExcelRow, headers: string[]): string | number | undefined => {
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

                const uploaded = rows.map((row) => ({
                    sku: String(getColumn(row, ["Product ID", "SKU"]) || ""),
                    name: String(getColumn(row, ["Product Name", "Name"]) || ""),
                    quantity: Number(getColumn(row, ["Quantity", "Qty"])) || 0,
                    buyingPrice: Number(getColumn(row, ["Buying Price"])) || 0,
                    sellingPrice: Number(getColumn(row, ["Selling Price"])) || 0,
                    gstRate: Number(getColumn(row, ["GST Rate", "GST"])) || 0,
                    profitPerUnit: Number(getColumn(row, ["Profit Per Unit", "Profit"])) || undefined
                }));

                const response = await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(uploaded)
                });
                if (!response.ok) throw new Error((await response.json()).message || 'Failed to upload products');

                refreshProducts();
                alert(`${uploaded.length} products processed successfully!`);
            } catch (err: unknown) {
                alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            } finally { e.target.value = ''; }
        };
        reader.readAsArrayBuffer(file);
    }, [refreshProducts]);

    const handleSaveProduct = useCallback(async (productData: ProductFormData, imageFile: File | null) => {
        const isEditing = !!productData.id;
        const originalQuantity = isEditing ? (products.find(p => p.id === productData.id)?.quantity || 0) : 0;

        try {
            let imageUrl = productData.image || '';
            if (imageFile) {
                const options = { maxSizeMB: 1, maxWidthOrHeight: 1024, useWebWorker: true };
                try {
                    const compressedFile = await imageCompression(imageFile, options);
                    const formData = new FormData();
                    formData.append('file', compressedFile);
                    const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
                    const uploadData = await uploadResponse.json();
                    if (!uploadResponse.ok) throw new Error(uploadData.message || 'Image upload failed');
                    imageUrl = uploadData.url;
                } catch (error) {
                    console.error("Compression/Upload Error:", error);
                    alert("Failed to process image. Please try a smaller file.");
                    return;
                }
            }

            const url = isEditing ? `/api/products/${productData.id}` : '/api/products';
            const method = isEditing ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...productData, image: imageUrl })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'create'} product`);
            }

            if (isEditing) {
                // PUT returns the single raw object (often with _id instead of id)
                const savedProductRaw = await response.json();
                const savedProduct = {
                    ...savedProductRaw,
                    id: savedProductRaw.id || savedProductRaw._id?.toString() || productData.id
                };

                setProducts(prevProducts => prevProducts.map(p => p.id === productData.id ? savedProduct : p));

                const quantityChange = savedProduct.quantity - originalQuantity;
                if (quantityChange !== 0) setUpdatedProductInfo({ id: savedProduct.id, change: quantityChange });
            } else {
                // POST returns the ENTIRE list of products (already transformed)
                const allProducts = await response.json();
                setProducts(allProducts);
            }

            setModalState({ isOpen: false, product: null });
        } catch (err: unknown) {
            alert(`Error: ${err instanceof Error ? err.message : 'Could not save product'}`);
        }
    }, [products]);

    const handleDeleteProduct = useCallback(async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            if (response.ok || response.status === 404) {
                // ✅ IMMEDIATE UI UPDATE
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3.5 space-y-3.5">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#5a4fcf] rounded-lg flex items-center justify-center">
                                <Package className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 leading-tight">Inventory</h3>
                                <p className="text-xs text-gray-500">Stock levels</p>
                            </div>
                        </div>

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
                        {/* All Stock */}
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

                        {/* Low Stock */}
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

                        {/* Out Stock */}
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
            </div>
            {modalState.isOpen && <ProductFormModal product={modalState.product} onSave={handleSaveProduct} onClose={() => setModalState({ isOpen: false, product: null })} />}
        </div>
    );

};

export default Inventory;