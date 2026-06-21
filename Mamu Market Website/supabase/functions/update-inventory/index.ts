// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// @ts-ignore
declare const Deno: any;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { items, action } = await req.json();

    if (!items || !Array.isArray(items)) {
      throw new Error('Items array is required');
    }

    const results = [];

    for (const item of items) {
      const { product_id, quantity } = item;
      
      if (!product_id || !quantity) continue;

      // Fetch current stock
      const { data: product, error: fetchErr } = await supabaseAdmin
        .from('products')
        .select('units, stock')
        .eq('id', product_id)
        .single();

      if (fetchErr) continue;

      const currentUnits = product.units || 0;
      let newUnits = currentUnits;

      if (action === 'decrement') {
        newUnits = Math.max(0, currentUnits - quantity);
      } else if (action === 'increment') {
        newUnits = currentUnits + quantity;
      }

      const { error: updateErr } = await supabaseAdmin
        .from('products')
        .update({ units: newUnits })
        .eq('id', product_id);

      if (!updateErr) {
        results.push({ product_id, newUnits });
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('update-inventory error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
