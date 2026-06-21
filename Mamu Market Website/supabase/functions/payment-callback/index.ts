// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// @ts-ignore - Suppress VS Code warning for Deno
declare const Deno: any;

const SSLCOMMERZ_STORE_ID = Deno.env.get('SSLCOMMERZ_STORE_ID') || '';
const SSLCOMMERZ_STORE_PASSWD = Deno.env.get('SSLCOMMERZ_STORE_PASSWD') || '';
const SSLCOMMERZ_IS_SANDBOX = Deno.env.get('SSLCOMMERZ_IS_SANDBOX') !== 'false';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';

serve(async (req) => {
  try {
    const formData = await req.formData();
    const status = formData.get('status') as string;
    const tran_id = formData.get('tran_id') as string;
    const val_id = formData.get('val_id') as string;
    const amount = formData.get('amount') as string;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (status === 'VALID' || status === 'VALIDATED') {
      // Validate with SSLCommerz
      const baseUrl = SSLCOMMERZ_IS_SANDBOX
        ? 'https://sandbox.sslcommerz.com'
        : 'https://securepay.sslcommerz.com';

      const validationUrl = `${baseUrl}/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${SSLCOMMERZ_STORE_ID}&store_passwd=${SSLCOMMERZ_STORE_PASSWD}&format=json`;

      const valResponse = await fetch(validationUrl);
      const valData = await valResponse.json();

      if (valData.status === 'VALID' || valData.status === 'VALIDATED') {
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'processing',
          })
          .eq('parent_order_id', tran_id);

        // Delete locks on success (units are already deducted)
        await supabase
          .from('inventory_locks')
          .delete()
          .eq('order_id', tran_id);

        // Fetch the order to get the items
        const { data: orderData } = await supabase
          .from('orders')
          .select('items')
          .eq('parent_order_id', tran_id)
          .single();

        if (orderData && orderData.items) {
          const items = typeof orderData.items === 'string' ? JSON.parse(orderData.items) : orderData.items;
          // Decrement stock for each item
          for (const item of items) {
            if (item.id && item.quantity) {
              const { data: product } = await supabase
                .from('products')
                .select('units')
                .eq('id', item.id)
                .single();
              
              if (product) {
                const newUnits = Math.max(0, (product.units || 0) - item.quantity);
                await supabase
                  .from('products')
                  .update({ units: newUnits })
                  .eq('id', item.id);
              }
            }
          }
        }

        return Response.redirect(`${FRONTEND_URL}/payment/success?order_id=${tran_id}`, 303);
      }
    }

    if (status === 'FAILED') {
      await supabase
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('parent_order_id', tran_id);

      // Release locks and restore units on failure
      await supabase.rpc('release_inventory_locks', { p_order_id: tran_id });

      return Response.redirect(`${FRONTEND_URL}/payment/fail?order_id=${tran_id}`, 303);
    }

    if (status === 'CANCELLED') {
      // Release locks and restore units on cancellation
      await supabase.rpc('release_inventory_locks', { p_order_id: tran_id });
      return Response.redirect(`${FRONTEND_URL}/payment/cancel?order_id=${tran_id}`, 303);
    }

    return Response.redirect(`${FRONTEND_URL}/payment/fail`, 303);
  } catch (error) {
    console.error('Payment callback error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
