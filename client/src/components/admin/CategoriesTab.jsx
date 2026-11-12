import { Button } from '../ui/index.js';

export function CategoriesTab({ categoriesList, categoryForm, editingCategoryId, handleCancelCategoryForm, handleDeleteCategory, handleSaveCategory, handleStartAddCategory, handleStartEditCategory, isEditingCategory, savingCategory, setCategoryForm }) {
    return (
        <div className="glass-panel animate-fade-in p-32">
            <div className="between mb-24 wrap gap-16 row">
                <div>
                    <h3 className="m-0 fs-22 text-primary">
                        🏷️ Categories & Subcategories ({categoriesList.length})
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Configure official marketplace categories, subcategory tags, and custom emoji icons.
                    </p>
                </div>

                {!isEditingCategory && (
                    <Button
                        onClick={handleStartAddCategory}
                        className="gap-6 fs-13 p-8-16 row"
                    >
                        ➕ Add New Category
                    </Button>
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
                            <label className="block fs-12 fw-600 text-secondary mb-6">
                                Category Name *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Solar & Energy, Agriculture"
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))} className="w-full p-10-14 rounded-8 border bg-primary text-primary fs-14"
                            />
                        </div>

                        <div>
                            <label className="block fs-12 fw-600 text-secondary mb-6">
                                Icon Emoji
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. 📱, 🚗, ⚡, 🌾, 🏡"
                                value={categoryForm.icon}
                                onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))} className="w-full p-10-14 rounded-8 border bg-primary text-primary fs-14"
                            />
                        </div>
                    </div>

                    <div className="mb-20">
                        <label className="block fs-12 fw-600 text-secondary mb-6">
                            Subcategories (comma-separated list)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Solar Panels, Inverters, Backup Batteries, Solar Geysers"
                            value={categoryForm.subCategoriesText}
                            onChange={(e) => setCategoryForm(prev => ({ ...prev, subCategoriesText: e.target.value }))} className="w-full p-10-14 rounded-8 border bg-primary text-primary fs-14"
                        />
                        <div className="fs-11 text-muted mt-4">
                            Separate each subcategory with a comma. Vendors and buyers will see these in filter dropdowns.
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <Button
                            type="button"
                            onClick={handleCancelCategoryForm}
                            variant="secondary" className="p-8-16 fs-13"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={savingCategory}
                            style={{ padding: '8px 20px', fontSize: '13px', fontWeight: '700' }}
                        >
                            {savingCategory ? 'Saving...' : editingCategoryId ? 'Save Changes' : 'Create Category'}
                        </Button>
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
                                    <div className="gap-8 row">
                                        <span className="fs-24">{cat.icon || '🏷️'}</span>
                                        <strong className="fs-16 text-primary">{cat.name}</strong>
                                    </div>

                                    <div className="flex gap-6">
                                        <Button
                                            onClick={() => handleStartEditCategory(cat)}
                                            variant="secondary" className="p-4-8 fs-11 fw-600"
                                            title="Edit category and subcategories"
                                        >
                                            ✏️ Edit
                                        </Button>
                                        <Button
                                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                            variant="secondary"
                                            style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                            title="Delete category" aria-label={`Delete category ${cat.name}`}
                                        >
                                            🗑️
                                        </Button>
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
                                        <span className="fs-11 text-muted">No subcategories defined</span>
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
