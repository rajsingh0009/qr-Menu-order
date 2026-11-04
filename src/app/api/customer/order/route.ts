import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Store } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableToken, sessionToken, items, notes, orderType, deviceFingerprint } = body;

    if (!tableToken || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid order request: Table token and items are required.' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured) {
      const supabase = createClient();
      // Call security definer stored procedure
      const { data, error } = await supabase.rpc('customer_place_order', {
        p_table_token: tableToken,
        p_session_token: sessionToken || 'sess_' + Math.random().toString(36).substring(2, 10),
        p_items: items.map((it: any) => ({
          menu_item_id: it.menuItemId,
          quantity: Math.min(Math.max(Number(it.quantity) || 1, 1), 20),
          notes: it.notes || '',
        })),
        p_customer_notes: notes || null,
        p_order_type: orderType || 'initial',
        p_device_fingerprint: deviceFingerprint || null,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, order: data });
    }

    // Demo store fallback
    const order = Store.placeOrder({
      tableToken,
      sessionToken: sessionToken || 'sess_' + Math.random().toString(36).substring(2, 10),
      items,
      notes,
      orderType: orderType || 'initial',
      deviceFingerprint,
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('Customer place order error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to place order.' },
      { status: 400 }
    );
  }
}
