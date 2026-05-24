import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaStar, FaAward, FaChartLine, FaRegCommentDots } from "react-icons/fa";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip
} from "recharts";

const API = "http://localhost:5000/api";

const ViewPerformance = () => {
  const [performanceRecords, setPerformanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        // Updated endpoint to match your new backend route
        const res = await axios.get(`${API}/performance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPerformanceRecords(res.data);
      } catch (err) {
        console.error("Error fetching performance:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, [token]);

  // Extract the latest record for stats (first item in the sorted array)
  const latestRecord = performanceRecords[0] || null;

  // Prepare chart data from all records
  // We reverse it so the chart reads left-to-right (oldest to newest)
  const chartData = performanceRecords.length > 0 
    ? [...performanceRecords].reverse().map(rec => ({
        month: rec.reviewPeriod,
        rating: rec.finalRating
      }))
    : [
        { month: "N/A", rating: 0 }
      ];

  if (loading) return (
    <div style={{ padding: "20px", color: "#64748b", fontWeight: "500" }}>
      Loading Performance Metrics...
    </div>
  );

  return (
    <div style={{ animation: "fadeIn 0.5s ease-out" }}>
      {/* Top Stats Row */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", 
        gap: "20px", 
        marginBottom: "30px" 
      }}>
        <StatCard 
          icon={<FaStar color="#f59e0b" />} 
          label="Current Grade" 
          value={latestRecord?.grade || "N/A"} 
          subText={`Rating: ${latestRecord?.finalRating || 0}/5`}
        />
        <StatCard 
          icon={<FaAward color="#6366f1" />} 
          label="Attendance Score" 
          value={latestRecord?.attendanceScore || "0"} 
          subText="Auto-calculated"
        />
        <StatCard 
          icon={<FaChartLine color="#10b981" />} 
          label="Work Quality" 
          value={latestRecord?.workQuality || "0"} 
          subText={`Period: ${latestRecord?.reviewPeriod || 'N/A'}`}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        {/* Performance Graph */}
        <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ marginBottom: "20px", color: "#1e293b", display: "flex", alignItems: "center", gap: "10px" }}>
            <FaChartLine /> Performance Trend (Final Rating)
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 11}} 
              />
              <YAxis 
                domain={[0, 5]} 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 12}} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
              />
              <Area 
                type="monotone" 
                dataKey="rating" 
                stroke="#6366f1" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorRating)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Manager Feedback */}
        <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ marginBottom: "20px", color: "#1e293b", display: "flex", alignItems: "center", gap: "10px" }}>
            <FaRegCommentDots /> Manager's Feedback
          </h4>
          <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "12px", borderLeft: "4px solid #6366f1" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#475569", fontStyle: "italic", lineHeight: "1.6" }}>
              "{latestRecord?.comments || "No comments provided for this period."}"
            </p>
            <p style={{ marginTop: "10px", fontSize: "12px", fontWeight: "700", color: "#1e293b" }}>
              — Reviewed for {latestRecord?.reviewPeriod}
            </p>
          </div>
          
          <div style={{ marginTop: "20px" }}>
            <h5 style={{ fontSize: "13px", color: "#64748b", marginBottom: "10px" }}>Detailed Scores</h5>
            <div style={{ display: "flex", flexFlow: "column", gap: "8px" }}>
               <ScoreDetail label="Initiative" score={latestRecord?.initiative} />
               <ScoreDetail label="Behavior" score={latestRecord?.behavior} />
               <ScoreDetail label="Work Quality" score={latestRecord?.workQuality} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ScoreDetail = ({ label, score }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px' }}>
        <span style={{ color: '#64748b' }}>{label}</span>
        <span style={{ fontWeight: 'bold', color: '#6366f1' }}>{score || 0}/5</span>
    </div>
);

const StatCard = ({ icon, label, value, subText }) => (
  <div style={{ 
    background: "white", 
    padding: "20px", 
    borderRadius: "16px", 
    border: "1px solid #e2e8f0", 
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)" 
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
      <div style={{ fontSize: "1.5rem" }}>{icon}</div>
      <span style={{ color: "#64748b", fontSize: "14px", fontWeight: "500" }}>{label}</span>
    </div>
    <h3 style={{ margin: "0 0 5px 0", fontSize: "1.8rem", color: "#1e293b" }}>{value}</h3>
    <span style={{ fontSize: "12px", color: "#94a3b8" }}>{subText}</span>
  </div>
);

export default ViewPerformance;