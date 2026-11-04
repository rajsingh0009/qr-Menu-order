import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Store } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableToken, sessionToken, requestType } = body;

    if (!tableToken || !requestType) {
      return NextResponse.json({ error: 'Missing tableToken or requestType' }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('customer_call_service', {
        p_table_token: tableToken,
        p_session_token: sessionToken || 'sess_' + Math.random().toString(36).substring(2, 10),
        p_request_type: requestType,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, serviceRequest: data });
    }

    const serviceRequest = Store.callService(
      tableToken,
      sessionToken || 'sess_' + Math.random().toString(36).substring(2, 10),
      requestType
    );

    return NextResponse.json({ success: true, serviceRequest });
  } catch (error: any) {
    console.error('Customer call service error:', error);
    return NextResponse.json({ error: error.message || 'Service request failed' }, { status: 400 });
  }
}
