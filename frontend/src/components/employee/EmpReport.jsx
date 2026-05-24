import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import jsPDF from "jspdf";
import "jspdf-autotable"; // Import this for professional tables in PDF

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const EmpReport = () => {
  const token = localStorage.getItem("token");
  const API_URL = "http://localhost:5000/api/employee/attendance";

  const [attendance, setAttendance] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [summary, setSummary] = useState({
    present: 0,
    absent: 0,
    half: 0,
    percentage: 0,
    totalDays: 0
  });

  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  useEffect(() => {
    filterAndCalculate();
  }, [attendance, month, year]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAttendance(res.data);
    } catch (err) {
      showMsg("Critical: Could not sync attendance logs.");
    } finally {
      setLoading(false);
    }
  };

  const filterAndCalculate = () => {
    const data = attendance.filter((record) => {
      const recordDate = new Date(record.date);
      return (
        recordDate.getMonth() + 1 === Number(month) &&
        recordDate.getFullYear() === Number(year)
      );
    });

    // Sort by date descending
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    setFiltered(data);

    let present = 0, absent = 0, half = 0;

    data.forEach((r) => {
      if (r.status === "Present") present++;
      else if (r.status === "Absent") absent++;
      else if (r.status === "Half-Day") half++;
    });

    const totalDays = data.length;
    const paidDays = present + half * 0.5;
    const percentage = totalDays > 0 ? ((paidDays / totalDays) * 100).toFixed(1) : 0;

    setSummary({ present, absent, half, percentage, totalDays });
  };

  // Memoize chart to prevent flicker on every state change
  const chartData = useMemo(() => ({
    labels: ["Present", "Absent", "Half-Day"],
    datasets: [
      {
        data: [summary.present, summary.absent, summary.half],
        backgroundColor: ["#10b981", "#ef4444", "#f59e0b"],
        borderWidth: 0,
        borderRadius: 8,
        barThickness: 40,
      },
    ],
  }), [summary]);

  const downloadCSV = () => {
    if (filtered.length === 0) return showMsg("No data found for the selected period.");
    
    const headers = ["Date", "Status", "Check-In", "Check-Out"];
    const rows = filtered.map(r => [
      new Date(r.date).toLocaleDateString(),
      r.status,
      r.inTime || "--",
      r.outTime || "--"
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Report_${month}_${year}.csv`);
    link.click();
    showMsg("CSV Exported ✅", "success");
  };

  const downloadPDF = () => {
    if (filtered.length === 0) return showMsg("No data found for PDF export.");

    const doc = new jsPDF();
    const monthName = new Date(0, month - 1).toLocaleString("default", { month: "long" });

    // PDF Styling
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138); // Dark Blue
    doc.text("Attendance Summary Report", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${monthName} ${year} | Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Summary Statistics in PDF
    doc.autoTable({
      startY: 35,
      head: [['Metric', 'Value']],
      body: [
        ['Total Working Days', summary.totalDays],
        ['Days Present', summary.present],
        ['Days Absent', summary.absent],
        ['Half-Days', summary.half],
        ['Attendance Percentage', `${summary.percentage}%`],
      ],
      theme: 'grid',
      headStyles: { fillStyle: [37, 99, 235] }
    });

    // Main Records Table
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Date', 'Status', 'In Time', 'Out Time']],
      body: filtered.map(r => [
        new Date(r.date).toLocaleDateString(),
        r.status,
        r.inTime || "--:--",
        r.outTime || "--:--"
      ]),
      headStyles: { fillStyle: [31, 41, 55] },
      alternateRowStyles: { fillStyle: [249, 250, 251] }
    });

    doc.save(`Attendance_${monthName}_${year}.pdf`);
    showMsg("PDF Exported ✅", "success");
  };
  const calculateDuration = (inTime, outTime) => {
  if (!inTime || !outTime) return "--";
  const start = new Date(`2000/01/01 ${inTime}`);
  const end = new Date(`2000/01/01 ${outTime}`);
  const diff = (end - start) / 1000 / 60 / 60; // hours
  return diff > 0 ? `${diff.toFixed(1)} hrs` : "--";
};

  return (
    <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "16px" }}>
      {message.text && (
        <div style={{
          padding: '14px', marginBottom: '20px', borderRadius: '10px', textAlign: 'center', fontWeight: '600',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {message.text}
        </div>
      )}

      <div style={{ background: "#ffffff", padding: "30px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h2 style={{ margin: 0, color: "#0f172a", fontSize: '1.5rem' }}>Monthly Performance</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
                <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    style={{ padding: "10px 15px", borderRadius: "10px", border: "1px solid #e2e8f0", cursor: 'pointer', outline: 'none' }}
                >
                    {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>
                    ))}
                </select>
                <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    style={{ padding: "10px 15px", borderRadius: "10px", border: "1px solid #e2e8f0", width: "100px", outline: 'none' }}
                />
            </div>
        </div>

        {/* Dynamic Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "20px", marginBottom: "35px" }}>
          {[
            { label: "Working Days", value: summary.totalDays, bg: "#f1f5f9", color: "#475569" },
            { label: "Present", value: summary.present, bg: "#ecfdf5", color: "#059669" },
            { label: "Absent", value: summary.absent, bg: "#fef2f2", color: "#dc2626" },
            { label: "Attendance", value: summary.percentage + "%", bg: "#eff6ff", color: "#2563eb" }
          ].map((item, index) => (
            <div key={index} style={{ background: item.bg, padding: "20px", borderRadius: "14px", border: `1px solid ${item.bg === '#f1f5f9' ? '#e2e8f0' : 'transparent'}` }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: 'uppercase' }}>{item.label}</p>
              <h2 style={{ margin: 0, color: item.color, fontSize: "24px" }}>{item.value}</h2>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "40px", marginBottom: "40px" }}>
          <div style={{ flex: "1", minWidth: "320px", background: '#fcfcfc', padding: '20px', borderRadius: '12px' }}>
            <Bar 
                data={chartData} 
                options={{ 
                    responsive: true,
                    plugins: { legend: { display: false }, tooltip: { cornerRadius: 8 } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } }
                }} 
            />
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "12px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>Reports & Export</h4>
            <button onClick={downloadCSV} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px', background: '#334155', color: '#fff', border: 'none', fontWeight: '600', transition: '0.3s' }}>
              📊 Export as Excel (CSV)
            </button>
            <button onClick={downloadPDF} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: '600', transition: '0.3s' }}>
              📄 Export as Official PDF
            </button>
          </div>
        </div>

        {/* Table Area */}
        {/* --- DAY-TO-DAY ATTENDANCE LOG --- */}
<div style={{ marginTop: '20px' }}>
  <h3 style={{ fontSize: '16px', color: '#475569', marginBottom: '15px', fontWeight: '700' }}>
    Detailed Daily Logs
  </h3>
  
  <div style={{ borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", background: '#fff' }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "#f8fafc", borderBottom: '2px solid #e2e8f0' }}>
          <th style={{ padding: "16px", color: "#64748b", fontSize: "12px", textTransform: 'uppercase', textAlign: 'left' }}>Date & Day</th>
          <th style={{ padding: "16px", color: "#64748b", fontSize: "12px", textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
          <th style={{ padding: "16px", color: "#64748b", fontSize: "12px", textTransform: 'uppercase', textAlign: 'center' }}>Check-In</th>
          <th style={{ padding: "16px", color: "#64748b", fontSize: "12px", textTransform: 'uppercase', textAlign: 'center' }}>Check-Out</th>
          <th style={{ padding: "16px", color: "#64748b", fontSize: "12px", textTransform: 'uppercase', textAlign: 'right' }}>Work Hours</th>
        </tr>
      </thead>
      <tbody>
        {filtered.length > 0 ? (
          filtered.map((r, i) => (
            <tr key={r._id} style={{ 
              borderBottom: "1px solid #f1f5f9", 
              transition: 'background 0.2s',
              background: i % 2 === 0 ? '#ffffff' : '#fcfcfc'
            }}>
              {/* DATE COLUMN */}
              <td style={{ padding: "16px" }}>
                <div style={{ fontWeight: "700", color: "#1e293b", fontSize: '14px' }}>
                  {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                  {new Date(r.date).toLocaleDateString('en-GB', { weekday: 'long' })}
                </div>
              </td>

              {/* STATUS PILL */}
              <td style={{ padding: "16px", textAlign: 'center' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  background: r.status === "Present" ? "#dcfce7" : r.status === "Half-Day" ? "#fef3c7" : "#fee2e2",
                  color: r.status === "Present" ? "#15803d" : r.status === "Half-Day" ? "#b45309" : "#b91c1c",
                  border: `1px solid ${r.status === "Present" ? "#bbf7d0" : r.status === "Half-Day" ? "#fde68a" : "#fecaca"}`
                }}>
                  {r.status}
                </span>
              </td>

              {/* LOG TIMES */}
              <td style={{ padding: "16px", textAlign: 'center', color: "#475569", fontWeight: '500' }}>
                {r.inTime || "--:--"}
              </td>
              <td style={{ padding: "16px", textAlign: 'center', color: "#475569", fontWeight: '500' }}>
                {r.outTime || "--:--"}
              </td>

              {/* CALCULATED DURATION */}
              <td style={{ padding: "16px", textAlign: 'right' }}>
                <span style={{ 
                   fontWeight: '700', 
                   color: '#334155', 
                   background: '#f1f5f9', 
                   padding: '4px 8px', 
                   borderRadius: '6px',
                   fontSize: '13px'
                }}>
                  {calculateDuration(r.inTime, r.outTime)}
                </span>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="5" style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
               No attendance records for {new Date(0, month - 1).toLocaleString("default", { month: "long" })}.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>
      </div>
    </div>
  );
};

export default EmpReport;