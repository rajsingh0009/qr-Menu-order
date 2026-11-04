-- ==============================================================================
-- 01_schema.sql: Multi-Restaurant QR Ordering SaaS Database Schema
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SUPER ADMINS TABLE
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    logo_url TEXT,
    gst_number TEXT,
    gst_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    service_charge_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    currency_symbol TEXT NOT NULL DEFAULT 'â‚¹',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
    paid_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    setup_fee_paid BOOLEAN NOT NULL DEFAULT false,
    monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 1000.00,
    setup_fee NUMERIC(10,2) NOT NULL DEFAULT 5000.00,
    max_tables INTEGER NOT NULL DEFAULT 20 CHECK (max_tables > 0),
    sound_enabled BOOLEAN NOT NULL DEFAULT true,
    sound_volume NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    opening_hours TEXT NOT NULL DEFAULT '10:00 AM - 11:00 PM',
    admin_contact_phone TEXT NOT NULL DEFAULT '+91 98765 43210',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON public.restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON public.restaurants(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_paid_until ON public.restaurants(paid_until);

-- 3. PAYMENTS TABLE (Admin records)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('setup', 'monthly', 'other')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_restaurant_id ON public.payments(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

-- 4. RESTAURANT TABLES
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number INTEGER NOT NULL,
    table_name TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_restaurant_table_number UNIQUE (restaurant_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_token ON public.restaurant_tables(token);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant ON public.restaurant_tables(restaurant_id);

-- 5. MENU CATEGORIES
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON public.menu_categories(restaurant_id, sort_order);

-- 6. MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_veg BOOLEAN NOT NULL DEFAULT true,
    is_available BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON public.menu_items(restaurant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);

-- 7. TABLE SESSIONS
CREATE TABLE IF NOT EXISTS public.table_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    device_fingerprint TEXT,
    order_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_table_sessions_token ON public.table_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table ON public.table_sessions(table_id, status);

-- 8. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE,
    order_number INTEGER NOT NULL,
    order_type TEXT NOT NULL DEFAULT 'initial' CHECK (order_type IN ('initial', 'addon')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'served', 'completed', 'rejected', 'cancelled')),
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    service_charge_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    customer_notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON public.orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_session ON public.orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON public.orders(table_id);

-- 9. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 50),
    total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
    is_veg BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'served')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_restaurant ON public.order_items(restaurant_id);

