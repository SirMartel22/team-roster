-- Complete invited-member onboarding in one transaction. The prior function
-- created the user and consumed the invitation before the client created the
-- member profile through a separate request.

DROP FUNCTION IF EXISTS public.register_invited_user(TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION public.register_invited_user(
  p_token_hash TEXT,
  p_email TEXT,
  p_password_hash TEXT,
  p_name TEXT,
  p_subunit_id UUID,
  p_phone TEXT,
  p_whatsapp TEXT
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  church_id UUID,
  created_at TIMESTAMPTZ,
  member_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_invitation public.invitations%ROWTYPE;
  matched_subunit public.subunits%ROWTYPE;
  created_user public.users%ROWTYPE;
  created_member public.members%ROWTYPE;
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

  SELECT subunit.*
  INTO matched_subunit
  FROM public.subunits AS subunit
  WHERE subunit.id = p_subunit_id
    AND subunit.church_id = matched_invitation.church_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SUBUNIT_INVALID';
  END IF;

  INSERT INTO public.users (church_id, email, password_hash, name, role)
  VALUES (
    matched_invitation.church_id,
    LOWER(TRIM(p_email)),
    p_password_hash,
    TRIM(p_name),
    'member'
  )
  RETURNING * INTO created_user;

  INSERT INTO public.members (church_id, user_id, subunit_id, phone, whatsapp)
  VALUES (
    matched_invitation.church_id,
    created_user.id,
    matched_subunit.id,
    TRIM(p_phone),
    TRIM(p_whatsapp)
  )
  RETURNING * INTO created_member;

  UPDATE public.invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE invitations.id = matched_invitation.id;

  RETURN QUERY SELECT
    created_user.id,
    created_user.email,
    created_user.name,
    created_user.role,
    created_user.church_id,
    created_user.created_at,
    created_member.id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_invited_user(TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_invited_user(TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT) TO service_role;
