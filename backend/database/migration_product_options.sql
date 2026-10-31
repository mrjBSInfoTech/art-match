USE art_match;

ALTER TABLE cart_item
  ADD COLUMN selected_products JSON NULL AFTER quantity,
  ADD COLUMN order_note TEXT NULL AFTER selected_products;

ALTER TABLE marketplace_order_item
  ADD COLUMN product_option_id VARCHAR(100) NULL AFTER artwork_id,
  ADD COLUMN product_option_name VARCHAR(255) NULL AFTER product_option_id,
  ADD COLUMN selected_products JSON NULL AFTER product_option_name,
  ADD COLUMN line_total DECIMAL(12, 2) NULL AFTER selected_products,
  ADD COLUMN original_line_total DECIMAL(12, 2) NULL AFTER line_total,
  ADD COLUMN order_note TEXT NULL AFTER original_line_total;
