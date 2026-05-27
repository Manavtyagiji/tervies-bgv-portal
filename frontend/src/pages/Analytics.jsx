import { useEffect, useState } from "react";
import axios from "../utils/axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

const API = "/api";

export default function AnalyticsPage() {
  const token = localStorage.getItem("adminToken");

  const [cases, setCases] = useState([]);
  const [dailyTrend, setDailyTrend] = useState([]);
  const [revenue, setRevenue] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/admin/cases`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const allCases = res.data.cases || [];

      setCases(allCases);
      processCharts(allCases);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    }
  };

  /* ================= PROCESS DATA ================= */

  const processCharts = (allCases) => {
    const dailyMap = {};
    const revenueMap = {};

    allCases.forEach((c) => {
      const rawDate = c.createdAt ? new Date(c.createdAt) : new Date();
      const date = rawDate.toLocaleDateString();

      // 📊 CASE TREND
      if (!dailyMap[date]) {
        dailyMap[date] = { date, cases: 0, verified: 0 };
      }

      dailyMap[date].cases += 1;

      if (c.status === "VERIFIED") {
        dailyMap[date].verified += 1;
      }

      // 💰 REVENUE TREND
      if (!revenueMap[date]) {
        revenueMap[date] = { date, revenue: 0 };
      }

      revenueMap[date].revenue += Number(c.totalCost || 0);
    });

    setDailyTrend(Object.values(dailyMap));
    setRevenue(Object.values(revenueMap));
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Advanced Analytics Dashboard</h1>

      {/* ================= CASE TREND ================= */}
      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="font-bold mb-4">📊 Daily Case Trend</h2>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyTrend}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="cases" stroke="#2563eb" />
            <Line type="monotone" dataKey="verified" stroke="#16a34a" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ================= REVENUE ================= */}
      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="font-bold mb-4">💰 Revenue Trend</h2>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="revenue" fill="#16a34a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ================= SLA TRACKER ================= */}
      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="font-bold mb-4">⏱ SLA Tracking (Delay Detection)</h2>

        {cases.length === 0 ? (
          <p className="text-gray-500">No cases found</p>
        ) : (
          cases.map((c, i) => {
            const createdDate = c.createdAt ? new Date(c.createdAt) : new Date();
            const days =
              (new Date() - createdDate) / (1000 * 60 * 60 * 24);

            const delayed = days > 3;

            return (
              <div key={i} className="flex justify-between border-b py-2">
                <span>
                  {c.caseId || c._id || `Case ${i + 1}`} -{" "}
                  {createdDate.toLocaleDateString()}
                </span>

                <span className={delayed ? "text-red-600" : "text-green-600"}>
                  {delayed ? "Delayed" : "On Time"}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* ================= GROWTH ================= */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-bold mb-4">📈 Growth Analysis</h2>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyTrend}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="cases" stroke="#7c3aed" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}