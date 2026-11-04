import { NextResponse } from 'next/server';
import { createAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { Store } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, restaurant_id, payload } = body;

    if (!restaurant_id || !action) {
      return NextResponse.json({ error: 'restaurant_id and action are required.' }, { status: 400 });
    }

    if (isServiceRoleConfigured) {
      const adminClient = createAdminClient();
      if (!adminClient) throw new Error('Supabase admin client unavailable.');

      if (action === 'mark_monthly_payment') {
        const { data: rest, error: fetchErr } = await adminClient
          .from('restaurants')
          .select('*')
          .eq('id', restaurant_id)
          .single();

        if (fetchErr || !rest) throw new Error('Restaurant not found');

        const today = new Date().toISOString().split('T')[0];
        const base = rest.paid_until > today ? new Date(rest.paid_until) : new Date();
        base.setDate(base.getDate() + 30);
        const newPaidUntil = base.toISOString().split('T')[0];

        const { data: updated, error: updateErr } = await adminClient
          .from('restaurants')
          .update({
            paid_until: newPaidUntil,
            status: 'active',
          })
          .eq('id', restaurant_id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        await adminClient.from('payments').insert({
          restaurant_id,
          amount: rest.monthly_fee,
          payment_type: 'monthly',
          payment_date: today,
          note: payload?.note || `Monthly maintenance paid (valid until ${newPaidUntil})`,
        });

        return NextResponse.json({ success: true, restaurant: updated });
      }

      if (action === 'mark_setup_fee_paid') {
        const { data: rest } = await adminClient
          .from('restaurants')
          .select('*')
          .eq('id', restaurant_id)
          .single();

        const { data: updated, error: updateErr } = await adminClient
          .from('restaurants')
          .update({ setup_fee_paid: true })
          .eq('id', restaurant_id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        await adminClient.from('payments').insert({
          restaurant_id,
          amount: rest?.setup_fee || 5000,
          payment_type: 'setup',
          payment_date: new Date().toISOString().split('T')[0],
          note: payload?.note || 'One-time registration setup fee payment',
        });

        return NextResponse.json({ success: true, restaurant: updated });
      }

      if (action === 'suspend') {
        const { data: updated, error } = await adminClient
          .from('restaurants')
          .update({ status: 'suspended' })
          .eq('id', restaurant_id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, restaurant: updated });
      }

      if (action === 'reactivate') {
        const { data: updated, error } = await adminClient
          .from('restaurants')
          .update({ status: 'active' })
          .eq('id', restaurant_id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, restaurant: updated });
      }

      if (action === 'edit_fees') {
        const { data: updated, error } = await adminClient
          .from('restaurants')
          .update({
            monthly_fee: Number(payload.monthly_fee),
            max_tables: Number(payload.max_tables),
          })
          .eq('id', restaurant_id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, restaurant: updated });
      }

      if (action === 'reset_password') {
        const { data: rest } = await adminClient
          .from('restaurants')
          .select('owner_id')
          .eq('id', restaurant_id)
          .single();

        const newPass = payload?.password || 'Reset@' + Math.floor(1000 + Math.random() * 9000);
        if (rest?.owner_id) {
          await adminClient.auth.admin.updateUserById(rest.owner_id, {
            password: newPass,
          });
        }

        return NextResponse.json({ success: true, new_password: newPass });
      }

      if (action === 'delete') {
        const { data: rest } = await adminClient
          .from('restaurants')
          .select('owner_id')
          .eq('id', restaurant_id)
          .single();

        await adminClient.from('restaurants').delete().eq('id', restaurant_id);
        if (rest?.owner_id) {
          await adminClient.auth.admin.deleteUser(rest.owner_id);
        }

        return NextResponse.json({ success: true });
      }
    }

    // Demo Store fallback
    if (action === 'mark_monthly_payment') {
      const updated = Store.markMonthlyPaymentReceived(restaurant_id, payload?.note);
      return NextResponse.json({ success: true, restaurant: updated });
    }

    if (action === 'mark_setup_fee_paid') {
      const updated = Store.markSetupFeePaid(restaurant_id, payload?.note);
      return NextResponse.json({ success: true, restaurant: updated });
    }

    if (action === 'suspend') {
      const updated = Store.updateRestaurantAsAdmin(restaurant_id, { status: 'suspended' });
      return NextResponse.json({ success: true, restaurant: updated });
    }

    if (action === 'reactivate') {
      const updated = Store.updateRestaurantAsAdmin(restaurant_id, { status: 'active' });
      return NextResponse.json({ success: true, restaurant: updated });
    }

    if (action === 'edit_fees') {
      const updated = Store.updateRestaurantAsAdmin(restaurant_id, {
        monthly_fee: Number(payload.monthly_fee),
        max_tables: Number(payload.max_tables),
      });
      return NextResponse.json({ success: true, restaurant: updated });
    }

    if (action === 'reset_password') {
      const newPass = payload?.password || 'Reset@' + Math.floor(1000 + Math.random() * 9000);
      return NextResponse.json({ success: true, new_password: newPass });
    }

    if (action === 'delete') {
      Store.deleteRestaurant(restaurant_id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin action error:', error);
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 500 });
  }
}
