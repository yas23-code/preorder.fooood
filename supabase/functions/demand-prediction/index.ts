import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the vendor's canteen
    const { data: canteen, error: canteenError } = await supabase
      .from('canteens')
      .select('id, name')
      .eq('vendor_id', user.id)
      .maybeSingle();

    if (canteenError || !canteen) {
      console.error('Canteen fetch error:', canteenError);
      return new Response(JSON.stringify({ error: 'No canteen found for this vendor' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse query params for day and hour (optional overrides)
    const url = new URL(req.url);
    const now = new Date();
    // Use IST timezone for day/hour calculation
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    
    const targetDay = parseInt(url.searchParams.get('day') ?? String(istNow.getUTCDay()));
    const targetHour = parseInt(url.searchParams.get('hour') ?? String(istNow.getUTCHours()));

    console.log(`Predicting demand for canteen: ${canteen.name}, day: ${targetDay}, hour: ${targetHour}`);

    // Fetch completed, paid orders from the last 7 days for this canteen
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, created_at, status, payment_status')
      .eq('canteen_id', canteen.id)
      .eq('status', 'completed')
      .eq('payment_status', 'paid')
      .gte('created_at', sevenDaysAgo);

    if (ordersError) {
      console.error('Orders fetch error:', ordersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch orders' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${orders?.length || 0} completed orders in last 7 days`);

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ 
        predictions: [],
        targetDay,
        targetHour,
        message: 'No historical data available for predictions'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter orders matching the target day and hour (in IST)
    const matchingOrderIds = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      const istOrderDate = new Date(orderDate.getTime() + istOffset);
      const orderDay = istOrderDate.getUTCDay();
      const orderHour = istOrderDate.getUTCHours();
      return orderDay === targetDay && orderHour === targetHour;
    }).map(o => o.id);

    console.log(`${matchingOrderIds.length} orders match day=${targetDay}, hour=${targetHour}`);

    if (matchingOrderIds.length === 0) {
      // Fallback: try same hour any day for broader prediction
      const sameHourOrderIds = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        const istOrderDate = new Date(orderDate.getTime() + istOffset);
        return istOrderDate.getUTCHours() === targetHour;
      }).map(o => o.id);

      if (sameHourOrderIds.length === 0) {
        return new Response(JSON.stringify({
          predictions: [],
          targetDay,
          targetHour,
          message: 'No prediction available for this time slot'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use same-hour data with a note
      console.log(`Using ${sameHourOrderIds.length} same-hour orders as fallback`);
      
      // Fetch order items for matching orders (batch in chunks if needed)
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('menu_item_id, name, quantity')
        .in('order_id', sameHourOrderIds.slice(0, 100));

      if (itemsError) {
        console.error('Order items fetch error:', itemsError);
        return new Response(JSON.stringify({ error: 'Failed to fetch order items' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Count unique days represented
      const uniqueDays = new Set(
        orders.filter(o => {
          const d = new Date(new Date(o.created_at).getTime() + istOffset);
          return d.getUTCHours() === targetHour;
        }).map(o => {
          const d = new Date(new Date(o.created_at).getTime() + istOffset);
          return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        })
      ).size;

      const predictions = calculatePredictions(orderItems || [], uniqueDays);

      return new Response(JSON.stringify({
        predictions,
        targetDay,
        targetHour,
        dataSource: 'same_hour_all_days',
        daysAnalyzed: uniqueDays,
        message: `Based on ${uniqueDays} day(s) of data at this hour`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch order items for matching orders
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('menu_item_id, name, quantity')
      .in('order_id', matchingOrderIds.slice(0, 100));

    if (itemsError) {
      console.error('Order items fetch error:', itemsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch order items' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Count unique days with matching orders
    const uniqueDays = new Set(
      orders.filter(o => matchingOrderIds.includes(o.id)).map(o => {
        const d = new Date(new Date(o.created_at).getTime() + istOffset);
        return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
      })
    ).size;

    const predictions = calculatePredictions(orderItems || [], uniqueDays);

    console.log(`Generated ${predictions.length} predictions from ${uniqueDays} unique days`);

    return new Response(JSON.stringify({
      predictions,
      targetDay,
      targetHour,
      dataSource: 'exact_day_hour',
      daysAnalyzed: uniqueDays,
      message: `Based on ${uniqueDays} ${getDayName(targetDay)}(s) of data`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Demand prediction error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface OrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
}

interface Prediction {
  itemName: string;
  menuItemId: string;
  predictedQuantity: number;
  totalOrdered: number;
  daysWithData: number;
}

function calculatePredictions(items: OrderItem[], uniqueDays: number): Prediction[] {
  if (!items.length || uniqueDays === 0) return [];

  // Group by menu item and sum quantities
  const itemMap = new Map<string, { name: string; totalQuantity: number }>();

  for (const item of items) {
    const existing = itemMap.get(item.menu_item_id);
    if (existing) {
      existing.totalQuantity += item.quantity;
    } else {
      itemMap.set(item.menu_item_id, {
        name: item.name,
        totalQuantity: item.quantity,
      });
    }
  }

  // Calculate average per day and sort by predicted quantity
  const predictions: Prediction[] = [];
  for (const [menuItemId, data] of itemMap) {
    predictions.push({
      itemName: data.name,
      menuItemId,
      predictedQuantity: Math.round(data.totalQuantity / uniqueDays),
      totalOrdered: data.totalQuantity,
      daysWithData: uniqueDays,
    });
  }

  // Sort by predicted quantity descending
  predictions.sort((a, b) => b.predictedQuantity - a.predictedQuantity);

  return predictions;
}

function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] || 'Unknown';
}
