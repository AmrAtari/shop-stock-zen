-- Recreate v_cash_sessions_report view
CREATE OR REPLACE VIEW v_cash_sessions_report AS
SELECT cs.id,
    cs.cashier_id,
    cs.cashier_id AS cashier_name,
    s.name AS store_name,
    cs.open_at,
    cs.close_at,
    cs.start_cash,
    cs.end_cash,
    cs.notes,
    COALESCE(sum(CASE WHEN t.payment_method = 'cash' AND NOT t.is_refund THEN t.amount ELSE 0 END), 0) AS total_cash_sales,
    COALESCE(sum(CASE WHEN t.payment_method = 'card' AND NOT t.is_refund THEN t.amount ELSE 0 END), 0) AS total_card_sales,
    COALESCE(sum(CASE WHEN NOT t.is_refund THEN t.amount ELSE 0 END), 0) AS total_sales,
    COALESCE(sum(CASE WHEN t.is_refund THEN t.amount ELSE 0 END), 0) AS total_refunds,
    count(DISTINCT CASE WHEN NOT t.is_refund THEN t.transaction_id ELSE NULL END) AS transaction_count,
    count(DISTINCT CASE WHEN t.is_refund THEN t.transaction_id ELSE NULL END) AS refund_count,
    cs.end_cash - cs.start_cash AS cash_difference,
    cs.end_cash - cs.start_cash - COALESCE(sum(CASE WHEN t.payment_method = 'cash' AND NOT t.is_refund THEN t.amount ELSE 0 END), 0) + COALESCE(sum(CASE WHEN t.payment_method = 'cash' AND t.is_refund THEN t.amount ELSE 0 END), 0) AS variance
FROM cash_sessions cs
LEFT JOIN stores s ON cs.store_id = s.id
LEFT JOIN transactions t ON t.session_id = cs.id
GROUP BY cs.id, cs.cashier_id, s.name, cs.open_at, cs.close_at, cs.start_cash, cs.end_cash, cs.notes;

-- Recreate v_pos_receipts_report view
CREATE OR REPLACE VIEW v_pos_receipts_report AS
SELECT t.transaction_id,
    t.created_at,
    t.cashier_id,
    t.payment_method,
    sum(t.amount) AS total_amount,
    t.session_id,
    cs.start_cash,
    cs.end_cash,
    count(DISTINCT t.id) AS line_items
FROM transactions t
LEFT JOIN cash_sessions cs ON t.session_id = cs.id
WHERE t.is_refund = false
GROUP BY t.transaction_id, t.created_at, t.cashier_id, t.payment_method, t.session_id, cs.start_cash, cs.end_cash;

-- Recreate v_sales_report view
CREATE OR REPLACE VIEW v_sales_report AS
SELECT t.id,
    t.transaction_id,
    t.created_at,
    t.item_id,
    i.sku,
    i.name AS item_name,
    c.name AS category,
    mg.name AS brand,
    t.quantity,
    t.price,
    t.amount,
    t.discount_fixed,
    t.discount_percent,
    t.payment_method,
    t.cashier_id,
    t.is_refund
FROM transactions t
LEFT JOIN items i ON t.item_id = i.id
LEFT JOIN categories c ON i.category = c.id
LEFT JOIN main_groups mg ON i.main_group = mg.id
WHERE t.is_refund = false;

-- Recreate v_refunds_report view
CREATE OR REPLACE VIEW v_refunds_report AS
SELECT t.id,
    t.transaction_id,
    t.created_at,
    t.item_id,
    i.sku,
    i.name AS item_name,
    t.quantity,
    t.price,
    t.amount,
    t.cashier_id
FROM transactions t
LEFT JOIN items i ON t.item_id = i.id
WHERE t.is_refund = true;

-- Recreate v_items_sold_report view
CREATE OR REPLACE VIEW v_items_sold_report AS
SELECT i.id AS item_id,
    i.sku,
    i.name AS item_name,
    c.name AS category,
    s.id AS store_id,
    s.name AS store_name,
    COALESCE(sum(t.quantity), 0) AS total_sold,
    COALESCE(sum(t.amount), 0) AS total_revenue
FROM items i
LEFT JOIN categories c ON i.category = c.id
LEFT JOIN store_inventory si ON i.id = si.item_id
LEFT JOIN stores s ON si.store_id = s.id
LEFT JOIN transactions t ON t.item_id = i.id AND t.is_refund = false
GROUP BY i.id, i.sku, i.name, c.name, s.id, s.name;

-- Recreate v_payment_methods_report view
CREATE OR REPLACE VIEW v_payment_methods_report AS
SELECT s.id AS store_id,
    s.name AS store_name,
    t.payment_method,
    date(t.created_at) AS transaction_date,
    count(DISTINCT t.transaction_id) AS transaction_count,
    sum(t.amount) AS total_amount
