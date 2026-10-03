import React, { createContext, useContext, useReducer, useEffect, ReactNode, useState } from 'react';
import { MasterBarang, Gudang, StockOpname, Pembelian, StockSnapshot, AuditLog, PeriodClosing, Transfer, Adjustment, PageType, UserRole } from './types';
import { initialBarang, initialGudang, initialStockSnapshots, initialStockOpname, initialPembelian } from './data/initialData';
import { isSupabaseConfigured } from './lib/supabase';
import * as dbService from './services/database';
import type { StockMovement } from './lib/accounting';

export interface AppState {
  barang: MasterBarang[];
  gudang: Gudang[];
  stockOpname: StockOpname[];
  pembelian: Pembelian[];
  transfers: Transfer[];
  adjustments: Adjustment[];
  stockSnapshots: StockSnapshot[];
  stockMovements: StockMovement[];
  auditLogs: AuditLog[];
  periodClosings: PeriodClosing[];
  currentPage: PageType;
  currentUser: { nama: string; role: UserRole; id?: string };
  selectedGudang: string;
  selectedPeriode: string;
  isSupabaseMode: boolean;
  isLoading: boolean;
  loadError: string;
}

export type Action =
  | { type: 'SET_PAGE'; payload: PageType }
  | { type: 'SET_SELECTED_GUDANG'; payload: string }
  | { type: 'SET_SELECTED_PERIODE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { nama: string; role: UserRole; id?: string } }
  | { type: 'LOAD_DATA'; payload: Partial<AppState> }
  | { type: 'ADD_BARANG'; payload: MasterBarang }
  | { type: 'UPDATE_BARANG'; payload: MasterBarang }
  | { type: 'DELETE_BARANG'; payload: string }
  | { type: 'ADD_GUDANG'; payload: Gudang }
  | { type: 'UPDATE_GUDANG'; payload: Gudang }
  | { type: 'ADD_STOCK_OPNAME'; payload: StockOpname }
  | { type: 'UPDATE_STOCK_OPNAME'; payload: StockOpname }
  | { type: 'ADD_PEMBELIAN'; payload: Pembelian }
  | { type: 'VOID_PEMBELIAN'; payload: string }
  | { type: 'ADD_TRANSFER'; payload: Transfer }
  | { type: 'UPDATE_TRANSFER'; payload: Transfer }
  | { type: 'CANCEL_TRANSFER'; payload: string }
  | { type: 'ADD_ADJUSTMENT'; payload: Adjustment }
  | { type: 'UPDATE_ADJUSTMENT'; payload: Adjustment }
  | { type: 'APPROVE_ADJUSTMENT'; payload: { id: string; approvedBy: string } }
  | { type: 'REJECT_ADJUSTMENT'; payload: { id: string; rejectedBy: string; reason: string } }
  | { type: 'ADD_STOCK_SNAPSHOT'; payload: StockSnapshot }
  | { type: 'ADD_STOCK_SNAPSHOTS'; payload: StockSnapshot[] }
  | { type: 'ADD_AUDIT_LOG'; payload: AuditLog }
  | { type: 'CLOSE_PERIOD'; payload: PeriodClosing };

const initialState: AppState = {
  loadError: '',
  barang: initialBarang,
  gudang: initialGudang,
  stockOpname: initialStockOpname,
  pembelian: initialPembelian,
  transfers: [],
  adjustments: [],
  stockSnapshots: initialStockSnapshots,
  stockMovements: [],
  auditLogs: [],
  periodClosings: [],
  currentPage: 'dashboard',
  currentUser: { nama: 'Admin', role: 'admin' },
  selectedGudang: 'all',
  selectedPeriode: '2026-10',
  isSupabaseMode: false,
  isLoading: true,
};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_SELECTED_GUDANG':
      return { ...state, selectedGudang: action.payload };
    case 'SET_SELECTED_PERIODE':
      return { ...state, selectedPeriode: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    case 'LOAD_DATA':
      return { ...state, ...action.payload, isLoading: false };
    case 'ADD_BARANG':
      return { ...state, barang: [...state.barang, action.payload] };
    case 'UPDATE_BARANG':
      return { ...state, barang: state.barang.map(b => b.id === action.payload.id ? action.payload : b) };
    case 'DELETE_BARANG':
      return { ...state, barang: state.barang.filter(b => b.id !== action.payload) };
    case 'ADD_GUDANG':
      return { ...state, gudang: [...state.gudang, action.payload] };
    case 'UPDATE_GUDANG':
      return { ...state, gudang: state.gudang.map(g => g.id === action.payload.id ? action.payload : g) };
    case 'ADD_STOCK_OPNAME':
      return { ...state, stockOpname: [...state.stockOpname, action.payload] };
    case 'UPDATE_STOCK_OPNAME':
      return { ...state, stockOpname: state.stockOpname.map(so => so.id === action.payload.id ? action.payload : so) };
    case 'ADD_PEMBELIAN':
      return { ...state, pembelian: [...state.pembelian, action.payload] };
    case 'VOID_PEMBELIAN':
      return { ...state, pembelian: state.pembelian.map(p => p.id === action.payload ? { ...p, status: 'void' as const } : p) };
    case 'ADD_TRANSFER':
      return { ...state, transfers: [...state.transfers, action.payload] };
    case 'UPDATE_TRANSFER':
      return { ...state, transfers: state.transfers.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'CANCEL_TRANSFER':
      return { ...state, transfers: state.transfers.map(t => t.id === action.payload ? { ...t, status: 'cancelled' as const } : t) };
    case 'ADD_ADJUSTMENT':
      return { ...state, adjustments: [...state.adjustments, action.payload] };
    case 'UPDATE_ADJUSTMENT':
      return { ...state, adjustments: state.adjustments.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'APPROVE_ADJUSTMENT':
      return {
        ...state,
        adjustments: state.adjustments.map(a =>
          a.id === action.payload.id
            ? { ...a, status: 'approved' as const, disetujuiOleh: action.payload.approvedBy, tanggalPersetujuan: new Date().toISOString() }
            : a
        )
      };
    case 'REJECT_ADJUSTMENT':
      return {
        ...state,
        adjustments: state.adjustments.map(a =>
          a.id === action.payload.id
            ? { ...a, status: 'rejected' as const, disetujuiOleh: action.payload.rejectedBy, tanggalPersetujuan: new Date().toISOString(), catatan: a.catatan + '\n[DITOLAK] ' + action.payload.reason }
            : a
        )
      };
    case 'ADD_STOCK_SNAPSHOT':
      return { ...state, stockSnapshots: [...state.stockSnapshots, action.payload] };
    case 'ADD_STOCK_SNAPSHOTS':
      return { ...state, stockSnapshots: [...state.stockSnapshots, ...action.payload] };
    case 'ADD_AUDIT_LOG':
      return { ...state, auditLogs: [...state.auditLogs, action.payload] };
    case 'CLOSE_PERIOD':
      return { ...state, periodClosings: [...state.periodClosings, action.payload] };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addAuditLog: (action: string, entityType: string, entityId: string, dataBefore?: any, dataAfter?: any, reason?: string) => void;
  getCurrentStock: (barangId: string, gudangId: string) => number | null;
  isPeriodClosed: (periode: string, gudangId: string) => boolean;
  syncFromSupabase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const useSupabase = isSupabaseConfigured();

  // Load data from Supabase or localStorage
  useEffect(() => {
    const loadData = async () => {
      if (useSupabase) {
        try {
          const [gudangRes, barangRes, snapshotRes, opnameRes, pembelianRes, closingRes] = await Promise.all([
            dbService.gudangService.getAll(),
            dbService.barangService.getAll(),
            dbService.stockService.getAll(),
            dbService.opnameService.getAll(),
            dbService.pembelianService.getAll(),
            dbService.closingService.getAll(),
          ]);

          for(const result of [gudangRes,barangRes,snapshotRes,opnameRes,pembelianRes,closingRes])if(result.error)throw Error(result.error.message);
          // Convert from DB format to app format
          const gudang: Gudang[] = (gudangRes.data || []).map((g: any) => ({
            id: g.id,
            nama: g.nama,
            kode: g.kode,
            alamat: g.alamat || '',
            statusAktif: g.status_aktif,
          }));

          const barang: MasterBarang[] = (barangRes.data || []).map((b: any) => ({
            id: b.id,
            nama: b.nama,
            kategori: b.kategori,
            subkategori: b.subkategori || '',
            satuanDasar: b.satuan_dasar,
            satuanPembelian: b.satuan_pembelian,
            konversi: typeof b.konversi === 'string' ? JSON.parse(b.konversi) : (b.konversi || []),
            minimumStock: b.minimum_stock,
            hargaTerakhir: b.harga_terakhir,
            hargaRataRata: b.harga_rata_rata,
            lokasiGudang: b.lokasi_gudang,
            statusAktif: b.status_aktif,
            createdAt: b.created_at,
            updatedAt: b.updated_at,
          }));

          const stockSnapshots: StockSnapshot[] = (snapshotRes.data || []).map((s: any) => ({
            barangId: s.barang_id,
            gudangId: s.gudang_id,
            periode: s.periode,
            quantity: s.quantity,
            nilaiTotal: s.nilai_total,
            hargaRataRata: s.harga_rata_rata,
            tanggal: s.tanggal,
          }));

          const transferRes = await dbService.transferService.getAll();
          if(transferRes.error)throw Error(transferRes.error.message);
          const transfers: Transfer[] = (transferRes.data || []).map((t: any) => ({
            id: t.id,
            nomorTransfer: t.nomor_transfer,
            tanggal: t.tanggal,
            gudangAsalId: t.gudang_asal_id,
            gudangTujuanId: t.gudang_tujuan_id,
            petugas: t.petugas,
            status: t.status,
            items: (t.items || []).map((i: any) => ({
              id: i.id,
              transferId: i.transfer_id,
              barangId: i.barang_id,
              quantity: i.quantity,
              satuan: i.satuan,
              quantityDasar: i.quantity_dasar,
              catatan: i.catatan || '',
              createdAt: i.created_at,
            })),
            catatan: t.catatan || '',
            createdBy: t.created_by,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
          }));

          dispatch({
            type: 'LOAD_DATA',
            payload: {
              gudang,
              barang,
              transfers: transfers.length > 0 ? transfers : [],
              stockSnapshots,
              stockOpname: (opnameRes.data || []).map((s:any)=>({id:s.id,periode:s.periode,tanggal:s.tanggal,gudangId:s.gudang_id,petugas:s.petugas,status:s.status,createdAt:s.created_at,updatedAt:s.updated_at,items:(s.items||[]).map((i:any)=>({barangId:i.barang_id,stockSistem:i.stock_sistem,stockFisik:i.stock_fisik,selisih:i.selisih,catatan:i.catatan||''}))})),
              pembelian: (pembelianRes.data || []).map((p:any)=>({id:p.id,tanggal:p.tanggal,nomorNota:p.nomor_nota,supplier:p.supplier,gudangId:p.gudang_id,totalDiskon:p.total_diskon,pajak:p.pajak,total:p.total,catatan:p.catatan||'',status:p.status,createdAt:p.created_at,updatedAt:p.updated_at,createdBy:p.created_by,items:(p.items||[]).map((i:any)=>({barangId:i.barang_id,quantity:i.quantity,satuan:i.satuan,quantityDasar:i.quantity_dasar,hargaSatuan:i.harga_satuan,diskon:i.diskon,subtotal:i.subtotal}))})),
              periodClosings: (closingRes.data || []).map((c:any)=>({id:c.id,periode:c.periode,gudangId:c.gudang_id,closedAt:c.closed_at,closedBy:c.closed_by,status:c.status})),
              isSupabaseMode: true,
              loadError: '',
            }
          });
        } catch (error) {
          console.error('Error loading from Supabase:', error);
          dispatch({type:'LOAD_DATA',payload:{barang:[],gudang:[],stockSnapshots:[],stockOpname:[],pembelian:[],transfers:[],adjustments:[],periodClosings:[],stockMovements:[],isSupabaseMode:false,loadError:error instanceof Error?error.message:'Gagal membaca sumber Supabase'}});
        }
      } else {
        loadFromLocalStorage();
      }
    };

    const loadFromLocalStorage = () => {
      try {
        const saved = localStorage.getItem('laundry-stock-hpp');
        if (saved) {
          const parsed = JSON.parse(saved);
          dispatch({ type: 'LOAD_DATA', payload: parsed });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (e) {
        console.error('Error loading state:', e);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    if(useSupabase&&!state.currentUser.id){dispatch({type:'SET_LOADING',payload:false});return;}
    dispatch({type:'SET_LOADING',payload:true});
    loadData();
  }, [useSupabase,state.currentUser.id]);

  // Save to localStorage (when not using Supabase)
  useEffect(() => {
    if (!useSupabase && !state.isLoading) {
      const toSave = {
        barang: state.barang,
        gudang: state.gudang,
        stockOpname: state.stockOpname,
        pembelian: state.pembelian,
        stockSnapshots: state.stockSnapshots,
        stockMovements: state.stockMovements,
        transfers: state.transfers,
        adjustments: state.adjustments,
        auditLogs: state.auditLogs,
        periodClosings: state.periodClosings,
        currentUser: state.currentUser,
      };
      localStorage.setItem('laundry-stock-hpp', JSON.stringify(toSave));
    }
  }, [useSupabase, state.barang, state.gudang, state.stockOpname, state.pembelian, state.stockSnapshots, state.stockMovements, state.transfers, state.adjustments, state.auditLogs, state.periodClosings, state.currentUser, state.isLoading]);

  const addAuditLog = async (action: string, entityType: string, entityId: string, dataBefore?: any, dataAfter?: any, reason?: string) => {
    const log: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      user: state.currentUser.nama,
      action,
      entityType,
      entityId,
      dataBefore,
      dataAfter,
      reason,
    };
    dispatch({ type: 'ADD_AUDIT_LOG', payload: log });

    if (useSupabase) {
      try {
        await dbService.auditService.create(log);
      } catch (error) {
        console.error('Error saving audit log:', error);
      }
    }
  };

  const getCurrentStock = (barangId: string, gudangId: string): number | null => {
    if (state.stockMovements.length) {
      const movements = state.stockMovements.filter(m=>m.itemId===barangId && m.warehouseId===gudangId);
      return movements.length ? movements[movements.length-1].balance : null;
    }
    const snapshots = state.stockSnapshots
      .filter(s => s.barangId === barangId && s.gudangId === gudangId)
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    
    if (snapshots.length === 0) return null;
    
    let currentQty = snapshots[0].quantity;
    
    const lastSnapshotDate = snapshots[0].tanggal;
    const purchasesAfter = state.pembelian
      .filter(p => p.gudangId === gudangId && p.status === 'active' && p.tanggal > lastSnapshotDate)
      .flatMap(p => p.items.filter(i => i.barangId === barangId));
    
    purchasesAfter.forEach(item => {
      currentQty += item.quantityDasar;
    });
    
    return currentQty;
  };

  const isPeriodClosed = (periode: string, gudangId: string): boolean => {
    return state.periodClosings.some(c => c.periode === periode && c.gudangId === gudangId && c.status === 'closed');
  };

  const syncFromSupabase = async () => {
    if (!useSupabase) return;
    
    try {
      const [snapshotRes, opnameRes, pembelianRes] = await Promise.all([
        dbService.stockService.getAll(),
        dbService.opnameService.getAll(),
        dbService.pembelianService.getAll(),
      ]);

      const stockSnapshots: StockSnapshot[] = (snapshotRes.data || []).map((s: any) => ({
        barangId: s.barang_id,
        gudangId: s.gudang_id,
        periode: s.periode,
        quantity: s.quantity,
        nilaiTotal: s.nilai_total,
        hargaRataRata: s.harga_rata_rata,
        tanggal: s.tanggal,
      }));

      dispatch({ type: 'LOAD_DATA', payload: { stockSnapshots } });
    } catch (error) {
      console.error('Error syncing from Supabase:', error);
    }
  };

  return (
    <AppContext.Provider value={{ state, dispatch, addAuditLog, getCurrentStock, isPeriodClosed, syncFromSupabase }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
