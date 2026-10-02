import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './store';
import { PageType } from './types';
import Dashboard from './pages/Dashboard';
import MasterBarangPage from './pages/MasterBarang';
import StockOpnamePage from './pages/StockOpname';
import PembelianPage from './pages/Pembelian';
import TransferPage from './pages/Transfer';
import LaporanHPPPage from './pages/LaporanHPP';
import LaporanStockPage from './pages/LaporanStock';
import { GudangPage, ClosingPage, SettingsPage } from './pages/OtherPages';
import LoginPage from './pages/LoginPage';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  LayoutDashboard,
  Package,
  ClipboardCheck,
  ShoppingCart,
  ArrowRightLeft,
  FileText,
  Warehouse,
  BarChart3,
  Boxes,
  Lock,
  Settings,
  Menu,
  X,
  Shirt,
  LogOut,
  Cloud,
  HardDrive,
} from 'lucide-react';

const NAV_ITEMS: { id: PageType; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'stock', label: 'Stock', icon: Boxes },
  { id: 'stock-opname', label: 'Stock Opname', icon: ClipboardCheck },
  { id: 'pembelian', label: 'Pembelian', icon: ShoppingCart },
  { id: 'transfer', label: 'Transfer Gudang', icon: ArrowRightLeft },
  { id: 'master-barang', label: 'Master Barang', icon: Package },
  { id: 'gudang', label: 'Gudang', icon: Warehouse },
  { id: 'laporan-hpp', label: 'Laporan HPP', icon: BarChart3 },
  { id: 'laporan-stock', label: 'Laporan Stock', icon: FileText },
  { id: 'closing', label: 'Closing Bulanan', icon: Lock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function AppContent() {
  const { state, dispatch, syncFromSupabase } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const useSupabase = isSupabaseConfigured();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      if (useSupabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Get profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            dispatch({
              type: 'SET_USER',
              payload: {
                nama: profile.nama,
                role: profile.role,
                id: session.user.id,
              }
            });
          }
          setIsAuthenticated(true);
        }
      } else {
        // No Supabase, auto-login for demo
        setIsAuthenticated(true);
      }
      setCheckingAuth(false);
    };

    checkAuth();

    // Listen for auth changes
    if (useSupabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setIsAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [useSupabase]);

  const handleLoginSuccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        dispatch({
          type: 'SET_USER',
          payload: {
            nama: profile.nama,
            role: profile.role,
            id: user.id,
          }
        });
      }
    }
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    if (useSupabase) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
  };

  if (checkingAuth || state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Shirt className="w-10 h-10 text-white" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const renderPage = () => {
    switch (state.currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'stock': return <LaporanStockPage />;
      case 'stock-opname': return <StockOpnamePage />;
      case 'pembelian': return <PembelianPage />;
      case 'transfer': return <TransferPage />;
      case 'master-barang': return <MasterBarangPage />;
      case 'gudang': return <GudangPage />;
      case 'laporan-hpp': return <LaporanHPPPage />;
      case 'laporan-stock': return <LaporanStockPage />;
      case 'closing': return <ClosingPage />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shirt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">Laundry Stock</h1>
              <p className="text-xs text-gray-500">& HPP Management</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = state.currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { dispatch({ type: 'SET_PAGE', payload: item.id }); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-blue-700">{state.currentUser.nama.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{state.currentUser.nama}</p>
              <p className="text-xs text-gray-500 capitalize">{state.currentUser.role.replace('_', ' ')}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Logout">
              <LogOut className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          {useSupabase && (
            <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
              <Cloud className="w-3 h-3" />
              <span>Synced with Supabase</span>
            </div>
          )}
          {!useSupabase && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
              <HardDrive className="w-3 h-3" />
              <span>Local storage mode</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <select
              value={state.selectedPeriode}
              onChange={(e) => dispatch({ type: 'SET_SELECTED_PERIODE', payload: e.target.value })}
              className="border rounded-lg px-3 py-1.5 text-sm bg-white"
            >
              <option value="2026-09">September 2026</option>
              <option value="2026-08">Agustus 2026</option>
              <option value="2026-07">Juli 2026</option>
            </select>
            <select
              value={state.selectedGudang}
              onChange={(e) => dispatch({ type: 'SET_SELECTED_GUDANG', payload: e.target.value })}
              className="border rounded-lg px-3 py-1.5 text-sm bg-white"
            >
              <option value="all">Semua Gudang</option>
              {state.gudang.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select>
            {useSupabase && (
              <button
                onClick={syncFromSupabase}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Sync from Supabase"
              >
                <Cloud className="w-4 h-4 text-blue-600" />
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
