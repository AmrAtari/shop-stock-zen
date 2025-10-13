-- Assign admin role to the initial user
INSERT INTO public.user_roles (user_id, role)
VALUES ('f8988239-451f-41bf-ad67-cc402d7d6583'::uuid, 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;