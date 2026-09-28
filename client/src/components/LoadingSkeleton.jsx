// client/src/components/LoadingSkeleton.jsx
import React from 'react';

export function LoadingSkeleton({ title = 'Loading...', variant = 'cards' }) {
    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '20px auto', width: '100%' }}>
            {/* Header skeleton */}
            <div className="glass-panel" style={{ padding: '24px 28px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="shimmer skeleton-box" style={{ width: '44px', height: '44px', borderRadius: '12px' }} />
                    <div>
                        <div className="shimmer skeleton-box" style={{ width: '180px', height: '22px', marginBottom: '8px' }} />
                        <div className="shimmer skeleton-box" style={{ width: '120px', height: '14px' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div className="shimmer skeleton-box" style={{ width: '100px', height: '36px', borderRadius: '8px' }} />
                    <div className="shimmer skeleton-box" style={{ width: '100px', height: '36px', borderRadius: '8px' }} />
                </div>
            </div>

            {variant === 'table' ? (
                /* Table Skeleton */
                <div className="glass-panel" style={{ padding: '24px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div className="shimmer skeleton-box" style={{ width: '240px', height: '38px', borderRadius: '8px' }} />
                        <div className="shimmer skeleton-box" style={{ width: '140px', height: '38px', borderRadius: '8px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="shimmer skeleton-box" style={{ width: '100%', height: '52px', borderRadius: '6px' }} />
                        ))}
                    </div>
                </div>
            ) : (
                /* Grid / Cards Skeleton */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                    {[1, 2, 3, 4, 6, 7, 8].map(i => (
                        <div key={i} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderRadius: '16px' }}>
                            <div className="shimmer skeleton-box" style={{ width: '100%', height: '160px', borderRadius: '10px' }} />
                            <div className="shimmer skeleton-box" style={{ width: '70%', height: '18px' }} />
                            <div className="shimmer skeleton-box" style={{ width: '40%', height: '14px' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                <div className="shimmer skeleton-box" style={{ width: '60px', height: '22px' }} />
                                <div className="shimmer skeleton-box" style={{ width: '80px', height: '34px', borderRadius: '8px' }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
