import React, { useEffect, useState } from "react";
import axios from "axios";

const MyPayroll = () => {
  const token = localStorage.getItem("token");
  
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [viewingId, setViewingId] = useState(null); // New state for viewing loader
  const [message, setMessage] = useState({ text: "", type: "" });

  /* ===============================
      HELPER: SHOW MESSAGE
  =============================== */
  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  useEffect(() => {
    if (token) {
      fetchPayroll();
    } else {
      showMsg("Session expired. Please login again.");
    }
  }, [token]);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        "http://localhost:5000/api/employee/payroll",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPayrolls(res.data);
    } catch (err) {
      showMsg("Failed to load payroll records. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
      NEW: VIEW PAYSLIP FUNCTION
  =============================== */
  const viewPayslip = async (id) => {
    try {
      setViewingId(id);
      const response = await axios.get(
        `http://localhost:5000/api/payroll/${id}/payslip`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob"
        }
      );

      if (response.data.type === "application/json") {
          showMsg("Payslip file is currently unavailable.");
          return;
      }

      // Create a blob URL and open it in a new tab
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, "_blank");

    } catch (error) {
      showMsg("Unable to view payslip. Please try again.");
    } finally {
      setViewingId(null);
    }
  };

  const downloadPayslip = async (id, month, year) => {
    try {
      setDownloadingId(id);
      const response = await axios.get(
        `http://localhost:5000/api/payroll/${id}/payslip`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob"
        }
      );

      if (response.data.type === "application/json") {
          showMsg("Payslip file is currently unavailable.");
          return;
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Payslip_${month}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      link.remove();
      window.URL.revokeObjectURL(url);
      showMsg("Payslip downloaded successfully! ✅", "success");

    } catch (error) {
      showMsg("Unable to download payslip. The server might be busy. ❌");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div style={{
      padding: "40px",
      background: "#f8fafc",
      minHeight: "100vh",
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>

      {message.text && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          padding: "15px 25px",
          borderRadius: "8px",
          color: "#fff",
          backgroundColor: message.type === "success" ? "#10b981" : "#ef4444",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 1000,
          fontWeight: "600",
          transition: "all 0.3s ease"
        }}>
          {message.text}
        </div>
      )}

      <div style={{
        maxWidth: "1000px",
        margin: "0 auto",
        background: "#ffffff",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
      }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
            <h2 style={{ margin: 0, color: "#1e3a8a", fontSize: "24px" }}>
              My Payroll History
            </h2>
            {loading && <span style={{ color: "#64748b", fontSize: "14px" }}>Updating records...</span>}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0" }}>
            <thead>
              <tr style={{ backgroundColor: "#11284b" }}>
                <th style={tableHeaderStyle}>Month</th>
                <th style={tableHeaderStyle}>Year</th>
                <th style={tableHeaderStyle}>Net Salary</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={tableHeaderStyle}>Action</th>
              </tr>
            </thead>

            <tbody>
              {payrolls.length > 0 ? (
                payrolls.map((pay) => (
                  <tr key={pay._id} style={{ transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#fdfdfd"} onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                    <td style={tableCellStyle}>{pay.month}</td>
                    <td style={tableCellStyle}>{pay.year}</td>
                    <td style={{ ...tableCellStyle, fontWeight: "700", color: "#059669" }}>
                      ₹ {pay.netSalary?.toLocaleString('en-IN')}
                    </td>
                    <td style={tableCellStyle}>
                      <span style={{
                        padding: "5px 12px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        color: pay.status === "Paid" ? "#065f46" : "#92400e",
                        background: pay.status === "Paid" ? "#d1fae5" : "#fef3c7"
                      }}>
                        {pay.status}
                      </span>
                    </td>
                    <td style={{ ...tableCellStyle, display: "flex", gap: "10px", justifyContent: "center" }}>
                      {/* VIEW BUTTON */}
                      <button
                        onClick={() => viewPayslip(pay._id)}
                        disabled={viewingId === pay._id}
                        style={{
                          padding: "8px 16px",
                          background: viewingId === pay._id ? "#cbd5e1" : "#ffffff",
                          color: "#1e293b",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          cursor: viewingId === pay._id ? "not-allowed" : "pointer",
                          fontSize: "13px",
                          fontWeight: "600",
                          transition: "all 0.2s"
                        }}
                      >
                        {viewingId === pay._id ? "Opening..." : "View"}
                      </button>

                      {/* DOWNLOAD BUTTON */}
                      <button
                        onClick={() => downloadPayslip(pay._id, pay.month, pay.year)}
                        disabled={downloadingId === pay._id}
                        style={{
                          padding: "8px 16px",
                          background: downloadingId === pay._id ? "#94a3b8" : "#2563eb",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: downloadingId === pay._id ? "not-allowed" : "pointer",
                          fontSize: "13px",
                          fontWeight: "600",
                          transition: "all 0.2s"
                        }}
                      >
                        {downloadingId === pay._id ? "..." : "Download"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                    {loading ? "Fetching your payroll history..." : "No payroll records found for your account."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const tableHeaderStyle = {
  padding: "15px",
  textAlign: "center",
  fontSize: "14px",
  fontWeight: "600",
  borderBottom: "2px solid #e2e8f0",
  color: "#fff"
};

const tableCellStyle = {
  padding: "15px",
  textAlign: "center",
  fontSize: "15px",
  color: "#334155",
  borderBottom: "1px solid #f1f5f9"
};

export default MyPayroll;