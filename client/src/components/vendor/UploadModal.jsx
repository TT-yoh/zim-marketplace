import { ProductUploadForm } from '../ProductUploadForm.jsx';
import { BulkProductUpload } from '../BulkProductUpload.jsx';

export function UploadModal({ allVendors, loadInventoryAndProfile, selectedShopId, setShowUploadModal, setUploadMode, shopId, uploadMode }) {
    return (
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1100,
                padding: '20px'
            }}
            onClick={() => setShowUploadModal(false)}
        >
            <div 
                style={{
                    width: '100%',
                    maxWidth: '720px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            className={uploadMode === 'single' ? 'btn-primary' : 'btn-secondary'} 
                            style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '8px' }}
                            onClick={() => setUploadMode('single')}
                        >
                            ➕ Add Single Product
                        </button>
                        <button 
                            className={uploadMode === 'bulk' ? 'btn-primary' : 'btn-secondary'} 
                            style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '8px' }}
                            onClick={() => setUploadMode('bulk')}
                        >
                            📁 Bulk CSV Import
                        </button>
                    </div>
                    <button 
                        onClick={() => setShowUploadModal(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer', padding: '4px' }}
                        title="Close Modal" aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                {uploadMode === 'single' ? (
                    <ProductUploadForm 
                        shopId={selectedShopId === 'ALL' ? (shopId || allVendors[0]?.id) : selectedShopId} 
                        onUploadSuccess={() => {
                            loadInventoryAndProfile();
                            setShowUploadModal(false);
                        }} 
                    />
                ) : (
                    <BulkProductUpload 
                        shopId={selectedShopId === 'ALL' ? (shopId || allVendors[0]?.id) : selectedShopId} 
                        onUploadSuccess={() => {
                            loadInventoryAndProfile();
                            setShowUploadModal(false);
                        }} 
                    />
                )}
            </div>
        </div>
    );
}
