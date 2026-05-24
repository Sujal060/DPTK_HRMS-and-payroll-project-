import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../../style/admin/EmployeeList.css";

const DepartmentList = () => {
  const token = localStorage.getItem("token");

  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Active");
  const [search, setSearch] = useState("");
  
  // New state for specific UI feedback
  const [message, setMessage] = useState({ text: "", type: "" });

  /* ===============================
      HELPER: SHOW MESSAGE FOR TIME
  =============================== */
  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000); // 5 seconds duration
  };

  /* ================= FETCH ================= */
  const fetchDepartments = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/departments",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDepartments(res.data);
    } catch (err) {
      showMsg("Failed to load department records from server.");
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  /* ================= ADD ================= */
  const handleAdd = async (e) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      showMsg("Department name cannot be empty.");
      return;
    }

    if (name.trim().length < 2) {
      showMsg("Department name must be at least 2 characters long.");
      return;
    }

    try {
      await axios.post(
        "http://localhost:5000/api/departments",
        { name: name.trim(), status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showMsg("Department added successfully! ✅", "success");
      setName("");
      setStatus("Active");
      fetchDepartments();
    } catch (err) {
      const errorResponse = err.response?.data?.message || "Failed to create department.";
      showMsg(errorResponse);
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department? This may affect linked employees.")) return;

    try {
      await axios.delete(
        `http://localhost:5000/api/departments/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showMsg("Department deleted successfully ✅", "success");
      fetchDepartments();
    } catch (err) {
      showMsg("Unable to delete department. It may be in use.");
    }
  };

  /* ================= SEARCH FILTER ================= */
  const filteredDepartments = departments.filter((dept) =>
    dept.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="employee-page">
      <div className="card-header">
        <h2>Department Management</h2>
      </div>

      {/* MESSAGE BOX */}
      {message.text && (
        <div style={{
          padding: '12px',
          margin: '10px 0',
          borderRadius: '6px',
          textAlign: 'center',
          fontWeight: 'bold',
          backgroundColor: message.type === 'success' ? '#e6fffa' : '#fff5f5',
          color: message.type === 'success' ? '#2c7a7b' : '#c53030',
          border: `1px solid ${message.type === 'success' ? '#38b2ac' : '#fc8181'}`,
          transition: 'all 0.3s ease'
        }}>
          {message.text}
        </div>
      )}

      {/* ================= ADD FORM ================= */}
      <div className="filters-section">
        <input
          type="text"
          placeholder="Department Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <button className="add-btn" onClick={handleAdd}>
          Add Department
        </button>
      </div>

      {/* ================= SEARCH ================= */}
      <div className="filters-section">
        <input
          type="text"
          placeholder="Search Department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {/* ================= TABLE ================= */}
      <div className="table-responsive">
        <table>
          <thead align="left">
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredDepartments.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                  No departments found
                </td>
              </tr>
            ) : (
              filteredDepartments.map((dept) => (
                <tr key={dept._id}>
                  <td>{dept.name}</td>
                  <td>
                    <span
                      className={
                        dept.status === "Active"
                          ? "status-active"
                          : "status-inactive"
                      }
                    >
                      {dept.status}
                    </span>
                  </td>
                  <td>
                    {new Date(dept.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button 
                      onClick={() => handleDelete(dept._id)}
                      style={{ 
                        color: '#e53e3e', 
                        background: 'none', 
                        border: '1px solid #e53e3e',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepartmentList;