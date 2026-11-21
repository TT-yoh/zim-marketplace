-- 20231010000045_industrial_categories.sql
-- The live catalogue is an industrial / mining supplier (pipes, bearings, generators, welding
-- gear, safety wear), which the original consumer categories didn't cover, so every product
-- sat in "Uncategorized". Add matching categories; products were then assigned by keyword
-- (a one-off data update, documented in docs/DATA_FIXES.md).

INSERT INTO public.categories (name, icon, sub_categories, display_order) VALUES
    ('Tools & Equipment',   '🛠️', ARRAY['Power Tools', 'Hand Tools', 'Welding', 'Compressors', 'Measuring'], 1),
    ('Plumbing & Pipes',    '🚰', ARRAY['PVC & HDPE Pipes', 'Fittings', 'Valves', 'Hoses & Couplings'], 2),
    ('Electrical & Power',  '🔌', ARRAY['Generators', 'Cables & Wire', 'Switchgear', 'Motors'], 3),
    ('Industrial & Mining', '⚙️', ARRAY['Bearings', 'Pulleys & Belts', 'Conveyors', 'Crushers & Mills', 'Fasteners', 'Steel'], 4),
    ('Safety & Workwear',   '🦺', ARRAY['Boots', 'Workwear', 'Eye & Head Protection', 'Gloves'], 5)
ON CONFLICT (name) DO UPDATE SET
    icon = EXCLUDED.icon,
    sub_categories = EXCLUDED.sub_categories,
    display_order = EXCLUDED.display_order;
