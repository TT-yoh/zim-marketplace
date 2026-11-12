export function CatalogFilters({ categories, categoryIconMap, conditions, filteredProducts, handleViewModeChange, maxPrice, minPrice, onlyInStock, onlyPromos, onlyVerified, products, resetFilters, searchTerm, selectedCategory, selectedCondition, selectedSubCategory, selectedVendorShopId, setMaxPrice, setMinPrice, setOnlyInStock, setOnlyPromos, setOnlyVerified, setSelectedCategory, setSelectedCondition, setSelectedSubCategory, setSelectedVendorShopId, setSortBy, sortBy, subCategoriesMap, vendorProfiles, viewMode }) {
    return (
        <>
            {/* Category Chips */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => {
                            setSelectedCategory(cat);
                            setSelectedSubCategory('All');
                        }}
                        className={selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}
                        style={{
                            borderRadius: '20px',
                            padding: '8px 16px',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: '600'
                        }}
                    >
                        <span>{categoryIconMap[cat] || '🏷️'}</span>
                        <span>{cat}</span>
                    </button>
                ))}
            </div>

            {/* Sub-Category Chips (if available for selected main category) */}
            {subCategoriesMap[selectedCategory] && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '6px' }}>
                    <button
                        onClick={() => setSelectedSubCategory('All')}
                        className={selectedSubCategory === 'All' ? 'btn-primary' : 'btn-secondary'}
                        style={{ borderRadius: '14px', padding: '4px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                    >
                        All {selectedCategory}
                    </button>
                    {subCategoriesMap[selectedCategory].map(subCat => (
                        <button
                            key={subCat}
                            onClick={() => setSelectedSubCategory(subCat)}
                            className={selectedSubCategory === subCat ? 'btn-primary' : 'btn-secondary'}
                            style={{ borderRadius: '14px', padding: '4px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                        >
                            {subCat}
                        </button>
                    ))}
                </div>
            )}

            {/* Modern Catalog Control Toolbar: View Switcher (Grid/List), Quick Filters & Refinements */}
            <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Top Row: View Mode Toggle & Quick Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {/* View Mode Toggle */}
                        <div className="view-mode-toggle" role="group" aria-label="Catalog View Mode">
                            <button 
                                type="button"
                                onClick={() => handleViewModeChange('grid')} 
                                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                title="Grid View (Amazon / Takealot Cards)"
                            >
                                <span style={{ fontSize: '13px' }}>▦</span> Grid
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleViewModeChange('list')} 
                                className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                                title="List View (Detailed Specifications & Horizontal Row Layout)"
                            >
                                <span style={{ fontSize: '13px' }}>☰</span> List
                            </button>
                        </div>

                        {/* Quick Filter Chips */}
                        <div className="quick-filter-pills">
                            <button
                                type="button"
                                onClick={() => setOnlyPromos(prev => !prev)}
                                className={`quick-filter-pill ${onlyPromos ? 'active' : ''}`}
                                title="Show only discounted promotions and deals"
                            >
                                🔥 Hot Deals {onlyPromos ? '✓' : ''}
                            </button>
                            <button
                                type="button"
                                onClick={() => setOnlyVerified(prev => !prev)}
                                className={`quick-filter-pill ${onlyVerified ? 'active' : ''}`}
                                title="Show products from verified sellers only"
                            >
                                🛡️ Verified Stores {onlyVerified ? '✓' : ''}
                            </button>
                            <button
                                type="button"
                                onClick={() => setOnlyInStock(prev => !prev)}
                                className={`quick-filter-pill ${onlyInStock ? 'active' : ''}`}
                                title="Show only items with confirmed warehouse stock"
                            >
                                ⚡ In Stock {onlyInStock ? '✓' : ''}
                            </button>
                        </div>
                    </div>

                    {/* Live Counter Badge */}
                    <span style={{ fontSize: '12px', fontWeight: '600', padding: '6px 14px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                        Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} across {Object.keys(vendorProfiles).length} {Object.keys(vendorProfiles).length === 1 ? 'store' : 'stores'}
                    </span>
                </div>

                {/* Bottom Row: Price Range, Store Selector, Condition, Sort, Reset */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    {/* Price Range */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-secondary)' }}>Price ($):</span>
                        <input 
                            type="number" 
                            placeholder="Min" 
                            min="0"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            style={{ width: '74px', padding: '6px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                        />
                        <span style={{ color: 'var(--text-muted)' }}>–</span>
                        <input 
                            type="number" 
                            placeholder="Max" 
                            min="0"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            style={{ width: '74px', padding: '6px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    {/* Filters & Sort Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Store Filter */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: '600' }}>Store:</span>
                            <select 
                                value={selectedVendorShopId}
                                onChange={(e) => setSelectedVendorShopId(e.target.value)}
                                style={{ padding: '6px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            >
                                <option value="All">All Stores ({Object.keys(vendorProfiles).length})</option>
                                {Object.entries(vendorProfiles).map(([shopId, profile]) => (
                                    <option key={shopId} value={shopId}>
                                        {profile.store_name} {profile.is_verified ? '✔' : ''}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {/* Condition */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: '600' }}>Condition:</span>
                            <select 
                                value={selectedCondition}
                                onChange={(e) => setSelectedCondition(e.target.value)}
                                style={{ padding: '6px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            >
                                {conditions.map(cond => (
                                    <option key={cond} value={cond}>{cond === 'All' ? 'All Conditions' : cond}</option>
                                ))}
                            </select>
                        </label>

                        {/* Sort By */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: '600' }}>Sort:</span>
                            <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                style={{ padding: '6px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            >
                                <option value="newest">Newest First</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                                <option value="title_asc">Name: A–Z</option>
                            </select>
                        </label>

                        {/* Reset Button */}
                        {(searchTerm || selectedCategory !== 'All' || selectedSubCategory !== 'All' || minPrice || maxPrice || selectedCondition !== 'All' || selectedVendorShopId !== 'All' || sortBy !== 'newest' || onlyPromos || onlyVerified || onlyInStock) && (
                            <button 
                                type="button"
                                onClick={resetFilters}
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            >
                                ✕ Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
