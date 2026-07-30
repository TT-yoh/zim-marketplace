-- Add variations to products table
ALTER TABLE products 
ADD COLUMN colors JSONB DEFAULT '[]'::jsonb,
ADD COLUMN sizes JSONB DEFAULT '[]'::jsonb;

-- Add selected variations to order_items table
ALTER TABLE order_items
ADD COLUMN selected_color TEXT,
ADD COLUMN selected_size TEXT;
