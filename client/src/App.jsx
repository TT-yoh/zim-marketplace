// client/src/App.jsx
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { supabase } from './components/supabaseClient.js';
import { BuyerStorefront } from './components/BuyerStorefront.jsx';
import { AuthScreen } from './components/AuthScreen.jsx';
import { ToastProvider } from './components/ToastContext.jsx';
import { ModalProvider } from './components/ModalContext.jsx';
import { ChatProvider } from './components/ChatContext.jsx';

// Code-split secondary views on demand
const VendorInventory = lazy(() => import('./components/VendorInventory.jsx').then(m => ({ default: m.VendorInventory })));
const BuyerOrderHistory = lazy(() => import('./components/BuyerOrderHistory.jsx').then(m => ({ default: m.BuyerOrderHistory })));
const VendorOrders = lazy(() => import('./components/VendorOrders.jsx').then(m => ({ default: m.VendorOrders })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard.jsx').then(m => ({ default: m.AdminDashboard })));
const VendorVerification = lazy(() => import('./components/VendorVerification.jsx').then(m => ({ default: m.VendorVerification })));
const ProfileSettings = lazy(() => import('./components/ProfileSettings.jsx').then(m => ({ default: m.ProfileSettings })));
const LiveChatDrawer = lazy(() => import('./components/LiveChatDrawer.jsx').then(m => ({ default: m.LiveChatDrawer })));

// Synchronous auth token reader to eliminate initial loading screen
const getInitialCachedSession = () => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.user || parsed.access_token)) return parsed;
        }
      }
    }
  } catch (e) {}
  return null;
};

const cachedAuthSession = getInitialCachedSession();

