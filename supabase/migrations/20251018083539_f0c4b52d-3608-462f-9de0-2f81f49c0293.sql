-- Fix ambiguous column reference in generate_pi_session_number function
CREATE OR REPLACE FUNCTION public.generate_pi_session_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  last_sequence INTEGER;
  next_sequence INTEGER;
  year_part TEXT;
  session_number TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN physical_inventory_sessions.session_number ~ ('^PI-' || year_part || '-[0-9]+$')
        THEN CAST(SUBSTRING(physical_inventory_sessions.session_number FROM LENGTH('PI-' || year_part || '-') + 1) AS INTEGER)
        ELSE 0
      END
    ),
    0
  ) INTO last_sequence
  FROM physical_inventory_sessions
  WHERE physical_inventory_sessions.session_number LIKE 'PI-' || year_part || '-%';
  
  next_sequence := last_sequence + 1;
  
  RETURN 'PI-' || year_part || '-' || LPAD(next_sequence::TEXT, 4, '0');
END;
$function$;