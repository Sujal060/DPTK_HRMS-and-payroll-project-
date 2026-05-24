import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import AddEmployee from "./AddEmployees";
import EditEmployee from "./EditEmployee";
import ViewEmployee from "./ViewEmployee";
import "../../../style/admin/EmployeeList.css";

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [view, setView] = useState("list");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  const [message, setMessage] = useState({ text: "", type: "" });

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role")?.toLowerCase();
  
  // Get logged-in ID and clean it up to ensure accurate comparison
  const loggedInEmpId = localStorage.getItem("employeeId")?.trim().toUpperCase();

  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const sorted = res.data.sort((a, b) => {
        const numA = parseInt(a.employeeId?.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.employeeId?.replace(/\D/g, "")) || 0;
        return numA - numB;
      });

      setEmployees(sorted);
    } catch (error) {
      showMsg("Failed to synchronize employee data with server.");
    }
  }, [token]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this employee?"))
      return;

    try {
      await axios.delete(`http://localhost:5000/api/employees/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showMsg("Employee record deleted successfully ✅", "success");
      setEmployees((prev) => prev.filter((emp) => emp._id !== id));
    } catch (error) {
      showMsg(error.response?.data?.message || "Delete operation failed.");
    }
  };

  const handleSoftDelete = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate (soft delete) this employee?"))
      return;

    try {
      await axios.patch(`http://localhost:5000/api/employees/${id}/soft-delete`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showMsg("Employee deactivated successfully ✅", "success");
      fetchEmployees(); 
    } catch (error) {
      showMsg(error.response?.data?.message || "Soft delete operation failed.");
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const empIdUpper = emp.employeeId?.toUpperCase() || "";
    const isHrRecord = empIdUpper.startsWith("HR-DPTK");

    if (role === "admin" && isHrRecord) {
      return false;
    }
    
    const matchesSearch =
      emp.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" ? true : emp.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (view === "list") {
    return (
      <div className="employee-page">
        <div className="card-header">
          <h2>{role === "hr" ? "Employee Management" : "Employee Directory"}</h2>

          {(role === "admin" || role === "hr") && (
            <button
              className="add-btn"
              onClick={() => {
                setSelectedEmployee(null);
                setView("add");
              }}
            >
              + Add Employee
            </button>
          )}
        </div>

        {message.text && (
          <div style={{
            padding: '12px 20px', marginBottom: '15px', borderRadius: '8px',
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            fontSize: '14px', fontWeight: '600', textAlign: 'center'
          }}>
            {message.text}
          </div>
        )}

        <div className="filters-section">
          <input
            type="text"
            placeholder="Search by name, email or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="table-responsive">
          <table>
            <thead align="left">
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No records found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const currentId = emp.employeeId?.trim().toUpperCase();
                  const isHrRecord = currentId?.startsWith("HR-DPTK");
                  const displayName = `${emp.firstName || ""} ${emp.lastName || ""}`;
                  const departmentName = typeof emp.department === "object" ? emp.department?.name : emp.department || "N/A";

                  /* ==========================================================
                      PEER BLOCK LOGIC
                  ========================================================== */
                  // Block if: I am HR AND this row is HR AND this row is NOT me
                  const isOtherHR = role === "hr" && isHrRecord && currentId !== loggedInEmpId;

                  // DEBUG: Uncomment the line below to see why it's blocking in your console
                  // console.log(`Row: ${currentId} | LoggedIn: ${loggedInEmpId} | Block: ${isOtherHR}`);

                  return (
                    <tr key={emp._id}>
                      <td><strong>{emp.employeeId}</strong></td>
                      <td>{displayName.trim() || "Unnamed"}</td>
                      <td>{emp.email}</td>
                      <td>{emp.designation || "N/A"}</td>
                      <td>{departmentName}</td>
                      <td>
                        <span className={emp.status === "Active" ? "status-active" : "status-inactive"}>
                          {emp.status}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          {/* VIEW: Only if NOT a peer HR */}
                          {!isOtherHR ? (
                            <button className="view-btn" onClick={() => { setSelectedEmployee(emp); setView("view"); }}>
                              View
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', padding: '5px' }}>Protected</span>
                          )}

                          {/* EDIT: Allowed for Admin, OR HR if row is self or regular employee */}
                          {(role === "admin" || (role === "hr" && !isOtherHR)) && (
                            <button className="edit-btn" onClick={() => { setSelectedEmployee(emp); setView("edit"); }}>
                              Edit
                            </button>
                          )}

                          {/* DEACTIVATE: HR cannot deactivate any HR including self */}
                          {role === "hr" && !isHrRecord && (
                            <button 
                              className="soft-delete-btn" 
                              onClick={() => handleSoftDelete(emp._id)} 
                              style={{ backgroundColor: '#f97316', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Deactivate
                            </button>
                          )}

                          {role === "admin" && (
                            <button className="delete-btn" onClick={() => handleDelete(emp._id)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (view === "add") return <AddEmployee onBack={() => setView("list")} onSuccess={() => { fetchEmployees(); setView("list"); showMsg("Record added successfully! ✅", "success"); }} />;
  if (view === "edit") return <EditEmployee employeeId={selectedEmployee?._id} onBack={() => setView("list")} onSuccess={() => { fetchEmployees(); setView("list"); showMsg("Record updated successfully ✅", "success"); }} />;
  if (view === "view") return <ViewEmployee employee={selectedEmployee} onBack={() => setView("list")} />;

  return null;
};

export default EmployeeList;