-- Keep workspace onboarding and invitation acceptance atomic. These functions
-- are called only by the auth service and either commit every related row or
-- roll the whole operation back.

CREATE OR REPLACE FUNCTION public.create_workspace_with_admin(
  p_team_name TEXT,
  p_slug TEXT,
  p_email TEXT,
  p_password_hash TEXT,
  p_admin_name TEXT
)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  team_created_at TIMESTAMPTZ,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT,
  user_church_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_church public.churches%ROWTYPE;
  created_user public.users%ROWTYPE;
BEGIN
  INSERT INTO public.churches (name, slug)
  VALUES (p_team_name, p_slug)
  RETURNING * INTO created_church;

  INSERT INTO public.users (church_id, email, password_hash, name, role)
  VALUES (created_church.id, LOWER(TRIM(p_email)), p_password_hash, p_admin_name, 'admin')
  RETURNING * INTO created_user;

  RETURN QUERY SELECT
    created_church.id,
    created_church.name,
    created_church.slug,
    created_church.created_at,
    created_user.id,
    created_user.email,
    created_user.name,
    created_user.role,
    created_user.church_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_invited_user(
  p_token_hash TEXT,
  p_email TEXT,
  p_password_hash TEXT,
  p_name TEXT
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  church_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_invitation public.invitations%ROWTYPE;
  created_user public.users%ROWTYPE;
BEGIN
  SELECT invitation.*
  INTO matched_invitation
  FROM public.invitations AS invitation
  WHERE invitation.token_hash = p_token_hash
    AND invitation.status = 'pending'
    AND invitation.expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVITATION_INVALID';
  END IF;

  IF LOWER(matched_invitation.email) <> LOWER(TRIM(p_email)) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVITATION_EMAIL_MISMATCH';
  END IF;

  INSERT INTO public.users (church_id, email, password_hash, name, role)
  VALUES (
    matched_invitation.church_id,
    LOWER(TRIM(p_email)),
    p_password_hash,
    p_name,
    'member'
  )
  RETURNING * INTO created_user;

  UPDATE public.invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE invitations.id = matched_invitation.id;

  RETURN QUERY SELECT
    created_user.id,
    created_user.email,
    created_user.name,
    created_user.role,
    created_user.church_id,
    created_user.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_workspace_with_admin(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_invited_user(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_workspace_with_admin(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.register_invited_user(TEXT, TEXT, TEXT, TEXT) TO service_role;
