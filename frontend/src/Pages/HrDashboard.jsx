import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../style/Dashboard.css";

// --- RECHARTS IMPORTS ---
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";

import EmployeeList from "../components/admin/employees/EmployeeList.jsx";
import Attendance from "../components/admin/employees/Attendance.jsx";
import DepartmentList from "../components/admin/employees/Department.jsx";
import LeaveManagement from "../components/admin/employees/Leave.jsx";
import PayrollManagement from "../components/admin/employees/Payroll.jsx";
import Reports from "../components/admin/employees/Reports.jsx";
import Performance from "../components/admin/employees/Performance.jsx";
import Recruitment from "../components/admin/employees/Recruitment.jsx";

// --- IMPORT YOUR PROFILE COMPONENT ---
import MyProfile from "../components/employee/MyProfile.jsx"; 

import logo from "../assets/images/dplogo3.png";

import {
  FaHome, FaUsers, FaCalendarCheck, FaFileAlt, FaChartBar, FaSignOutAlt,
  FaBell, FaSun, FaMoon, FaBuilding, FaMoneyBillWave, FaStar, FaUserPlus,
  FaFingerprint, FaMapMarkerAlt, FaUserCircle
} from "react-icons/fa";

const API = "http://localhost:5000/api";

const HrDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role") || "HR";

  const [activeMenu, setActiveMenu] = useState("Home");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const [userData, setUserData] = useState(null);
  const [homeStats, setHomeStats] = useState({
    employees: 0,
    departments: 0,
    present: 0,
    pendingLeaves: 0,
    attendanceTrend: [],
    deptDistribution: []
  });

  const [punchLoading, setPunchLoading] = useState(false);
  const [punchMsg, setPunchMsg] = useState("");
  const [currentAttendance, setCurrentAttendance] = useState(null);

  const userName = userData?.name || userData?.firstName || "HR Manager";
  const userEmail = userData?.email || "hr@dptradeking.com";

  const handleAutoPunch = (type) => {
    if (!navigator.geolocation) return setPunchMsg("GPS is not supported.");
    setPunchLoading(true);
    setPunchMsg(type === "in" ? "Punching In..." : "Punching Out...");
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await axios.post(`${API}/attendance/auto-punch`, {
            employeeId: userData?._id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            type 
          }, { headers: { Authorization: `Bearer ${token}` } });
          
          setPunchMsg(res.data.message || `Punch ${type} successful ✅`);
          fetchAllData(); 
        } catch (err) {
          setPunchMsg(err.response?.data?.message || "Verification failed ❌");
        } finally {
          setPunchLoading(false);
        }
      },
      () => { 
        setPunchLoading(false); 
        setPunchMsg("Please enable GPS 📍"); 
      },
      { enableHighAccuracy: true }
    );
  };

  const fetchNotifications = async () => {
    if (!token) return;
    setNotifLoading(true);
    try {
      const res = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotificationsList(res.data.notifications || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setNotifLoading(false);
    }
  };

  const fetchAllData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [userRes, empRes, deptRes, leaveRes, attendanceRes] = await Promise.all([
        axios.get(`${API}/auth/me`, { headers }),
        axios.get(`${API}/employees`, { headers }),
        axios.get(`${API}/departments`, { headers }),
        axios.get(`${API}/leaves`, { headers }),
        axios.get(`${API}/attendance`, { headers })
      ]);

      setUserData(userRes.data);
      const today = new Date().toISOString().split("T")[0];
      const myRecord = attendanceRes.data.find(a => 
        (a.employeeId === userRes.data._id || a.userId === userRes.data._id) && 
        a.date.includes(today)
      );
      setCurrentAttendance(myRecord);

      const todayAttendance = attendanceRes.data.filter(a => {
        const recordDate = a.date.includes("T") ? a.date.split("T")[0] : a.date;
        return recordDate === today;
      });

      const last5Days = [...Array(5)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split("T")[0];
      }).reverse();

      const attendanceTrend = last5Days.map(date => ({
        name: date.split("-").slice(1).join("/"),
        count: attendanceRes.data.filter(a => {
          const recordDate = a.date.includes("T") ? a.date.split("T")[0] : a.date;
          return recordDate === date && (a.status === "Present" || a.status === "WFH");
        }).length
      }));

      const deptDistribution = deptRes.data.map(dept => ({
        name: dept.name,
        value: empRes.data.filter(emp => emp.department === dept.name || emp.department?._id === dept._id).length
      }));

      setHomeStats({
        employees: empRes.data.length,
        departments: deptRes.data.length,
        present: todayAttendance.length, 
        pendingLeaves: leaveRes.data.filter(l => l.status === "Pending").length,
        attendanceTrend,
        deptDistribution
      });

    } catch (err) {
      console.error("Error loading Dashboard:", err);
    }
  };

  useEffect(() => {
    if (!token) { navigate("/"); return; }
    fetchAllData();
    fetchNotifications();
  }, [token, navigate]);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    setShowNotifications(false);
    setShowProfileMenu(false); // Close dropdown when a menu is selected
  };

  const renderHomeStats = () => {
    // Professional color palette
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];
    const hasRecordForToday = !!currentAttendance;
    const canPunchIn = !hasRecordForToday;

    return (
      <div className="home-dashboard animate-fade-in" style={{ padding: '25px', backgroundColor: darkMode ? '#0f172a' : '#f8fafc' }}>
        {/* --- SHIFT MANAGEMENT BANNER (Keep your existing code) --- */}
        <div style={{
          background: darkMode ? '#1e293b' : '#ffffff',
          padding: '20px', borderRadius: '12px', marginBottom: '25px',
          border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ 
              background: hasRecordForToday ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)', 
              padding: '12px', borderRadius: '10px', color: hasRecordForToday ? '#10b981' : '#64748b' 
            }}>
              <FaMapMarkerAlt size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: darkMode ? '#fff' : '#1e293b', fontSize: '16px' }}>Shift Management</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                {punchMsg || (hasRecordForToday ? "Currently on duty" : "Verify location to start shift")}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => handleAutoPunch("in")} 
                disabled={punchLoading || !canPunchIn}
                className="punch-in-btn"
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: '700',
                  backgroundColor: canPunchIn ? '#4f46e5' : '#94a3b8', color: 'white',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: canPunchIn ? 'pointer' : 'not-allowed'
                }}
              >
                <FaFingerprint /> {punchLoading ? "..." : "Punch In"}
              </button>
              <button 
                onClick={() => handleAutoPunch("out")} 
                disabled={punchLoading || !hasRecordForToday}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: '700',
                  backgroundColor: hasRecordForToday ? '#ef4444' : '#94a3b8', color: 'white',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: hasRecordForToday ? 'pointer' : 'not-allowed'
                }}
              >
                <FaSignOutAlt /> {punchLoading ? "..." : "Punch Out"}
              </button>
          </div>
        </div>

        {/* --- STATS GRID (Keep your existing code) --- */}
        <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '500', color: darkMode ? '#fff' : '#1e293b', margin: 0 }}>
              HR Executive Dashboard
            </h2>
            <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>
              System Status: <span style={{ color: '#10b981', fontWeight: '600' }}>Active</span>
            </p>
        </div>

        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          {[
            { label: 'Total Workforce', val: homeStats.employees, icon: <FaUsers />, color: '#4f46e5' },
            { label: 'Active Depts', val: homeStats.departments, icon: <FaBuilding />, color: '#0ea5e9' },
            { label: 'Today\'s Attendance', val: `${homeStats.present}/${homeStats.employees}`, icon: <FaCalendarCheck />, color: '#10b981' },
            { label: 'Pending Requests', val: homeStats.pendingLeaves, icon: <FaFileAlt />, color: '#f59e0b' }
          ].map((stat, i) => (
            <div key={i} className="stat-card" style={{
              background: darkMode ? '#1e293b' : '#ffffff',
              padding: '24px', borderRadius: '12px',
              border: darkMode ? '1px solid #334155' : '1px solid #edf2f7',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>{stat.label}</span>
                <div style={{ color: stat.color }}>{stat.icon}</div>
              </div>
              <h3 style={{ fontSize: '28px', fontWeight: '700', color: darkMode ? '#fff' : '#1e293b', marginTop: '10px' }}>{stat.val}</h3>
            </div>
          ))}
        </div>

        {/* --- IMPROVED CHARTS SECTION --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px', marginBottom: '30px' }}>
          
          {/* 1. Attendance Analytics (Area Chart) */}
          <div style={{ background: darkMode ? '#1e293b' : '#fff', padding: '25px', borderRadius: '12px', border: darkMode ? '1px solid #334155' : '1px solid #edf2f7', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ fontWeight: '700', color: darkMode ? '#fff' : '#334155', marginBottom: '20px', fontSize: '16px' }}>Attendance Analytics</h4>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={homeStats.attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#f1f5f9"} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 12, fontWeight: 500}} 
                  dy={10}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 12}} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#333' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 2. Workforce Distribution (Donut/Pie Chart) */}
          <div style={{ background: darkMode ? '#1e293b' : '#fff', padding: '25px', borderRadius: '12px', border: darkMode ? '1px solid #334155' : '1px solid #edf2f7', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ fontWeight: '700', color: darkMode ? '#fff' : '#334155', marginBottom: '20px', fontSize: '16px' }}>Workforce Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie 
                  data={homeStats.deptDistribution} 
                  innerRadius={75} 
                  outerRadius={100} 
                  paddingAngle={8} 
                  dataKey="value"
                  stroke="none"
                >
                  {homeStats.deptDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  align="center" 
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: '500' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }; 

  const renderContent = () => {
    switch (activeMenu) {
      case "Employees": return <EmployeeList />;
      case "Departments": return <DepartmentList />;
      case "Attendance": return <Attendance />;
      case "Leave": return <LeaveManagement />;
      case "Payroll": return <PayrollManagement />;
      case "Performance": return <Performance />;
      case "Recruitment": return <Recruitment />;
      case "Reports": return <Reports />;
      // --- ADD PROFILE CASE ---
      case "Profile": return <MyProfile />;
      default: return renderHomeStats();
    }
  };

  return (
    <div className={`dashboard ${darkMode ? "dark" : ""}`}>
      <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" />
          {!isCollapsed && <div><span className="brand-name">DPTradeKing</span><div className="sidebar-subtext">{role} Dashboard</div></div>}
        </div>
        <ul className="sidebar-menu">
          <li className={activeMenu === "Home" ? "active" : ""} onClick={() => handleMenuClick("Home")}><FaHome /> {!isCollapsed && "Home"}</li>
          <li className={activeMenu === "Employees" ? "active" : ""} onClick={() => handleMenuClick("Employees")}><FaUsers /> {!isCollapsed && "Employees"}</li>
          <li className={activeMenu === "Departments" ? "active" : ""} onClick={() => handleMenuClick("Departments")}><FaBuilding /> {!isCollapsed && "Departments"}</li>
          <li className={activeMenu === "Attendance" ? "active" : ""} onClick={() => handleMenuClick("Attendance")}><FaCalendarCheck /> {!isCollapsed && "Attendance"}</li>
          <li className={activeMenu === "Leave" ? "active" : ""} onClick={() => handleMenuClick("Leave")}><FaFileAlt /> {!isCollapsed && "Leave"}</li>
          <li className={activeMenu === "Payroll" ? "active" : ""} onClick={() => handleMenuClick("Payroll")}><FaMoneyBillWave /> {!isCollapsed && "Payroll"}</li>
          <li className={activeMenu === "Performance" ? "active" : ""} onClick={() => handleMenuClick("Performance")}><FaStar /> {!isCollapsed && "Performance"}</li>
          <li className={activeMenu === "Recruitment" ? "active" : ""} onClick={() => handleMenuClick("Recruitment")}><FaUserPlus /> {!isCollapsed && "Recruitment"}</li>
          <li className={activeMenu === "Reports" ? "active" : ""} onClick={() => handleMenuClick("Reports")}><FaChartBar /> {!isCollapsed && "Reports"}</li>
        </ul>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}><FaSignOutAlt /> {!isCollapsed && "Logout"}</button>
        </div>
      </div>

      <div className="main-wrapper">
        <header className="top-header">
          <div className="header-title">
            <h2>{activeMenu}</h2>
            <div className="header-subtitle">Welcome, {userName}</div>
          </div>
          
          <div className="header-actions">
            <div className="notification" onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }} style={{ position: 'relative', cursor: 'pointer' }}>
              <FaBell />
              {notificationsList.length > 0 && <span className="badge">{notificationsList.length}</span>}
              
              {showNotifications && (
                <div className="notification-dropdown" style={{
                    position: 'absolute', top: '50px', right: '0', width: '350px',
                    background: darkMode ? '#2c2c2c' : '#fff', borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: '1000',
                    maxHeight: '450px', border: darkMode ? '1px solid #444' : '1px solid #eee'
                }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ padding: '15px', borderBottom: '1px solid #eee', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', color: darkMode ? '#fff' : '#333' }}>
                        Notifications
                        <span style={{ fontSize: '11px', color: '#4f46e5', textTransform: 'uppercase' }}>Recent</span>
                    </div>
                    <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '10px' }}>
                        {notifLoading ? (
                            <div style={{ padding: '20px', textAlign: 'center', fontSize: '14px' }}>Syncing...</div>
                        ) : notificationsList.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', fontSize: '14px', color: '#888' }}>All caught up!</div>
                        ) : (
                            notificationsList.map((item, idx) => (
                                <div key={idx} style={{
                                    padding: '12px', borderRadius: '8px', marginBottom: '8px', fontSize: '13px',
                                    borderLeft: `4px solid ${item.type === 'error' ? '#ef4444' : item.type === 'info' ? '#2563eb' : '#fbbf24'}`,
                                    background: darkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc'
                                }}>
                                    <div style={{ fontWeight: '600', marginBottom: '2px', color: darkMode ? '#fff' : '#1e293b' }}>{item.title}</div>
                                    <div style={{ color: darkMode ? '#ccc' : '#475569', marginBottom: '4px' }}>{item.message}</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(item.createdAt).toLocaleTimeString()}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
              )}
            </div>
 
            <div className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <FaSun /> : <FaMoon />}
            </div>

            <div className="profile-wrapper" style={{ position: 'relative' }}>
              <div className="profile-trigger" onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px' }}>
                <div style={{ textAlign: 'right', display: isCollapsed ? 'none' : 'block' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: darkMode ? '#f8fafc' : '#1e293b' }}>
                    {userName.split(" ")[0]}
                  </div>
                </div>
                <div className="profile-avatar" style={{
                  width: '38px', height: '38px', borderRadius: '10px', background: darkMode ? '#334155' : '#4f46e5',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700'
                }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
              </div>

              {showProfileMenu && (
                <div className="profile-dropdown" style={{
                  position: 'absolute', top: '50px', right: '0', width: '220px', background: darkMode ? '#1e293b' : '#fff',
                  borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`,
                  padding: '6px', zIndex: 1000
                }}>
                  <div style={{ padding: '10px', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                    Signed in as <br/>
                    <b style={{ color: darkMode ? '#fff' : '#1e293b', fontSize: '13px' }}>{userName}</b><br/>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{userEmail}</span>
                  </div>
                  <div style={{ height: '1px', background: darkMode ? '#334155' : '#f1f5f9', margin: '4px 0' }} />
                  
                  {/* --- ADDED MY PROFILE LINK --- */}
                  <button onClick={() => handleMenuClick("Profile")} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', border: 'none',
                      background: 'none', color: darkMode ? '#fff' : '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer', borderRadius: '8px'
                    }}>
                    <FaUserCircle size={14} /> My Profile
                  </button>

                  <button onClick={logout} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', border: 'none',
                      background: 'none', color: '#ef4444', fontSize: '13px', fontWeight: '600', cursor: 'pointer', borderRadius: '8px'
                    }}>
                    <FaSignOutAlt size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="content-area">{renderContent()}</div>
      </div>
    </div>
  );
};

export default HrDashboard;