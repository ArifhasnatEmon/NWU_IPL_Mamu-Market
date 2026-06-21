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
    const body = await req.json().catch(() => ({}));
    const { product_id } = body;

    if (product_id) {
      // Single product update
      const result = await recalcProduct(supabaseAdmin, product_id);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Bulk: recalculate ALL products
    const { data: allProducts, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, vendor_id');

    if (prodErr) throw new Error(`Failed to fetch products: ${prodErr.message}`);

    const results: any[] = [];
    const vendorIds = new Set<string>();

    for (const p of (allProducts || [])) {
      const result = await recalcProduct(supabaseAdmin, p.id, false); // skip vendor update here
      if (p.vendor_id) vendorIds.add(p.vendor_id);
      results.push({ id: p.id, ...result });
    }

    // Now update all unique vendors
    for (const vid of vendorIds) {
      await recalcVendor(supabaseAdmin, vid);
    }

    return new Response(
      JSON.stringify({ success: true, updated: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('update-product-rating error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function recalcProduct(supabaseAdmin: any, productId: string, updateVendor = true) {
  // Get the product's vendor_id
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('vendor_id')
    .eq('id', productId)
    .single();

  const { data: reviews, error: reviewsError } = await supabaseAdmin
    .from('reviews')
    .select('rating')
    .eq('product_id', productId);

  if (reviewsError) throw new Error(`Reviews fetch failed: ${reviewsError.message}`);

  const allReviews = reviews || [];
  const totalCount = allReviews.length;
  const rated = allReviews.filter((r: any) => {
    const n = Number(r.rating);
    return !isNaN(n) && n > 0;
  });
  const ratingSum = rated.reduce((sum: number, r: any) => sum + Number(r.rating), 0);
  const avgRating = rated.length > 0
    ? Math.round((ratingSum / rated.length) * 10) / 10
    : 0;

  const { error: updateError } = await supabaseAdmin
    .from('products')
    .update({ rating: avgRating, reviews_count: totalCount })
    .eq('id', productId);

  if (updateError) throw new Error(`Product update failed: ${updateError.message}`);

  if (updateVendor && product?.vendor_id) {
    await recalcVendor(supabaseAdmin, product.vendor_id);
  }

  return { rating: avgRating, reviews_count: totalCount };
}

async function recalcVendor(supabaseAdmin: any, vendorId: string) {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('rating')
    .eq('vendor_id', vendorId);
    
  if (products) {
    const ratedProducts = products.filter((p: any) => Number(p.rating) > 0);
    const sum = ratedProducts.reduce((s: number, p: any) => s + Number(p.rating), 0);
    const avg = ratedProducts.length > 0 ? Math.round((sum / ratedProducts.length) * 10) / 10 : 0;
    
    await supabaseAdmin
      .from('profiles')
      .update({ rating: avg })
      .eq('id', vendorId);
  }
}
