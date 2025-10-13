-- Populate attribute tables with sample data from template structure

-- Insert Brands
INSERT INTO public.brands (name) VALUES
  ('Nike'),
  ('Adidas'),
  ('Puma'),
  ('Reebok'),
  ('New Balance')
ON CONFLICT DO NOTHING;

-- Insert Categories
INSERT INTO public.categories (name) VALUES
  ('Footwear'),
  ('Apparel'),
  ('Accessories'),
  ('Equipment'),
  ('Sportswear')
ON CONFLICT DO NOTHING;

-- Insert Suppliers
INSERT INTO public.suppliers (name) VALUES
  ('Global Sports Inc'),
  ('Athletic Gear Co'),
  ('Premier Distributors'),
  ('Sports Wholesale Ltd'),
  ('Direct Imports')
ON CONFLICT DO NOTHING;

-- Insert Departments
INSERT INTO public.departments (name) VALUES
  ('Men'),
  ('Women'),
  ('Kids'),
  ('Unisex')
ON CONFLICT DO NOTHING;

-- Insert Main Groups
INSERT INTO public.main_groups (name) VALUES
  ('Running'),
  ('Training'),
  ('Basketball'),
  ('Football'),
  ('Casual')
ON CONFLICT DO NOTHING;

-- Insert Origins
INSERT INTO public.origins (name) VALUES
  ('USA'),
  ('China'),
  ('Vietnam'),
  ('Indonesia'),
  ('Thailand')
ON CONFLICT DO NOTHING;

-- Insert Seasons
INSERT INTO public.seasons (name) VALUES
  ('Spring/Summer'),
  ('Fall/Winter'),
  ('All Season')
ON CONFLICT DO NOTHING;

-- Insert Sizes
INSERT INTO public.sizes (name) VALUES
  ('XS'),
  ('S'),
  ('M'),
  ('L'),
  ('XL'),
  ('XXL'),
  ('6'),
  ('7'),
  ('8'),
  ('9'),
  ('10'),
  ('11'),
  ('12')
ON CONFLICT DO NOTHING;

-- Insert Colors
INSERT INTO public.colors (name) VALUES
  ('Black'),
  ('White'),
  ('Red'),
  ('Blue'),
  ('Green'),
  ('Yellow'),
  ('Grey'),
  ('Navy'),
  ('Pink')
ON CONFLICT DO NOTHING;

-- Insert Genders
INSERT INTO public.genders (name) VALUES
  ('Men'),
  ('Women'),
  ('Unisex'),
  ('Kids')
ON CONFLICT DO NOTHING;

-- Insert Themes
INSERT INTO public.themes (name) VALUES
  ('Classic'),
  ('Modern'),
  ('Retro'),
  ('Sport Performance'),
  ('Lifestyle')
ON CONFLICT DO NOTHING;

-- Insert Locations
INSERT INTO public.locations (name) VALUES
  ('Warehouse A - Section 1'),
  ('Warehouse A - Section 2'),
  ('Warehouse B - Section 1'),
  ('Store Display'),
  ('Back Room')
ON CONFLICT DO NOTHING;

-- Insert Units
INSERT INTO public.units (name) VALUES
  ('pcs'),
  ('pairs'),
  ('sets'),
  ('boxes')
ON CONFLICT DO NOTHING;