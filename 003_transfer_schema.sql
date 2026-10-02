-- ============================================
-- TRANSFER ANTAR GUDANG - DATABASE SCHEMA
-- ============================================
-- Jalankan di Supabase → SQL Editor

-- ============================================
-- 1. TRANSFERS TABLE (Header Transfer)
-- ============================================
CREATE TABLE public.transfers (
  id TEXT PRIMARY KEY,
  nomor_transfer TEXT NOT NULL UNIQUE,
  tanggal DATE NOT NULL,
  gudang_asal_id TEXT REFERENCES public.gudang(id),
  gudang_tujuan_id TEXT REFERENCES public.gudang(id),
  petugas TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
  catatan TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transfers" ON public.transfers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and Staff can manage transfers" ON public.transfers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff_gudang'))
  );

-- ============================================
-- 2. TRANSFER ITEMS TABLE (Detail Item Transfer)
-- ============================================
CREATE TABLE public.transfer_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id TEXT REFERENCES public.transfers(id) ON DELETE CASCADE,
  barang_id TEXT REFERENCES public.master_barang(id),
  quantity NUMERIC NOT NULL,
  satuan TEXT NOT NULL,
  quantity_dasar NUMERIC NOT NULL,
  catatan TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transfer items" ON public.transfer_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and Staff can manage transfer items" ON public.transfer_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff_gudang'))
  );

-- ============================================
-- 3. TRIGGER: Auto-update updated_at
-- ============================================
CREATE TRIGGER update_transfers_updated_at BEFORE UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. INDEXES untuk performance
-- ============================================
CREATE INDEX idx_transfers_tanggal ON public.transfers(tanggal);
CREATE INDEX idx_transfers_gudang_asal ON public.transfers(gudang_asal_id);
CREATE INDEX idx_transfers_gudang_tujuan ON public.transfers(gudang_tujuan_id);
CREATE INDEX idx_transfers_status ON public.transfers(status);
CREATE INDEX idx_transfer_items_transfer ON public.transfer_items(transfer_id);
CREATE INDEX idx_transfer_items_barang ON public.transfer_items(barang_id);

-- ============================================
-- 5. FUNCTION: Complete Transfer (Update Stock)
-- ============================================
CREATE OR REPLACE FUNCTION public.complete_transfer(transfer_id_param TEXT)
RETURNS VOID AS $$
DECLARE
  transfer_rec RECORD;
  item_rec RECORD;
  stock_asal NUMERIC;
  stock_tujuan NUMERIC;
  new_stock_asal NUMERIC;
  new_stock_tujuan NUMERIC;
  snapshot_id UUID;
BEGIN
  -- Get transfer data
  SELECT * INTO transfer_rec FROM public.transfers WHERE id = transfer_id_param;
  
  IF transfer_rec IS NULL THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;
  
  IF transfer_rec.status != 'pending' AND transfer_rec.status != 'in_transit' THEN
    RAISE EXCEPTION 'Transfer cannot be completed (status: %)', transfer_rec.status;
  END IF;
  
  -- Process each item
  FOR item_rec IN SELECT * FROM public.transfer_items WHERE transfer_id = transfer_id_param
  LOOP
    -- Get current stock at source
    SELECT COALESCE(SUM(quantity), 0) INTO stock_asal
    FROM public.stock_snapshots
    WHERE barang_id = item_rec.barang_id
      AND gudang_id = transfer_rec.gudang_asal_id
      AND tanggal = (
        SELECT MAX(tanggal) FROM public.stock_snapshots
        WHERE barang_id = item_rec.barang_id AND gudang_id = transfer_rec.gudang_asal_id
      );
    
    -- Check if enough stock
    IF stock_asal < item_rec.quantity_dasar THEN
      RAISE EXCEPTION 'Insufficient stock for barang % at source', item_rec.barang_id;
    END IF;
    
    -- Reduce stock at source
    new_stock_asal := stock_asal - item_rec.quantity_dasar;
    INSERT INTO public.stock_snapshots (barang_id, gudang_id, periode, quantity, nilai_total, harga_rata_rata, tanggal, sumber)
    VALUES (
      item_rec.barang_id,
      transfer_rec.gudang_asal_id,
      TO_CHAR(transfer_rec.tanggal, 'YYYY-MM'),
      new_stock_asal,
      new_stock_asal * (SELECT harga_rata_rata FROM public.master_barang WHERE id = item_rec.barang_id),
      (SELECT harga_rata_rata FROM public.master_barang WHERE id = item_rec.barang_id),
      transfer_rec.tanggal,
      'transfer_out'
    );
    
    -- Get current stock at destination
    SELECT COALESCE(SUM(quantity), 0) INTO stock_tujuan
    FROM public.stock_snapshots
    WHERE barang_id = item_rec.barang_id
      AND gudang_id = transfer_rec.gudang_tujuan_id
      AND tanggal = (
        SELECT MAX(tanggal) FROM public.stock_snapshots
        WHERE barang_id = item_rec.barang_id AND gudang_id = transfer_rec.gudang_tujuan_id
      );
    
    -- Increase stock at destination
    new_stock_tujuan := stock_tujuan + item_rec.quantity_dasar;
    INSERT INTO public.stock_snapshots (barang_id, gudang_id, periode, quantity, nilai_total, harga_rata_rata, tanggal, sumber)
    VALUES (
      item_rec.barang_id,
      transfer_rec.gudang_tujuan_id,
      TO_CHAR(transfer_rec.tanggal, 'YYYY-MM'),
      new_stock_tujuan,
      new_stock_tujuan * (SELECT harga_rata_rata FROM public.master_barang WHERE id = item_rec.barang_id),
      (SELECT harga_rata_rata FROM public.master_barang WHERE id = item_rec.barang_id),
      transfer_rec.tanggal,
      'transfer_in'
    );
  END LOOP;
  
  -- Update transfer status
  UPDATE public.transfers SET status = 'completed', updated_at = NOW() WHERE id = transfer_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SELESAI! Schema transfer sudah dibuat.
-- ============================================
