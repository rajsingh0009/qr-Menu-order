import { NextResponse } from 'next/server';
import { createAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { Store } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      owner_email,
      temporary_password,
      phone,
      setup_fee_paid,
      monthly_fee,
      paid_until,
      max_tables,
    } = body;

    if (!name || !owner_email) {
      return NextResponse.json(
        { error: 'Restaurant name and owner email are required.' },
        { status: 400 }
      );
    }

    const tempPass = temporary_password || 'Owner@' + Math.floor(1000 + Math.random() * 9000);
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    // 1. If Supabase Service Role is configured, use admin auth API
    if (isServiceRoleConfigured) {
      const adminClient = createAdminClient();
      if (!adminClient) {
        throw new Error('Could not initialize Supabase admin client.');
      }

      // Create Auth user
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: owner_email,
        password: tempPass,
        email_confirm: true,
        user_metadata: { role: 'owner', name },
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      // Insert Restaurant record
      const { data: restaurant, error: restError } = await adminClient
        .from('restaurants')
        .insert({
          owner_id: authUser.user.id,
          name,
          slug,
          phone: phone || null,
          status: 'active',
          paid_until: paid_until || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          setup_fee_paid: Boolean(setup_fee_paid),
          monthly_fee: Number(monthly_fee) || 1000,
          setup_fee: 5000,
          max_tables: Number(max_tables) || 20,
        })
        .select()
        .single();

      if (restError) {
        return NextResponse.json({ error: restError.message }, { status: 400 });
      }

      // Record setup fee if paid
      if (setup_fee_paid) {
        await adminClient.from('payments').insert({
          restaurant_id: restaurant.id,
          amount: 5000,
          payment_type: 'setup',
          payment_date: new Date().toISOString().split('T')[0],
          note: 'One-time registration setup fee',
        });
      }

      // Insert 3 initial tables
      const initialTables = [1, 2, 3].map((num) => ({
        restaurant_id: restaurant.id,
        table_number: num,
        table_name: `Table ${num}`,
        token: `${slug}_t${num}_${Math.random().toString(36).substring(2, 12)}`,
        is_active: true,
      }));
      await adminClient.from('restaurant_tables').insert(initialTables);

      return NextResponse.json({
        success: true,
        restaurant,
        credentials: {
          email: owner_email,
          temporary_password: tempPass,
        },
      });
    }

    // 2. Demo / Fallback Store execution
    const result = Store.createRestaurant({
      name,
      owner_email,
      temporary_password: tempPass,
      phone: phone || '+91 98765 00000',
      setup_fee_paid: Boolean(setup_fee_paid),
      monthly_fee: Number(monthly_fee) || 1000,
      paid_until: paid_until || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      max_tables: Number(max_tables) || 20,
    });

    return NextResponse.json({
      success: true,
      restaurant: result.restaurant,
      credentials: {
        email: owner_email,
        temporary_password: tempPass,
      },
    });
  } catch (error: any) {
    console.error('Create restaurant error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
