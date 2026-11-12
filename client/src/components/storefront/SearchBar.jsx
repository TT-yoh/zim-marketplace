export function SearchBar({ categories, products, searchTerm, setIsSearchModalOpen, setSearchTerm }) {
    return (
        <div 
            className="storefront-search-hero-bar"
            onClick={() => setIsSearchModalOpen(true)}
            title="Click to search products, brands, or verified Zimbabwe stores (Ctrl + K)"
        >
            <span style={{ fontSize: '18px', color: 'var(--accent-primary)' }}>🔍</span>
            <span style={{ fontSize: '13.5px', color: 'var(--text-muted)', flex: 1, fontWeight: '500' }}>
                {searchTerm ? `Active Search: "${searchTerm}" • Tap to search or browse categories` : 'Search 100+ items across Harare & Bulawayo... (Press Ctrl + K or Click here)'}
            </span>
            {searchTerm ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSearchTerm('');
                    }}
                    style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                    }}
                >
                    Clear "{searchTerm}" ✕
                </button>
            ) : (
                <kbd style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontWeight: '700'
                }}>
                    Ctrl K
                </kbd>
            )}
        </div>
    );
}
