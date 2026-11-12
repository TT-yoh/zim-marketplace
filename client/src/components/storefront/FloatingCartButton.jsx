export function FloatingCartButton({ cart, cartArray, cartBouncing, setIsCartOpen }) {
    return (
        <button
            onClick={() => setIsCartOpen(true)}
            className={`btn-primary glass-panel ${cartBouncing ? 'animate-cart-bounce' : 'animate-fade-in-up'}`}
            style={{
                position: 'fixed',
                bottom: '80px',
                right: '24px',
                zIndex: 990,
                borderRadius: '30px',
                padding: '14px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '15px',
                transition: 'all 0.2s ease'
            }}
        >
            <span style={{ fontSize: '20px' }}>🛒</span>
            <span>Cart</span>
            {cartArray.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
                <span style={{
                    backgroundColor: '#fff',
                    color: '#000',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    fontWeight: '800'
                }}>
                    {cartArray.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
            )}
        </button>
    );
}
