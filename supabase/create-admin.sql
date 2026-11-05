-- FIRST create your user in Supabase > Authentication > Users > Add user.
-- Replace the email below with your real admin account email, then run this in SQL Editor.
-- Never run this from a website browser or expose a secret key to the frontend.
DO $$
DECLARE admin_id uuid;
BEGIN
 SELECT id INTO admin_id FROM auth.users WHERE lower(email)=lower('REPLACE_WITH_YOUR_ADMIN_EMAIL');
 IF admin_id IS NULL THEN RAISE EXCEPTION 'User not found. Create the admin user in Authentication > Users first.'; END IF;
 INSERT INTO public.user_roles(user_id,role) VALUES(admin_id,'admin') ON CONFLICT(user_id,role) DO NOTHING;
END $$;
