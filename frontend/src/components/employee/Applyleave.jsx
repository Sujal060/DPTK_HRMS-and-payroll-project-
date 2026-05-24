import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../style/employee/ApplyLeave.css";

const ApplyLeave = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // --- UPDATED URL LOGIC ---
  // If testing on the same computer, use "http://localhost:5000"
  // If testing on a mobile device, ensure this matches your current PC IP
  const API_BASE_URL = "http://localhost:5000"; 

  const [formData, setFormData] = useState({
    fromDate: "",
    toDate: "",
    reason: ""
  });

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  useEffect(() => {
    if (!token) {
      navigate("/");
    } else {
      fetchLeaves();
    }
  }, [token, navigate]);

  const fetchLeaves = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/leaves`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sortedLeaves = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLeaves(sortedLeaves);
    } catch (err) {
      showMsg("Could not load leave history.");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const today = new Date().setHours(0, 0, 0, 0);
    
    if (new Date(formData.fromDate).getTime() < today) {
      return showMsg("You cannot apply for a past date.");
    }
    if (new Date(formData.toDate) < new Date(formData.fromDate)) {
      return showMsg("To Date must be after From Date.");
    }

    try {
      setLoading(true);
      
      // 1. Save to Database
      const dbRes = await axios.post(`${API_BASE_URL}/api/leaves`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Safely extract the ID
      const leaveId = dbRes.data.leave?._id || dbRes.data._id;

      // 2. Send Email to HR
      await axios.post(`${API_BASE_URL}/api/leaves/send-email`, {
        ...formData,
        leaveId: leaveId, 
        totalDays: calculateDays(formData.fromDate, formData.toDate)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showMsg("Applied successfully and HR notified via Email! ✅", "success");
      setFormData({ fromDate: "", toDate: "", reason: "" });
      fetchLeaves(); 
    } catch (err) {
      console.error("Submission error:", err);
      showMsg(err.response?.data?.message || "Failed to process request. ❌");
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Approved": return "status-approved";
      case "Rejected": return "status-rejected";
      default: return "status-pending";
    }
  };

  return (
    <div className="leave-page">
      <div className="leave-card">
        <h2 className="leave-title">Leave Management</h2>

        {message.text && (
          <div className={`leave-message ${message.type === 'success' ? 'msg-success' : 'msg-error'}`} 
               style={{
                  padding: '12px', marginBottom: '20px', borderRadius: '8px', textAlign: 'center',
                  fontWeight: '600', backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  color: message.type === 'success' ? '#166534' : '#991b1b',
                  border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`
               }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="leave-form">
          <div className="leave-row">
            <div className="leave-field">
              <label>From Date</label>
              <input type="date" name="fromDate" value={formData.fromDate} onChange={handleChange} required />
            </div>
            <div className="leave-field">
              <label>To Date</label>
              <input type="date" name="toDate" value={formData.toDate} onChange={handleChange} required />
            </div>
          </div>

          {formData.fromDate && formData.toDate && (
            <p style={{ fontSize: '14px', color: '#6366f1', fontWeight: '600', marginBottom: '15px' }}>
              Total Duration: {calculateDays(formData.fromDate, formData.toDate)} Day(s)
            </p>
          )}

          <div className="leave-field full-width">
            <label>Reason for Leave</label>
            <textarea name="reason" rows="3" value={formData.reason} onChange={handleChange} required />
          </div>

          <button type="submit" disabled={loading} className="leave-btn" style={{ background: '#6366f1' }}>
            {loading ? "Sending Notification..." : "Submit & Notify HR via Email 📧"}
          </button>
        </form>

        <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '30px 0' }} />

        <h3 className="leave-history-title">My Application History</h3>
        <div className="leave-table-wrapper">
          <table className="leave-table">
            <thead align="left">
              <tr>
                <th>Date Range</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave) => (
                <tr key={leave._id}>
                  <td>{new Date(leave.fromDate).toLocaleDateString()} - {new Date(leave.toDate).toLocaleDateString()}</td>
                  <td>{calculateDays(leave.fromDate, leave.toDate)}</td>
                  <td>{leave.reason}</td>
                  <td><span className={`status-badge ${getStatusClass(leave.status)}`}>{leave.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApplyLeave;