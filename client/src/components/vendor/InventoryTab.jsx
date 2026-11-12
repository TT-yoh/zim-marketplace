import { Button } from '../ui/index.js';

export function InventoryTab({ PLATFORM_CATEGORIES, categoryFilter, editForm, editingId, exportToCSV, filteredCount, filteredInventory, getFormattedPrice, handleAutoMatchImages, handleBulkRestock, handleCancelEdit, handleClearSelection, handleDelete, handleDeleteAllProducts, handleDeleteSelected, handleEditFileChange, handleQuickRestock, handleSaveEdit, handleSelectAllFiltered, handleSelectAllOnPage, handleStartEdit, handleToggleQuickPromo, handleToggleSelectProduct, inventorySearch, isMatchingImages, lowStockProducts, lowStockThreshold, outOfStockProducts, pageSize, paginatedProducts, products, safeCurrentPage, savingEdit, selectedProductIds, selectedShopId, setCategoryFilter, setCurrentPage, setEditForm, setInventorySearch, setPageSize, setShowBulkPriceModal, setStockFilter, stockFilter, totalInventoryValueCents, totalPages, totalProducts, uniqueCategories }) {
    return (
                <div className="animate-fade-in">
                    {/* Action Bar for Catalog */}
                    <div className="between mb-16 wrap gap-10 row">
                        <div className="gap-8 wrap row">
                            <Button
                                onClick={handleAutoMatchImages}
                                disabled={isMatchingImages}
                                variant="secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontWeight: '600', fontSize: '13px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '8px' }}
                                title="Automatically assign realistic product images to catalog items missing photos"
                            >
                                {isMatchingImages ? '⏳ Matching Photos...' : '⚡ Auto-Match Photos'}
                            </Button>
                            <Button
                                onClick={exportToCSV}
                                variant="secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontWeight: '600', fontSize: '13px', borderRadius: '8px' }}
                            >
                                📥 Export CSV Report
                            </Button>
                            {products.length > 0 && (
                                <Button
                                    onClick={handleDeleteAllProducts}
                                    variant="secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontWeight: '600', fontSize: '13px', color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: '8px' }}
                                    title={selectedShopId === 'ALL' ? "Purge all products across entire marketplace" : "Delete all products in this specific vendor store"}
                                >
                                    🗑️ {selectedShopId === 'ALL' ? 'Purge All Products' : 'Clear Store Products'}
                                </Button>
                            )}
                        </div>

                        <div className="fs-13 text-secondary">
                            Catalog Value: <strong className="text-accent fs-14">{getFormattedPrice(totalInventoryValueCents)}</strong>
                        </div>
                    </div>

                    {/* Full Width Inventory Products Table with Live Filters and Pagination */}
                    <div>
                <div className="glass-panel overflow-hidden">

                    {/* Table Header & Search Filter Bar */}
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="between wrap gap-12 row">
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>
                                    Your Listed Inventory ({filteredCount} of {totalProducts})
                                </h3>
                                <div className="fs-12 text-muted mt-2">
                                    Showing page {safeCurrentPage} of {totalPages} ({pageSize} per page)
                                </div>
                            </div>
                            <div className="fs-13 text-secondary">
                                Est. Filtered Value: <strong className="text-accent fs-15">{getFormattedPrice(totalInventoryValueCents)}</strong>
                            </div>
                        </div>

                        {/* Search, Category, Stock Filters */}
                        <div className="gap-12 wrap row">
                            <div style={{ flex: '1 1 240px', position: 'relative' }}>
                                <input
                                    type="text"
                                    value={inventorySearch}
                                    onChange={(e) => { setInventorySearch(e.target.value); setCurrentPage(1); }}
                                    placeholder="🔍 Search SKU or Product Name (e.g. Battery, Drill)..." className="w-full p-10-14 rounded-8 border bg-secondary text-primary fs-13"
                                />
                                {inventorySearch && (
                                    <button
                                        onClick={() => { setInventorySearch(''); setCurrentPage(1); }}
                                        aria-label="Clear product search"
                                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <select
                                value={categoryFilter}
                                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    minWidth: '160px'
                                }}
                            >
                                <option value="All">🏷️ All Categories</option>
                                {uniqueCategories.filter(c => c !== 'All').map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>

                            <select
                                value={stockFilter}
                                onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1); }}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    minWidth: '150px'
                                }}
                            >
                                <option value="all">📦 All Stock ({totalProducts})</option>
                                <option value="in_stock">🟢 Healthy Stock (&gt;3)</option>
                                <option value="low_stock">🟡 Low Stock ({lowStockProducts.length})</option>
                                <option value="out_of_stock">🔴 Out of Stock ({outOfStockProducts.length})</option>
                            </select>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                <label className="fs-12 text-secondary">Rows:</label>
                                <select
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="p-8-10 rounded-6 border bg-secondary text-primary fs-12 cursor-pointer"
                                >
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={250}>250</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Bulk Selection Actions Toolbar */}
                    {selectedProductIds.size > 0 && (
                        <div className="glass-panel animate-fade-in" style={{
                            padding: '14px 20px',
                            marginBottom: '16px',
                            backgroundColor: 'rgba(59, 130, 246, 0.12)',
                            border: '1px solid var(--accent-primary)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div className="gap-12 row">
                                <span className="fw-700 text-accent fs-14">
                                    ✓ {selectedProductIds.size} product{selectedProductIds.size === 1 ? '' : 's'} selected
                                </span>
                                {selectedProductIds.size < filteredInventory.length && (
                                    <Button
                                        onClick={() => handleSelectAllFiltered(filteredInventory)}
                                        variant="secondary"
                                        style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '600', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                                    >
                                        Select all {filteredInventory.length} matching products
                                    </Button>
                                )}
                            </div>

                            <div className="gap-8 wrap row">
                                <Button
                                    onClick={() => handleBulkRestock(5)}
                                    variant="secondary" className="p-6-12 fs-12 fw-700 text-accent"
                                    title="Add +5 stock to all selected products"
                                >
                                    ⚡ +5 Restock Selected
                                </Button>
                                <Button
                                    onClick={() => handleBulkRestock(10)}
                                    variant="secondary" className="p-6-12 fs-12 fw-700 text-accent"
                                    title="Add +10 stock to all selected products"
                                >
                                    ⚡ +10 Restock Selected
                                </Button>
                                <Button
                                    onClick={() => setShowBulkPriceModal(true)}
                                    variant="secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--success)', borderColor: 'var(--success)' }}
                                    title="Bulk adjust prices for all selected products"
                                >
                                    💰 Adjust Prices (% / $)
                                </Button>
                                <Button
                                    onClick={handleDeleteSelected}
                                    style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '700', backgroundColor: 'var(--danger)', color: '#fff', border: 'none' }}
                                >
                                    🗑️ Delete Selected ({selectedProductIds.size})
                                </Button>
                                <Button
                                    onClick={handleClearSelection}
                                    variant="secondary" className="p-6-12 fs-12 text-muted"
                                >
                                    ✕ Deselect
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="ui-table-wrap">
                        <table className="ui-table">
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <th style={{ padding: '14px 16px', width: '40px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProductIds.has(p.id))}
                                            onChange={() => handleSelectAllOnPage(paginatedProducts)}
                                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                                            title="Select / deselect all products on this page"
                                        />
                                    </th>
                                    <th style={{ padding: '14px 16px', fontWeight: '600' }}>Item No</th>
                                    <th className="p-14-20 fw-600">Product</th>
                                    <th className="p-14-20 fw-600">Unit</th>
                                    <th className="p-14-20 fw-600">Price (Incl VAT)</th>
                                    <th className="p-14-20 fw-600">Stock</th>
                                    <th className="p-14-20 fw-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No matching products found. Try adjusting your search or category filter.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedProducts.map(product => {
                                        const isEditing = editingId === product.id;
                                        const isSelected = selectedProductIds.has(product.id);

                                        if (isEditing) {
                                            const subCats = PLATFORM_CATEGORIES[editForm.category] || ['General'];
                                            return (
                                                <tr key={`edit-${product.id}`} style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', borderBottom: '2px solid var(--accent-primary)' }}>
                                                    <td colSpan="7" style={{ padding: '20px 24px' }}>
                                                        <div className="gap-16 stack">
                                                            <div className="between wrap gap-12 row">
                                                                <div className="gap-8 row">
                                                                    <span className="fs-18">✏️</span>
                                                                    <strong className="fs-16 text-primary">
                                                                        Editing Product Variables & Specifications
                                                                    </strong>
                                                                    <span className="fs-12 text-muted">ID: {product.id.slice(0, 8)}...</span>
                                                                </div>
                                                                <div className="flex gap-8">
                                                                    <Button 
                                                                        type="button"
                                                                        onClick={() => handleSaveEdit(product.id)}
                                                                        disabled={savingEdit}
                                                                        className="p-8-16 fs-13 fw-700"
                                                                    >
                                                                        {savingEdit ? 'Saving...' : '💾 Save Product Variables'}
                                                                    </Button>
                                                                    <Button 
                                                                        type="button"
                                                                        onClick={handleCancelEdit}
                                                                        disabled={savingEdit}
                                                                        variant="secondary"
                                                                        style={{ padding: '8px 14px', fontSize: '13px' }}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {/* Grid of Product Variable Inputs */}
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                                                                <label style={{ gridColumn: 'span 2' }}>
                                                                    <span className="block fs-12 fw-600 mb-4 text-primary">Product Title *</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.title} 
                                                                        onChange={e => setEditForm({ ...editForm, title: e.target.value })} 
                                                                        placeholder="e.g. 5KVA Growatt Hybrid Solar Inverter" className="w-full p-8-12 fs-13" 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span className="block fs-12 fw-600 mb-4 text-primary">Category *</span>
                                                                    <select 
                                                                        value={editForm.category} 
                                                                        onChange={e => {
                                                                            const newCat = e.target.value;
                                                                            const subs = PLATFORM_CATEGORIES[newCat] || [];
                                                                            setEditForm({ ...editForm, category: newCat, subCategory: subs[0] || '' });
                                                                        }} className="w-full p-8-12 fs-13"
                                                                    >
                                                                        {Object.keys(PLATFORM_CATEGORIES).map(cat => (
                                                                            <option key={cat} value={cat}>{cat}</option>
                                                                        ))}
                                                                    </select>
                                                                </label>

                                                                <label>
                                                                    <span className="block fs-12 fw-600 mb-4 text-primary">Sub-Category</span>
                                                                    <input 
                                                                        type="text" 
                                                                        list={`subcats-${product.id}`}
                                                                        value={editForm.subCategory} 
                                                                        onChange={e => setEditForm({ ...editForm, subCategory: e.target.value })} 
                                                                        placeholder="e.g. Inverters & Batteries" className="w-full p-8-12 fs-13"
                                                                    />
                                                                    <datalist id={`subcats-${product.id}`}>
                                                                        {subCats.map(sc => <option key={sc} value={sc} />)}
                                                                    </datalist>
                                                                </label>

                                                                <label>
                                                                    <span className="block fs-12 fw-600 mb-4 text-primary">Brand / Manufacturer</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.brand} 
                                                                        onChange={e => setEditForm({ ...editForm, brand: e.target.value })} 
                                                                        placeholder="e.g. Growatt, Exide, Apple" className="w-full p-8-12 fs-13"
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span className="block fs-12 fw-600 mb-4 text-primary">Condition *</span>
                                                                    <select 
                                                                        value={editForm.condition} 
                                                                        onChange={e => setEditForm({ ...editForm, condition: e.target.value })} className="w-full p-8-12 fs-13"
                                                                    >
                                                                        <option value="New">Brand New</option>
                                                                        <option value="Refurbished">Refurbished</option>
                                                                        <option value="Used - Like New">Used - Like New</option>
                                                                        <option value="Used - Good">Used - Good</option>
                                                                        <option value="Open Box">Open Box</option>
                                                                    </select>
                                                                </label>

                                                                <label>
                                                                    <span className="block fs-12 fw-600 mb-4 text-primary">Custom SKU / Item No</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.itemNo} 
                                                                        onChange={e => setEditForm({ ...editForm, itemNo: e.target.value })} 
                                                                        placeholder="e.g. SOL-INV-001" className="w-full p-8-12 fs-13 font-mono" 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span className="block fs-12 fw-600 mb-4 text-primary">Selling Price ($ USD) *</span>
                                                                    <input 
                                                                        type="number" 
                                                                        step="0.01" 
                                                                        min="0" 
                                                                        value={editForm.priceIncl} 
                                                                        onChange={e => setEditForm({ ...editForm, priceIncl: e.target.value })} 
                                                                        placeholder="25.00" className="w-full p-8-12 fs-13 fw-700 text-success" 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span className="block fs-12 fw-600 mb-4 text-primary">Stock Quantity *</span>
                                                                    <input 
                                                                        type="number" 
                                                                        min="0" 
                                                                        value={editForm.stockQuantity} 
                                                                        onChange={e => setEditForm({ ...editForm, stockQuantity: e.target.value })} 
                                                                        placeholder="10" className="w-full p-8-12 fs-13" 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span className="block fs-12 fw-600 mb-4 text-primary">Unit</span>
                                                                    <select 
                                                                        value={editForm.unit} 
                                                                        onChange={e => setEditForm({ ...editForm, unit: e.target.value })} className="w-full p-8-12 fs-13"
                                                                    >
                                                                        <option value="EA">EA (Each)</option>
                                                                        <option value="KG">KG (Kilogram)</option>
                                                                        <option value="L">L (Litre)</option>
                                                                        <option value="M">M (Metre)</option>
                                                                        <option value="BOX">BOX (Box)</option>
                                                                        <option value="PACK">PACK (Pack)</option>
                                                                        <option value="PAIR">PAIR (Pair)</option>
                                                                        <option value="SET">SET (Set)</option>
                                                                    </select>
                                                                </label>

                                                                <label>
                                                                    <span className="block fs-12 fw-600 mb-4 text-primary">Colors (comma-separated)</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.colors} 
                                                                        onChange={e => setEditForm({ ...editForm, colors: e.target.value })} 
                                                                        placeholder="e.g. Black, Silver, White" className="w-full p-8-12 fs-13" 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span className="block fs-12 fw-600 mb-4 text-primary">Sizes (comma-separated)</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.sizes} 
                                                                        onChange={e => setEditForm({ ...editForm, sizes: e.target.value })} 
                                                                        placeholder="e.g. 5KVA, 3KVA or S, M, L" className="w-full p-8-12 fs-13" 
                                                                    />
                                                                </label>

                                                                <div style={{ gridColumn: 'span 2' }}>
                                                                    <span className="block fs-12 fw-600 mb-4 text-primary">Product Photo</span>
                                                                    <div className="gap-10 row">
                                                                        {editForm.imageUrl ? (
                                                                            <img src={editForm.imageUrl} alt="Preview" style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                                                        ) : (
                                                                            <span className="fs-12 text-muted">No Photo</span>
                                                                        )}
                                                                        <input 
                                                                            type="file" 
                                                                            accept="image/*" 
                                                                            onChange={handleEditFileChange} className="fs-12 flex-1" 
                                                                        />
                                                                        <input 
                                                                            type="url" 
                                                                            placeholder="Or Image URL" 
                                                                            value={editForm.imageUrl} 
                                                                            onChange={e => setEditForm({ ...editForm, imageUrl: e.target.value })} className="flex-1 p-6-10 fs-12" 
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div style={{ gridColumn: '1 / -1', padding: '12px 16px', borderRadius: '8px', border: editForm.isPromotion ? '1px solid var(--accent-primary)' : '1px dashed var(--border)', backgroundColor: editForm.isPromotion ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                                                    <label className="gap-10 cursor-pointer m-0 row">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={editForm.isPromotion} 
                                                                            onChange={e => setEditForm({ ...editForm, isPromotion: e.target.checked })} 
                                                                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                                                                        />
                                                                        <div>
                                                                            <span style={{ fontWeight: '700', color: editForm.isPromotion ? 'var(--accent-primary)' : 'var(--text-primary)', fontSize: '13px' }}>
                                                                                🔥 Feature on Promotions &amp; Hero Showcase
                                                                            </span>
                                                                            <div className="fs-11 text-muted">
                                                                                Display in limited-time promotional deals and hero carousel with discount badges.
                                                                            </div>
                                                                        </div>
                                                                    </label>
                                                                    {editForm.isPromotion && (
                                                                        <div className="gap-8 row">
                                                                            <span className="fs-12 fw-600 text-primary">Discount %:</span>
                                                                            <input 
                                                                                type="number" 
                                                                                min="1" 
                                                                                max="90" 
                                                                                value={editForm.promoDiscountPercent} 
                                                                                onChange={e => setEditForm({ ...editForm, promoDiscountPercent: parseInt(e.target.value, 10) || 0 })} 
                                                                                style={{ width: '70px', padding: '6px 8px', fontSize: '13px', fontWeight: '700', textAlign: 'center' }}
                                                                            />
                                                                            <span className="fs-12 fw-700 text-accent">% OFF</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <label style={{ gridColumn: '1 / -1' }}>
                                                                    <span className="block fs-12 fw-600 mb-4 text-primary">Product Specifications & Description</span>
                                                                    <textarea 
                                                                        rows="3" 
                                                                        value={editForm.description} 
                                                                        onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
                                                                        placeholder="Enter item specifications, warranty coverage, compatibility, package contents, dimensions, or special handling notes..." className="w-full p-8-12 fs-13 resize-y" 
                                                                    />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr key={product.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent', transition: 'background-color 0.2s' }}>
                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelectProduct(product.id)}
                                                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '13px' }}>
                                                    {product.item_no || 'N/A'}
                                                </td>
                                                <td className="p-14-20">
                                                    <div className="gap-12 row">
                                                        {product.image_url ? (
                                                            <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-tertiary)' }}>
                                                                <img src={product.image_url} alt={product.title} className="img-cover" />
                                                            </div>
                                                        ) : (
                                                            <div style={{ width: '44px', height: '44px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                                                📦
                                                            </div>
                                                        )}
                                                        <div className="flex-1">
                                                            <div className="gap-8 wrap row">
                                                                <span className="fw-600 text-primary fs-14">{product.title}</span>
                                                                {product.is_featured_hero && (
                                                                    <span style={{ padding: '2px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#eab308', border: '1px solid #eab308' }}>
                                                                        ⭐ Spotlight
                                                                    </span>
                                                                )}
                                                                {product.is_promotion && (
                                                                    <span style={{ padding: '2px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                                                        🔥 Promo -{product.promo_discount_percent || 15}%
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="fs-12 text-muted">
                                                                {product.brand && (
                                                                    <span style={{ color: 'var(--accent-primary)', fontWeight: '600', marginRight: '6px' }}>
                                                                        [{product.brand}]
                                                                    </span>
                                                                )}
                                                                {product.category || 'Uncategorized'} {product.sub_category ? `› ${product.sub_category}` : ''}
                                                            </div>
                                                            {(product.colors?.length > 0 || product.sizes?.length > 0) && (
                                                                <div className="fs-11 text-accent mt-4">
                                                                    {product.colors?.length > 0 && `Colors: ${product.colors.join(', ')}`}
                                                                    {product.colors?.length > 0 && product.sizes?.length > 0 && ' | '}
                                                                    {product.sizes?.length > 0 && `Sizes: ${product.sizes.join(', ')}`}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-14-20 text-secondary">
                                                    {product.unit || 'EA'}
                                                </td>
                                                <td style={{ padding: '14px 20px', color: (product.price_cents || 0) > 0 ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold' }}>
                                                    {(product.price_cents || 0) > 0 
                                                        ? `$${(product.price_cents / 100).toFixed(2)}`
                                                        : <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--warning)' }}>Set Price</span>
                                                    }
                                                </td>
                                                <td className="p-14-20">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: '700',
                                                            backgroundColor: product.stock_quantity <= 0 
                                                                ? 'rgba(239, 68, 68, 0.15)' 
                                                                : (product.stock_quantity <= lowStockThreshold ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                                                            color: product.stock_quantity <= 0 
                                                                ? 'var(--danger)' 
                                                                : (product.stock_quantity <= lowStockThreshold ? '#f59e0b' : 'var(--success)'),
                                                            border: product.stock_quantity <= 0 
                                                                ? '1px solid var(--danger)' 
                                                                : (product.stock_quantity <= lowStockThreshold ? '1px solid #f59e0b' : '1px solid var(--success)'),
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {product.stock_quantity <= 0 
                                                                ? '🔴 Out of Stock' 
                                                                : (product.stock_quantity <= lowStockThreshold ? `🟡 Low (${product.stock_quantity})` : `🟢 ${product.stock_quantity} in stock`)}
                                                        </span>

                                                        {product.stock_quantity <= lowStockThreshold && (
                                                            <Button
                                                                onClick={() => handleQuickRestock(product.id, 5)}
                                                                variant="secondary"
                                                                style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '700', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', whiteSpace: 'nowrap' }}
                                                                title="Quickly add +5 units to stock"
                                                            >
                                                                ⚡ +5
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-14-20 text-right">
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                        <Button 
                                                            onClick={() => handleToggleQuickPromo(product)}
                                                            variant="secondary"
                                                            style={{ 
                                                                padding: '6px 10px', 
                                                                fontSize: '12px', 
                                                                fontWeight: '700',
                                                                color: product.is_promotion ? 'var(--danger)' : 'var(--text-secondary)',
                                                                borderColor: product.is_promotion ? 'var(--danger)' : 'var(--border)'
                                                            }}
                                                            title={product.is_promotion ? "Remove from promotions" : "Put on promotion / Hero showcase"}
                                                        >
                                                            {product.is_promotion ? '🔥 On Promo' : '➕ Promo'}
                                                        </Button>
                                                        <Button 
                                                            onClick={() => handleStartEdit(product)}
                                                            variant="secondary" className="p-6-12 fs-13"
                                                        >
                                                            ✏️ Edit
                                                        </Button>
                                                        <Button 
                                                            onClick={() => handleDelete(product.id)}
                                                            variant="secondary"
                                                            style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Numbered Pagination Controls Footer Bar */}
                    {totalPages > 1 && (
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px',
                            backgroundColor: 'rgba(255,255,255,0.01)'
                        }}>
                            <div className="fs-13 text-secondary">
                                Showing <strong>{(safeCurrentPage - 1) * pageSize + 1}</strong> to <strong>{Math.min(safeCurrentPage * pageSize, filteredCount)}</strong> of <strong>{filteredCount}</strong> items
                            </div>

                            <div className="gap-6 row">
                                <Button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={safeCurrentPage === 1}
                                    variant="secondary" className="p-6-10 fs-12"
                                    title="First Page"
                                >
                                    « First
                                </Button>
                                <Button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={safeCurrentPage === 1}
                                    variant="secondary" className="p-6-12 fs-12"
                                >
                                    ‹ Prev
                                </Button>

                                {/* Page Number Pills */}
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (safeCurrentPage <= 3) pageNum = i + 1;
                                    else if (safeCurrentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = safeCurrentPage - 2 + i;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: '12px',
                                                borderRadius: '6px',
                                                border: safeCurrentPage === pageNum ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                                                backgroundColor: safeCurrentPage === pageNum ? 'var(--accent-primary)' : 'transparent',
                                                color: safeCurrentPage === pageNum ? '#fff' : 'var(--text-primary)',
                                                fontWeight: safeCurrentPage === pageNum ? '700' : '400',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <Button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={safeCurrentPage === totalPages}
                                    variant="secondary" className="p-6-12 fs-12"
                                >
                                    Next ›
                                </Button>
                                <Button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={safeCurrentPage === totalPages}
                                    variant="secondary" className="p-6-10 fs-12"
                                    title="Last Page"
                                >
                                    Last »
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
