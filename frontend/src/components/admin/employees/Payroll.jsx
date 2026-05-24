import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "../../../style/admin/EmployeeList.css";

const AdminPayroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    hraPercent: "",
    daPercent: "",
    pfPercent: "",
    taxPercent: ""
  });
  const [showSettings, setShowSettings] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    month: "",
    year: "",
    bonus: "",
    otherDeductions: ""
  });

  // New state for UI feedback
  const [message, setMessage] = useState({ text: "", type: "" });

  const role = localStorage.getItem("role"); 
  const token = localStorage.getItem("token");
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  /* ===============================
      HELPER: SHOW MESSAGE FOR TIME
  =============================== */
  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  /* ================= Fetch Employees ================= */
  const fetchEmployees = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/employees",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEmployees(res.data);
    } catch (err) {
      showMsg("Failed to load employee list.");
    }
  };

  /* ================= Fetch Payroll ================= */
  const fetchPayroll = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/payroll",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPayrolls(res.data);
    } catch (err) {
      showMsg("Failed to load payroll records.");
    }
  };

  /* ================= Fetch Payroll Settings ================= */
  const fetchSettings = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/payroll-settings",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data) setSettings(res.data);
    } catch (err) {
      showMsg("Could not fetch payroll configuration.");
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchPayroll();
    fetchSettings();
  }, []);

  /* ================= Form Handlers ================= */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSettingChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  /* ================= Update Payroll Settings (ADMIN) ================= */
  const updateSettings = async (e) => {
    e.preventDefault();
    
    // Validation: Ensure values aren't negative
    if (Object.values(settings).some(val => val < 0)) {
      showMsg("Percentage values cannot be negative.");
      return;
    }

    try {
      await axios.put(
        "http://localhost:5000/api/payroll-settings",
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMsg("Payroll settings updated successfully ✅", "success");
      setShowSettings(false);
    } catch (err) {
      showMsg("Failed to update settings. Please check your permissions.");
    }
  };

  /* ================= HR Request ================= */
  const requestUpdate = async () => {
  try {
    // Replace with your actual API endpoint and token logic
    const token = localStorage.getItem("token"); 
    
    const response = await axios.post(
      "http://localhost:5000/api/payroll-settings", 
      { message: "HR is requesting to update the payroll monthly constants." },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.status === 200) {
      showMsg("Request sent to Admin via Email. ✅", "success");
    }
  } catch (error) {
    console.error("Request failed", error);
    showMsg("Failed to send request. Please try again.", "error");
  }
};

  /* ================= Generate Payroll ================= */
  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.month || !formData.year) {
      showMsg("Please select Employee, Month, and Year.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        "http://localhost:5000/api/payroll",
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMsg("Payroll Generated successfully! ✅", "success");
      setFormData({
        employeeId: "",
        month: "",
        year: "",
        bonus: "",
        otherDeductions: ""
      });
      fetchPayroll();
    } catch (err) {
      showMsg(err.response?.data?.message || "Error generating payroll.");
    }
    setLoading(false);
  };

  /* ================= Delete Payroll ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payroll record?")) return;
    try {
      await axios.delete(
        `http://localhost:5000/api/payroll/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMsg("Payroll record removed. ✅", "success");
      fetchPayroll();
    } catch (err) {
      showMsg("Delete failed. The record might be protected.");
    }
  };

  /* ================= Pay Salary ================= */
  const handlePay = async (id) => {
    try {
      await axios.put(
        `http://localhost:5000/api/payroll/${id}/pay`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMsg("Salary status updated to PAID ✅", "success");
      fetchPayroll();
    } catch (err) {
      showMsg("Payment update failed.");
    }
  };

  /* ================= Payslip Download ================= */
  const handleDownload = async (id, employeeName, month, year) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/payroll/${id}/payslip`,
        {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Payslip_${employeeName}_${month}_${year}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showMsg("Payslip download started. ✅", "success");
    } catch (err) {
      showMsg("Download failed. PDF might not be generated yet.");
    }
  };

  return (
    <div className="employee-page">
      <div className="employee-card">
        <div className="card-header">
          <h2>Payroll Management</h2>

          {role === "admin" && (
            <button className="generate-btn" onClick={() => setShowSettings(!showSettings)}>
              {showSettings ? "Close Settings" : "Payroll Settings"}
            </button>
          )}

          {role === "hr" && (
            <button className="generate-btn" onClick={requestUpdate}>
              Request Settings Update
            </button>
          )}
        </div>

        {/* MESSAGE BOX */}
        {message.text && (
          <div style={{
            padding: '12px',
            margin: '10px 0',
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

        {/* ================= ADMIN SETTINGS FORM ================= */}
        {showSettings && role === "admin" && (
          <form className="filters-section" onSubmit={updateSettings} style={{ flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <label>HRA %</label>
              <input type="number" name="hraPercent" value={settings.hraPercent} onChange={handleSettingChange} style={{ width: '80px' }} />
            </div>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <label>DA %</label>
              <input type="number" name="daPercent" value={settings.daPercent} onChange={handleSettingChange} style={{ width: '80px' }} />
            </div>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <label>PF %</label>
              <input type="number" name="pfPercent" value={settings.pfPercent} onChange={handleSettingChange} style={{ width: '80px' }} />
            </div>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <label>Tax %</label>
              <input type="number" name="taxPercent" value={settings.taxPercent} onChange={handleSettingChange} style={{ width: '80px' }} />
            </div>
            <button className="generate-btn" style={{ backgroundColor: '#2d3748' }}>Update Settings</button>
          </form>
        )}

        {/* ================= PAYROLL GENERATION FORM ================= */}
        <form className="filters-section" onSubmit={handleGenerate}>
          <select name="employeeId" value={formData.employeeId} onChange={handleChange} required>
            <option value="">Select Employee</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.employeeId} - {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>

          <select name="month" value={formData.month} onChange={handleChange} required>
            <option value="">Month</option>
            {months.map((m, i) => {
              const num = i + 1;
              // Only allow payroll generation for past months or current month
              if (num > currentMonth) return null;
              return <option key={num} value={num}>{m}</option>;
            })}
          </select>

          <select name="year" value={formData.year} onChange={handleChange} required>
            <option value="">Year</option>
            <option value={currentYear}>{currentYear}</option>
            <option value={currentYear - 1}>{currentYear - 1}</option>
          </select>

          <input
            type="number"
            name="bonus"
            placeholder="Bonus (₹)"
            value={formData.bonus}
            onChange={handleChange}
          />
          <input
            type="number"
            name="otherDeductions"
            placeholder="Deductions (₹)"
            value={formData.otherDeductions}
            onChange={handleChange}
          />
          <button className="generate-btn" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? "Generating..." : "Generate Payroll"}
          </button>
        </form>

        {/* ================= PAYROLL TABLE ================= */}
        <div className="table-responsive">
          <table>
            <thead align="left">
              <tr>
                <th>Employee</th>
                <th>Month</th>
                <th>Year</th>
                <th>Gross</th>
                <th>Net</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No payroll records found</td>
                </tr>
              ) : (
                payrolls.map((p) => (
                  <tr key={p._id}>
                    <td><strong>{p.employeeId?.firstName} {p.employeeId?.lastName}</strong></td>
                    <td>{months[p.month - 1]}</td>
                    <td>{p.year}</td>
                    <td>₹ {p.grossSalary}</td>
                    <td>₹ {p.netSalary}</td>
                    <td>
                      <span className={p.status === "Paid" ? "status-active" : "status-inactive"}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {p.status !== "Paid" && (
                          <>
                            <button className="view-btn" style={{ backgroundColor: '#48bb78' }} onClick={() => handlePay(p._id)}>Pay</button>
                            <button className="delete-btn" onClick={() => handleDelete(p._id)}>Delete</button>
                          </>
                        )}
                        <button
                          className="view-btn"
                          onClick={() =>
                            handleDownload(
                              p._id,
                              `${p.employeeId?.firstName}_${p.employeeId?.lastName}`,
                              months[p.month - 1],
                              p.year
                            )
                          }
                        >
                          Payslip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPayroll;