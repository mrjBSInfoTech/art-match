import db from "../database/db.js";

const paidOrders = "o.payment_status = 'Paid' AND o.status <> 'Cancelled'";

export async function getAdminDashboard(executor = db.promise()) {
  const [[metrics], [months]] = await Promise.all([
    executor.query(`SELECT
      (SELECT COUNT(*) FROM artwork) AS totalArtworks,
      (SELECT COUNT(*) FROM artwork a WHERE NOT EXISTS (
        SELECT 1 FROM artupload au WHERE au.artwork_id = a.artwork_id
        AND LOWER(TRIM(COALESCE(au.request_status, ''))) NOT IN
          ('', 'pending', 'unverified', 'pending verification')
      )) AS pendingArtworks,
      COALESCE(SUM(items.quantity), 0) AS soldCount,
      COALESCE(SUM(o.subtotal), 0) AS totalSales,
      YEAR(CURRENT_DATE) AS salesYear
      FROM marketplace_order o
      LEFT JOIN (SELECT order_id, SUM(quantity) AS quantity
        FROM marketplace_order_item GROUP BY order_id) items ON items.order_id = o.order_id
      WHERE ${paidOrders}`),
    executor.query(`SELECT MONTH(COALESCE(o.paid_at, o.delivered_at, o.created_at)) AS month,
      SUM(o.subtotal) AS sales FROM marketplace_order o
      WHERE ${paidOrders}
        AND COALESCE(o.paid_at, o.delivered_at, o.created_at) >= MAKEDATE(YEAR(CURRENT_DATE), 1)
        AND COALESCE(o.paid_at, o.delivered_at, o.created_at) < DATE_ADD(MAKEDATE(YEAR(CURRENT_DATE), 1), INTERVAL 1 YEAR)
      GROUP BY MONTH(COALESCE(o.paid_at, o.delivered_at, o.created_at))`),
  ]);
  const row = metrics[0];
  const byMonth = new Map(months.map(item => [Number(item.month), Number(item.sales)]));
  return {
    totalArtworks: Number(row.totalArtworks), pendingArtworks: Number(row.pendingArtworks),
    soldCount: Number(row.soldCount), totalSales: Number(row.totalSales), salesYear: Number(row.salesYear),
    monthlySales: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      .map((month, index) => ({ month, sales: byMonth.get(index + 1) || 0 })),
  };
}
