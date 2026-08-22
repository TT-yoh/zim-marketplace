-- 20231010000024_add_categories_table.sql
-- Enables dynamic Category & Subcategory Management for Platform Admins.

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    icon text DEFAULT '🏷️' NOT NULL,
    sub_categories text[] DEFAULT '{}' NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 1. Read: Public for all buyers and vendors
DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
CREATE POLICY "Public Read Categories" ON public.categories
    FOR SELECT USING (true);

-- 2. Insert: Superadmins only
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories" ON public.categories
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()));

-- 3. Update: Superadmins only
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories" ON public.categories
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()));

-- 4. Delete: Superadmins only
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories" ON public.categories
    FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()));

-- Seed default commercial categories
INSERT INTO public.categories (name, icon, sub_categories, display_order)
VALUES 
    ('Electronics', '📱', ARRAY['Phones & Tablets', 'Laptops & Computers', 'Audio & Speakers', 'TV & Home Entertainment', 'Accessories'], 1),
    ('Fashion', '👕', ARRAY['Men''s Wear', 'Women''s Wear', 'Footwear', 'Watches & Jewelry', 'Accessories'], 2),
    ('Auto Parts', '🚗', ARRAY['Batteries & Electrical', 'Engine Parts', 'Tires & Wheels', 'Brakes & Suspension', 'Accessories'], 3),
    ('Solar & Energy', '⚡', ARRAY['Solar Panels', 'Inverters & Batteries', 'Solar Geysers', 'Backup Lighting', 'Installation Kits'], 4),
    ('Agriculture', '🌾', ARRAY['Seeds & Fertilizers', 'Irrigation & Pumps', 'Livestock Equipment', 'Farm Implements', 'Agro-Chemicals'], 5),
    ('Home & Hardware', '🏡', ARRAY['Furniture', 'Kitchen & Appliances', 'Building Materials & Tools', 'Decor & Lighting', 'Garden & Outdoor'], 6),
    ('Vehicles', '🚙', ARRAY['Cars & Sedans', 'Trucks & Commercial', 'Motorcycles', 'Bicycles & Scooters', 'Spare Vehicles'], 7),
    ('Beauty & Health', '💄', ARRAY['Skincare & Cosmetics', 'Hair Care', 'Fragrances & Body', 'Health & Wellness'], 8),
    ('Other', '📦', ARRAY['General Supplies', 'Services & Labor', 'Miscellaneous'], 9)
ON CONFLICT (name) DO UPDATE SET
    icon = EXCLUDED.icon,
    sub_categories = EXCLUDED.sub_categories,
    display_order = EXCLUDED.display_order;