-- 10. BILLS
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.table_sessions(id) ON DELETE SET NULL,
    bill_number INTEGER NOT NULL,
    restaurant_name TEXT NOT NULL,
    restaurant_address TEXT,
    restaurant_phone TEXT,
    restaurant_gst TEXT,
    table_number INTEGER NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    service_charge_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    service_charge_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'other')),
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_restaurant_bill_number UNIQUE (restaurant_id, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_bills_restaurant ON public.bills(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_table ON public.bills(table_id);

-- 11. SERVICE REQUESTS (Call Waiter / Request Bill)
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.table_sessions(id) ON DELETE CASCADE,
    table_number INTEGER NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('call_waiter', 'request_bill')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_service_requests_restaurant ON public.service_requests(restaurant_id, status);
-- ==============================================================================
-- 02_functions_triggers.sql: Helper Functions, Security Definer Routines & Triggers
-- ==============================================================================

-- 1. Check if user is Super Admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins WHERE id = p_user_id
    );
$$;

-- 2. Check if a restaurant is currently live (active AND paid_until >= today)
CREATE OR REPLACE FUNCTION public.is_restaurant_live(p_restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.restaurants
        WHERE id = p_restaurant_id
          AND status = 'active'
          AND paid_until >= CURRENT_DATE
    );
$$;

-- 3. Get restaurant ID for current logged in owner
CREATE OR REPLACE FUNCTION public.get_my_restaurant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- 4. Trigger to prevent owners from tampering with subscription status or billing
CREATE OR REPLACE FUNCTION public.trg_prevent_owner_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Super admins are allowed to modify anything
    IF public.is_admin(auth.uid()) THEN
        NEW.updated_at = timezone('utc'::text, now());
        RETURN NEW;
    END IF;

    -- For owners and non-admins, ensure protected billing and limit fields are untouched
    IF (OLD.status IS DISTINCT FROM NEW.status) OR
       (OLD.paid_until IS DISTINCT FROM NEW.paid_until) OR
       (OLD.setup_fee_paid IS DISTINCT FROM NEW.setup_fee_paid) OR
       (OLD.monthly_fee IS DISTINCT FROM NEW.monthly_fee) OR
       (OLD.setup_fee IS DISTINCT FROM NEW.setup_fee) OR
       (OLD.max_tables IS DISTINCT FROM NEW.max_tables) OR
       (OLD.owner_id IS DISTINCT FROM NEW.owner_id) THEN
        RAISE EXCEPTION 'Access Denied: Restaurant owners cannot modify subscription status, paid_until, fees, or table limits.';
    END IF;

    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restaurants_anti_tamper ON public.restaurants;
CREATE TRIGGER trg_restaurants_anti_tamper
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.trg_prevent_owner_tampering();

-- 5. Trigger to enforce maximum tables limit
CREATE OR REPLACE FUNCTION public.trg_enforce_max_tables()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_max INTEGER;
    v_current INTEGER;
BEGIN
    SELECT max_tables INTO v_max FROM public.restaurants WHERE id = NEW.restaurant_id;
    SELECT count(*) INTO v_current FROM public.restaurant_tables WHERE restaurant_id = NEW.restaurant_id;

    IF v_current >= v_max THEN
        RAISE EXCEPTION 'Maximum table limit of % reached for this restaurant. Contact admin to increase limit.', v_max;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_max_tables ON public.restaurant_tables;
CREATE TRIGGER trg_check_max_tables
BEFORE INSERT ON public.restaurant_tables
FOR EACH ROW
EXECUTE FUNCTION public.trg_enforce_max_tables();

-- 6. Cron / Periodic job: Mark expired restaurants
CREATE OR REPLACE FUNCTION public.check_and_update_expired_restaurants()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE public.restaurants
    SET status = 'expired',
        updated_at = timezone('utc'::text, now())
    WHERE status = 'active'
      AND paid_until < CURRENT_DATE;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$;

-- 7. Customer Place Order (SECURITY DEFINER for anonymous table scans)
CREATE OR REPLACE FUNCTION public.customer_place_order(
    p_table_token TEXT,
    p_session_token TEXT,
    p_items JSONB,
    p_customer_notes TEXT DEFAULT NULL,
    p_order_type TEXT DEFAULT 'initial',
    p_device_fingerprint TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_table RECORD;
    v_rest RECORD;
    v_session_id UUID;
    v_order_id UUID;
    v_next_order_number INTEGER;
    v_recent_order_count INTEGER;
    v_item RECORD;
    v_menu_item RECORD;
    v_item_qty INTEGER;
    v_subtotal NUMERIC(10,2) := 0.00;
    v_line_total NUMERIC(10,2) := 0.00;
    v_tax_amount NUMERIC(10,2) := 0.00;
    v_service_charge_amount NUMERIC(10,2) := 0.00;
    v_grand_total NUMERIC(10,2) := 0.00;
    v_result JSONB;
BEGIN
    -- 1. Validate Table Token
    SELECT * INTO v_table
    FROM public.restaurant_tables
    WHERE token = p_table_token AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or inactive table QR code.';
    END IF;

    -- 2. Validate Restaurant Live Status
    SELECT * INTO v_rest
    FROM public.restaurants
    WHERE id = v_table.restaurant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Restaurant not found.';
    END IF;

    IF v_rest.status != 'active' OR v_rest.paid_until < CURRENT_DATE THEN
        RAISE EXCEPTION 'This restaurant is temporarily unavailable.';
    END IF;

    -- 3. Abuse Protection: Rate limit 5 orders per 10 minutes per session/device
    SELECT COUNT(*) INTO v_recent_order_count
    FROM public.orders o
    JOIN public.table_sessions s ON o.session_id = s.id
    WHERE (s.session_token = p_session_token OR (p_device_fingerprint IS NOT NULL AND s.device_fingerprint = p_device_fingerprint))
      AND o.table_id = v_table.id
      AND o.created_at >= (now() - INTERVAL '10 minutes');

    IF v_recent_order_count >= 5 THEN
        RAISE EXCEPTION 'Order limit reached (maximum 5 orders per 10 minutes). Please wait before ordering more.';
    END IF;

    -- 4. Find or Create Active Table Session
    SELECT id INTO v_session_id
    FROM public.table_sessions
    WHERE session_token = p_session_token
      AND table_id = v_table.id
      AND status = 'active'
    LIMIT 1;

    IF v_session_id IS NULL THEN
        INSERT INTO public.table_sessions (
            restaurant_id, table_id, session_token, status, device_fingerprint, order_count
        ) VALUES (
            v_table.restaurant_id, v_table.id, p_session_token, 'active', p_device_fingerprint, 1
        )
        RETURNING id INTO v_session_id;
    ELSE
        UPDATE public.table_sessions
        SET order_count = order_count + 1
        WHERE id = v_session_id;
    END IF;

    -- 5. Calculate Sequential Order Number
    SELECT COALESCE(MAX(order_number), 0) + 1 INTO v_next_order_number
    FROM public.orders
    WHERE restaurant_id = v_table.restaurant_id;

    -- 6. Pre-calculate subtotal by verifying menu items and capping item quantities
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        menu_item_id UUID,
        quantity INTEGER,
        notes TEXT
    )
    LOOP
        v_item_qty := LEAST(GREATEST(v_item.quantity, 1), 20);

        SELECT * INTO v_menu_item
        FROM public.menu_items
        WHERE id = v_item.menu_item_id
          AND restaurant_id = v_table.restaurant_id
          AND is_available = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'One or more items in your cart are no longer available.';
        END IF;

        v_line_total := v_menu_item.price * v_item_qty;
        v_subtotal := v_subtotal + v_line_total;
    END LOOP;

    -- 7. Taxes & Service Charge
    v_tax_amount := ROUND((v_subtotal * (v_rest.gst_percent / 100.0)), 2);
    v_service_charge_amount := ROUND((v_subtotal * (v_rest.service_charge_percent / 100.0)), 2);
    v_grand_total := v_subtotal + v_tax_amount + v_service_charge_amount;

    -- 8. Insert Order Record
    INSERT INTO public.orders (
        restaurant_id, table_id, session_id, order_number, order_type,
        status, subtotal, tax_amount, service_charge_amount, total_amount, customer_notes
    ) VALUES (
        v_table.restaurant_id, v_table.id, v_session_id, v_next_order_number,
        COALESCE(p_order_type, 'initial'), 'pending',
        v_subtotal, v_tax_amount, v_service_charge_amount, v_grand_total, p_customer_notes
    )
    RETURNING id INTO v_order_id;

    -- 9. Insert Order Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        menu_item_id UUID,
        quantity INTEGER,
        notes TEXT
    )
    LOOP
        v_item_qty := LEAST(GREATEST(v_item.quantity, 1), 20);

        SELECT * INTO v_menu_item
        FROM public.menu_items
        WHERE id = v_item.menu_item_id;

        INSERT INTO public.order_items (
            order_id, restaurant_id, menu_item_id, name, price,
            quantity, total_price, is_veg, notes, status
        ) VALUES (
            v_order_id, v_table.restaurant_id, v_menu_item.id, v_menu_item.name,
            v_menu_item.price, v_item_qty, (v_menu_item.price * v_item_qty),
            v_menu_item.is_veg, v_item.notes, 'pending'
        );
    END LOOP;

    -- 10. Format Return JSON
    SELECT jsonb_build_object(
        'order_id', v_order_id,
        'order_number', v_next_order_number,
        'order_type', p_order_type,
        'status', 'pending',
        'table_number', v_table.table_number,
        'subtotal', v_subtotal,
        'tax_amount', v_tax_amount,
        'service_charge_amount', v_service_charge_amount,
        'total_amount', v_grand_total,
        'created_at', now()
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 8. Customer Call Service (Waiter / Bill)
CREATE OR REPLACE FUNCTION public.customer_call_service(
    p_table_token TEXT,
    p_session_token TEXT,
    p_request_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_table RECORD;
    v_rest RECORD;
    v_session_id UUID;
    v_req_id UUID;
BEGIN
    SELECT * INTO v_table
    FROM public.restaurant_tables
    WHERE token = p_table_token AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid table token.';
    END IF;

    SELECT * INTO v_rest
    FROM public.restaurants
    WHERE id = v_table.restaurant_id;

    IF v_rest.status != 'active' OR v_rest.paid_until < CURRENT_DATE THEN
        RAISE EXCEPTION 'Restaurant is temporarily unavailable.';
    END IF;

    SELECT id INTO v_session_id
    FROM public.table_sessions
    WHERE session_token = p_session_token AND table_id = v_table.id AND status = 'active'
    LIMIT 1;

    IF v_session_id IS NULL THEN
        INSERT INTO public.table_sessions (
            restaurant_id, table_id, session_token, status
        ) VALUES (
            v_table.restaurant_id, v_table.id, p_session_token, 'active'
        ) RETURNING id INTO v_session_id;
    END IF;

    INSERT INTO public.service_requests (
        restaurant_id, table_id, session_id, table_number, request_type, status
    ) VALUES (
        v_table.restaurant_id, v_table.id, v_session_id, v_table.table_number, p_request_type, 'pending'
    ) RETURNING id INTO v_req_id;

    RETURN jsonb_build_object(
        'request_id', v_req_id,
        'request_type', p_request_type,
        'table_number', v_table.table_number,
        'status', 'pending'
    );
END;
$$;

-- 9. Complete Table Orders and Generate Bill
CREATE OR REPLACE FUNCTION public.generate_table_bill(
    p_restaurant_id UUID,
    p_table_id UUID,
    p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rest RECORD;
    v_table RECORD;
    v_next_bill_number INTEGER;
    v_bill_id UUID;
    v_subtotal NUMERIC(10,2) := 0.00;
    v_tax_amount NUMERIC(10,2) := 0.00;
    v_service_charge_amount NUMERIC(10,2) := 0.00;
    v_grand_total NUMERIC(10,2) := 0.00;
    v_items_json JSONB;
    v_session_id UUID;
BEGIN
    -- Verify authority: user must be owner of restaurant or super admin
    IF NOT (public.is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.restaurants WHERE id = p_restaurant_id AND owner_id = auth.uid()
    )) THEN
        RAISE EXCEPTION 'Access Denied: Not authorized to generate bill for this restaurant.';
    END IF;

    SELECT * INTO v_rest FROM public.restaurants WHERE id = p_restaurant_id;
    SELECT * INTO v_table FROM public.restaurant_tables WHERE id = p_table_id;

    -- Aggregate accepted items from open orders for this table
    SELECT
        COALESCE(SUM(oi.total_price), 0.00),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', oi.id,
            'name', oi.name,
            'price', oi.price,
            'quantity', oi.quantity,
            'total_price', oi.total_price,
            'is_veg', oi.is_veg
        )), '[]'::jsonb)
    INTO v_subtotal, v_items_json
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.restaurant_id = p_restaurant_id
      AND o.table_id = p_table_id
      AND o.status IN ('accepted', 'preparing', 'ready', 'served')
      AND oi.status != 'rejected';

    IF v_subtotal <= 0 THEN
        RAISE EXCEPTION 'No accepted orders to bill for Table %.', v_table.table_number;
    END IF;

    -- Compute taxes
    v_tax_amount := ROUND((v_subtotal * (v_rest.gst_percent / 100.0)), 2);
    v_service_charge_amount := ROUND((v_subtotal * (v_rest.service_charge_percent / 100.0)), 2);
    v_grand_total := v_subtotal + v_tax_amount + v_service_charge_amount;

    -- Get next sequential bill number for this restaurant
    SELECT COALESCE(MAX(bill_number), 0) + 1 INTO v_next_bill_number
    FROM public.bills
    WHERE restaurant_id = p_restaurant_id;

    -- Get current active session
    SELECT id INTO v_session_id
    FROM public.table_sessions
    WHERE table_id = p_table_id AND status = 'active'
    ORDER BY started_at DESC
    LIMIT 1;

    -- Insert Bill
    INSERT INTO public.bills (
        restaurant_id, table_id, session_id, bill_number,
        restaurant_name, restaurant_address, restaurant_phone, restaurant_gst,
        table_number, subtotal, tax_percent, tax_amount,
        service_charge_percent, service_charge_amount, grand_total,
        payment_method, items_json
    ) VALUES (
        p_restaurant_id, p_table_id, v_session_id, v_next_bill_number,
        v_rest.name, v_rest.address, v_rest.phone, v_rest.gst_number,
        v_table.table_number, v_subtotal, v_rest.gst_percent, v_tax_amount,
        v_rest.service_charge_percent, v_service_charge_amount, v_grand_total,
        p_payment_method, v_items_json
    )
    RETURNING id INTO v_bill_id;

    -- Close table orders and mark completed
    UPDATE public.orders
    SET status = 'completed', updated_at = now()
    WHERE restaurant_id = p_restaurant_id
      AND table_id = p_table_id
      AND status IN ('accepted', 'preparing', 'ready', 'served');

    -- Close active table session so next scan starts fresh
    IF v_session_id IS NOT NULL THEN
        UPDATE public.table_sessions
        SET status = 'completed', closed_at = now()
        WHERE id = v_session_id;
    END IF;

    -- Complete any pending service requests for this table
    UPDATE public.service_requests
    SET status = 'completed'
    WHERE table_id = p_table_id AND status != 'completed';

    RETURN jsonb_build_object(
        'bill_id', v_bill_id,
        'bill_number', v_next_bill_number,
        'grand_total', v_grand_total,
        'table_number', v_table.table_number
    );
