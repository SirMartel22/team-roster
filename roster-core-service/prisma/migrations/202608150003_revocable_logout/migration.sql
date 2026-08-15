CREATE TABLE public.revoked_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX revoked_sessions_expires_at_idx
  ON public.revoked_sessions(expires_at);

ALTER TABLE public.revoked_sessions ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.revoke_session(
  p_church_id UUID,
  p_user_id UUID,
  p_token_hash TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id AND church_id = p_church_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SESSION_USER_INVALID';
  END IF;

  DELETE FROM public.revoked_sessions WHERE expires_at <= NOW();

  INSERT INTO public.revoked_sessions (church_id, user_id, token_hash, expires_at)
  VALUES (p_church_id, p_user_id, p_token_hash, p_expires_at)
  ON CONFLICT (token_hash) DO UPDATE
    SET expires_at = EXCLUDED.expires_at;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON TABLE public.revoked_sessions FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_session(UUID, UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_session(UUID, UUID, TEXT, TIMESTAMPTZ) TO service_role;
