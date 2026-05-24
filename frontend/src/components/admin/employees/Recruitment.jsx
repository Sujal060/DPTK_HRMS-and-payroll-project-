import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../../style/admin/EmployeeList.css";

const Recruitment = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [candidates, setCandidates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  
  // New state for UI feedback
  const [message, setMessage] = useState({ text: "", type: "" });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    status: "Applied",
    interviewDate: "",
    remarks: ""
  });

  const today = new Date().toISOString().split("T")[0];

  /* ===============================
      HELPER: SHOW MESSAGE FOR TIME
  =============================== */
  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  /* ================= FETCH DATA ================= */
  const fetchCandidates = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/recruitment",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCandidates(res.data);
    } catch (err) {
      showMsg("Failed to load recruitment data.");
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  /* ================= HANDLE INPUT ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    let updated = {
      ...formData,
      [name]: value
    };

    /* Auto schedule interview date */
    if (name === "status" && value === "Interview Scheduled") {
      let date = new Date();
      date.setDate(date.getDate() + 2);

      /* Skip weekend */
      while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
      }
      updated.interviewDate = date.toISOString().split("T")[0];
    }

    setFormData(updated);
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic Validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.position.trim()) {
      showMsg("Please fill in Name, Email, and Position.");
      return;
    }

    try {
      if (editingId) {
        await axios.put(
          `http://localhost:5000/api/recruitment/${editingId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showMsg("Candidate profile updated successfully ✅", "success");
      } else {
        await axios.post(
          "http://localhost:5000/api/recruitment",
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showMsg("New candidate added to pipeline ✅", "success");
      }

      setFormData({
        name: "",
        email: "",
        position: "",
        status: "Applied",
        interviewDate: "",
        remarks: ""
      });
      setEditingId(null);
      fetchCandidates();
    } catch (err) {
      showMsg(err.response?.data?.message || "Operation failed.");
    }
  };

  /* ================= EDIT ================= */
  const handleEdit = (candidate) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setFormData({
      name: candidate.name,
      email: candidate.email,
      position: candidate.position,
      status: candidate.status,
      interviewDate: candidate.interviewDate?.split("T")[0] || "",
      remarks: candidate.remarks || ""
    });
    setEditingId(candidate._id);
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this candidate?")) return;
    try {
      await axios.delete(
        `http://localhost:5000/api/recruitment/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMsg("Candidate record removed ✅", "success");
      fetchCandidates();
    } catch (err) {
      showMsg("Delete operation failed.");
    }
  };

  /* ================= DATE VALIDATION ================= */
  const handleDateChange = (e) => {
    const selectedDate = new Date(e.target.value);
    const day = selectedDate.getDay();

    if (day === 0 || day === 6) {
      showMsg("Interviews cannot be scheduled on weekends (Sat/Sun).");
      return;
    }

    setFormData({
      ...formData,
      interviewDate: e.target.value
    });
  };

  return (
    <div className="employee-page">
      <div className="employee-card">
        <div className="card-header">
          <h2>Recruitment Management</h2>
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

        {/* ================= FORM ================= */}
        {role === "hr" && (
          <form className="filters-section" onSubmit={handleSubmit} style={{ flexWrap: "wrap", gap: '10px' }}>
            <input
              type="text"
              name="name"
              placeholder="Candidate Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Candidate Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="position"
              placeholder="Position"
              value={formData.position}
              onChange={handleChange}
              required
            />
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="Applied">Applied</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Interview Scheduled">Interview Scheduled</option>
              <option value="Selected">Selected</option>
              <option value="Rejected">Rejected</option>
            </select>
            <textarea
              name="remarks"
              placeholder="Remarks"
              value={formData.remarks}
              onChange={handleChange}
              style={{ minWidth: "200px", height: '38px', padding: '8px' }}
            />
            <div style={{ display: 'flex', gap: '5px' }}>
              <button type="submit" className="add-btn">
                {editingId ? "Update" : "Add"}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  className="cancel-btn"
                  style={{ backgroundColor: '#718096' }}
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ name: "", email: "", position: "", status: "Applied", interviewDate: "", remarks: "" });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {/* ================= TABLE ================= */}
        <div className="table-responsive">
          <table>
            <thead align="left">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Position</th>
                <th>Status</th>
                <th>Interview</th>
                <th>Remarks</th>
                {role === "hr" && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={role === "hr" ? "7" : "6"} style={{ textAlign: 'center', padding: '20px' }}>
                    No candidates found in the pipeline.
                  </td>
                </tr>
              ) : (
                candidates.map(candidate => (
                  <tr key={candidate._id}>
                    <td><strong>{candidate.name}</strong></td>
                    <td>{candidate.email}</td>
                    <td>{candidate.position}</td>
                    <td>
                      <span className={
                        candidate.status === "Selected" ? "status-active" : 
                        candidate.status === "Rejected" ? "status-inactive" : "status-pending"
                      }>
                        {candidate.status}
                      </span>
                    </td>
                    <td>{candidate.interviewDate ? candidate.interviewDate.split("T")[0] : "-"}</td>
                    <td>{candidate.remarks || "-"}</td>
                    {role === "hr" && (
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="edit-btn" onClick={() => handleEdit(candidate)}>Edit</button>
                          <button className="delete-btn" onClick={() => handleDelete(candidate._id)}>Delete</button>
                        </div>
                      </td>
                    )}
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

export default Recruitment;