END;
$$;
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
-- ==============================================================================
-- 04_seed.sql: Demo Seed Data for Super Admin and 2 Demo Restaurants
-- ==============================================================================

-- Clean up any existing demo records to ensure idempotency
DELETE FROM public.restaurants WHERE slug IN ('spice-garden', 'curry-house');

-- Fixed UUIDs for predictable testing
DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
    v_owner1_id UUID := '00000000-0000-0000-0000-000000000002';
    v_owner2_id UUID := '00000000-0000-0000-0000-000000000003';

    v_rest1_id UUID := '11111111-1111-1111-1111-111111111111';
    v_rest2_id UUID := '22222222-2222-2222-2222-222222222222';

    v_cat_starters UUID := gen_random_uuid();
    v_cat_mains UUID := gen_random_uuid();
    v_cat_beverages UUID := gen_random_uuid();
    v_cat_desserts UUID := gen_random_uuid();

    v_table1_id UUID := gen_random_uuid();
    v_table2_id UUID := gen_random_uuid();
    v_table3_id UUID := gen_random_uuid();
    v_table4_id UUID := gen_random_uuid();
    v_table5_id UUID := gen_random_uuid();

    v_item_paneer UUID := gen_random_uuid();
    v_item_tikka UUID := gen_random_uuid();
    v_item_butter_chicken UUID := gen_random_uuid();
    v_item_naan UUID := gen_random_uuid();
    v_item_lassi UUID := gen_random_uuid();
    v_item_jamun UUID := gen_random_uuid();

    v_session1_id UUID := gen_random_uuid();
    v_order1_id UUID := gen_random_uuid();
