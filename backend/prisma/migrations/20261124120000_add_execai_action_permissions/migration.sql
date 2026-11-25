-- Permission keys used by ExecAI's workspace actions (assistant.actions.js).
--
-- Agent writes are gated more strictly than the module UI: a non-admin needs an
-- explicit permission on their role, because the agent acts on a natural-language
-- instruction rather than a form the person has looked at. A key that doesn't
-- exist can't be granted, so every key the actions check is inserted here.
--
-- That includes crm.contact.write and crm.pipeline.manage. Those were only ever
-- created by the development seed script — a tenant created through signup gets
-- four coarse keys and nothing else — so in production they did not exist and
-- could not have been granted to anyone.
--
-- Idempotent: an environment that already has a key (for example, a seeded
-- development database) keeps its row and id untouched.

INSERT INTO "Permission" ("id", "key", "description") VALUES
  (gen_random_uuid()::text, 'crm.contact.write',          'Create and update CRM contacts'),
  (gen_random_uuid()::text, 'crm.pipeline.manage',        'Manage CRM pipelines'),
  (gen_random_uuid()::text, 'crm.activity.write',         'Create or complete CRM tasks and meetings for other people'),
  (gen_random_uuid()::text, 'marketing.audience.write',   'Create draft marketing audiences'),
  (gen_random_uuid()::text, 'marketing.experiment.write', 'Create draft marketing experiments'),
  (gen_random_uuid()::text, 'network.alerts.manage',      'Acknowledge network alerts'),
  (gen_random_uuid()::text, 'network.incidents.manage',   'Open network incidents'),
  (gen_random_uuid()::text, 'network.changes.request',    'Submit network change requests for approval')
ON CONFLICT ("key") DO NOTHING;
