export function ReviewsModal({ reviewsByProduct, selectedReviewProduct, setSelectedReviewProduct }) {
    return (
        <div 
            onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedReviewProduct(null);
            }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            className="animate-fade-in"
        >
            <div className="glass-panel animate-scale-up" style={{ padding: '32px', width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-secondary)', maxHeight: '80vh', overflowY: 'auto', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Customer Reviews</h3>
                    <button onClick={() => setSelectedReviewProduct(null)} style={{ border: 'none', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                <div style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {selectedReviewProduct.title}
                </div>

                {(!reviewsByProduct[selectedReviewProduct.id] || reviewsByProduct[selectedReviewProduct.id].length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                        No reviews yet for this product. Be the first to leave a review after your order is delivered!
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {reviewsByProduct[selectedReviewProduct.id].map((rev, i) => (
                            <div key={i} style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                    <div style={{ fontSize: '16px' }}>
                                        {'⭐'.repeat(rev.rating)}
                                    </div>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {new Date(rev.created_at || Date.now()).toLocaleDateString()}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                                    "{rev.comment}"
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                <button onClick={() => setSelectedReviewProduct(null)} className="btn-secondary" style={{ width: '100%', marginTop: '24px' }}>
                    Close
                </button>
            </div>
        </div>
    );
}
