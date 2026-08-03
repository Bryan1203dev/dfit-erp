import React, { useState, useEffect } from 'react';
import { Product, ProductCategory, User, Role } from '../types';
import { dataService } from '../services/dataService';
import { Edit2, Trash, Plus, Archive, CheckCircle, AlertOctagon, FileDown, Search } from 'lucide-react';
import Modal from './Modal';

interface InventoryProps {
  products: Product[];
  currentUser: User;
  onUpdate: () => void;
}

const Inventory: React.FC<InventoryProps> = ({ products, currentUser, onUpdate }) => {
  const [view, setView] = useState<'LIST' | 'AUDIT'>('LIST');
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Audit State
  const [auditValues, setAuditValues] = useState<Record<string, number>>({});

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isConfirmingAudit, setIsConfirmingAudit] = useState(false);
  const [modalConfig, setModalConfig] = useState<{title: string, message: string, type: 'confirm' | 'alert'}>({
      title: '', message: '', type: 'alert'
  });

  const isAdmin = currentUser.role === Role.ADMIN;
  
  // Load draft on mount
  useEffect(() => {
      const draft = dataService.getAuditDraft();
      if (draft && Object.keys(draft).length > 0) {
          setAuditValues(draft);
      }
  }, []);

  // Save draft whenever auditValues changes
  useEffect(() => {
      if (Object.keys(auditValues).length > 0) {
          dataService.saveAuditDraft(auditValues);
      }
  }, [auditValues]);

  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  const generateSKU = (category: string, currentProductId?: string) => {
      // If we are editing an existing product and we switch back to its original category,
      // we must reuse its original SKU!
      if (currentProductId) {
          const originalProduct = products.find(p => p.id === currentProductId);
          if (originalProduct && originalProduct.category === category) {
              return originalProduct.sku;
          }
      }

      const prefix = category.substring(0, 3).toUpperCase();
      const categoryProducts = products.filter(p => p.category === category && p.id !== currentProductId);
      
      const existingNumbers = new Set<number>();
      categoryProducts.forEach(p => {
          const match = p.sku.match(new RegExp(`^${prefix}-(\\d+)$`));
          if (match && match[1]) {
              existingNumbers.add(parseInt(match[1], 10));
          }
      });
      
      let nextNumber = 1;
      while (existingNumbers.has(nextNumber)) {
          nextNumber++;
      }
      
      return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProduct: Product = {
        id: currentProduct.id || Date.now().toString(),
        sku: currentProduct.sku || '',
        name: currentProduct.name || '',
        category: currentProduct.category || ProductCategory.OTHER,
        price: Number(currentProduct.price) || 0,
        stock: Number(currentProduct.stock) || 0,
        minStock: Number(currentProduct.minStock) || 0
    };
    dataService.saveProduct(newProduct, currentUser.id);
    onUpdate();
    setIsEditing(false);
    setCurrentProduct({});
  };

  const initiateDelete = (id: string) => {
      setProductToDelete(id);
      setModalConfig({
          title: 'Eliminar Producto',
          message: '¿Está seguro que desea eliminar este producto del inventario? Esta acción no se puede deshacer.',
          type: 'confirm'
      });
      setModalOpen(true);
  };

  const handleModalConfirm = () => {
    if (productToDelete) {
        dataService.deleteProduct(productToDelete, currentUser.id);
        onUpdate();
        setProductToDelete(null);
        setModalOpen(false);
    } else if (isConfirmingAudit) {
        setIsConfirmingAudit(false);
        setModalOpen(false);
        executeAuditSave();
    } else {
        setModalOpen(false);
    }
  };

  const executeAuditSave = () => {
    Object.entries(auditValues).forEach(([productId, value]) => {
        if (value === undefined) return;
        const physicalQty = Number(value);
        const product = products.find(p => p.id === productId);
        if (product) {
             const diff = physicalQty - product.stock;
             dataService.addAudit({
                id: Date.now().toString() + productId,
                timestamp: Date.now(),
                userId: currentUser.id,
                productId,
                productName: product.name,
                systemStock: product.stock,
                physicalStock: physicalQty,
                difference: diff
            }, currentUser.id);
        }
    });

    setModalConfig({
        title: 'Auditoría Guardada',
        message: 'Inventario verificado correctamente.',
        type: 'alert'
    });
    setModalOpen(true);
    
    // Clear state and draft
    setAuditValues({});
    dataService.clearAuditDraft();
    
    setView('LIST');
    onUpdate();
  };

  const handleAuditSubmit = () => {
    let hasSurplus = false;
    let hasMissing = false;

    // Check for discrepancies first
    Object.entries(auditValues).forEach(([productId, value]) => {
        if (value === undefined) return;
        const physicalQty = Number(value);
        const product = products.find(p => p.id === productId);
        if (product) {
            const diff = physicalQty - product.stock;
            if (diff > 0) hasSurplus = true;
            if (diff < 0) hasMissing = true;
        }
    });

    if (hasSurplus) {
        setModalConfig({
            title: 'Excedentes Detectados',
            message: 'Ingresar en stock inicial los excedentes detectados antes de confirmar.',
            type: 'alert'
        });
        setModalOpen(true);
        return;
    }

    if (hasMissing) {
        setModalConfig({
            title: 'Faltantes Detectados',
            message: 'Ingresar como pendiente de pago los productos faltantes detectados antes de confirmar.',
            type: 'alert'
        });
        setModalOpen(true);
        return;
    }

    setModalConfig({
        title: 'Confirmar Ajustes',
        message: '¿Está seguro que desea aplicar los ajustes de esta auditoría en el inventario? Esta acción actualizará los registros de stock.',
        type: 'confirm'
    });
    setIsConfirmingAudit(true);
    setModalOpen(true);
  };

  const exportToExcel = () => {
    const filename = `Inventario_${new Date().toLocaleDateString().replace(/\//g, '-')}`;
    const tableStyle = `<style>
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #EAB308; color: white; border: 1px solid #000; padding: 5px; text-align: center; }
        td { border: 1px solid #000; padding: 5px; text-align: left; }
    </style>`;

    const tableHTML = `
        ${tableStyle}
        <table>
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>PRODUCTO</th>
                    <th>CATEGORIA</th>
                    <th>PRECIO</th>
                    <th>STOCK ACTUAL</th>
                    <th>STOCK MINIMO</th>
                    <th>ESTADO</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(p => `
                    <tr>
                        <td>${p.sku}</td>
                        <td>${p.name}</td>
                        <td>${p.category}</td>
                        <td>${p.price.toFixed(2)}</td>
                        <td>${p.stock}</td>
                        <td>${p.minStock}</td>
                        <td>${p.stock <= p.minStock ? 'BAJO STOCK' : 'OK'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    const dataType = 'application/vnd.ms-excel';
    const tableBlob = new Blob([tableHTML], { type: dataType });
    
    if (window.navigator && (window.navigator as any).msSaveOrOpenBlob) {
         (window.navigator as any).msSaveOrOpenBlob(tableBlob, filename);
    } else {
         const downloadLink = document.createElement("a");
         downloadLink.href = 'data:' + dataType + ', ' + encodeURIComponent(tableHTML);
         downloadLink.download = filename + ".xls";
         document.body.appendChild(downloadLink);
         downloadLink.click();
         document.body.removeChild(downloadLink);
    }
  };

  return (
    <>
    <Modal 
        isOpen={modalOpen} 
        onClose={() => { setModalOpen(false); setProductToDelete(null); setIsConfirmingAudit(false); }} 
        onConfirm={handleModalConfirm} 
        title={modalConfig.title} 
        message={modalConfig.message} 
        type={modalConfig.type}
    />

    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Archive className="text-gold-500" /> 
            {view === 'LIST' ? 'Inventario General' : 'Conciliación de Stock'}
        </h2>
        <div className="flex gap-2">
            {view === 'LIST' ? (
                <>
                    <button 
                        onClick={exportToExcel}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                        <FileDown className="w-4 h-4" /> Excel
                    </button>
                    <button 
                        onClick={() => setView('AUDIT')}
                        className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Realizar Auditoría
                    </button>
                    <button 
                        onClick={() => { 
                            const defaultCat = Object.values(ProductCategory)[0];
                            setCurrentProduct({ category: defaultCat, sku: generateSKU(defaultCat) }); 
                            setIsEditing(true); 
                        }}
                        className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Producto
                    </button>
                </>
            ) : (
                 <button 
                    onClick={() => setView('LIST')}
                    className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-gray-800 dark:text-white rounded-lg text-sm font-medium"
                >
                    Cancelar
                </button>
            )}
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-neutral-800 w-full max-w-lg rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-6">
                <h3 className="text-lg font-bold mb-4 dark:text-white">{currentProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                <form onSubmit={handleSaveProduct} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                            <input required className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white" value={currentProduct.name || ''} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">SKU</label>
                            <input required className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white" value={currentProduct.sku || ''} onChange={e => setCurrentProduct({...currentProduct, sku: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Categoría</label>
                            <select className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white" value={currentProduct.category || ProductCategory.OTHER} onChange={e => {
                                const newCat = e.target.value as ProductCategory;
                                const updates: Partial<Product> = { category: newCat };
                                updates.sku = generateSKU(newCat, currentProduct.id);
                                setCurrentProduct({...currentProduct, ...updates});
                            }}>
                                {Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs text-gray-500 mb-1">Precio (S/)</label>
                            <input type="number" step="0.01" required className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white" value={currentProduct.price ?? ''} onChange={e => setCurrentProduct({...currentProduct, price: e.target.value === '' ? undefined : parseFloat(e.target.value)})} />
                        </div>
                         <div>
                            <label className="block text-xs text-gray-500 mb-1">Stock Inicial</label>
                            <input type="number" required className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white" value={currentProduct.stock ?? ''} onChange={e => setCurrentProduct({...currentProduct, stock: e.target.value === '' ? undefined : parseInt(e.target.value)})} />
                        </div>
                         <div>
                            <label className="block text-xs text-gray-500 mb-1">Stock Mínimo</label>
                            <input type="number" required className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white" value={currentProduct.minStock ?? ''} onChange={e => setCurrentProduct({...currentProduct, minStock: e.target.value === '' ? undefined : parseInt(e.target.value)})} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-lg">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {view === 'LIST' ? (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden flex-1 flex flex-col">
            {/* Search and Category Filter */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex flex-col md:flex-row gap-4 bg-neutral-50/50 dark:bg-neutral-900/10">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar producto por nombre o SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:border-gold-500 text-gray-900 dark:text-white"
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:border-gold-500 text-gray-900 dark:text-white"
                >
                    <option value="ALL">Todas las Categorías</option>
                    {Object.values(ProductCategory).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>
            <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                    <thead className="bg-neutral-50 dark:bg-neutral-900 text-xs uppercase text-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">Producto</th>
                            <th className="px-6 py-3">Categoría</th>
                            <th className="px-6 py-3">Precio</th>
                            <th className="px-6 py-3 text-center">Stock</th>
                            <th className="px-6 py-3 text-center">Estado</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {filteredProducts.map(p => (
                            <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                    {p.name} <br/> <span className="text-xs text-gray-400">{p.sku}</span>
                                </td>
                                <td className="px-6 py-4">{p.category}</td>
                                <td className="px-6 py-4">S/ {p.price.toFixed(2)}</td>
                                <td className="px-6 py-4 text-center font-bold">{p.stock}</td>
                                <td className="px-6 py-4 text-center">
                                    {p.stock <= p.minStock ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                            Bajo Stock
                                        </span>
                                    ) : (
                                         <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                            OK
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => { setCurrentProduct(p); setIsEditing(true); }} className="text-blue-600 hover:text-blue-800 dark:text-blue-400"><Edit2 className="w-4 h-4" /></button>
                                    {isAdmin && <button onClick={() => initiateDelete(p.id)} className="text-red-600 hover:text-red-800 dark:text-red-400"><Trash className="w-4 h-4" /></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg border border-blue-100 dark:border-blue-900/30">
                <AlertOctagon className="w-5 h-5" />
                <p className="text-sm">Ingrese el conteo físico real. Si existen diferencias, no se permitirá confirmar el ajuste hasta corregirlas manualmente.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(p => {
                    const physicalQty = auditValues[p.id] !== undefined ? auditValues[p.id] : p.stock;
                    const diff = physicalQty - p.stock;
                    
                    let cardClass = "bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-700";
                    let statusBadge = null;

                    if (diff > 0) {
                        cardClass = "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
                        statusBadge = <div className="absolute top-2 right-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full shadow-lg">Producto con Excedentes</div>
                    } else if (diff < 0) {
                        cardClass = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
                        statusBadge = <div className="absolute top-2 right-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full shadow-lg">Producto con Faltantes</div>
                    } else if (auditValues[p.id] !== undefined) {
                        cardClass = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800";
                    }

                    return (
                        <div key={p.id} className={`relative p-4 border rounded-xl transition-all ${cardClass}`}>
                            {statusBadge}
                            <div className="flex justify-between items-start mb-4 mt-2">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">{p.name}</h4>
                                    <span className="text-xs text-gray-500">{p.sku}</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-2">
                                <div className="text-center p-2 bg-neutral-200 dark:bg-neutral-800 rounded">
                                    <span className="block text-xs text-gray-500">Sistema</span>
                                    <span className="font-bold">{p.stock}</span>
                                </div>
                                <div className="text-center p-2 bg-neutral-200 dark:bg-neutral-800 rounded border border-gray-300 dark:border-gray-600">
                                    <span className="block text-xs text-gray-500">Físico</span>
                                    <input 
                                        type="number"
                                        className="w-full bg-transparent text-center font-bold focus:outline-none"
                                        placeholder=""
                                        value={auditValues[p.id] ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') {
                                                const next = { ...auditValues };
                                                delete next[p.id];
                                                setAuditValues(next);
                                            } else {
                                                setAuditValues({...auditValues, [p.id]: parseInt(val) || 0});
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="text-center p-2 bg-neutral-900 dark:bg-black/50 rounded flex justify-between items-center px-4">
                                <span className="text-xs text-gray-400">Diferencia</span>
                                <span className={`font-bold ${diff > 0 ? 'text-blue-400' : diff < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {diff > 0 ? '+' : ''}{diff}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-8 flex justify-end">
                 <button 
                    onClick={handleAuditSubmit}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2"
                >
                    <CheckCircle className="w-5 h-5" /> Confirmar Ajustes de Inventario
                </button>
            </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Inventory;