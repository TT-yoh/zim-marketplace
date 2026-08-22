// client/src/components/CategoryBreakdownChart.jsx
import React, { useMemo } from 'react';

export function CategoryBreakdownChart({ products = [], title = "Category Distribution" }) {
    const categoryStats = useMemo(() => {
        const counts = {};
        const total = products.length;

        products.forEach(p => {
            const cat = p.category || 'Uncategorized';
            counts[cat] = (counts[cat] || 0) + 1;
        });

        const sorted = Object.entries(counts)
            .map(([name, count]) => ({
                name,
                count,
                percentage: total > 0 ? Math.round((count / total) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count);

        return { items: sorted, total };
    }, [products]);

    const colorPalette = [
        '#3b82f6', // blue
        '#10b981', // emerald
        '#f59e0b', // amber
        '#ec4899', // pink
        '#8b5cf6', // purple
        '#06b6d4', // cyan
        '#64748b'  // slate
    ];

    if (products.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No category data available.
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', fontWeight: '700' }}>
                    🏷️ {title}
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    {categoryStats.total} Products Total
                </span>
            </div>

            {/* Stacked Percentage Progress Strip */}
            <div style={{ 
                height: '14px', 
                borderRadius: '8px', 
                overflow: 'hidden', 
                display: 'flex', 
                backgroundColor: 'var(--bg-tertiary)', 
                marginBottom: '20px',
                border: '1px solid var(--border)'
            }}>
                {categoryStats.items.map((cat, idx) => (
                    <div 
                        key={cat.name} 
                        style={{ 
                            width: `${cat.percentage}%`, 
                            backgroundColor: colorPalette[idx % colorPalette.length],
                            transition: 'width 0.4s ease'
                        }}
                        title={`${cat.name}: ${cat.count} items (${cat.percentage}%)`}
                    />
                ))}
            </div>

            {/* Category Breakdown Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {categoryStats.items.slice(0, 6).map((cat, idx) => {
                    const color = colorPalette[idx % colorPalette.length];
                    return (
                        <div key={cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '140px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
                                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{cat.name}</span>
                            </div>

                            <div style={{ flex: 1, margin: '0 16px', height: '6px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden' }}>
                                <div style={{ width: `${cat.percentage}%`, height: '100%', backgroundColor: color, borderRadius: '4px' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', minWidth: '90px', justifyContent: 'flex-end' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{cat.count} items</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '13px' }}>{cat.percentage}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
