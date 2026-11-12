import { Modal, ModalHeader, Button } from '../ui/index.js';

export function ReviewsModal({ reviewsByProduct, selectedReviewProduct, setSelectedReviewProduct }) {
    return (
        <Modal size="sm" ariaLabel="Customer reviews" onClose={() => setSelectedReviewProduct(null)} overlayStyle={{ zIndex: 1000 }} style={{ maxHeight: '80vh' }}>
            <ModalHeader title="Customer Reviews" onClose={() => setSelectedReviewProduct(null)} />

            <div className="mb-16 fs-15 fw-600 text-primary">
                {selectedReviewProduct.title}
            </div>

            {(!reviewsByProduct[selectedReviewProduct.id] || reviewsByProduct[selectedReviewProduct.id].length === 0) ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                    <div className="fs-32 mb-8">💬</div>
                    No reviews yet for this product. Be the first to leave a review after your order is delivered!
                </div>
            ) : (
                <div className="gap-16 stack">
                    {reviewsByProduct[selectedReviewProduct.id].map((rev, i) => (
                        <div key={i} className="p-16 bg-primary rounded-8 border">
                            <div className="between mb-8 row">
                                <div className="fs-16">
                                    {'⭐'.repeat(rev.rating)}
                                </div>
                                <span className="fs-12 text-muted">
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

            <Button onClick={() => setSelectedReviewProduct(null)} variant="secondary" style={{ width: '100%', marginTop: '24px' }}>
                Close
            </Button>
        </Modal>
    );
}
