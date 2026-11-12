import { ShippingCheckoutFlow } from '../ShippingCheckoutFlow.jsx';
import { getStoreEffectiveZigRate } from '../../utils/exchangeRateService.js';
import { requestSignIn } from '../../utils/navigation.js';

export function CartDrawer({ buyerId, cart, cartArray, currency, formatPrice, getFormattedPrice, handleWhatsAppCartOrder, isCheckingOut, products, removeCartItem, selectedVendorShopId, setCart, setCurrentView, setIsCartOpen, setIsCheckingOut, setShowQuotationModal, totalCents, updateCartQuantity, vendorProfiles, zigRate }) {
    return (
        <div 
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    setIsCartOpen(false);
                    setIsCheckingOut(false);
                }
            }}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.75)',
                display: 'flex',
                justifyContent: 'flex-end',
                zIndex: 1100,
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)'
            }}
            className="animate-fade-in"
        >
            <div 
                className="glass-panel animate-slide-in-right" 
                style={{ 
                    width: '100%', 
                    maxWidth: '460px', 
                    height: '100%', 
                    backgroundColor: 'var(--bg-secondary)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    padding: '28px',
                    boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                    position: 'relative'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🛒 Shopping Cart</span>
                        {cartArray.length > 0 && <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>({cartArray.reduce((s, i) => s + i.quantity, 0)} items)</span>}
                    </h3>
                    <button 
                        onClick={() => {
                            setIsCartOpen(false);
                            setIsCheckingOut(false);
                        }} 
                        style={{ border: 'none', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                    >
                        ✕
                    </button>
                </div>

                {cartArray.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '60px 0', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: '50px', marginBottom: '16px' }}>🛒</div>
                        <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Your cart is empty</h4>
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Browse products and tap "Add to Cart" to start shopping.</p>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                        <div style={{ marginBottom: '24px', flex: 1, overflowY: 'auto' }}>
                            {cartArray.map(item => (
                                <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ flex: 1, paddingRight: '14px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{item.product.title}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                            {[item.selectedColor, item.selectedSize].filter(Boolean).join(' / ')}
                                        </div>
                                        {/* Interactive Quantity Stepper */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'var(--bg-tertiary)' }}>
                                                <button 
                                                    onClick={() => updateCartQuantity(item.cartItemId, -1)}
                                                    style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    title="Decrease quantity"
                                                >
                                                    −
                                                </button>
                                                <span style={{ padding: '0 10px', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    {item.quantity}
                                                </span>
                                                <button 
                                                    onClick={() => updateCartQuantity(item.cartItemId, 1)}
                                                    disabled={item.quantity >= item.product.stock_quantity}
                                                    style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', width: '28px', height: '28px', cursor: item.quantity >= item.product.stock_quantity ? 'not-allowed' : 'pointer', opacity: item.quantity >= item.product.stock_quantity ? 0.35 : 1, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    title="Increase quantity"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>× {getFormattedPrice(item.product.price_cents, null, item.product.shop_id)}</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                                            {getFormattedPrice(item.product.price_cents * item.quantity, null, item.product.shop_id)}
                                        </div>
                                        <button 
                                            onClick={() => removeCartItem(item.cartItemId)}
                                            style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px', fontWeight: '600', padding: 0 }}
                                            title="Remove item"
                                        >
                                            🗑️ Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: '2px solid var(--border)', paddingTop: '20px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                <span>Subtotal (Excl. VAT):</span>
                                <span>${((totalCents / 1.15) / 100).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                <span>VAT (15%):</span>
                                <span>${((totalCents - (totalCents / 1.15)) / 100).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '20px', color: 'var(--text-primary)', borderTop: '1px dashed var(--border)', paddingTop: '10px' }}>
                                <span>Total Amount:</span>
                                <span style={{ color: 'var(--accent-primary)' }}>{getFormattedPrice(totalCents)}</span>
                            </div>
                            {currency === 'USD' && (
                                <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    ≈ ZiG {(() => {
                                        const firstShopId = cart[0]?.product?.shop_id || (selectedVendorShopId !== 'All' ? selectedVendorShopId : null);
                                        const vendor = firstShopId ? vendorProfiles[firstShopId] : null;
                                        const rate = vendor ? getStoreEffectiveZigRate(vendor, zigRate) : zigRate;
                                        return ((totalCents / 100) * rate).toFixed(2);
                                    })()}
                                </div>
                            )}
                        </div>

                        {!isCheckingOut ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button
                                    onClick={() => {
                                        if (!buyerId) {
                                            requestSignIn('Sign in or create a free account to check out. Your cart is saved.');
                                            return;
                                        }
                                        setIsCheckingOut(true);
                                    }}
                                    className="btn-primary"
                                    style={{ width: '100%', padding: '14px', fontSize: '15px', borderRadius: '10px', fontWeight: '700' }}
                                >
                                    🔒 Checkout Securely (EcoCash / Card)
                                </button>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowQuotationModal(true)}
                                        className="btn-secondary"
                                        style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    >
                                        📄 Pro-Forma PDF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleWhatsAppCartOrder}
                                        className="btn-secondary"
                                        style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderColor: '#25D366', color: '#25D366' }}
                                    >
                                        💬 WhatsApp Order
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                <ShippingCheckoutFlow 
                                    buyerId={buyerId}
                                    cartArray={cartArray}
                                    totalCents={totalCents}
                                    currency={currency}
                                    formatPrice={(cents) => (formatPrice ? formatPrice(cents || 0, currency) : `$${((cents || 0) / 100).toFixed(2)}`)}
                                    onCancel={() => setIsCheckingOut(false)}
                                    onPaymentComplete={() => {
                                        // Only empty the cart once the payment is confirmed
                                        setCart({});
                                    }}
                                    onClose={() => {
                                        setIsCheckingOut(false);
                                        setIsCartOpen(false);
                                    }}
                                    onViewOrders={() => {
                                        setIsCheckingOut(false);
                                        setIsCartOpen(false);
                                        if (setCurrentView) setCurrentView('buyer-orders');
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