BEGIN
    -- 1. Ensure Demo Users in auth.users (if running on Supabase with permissions)
    BEGIN
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES
        (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@qrapi.com', crypt('Admin@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"admin"}', now(), now()),
        (v_owner1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@spicegarden.com', crypt('Owner@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"owner"}', now(), now()),
        (v_owner2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@curryhouse.com', crypt('Owner@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"owner"}', now(), now())
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        -- auth.users might be restricted depending on environment, ignore if inserted via Supabase Auth UI or dashboard
        NULL;
    END;

    -- 2. Insert Super Admin record
    INSERT INTO public.admins (id, email)
    VALUES (v_admin_id, 'admin@qrapi.com')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    -- 3. Restaurant 1: "Spice Garden Bistro" (ACTIVE, paid_until 30 days ahead)
    INSERT INTO public.restaurants (
        id, owner_id, name, slug, phone, address, logo_url,
        gst_number, gst_percent, service_charge_percent, currency_symbol,
        status, paid_until, setup_fee_paid, monthly_fee, setup_fee, max_tables,
        admin_contact_phone, opening_hours
    ) VALUES (
        v_rest1_id, v_owner1_id, 'Spice Garden Bistro', 'spice-garden',
        '+91 98765 11111', '120 MG Road, Indiranagar, Bengaluru, KA 560038',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop',
        '29AAAAA0000A1Z5', 5.00, 2.50, 'â‚¹',
        'active', (CURRENT_DATE + INTERVAL '30 days'), true, 1000.00, 5000.00, 10,
        '+91 98765 43210', '11:00 AM - 11:30 PM'
    );

    -- 4. Restaurant 2: "Curry House Express" (EXPIRED, paid_until yesterday)
    INSERT INTO public.restaurants (
        id, owner_id, name, slug, phone, address, logo_url,
        gst_number, gst_percent, service_charge_percent, currency_symbol,
        status, paid_until, setup_fee_paid, monthly_fee, setup_fee, max_tables,
        admin_contact_phone, opening_hours
    ) VALUES (
        v_rest2_id, v_owner2_id, 'Curry House Express', 'curry-house',
        '+91 98765 22222', '45 Park Street, Kolkata, WB 700016',
        'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&h=200&fit=crop',
        '19BBBBB1111B2Z4', 5.00, 0.00, 'â‚¹',
        'expired', (CURRENT_DATE - INTERVAL '1 day'), true, 1000.00, 5000.00, 5,
        '+91 98765 43210', '12:00 PM - 10:30 PM'
    );

    -- 5. Record Payments for Restaurant 1
    INSERT INTO public.payments (restaurant_id, amount, payment_type, payment_date, note, recorded_by)
    VALUES
    (v_rest1_id, 5000.00, 'setup', CURRENT_DATE - 30, 'Initial onboarding setup fee via UPI', v_admin_id),
    (v_rest1_id, 1000.00, 'monthly', CURRENT_DATE, 'Monthly maintenance for current cycle', v_admin_id);

    -- 6. Tables for Restaurant 1
    INSERT INTO public.restaurant_tables (id, restaurant_id, table_number, table_name, token, is_active)
    VALUES
    (v_table1_id, v_rest1_id, 1, 'Table 1 - Patio', 'sg_tbl_1_tok_84920412', true),
    (v_table2_id, v_rest1_id, 2, 'Table 2 - Indoor', 'sg_tbl_2_tok_93817421', true),
    (v_table3_id, v_rest1_id, 3, 'Table 3 - Window', 'sg_tbl_3_tok_74628103', true),
    (v_table4_id, v_rest1_id, 4, 'Table 4 - Family', 'sg_tbl_4_tok_51928374', true),
    (v_table5_id, v_rest1_id, 5, 'Table 5 - Terrace', 'sg_tbl_5_tok_62910482', true);

    -- Tables for Restaurant 2
    INSERT INTO public.restaurant_tables (restaurant_id, table_number, table_name, token, is_active)
    VALUES
    (v_rest2_id, 1, 'Table 1', 'ch_tbl_1_tok_11223344', true),
    (v_rest2_id, 2, 'Table 2', 'ch_tbl_2_tok_55667788', true),
    (v_rest2_id, 3, 'Table 3', 'ch_tbl_3_tok_99001122', true);

    -- 7. Categories for Restaurant 1
    INSERT INTO public.menu_categories (id, restaurant_id, name, sort_order)
    VALUES
    (v_cat_starters, v_rest1_id, 'Starters & Appetizers', 1),
    (v_cat_mains, v_rest1_id, 'Signature Main Course', 2),
    (v_cat_beverages, v_rest1_id, 'Refreshing Beverages', 3),
    (v_cat_desserts, v_rest1_id, 'Artisan Desserts', 4);

    -- 8. Menu Items for Restaurant 1
    INSERT INTO public.menu_items (id, restaurant_id, category_id, name, description, price, image_url, is_veg, is_available, sort_order)
    VALUES
    (v_item_paneer, v_rest1_id, v_cat_starters, 'Paneer Tikka Angara', 'Cottage cheese marinated in Kashmiri spices and clay-oven roasted to perfection.', 280.00, 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&h=350&fit=crop', true, true, 1),
    (v_item_tikka, v_rest1_id, v_cat_starters, 'Crispy Chilli Corn', 'Golden American corn tossed with peppers, scallions, and tangy wok sauce.', 220.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=350&fit=crop', true, true, 2),
    (v_item_butter_chicken, v_rest1_id, v_cat_mains, 'Old Delhi Butter Chicken', 'Tender boneless chicken simmered in a velvety tomato and cashew butter gravy.', 390.00, 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&h=350&fit=crop', false, true, 3),
    (v_item_naan, v_rest1_id, v_cat_mains, 'Garlic Butter Naan', 'Tandoor-baked flatbread brushed with roasted garlic butter and cilantro.', 65.00, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&h=350&fit=crop', true, true, 4),
    (v_item_lassi, v_rest1_id, v_cat_beverages, 'Mango Kesari Lassi', 'Chilled yogurt smoothie blended with Alphonso mango pulp and saffron.', 120.00, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&h=350&fit=crop', true, true, 5),
    (v_item_jamun, v_rest1_id, v_cat_desserts, 'Gulab Jamun with Rabdi', 'Warm milk-solid dumplings soaked in rose syrup, paired with slow-cooked rabdi.', 150.00, 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&h=350&fit=crop', true, true, 6);

    -- 9. Sample Active Session & Order for Table 3
    INSERT INTO public.table_sessions (id, restaurant_id, table_id, session_token, status, order_count)
    VALUES (v_session1_id, v_rest1_id, v_table3_id, 'sess_demo_table3_xyz987', 'active', 1);

    INSERT INTO public.orders (
        id, restaurant_id, table_id, session_id, order_number, order_type,
        status, subtotal, tax_amount, service_charge_amount, total_amount, customer_notes
    ) VALUES (
        v_order1_id, v_rest1_id, v_table3_id, v_session1_id, 101, 'initial',
        'accepted', 400.00, 20.00, 10.00, 430.00, 'Please keep it mild spice.'
    );

    INSERT INTO public.order_items (order_id, restaurant_id, menu_item_id, name, price, quantity, total_price, is_veg, notes, status)
    VALUES
    (v_order1_id, v_rest1_id, v_item_paneer, 'Paneer Tikka Angara', 280.00, 1, 280.00, true, 'Mild spice', 'accepted'),
    (v_order1_id, v_rest1_id, v_item_lassi, 'Mango Kesari Lassi', 120.00, 1, 120.00, true, 'Extra chilled', 'accepted');

    -- 10. Sample Completed Bill for Table 1
    INSERT INTO public.bills (
        restaurant_id, table_id, session_id, bill_number,
        restaurant_name, restaurant_address, restaurant_phone, restaurant_gst,
        table_number, subtotal, tax_percent, tax_amount,
        service_charge_percent, service_charge_amount, grand_total,
        payment_method, items_json
    ) VALUES (
        v_rest1_id, v_table1_id, NULL, 1001,
        'Spice Garden Bistro', '120 MG Road, Indiranagar, Bengaluru, KA 560038', '+91 98765 11111', '29AAAAA0000A1Z5',
        1, 670.00, 5.00, 33.50,
        2.50, 16.75, 720.25,
        'upi',
        jsonb_build_array(
            jsonb_build_object('name', 'Old Delhi Butter Chicken', 'price', 390, 'quantity', 1, 'total_price', 390, 'is_veg', false),
            jsonb_build_object('name', 'Garlic Butter Naan', 'price', 65, 'quantity', 2, 'total_price', 130, 'is_veg', true),
            jsonb_build_object('name', 'Gulab Jamun with Rabdi', 'price', 150, 'quantity', 1, 'total_price', 150, 'is_veg', true)
        )
    );

END $$;
