import db from "./db.js";

// Core order/chat tables are existing application prerequisites. Returns are
// additive and never replace fulfillment, payment, messages, or inventory.
export const returnRequestTableSql = `
  CREATE TABLE IF NOT EXISTS marketplace_return_request (
    return_request_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    conversation_id INT NOT NULL,
    customer_id INT NOT NULL,
    seller_id INT NOT NULL,
    reason VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    status ENUM('Requested', 'Approved', 'Rejected', 'Cancelled',
      'Return Shipped', 'Received', 'Completed') NOT NULL DEFAULT 'Requested',
    seller_response TEXT NULL,
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decision_at DATETIME NULL,
    return_shipped_at DATETIME NULL,
    received_at DATETIME NULL,
    completed_at DATETIME NULL,
    return_tracking_url VARCHAR(2048) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_marketplace_return_order FOREIGN KEY (order_id)
      REFERENCES marketplace_order(order_id) ON DELETE RESTRICT,
    CONSTRAINT fk_marketplace_return_conversation FOREIGN KEY (conversation_id)
      REFERENCES conversation(conversation_id) ON DELETE RESTRICT,
    CONSTRAINT fk_marketplace_return_customer FOREIGN KEY (customer_id)
      REFERENCES customer(customer_id) ON DELETE RESTRICT,
    CONSTRAINT fk_marketplace_return_seller FOREIGN KEY (seller_id)
      REFERENCES student(student_id) ON DELETE RESTRICT,
    INDEX idx_marketplace_return_order (order_id, status),
    INDEX idx_marketplace_return_customer (customer_id, requested_at),
    INDEX idx_marketplace_return_seller (seller_id, requested_at),
    INDEX idx_marketplace_return_conversation (conversation_id, requested_at)
  ) ENGINE=InnoDB
`;

export const returnItemTableSql = `
  CREATE TABLE IF NOT EXISTS marketplace_return_item (
    return_item_id INT AUTO_INCREMENT PRIMARY KEY,
    return_request_id INT NOT NULL,
    order_item_id INT NOT NULL,
    quantity INT NOT NULL,
    CONSTRAINT fk_marketplace_return_item_request FOREIGN KEY (return_request_id)
      REFERENCES marketplace_return_request(return_request_id) ON DELETE CASCADE,
    CONSTRAINT fk_marketplace_return_item_order_item FOREIGN KEY (order_item_id)
      REFERENCES marketplace_order_item(order_item_id) ON DELETE RESTRICT,
    CONSTRAINT chk_marketplace_return_quantity CHECK (quantity > 0),
    UNIQUE KEY uq_marketplace_return_item (return_request_id, order_item_id),
    INDEX idx_marketplace_return_item_order_item (order_item_id, return_request_id)
  ) ENGINE=InnoDB
`;

export async function ensureReturnTables() {
  await db.promise().query(returnRequestTableSql);
  await db.promise().query(returnItemTableSql);
}
