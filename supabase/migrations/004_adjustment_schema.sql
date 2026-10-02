-- ============================================
-- MODUL ADJUSTMENT - DATABASE SCHEMA
-- ============================================
-- Jalankan di Supabase → SQL Editor

-- ============================================
-- 1. ADJUSTMENTS TABLE (Header Adjustment)
-- ============================================
CREATE TABLE public.adjustments (
  id TEXT PRIMARY KEY,
  nomor_adjustment TEXT NOT NULL UNIQUE,
  tanggal DATE NOT NULL,
  gudang_id TEXT REFERENCES public.gudang(id),
  tipe TEXT NOT NULL CHECK (tipe IN ('stock_opname', 'kerusakan', 'kehilangan', 'kesalahan_catat', 'lainnya')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  petugas TEXT NOT NULL,
  disetujui_oleh TEXT,
  tanggal_persetujuan TIMESTAMP WITH TIME ZONE,
  catatan TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view adjustments" ON public.adjustments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and Finance can manage adjustments" ON public.adjustments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'finance'))
  );

-- ============================================
-- 2. ADJUSTMENT ITEMS TABLE (Detail Item Adjustment)
-- ============================================
CREATE TABLE public.adjustment_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  adjustment_id TEXT REFERENCES public.adjustments(id) ON DELETE CASCADE,
  barang_id TEXT REFERENCES public.master_barang(id),
  quantity_sebelum NUMERIC NOT NULL,
  quantity_sesudah NUMERIC NOT NULL,
  selisih NUMERIC NOT NULL,
  alasan TEXT NOT NULL,
  catatan TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.adjustment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view adjustment items" ON public.adjustment_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and Finance can manage adjustment items" ON public.adjustment_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'finance'))
  );

-- ============================================
-- 3. TRIGGER: Auto-update updated_at
-- ============================================
CREATE TRIGGER update_adjustments_updated_at BEFORE UPDATE ON public.adjustments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. INDEXES untuk performance
-- ============================================
CREATE INDEX idx_adjustments_tanggal ON public.adjustments(tanggal);
CREATE INDEX idx_adjustments_gudang ON public.adjustments(gudang_id);
CREATE INDEX idx_adjustments_tipe ON public.adjustments(tipe);
CREATE INDEX idx_adjustments_status ON public.adjustments(status);
CREATE INDEX idx_adjustment_items_adjustment ON public.adjustment_items(adjustment_id);
CREATE INDEX idx_adjustment_items_barang ON public.adjustment_items(barang_id);

-- ============================================
-- SELESAI! Schema adjustment sudah dibuat.
-- ============================================
