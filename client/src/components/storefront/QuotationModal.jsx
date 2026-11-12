import { getStoreEffectiveZigRate } from '../../utils/exchangeRateService.js';

export function QuotationModal({ cart, cartArray, quotationCustomerName, selectedVendorShopId, setQuotationCustomerName, setShowQuotationModal, totalCents, vendorProfiles, zigRate }) {
    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}>
            <div className="glass-panel animate-fade-in-up quotation-print-container" style={{ width: '100%', maxWidth: '750px', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '16px', padding: '36px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative' }}>

                {/* Action Header - Hidden on Print */}
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>📄</span>
                        <div>
                            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>Official Pro-Forma Tax Quotation</h3>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>ZIMRA 15% VAT Compliant Dual-Currency Quote</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => window.print()}
                            style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            🖨️ Print / Save PDF
                        </button>
                        <button 
                            onClick={() => setShowQuotationModal(false)}
                            style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                        >
                            ✕ Close
                        </button>
                    </div>
                </div>

                {/* Printable Quote Sheet */}
                <div style={{ border: '2px solid #0f172a', borderRadius: '8px', padding: '24px', backgroundColor: '#ffffff' }}>

                    {/* Company Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
                        <div>
                            <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }}>ZimMarket Marketplace</h1>
                            <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>Harare CBD & Nationwide Multi-Vendor Network</p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#475569' }}>Zimbabwe • www.zimmarket.co.zw • info@zimmarket.co.zw</p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '600' }}>VAT Reg: 10048291 • BP No: 0200194821</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '4px 12px', borderRadius: '4px', fontSize: '14px', fontWeight: '800', display: 'inline-block', marginBottom: '8px' }}>
                                PRO-FORMA QUOTATION
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Quote #: QT-{Date.now().toString().slice(-7)}</div>
                            <div style={{ fontSize: '12px', color: '#475569' }}>Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', marginTop: '4px' }}>Valid For: 14 Calendar Days</div>
                        </div>
                    </div>

                    {/* Client & Vendor Information */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                        <div>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '800', color: '#64748b', marginBottom: '4px' }}>Quotation Issued To:</div>
                            <div className="no-print" style={{ marginBottom: '6px' }}>
                                <input 
                                    type="text"
                                    placeholder="Enter Customer / Company Name"
                                    value={quotationCustomerName}
                                    onChange={(e) => setQuotationCustomerName(e.target.value)}
                                    style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                />
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                                {quotationCustomerName || 'Valued ZimMarket Buyer'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#475569' }}>Delivery Destination: Zimbabwe (CBD / Express)</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '800', color: '#64748b', marginBottom: '4px' }}>Fulfillment Store:</div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                                {vendorProfiles[cartArray[0]?.product.shop_id]?.store_name || 'Verified ZimMarket Vendor'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#475569' }}>
                                Contact: {vendorProfiles[cartArray[0]?.product.shop_id]?.whatsapp_number ? `+${vendorProfiles[cartArray[0]?.product.shop_id].whatsapp_number}` : 'Via ZimMarket Escrow'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>✔ ZimMarket Escrow Buyer Protected</div>
                        </div>
                    </div>

                    {/* Itemized Quotation Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                                <th style={{ padding: '8px 10px', width: '35px' }}>#</th>
                                <th style={{ padding: '8px 10px' }}>Description / SKU</th>
                                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Unit (USD)</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total (USD)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cartArray.map((item, idx) => {
                                const variation = [item.selectedColor, item.selectedSize].filter(Boolean).join(' / ');
                                const itemTotal = item.product.price_cents * item.quantity;
                                return (
                                    <tr key={item.cartItemId} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                                        <td style={{ padding: '8px 10px' }}>
                                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.product.title}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                {item.product.item_no ? `SKU: ${item.product.item_no} • ` : ''}
                                                {variation ? `Options: ${variation}` : 'Standard Unit'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600' }}>{item.quantity}</td>
                                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>${(item.product.price_cents / 100).toFixed(2)}</td>
                                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>${(itemTotal / 100).toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Totals & Tax Breakdown */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                        <div style={{ width: '280px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                                <span>Subtotal (Excl. VAT):</span>
                                <span style={{ fontWeight: '600' }}>${((totalCents / 1.15) / 100).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                                <span>VAT (15% Standard):</span>
                                <span style={{ fontWeight: '600' }}>${((totalCents - (totalCents / 1.15)) / 100).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '900', color: '#0f172a', borderTop: '2px solid #0f172a', paddingTop: '8px', marginBottom: '4px' }}>
                                <span>TOTAL (USD):</span>
                                <span style={{ color: '#059669' }}>${(totalCents / 100).toFixed(2)}</span>
                            </div>
                            {(() => {
                                const firstShopId = cart[0]?.product?.shop_id || (selectedVendorShopId !== 'All' ? selectedVendorShopId : null);
                                const vendor = firstShopId ? vendorProfiles[firstShopId] : null;
                                const quoteRate = vendor ? getStoreEffectiveZigRate(vendor, zigRate) : zigRate;
                                return (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800', color: '#1e40af', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                                        <span>TOTAL (ZiG @ {quoteRate.toFixed(2)}):</span>
                                        <span>ZiG {((totalCents / 100) * quoteRate).toFixed(2)}</span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Payment Instructions & Banking */}
                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '12px', fontSize: '11px', color: '#475569', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <div style={{ fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>💳 Accepted Payment Methods:</div>
                            <div>• EcoCash Merchant: <strong>*151*2*2*91823#</strong></div>
                            <div>• Stanbic / CABS USD Nostro & ZiG RTGS</div>
                            <div>• ZimMarket Escrow Protection Included</div>
                        </div>
                        <div>
                            <div style={{ fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>📌 Quotation Terms:</div>
                            <div>• Prices valid for 14 calendar days from date above.</div>
                            <div>• All goods inspected prior to customer dispatch.</div>
                            <div>• Full refund if item not delivered as described.</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