function App() {
  const [currentView, setCurrentView] = useState('buyer');
  const [visitedViews, setVisitedViews] = useState(() => new Set(['buyer']));
  const [session, setSession] = useState(cachedAuthSession);
  const [loading, setLoading] = useState(!cachedAuthSession);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('zimmarket_is_admin') === 'true');
  
  const switchView = (view) => {
    setVisitedViews(prev => new Set(prev).add(view));
    setCurrentView(view);
  };
  
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
          const { data } = await supabase.from('platform_admins').select('*').eq('id', session.user.id).maybeSingle();
          const adminState = !!data;
          setIsAdmin(adminState);
          localStorage.setItem('zimmarket_is_admin', adminState ? 'true' : 'false');
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
          const { data } = await supabase.from('platform_admins').select('*').eq('id', session.user.id).maybeSingle();
          const adminState = !!data;
          setIsAdmin(adminState);
          localStorage.setItem('zimmarket_is_admin', adminState ? 'true' : 'false');
      } else {
          setIsAdmin(false);
          localStorage.removeItem('zimmarket_is_admin');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    localStorage.removeItem('zimmarket_is_admin');
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading ZimMarket...</div>;
  }

  if (!session) {
    return <AuthScreen />;
  }

  const userId = session.user?.id || session.user_id;

  return (
    <ModalProvider>
      <ToastProvider>
        <ChatProvider currentUserId={userId}>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <nav className="glass-panel navbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => switchView('buyer')}>
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
                    onClick={() => switchView('buyer')} 
                    className={currentView === 'buyer' ? 'btn-primary' : 'btn-secondary'}
                  >
                    🛒 Shop
                  </button>
                  
                  <button 
                    onClick={() => switchView('buyer-orders')} 
                    className={currentView === 'buyer-orders' ? 'btn-primary' : 'btn-secondary'}
                  >
                    🛍️ My Orders
                  </button>
                  
                  <button 
                    onClick={() => switchView('profile')} 
                    className={currentView === 'profile' ? 'btn-primary' : 'btn-secondary'}
                  >
                    ⚙️ Settings
                  </button>
                  
                  <div className="nav-divider" />
                  
                  <button 
                    onClick={() => switchView('vendor-inventory')} 
                    className={currentView === 'vendor-inventory' ? 'btn-primary' : 'btn-secondary'}
                  >
                    📦 Dashboard
                  </button>

                  <button 
                    onClick={() => switchView('vendor-orders')} 
                    className={currentView === 'vendor-orders' ? 'btn-primary' : 'btn-secondary'}
                  >
                    📋 Fulfillment
                  </button>

                  {isAdmin && (
                      <>
                          <div className="nav-divider" />
                          <button 
                            onClick={() => switchView('admin')} 
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
              {/* Keep Storefront permanently mounted for 0ms instant tab switching & scroll preservation */}
              <div style={{ display: currentView === 'buyer' ? 'block' : 'none' }}>
                <BuyerStorefront buyerId={userId} currency={currency} zigRate={zigRate} formatPrice={formatPrice} />
              </div>

              {/* Lazy & Keep-Alive Secondary Views */}
              <div style={{ display: currentView === 'buyer-orders' ? 'block' : 'none' }}>
                {visitedViews.has('buyer-orders') && (
                  <Suspense fallback={<div className="glass-panel" style={{ maxWidth: '800px', margin: '40px auto', padding: '40px', textAlign: 'center' }}>Loading Orders...</div>}>
                    <BuyerOrderHistory buyerId={userId} currency={currency} formatPrice={formatPrice} />
                  </Suspense>
                )}
              </div>

              <div style={{ display: currentView === 'profile' ? 'block' : 'none' }}>
                {visitedViews.has('profile') && (
                  <Suspense fallback={<div className="glass-panel" style={{ maxWidth: '800px', margin: '40px auto', padding: '40px', textAlign: 'center' }}>Loading Settings...</div>}>
                    <ProfileSettings userId={userId} email={session.user?.email} />
                  </Suspense>
                )}
              </div>

              <div style={{ display: currentView === 'vendor-inventory' ? 'block' : 'none' }}>
                {visitedViews.has('vendor-inventory') && (
                  <Suspense fallback={<div className="glass-panel" style={{ maxWidth: '800px', margin: '40px auto', padding: '40px', textAlign: 'center' }}>Loading Dashboard...</div>}>
                    <VendorInventory shopId={userId} setCurrentView={switchView} currency={currency} formatPrice={formatPrice} />
                  </Suspense>
                )}
              </div>

              <div style={{ display: currentView === 'vendor-orders' ? 'block' : 'none' }}>
                {visitedViews.has('vendor-orders') && (
                  <Suspense fallback={<div className="glass-panel" style={{ maxWidth: '800px', margin: '40px auto', padding: '40px', textAlign: 'center' }}>Loading Fulfillment...</div>}>
                    <VendorOrders shopId={userId} currency={currency} formatPrice={formatPrice} />
                  </Suspense>
                )}
              </div>

              <div style={{ display: currentView === 'admin' ? 'block' : 'none' }}>
                {visitedViews.has('admin') && (
                  <Suspense fallback={<div className="glass-panel" style={{ maxWidth: '800px', margin: '40px auto', padding: '40px', textAlign: 'center' }}>Loading Admin Suite...</div>}>
                    <AdminDashboard currency={currency} formatPrice={formatPrice} />
                  </Suspense>
                )}
              </div>

              <div style={{ display: currentView === 'vendor-verification' ? 'block' : 'none' }}>
                {visitedViews.has('vendor-verification') && (
                  <Suspense fallback={<div className="glass-panel" style={{ maxWidth: '800px', margin: '40px auto', padding: '40px', textAlign: 'center' }}>Loading Verification...</div>}>
                    <VendorVerification setCurrentView={switchView} />
                  </Suspense>
                )}
              </div>

              {/* Glassmorphic Live Chat Drawer Component */}
              <Suspense fallback={null}>
                <LiveChatDrawer currentUserId={userId} formatPrice={formatPrice} currency={currency} />
              </Suspense>
            </main>

            {/* Glassmorphic Mobile Bottom Navigation Bar */}
            <nav className="mobile-bottom-bar">
              <button 
                onClick={() => switchView('buyer')} 
                className={`mobile-nav-item ${currentView === 'buyer' ? 'active' : ''}`}
              >
                <span className="icon">🛒</span>
                <span>Shop</span>
              </button>

              <button 
                onClick={() => switchView('buyer-orders')} 
                className={`mobile-nav-item ${currentView === 'buyer-orders' ? 'active' : ''}`}
              >
                <span className="icon">🛍️</span>
                <span>Orders</span>
              </button>

              <button 
                onClick={() => switchView('vendor-inventory')} 
                className={`mobile-nav-item ${currentView === 'vendor-inventory' ? 'active' : ''}`}
              >
                <span className="icon">📦</span>
                <span>Dashboard</span>
              </button>

              <button 
                onClick={() => switchView('profile')} 
                className={`mobile-nav-item ${currentView === 'profile' ? 'active' : ''}`}
              >
                <span className="icon">⚙️</span>
                <span>Profile</span>
              </button>
            </nav>
          </div>
        </ChatProvider>
      </ToastProvider>
    </ModalProvider>
  );
}

export default App;