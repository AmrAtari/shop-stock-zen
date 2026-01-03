-- Change audit_log.record_id from uuid to text to support tables with different ID types
ALTER TABLE public.audit_log ALTER COLUMN record_id TYPE text USING record_id::text;