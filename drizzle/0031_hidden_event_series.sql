-- 0031_hidden_event_series.sql
--
-- Hide a whole recurring series in Prism (#592). Each synced occurrence
-- records the series it belongs to in events.series_key, and a hidden series
-- is one row in hidden_event_series. Occurrences that sync in later match the
-- same row, so they are hidden too. Existing rows get their key on the next
-- sync.
--
-- Idempotent (safe to re-run).

ALTER TABLE events ADD COLUMN IF NOT EXISTS series_key varchar(255);
CREATE INDEX IF NOT EXISTS events_source_series_idx ON events (calendar_source_id, series_key);

CREATE TABLE IF NOT EXISTS hidden_event_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  calendar_source_id uuid NOT NULL REFERENCES calendar_sources(id) ON DELETE CASCADE,
  series_key varchar(255) NOT NULL,
  title varchar(255) NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS hidden_event_series_source_key_unique
  ON hidden_event_series (calendar_source_id, series_key);
