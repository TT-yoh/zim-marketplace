// client/src/components/SalesTrendChart.jsx
import React, { useState, useMemo } from 'react';

export function SalesTrendChart({ 
    orders = [], 
    title = "Revenue & Sales Trajectory", 
    currency = 'USD', 
    formatPrice 
}) {
    const [timeRange, setTimeRange] = useState('30d'); // '7d', '30d', '90d', 'all'
    const [hoveredPoint, setHoveredPoint] = useState(null);

    const getFormattedPrice = (cents) => {
        if (formatPrice) return formatPrice(cents, currency);
        return `$${((cents || 0) / 100).toFixed(2)}`;
    };

    // Aggregate orders by day according to selected timeRange
    const chartData = useMemo(() => {
        const now = new Date();
        let daysCount = 30;
        if (timeRange === '7d') daysCount = 7;
        if (timeRange === '90d') daysCount = 90;
        if (timeRange === 'all') daysCount = 180;

        // Initialize daily buckets
        const buckets = {};
        for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateKey = d.toISOString().slice(0, 10);
            const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            buckets[dateKey] = { dateKey, label, totalCents: 0, orderCount: 0 };
        }

        // Aggregate orders
        orders.forEach(order => {
            if (!order.created_at) return;
            const dateKey = new Date(order.created_at).toISOString().slice(0, 10);
            if (buckets[dateKey]) {
                const amount = order.total_amount_cents || (order.price_at_purchase_cents * (order.quantity || 1)) || 0;
                buckets[dateKey].totalCents += amount;
                buckets[dateKey].orderCount += (order.quantity || 1);
            }
        });

        return Object.values(buckets);
    }, [orders, timeRange]);

    const maxCents = useMemo(() => {
        const max = Math.max(...chartData.map(d => d.totalCents), 1000); // minimum scale $10
        return max;
    }, [chartData]);

    const totalPeriodRevenueCents = useMemo(() => {
        return chartData.reduce((sum, d) => sum + d.totalCents, 0);
    }, [chartData]);

    const totalPeriodOrders = useMemo(() => {
        return chartData.reduce((sum, d) => sum + d.orderCount, 0);
    }, [chartData]);

    const peakDay = useMemo(() => {
        return chartData.reduce((max, d) => d.totalCents > max.totalCents ? d : max, chartData[0] || { label: 'N/A', totalCents: 0 });
    }, [chartData]);

    // SVG Coordinate Calculations
    const svgWidth = 800;
    const svgHeight = 260;
    const paddingX = 40;
    const paddingY = 30;
    const usableWidth = svgWidth - paddingX * 2;
    const usableHeight = svgHeight - paddingY * 2;

    const points = useMemo(() => {
        if (chartData.length === 0) return [];
        return chartData.map((d, index) => {
            const x = paddingX + (index / (chartData.length - 1 || 1)) * usableWidth;
            const y = (svgHeight - paddingY) - (d.totalCents / maxCents) * usableHeight;
            return { ...d, x, y };
        });
    }, [chartData, maxCents, usableWidth, usableHeight]);

    // Generate smooth cubic Bézier SVG path
    const areaPath = useMemo(() => {
        if (points.length < 2) return '';
        let d = `M ${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cpX = (p0.x + p1.x) / 2;
            d += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
        }
        // Close area to bottom
        const lastX = points[points.length - 1].x;
        const bottomY = svgHeight - paddingY;
        const firstX = points[0].x;
        return `${d} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
    }, [points]);

    const linePath = useMemo(() => {
        if (points.length < 2) return '';
        let d = `M ${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cpX = (p0.x + p1.x) / 2;
            d += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
        }
        return d;
    }, [points]);

    return (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', marginBottom: '32px' }}>
            {/* Header with Title and Range Selectors */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', fontWeight: '700' }}>
                        📊 {title}
                    </h3>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                        Period GMV: <strong style={{ color: 'var(--success)' }}>{getFormattedPrice(totalPeriodRevenueCents)}</strong> ({totalPeriodOrders} orders)
                    </div>
                </div>

                {/* Range Pill Toggle */}
                <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    {[
                        { key: '7d', label: '7 Days' },
                        { key: '30d', label: '30 Days' },
                        { key: '90d', label: '90 Days' },
                        { key: 'all', label: '6 Months' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setTimeRange(tab.key)}
                            style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: timeRange === tab.key ? '700' : '500',
                                backgroundColor: timeRange === tab.key ? 'var(--accent-primary)' : 'transparent',
                                color: timeRange === tab.key ? '#fff' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Stat Chips */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '10px 16px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Avg Daily GMV</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--accent-primary)', marginTop: '2px' }}>
                        {getFormattedPrice(chartData.length ? Math.round(totalPeriodRevenueCents / chartData.length) : 0)}
                    </div>
                </div>

                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '10px 16px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Peak Sales Day</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--success)', marginTop: '2px' }}>
                        {peakDay?.label}: {getFormattedPrice(peakDay?.totalCents || 0)}
                    </div>
                </div>
            </div>

            {/* SVG Chart Container */}
            <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
                <svg 
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                >
                    <defs>
                        {/* Smooth Emerald-to-Cyan Area Gradient */}
                        <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                            <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                        </linearGradient>

                        <linearGradient id="salesLineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                        const y = (svgHeight - paddingY) - ratio * usableHeight;
                        const valueCents = Math.round(ratio * maxCents);
                        return (
                            <g key={ratio}>
                                <line 
                                    x1={paddingX} 
                                    y1={y} 
                                    x2={svgWidth - paddingX} 
                                    y2={y} 
                                    stroke="var(--border)" 
                                    strokeDasharray={ratio === 0 ? "none" : "4 4"} 
                                    strokeOpacity="0.4" 
                                />
                                <text 
                                    x={paddingX - 8} 
                                    y={y + 4} 
                                    fill="var(--text-muted)" 
                                    fontSize="10" 
                                    textAnchor="end"
                                    fontFamily="monospace"
                                >
                                    {getFormattedPrice(valueCents)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Area fill */}
                    {areaPath && <path d={areaPath} fill="url(#salesAreaGradient)" />}

                    {/* Line Stroke */}
                    {linePath && (
                        <path 
                            d={linePath} 
                            fill="none" 
                            stroke="url(#salesLineGradient)" 
                            strokeWidth="3" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                        />
                    )}

                    {/* Interactive Points and Crosshairs */}
                    {points.map((p, i) => {
                        const isHovered = hoveredPoint?.dateKey === p.dateKey;
                        const shouldShowLabel = points.length <= 14 || i % Math.ceil(points.length / 7) === 0;

                        return (
                            <g key={p.dateKey}>
                                {/* Date label along X axis */}
                                {shouldShowLabel && (
                                    <text 
                                        x={p.x} 
                                        y={svgHeight - 8} 
                                        fill="var(--text-muted)" 
                                        fontSize="11" 
                                        textAnchor="middle"
                                    >
                                        {p.label}
                                    </text>
                                )}

                                {/* Hover crosshair vertical bar */}
                                {isHovered && (
                                    <line 
                                        x1={p.x} 
                                        y1={paddingY} 
                                        x2={p.x} 
                                        y2={svgHeight - paddingY} 
                                        stroke="var(--accent-primary)" 
                                        strokeWidth="1.5" 
                                        strokeDasharray="3 3" 
                                    />
                                )}

                                {/* Dot */}
                                <circle 
                                    cx={p.x} 
                                    cy={p.y} 
                                    r={isHovered ? 6 : 3.5} 
                                    fill={isHovered ? "var(--success)" : "#3b82f6"} 
                                    stroke="#fff" 
                                    strokeWidth={isHovered ? "2.5" : "1.5"} 
                                    style={{ transition: 'r 0.15s ease' }}
                                />

                                {/* Invisible expanded hit area for mouse interaction */}
                                <rect 
                                    x={p.x - usableWidth / (points.length * 2)} 
                                    y={paddingY} 
                                    width={usableWidth / points.length} 
                                    height={usableHeight} 
                                    fill="transparent" 
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={() => setHoveredPoint(p)}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* Floating Interactive Glass Tooltip */}
                {hoveredPoint && (
                    <div 
                        className="glass-panel animate-fade-in"
                        style={{
                            position: 'absolute',
                            left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                            top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                            transform: 'translate(-50%, -120%)',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(15, 23, 42, 0.92)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid var(--border)',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            zIndex: 10
                        }}
                    >
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                            {hoveredPoint.label}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--success)', marginTop: '2px' }}>
                            {getFormattedPrice(hoveredPoint.totalCents)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {hoveredPoint.orderCount} order{hoveredPoint.orderCount === 1 ? '' : 's'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