FROM transactions t
LEFT JOIN cash_sessions cs ON t.session_id = cs.id
LEFT JOIN stores s ON cs.store_id = s.id
WHERE t.is_refund = false
GROUP BY s.id, s.name, t.payment_method, date(t.created_at);

-- Recreate v_daily_pos_summary view
CREATE OR REPLACE VIEW v_daily_pos_summary AS
SELECT s.id AS store_id,
    s.name AS store_name,
    date(t.created_at) AS transaction_date,
    count(DISTINCT CASE WHEN NOT t.is_refund THEN t.transaction_id END) AS total_transactions,
    count(DISTINCT CASE WHEN t.is_refund THEN t.transaction_id END) AS total_refunds,
    COALESCE(sum(CASE WHEN NOT t.is_refund THEN t.amount ELSE 0 END), 0) AS total_sales,
    COALESCE(sum(CASE WHEN t.is_refund THEN t.amount ELSE 0 END), 0) AS total_refund_amount
FROM transactions t
LEFT JOIN cash_sessions cs ON t.session_id = cs.id
LEFT JOIN stores s ON cs.store_id = s.id
GROUP BY s.id, s.name, date(t.created_at);

-- Recreate v_cashier_performance_report view
CREATE OR REPLACE VIEW v_cashier_performance_report AS
SELECT cs.cashier_id,
    cs.cashier_id AS cashier_name,
    s.id AS store_id,
    s.name AS store_name,
    date(t.created_at) AS transaction_date,
    count(DISTINCT cs.id) AS sessions_worked,
    count(DISTINCT CASE WHEN NOT t.is_refund THEN t.transaction_id END) AS total_transactions,
    count(DISTINCT CASE WHEN t.is_refund THEN t.transaction_id END) AS total_refunds,
    COALESCE(sum(CASE WHEN NOT t.is_refund THEN t.quantity ELSE 0 END), 0) AS items_sold,
    COALESCE(sum(CASE WHEN NOT t.is_refund THEN t.amount ELSE 0 END), 0) AS total_sales,
    COALESCE(sum(CASE WHEN t.is_refund THEN t.amount ELSE 0 END), 0) AS total_refund_amount,
    COALESCE(sum(CASE WHEN NOT t.is_refund THEN t.amount ELSE 0 END), 0) - COALESCE(sum(CASE WHEN t.is_refund THEN t.amount ELSE 0 END), 0) AS net_sales,
    avg(CASE WHEN NOT t.is_refund THEN t.amount END) AS avg_transaction_value,
    COALESCE(sum(CASE WHEN t.payment_method = 'cash' AND NOT t.is_refund THEN t.amount ELSE 0 END), 0) AS cash_sales,
    COALESCE(sum(CASE WHEN t.payment_method = 'card' AND NOT t.is_refund THEN t.amount ELSE 0 END), 0) AS card_sales
FROM cash_sessions cs
LEFT JOIN stores s ON cs.store_id = s.id
LEFT JOIN transactions t ON t.session_id = cs.id
GROUP BY cs.cashier_id, s.id, s.name, date(t.created_at);

-- Recreate simplified versions of other views
CREATE OR REPLACE VIEW v_inventory_turnover_report AS
SELECT i.id AS item_id,
    i.sku,
    i.name AS item_name,
    COALESCE(sum(t.quantity), 0) AS units_sold,
    i.quantity AS current_stock
FROM items i
LEFT JOIN transactions t ON t.item_id = i.id AND t.is_refund = false
GROUP BY i.id, i.sku, i.name, i.quantity;

CREATE OR REPLACE VIEW v_profit_margin_report AS
SELECT i.id AS item_id,
    i.sku,
    i.name AS item_name,
    i.cost,
    i.price,
    i.price - i.cost AS margin,
    CASE WHEN i.price > 0 THEN ((i.price - i.cost) / i.price * 100) ELSE 0 END AS margin_percent,
    COALESCE(sum(t.quantity), 0) AS units_sold,
    COALESCE(sum(t.amount), 0) AS total_revenue,
    COALESCE(sum(t.quantity * i.cost), 0) AS total_cost,
    COALESCE(sum(t.amount), 0) - COALESCE(sum(t.quantity * i.cost), 0) AS total_profit
FROM items i
LEFT JOIN transactions t ON t.item_id = i.id AND t.is_refund = false
GROUP BY i.id, i.sku, i.name, i.cost, i.price;

CREATE OR REPLACE VIEW v_item_lifecycle_report AS
SELECT i.id AS item_id,
    i.sku,
    i.name AS item_name,
    i.created_at AS first_added,
    i.last_restocked,
    max(t.created_at) AS last_sold,
    COALESCE(sum(t.quantity), 0) AS total_units_sold
FROM items i
LEFT JOIN transactions t ON t.item_id = i.id AND t.is_refund = false
GROUP BY i.id, i.sku, i.name, i.created_at, i.last_restocked;