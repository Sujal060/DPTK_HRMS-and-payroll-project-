import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../../style/admin/EmployeeList.css";

const Performance = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New state for UI feedback
  const [message, setMessage] = useState({ text: "", type: "" });

  /* ===============================
      HELPER: SHOW MESSAGE FOR TIME
  =============================== */
  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  /* ================= FETCH PERFORMANCE ================= */
  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/performance", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords(res.data);
    } catch (err) {
      showMsg("Failed to synchronize performance records with the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  /* ================= DELETE PERFORMANCE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this performance record?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/performance/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showMsg("Performance record deleted successfully ✅", "success");
      fetchPerformance();
    } catch (err) {
      showMsg(err.response?.data?.message || "Delete operation failed.");
    }
  };

  /* ================= AUTO-GENERATE PERFORMANCE ================= */
  const handleAutoGenerate = async () => {
    const reviewPeriod = prompt("Enter Review Period (e.g., Jan 2026):");
    
    // Validation: Check if user cancelled or left it empty
    if (reviewPeriod === null) return; 
    if (!reviewPeriod.trim()) {
      showMsg("Review Period is required to generate records.");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:5000/api/performance/auto-generate",
        { reviewPeriod: reviewPeriod.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMsg(`${res.data.total || 0} performance records generated successfully ✅`, "success");
      fetchPerformance();
    } catch (err) {
      showMsg(err.response?.data?.message || "Error generating performance reports.");
    }
  };

  return (
    <div className="employee-page">
      <div className="employee-card">
        {/* Header */}
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Performance Management</h2>
          {role === "hr" && (
            <button 
              onClick={handleAutoGenerate}
              className="generate-btn"
            >
              Auto-Generate Performance
            </button>
          )}
        </div>

        {/* MESSAGE BOX */}
        {message.text && (
          <div style={{
            padding: '12px',
            margin: '15px 0',
            borderRadius: '6px',
            textAlign: 'center',
            fontWeight: '600',
            backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          }}>
            {message.text}
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX: "auto", marginTop: "20px" }}>
          {loading ? (
            <p style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading performance records...</p>
          ) : (
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Review Period</th>
                  <th>Attendance</th>
                  <th>Quality</th>
                  <th>Behavior</th>
                  <th>Initiative</th>
                  <th>Rating</th>
                  <th>Grade</th>
                  <th>Inc. %</th>
                  {role === "hr" && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                      No performance records found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <strong>{record.employeeId?.firstName} {record.employeeId?.lastName}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {record.employeeId?.designation || "N/A"}
                        </div>
                      </td>
                      <td>{record.reviewPeriod}</td>
                      <td>{record.attendanceScore ?? "0"}</td>
                      <td>{record.workQuality ?? "0"}</td>
                      <td>{record.behavior ?? "0"}</td>
                      <td>{record.initiative ?? "0"}</td>
                      <td style={{ fontWeight: 'bold' }}>{record.finalRating ?? "N/A"}</td>
                      <td>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: '#f1f5f9',
                          fontWeight: 'bold' 
                        }}>
                          {record.grade || "N/A"}
                        </span>
                      </td>
                      <td>{record.incrementSuggestion || 0}%</td>
                      {role === "hr" && (
                        <td>
                          <button
                            onClick={() => handleDelete(record._id)}
                            className="btn-danger"
                            style={{ 
                              padding: '5px 10px', 
                              backgroundColor: '#e53e3e', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Performance;