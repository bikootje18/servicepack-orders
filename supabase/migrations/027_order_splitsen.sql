ALTER TABLE orders ADD COLUMN gesplitst_van uuid NULL REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN gesplitst_naar uuid NULL REFERENCES orders(id) ON DELETE SET NULL;
