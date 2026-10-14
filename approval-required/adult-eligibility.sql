-- DRAFT ONLY. Applying this migration changes database access controls.
-- Requires explicit deployment/security approval. Not applied by this candidate.
BEGIN;
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
CREATE TABLE app_private.adult_eligibility (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_version text NOT NULL CHECK (length(policy_version) BETWEEN 1 AND 100),
  attested_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE app_private.adult_eligibility ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.adult_eligibility FROM PUBLIC, anon, authenticated, service_role;
-- No browser RLS policy, no direct table grants, no user_metadata authority.
CREATE FUNCTION public.read_adult_eligibility(p_user_id uuid) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('policy_version', policy_version, 'attested_at', attested_at)
  FROM app_private.adult_eligibility WHERE user_id = p_user_id;
$$;
CREATE FUNCTION public.attest_adult_eligibility(p_user_id uuid, p_policy_version text, p_is_adult boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_is_adult IS DISTINCT FROM true THEN RAISE EXCEPTION 'ADULT_ATTESTATION_REQUIRED'; END IF;
  IF p_policy_version IS DISTINCT FROM 'adult-self-attestation-v1' THEN RAISE EXCEPTION 'ADULT_POLICY_CHANGED'; END IF;
  INSERT INTO app_private.adult_eligibility (user_id, policy_version, attested_at)
  VALUES (p_user_id, p_policy_version, clock_timestamp())
  ON CONFLICT (user_id) DO UPDATE SET policy_version = EXCLUDED.policy_version,
    attested_at = EXCLUDED.attested_at
  -- Repeated requests preserve original time; new policy needs a fresh statement.
  WHERE app_private.adult_eligibility.policy_version IS DISTINCT FROM EXCLUDED.policy_version;
END;
$$;
REVOKE ALL ON FUNCTION public.read_adult_eligibility(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attest_adult_eligibility(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_adult_eligibility(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.attest_adult_eligibility(uuid, text, boolean) TO service_role;
COMMIT;
