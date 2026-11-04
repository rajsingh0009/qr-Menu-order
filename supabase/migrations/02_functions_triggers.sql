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
