import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchSales } from "../api/salesAPI";

const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const yearLabels = Array.from({ length: 11 }, (_, i) => 2025 + i);

export default function Sales() {
  const [filter, setFilter] = useState("week"); // default
  const [filterSummary, setFilterSummary] = useState("week"); // default
  const [summary, setSummary] = useState(null);
  const [salesData, setSalesData] = useState({
    day: null,
    week: null,
    month: null,
    year: null,
  });
  const [title, setTitle] = useState("This Week");
  const [data, setData] = useState([]);

  // Load data for current filter
  useEffect(() => {
    const loadSales = async () => {
      try {
        const res = await fetchSales(filterSummary);
        console.log(`Loading summary for ${filterSummary}:`, res.data);
        if (Array.isArray(res.data)) {
          let dataToUse = res.data;
          
          // For month filter, only show current month
          if (filterSummary === "month") {
            const currentMonth = new Date().getMonth() + 1;
            dataToUse = res.data.filter((r) => Number(r.label) === currentMonth);
          }
          
          setSummary({
            total_sales: dataToUse.reduce(
              (sum, r) => sum + Number(r.total_sales || 0),
              0
            ),
            transaction_count: dataToUse.reduce(
              (sum, r) => sum + Number(r.transaction_count || 0),
              0
            ),
          });
        } else {
          setSummary({
            total_sales: Number(res.data.total_sales) || 0,
            transaction_count: Number(res.data.transaction_count) || 0,
          });
        }
      } catch (error) {
        console.error("Failed to load sales:", error);
      }
    };

    loadSales();
  }, [filterSummary]);

  // Load data for all cards on mount
  useEffect(() => {
    const loadAllPeriods = async () => {
      try {
        const [dayRes, weekRes, monthRes, yearRes] = await Promise.all([
          fetchSales("day"),
          fetchSales("week"),
          fetchSales("month"),
          fetchSales("year"),
        ]);
        const currentMonth = new Date().getMonth() + 1;
        console.log("Day response:", dayRes.data);
        setSalesData({
          day: {
            total_sales: dayRes.data.reduce(
              (a, b) => a + Number(b.total_sales || 0),
              0
            ),
            transaction_count: dayRes.data.reduce(
              (a, b) => a + Number(b.transaction_count || 0),
              0
            ),
          },

          week: {
            total_sales: weekRes.data.reduce(
              (a, b) => a + Number(b.total_sales || 0),
              0
            ),
            transaction_count: weekRes.data.reduce(
              (a, b) => a + Number(b.transaction_count || 0),
              0
            ),
          },

          month: {
            total_sales: monthRes.data
              .filter((r) => Number(r.label) === currentMonth)
              .reduce((a, b) => a + Number(b.total_sales || 0), 0),

            transaction_count: monthRes.data
              .filter((r) => Number(r.label) === currentMonth)
              .reduce((a, b) => a + Number(b.transaction_count || 0), 0),
          },

          year: {
            total_sales: yearRes.data.reduce(
              (a, b) => a + Number(b.total_sales || 0),
              0
            ),
            transaction_count: yearRes.data.reduce(
              (a, b) => a + Number(b.transaction_count || 0),
              0
            ),
          },
        });
      } catch (error) {
        console.error("Failed to load sales data for all periods:", error);
        console.error("Error details:", error.message, error.response?.data);
      }
    };

    loadAllPeriods();
  }, []);

  const changeTitle = (filterType) => {
    const titles = {
      day: "Today",
      week: "This Week",
      month: "This Month",
      year: "This Year",
    };
    setTitle(titles[filterType] || "Sales Summary");
  };

  const loadChartData = async (filterType) => {
    try {
      const res = await fetchSales(filterType);
      console.log(`${filterType} response:`, res.data);

      if (!Array.isArray(res.data)) {
        console.warn(`${filterType} data is not an array, setting empty`);
        setData([]);
        return;
      }

      let chartData = [];

      if (filterType === "week") {
        chartData = weekLabels.map((label, index) => ({
          label,
          total_sales: Number(res.data[index]?.total_sales || 0),
        }));

        console.log("Formatted week chart data:", chartData);
      } else if (filterType === "month") {
        // For month: Backend returns MONTH(transaction_date) which is 1-12
        const dataMap = {};
        res.data.forEach((item) => {
          const monthNum = Number(item.label); // 1-12
          dataMap[monthNum] = Number(item.total_sales) || 0;
        });

        console.log("Month data map:", dataMap);

        // Map to monthLabels - month numbers are 1-12, array indices are 0-11
        chartData = monthLabels.map((label, index) => ({
          label,
          total_sales: dataMap[index + 1] || 0, // Convert 0-based index to 1-based month
        }));

        console.log("Formatted month chart data:", chartData);
      } else if (filterType === "year") {
        // For year data
        const dataMap = {};
        res.data.forEach((item) => {
          dataMap[item.label] = Number(item.total_sales) || 0;
        });

        chartData = yearLabels.map((year) => ({
          label: year,
          total_sales: dataMap[year] || 0,
        }));
      } else if (filterType === "day") {
        const dataMap = {};
        res.data.forEach((item) => {
          const hourLabel = `${item.label}:00`;
          dataMap[hourLabel] = Number(item.total_sales || 0);
        });

        chartData = Array.from({ length: 24 }, (_, i) => ({
          label: `${i}:00`,
          total_sales: dataMap[`${i}:00`] || 0,
        }));
      }

      setData(chartData);
    } catch (error) {
      console.error(`Error loading ${filterType} chart data:`, error);
      setData([]);
    }
  };

  useEffect(() => {
    loadChartData(filter);
    changeTitle(filter);
  }, [filter]);
  return (
    <Box sx={{ p: 3 }}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          Sales
        </Typography>
        <Typography variant="body1" sx={{ mt: -1 }}>
          Welcome to the Sales management page.
        </Typography>
      </Box>

      <Box
        sx={{
          mt: 3,
          display: "flex",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 3,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Card
          variant="outlined"
          sx={{
            flex: "1 1 250px",
            maxWidth: 320,
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "#C1FFA9",
          }}
        >
          <CardContent>
            <Typography
              gutterBottom
              variant="h5"
              sx={{ fontWeight: "bold", fontSize: 20, color: "#2C8508" }}
            >
              Today's Sales
            </Typography>
            <Typography variant="body2" color="#68BC46">
              Total sales:{" "}
              {salesData.day ? `₱${salesData.day.total_sales}` : "-"}
            </Typography>
            <Typography variant="body2" color="#68BC46">
              Total transactions:{" "}
              {salesData.day ? salesData.day.transaction_count : "-"}
            </Typography>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 250px",
            maxWidth: 320,
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "#FFF5BA",
          }}
        >
          <CardContent>
            <Typography
              gutterBottom
              variant="h5"
              sx={{ fontWeight: "bold", fontSize: 20, color: "#9B5F03" }}
            >
              This Week's Sales
            </Typography>
            <Typography variant="body2" color="#C1934C">
              Total sales:{" "}
              {salesData.week ? `₱${salesData.week.total_sales}` : "-"}
            </Typography>
            <Typography variant="body2" color="#C1934C">
              Total transactions:{" "}
              {salesData.week ? salesData.week.transaction_count : "-"}
            </Typography>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 250px",
            maxWidth: 320,
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "#FC9495",
          }}
        >
          <CardContent>
            <Typography
              gutterBottom
              variant="h5"
              sx={{ fontWeight: "bold", fontSize: 20, color: "#880506" }}
            >
              This Month's Sales
            </Typography>
            <Typography variant="body2" color="#C05A5C">
              Total sales:{" "}
              {salesData.month ? `₱${salesData.month.total_sales}` : "-"}
            </Typography>
            <Typography variant="body2" color="#C05A5C">
              Total transactions:{" "}
              {salesData.month ? salesData.month.transaction_count : "-"}
            </Typography>
          </CardContent>
        </Card>
        <Card
          variant="outlined"
          sx={{
            flex: "1 1 250px", // grows and shrinks but minimum 250px
            maxWidth: 320, // optional limit
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "#8B87FF",
          }}
        >
          <CardContent>
            <Typography
              gutterBottom
              variant="h5"
              sx={{ fontWeight: "bold", fontSize: 20, color: "#09057F " }}
            >
              This Year's Sales
            </Typography>
            <Typography variant="body2" color="#5854BD">
              Total sales:{" "}
              {salesData.year ? `₱${salesData.year.total_sales}` : "-"}
            </Typography>
            <Typography variant="body2" color="#5854BD">
              Total transactions:{" "}
              {salesData.year ? salesData.year.transaction_count : "-"}
            </Typography>
          </CardContent>
        </Card>
      </Box>
      {/*Sales and total transactions */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            {title} Summary
          </Typography>
          <FormControl
            size="small"
            sx={{
              width: { xs: "100%", sm: 180 },
            }}
          >
            <InputLabel>Sort by Time</InputLabel>
            <Select
              label="Sort by Time"
              value={filterSummary}
              onChange={(e) => {
                const value = e.target.value;
                setFilterSummary(value);
                changeTitle(value);
              }}
            >
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box>
          {summary ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                flexWrap: "wrap",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <Box
                variant="outlined"
                sx={{
                  flex: "1 1 250px",
                  maxWidth: 320,
                  padding: 2,
                  borderRadius: 2,
                  bgcolor: "#C1FFA9",
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    color: "#2C8508",
                    mb: 1,
                    fontSize: 20,
                  }}
                >
                  Total Sales: ₱{summary ? summary.total_sales : "0"}
                </Typography>
              </Box>
              <Box
                variant="outlined"
                sx={{
                  flex: "1 1 250px",
                  maxWidth: 320,
                  padding: 2,
                  borderRadius: 2,
                  bgcolor: "#C1FFA9",
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    color: "#2C8508",
                    mb: 1,
                    textAlign: "center",
                    fontSize: 20,
                  }}
                >
                  Total Transactions:{" "}
                  {summary ? summary.transaction_count : "0"}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                flexWrap: "wrap",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <Box
                variant="outlined"
                sx={{
                  flex: "1 1 250px",
                  maxWidth: 390,
                  padding: 2,
                  borderRadius: 2,
                  bgcolor: "#FC9495",
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    color: "#880506",
                    mb: 1,
                    fontSize: 20,
                  }}
                >
                  Failed to fetch the total transactions
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
      {/* Total sales bar chart*/}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Sales Overview
          </Typography>

          <FormControl size="small" sx={{ width: { xs: "100%", sm: 180 } }}>
            <InputLabel>Sort by Time</InputLabel>
            <Select
              label="Sort by Time"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                changeTitle(e.target.value);
              }}
            >
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* 📊 BAR GRAPH */}
        <Box sx={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="label" />
              <YAxis
                domain={[0, 100000]}
                tickFormatter={(value) => `₱${value / 1000}k`}
              />
              <Tooltip formatter={(value) => `₱${value}`} />
              <Bar dataKey="total_sales" fill="#1976d2" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  );
}
