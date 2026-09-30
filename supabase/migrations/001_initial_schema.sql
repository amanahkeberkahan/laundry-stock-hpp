-- ============================================
-- LAUNDRY STOCK & HPP - SUPABASE SCHEMA
-- ============================================
-- Jalankan SQL ini di Supabase SQL Editor
-- https://supabase.com/dashboard → SQL Editor → New Query

-- ============================================
-- 1. PROFILES TABLE (Extended User Data)
-- ============================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nama TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff_gudang', 'finance', 'owner')),
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies untuk profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 2. GUDANG TABLE
-- ============================================
CREATE TABLE public.gudang (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kode TEXT NOT NULL,
  alamat TEXT,
  status_aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.gudang ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view gudang" ON public.gudang
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage gudang" ON public.gudang
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 3. MASTER BARANG TABLE
-- ============================================
CREATE TABLE public.master_barang (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kategori TEXT NOT NULL,
  subkategori TEXT DEFAULT '',
  satuan_dasar TEXT NOT NULL DEFAULT 'pcs',
  satuan_pembelian TEXT NOT NULL DEFAULT 'pcs',
  konversi JSONB DEFAULT '[]',
  minimum_stock NUMERIC DEFAULT 0,
  harga_terakhir NUMERIC DEFAULT 0,
  harga_rata_rata NUMERIC DEFAULT 0,
  lokasi_gudang TEXT REFERENCES public.gudang(id),
  status_aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.master_barang ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view barang" ON public.master_barang
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage barang" ON public.master_barang
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff_gudang'))
  );

-- ============================================
-- 4. STOCK SNAPSHOTS TABLE
-- ============================================
CREATE TABLE public.stock_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barang_id TEXT REFERENCES public.master_barang(id) ON DELETE CASCADE,
  gudang_id TEXT REFERENCES public.gudang(id),
  periode TEXT NOT NULL, -- Format: YYYY-MM
  quantity NUMERIC NOT NULL,
  nilai_total NUMERIC DEFAULT 0,
  harga_rata_rata NUMERIC DEFAULT 0,
  tanggal DATE NOT NULL,
  sumber TEXT DEFAULT 'opname', -- 'opname', 'pembelian', 'adjustment'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.stock_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view snapshots" ON public.stock_snapshots
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and Admins can manage snapshots" ON public.stock_snapshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff_gudang', 'finance'))
  );

-- ============================================
-- 5. STOCK OPNAME TABLE
-- ============================================
CREATE TABLE public.stock_opname (
  id TEXT PRIMARY KEY,
  periode TEXT NOT NULL,
  tanggal DATE NOT NULL,
  gudang_id TEXT REFERENCES public.gudang(id),
  petugas TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.stock_opname ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view opname" ON public.stock_opname
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and Admins can manage opname" ON public.stock_opname
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff_gudang'))
  );

-- ============================================
-- 6. STOCK OPNAME ITEMS TABLE
-- ============================================
CREATE TABLE public.stock_opname_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opname_id TEXT REFERENCES public.stock_opname(id) ON DELETE CASCADE,
  barang_id TEXT REFERENCES public.master_barang(id),
  stock_sistem NUMERIC NOT NULL,
  stock_fisik NUMERIC NOT NULL,
  selisih NUMERIC DEFAULT 0,
  catatan TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.stock_opname_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view opname items" ON public.stock_opname_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and Admins can manage opname items" ON public.stock_opname_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff_gudang'))
  );

-- ============================================
-- 7. PEMBELIAN TABLE
-- ============================================
CREATE TABLE public.pembelian (
  id TEXT PRIMARY KEY,
  tanggal DATE NOT NULL,
  nomor_nota TEXT NOT NULL,
  supplier TEXT NOT NULL,
  gudang_id TEXT REFERENCES public.gudang(id),
  total_diskon NUMERIC DEFAULT 0,
  pajak NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  foto_nota TEXT,
  catatan TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'void')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pembelian ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pembelian" ON public.pembelian
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin, Staff, Finance can manage pembelian" ON public.pembelian
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff_gudang', 'finance'))
  );

-- ============================================
-- 8. PEMBELIAN ITEMS TABLE
-- ============================================
CREATE TABLE public.pembelian_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pembelian_id TEXT REFERENCES public.pembelian(id) ON DELETE CASCADE,
  barang_id TEXT REFERENCES public.master_barang(id),
  quantity NUMERIC NOT NULL,
  satuan TEXT NOT NULL,
  quantity_dasar NUMERIC NOT NULL,
  harga_satuan NUMERIC NOT NULL,
  diskon NUMERIC DEFAULT 0,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pembelian_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pembelian items" ON public.pembelian_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin, Staff, Finance can manage pembelian items" ON public.pembelian_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff_gudang', 'finance'))
  );

-- ============================================
-- 9. PERIOD CLOSINGS TABLE
-- ============================================
CREATE TABLE public.period_closings (
  id TEXT PRIMARY KEY,
  periode TEXT NOT NULL,
  gudang_id TEXT REFERENCES public.gudang(id),
  closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'closed' CHECK (status IN ('closed', 'open')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.period_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view closings" ON public.period_closings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Finance and Admins can manage closings" ON public.period_closings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'finance'))
  );

-- ============================================
-- 10. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data_before JSONB,
  data_after JSONB,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit logs" ON public.audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 11. FUNCTIONS & TRIGGERS
-- ============================================

-- Function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers untuk auto-update
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gudang_updated_at BEFORE UPDATE ON public.gudang
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_master_barang_updated_at BEFORE UPDATE ON public.master_barang
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_opname_updated_at BEFORE UPDATE ON public.stock_opname
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pembelian_updated_at BEFORE UPDATE ON public.pembelian
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. FUNCTION: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nama, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff_gudang')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 13. INSERT INITIAL DATA
-- ============================================

-- Insert Gudang
INSERT INTO public.gudang (id, nama, kode) VALUES
  ('gudang-jemur', 'Gudang Jemur', 'GJ'),
  ('gudang-pradhana', 'Pradhana', 'PR');

-- ============================================
-- 14. INDEXES untuk performance
-- ============================================
CREATE INDEX idx_stock_snapshots_periode ON public.stock_snapshots(periode);
CREATE INDEX idx_stock_snapshots_barang ON public.stock_snapshots(barang_id);
CREATE INDEX idx_stock_snapshots_gudang ON public.stock_snapshots(gudang_id);
CREATE INDEX idx_pembelian_tanggal ON public.pembelian(tanggal);
CREATE INDEX idx_pembelian_gudang ON public.pembelian(gudang_id);
CREATE INDEX idx_stock_opname_periode ON public.stock_opname(periode);
CREATE INDEX idx_period_closings_periode ON public.period_closings(periode);

-- ============================================
-- SELESAI! Schema berhasil dibuat.
-- ============================================
