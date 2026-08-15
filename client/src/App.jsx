// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './components/supabaseClient.js';
import { BuyerStorefront } from './components/BuyerStorefront.jsx';
import { VendorInventory } from './components/VendorInventory.jsx';
import { AuthScreen } from './components/AuthScreen.jsx';
import { BuyerOrderHistory } from './components/BuyerOrderHistory.jsx';
import { VendorOrders } from './components/VendorOrders.jsx';
import { AdminDashboard } from './components/AdminDashboard.jsx';
import { VendorVerification } from './components/VendorVerification.jsx';
import { ProfileSettings } from './components/ProfileSettings.jsx';
import { ToastProvider } from './components/ToastContext.jsx';

function App() {
  const [currentView, setCurrentView] = useState('buyer');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  // Multi-Currency state (USD $ vs ZiG)
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('zimmarket_currency') || 'USD';
  });
  const zigRate = 26.50; // 1 USD = 26.50 ZiG

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('zimmarket_currency', currency);
  }, [currency]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const formatPrice = (cents, customCurr = currency) => {
    if (isNaN(cents)) cents = 0;
    const usd = cents / 100;
    if (customCurr === 'ZiG') {
      const zig = usd * zigRate;
      return `ZiG ${zig.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
          const { data } = await supabase.from('platform_admins').select('*').eq('id', session.user.id).single();
          if (data) setIsAdmin(true);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
          const { data } = await supabase.from('platform_admins').select('*').eq('id', session.user.id).single();
          if (data) setIsAdmin(true);
      } else {
          setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading ZimMarket...</div>;
  }

  if (!session) {
    return <AuthScreen />;
  }

  const userId = session.user.id;

  const renderActiveView = () => {
    switch (currentView) {
      case 'buyer':
        return <BuyerStorefront buyerId={userId} currency={currency} zigRate={zigRate} formatPrice={formatPrice} />;
      case 'buyer-orders':
        return <BuyerOrderHistory buyerId={userId} currency={currency} formatPrice={formatPrice} />;
      case 'vendor-inventory':
        return <VendorInventory shopId={userId} setCurrentView={setCurrentView} currency={currency} formatPrice={formatPrice} />;
      case 'vendor-verification':
        return <VendorVerification setCurrentView={setCurrentView} />;
      case 'vendor-orders':
        return <VendorOrders shopId={userId} currency={currency} formatPrice={formatPrice} />;
      case 'admin':
        return <AdminDashboard />;
      case 'profile':
        return <ProfileSettings userId={userId} email={session.user.email} />;
      default:
        return <BuyerStorefront buyerId={userId} currency={currency} zigRate={zigRate} formatPrice={formatPrice} />;
    }
  };

  return (
    <ToastProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav className="glass-panel navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>🇿🇼</div>
            <h1 style={{ margin: 0, fontSize: '22px', color: 'var(--text-primary)' }}>ZimMarket</h1>
          </div>
          
          <div className="nav-actions">
            {/* Currency Switcher Button */}
            <button
              onClick={() => setCurrency(prev => prev === 'USD' ? 'ZiG' : 'USD')}
              className="btn-secondary"
              title="Switch Currency (USD / ZiG)"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '20px' }}
            >
              {currency === 'USD' ? '💵 USD ($)' : '🇿🇼 ZiG (ZWG)'}
            </button>

            <button 
              onClick={toggleTheme}
              className="btn-secondary"
              title="Toggle Light/Dark Mode"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: '50%' }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            
            <div className="nav-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => setCurrentView('buyer')} 
                className={currentView === 'buyer' ? 'btn-primary' : 'btn-secondary'}
              >
                🛒 Shop
              </button>
              
              <button 
                onClick={() => setCurrentView('buyer-orders')} 
                className={currentView === 'buyer-orders' ? 'btn-primary' : 'btn-secondary'}
              >
                🛍️ My Orders
              </button>
              
              <button 
                onClick={() => setCurrentView('profile')} 
                className={currentView === 'profile' ? 'btn-primary' : 'btn-secondary'}
              >
                ⚙️ Settings
              </button>
              
              <div className="nav-divider" />
              
              <button 
                onClick={() => setCurrentView('vendor-inventory')} 
                className={currentView === 'vendor-inventory' ? 'btn-primary' : 'btn-secondary'}
              >
                📦 Dashboard
              </button>

              <button 
                onClick={() => setCurrentView('vendor-orders')} 
                className={currentView === 'vendor-orders' ? 'btn-primary' : 'btn-secondary'}
              >
                📋 Fulfillment
              </button>

              {isAdmin && (
                  <>
                      <div className="nav-divider" />
                      <button 
                        onClick={() => setCurrentView('admin')} 
                        className={currentView === 'admin' ? 'btn-primary' : 'btn-secondary'}
                        style={{ borderColor: 'var(--accent-primary)', color: currentView === 'admin' ? '#fff' : 'var(--accent-primary)' }}
                      >
                        👑 Admin
                      </button>
                  </>
              )}
            </div>

            <div className="nav-divider nav-desktop-only" />
            <button 
              onClick={handleSignOut} 
              className="btn-secondary"
              style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
            >
              Sign Out
            </button>
          </div>
        </nav>

        <main className="main-content">
          {renderActiveView()}
        </main>

        {/* Glassmorphic Mobile Bottom Navigation Bar */}
        <nav className="mobile-bottom-bar">
          <button 
            onClick={() => setCurrentView('buyer')} 
            className={`mobile-nav-item ${currentView === 'buyer' ? 'active' : ''}`}
          >
            <span className="icon">🛒</span>
            <span>Shop</span>
          </button>

          <button 
            onClick={() => setCurrentView('buyer-orders')} 
            className={`mobile-nav-item ${currentView === 'buyer-orders' ? 'active' : ''}`}
          >
            <span className="icon">🛍️</span>
            <span>Orders</span>
          </button>

          <button 
            onClick={() => setCurrentView('vendor-inventory')} 
            className={`mobile-nav-item ${currentView === 'vendor-inventory' ? 'active' : ''}`}
          >
            <span className="icon">📦</span>
            <span>Dashboard</span>
          </button>

          <button 
            onClick={() => setCurrentView('profile')} 
            className={`mobile-nav-item ${currentView === 'profile' ? 'active' : ''}`}
          >
            <span className="icon">⚙️</span>
            <span>Profile</span>
          </button>
        </nav>
      </div>
    </ToastProvider>
  );
}

export default App;