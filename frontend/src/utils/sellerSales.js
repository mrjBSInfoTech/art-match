const isSale = (order) => order.status !== "Cancelled";

const getOrderDate = (order) => {
  const date = new Date(order.date);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getSellerSalesData = (orders, now = new Date()) => {
  const sales = orders.filter(isSale);
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlySales = Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 11 + index,
      1,
    );
    const monthOrders = sales.filter((order) => {
      const date = getOrderDate(order);
      return (
        date &&
        date.getFullYear() === monthDate.getFullYear() &&
        date.getMonth() === monthDate.getMonth()
      );
    });

    return {
      month: monthDate.toLocaleDateString("en-US", { month: "short" }),
      sales: monthOrders.reduce(
        (total, order) => total + Number(order.subtotal ?? order.total ?? 0),
        0,
      ),
    };
  });

  const bestSellersByTitle = new Map();
  sales.forEach((order) => {
    (order.items || []).forEach((item) => {
      const bestSeller = bestSellersByTitle.get(item.title) || {
        title: item.title,
        sold: 0,
        revenue: 0,
      };
      const quantity = Number(item.qty || 0);
      bestSeller.sold += quantity;
      bestSeller.revenue += Number(item.price || 0) * quantity;
      bestSellersByTitle.set(item.title, bestSeller);
    });
  });

  const recentSales = [...sales]
    .sort((first, second) => new Date(second.date) - new Date(first.date))
    .slice(0, 5);
  const revenue = sales.reduce(
    (total, order) => total + Number(order.subtotal ?? order.total ?? 0),
    0,
  );
  const currentMonthSales = sales
    .filter((order) => {
      const date = getOrderDate(order);
      return (
        date &&
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    })
    .reduce(
      (total, order) => total + Number(order.subtotal ?? order.total ?? 0),
      0,
    );

  return {
    monthlySales,
    bestSellers: [...bestSellersByTitle.values()]
      .sort((first, second) => second.sold - first.sold)
      .slice(0, 5),
    recentSales,
    revenue,
    currentMonthSales,
    orderCount: sales.length,
    averageOrder: sales.length ? Math.round(revenue / sales.length) : 0,
  };
};