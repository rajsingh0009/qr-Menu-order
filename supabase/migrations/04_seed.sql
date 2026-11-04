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
        '29AAAAA0000A1Z5', 5.00, 2.50, '₹',
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
        '19BBBBB1111B2Z4', 5.00, 0.00, '₹',
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
