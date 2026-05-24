import React, { useEffect, useState } from "react";
import axios from "axios";
import EmpReport from "./EmpReport";

const MyAttendance = () => {
  const token = localStorage.getItem("token");
  const API = "http://localhost:5000/api";

  const [attendance, setAttendance] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // New state for UI feedback
  const [message, setMessage] = useState({ text: "", type: "" });

  /* ===============================
      HELPER: SHOW MESSAGE
  =============================== */
  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/employee/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAttendance(res.data);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Unable to load attendance records.";
      showMsg(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Present": return { background: "#16a34a", color: "#fff" };
      case "Absent": return { background: "#ef4444", color: "#fff" };
      case "Half-Day": return { background: "#f59e0b", color: "#fff" };
      case "WFH": return { background: "#6366f1", color: "#fff" };
      default: return { background: "#6b7280", color: "#fff" };
    }
  };

  return (
    <div style={{ padding: "40px", background: "#f3f4f6", minHeight: "100vh" }}>
      <div
        style={{
          background: "#fff",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginBottom: "20px", color: "#1e3a8a" }}>My Attendance</h2>

        {/* MESSAGE BOX */}
        {message.text && (
          <div style={{
            padding: '12px',
            margin: '0 0 20px 0',
            borderRadius: '8px',
            textAlign: 'center',
            fontWeight: '600',
            backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          }}>
            {message.text}
          </div>
        )}

        {showReport ? (
          <>
            <button
              onClick={() => setShowReport(false)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#374151",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                marginBottom: "20px",
                transition: "0.2s"
              }}
            >
              ← Back to List
            </button>
            <EmpReport />
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <button
                onClick={() => setShowReport(true)}
                style={{
                    padding: "10px 20px",
                    backgroundColor: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                }}
                >
                📊 View Attendance Analytics
                </button>
                
                {loading && <span style={{ color: "#6b7280", fontSize: "14px" }}>Refreshing data...</span>}
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr
                    style={{
                        background: "linear-gradient(90deg, #11284b, #1d4ed8)",
                        color: "#fff",
                    }}
                    >
                    <th style={{ padding: "15px" }}>Date</th>
                    <th style={{ padding: "15px" }}>Status</th>
                    <th style={{ padding: "15px" }}>In Time</th>
                    <th style={{ padding: "15px" }}>Out Time</th>
                    </tr>
                </thead>
                <tbody>
                    {attendance.length > 0 ? (
                    attendance.map((item) => (
                        <tr
                        key={item._id}
                        style={{
                            textAlign: "center",
                            borderBottom: "1px solid #e5e7eb",
                            transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                        <td style={{ padding: "12px" }}>
                            {new Date(item.date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </td>
                        <td style={{ padding: "12px" }}>
                            <span
                            style={{
                                padding: "6px 14px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "700",
                                display: "inline-block",
                                minWidth: "80px",
                                ...getStatusStyle(item.status),
                            }}
                            >
                            {item.status}
                            </span>
                        </td>
                        <td style={{ padding: "12px" }}>{item.inTime || "--:--"}</td>
                        <td style={{ padding: "12px" }}>{item.outTime || "--:--"}</td>
                        </tr>
                    ))
                    ) : (
                    <tr>
                        <td colSpan="4" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                        {loading ? "Fetching your logs..." : "No attendance records found for your account."}
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyAttendance;