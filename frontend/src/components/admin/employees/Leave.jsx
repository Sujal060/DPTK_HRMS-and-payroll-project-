import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../../style/admin/EmployeeList.css";

const AdminLeave = () => {
  const token = localStorage.getItem("token");

  const [leaves, setLeaves] = useState([]);
  const [search, setSearch] = useState("");
  
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

  /* ================= FETCH LEAVES ================= */
  const fetchLeaves = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/leaves",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLeaves(res.data);
    } catch (err) {
      showMsg("Failed to synchronize leave requests from the server.");
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  /* ================= UPDATE STATUS ================= */
  const updateStatus = async (id, status) => {
    try {
      await axios.put(
        `http://localhost:5000/api/leaves/${id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showMsg(`Leave request ${status.toLowerCase()} successfully ✅`, "success");
      fetchLeaves();
    } catch (err) {
      showMsg(`Failed to update leave status to ${status}.`);
    }
  };

  /* ================= DELETE ================= */
 const handleDelete = async (id) => {
  if (!window.confirm("Are you sure you want to permanently delete this leave record?")) return;

  try {
    await axios.delete(
      `http://localhost:5000/api/leaves/${id}`,
      { 
        headers: { 
          Authorization: `Bearer ${token}` 
        } 
      }
    );
    
    showMsg("Leave record removed from database ✅", "success");
    fetchLeaves(); // Refresh the list after deletion
    
  } catch (err) {
    // Better error handling: capture the message from your backend response
    const errorMsg = err.response?.data?.message || "Delete operation failed. Please try again.";
    showMsg(errorMsg, "error");
    console.error("Delete Error:", err);
  }
};

  /* ================= SEARCH FILTER ================= */
  const filteredLeaves = leaves.filter((leave) => {
    const firstName = leave.employeeId?.firstName || "";
    const lastName = leave.employeeId?.lastName || "";
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  return (
    <div className="employee-page">
      <div className="employee-card">
        <div className="card-header">
          <h2>Leave Management</h2>
        </div>

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

        {/* ================= SEARCH ================= */}
        <div className="filters-section">
          <input
            type="text"
            placeholder="🔍 Search by employee name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', maxWidth: '400px' }}
          />
        </div>

        {/* ================= TABLE ================= */}
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead align="left">
              <tr>
                <th>Employee</th>
                <th>From</th>
                <th>To</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Applied On</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                    No leave requests matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((leave) => (
                  <tr key={leave._id}>
                    <td>
                      <strong>
                        {leave.employeeId?.firstName}{" "}
                        {leave.employeeId?.lastName}
                      </strong>
                    </td>

                    <td>{new Date(leave.fromDate).toLocaleDateString()}</td>
                    <td>{new Date(leave.toDate).toLocaleDateString()}</td>
                    <td>{leave.reason}</td>

                    <td>
                      <span
                        className={
                          leave.status === "Approved"
                            ? "status-active"
                            : "status-inactive"
                        }
                      >
                        {leave.status}
                      </span>
                    </td>

                    <td>
                      {leave.createdAt 
                        ? new Date(leave.createdAt).toLocaleDateString() 
                        : "N/A"}
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {leave.status === "Pending" && (
                          <>
                            <button
                              className="generate-btn"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => updateStatus(leave._id, "Approved")}
                            >
                              Approve
                            </button>

                            <button
                              className="delete-btn"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => updateStatus(leave._id, "Rejected")}
                            >
                              Reject
                            </button>
                          </>
                        )}

                        <button
                          className="view-btn"
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '12px',
                            background: leave.status === 'Pending' ? '#64748b' : undefined 
                          }}
                          onClick={() => handleDelete(leave._id)}
                        >
                          Delete
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

export default AdminLeave;