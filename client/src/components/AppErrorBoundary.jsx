// client/src/components/AppErrorBoundary.jsx
// Catches render crashes so the user sees a way out instead of a blank page, and reports them.
import { Component } from 'react';
import { reportError } from '../utils/errorReporter.js';

export class AppErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        const withComponents = error instanceof Error ? error : new Error(String(error));
        if (info?.componentStack) {
            withComponents.stack = `${withComponents.stack || ''}\nComponent stack:${info.componentStack}`;
        }
        reportError(withComponents, 'react-render');
    }

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <div role="alert" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <div style={{ maxWidth: '420px', textAlign: 'center' }}>
                    <div style={{ fontSize: '40px' }}>😕</div>
                    <h1 style={{ fontSize: '22px' }}>Something went wrong</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        The page hit an error and has been reported to ZimMarket. Your cart and orders are safe.
                    </p>
                    <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
                        Reload the page
                    </button>
                </div>
            </div>
        );
    }
}

export default AppErrorBoundary;
