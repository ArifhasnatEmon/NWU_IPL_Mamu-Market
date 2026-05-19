// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// @ts-ignore - Suppress VS Code warning for Deno
declare const Deno: any;

const SSLCOMMERZ_STORE_ID = Deno.env.get('SSLCOMMERZ_STORE_ID') || '';
const SSLCOMMERZ_STORE_PASSWD = Deno.env.get('SSLCOMMERZ_STORE_PASSWD') || '';
const SSLCOMMERZ_IS_SANDBOX = Deno.env.get('SSLCOMMERZ_IS_SANDBOX') !== 'false';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order_id, amount, customer_name, customer_email, customer_phone, customer_address, items } = await req.json();

    if (!order_id || !amount || !customer_name || !customer_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: order_id, amount, customer_name, customer_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = SSLCOMMERZ_IS_SANDBOX
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';

    const callbackBase = `${SUPABASE_URL}/functions/v1/payment-callback`;

    const formData = new URLSearchParams({
      store_id: SSLCOMMERZ_STORE_ID,
      store_passwd: SSLCOMMERZ_STORE_PASSWD,
      total_amount: String(amount),
      currency: 'BDT',
      tran_id: order_id,
      success_url: callbackBase,
      fail_url: callbackBase,
      cancel_url: callbackBase,
      ipn_url: callbackBase,
      cus_name: customer_name,
      cus_email: customer_email,
      cus_phone: customer_phone || '01700000000',
      cus_add1: customer_address || 'Dhaka',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: items?.map((i: any) => i.name).join(', ') || 'Mamu Market Order',
      product_category: 'General',
      product_profile: 'general',
    });

    const sslResponse = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const sslData = await sslResponse.json();

    if (sslData.status !== 'SUCCESS') {
      throw new Error(sslData.failedreason || 'SSLCommerz session creation failed');
    }

    return new Response(
      JSON.stringify({
        success: true,
        gatewayUrl: sslData.GatewayPageURL,
        sessionKey: sslData.sessionkey,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
