BEGIN;
LOCK TABLE public.users, public.profile_attributes IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE expected integer;
BEGIN
  SELECT count(*) INTO expected FROM public.users u
  JOIN auth.users a ON a.id::text=u.unique_id AND lower(trim(a.email))=lower(trim(u.email))
  WHERE (lower(trim(u.email)),u.unique_id) IN (
    ('jea423@lehigh.edu','36499f06-9058-477f-b956-7444ec853889'),
    ('dankozy12@gmail.com','ec2b00f9-981c-4f30-91e1-91538b054237'),
    ('whpatten.9@gmail.com','32094134-c6d7-4632-8eac-7ede31bf4dbc'))
  AND (SELECT count(*) FROM public.users x WHERE x.unique_id=u.unique_id)=1;
  IF expected<>3 THEN RAISE EXCEPTION 'Account associations changed; no roles updated'; END IF;
  IF EXISTS(SELECT 1 FROM public.users WHERE lower(trim(role))='admin' AND lower(trim(email)) NOT IN ('jea423@lehigh.edu','dankozy12@gmail.com','whpatten.9@gmail.com')) THEN
    RAISE EXCEPTION 'Unexpected admin account; manual review needed';
  END IF;
END $$;
UPDATE public.users SET role=CASE WHEN lower(trim(email))='jea423@lehigh.edu' THEN 'admin' ELSE 'instructor' END
WHERE (lower(trim(email)),unique_id) IN (
  ('jea423@lehigh.edu','36499f06-9058-477f-b956-7444ec853889'),
  ('dankozy12@gmail.com','ec2b00f9-981c-4f30-91e1-91538b054237'),
  ('whpatten.9@gmail.com','32094134-c6d7-4632-8eac-7ede31bf4dbc'));
-- Synchronize only existing, correctly matched profile records. No accounts are merged or created.
UPDATE public.profile_attributes p SET role=u.role FROM public.users u
WHERE p.uuid=u.unique_id AND lower(trim(p.email))=lower(trim(u.email))
AND u.unique_id IN ('36499f06-9058-477f-b956-7444ec853889','ec2b00f9-981c-4f30-91e1-91538b054237','32094134-c6d7-4632-8eac-7ede31bf4dbc');
CREATE UNIQUE INDEX IF NOT EXISTS users_single_admin ON public.users ((lower(trim(role)))) WHERE lower(trim(role))='admin';
COMMIT;
