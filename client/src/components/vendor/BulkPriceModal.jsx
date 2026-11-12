export function BulkPriceModal({ applyingBulkPrice, bulkPriceMode, bulkPriceValue, handleApplyBulkPriceAdjustment, products, selectedProductIds, setBulkPriceMode, setBulkPriceValue, setShowBulkPriceModal }) {
    return (
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '20px'
            }}
            onClick={() => !applyingBulkPrice && setShowBulkPriceModal(false)}
        >
            <div 
                style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '28px',
                    maxWidth: '540px',
                    width: '100%',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                            Adjustment Action
                        </label>
                        <select 
                            value={bulkPriceMode} 
                            onChange={e => setBulkPriceMode(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
                        >
                            <option value="percent_increase">📈 Markup by Percentage (+ %)</option>
                            <option value="percent_discount">🏷️ Discount by Percentage (- %)</option>
                            <option value="fixed_increase">💵 Increase by Fixed USD (+ $)</option>
                            <option value="fixed_decrease">📉 Decrease by Fixed USD (- $)</option>
                            <option value="set_fixed">🎯 Set Exact Fixed Price (= $)</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                            {bulkPriceMode.startsWith('percent') ? 'Percentage Value (%)' : 'Amount in USD ($)'}
                        </label>
                        <input 
                            type="number" 
                            min="0.01" 
                            step="0.01" 
                            value={bulkPriceValue} 
                            onChange={e => setBulkPriceValue(e.target.value)}
                            placeholder={bulkPriceMode.startsWith('percent') ? "e.g. 15 for 15%" : "e.g. 5.00 for $5.00"}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
                        />
                    </div>

                    {/* Live calculation preview */}
                    <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <div style={{ fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '4px' }}>💡 Live Preview:</div>
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
                        <button 
                            type="button"
                            onClick={() => setShowBulkPriceModal(false)}
                            disabled={applyingBulkPrice}
                            className="btn-secondary"
                            style={{ padding: '10px 18px', fontSize: '13px' }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onClick={handleApplyBulkPriceAdjustment}
                            disabled={applyingBulkPrice || !bulkPriceValue || parseFloat(bulkPriceValue) <= 0}
                            className="btn-primary"
                            style={{ padding: '10px 22px', fontSize: '13px', fontWeight: '700' }}
                        >
                            {applyingBulkPrice ? 'Applying Updates...' : `Apply to ${selectedProductIds.size} Products`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
