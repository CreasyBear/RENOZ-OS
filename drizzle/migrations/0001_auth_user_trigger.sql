-- Auth User Trigger: Auto-create user row on auth.users insert
-- This trigger creates an app user when a new Supabase Auth user signs up.
-- The user is created with default 'invited' status and 'viewer' role.
-- Organization assignment must be handled separately (via invite flow or first org creation).

-- Enable RLS on users table
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Function to handle new user creation from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Note: organizationId is NOT set here because we don't know which org the user belongs to yet.
  -- This will be handled by the invite/onboarding flow that sets the organization.
  -- For now, we skip auto-creation if no org context exists.
  -- The proper flow is:
  --   1. Admin invites user (creates users row with org, email, status='invited')
  --   2. User signs up via Supabase Auth
  --   3. This trigger links the auth_id to existing users row by email

  -- Try to find existing invited user by email and link auth_id
  UPDATE public.users
  SET
    auth_id = NEW.id,
    status = 'active',
    updated_at = NOW()
  WHERE
    email = NEW.email
    AND auth_id IS NULL
    AND status = 'invited';

  -- If no rows updated (user wasn't pre-invited), log for debugging
  -- In a full implementation, you might want to handle first user / org creation here
  IF NOT FOUND THEN
    -- For MVP: Do nothing - require pre-invitation
    -- User will see "no organization" error and need to be invited
    RAISE LOG 'Auth user % created but no matching invited user found for email %', NEW.id, NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users insert
-- Note: This requires the trigger to be created in Supabase dashboard or via SQL editor
-- as auth schema is managed by Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.users TO supabase_auth_admin;
