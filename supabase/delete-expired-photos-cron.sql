-- Replace these values before running:
--   YOUR_PROJECT_REF
--   YOUR_DELETE_EXPIRED_PHOTOS_SECRET

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists vault;

select vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co',
  'project_url'
)
where not exists (
  select 1 from vault.decrypted_secrets where name = 'project_url'
);

select vault.create_secret(
  'YOUR_DELETE_EXPIRED_PHOTOS_SECRET',
  'delete_expired_photos_secret'
)
where not exists (
  select 1 from vault.decrypted_secrets where name = 'delete_expired_photos_secret'
);

select cron.unschedule('delete-expired-photos-storage')
where exists (
  select 1 from cron.job where jobname = 'delete-expired-photos-storage'
);

select cron.schedule(
  'delete-expired-photos-storage',
  '5 6 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/delete-expired-photos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'delete_expired_photos_secret'
      )
    ),
    body := jsonb_build_object('triggeredAt', now())
  );
  $$
);
