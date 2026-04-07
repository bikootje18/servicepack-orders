ALTER TABLE give_x_imports
  DROP CONSTRAINT give_x_imports_order_id_fkey,
  ADD CONSTRAINT give_x_imports_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
