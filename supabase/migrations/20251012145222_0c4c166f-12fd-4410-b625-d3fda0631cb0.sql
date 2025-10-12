-- Create attribute tables (IF NOT EXISTS handles if they already exist)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.genders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all attribute tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;

DROP POLICY IF EXISTS "Anyone can view brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can insert brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can update brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can delete brands" ON public.brands;

DROP POLICY IF EXISTS "Anyone can view sizes" ON public.sizes;
DROP POLICY IF EXISTS "Admins can insert sizes" ON public.sizes;
DROP POLICY IF EXISTS "Admins can update sizes" ON public.sizes;
DROP POLICY IF EXISTS "Admins can delete sizes" ON public.sizes;

DROP POLICY IF EXISTS "Anyone can view colors" ON public.colors;
DROP POLICY IF EXISTS "Admins can insert colors" ON public.colors;
DROP POLICY IF EXISTS "Admins can update colors" ON public.colors;
DROP POLICY IF EXISTS "Admins can delete colors" ON public.colors;

DROP POLICY IF EXISTS "Anyone can view genders" ON public.genders;
DROP POLICY IF EXISTS "Admins can insert genders" ON public.genders;
DROP POLICY IF EXISTS "Admins can update genders" ON public.genders;
DROP POLICY IF EXISTS "Admins can delete genders" ON public.genders;

DROP POLICY IF EXISTS "Anyone can view seasons" ON public.seasons;
DROP POLICY IF EXISTS "Admins can insert seasons" ON public.seasons;
DROP POLICY IF EXISTS "Admins can update seasons" ON public.seasons;
DROP POLICY IF EXISTS "Admins can delete seasons" ON public.seasons;

DROP POLICY IF EXISTS "Anyone can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can delete suppliers" ON public.suppliers;

DROP POLICY IF EXISTS "Anyone can view locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can insert locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can update locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can delete locations" ON public.locations;

DROP POLICY IF EXISTS "Anyone can view units" ON public.units;
DROP POLICY IF EXISTS "Admins can insert units" ON public.units;
DROP POLICY IF EXISTS "Admins can update units" ON public.units;
DROP POLICY IF EXISTS "Admins can delete units" ON public.units;

-- RLS policies for attribute tables (everyone can read, only admins can modify)
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admins can insert brands" ON public.brands FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update brands" ON public.brands FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete brands" ON public.brands FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view sizes" ON public.sizes FOR SELECT USING (true);
CREATE POLICY "Admins can insert sizes" ON public.sizes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update sizes" ON public.sizes FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete sizes" ON public.sizes FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view colors" ON public.colors FOR SELECT USING (true);
CREATE POLICY "Admins can insert colors" ON public.colors FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update colors" ON public.colors FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete colors" ON public.colors FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view genders" ON public.genders FOR SELECT USING (true);
CREATE POLICY "Admins can insert genders" ON public.genders FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update genders" ON public.genders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete genders" ON public.genders FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Admins can insert seasons" ON public.seasons FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update seasons" ON public.seasons FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete seasons" ON public.seasons FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Admins can insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update suppliers" ON public.suppliers FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete suppliers" ON public.suppliers FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view locations" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Admins can insert locations" ON public.locations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update locations" ON public.locations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete locations" ON public.locations FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view units" ON public.units FOR SELECT USING (true);
CREATE POLICY "Admins can insert units" ON public.units FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update units" ON public.units FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete units" ON public.units FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Update items table RLS policies to restrict modifications to admins
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.items;
DROP POLICY IF EXISTS "Anyone can view items" ON public.items;
DROP POLICY IF EXISTS "Admins can insert items" ON public.items;
DROP POLICY IF EXISTS "Admins can update items" ON public.items;
DROP POLICY IF EXISTS "Admins can delete items" ON public.items;

CREATE POLICY "Anyone can view items" ON public.items FOR SELECT USING (true);
CREATE POLICY "Admins can insert items" ON public.items FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update items" ON public.items FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete items" ON public.items FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Insert some default values
INSERT INTO public.units (name) VALUES ('pcs'), ('pairs'), ('sets') ON CONFLICT DO NOTHING;
INSERT INTO public.genders (name) VALUES ('Men'), ('Women'), ('Unisex'), ('Kids') ON CONFLICT DO NOTHING;
INSERT INTO public.seasons (name) VALUES ('Spring/Summer'), ('Fall/Winter'), ('All Season') ON CONFLICT DO NOTHING;