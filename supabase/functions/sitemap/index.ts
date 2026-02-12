import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml',
};

const SITE_URL = 'https://preorder.food';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];

    // Static public pages (exclude auth/private pages for SEO)
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/shops', priority: '0.9', changefreq: 'daily' },
      { loc: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
      { loc: '/terms-conditions', priority: '0.3', changefreq: 'yearly' },
      { loc: '/refund-policy', priority: '0.3', changefreq: 'yearly' },
      { loc: '/contact-support', priority: '0.4', changefreq: 'monthly' },
    ];

    // Fetch approved shops for dynamic pages
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id, updated_at')
      .eq('approval_status', 'approved');

    if (shopsError) {
      console.error('Error fetching shops:', shopsError);
    }

    // Fetch approved canteens for dynamic pages
    const { data: canteens, error: canteensError } = await supabase
      .from('canteens')
      .select('id, updated_at')
      .eq('approval_status', 'approved');

    if (canteensError) {
      console.error('Error fetching canteens:', canteensError);
    }

    // Build sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add static pages
    for (const page of staticPages) {
      sitemap += `  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Add shop detail pages
    if (shops && shops.length > 0) {
      for (const shop of shops) {
        const lastmod = shop.updated_at ? shop.updated_at.split('T')[0] : today;
        sitemap += `  <url>
    <loc>${SITE_URL}/shop/${shop.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    // Note: /student/canteen/* pages excluded from sitemap as they require authentication

    sitemap += `</urlset>`;

    console.log(`Sitemap generated with ${staticPages.length} static pages, ${shops?.length || 0} shops, ${canteens?.length || 0} canteens`);

    return new Response(sitemap, {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`, {
      headers: corsHeaders,
      status: 200,
    });
  }
});
