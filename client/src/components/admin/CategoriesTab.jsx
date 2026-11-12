export function CategoriesTab({ categoriesList, categoryForm, editingCategoryId, handleCancelCategoryForm, handleDeleteCategory, handleSaveCategory, handleStartAddCategory, handleStartEditCategory, isEditingCategory, savingCategory, setCategoryForm }) {
    return (
        <div className="glass-panel animate-fade-in" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '22px', color: 'var(--text-primary)' }}>
                        🏷️ Categories & Subcategories ({categoriesList.length})
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Configure official marketplace categories, subcategory tags, and custom emoji icons.
                    </p>
                </div>

                {!isEditingCategory && (
                    <button
                        onClick={handleStartAddCategory}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px' }}
                    >
                        ➕ Add New Category
                    </button>
                )}
            </div>

            {/* Add / Edit Category Form */}
            {isEditingCategory && (
                <form 
                    onSubmit={handleSaveCategory} 
                    className="glass-panel animate-fade-in" 
                    style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--accent-primary)' }}
                >
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
                        {editingCategoryId ? '✏️ Edit Marketplace Category' : '➕ Create New Marketplace Category'}
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Category Name *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Solar & Energy, Agriculture"
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Icon Emoji
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. 📱, 🚗, ⚡, 🌾, 🏡"
                                value={categoryForm.icon}
                                onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Subcategories (comma-separated list)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Solar Panels, Inverters, Backup Batteries, Solar Geysers"
                            value={categoryForm.subCategoriesText}
                            onChange={(e) => setCategoryForm(prev => ({ ...prev, subCategoriesText: e.target.value }))}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                        />
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Separate each subcategory with a comma. Vendors and buyers will see these in filter dropdowns.
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={handleCancelCategoryForm}
                            className="btn-secondary"
                            style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={savingCategory}
                            className="btn-primary"
                            style={{ padding: '8px 20px', fontSize: '13px', fontWeight: '700' }}
                        >
                            {savingCategory ? 'Saving...' : editingCategoryId ? 'Save Changes' : 'Create Category'}
                        </button>
                    </div>
                </form>
            )}

            {/* Categories Grid Table */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {categoriesList.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No categories configured yet. Click "Add New Category" above to create one.
                    </div>
                ) : (
                    categoriesList.map(cat => (
                        <div 
                            key={cat.id} 
                            className="glass-panel" 
                            style={{ 
                                padding: '18px', 
                                borderRadius: '12px', 
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                backgroundColor: 'var(--bg-secondary)'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '24px' }}>{cat.icon || '🏷️'}</span>
                                        <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{cat.name}</strong>
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            onClick={() => handleStartEditCategory(cat)}
                                            className="btn-secondary"
                                            style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '600' }}
                                            title="Edit category and subcategories"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                            className="btn-secondary"
                                            style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                            title="Delete category" aria-label={`Delete category ${cat.name}`}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                {/* Subcategories Tags */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                                    {Array.isArray(cat.sub_categories) && cat.sub_categories.length > 0 ? (
                                        cat.sub_categories.map((sub, idx) => (
                                            <span 
                                                key={idx} 
                                                style={{ 
                                                    fontSize: '11px', 
                                                    backgroundColor: 'var(--bg-primary)', 
                                                    color: 'var(--text-secondary)', 
                                                    padding: '3px 8px', 
                                                    borderRadius: '6px', 
                                                    border: '1px solid var(--border)' 
                                                }}
                                            >
                                                {sub}
                                            </span>
                                        ))
                                    ) : (
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No subcategories defined</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
