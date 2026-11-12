export function InventoryTab({ PLATFORM_CATEGORIES, categoryFilter, editForm, editingId, exportToCSV, filteredCount, filteredInventory, getFormattedPrice, handleAutoMatchImages, handleBulkRestock, handleCancelEdit, handleClearSelection, handleDelete, handleDeleteAllProducts, handleDeleteSelected, handleEditFileChange, handleQuickRestock, handleSaveEdit, handleSelectAllFiltered, handleSelectAllOnPage, handleStartEdit, handleToggleQuickPromo, handleToggleSelectProduct, inventorySearch, isMatchingImages, lowStockProducts, lowStockThreshold, outOfStockProducts, pageSize, paginatedProducts, products, safeCurrentPage, savingEdit, selectedProductIds, selectedShopId, setCategoryFilter, setCurrentPage, setEditForm, setInventorySearch, setPageSize, setShowBulkPriceModal, setStockFilter, stockFilter, totalInventoryValueCents, totalPages, totalProducts, uniqueCategories }) {
    return (
                <div className="animate-fade-in">
                    {/* Action Bar for Catalog */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={handleAutoMatchImages}
                                disabled={isMatchingImages}
                                className="btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontWeight: '600', fontSize: '13px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '8px' }}
                                title="Automatically assign realistic product images to catalog items missing photos"
                            >
                                {isMatchingImages ? '⏳ Matching Photos...' : '⚡ Auto-Match Photos'}
                            </button>
                            <button
                                onClick={exportToCSV}
                                className="btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontWeight: '600', fontSize: '13px', borderRadius: '8px' }}
                            >
                                📥 Export CSV Report
                            </button>
                            {products.length > 0 && (
                                <button
                                    onClick={handleDeleteAllProducts}
                                    className="btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontWeight: '600', fontSize: '13px', color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: '8px' }}
                                    title={selectedShopId === 'ALL' ? "Purge all products across entire marketplace" : "Delete all products in this specific vendor store"}
                                >
                                    🗑️ {selectedShopId === 'ALL' ? 'Purge All Products' : 'Clear Store Products'}
                                </button>
                            )}
                        </div>

                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Catalog Value: <strong style={{ color: 'var(--accent-primary)', fontSize: '14px' }}>{getFormattedPrice(totalInventoryValueCents)}</strong>
                        </div>
                    </div>

                    {/* Full Width Inventory Products Table with Live Filters and Pagination */}
                    <div>
                <div className="glass-panel" style={{ overflow: 'hidden' }}>

                    {/* Table Header & Search Filter Bar */}
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>
                                    Your Listed Inventory ({filteredCount} of {totalProducts})
                                </h3>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    Showing page {safeCurrentPage} of {totalPages} ({pageSize} per page)
                                </div>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Est. Filtered Value: <strong style={{ color: 'var(--accent-primary)', fontSize: '15px' }}>{getFormattedPrice(totalInventoryValueCents)}</strong>
                            </div>
                        </div>

                        {/* Search, Category, Stock Filters */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ flex: '1 1 240px', position: 'relative' }}>
                                <input
                                    type="text"
                                    value={inventorySearch}
                                    onChange={(e) => { setInventorySearch(e.target.value); setCurrentPage(1); }}
                                    placeholder="🔍 Search SKU or Product Name (e.g. Battery, Drill)..."
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px'
                                    }}
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
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Rows:</label>
                                <select
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                    style={{
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontWeight: '700', color: 'var(--accent-primary)', fontSize: '14px' }}>
                                    ✓ {selectedProductIds.size} product{selectedProductIds.size === 1 ? '' : 's'} selected
                                </span>
                                {selectedProductIds.size < filteredInventory.length && (
                                    <button
                                        onClick={() => handleSelectAllFiltered(filteredInventory)}
                                        className="btn-secondary"
                                        style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '600', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                                    >
                                        Select all {filteredInventory.length} matching products
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => handleBulkRestock(5)}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)' }}
                                    title="Add +5 stock to all selected products"
                                >
                                    ⚡ +5 Restock Selected
                                </button>
                                <button
                                    onClick={() => handleBulkRestock(10)}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)' }}
                                    title="Add +10 stock to all selected products"
                                >
                                    ⚡ +10 Restock Selected
                                </button>
                                <button
                                    onClick={() => setShowBulkPriceModal(true)}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--success)', borderColor: 'var(--success)' }}
                                    title="Bulk adjust prices for all selected products"
                                >
                                    💰 Adjust Prices (% / $)
                                </button>
                                <button
                                    onClick={handleDeleteSelected}
                                    className="btn-primary"
                                    style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '700', backgroundColor: 'var(--danger)', color: '#fff', border: 'none' }}
                                >
                                    🗑️ Delete Selected ({selectedProductIds.size})
                                </button>
                                <button
                                    onClick={handleClearSelection}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--text-muted)' }}
                                >
                                    ✕ Deselect
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                                    <th style={{ padding: '14px 20px', fontWeight: '600' }}>Product</th>
                                    <th style={{ padding: '14px 20px', fontWeight: '600' }}>Unit</th>
                                    <th style={{ padding: '14px 20px', fontWeight: '600' }}>Price (Incl VAT)</th>
                                    <th style={{ padding: '14px 20px', fontWeight: '600' }}>Stock</th>
                                    <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
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
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ fontSize: '18px' }}>✏️</span>
                                                                    <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                                                                        Editing Product Variables & Specifications
                                                                    </strong>
                                                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {product.id.slice(0, 8)}...</span>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleSaveEdit(product.id)}
                                                                        disabled={savingEdit}
                                                                        className="btn-primary"
                                                                        style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '700' }}
                                                                    >
                                                                        {savingEdit ? 'Saving...' : '💾 Save Product Variables'}
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={handleCancelEdit}
                                                                        disabled={savingEdit}
                                                                        className="btn-secondary"
                                                                        style={{ padding: '8px 14px', fontSize: '13px' }}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Grid of Product Variable Inputs */}
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                                                                <label style={{ gridColumn: 'span 2' }}>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Product Title *</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.title} 
                                                                        onChange={e => setEditForm({ ...editForm, title: e.target.value })} 
                                                                        placeholder="e.g. 5KVA Growatt Hybrid Solar Inverter"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }} 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Category *</span>
                                                                    <select 
                                                                        value={editForm.category} 
                                                                        onChange={e => {
                                                                            const newCat = e.target.value;
                                                                            const subs = PLATFORM_CATEGORIES[newCat] || [];
                                                                            setEditForm({ ...editForm, category: newCat, subCategory: subs[0] || '' });
                                                                        }}
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                                                                    >
                                                                        {Object.keys(PLATFORM_CATEGORIES).map(cat => (
                                                                            <option key={cat} value={cat}>{cat}</option>
                                                                        ))}
                                                                    </select>
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Sub-Category</span>
                                                                    <input 
                                                                        type="text" 
                                                                        list={`subcats-${product.id}`}
                                                                        value={editForm.subCategory} 
                                                                        onChange={e => setEditForm({ ...editForm, subCategory: e.target.value })} 
                                                                        placeholder="e.g. Inverters & Batteries"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                                                                    />
                                                                    <datalist id={`subcats-${product.id}`}>
                                                                        {subCats.map(sc => <option key={sc} value={sc} />)}
                                                                    </datalist>
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Brand / Manufacturer</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.brand} 
                                                                        onChange={e => setEditForm({ ...editForm, brand: e.target.value })} 
                                                                        placeholder="e.g. Growatt, Exide, Apple"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Condition *</span>
                                                                    <select 
                                                                        value={editForm.condition} 
                                                                        onChange={e => setEditForm({ ...editForm, condition: e.target.value })}
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                                                                    >
                                                                        <option value="New">Brand New</option>
                                                                        <option value="Refurbished">Refurbished</option>
                                                                        <option value="Used - Like New">Used - Like New</option>
                                                                        <option value="Used - Good">Used - Good</option>
                                                                        <option value="Open Box">Open Box</option>
                                                                    </select>
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Custom SKU / Item No</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.itemNo} 
                                                                        onChange={e => setEditForm({ ...editForm, itemNo: e.target.value })} 
                                                                        placeholder="e.g. SOL-INV-001"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', fontFamily: 'monospace' }} 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Selling Price ($ USD) *</span>
                                                                    <input 
                                                                        type="number" 
                                                                        step="0.01" 
                                                                        min="0" 
                                                                        value={editForm.priceIncl} 
                                                                        onChange={e => setEditForm({ ...editForm, priceIncl: e.target.value })} 
                                                                        placeholder="25.00"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', fontWeight: '700', color: 'var(--success)' }} 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Stock Quantity *</span>
                                                                    <input 
                                                                        type="number" 
                                                                        min="0" 
                                                                        value={editForm.stockQuantity} 
                                                                        onChange={e => setEditForm({ ...editForm, stockQuantity: e.target.value })} 
                                                                        placeholder="10"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }} 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Unit</span>
                                                                    <select 
                                                                        value={editForm.unit} 
                                                                        onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
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
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Colors (comma-separated)</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.colors} 
                                                                        onChange={e => setEditForm({ ...editForm, colors: e.target.value })} 
                                                                        placeholder="e.g. Black, Silver, White"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }} 
                                                                    />
                                                                </label>

                                                                <label>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Sizes (comma-separated)</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.sizes} 
                                                                        onChange={e => setEditForm({ ...editForm, sizes: e.target.value })} 
                                                                        placeholder="e.g. 5KVA, 3KVA or S, M, L"
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }} 
                                                                    />
                                                                </label>

                                                                <div style={{ gridColumn: 'span 2' }}>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Product Photo</span>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        {editForm.imageUrl ? (
                                                                            <img src={editForm.imageUrl} alt="Preview" style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                                                        ) : (
                                                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No Photo</span>
                                                                        )}
                                                                        <input 
                                                                            type="file" 
                                                                            accept="image/*" 
                                                                            onChange={handleEditFileChange} 
                                                                            style={{ fontSize: '12px', flex: 1 }} 
                                                                        />
                                                                        <input 
                                                                            type="url" 
                                                                            placeholder="Or Image URL" 
                                                                            value={editForm.imageUrl} 
                                                                            onChange={e => setEditForm({ ...editForm, imageUrl: e.target.value })} 
                                                                            style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }} 
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div style={{ gridColumn: '1 / -1', padding: '12px 16px', borderRadius: '8px', border: editForm.isPromotion ? '1px solid var(--accent-primary)' : '1px dashed var(--border)', backgroundColor: editForm.isPromotion ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
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
                                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                                Display in limited-time promotional deals and hero carousel with discount badges.
                                                                            </div>
                                                                        </div>
                                                                    </label>
                                                                    {editForm.isPromotion && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Discount %:</span>
                                                                            <input 
                                                                                type="number" 
                                                                                min="1" 
                                                                                max="90" 
                                                                                value={editForm.promoDiscountPercent} 
                                                                                onChange={e => setEditForm({ ...editForm, promoDiscountPercent: parseInt(e.target.value, 10) || 0 })} 
                                                                                style={{ width: '70px', padding: '6px 8px', fontSize: '13px', fontWeight: '700', textAlign: 'center' }}
                                                                            />
                                                                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)' }}>% OFF</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <label style={{ gridColumn: '1 / -1' }}>
                                                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Product Specifications & Description</span>
                                                                    <textarea 
                                                                        rows="3" 
                                                                        value={editForm.description} 
                                                                        onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
                                                                        placeholder="Enter item specifications, warranty coverage, compatibility, package contents, dimensions, or special handling notes..."
                                                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', resize: 'vertical' }} 
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
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        {product.image_url ? (
                                                            <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-tertiary)' }}>
                                                                <img src={product.image_url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </div>
                                                        ) : (
                                                            <div style={{ width: '44px', height: '44px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                                                📦
                                                            </div>
                                                        )}
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>{product.title}</span>
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
                                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                                {product.brand && (
                                                                    <span style={{ color: 'var(--accent-primary)', fontWeight: '600', marginRight: '6px' }}>
                                                                        [{product.brand}]
                                                                    </span>
                                                                )}
                                                                {product.category || 'Uncategorized'} {product.sub_category ? `› ${product.sub_category}` : ''}
                                                            </div>
                                                            {(product.colors?.length > 0 || product.sizes?.length > 0) && (
                                                                <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '4px' }}>
                                                                    {product.colors?.length > 0 && `Colors: ${product.colors.join(', ')}`}
                                                                    {product.colors?.length > 0 && product.sizes?.length > 0 && ' | '}
                                                                    {product.sizes?.length > 0 && `Sizes: ${product.sizes.join(', ')}`}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                                                    {product.unit || 'EA'}
                                                </td>
                                                <td style={{ padding: '14px 20px', color: (product.price_cents || 0) > 0 ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold' }}>
                                                    {(product.price_cents || 0) > 0 
                                                        ? `$${(product.price_cents / 100).toFixed(2)}`
                                                        : <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--warning)' }}>Set Price</span>
                                                    }
                                                </td>
                                                <td style={{ padding: '14px 20px' }}>
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
                                                            <button
                                                                onClick={() => handleQuickRestock(product.id, 5)}
                                                                className="btn-secondary"
                                                                style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '700', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', whiteSpace: 'nowrap' }}
                                                                title="Quickly add +5 units to stock"
                                                            >
                                                                ⚡ +5
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                        <button 
                                                            onClick={() => handleToggleQuickPromo(product)}
                                                            className="btn-secondary"
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
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStartEdit(product)}
                                                            className="btn-secondary"
                                                            style={{ padding: '6px 12px', fontSize: '13px' }}
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(product.id)}
                                                            className="btn-secondary"
                                                            style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                                                        >
                                                            Delete
                                                        </button>
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
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Showing <strong>{(safeCurrentPage - 1) * pageSize + 1}</strong> to <strong>{Math.min(safeCurrentPage * pageSize, filteredCount)}</strong> of <strong>{filteredCount}</strong> items
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={safeCurrentPage === 1}
                                    className="btn-secondary"
                                    style={{ padding: '6px 10px', fontSize: '12px' }}
                                    title="First Page"
                                >
                                    « First
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={safeCurrentPage === 1}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                    ‹ Prev
                                </button>

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

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={safeCurrentPage === totalPages}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                    Next ›
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={safeCurrentPage === totalPages}
                                    className="btn-secondary"
                                    style={{ padding: '6px 10px', fontSize: '12px' }}
                                    title="Last Page"
                                >
                                    Last »
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
