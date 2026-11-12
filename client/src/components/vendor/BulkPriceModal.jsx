import { Modal, Button } from '../ui/index.js';

export function BulkPriceModal({ applyingBulkPrice, bulkPriceMode, bulkPriceValue, handleApplyBulkPriceAdjustment, selectedProductIds, setBulkPriceMode, setBulkPriceValue, setShowBulkPriceModal }) {
    return (
        <Modal
            variant="solid"
            ariaLabel="Bulk price adjustment"
            onClose={() => !applyingBulkPrice && setShowBulkPriceModal(false)}
            overlayStyle={{ zIndex: 10000 }}
            style={{ padding: '28px', maxWidth: '540px' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
                <div>
                    <h3 className="m-0 fs-18 fw-700 text-primary gap-8 row">
                        <span>💰</span> Bulk Price Adjustment
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Update selling prices for <strong>{selectedProductIds.size}</strong> selected items
                    </p>
                </div>
                <button 
                    onClick={() => !applyingBulkPrice && setShowBulkPriceModal(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', padding: '4px' }}
                    title="Close Modal" aria-label="Close"
                >
                    ✕
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                    <label className="block fs-13 fw-600 text-primary mb-8">
                        Adjustment Action
                    </label>
                    <select 
                        value={bulkPriceMode} 
                        onChange={e => setBulkPriceMode(e.target.value)} className="w-full p-10-14 rounded-8 border bg-secondary text-primary fs-14"
                    >
                        <option value="percent_increase">📈 Markup by Percentage (+ %)</option>
                        <option value="percent_discount">🏷️ Discount by Percentage (- %)</option>
                        <option value="fixed_increase">💵 Increase by Fixed USD (+ $)</option>
                        <option value="fixed_decrease">📉 Decrease by Fixed USD (- $)</option>
                        <option value="set_fixed">🎯 Set Exact Fixed Price (= $)</option>
                    </select>
                </div>

                <div>
                    <label className="block fs-13 fw-600 text-primary mb-8">
                        {bulkPriceMode.startsWith('percent') ? 'Percentage Value (%)' : 'Amount in USD ($)'}
                    </label>
                    <input 
                        type="number" 
                        min="0.01" 
                        step="0.01" 
                        value={bulkPriceValue} 
                        onChange={e => setBulkPriceValue(e.target.value)}
                        placeholder={bulkPriceMode.startsWith('percent') ? "e.g. 15 for 15%" : "e.g. 5.00 for $5.00"} className="w-full p-10-14 rounded-8 border bg-secondary text-primary fs-14"
                    />
                </div>

                {/* Live calculation preview */}
                <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <div className="fw-600 text-accent mb-4">💡 Live Preview:</div>
                    {bulkPriceMode === 'percent_increase' && (
                        <span>A $20.00 product will become <strong>${(20 * (1 + (parseFloat(bulkPriceValue) || 0) / 100)).toFixed(2)}</strong> (+{bulkPriceValue || 0}%)</span>
                    )}
                    {bulkPriceMode === 'percent_discount' && (
                        <span>A $20.00 product will become <strong>${Math.max(0.10, 20 * (1 - (parseFloat(bulkPriceValue) || 0) / 100)).toFixed(2)}</strong> (-{bulkPriceValue || 0}%)</span>
                    )}
                    {bulkPriceMode === 'fixed_increase' && (
                        <span>A $20.00 product will become <strong>${(20 + (parseFloat(bulkPriceValue) || 0)).toFixed(2)}</strong> (+${parseFloat(bulkPriceValue) || 0})</span>
                    )}
                    {bulkPriceMode === 'fixed_decrease' && (
                        <span>A $20.00 product will become <strong>${Math.max(0.10, 20 - (parseFloat(bulkPriceValue) || 0)).toFixed(2)}</strong> (-${parseFloat(bulkPriceValue) || 0})</span>
                    )}
                    {bulkPriceMode === 'set_fixed' && (
                        <span>All selected products will be set to exactly <strong>${(parseFloat(bulkPriceValue) || 0).toFixed(2)}</strong></span>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <Button 
                        type="button"
                        onClick={() => setShowBulkPriceModal(false)}
                        disabled={applyingBulkPrice}
                        variant="secondary" className="p-10-18 fs-13"
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="button"
                        onClick={handleApplyBulkPriceAdjustment}
                        disabled={applyingBulkPrice || !bulkPriceValue || parseFloat(bulkPriceValue) <= 0}
                        style={{ padding: '10px 22px', fontSize: '13px', fontWeight: '700' }}
                    >
                        {applyingBulkPrice ? 'Applying Updates...' : `Apply to ${selectedProductIds.size} Products`}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
