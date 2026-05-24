import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
// Added icons for the leadership section
import { FaTrophy, FaMedal, FaCrown, FaUsers } from "react-icons/fa";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
  ResponsiveContainer, Legend
} from "recharts";
import "../../../style/admin/EmployeeList.css";

const API = "http://localhost:5000/api";

const Reports = () => {
  const token = localStorage.getItem("token");
  const chartContainerRef = useRef(null); 

  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });

  // --- NEW: LEADERSHIP DATA LOGIC ---
  const topPerformers = useMemo(() => {
    return [...employees]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 5); // Get Top 5
  }, [employees]);

  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const [empRes, attRes, leaveRes, payrollRes] = await Promise.all([
        axios.get(`${API}/employees`, { headers }),
        axios.get(`${API}/attendance`, { headers }),
        axios.get(`${API}/leaves`, { headers }),
        axios.get(`${API}/payroll`, { headers })
      ]);
      
      setEmployees(empRes.data || []);
      setAttendance(attRes.data || []);
      setLeaves(leaveRes.data || []);
      setPayrolls(payrollRes.data || []);
    } catch (err) {
      showMsg("Critical error: Unable to synchronize organizational data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const attendanceData = useMemo(() => [
    { name: "Present", value: attendance.filter(a => a.status?.toLowerCase() === "present").length },
    { name: "Absent", value: attendance.filter(a => a.status?.toLowerCase() === "absent").length },
    { name: "Half-Day", value: attendance.filter(a => a.status?.toLowerCase() === "half-day").length },
    { name: "WFH", value: attendance.filter(a => a.status?.toLowerCase() === "wfh").length }
  ], [attendance]);

  const leaveData = useMemo(() => [
    { name: "Approved", value: leaves.filter(l => l.status === "Approved").length },
    { name: "Pending", value: leaves.filter(l => l.status === "Pending").length },
    { name: "Rejected", value: leaves.filter(l => l.status === "Rejected").length }
  ], [leaves]);

  const filteredPayroll = payrolls.filter(p =>
    (!month || p.month === Number(month)) && (!year || p.year === Number(year))
  );

  const totalPaid = filteredPayroll
    .filter(p => p.status === "Paid")
    .reduce((acc, p) => acc + p.netSalary, 0);

  const exportFullReport = async () => {
    try {
      showMsg("Generating visual report... Please wait.", "success");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Visual Analytics");

      sheet.addRow(["DP TradeKING ORGANIZATIONAL REPORT"]);
      sheet.addRow(["Date:", new Date().toLocaleDateString()]);
      sheet.addRow([]);
      sheet.addRow(["Metric", "Value"]);
      sheet.addRow(["Total Workforce", employees.length]);
      sheet.addRow(["Total Payroll Paid", `₹${totalPaid}`]);
      sheet.addRow([]);

      if (chartContainerRef.current) {
        const canvas = await html2canvas(chartContainerRef.current);
        const base64Image = canvas.toDataURL("image/png");
        const imageId = workbook.addImage({ base64: base64Image, extension: 'png' });
        sheet.addImage(imageId, { tl: { col: 0, row: 9 }, ext: { width: 800, height: 400 } });
      }

      // --- NEW: ADD LEADERSHIP TO EXCEL ---
      const leaderSheet = workbook.addWorksheet("Leadership Board");
      leaderSheet.columns = [
        { header: 'Rank', key: 'rank' },
        { header: 'Employee Name', key: 'name' },
        { header: 'Department', key: 'dept' },
        { header: 'Points', key: 'points' }
      ];
      topPerformers.forEach((e, i) => leaderSheet.addRow({
        rank: i + 1,
        name: `${e.firstName} ${e.lastName}`,
        dept: typeof e.department === 'object' ? e.department.name : e.department,
        points: e.points || 0
      }));

      const empSheet = workbook.addWorksheet("Employee List");
      empSheet.columns = [
        { header: 'ID', key: 'id' },
        { header: 'Name', key: 'name' },
        { header: 'Email', key: 'email' },
        { header: 'Dept', key: 'dept' }
      ];
      employees.forEach(e => empSheet.addRow({ 
        id: e.employeeId, 
        name: `${e.firstName} ${e.lastName}`, 
        email: e.email, 
        dept: typeof e.department === 'object' ? e.department.name : e.department 
      }));

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `DPTradeKing_FullReport_${new Date().toISOString().split('T')[0]}.xlsx`);
      showMsg("Report downloaded successfully! ✅", "success");
    } catch (error) {
      showMsg("Export failed: Visual charts could not be processed.");
    }
  };

  const COLORS = ["#6366f1", "#f43f5e", "#fbbf24", "#10b981"];

  if (loading) return <div style={{ padding: "50px", textAlign: "center", color: "#6366f1", fontWeight: "600" }}>Synchronizing Data Hub...</div>;

  return (
    <div className="reports-wrapper" style={{ padding: "25px", backgroundColor: "#f1f5f9", minHeight: "100vh" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", background: "#fff", padding: "20px 30px", borderRadius: "16px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>Organizational Insights</h1>
          <p style={{ margin: "5px 0 0", color: "#64748b" }}>Workforce & Financial Analytics for DP TradeKING</p>
        </div>
        <button onClick={exportFullReport} style={{ backgroundColor: "#6366f1", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "10px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)" }}>
          ⬇ Export Full Report (with Visual Charts)
        </button>
      </div>

      {message.text && (
        <div style={{ padding: '12px', margin: '0 0 20px 0', borderRadius: '12px', textAlign: 'center', fontWeight: '600', backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', color: message.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, }}>
          {message.text}
        </div>
      )}

      {/* STATS CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        <div style={{ background: "#fff", padding: "25px", borderRadius: "16px", borderLeft: "6px solid #6366f1" }}>
          <p style={{ margin: 0, color: "#64748b" }}>Total Employees</p>
          <h2 style={{ margin: "10px 0 0", color: "#1e293b" }}>{employees.length}</h2>
        </div>
        <div style={{ background: "#fff", padding: "25px", borderRadius: "16px", borderLeft: "6px solid #10b981" }}>
          <p style={{ margin: 0, color: "#64748b" }}>Payroll Paid (Filtered)</p>
          <h2 style={{ margin: "10px 0 0", color: "#1e293b" }}>₹{totalPaid.toLocaleString()}</h2>
        </div>
        <div style={{ background: "#fff", padding: "25px", borderRadius: "16px", borderLeft: "6px solid #f59e0b" }}>
          <p style={{ margin: 0, color: "#64748b" }}>Active Leaves</p>
          <h2 style={{ margin: "10px 0 0", color: "#1e293b" }}>{leaves.filter(l => l.status === "Pending").length}</h2>
        </div>
      </div>

      {/* --- NEW: PERFORMANCE LEADERSHIP BOARD SECTION --- */}
      <div style={{ background: "#fff", borderRadius: "20px", padding: "30px", marginBottom: "30px" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
          <FaTrophy style={{ color: '#f59e0b', fontSize: '24px' }} />
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>Performance Leadership Board</h2>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          {/* Top Rankings Table */}
          <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "15px" }}>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>
                   <th style={{ padding: '10px' }}>Rank</th>
                   <th style={{ padding: '10px' }}>Employee</th>
                   <th style={{ padding: '10px' }}>Points</th>
                 </tr>
               </thead>
               <tbody>
                 {topPerformers.map((emp, index) => (
                   <tr key={emp._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                     <td style={{ padding: '12px' }}>
                       {index === 0 ? <FaCrown color="#fbbf24" /> : index === 1 ? <FaMedal color="#94a3b8" /> : index === 2 ? <FaMedal color="#cd7f32" /> : `#${index + 1}`}
                     </td>
                     <td style={{ padding: '12px', fontWeight: '500', fontSize: '14px' }}>{emp.firstName} {emp.lastName}</td>
                     <td style={{ padding: '12px', color: '#10b981', fontWeight: 'bold' }}>{emp.points || 0}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>

          {/* Quick Highlight Card */}
          <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', padding: '25px', borderRadius: '15px', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
             <FaUsers size={40} style={{ marginBottom: '15px', opacity: '0.8' }} />
             <h3 style={{ margin: '0 0 10px 0' }}>Top Performer</h3>
             <h1 style={{ margin: 0, fontSize: '28px' }}>{topPerformers[0]?.firstName || "N/A"}</h1>
             <p style={{ margin: '5px 0 0 0', opacity: '0.9', fontSize: '14px' }}>{topPerformers[0]?.designation}</p>
             <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.2)', padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold' }}>
               {topPerformers[0]?.points || 0} Total Points
             </div>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div style={{ background: "#fff", borderRadius: "20px", padding: "30px" }}>
        <div style={{ display: "flex", gap: "15px", marginBottom: "40px" }}>
          <input type="number" placeholder="MM" value={month} onChange={(e) => setMonth(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "80px" }} />
          <input type="number" placeholder="YYYY" value={year} onChange={(e) => setYear(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "100px" }} />
          <button onClick={() => {setMonth(""); setYear("");}} style={{background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: '600'}}>Clear Filter</button>
        </div>

        <div ref={chartContainerRef} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "40px", backgroundColor: "#fff" }}>
          <div style={{ padding: "20px", borderRadius: "15px", background: "#f8fafc" }}>
            <h3 style={{ fontSize: "16px", color: "#334155", marginBottom: "20px" }}>Attendance Breakdown</h3>
            {attendance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>No Attendance Found</div>
            )}
          </div>

          <div style={{ padding: "20px", borderRadius: "15px", background: "#f8fafc" }}>
            <h3 style={{ fontSize: "16px", color: "#334155", marginBottom: "20px" }}>Leave Status Ratio</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={leaveData} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                  {leaveData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;