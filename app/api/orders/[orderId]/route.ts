import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient'; // Adjust the import path if necessary
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  // Get the orderId from the pathname
  const orderId = req.nextUrl.pathname.split('/').pop();

  // Type checking to ensure orderId is a string and not undefined
  if (!orderId || typeof orderId !== 'string') {
    return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
  }

  console.log(`Fetching details for orderId: ${orderId}`);

  try {
    const { data, error } = await supabase
      .from('order_rec')
      .select('*')
      .eq('order_id', orderId)
      .single();  // Assuming you want to fetch a single order record based on orderId

    if (error) {
      console.error('Error fetching order details:', error.message);
      return NextResponse.json({ error: 'Error fetching order details' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Failed to fetch order details:', error.message);
    return NextResponse.json({ error: 'Failed to fetch order details' }, { status: 500 });
  }
  
}