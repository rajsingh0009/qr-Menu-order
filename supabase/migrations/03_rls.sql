-- ==============================================================================
-- 03_rls.sql: Row Level Security (RLS) Policies & Realtime Setup
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. ADMINS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins can view and manage admin records"
ON public.admins
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- 2. RESTAURANTS POLICIES
-- ------------------------------------------------------------------------------
-- Admins have full access
CREATE POLICY "Admins manage all restaurants"
ON public.restaurants
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Owners can view their own restaurant (even if expired or suspended, read-only)
CREATE POLICY "Owners can view own restaurant"
ON public.restaurants
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Owners can update their own restaurant profile settings (triggers prevent modifying billing fields)
CREATE POLICY "Owners can update own restaurant settings"
ON public.restaurants
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Public can view active, paid restaurants (for customer menu loading by slug or id)
CREATE POLICY "Public can view live restaurants"
ON public.restaurants
FOR SELECT
TO anon, authenticated
USING (status = 'active' AND paid_until >= CURRENT_DATE);

-- ------------------------------------------------------------------------------
-- 3. PAYMENTS POLICIES
-- ------------------------------------------------------------------------------
-- Admins have full access
CREATE POLICY "Admins manage payments"
ON public.payments
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Owners can view payment history for their own restaurant
CREATE POLICY "Owners view own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (restaurant_id = public.get_my_restaurant_id());

-- ------------------------------------------------------------------------------
-- 4. RESTAURANT TABLES POLICIES
-- ------------------------------------------------------------------------------
-- Admins full access
CREATE POLICY "Admins manage tables"
ON public.restaurant_tables
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Owners manage their own tables
CREATE POLICY "Owners manage own tables"
ON public.restaurant_tables
FOR ALL
TO authenticated
USING (restaurant_id = public.get_my_restaurant_id())
WITH CHECK (restaurant_id = public.get_my_restaurant_id());

-- Public can read table by token if restaurant is live
CREATE POLICY "Public read table info if restaurant live"
ON public.restaurant_tables
FOR SELECT
TO anon, authenticated
USING (is_active = true AND public.is_restaurant_live(restaurant_id));

-- ------------------------------------------------------------------------------
-- 5. MENU CATEGORIES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins manage categories"
ON public.menu_categories
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Owners manage own categories"
ON public.menu_categories
FOR ALL
TO authenticated
USING (restaurant_id = public.get_my_restaurant_id())
WITH CHECK (restaurant_id = public.get_my_restaurant_id());

CREATE POLICY "Public view categories for live restaurants"
ON public.menu_categories
FOR SELECT
TO anon, authenticated
USING (public.is_restaurant_live(restaurant_id));

-- ------------------------------------------------------------------------------
-- 6. MENU ITEMS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins manage menu items"
ON public.menu_items
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Owners manage own menu items"
ON public.menu_items
FOR ALL
TO authenticated
USING (restaurant_id = public.get_my_restaurant_id())
WITH CHECK (restaurant_id = public.get_my_restaurant_id());

CREATE POLICY "Public view menu items for live restaurants"
ON public.menu_items
FOR SELECT
TO anon, authenticated
USING (public.is_restaurant_live(restaurant_id));

-- ------------------------------------------------------------------------------
-- 7. TABLE SESSIONS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins manage sessions"
ON public.table_sessions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Owners manage own table sessions"
ON public.table_sessions
FOR ALL
TO authenticated
USING (restaurant_id = public.get_my_restaurant_id())
WITH CHECK (restaurant_id = public.get_my_restaurant_id());

CREATE POLICY "Public read own session"
ON public.table_sessions
FOR SELECT
TO anon, authenticated
USING (true);

-- ------------------------------------------------------------------------------
-- 8. ORDERS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins manage orders"
ON public.orders
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Owners manage own orders"
ON public.orders
FOR ALL
TO authenticated
USING (restaurant_id = public.get_my_restaurant_id())
WITH CHECK (restaurant_id = public.get_my_restaurant_id());

-- Customers can view orders belonging to their active table session
CREATE POLICY "Customers can view orders for their table session"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (true);

-- ------------------------------------------------------------------------------
-- 9. ORDER ITEMS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins manage order items"
ON public.order_items
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Owners manage own order items"
ON public.order_items
FOR ALL
TO authenticated
USING (restaurant_id = public.get_my_restaurant_id())
WITH CHECK (restaurant_id = public.get_my_restaurant_id());

CREATE POLICY "Customers can view order items"
ON public.order_items
FOR SELECT
TO anon, authenticated
USING (true);

-- ------------------------------------------------------------------------------
-- 10. BILLS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins manage bills"
ON public.bills
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Owners manage own bills"
ON public.bills
FOR ALL
TO authenticated
USING (restaurant_id = public.get_my_restaurant_id())
WITH CHECK (restaurant_id = public.get_my_restaurant_id());

CREATE POLICY "Customers can view bills for their table"
ON public.bills
FOR SELECT
TO anon, authenticated
USING (true);

-- ------------------------------------------------------------------------------
-- 11. SERVICE REQUESTS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins manage service requests"
ON public.service_requests
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Owners manage own service requests"
ON public.service_requests
FOR ALL
TO authenticated
USING (restaurant_id = public.get_my_restaurant_id())
WITH CHECK (restaurant_id = public.get_my_restaurant_id());

CREATE POLICY "Customers view service requests"
ON public.service_requests
FOR SELECT
TO anon, authenticated
USING (true);

-- ------------------------------------------------------------------------------
-- 12. REALTIME CONFIGURATION
-- ------------------------------------------------------------------------------
-- Add tables to supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'service_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
    END IF;
END $$;
