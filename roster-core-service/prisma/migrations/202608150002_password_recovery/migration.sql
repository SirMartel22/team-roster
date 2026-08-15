CREATE TABLE public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX password_reset_tokens_user_id_expires_at_idx
  ON public.password_reset_tokens(user_id, expires_at);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.create_password_reset_token(
  p_church_id UUID,
  p_user_id UUID,
  p_token_hash TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_token_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id AND church_id = p_church_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RESET_USER_INVALID';
  END IF;

  UPDATE public.password_reset_tokens
  SET used_at = NOW()
  WHERE user_id = p_user_id AND used_at IS NULL;

  INSERT INTO public.password_reset_tokens (church_id, user_id, token_hash, expires_at)
  VALUES (p_church_id, p_user_id, p_token_hash, p_expires_at)
  RETURNING id INTO created_token_id;

  RETURN created_token_id;
END;
$$;

CREATE FUNCTION public.reset_password_with_token(
  p_token_hash TEXT,
  p_password_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_token public.password_reset_tokens%ROWTYPE;
BEGIN
  SELECT reset_token.*
  INTO matched_token
  FROM public.password_reset_tokens AS reset_token
  WHERE reset_token.token_hash = p_token_hash
    AND reset_token.used_at IS NULL
    AND reset_token.expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RESET_TOKEN_INVALID';
  END IF;

  UPDATE public.users
  SET password_hash = p_password_hash
  WHERE id = matched_token.user_id
    AND church_id = matched_token.church_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RESET_TOKEN_INVALID';
  END IF;

  UPDATE public.password_reset_tokens
  SET used_at = NOW()
  WHERE user_id = matched_token.user_id AND used_at IS NULL;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON TABLE public.password_reset_tokens FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_password_reset_token(UUID, UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_password_with_token(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_password_reset_token(UUID, UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_password_with_token(TEXT, TEXT) TO service_role;
