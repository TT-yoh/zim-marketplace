import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qelpgmrbohsdkwvcsnov.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlbHBnbXJib2hzZGt3dmNzbm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTA4MTMsImV4cCI6MjA5NjU4NjgxM30.6KDATpzmt1_3JmaUy1GGmWxTx1My8mJZYH2unn9Lmuo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
    // get a shop id
    const { data: shops } = await supabase.from('vendor_profiles').select('id').limit(1);
    const shopId = shops[0].id;
    
    console.log("Found shop id:", shopId);

    const { data, error } = await supabase
        .from('products')
        .insert([{
            shop_id: shopId,
            item_no: 'TEST-COLOR-1',
            title: 'Color Variant Shirt',
            unit: 'EA',
            price_excl_vat_cents: 1000,
            price_incl_vat_cents: 1200,
            price_cents: 1200,
            description: 'Test shirt',
            stock_quantity: 5,
            category: 'Fashion',
            condition: 'New',
            colors: ['Red', 'Blue'],
            sizes: ['M', 'L']
        }])
        .select();

    if (error) {
        console.error("Error inserting:", error);
    } else {
        console.log("Successfully inserted product with variations:", data);
    }
}

testInsert();
