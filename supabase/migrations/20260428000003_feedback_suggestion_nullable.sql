-- suggestion must be nullable so star-only feedback rows can be inserted
-- without a text suggestion. The original table was created with NOT NULL
-- on suggestion, which silently rejected star-only inserts.
ALTER TABLE feedback
  ALTER COLUMN suggestion DROP NOT NULL;
