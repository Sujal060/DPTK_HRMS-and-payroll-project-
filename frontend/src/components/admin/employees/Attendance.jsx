import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "../../../style/admin/EmployeeList.css";
import { FaSearch, FaFilter, FaTrashAlt, FaFileDownload, FaUsers, FaFileExcel } from "react-icons/fa";

// Import Excel Library
import * as XLSX from "xlsx";

const API = "http://localhost:5000/api";

const AttendanceHR = () => {
  const token = localStorage.getItem("token");
  const [attendanceList, setAttendanceList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  // New state for UI feedback
  const [message, setMessage] = useState({ text: "", type: "" });

  /* ===============================
      HELPER: SHOW MESSAGE FOR TIME
  =============================== */
  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000); // 5 seconds visibility
  };

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendanceList(res.data);
      setFilteredList(res.data);
    } catch (err) {
      showMsg("Failed to synchronize attendance data with server.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // --- EXPORT TO EXCEL ---
  const exportToExcel = () => {
    if (filteredList.length === 0) {
      showMsg("No records found for the current filters to export.");
      return;
    }

    try {
      const dataToExport = filteredList.map(item => ({
        "Employee Name": `${item.employeeId?.firstName || ""} ${item.employeeId?.lastName || ""}`,
        "Date": item.date,
        "Status": item.status,
        "Punch In": item.inTime || "--:--",
        "Punch Out": item.outTime || "--:--",
        "Remarks": item.remarks || ""
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
      
      const fileName = `DPTradeKing_Attendance_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      showMsg("Excel file generated successfully! ✅", "success");
      setShowExportOptions(false);
    } catch (err) {
      showMsg("Export failed. Please check if the data is valid.");
    }
  };

  useEffect(() => {
    let data = attendanceList;
    if (searchTerm) {
      data = data.filter(item => {
        const fullName = `${item.employeeId?.firstName || ""} ${item.employeeId?.lastName || ""}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
      });
    }
    if (dateFilter) {
      data = data.filter(item => item.date === dateFilter);
    }
    setFilteredList(data);
  }, [searchTerm, dateFilter, attendanceList]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this record?")) return;
    try {
      await axios.delete(`${API}/attendance/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMsg("Attendance record deleted successfully ✅", "success");
      fetchAttendance();
    } catch (err) {
      showMsg(err.response?.data?.message || "Delete operation failed.");
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const activeCount = attendanceList.filter(r => r.date === todayStr && r.inTime && !r.outTime).length;

  return (
    <div className="employee-page">
      <div className="employee-card" style={{ width: '95%', maxWidth: '1200px' }}>
        
        {/* MESSAGE DISPLAY COMPONENT */}
        {message.text && (
          <div style={{
            padding: '12px 20px',
            marginBottom: '15px',
            borderRadius: '8px',
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            fontSize: '14px',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            {message.text}
          </div>
        )}

        {/* LIVE SUMMARY TILES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: '#ecfdf5', padding: '15px', borderRadius: '12px', border: '1px solid #10b981', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: '#10b981', color: '#fff', padding: '10px', borderRadius: '50%', display: 'flex' }}><FaUsers /></div>
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: '#065f46', fontWeight: 'bold' }}>CURRENTLY ONLINE</p>
              <h3 style={{ margin: 0, color: '#065f46' }}>{activeCount} Employees</h3>
            </div>
          </div>
        </div>

        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <h2><FaFilter style={{ fontSize: '18px', marginRight: '10px' }} /> Master Attendance Log</h2>
          
          <div style={{ position: 'relative' }}>
            <button 
              className="add-btn" 
              onClick={() => setShowExportOptions(!showExportOptions)}
              style={{ background: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaFileDownload /> Export Data
            </button>

            {showExportOptions && (
              <div style={{
                position: 'absolute', top: '45px', right: '0', background: '#fff', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '8px', zIndex: 100, width: '180px', overflow: 'hidden'
              }}>
                <div onClick={exportToExcel} style={{ padding: '12px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', transition: '0.2s' }} className="export-item">
                  <FaFileExcel style={{ color: '#10b981' }} /> Download Excel (.xlsx)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* HR CONTROL PANEL */}
        <div className="filters-section" style={{ display: 'flex', gap: '15px', padding: '20px', background: '#f8fafc', borderRadius: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <FaSearch style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            <input 
              type="text" placeholder="Search employee..." 
              style={{ paddingLeft: '35px', width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0', height: '40px' }}
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <input 
            type="date" style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0 10px', height: '40px' }}
            value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          />
          <button onClick={() => {setSearchTerm(""); setDateFilter("");}} style={{ background: 'none', color: '#6366f1', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
            Reset Filters
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading Attendance Data...</div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead align="left">
                <tr style={{ background: 'linear-gradient(90deg, #11284b, #1d4ed8, #2563eb)', color: '#ffffff' }}>
                  <th style={{ padding: '15px' }}>Employee & Status</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Flags & Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length > 0 ? filteredList.map(record => {
                  const isCurrentlyIn = record.inTime && !record.outTime && record.date === todayStr;
                  return (
                    <tr key={record._id} style={{ background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ 
                            height: '10px', width: '10px', borderRadius: '50%', 
                            backgroundColor: isCurrentlyIn ? '#10b981' : '#cbd5e1',
                            boxShadow: isCurrentlyIn ? '0 0 8px #10b981' : 'none'
                          }}></span>
                          <div>
                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{record.employeeId?.firstName} {record.employeeId?.lastName}</div>
                            <small style={{ color: isCurrentlyIn ? '#10b981' : '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}>
                              {isCurrentlyIn ? "LOGGED IN" : "OFFLINE"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{record.date}</td>
                      <td>
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                          background: record.status === 'Present' ? '#dcfce7' : record.status === 'WFH' ? '#e0e7ff' : '#fee2e2',
                          color: record.status === 'Present' ? '#166534' : record.status === 'WFH' ? '#3730a3' : '#991b1b'
                        }}>
                          {record.status}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontWeight: '500' }}>{record.inTime || "--:--"}</td>
                      <td style={{ color: '#64748b', fontWeight: '500' }}>{record.outTime || (isCurrentlyIn ? "Active" : "--:--")}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {record.remarks?.includes("Early") && <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: 'bold' }}>⚠️ EARLY LEFT</span>}
                          {record.remarks?.includes("Overtime") && <span style={{ color: '#10b981', fontSize: '10px', fontWeight: 'bold' }}>⭐ OVERTIME</span>}
                          <small style={{ color: '#64748b', fontSize: '11px' }}>{record.remarks || "No remarks"}</small>
                        </div>
                      </td>
                      <td>
                        <button onClick={() => handleDelete(record._id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                          <FaTrashAlt />
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No attendance records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceHR;