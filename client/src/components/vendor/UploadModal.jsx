import { Modal } from '../ui/index.js';
import { ProductUploadForm } from '../ProductUploadForm.jsx';
import { BulkProductUpload } from '../BulkProductUpload.jsx';

export function UploadModal({ allVendors, loadInventoryAndProfile, selectedShopId, setShowUploadModal, setUploadMode, shopId, uploadMode }) {
    return (
        <Modal variant="solid" size="lg" ariaLabel="Add products" onClose={() => setShowUploadModal(false)}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                <div className="flex gap-12">
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
        </Modal>
    );
}
