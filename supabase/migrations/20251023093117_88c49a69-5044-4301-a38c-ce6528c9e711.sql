-- Create notifications table for the system
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase_order', 'transfer', 'low_stock', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id TEXT,
  link TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all notifications"
ON public.notifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

-- Create index for better query performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Create a function to automatically create low stock notifications
CREATE OR REPLACE FUNCTION public.check_low_stock_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert low stock notifications for items below minimum stock
  -- Only create if not already created in the last 24 hours
  INSERT INTO public.notifications (type, title, message, reference_id, link)
  SELECT 
    'low_stock'::text,
    'Low Stock Alert: ' || name,
    name || ' (SKU: ' || sku || ') is below minimum stock level. Current: ' || quantity || ', Min: ' || min_stock,
    id::text,
    '/inventory?item=' || id
  FROM public.items
  WHERE quantity <= min_stock
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.reference_id = items.id::text
    AND n.type = 'low_stock'
    AND n.created_at > now() - interval '24 hours'
  );
END;
$$;