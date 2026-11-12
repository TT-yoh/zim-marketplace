import { Button } from '../ui/index.js';

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
                    <div className="ui-table-wrap">
                        <table className="ui-table">
                            <thead>
                                <tr className="ui-thead-row">
                                    <th className="ui-cell fw-600">Store Name</th>
                                    <th className="ui-cell fw-600">WhatsApp</th>
                                    <th className="ui-cell fw-600">Documents</th>
                                    <th className="ui-cell fw-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingVendors.map(vendor => (
                                    <tr key={vendor.id} className="ui-row-divider">
                                        <td className="ui-cell text-primary fw-600">{vendor.store_name}</td>
                                        <td className="ui-cell text-secondary">+{vendor.whatsapp_number}</td>
                                        <td className="ui-cell">
                                            <div className="gap-4 stack">
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                                    {vendor.vendor_type || 'individual'} Seller
                                                </span>
                                                <div className="flex gap-6 wrap mt-4">
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleViewSecureDocument(vendor.id_document_url)}
                                                        variant="secondary" className="p-4-8 fs-11 fw-600 text-accent"
                                                        title="View secure National ID"
                                                    >
                                                        🔒 National ID
                                                    </Button>
                                                    {vendor.selfie_with_id_url && (
                                                        <Button
                                                            type="button"
                                                            onClick={() => handleViewSecureDocument(vendor.selfie_with_id_url)}
                                                            variant="secondary" className="p-4-8 fs-11 fw-600 text-accent"
                                                            title="View selfie with ID"
                                                        >
                                                            🔒 Selfie w/ ID
                                                        </Button>
                                                    )}
                                                    {vendor.company_registration_url && (
                                                        <Button
                                                            type="button"
                                                            onClick={() => handleViewSecureDocument(vendor.company_registration_url)}
                                                            variant="secondary" className="p-4-8 fs-11 fw-600 text-accent"
                                                            title="View company registration document"
                                                        >
                                                            🔒 Company Docs
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="ui-cell text-right">
                                            <Button 
                                                onClick={() => handleApproveVendor(vendor.id)}
                                                style={{ backgroundColor: 'var(--success)', fontSize: '13px', padding: '8px 16px' }}
                                            >
                                                Approve ✔️
                                            </Button>
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
                    <div className="ui-table-wrap">
                        <table className="ui-table">
                            <thead>
                                <tr className="ui-thead-row">
                                    <th className="ui-cell fw-600">Buyer Name</th>
                                    <th className="ui-cell fw-600">Phone / WhatsApp</th>
                                    <th className="ui-cell fw-600">Delivery City</th>
                                    <th className="ui-cell fw-600">Documents</th>
                                    <th className="ui-cell fw-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingBuyers.map(buyer => (
                                    <tr key={buyer.id} className="ui-row-divider">
                                        <td className="ui-cell text-primary fw-600">{buyer.full_name}</td>
                                        <td className="ui-cell text-secondary">{buyer.phone_number}</td>
                                        <td className="ui-cell text-secondary">{buyer.delivery_city || 'Harare'}</td>
                                        <td className="ui-cell">
                                            <div className="flex gap-6 wrap">
                                                <Button
                                                    type="button"
                                                    onClick={() => handleViewSecureDocument(buyer.id_document_url)}
                                                    variant="secondary" className="p-4-8 fs-11 fw-600 text-accent"
                                                    title="View National ID"
                                                >
                                                    🔒 National ID
                                                </Button>
                                                {buyer.proof_of_residence_url && (
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleViewSecureDocument(buyer.proof_of_residence_url)}
                                                        variant="secondary" className="p-4-8 fs-11 fw-600 text-accent"
                                                        title="View proof of residence"
                                                    >
                                                        🔒 Residence Proof
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="ui-cell text-right">
                                            <Button 
                                                onClick={() => handleApproveBuyer(buyer.id)}
                                                style={{ backgroundColor: 'var(--success)', fontSize: '13px', padding: '8px 16px' }}
                                            >
                                                Approve ✔️
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Registered Vendor Stores Directory */}
            <div className="glass-panel p-32">
                <div className="between mb-24 wrap gap-12 row">
                    <div>
                        <h3 className="m-0 fs-22 text-primary">
                            🏪 Registered Vendor Stores ({allVendors.length})
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Manage active status, suspend non-operational stores, or permanently remove merchant profiles.
                        </p>
                    </div>
                </div>

                <div className="ui-table-wrap">
                    <table className="ui-table">
                        <thead>
                            <tr className="ui-thead-row">
                                <th className="ui-cell fw-600">Store Name</th>
                                <th className="ui-cell fw-600">WhatsApp</th>
                                <th className="ui-cell fw-600">Type</th>
                                <th className="ui-cell fw-600">Status</th>
                                <th className="ui-cell fw-600 text-right">Store Controls</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allVendors.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-24 text-center text-secondary">No stores registered yet.</td>
                                </tr>
                            ) : (
                                allVendors.map(vendor => {
                                    const isActive = vendor.is_active !== false;
                                    return (
                                        <tr key={vendor.id} className="ui-row-divider">
                                            <td className="ui-cell text-primary fw-600">
                                                <div className="gap-8 row">
                                                    <span>{vendor.store_name}</span>
                                                    {vendor.is_verified && (
                                                        <span style={{ fontSize: '11px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                                            ✓ Verified
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="ui-cell text-secondary">+{vendor.whatsapp_number}</td>
                                            <td style={{ padding: '14px', color: 'var(--text-muted)', textTransform: 'capitalize', fontSize: '13px' }}>
                                                {vendor.vendor_type || 'individual'}
                                            </td>
                                            <td className="ui-cell">
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
                                            <td className="ui-cell text-right">
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <Button
                                                        onClick={() => handleToggleStoreStatus(vendor.id, vendor.is_active)}
                                                        variant="secondary"
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
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleDeleteVendorStore(vendor.id, vendor.store_name)}
                                                        variant="secondary"
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
                                                    </Button>
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
