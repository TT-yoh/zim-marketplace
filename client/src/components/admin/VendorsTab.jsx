export function VendorsTab({ allVendors, handleApproveBuyer, handleApproveVendor, handleDeleteVendorStore, handleToggleStoreStatus, handleViewSecureDocument, pendingBuyers, pendingVendors }) {
    return (
        <div className="animate-fade-in">
            {/* Pending Vendor KYC Verifications */}
            {pendingVendors.length > 0 && (
                <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px', border: '1px solid var(--warning)' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', color: 'var(--warning)' }}>
                        ⚠️ Pending KYC Verifications ({pendingVendors.length})
                    </h3>
                    <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Review identity and company documents to grant verified status.
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '14px', fontWeight: '600' }}>Store Name</th>
                                    <th style={{ padding: '14px', fontWeight: '600' }}>WhatsApp</th>
                                    <th style={{ padding: '14px', fontWeight: '600' }}>Documents</th>
                                    <th style={{ padding: '14px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingVendors.map(vendor => (
                                    <tr key={vendor.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>{vendor.store_name}</td>
                                        <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>+{vendor.whatsapp_number}</td>
                                        <td style={{ padding: '14px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                                    {vendor.vendor_type || 'individual'} Seller
                                                </span>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewSecureDocument(vendor.id_document_url)}
                                                        className="btn-secondary"
                                                        style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '600', color: 'var(--accent-primary)' }}
                                                        title="View secure National ID"
                                                    >
                                                        🔒 National ID
                                                    </button>
                                                    {vendor.selfie_with_id_url && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewSecureDocument(vendor.selfie_with_id_url)}
                                                            className="btn-secondary"
                                                            style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '600', color: 'var(--accent-primary)' }}
                                                            title="View selfie with ID"
                                                        >
                                                            🔒 Selfie w/ ID
                                                        </button>
                                                    )}
                                                    {vendor.company_registration_url && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewSecureDocument(vendor.company_registration_url)}
                                                            className="btn-secondary"
                                                            style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '600', color: 'var(--accent-primary)' }}
                                                            title="View company registration document"
                                                        >
                                                            🔒 Company Docs
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px', textAlign: 'right' }}>
                                            <button 
                                                onClick={() => handleApproveVendor(vendor.id)}
                                                className="btn-primary"
                                                style={{ backgroundColor: 'var(--success)', fontSize: '13px', padding: '8px 16px' }}
                                            >
                                                Approve ✔️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pending Buyer Verifications */}
            {pendingBuyers.length > 0 && (
                <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', color: 'var(--accent-primary)' }}>
                        🛡️ Pending Buyer Verifications ({pendingBuyers.length})
                    </h3>
                    <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Review customer identity and residence documents to grant verified buyer status.
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '14px', fontWeight: '600' }}>Buyer Name</th>
                                    <th style={{ padding: '14px', fontWeight: '600' }}>Phone / WhatsApp</th>
                                    <th style={{ padding: '14px', fontWeight: '600' }}>Delivery City</th>
                                    <th style={{ padding: '14px', fontWeight: '600' }}>Documents</th>
                                    <th style={{ padding: '14px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingBuyers.map(buyer => (
                                    <tr key={buyer.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>{buyer.full_name}</td>
                                        <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>{buyer.phone_number}</td>
                                        <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>{buyer.delivery_city || 'Harare'}</td>
                                        <td style={{ padding: '14px' }}>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewSecureDocument(buyer.id_document_url)}
                                                    className="btn-secondary"
                                                    style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '600', color: 'var(--accent-primary)' }}
                                                    title="View National ID"
                                                >
                                                    🔒 National ID
                                                </button>
                                                {buyer.proof_of_residence_url && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewSecureDocument(buyer.proof_of_residence_url)}
                                                        className="btn-secondary"
                                                        style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '600', color: 'var(--accent-primary)' }}
                                                        title="View proof of residence"
                                                    >
                                                        🔒 Residence Proof
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px', textAlign: 'right' }}>
                                            <button 
                                                onClick={() => handleApproveBuyer(buyer.id)}
                                                className="btn-primary"
                                                style={{ backgroundColor: 'var(--success)', fontSize: '13px', padding: '8px 16px' }}
                                            >
                                                Approve ✔️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Registered Vendor Stores Directory */}
            <div className="glass-panel" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '22px', color: 'var(--text-primary)' }}>
                            🏪 Registered Vendor Stores ({allVendors.length})
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Manage active status, suspend non-operational stores, or permanently remove merchant profiles.
                        </p>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
                                <th style={{ padding: '14px', fontWeight: '600' }}>Store Name</th>
                                <th style={{ padding: '14px', fontWeight: '600' }}>WhatsApp</th>
                                <th style={{ padding: '14px', fontWeight: '600' }}>Type</th>
                                <th style={{ padding: '14px', fontWeight: '600' }}>Status</th>
                                <th style={{ padding: '14px', fontWeight: '600', textAlign: 'right' }}>Store Controls</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allVendors.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No stores registered yet.</td>
                                </tr>
                            ) : (
                                allVendors.map(vendor => {
                                    const isActive = vendor.is_active !== false;
                                    return (
                                        <tr key={vendor.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span>{vendor.store_name}</span>
                                                    {vendor.is_verified && (
                                                        <span style={{ fontSize: '11px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                                            ✓ Verified
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>+{vendor.whatsapp_number}</td>
                                            <td style={{ padding: '14px', color: 'var(--text-muted)', textTransform: 'capitalize', fontSize: '13px' }}>
                                                {vendor.vendor_type || 'individual'}
                                            </td>
                                            <td style={{ padding: '14px' }}>
                                                <span style={{
                                                    fontSize: '12px',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontWeight: '700',
                                                    backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                    color: isActive ? 'var(--success)' : 'var(--danger)'
                                                }}>
                                                    {isActive ? '● Active' : '○ Suspended'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => handleToggleStoreStatus(vendor.id, vendor.is_active)}
                                                        className="btn-secondary"
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            color: isActive ? 'var(--warning, #f59e0b)' : 'var(--success)',
                                                            borderColor: isActive ? 'var(--warning, #f59e0b)' : 'var(--success)'
                                                        }}
                                                        title={isActive ? "Hide products from storefront" : "Restore store and products"}
                                                    >
                                                        {isActive ? '⏸️ Suspend' : '▶️ Activate'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteVendorStore(vendor.id, vendor.store_name)}
                                                        className="btn-secondary"
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            color: 'var(--danger)',
                                                            borderColor: 'var(--danger)'
                                                        }}
                                                        title="Permanently remove this store and its catalog"
                                                    >
                                                        🗑️ Delete
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
            </div>
        </div>
    );
}
