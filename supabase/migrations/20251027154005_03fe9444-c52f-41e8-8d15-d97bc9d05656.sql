-- Make author_id optional in notes table to allow notes creation by any authenticated user
ALTER TABLE notes ALTER COLUMN author_id DROP NOT NULL;