import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../style/Dashboard.css";

import EmployeeList from "../components/admin/employees/EmployeeList.jsx";
import Attendance from "../components/admin/employees/Attendance.jsx";
import Payroll from "../components/admin/employees/Payroll.jsx";
import HRList from "../components/admin/employees/HRList.jsx";
import DepartmentList from "../components/admin/employees/Department.jsx";
import Reports from "../components/admin/employees/Reports.jsx";
import logo from "../assets/images/dplogo3.png";

import {
  FaHome, FaUsers, FaCalendarCheck, FaMoneyBill, FaChartBar,
  FaSignOutAlt, FaBell, FaSun, FaMoon, FaUserTie, FaBuilding, 
  FaHistory, FaCheckDouble, FaArrowUp, FaClock, FaBriefcase,
  FaUserPlus, FaFileInvoiceDollar, FaClipboardList, FaShieldAlt,
  FaSearch, FaCircle
} from "react-icons/fa";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const notificationRef = useRef(null);

  const [activeMenu, setActiveMenu] = useState("Home");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [userData, setUserData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [homeStats, setHomeStats] = useState({
    employees: 0, departments: 0, pendingLeaves: 0, payrolls: 0, present: 0, absent: 0, hrCount: 0, attendanceTrend: []
  });

  /* ================= DATA FETCHING ================= */
  const fetchHomeData = useCallback(async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [empRes, depRes, leaveRes, payRes, attRes, notifRes] = await Promise.all([
        axios.get("http://localhost:5000/api/employees", { headers }),
        axios.get("http://localhost:5000/api/departments", { headers }),
        axios.get("http://localhost:5000/api/leaves", { headers }),
        axios.get("http://localhost:5000/api/payroll", { headers }),
        axios.get("http://localhost:5000/api/attendance", { headers }),
        axios.get("http://localhost:5000/api/notifications", { headers }).catch(() => ({ data: { notifications: [] } }))
      ]);

      const employees = empRes.data || [];
      const hrCount = employees.filter(emp => emp.role === 'hr' || emp.designation?.toLowerCase().includes('hr')).length;

      const attendance = attRes.data?.attendance || attRes.data || [];
      const formatDate = (date) => new Date(date).toISOString().split("T")[0];
      const today = formatDate(new Date());

      const present = attendance.filter((a) => formatDate(a.date) === today && (a.status === "Present" || a.status === "WFH")).length;
      const last5Days = [...Array(5)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return formatDate(d);
        }).reverse();

      setHomeStats({
        employees: employees.length,
        hrCount: hrCount,
        departments: (depRes.data || []).length,
        payrolls: (payRes.data || []).length,
        pendingLeaves: (leaveRes.data || []).filter((l) => l.status === "Pending").length,
        present,
        absent: Math.max(0, employees.length - present),
        attendanceTrend: last5Days.map(date => ({
          name: date.split('-').slice(1).join('/'),
          Present: attendance.filter((a) => formatDate(a.date) === date && (a.status === "Present" || a.status === "WFH")).length
        }))
      });
      setNotifications(notifRes.data.notifications || []);
    } catch (err) { console.error("Data Fetch Error:", err); }
  }, [token]);

  useEffect(() => {
    if (!token) { navigate("/"); return; }
    const init = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        setUserData(res.data);
        if (res.data.role !== "admin") navigate("/");
        fetchHomeData();
      } catch (err) { logout(); }
    };
    init();
  }, [token, navigate, fetchHomeData]);

  useEffect(() => {
    const handleClick = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const logout = () => { localStorage.clear(); navigate("/"); };

  /* ================= HOME VIEW COMPONENT ================= */
  const HomeView = () => {
  const workforceBarData = [
    { name: 'Staff', count: homeStats?.employees || 0 },
    { name: 'HRs', count: homeStats?.hrCount || 0 },
    { name: 'Depts', count: homeStats?.departments || 0 },
    { name: 'Leaves', count: homeStats?.pendingLeaves || 0 },
    { name: 'Payroll', count: homeStats?.payrolls || 0 },
  ];

  const quickActions = [
    { label: "Add Employee", icon: <FaUserPlus />, target: "Employee", color: "#6366f1" },
    { label: "Mark Attendance", icon: <FaCalendarCheck />, target: "Attendance", color: "#10b981" },
    { label: "Generate Payroll", icon: <FaFileInvoiceDollar />, target: "Payroll", color: "#f59e0b" },
    { label: "View Reports", icon: <FaClipboardList />, target: "Reports", color: "#a855f7" },
  ];

  return (
    <div className="home-dashboard animate-fade-in" style={{ padding: '10px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '400', color: darkMode ? '#fff' : '#0f172a', margin: 0 }}>
          Executive Command Center
        </h1>
        <p style={{ color: '#64748b' }}>System status for {userData?.name}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        {quickActions.map((action, i) => (
          <button 
            key={i} 
            onClick={() => setActiveMenu(action.target)} 
            className="quick-action-btn" 
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '15px 20px',
              background: darkMode ? '#1e293b' : '#fff', borderRadius: '14px', border: 'none',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.2s'
            }}
          >
            <div style={{ color: action.color, fontSize: '1.2rem' }}>{action.icon}</div>
            <span style={{ fontWeight: '600', color: darkMode ? '#e2e8f0' : '#475569' }}>{action.label}</span>
          </button>
        ))}
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
        <div className="stat-card blue">
          <div className="stat-icon-bg"><FaUsers /></div>
          <div className="stat-info"><h3>{homeStats?.employees || 0}</h3><p>Total Staff</p></div>
        </div>
        <div className="stat-card purple" style={{ borderLeft: '4px solid #a855f7' }}>
          <div className="stat-icon-bg" style={{ background: '#f3e8ff', color: '#a855f7' }}><FaShieldAlt /></div>
          <div className="stat-info"><h3>{homeStats?.hrCount || 0}</h3><p>HR Team</p></div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon-bg"><FaBuilding /></div>
          <div className="stat-info"><h3>{homeStats?.departments || 0}</h3><p>Departments</p></div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon-bg"><FaClock /></div>
          <div className="stat-info"><h3>{homeStats?.pendingLeaves || 0}</h3><p>Pending Leaves</p></div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon-bg"><FaMoneyBill /></div>
          <div className="stat-info"><h3>{homeStats?.payrolls || 0}</h3><p>Payroll Runs</p></div>
        </div>
      </div>

      <div className="dashboard-charts-container" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', marginTop: '30px' }}>
        <div className="chart-item" style={{ background: darkMode ? '#1e293b' : '#fff', padding: '24px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '20px', color: darkMode ? '#fff' : '#1e293b' }}>Attendance Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={homeStats?.attendanceTrend || []}>
              <defs>
                <linearGradient id="color" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#f1f5f9"} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="Present" stroke="#6366f1" strokeWidth={3} fill="url(#color)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-item" style={{ background: darkMode ? '#1e293b' : '#fff', padding: '24px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '20px', color: darkMode ? '#fff' : '#1e293b' }}>Resource Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={workforceBarData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#f1f5f9"} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis hide />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '10px', border: 'none' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={30} animationDuration={1000}>
                {workforceBarData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#6366f1', '#a855f7', '#8b5cf6', '#f59e0b', '#10b981'][index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

  const renderContent = () => {
    switch (activeMenu) {
      case "Employee": return <EmployeeList />;
      case "HR": return <HRList />;
      case "Departments": return <DepartmentList />;
      case "Attendance": return <Attendance />;
      case "Payroll": return <Payroll />;
      case "Reports": return <Reports />;
      default: return <HomeView />;
    }
  };

  return (
    <div className={`dashboard ${darkMode ? "dark" : ""}`}>
      <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" />
          {!isCollapsed && <div><span className="brand-name">DPTradeKing</span><div className="sidebar-subtext">Admin Panel</div></div>}
        </div>
        <ul className="sidebar-menu">
          {[
            { name: "Home", icon: <FaHome /> },
            { name: "Employee", icon: <FaUsers /> },
            { name: "HR", icon: <FaUserTie />, adminOnly: true },
            { name: "Departments", icon: <FaBuilding />, adminOnly: true },
            { name: "Attendance", icon: <FaCalendarCheck /> },
            { name: "Payroll", icon: <FaMoneyBill /> },
            { name: "Reports", icon: <FaChartBar /> }
          ].map(item => (!item.adminOnly || userData?.role === "admin") && (
            <li key={item.name} className={activeMenu === item.name ? "active" : ""} onClick={() => setActiveMenu(item.name)}>
              {item.icon} {!isCollapsed && <span>{item.name}</span>}
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}><FaSignOutAlt /> {!isCollapsed && <span>Logout</span>}</button>
        </div>
      </div>

      <div className="main-wrapper">
        <header className="top-header" style={{
            background: darkMode ? '#1e293b' : '#ffffff',
            padding: '0 30px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
          {/* Header Left: Search & Welcome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
             
             {/* Dynamic Context Badges */}
             <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
                   <FaCircle size={8} className="animate-pulse" /> Live System
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: darkMode ? '#334155' : '#f1f5f9', color: '#64748b', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
                   <FaClock /> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
             </div>
          </div>
          
          {/* Header Right: Actions & Profile */}
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="notification-container" ref={notificationRef} style={{ position: 'relative' }}>
              <div className="notification-icon-wrapper" onClick={() => setShowNotifications(!showNotifications)} style={{ 
                  cursor: 'pointer', position: 'relative', padding: '10px', background: darkMode ? '#334155' : '#f8fafc', borderRadius: '10px' 
              }}>
                <FaBell style={{ fontSize: '1.2rem', color: darkMode ? '#e2e8f0' : '#475569' }} />
                {notifications.length > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white',
                    fontSize: '10px', fontWeight: 'bold', minWidth: '18px', height: '18px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${darkMode ? '#1e293b' : '#fff'}`
                  }}>
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}
              </div>

              {showNotifications && (
                <div className="notif-dropdown" style={{
                  position: 'absolute', top: '55px', right: '0', width: '320px', background: darkMode ? '#1e293b' : '#fff',
                  borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 1000, border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
                }}>
                  <div style={{ padding: '18px', borderBottom: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`, fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: darkMode ? '#fff' : '#1e293b' }}>Notifications</span>
                    <span style={{ fontSize: '12px', color: '#6366f1', cursor: 'pointer' }}>Mark all as read</span>
                  </div>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? <p style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>All caught up!</p> :
                      notifications.map((n, i) => (
                        <div key={i} style={{ padding: '15px', borderBottom: `1px solid ${darkMode ? '#334155' : '#f8fafc'}`, cursor: 'pointer' }}>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: darkMode ? '#f8fafc' : '#1e293b' }}>{n.title}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{n.message}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            <div className="theme-toggle" onClick={() => setDarkMode(!darkMode)} style={{ 
                padding: '10px', background: darkMode ? '#334155' : '#f8fafc', borderRadius: '10px', cursor: 'pointer', color: darkMode ? '#facc15' : '#475569' 
            }}>
                {darkMode ? <FaSun /> : <FaMoon />}
            </div>
            
            {/* Professional Profile Section */}
            <div className="profile-wrapper" style={{ position: 'relative', marginLeft: '10px' }}>
              <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '12px', background: darkMode ? '#334155' : '#f8fafc', 
                  padding: '6px 15px 6px 6px', borderRadius: '12px', cursor: 'pointer' 
              }} onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <div style={{ 
                    width: '38px', height: '38px', borderRadius: '10px', background: '#6366f1', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' 
                }}>
                  {userData?.profileImage ? <img src={`http://localhost:5000/${userData.profileImage}`} style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }} alt="" /> : userData?.name?.charAt(0)}
                </div>
                <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#f8fafc' : '#1e293b', lineHeight: 1 }}>{userData?.name?.split(' ')[0]}</div>
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '600', marginTop: '3px' }}>Active</div>
                </div>
              </div>
              
              {showProfileMenu && (
                <div className="profile-dropdown" style={{
                    position: 'absolute', top: '55px', right: '0', width: '220px', background: darkMode ? '#1e293b' : '#fff',
                    borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`,
                    padding: '8px', zIndex: 1000
                }}>
                  <div style={{ padding: '12px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: darkMode ? '#fff' : '#1e293b' }}>{userData?.name}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>{userData?.email}</p>
                  </div>
                  <div style={{ height: '1px', background: darkMode ? '#334155' : '#f1f5f9', margin: '5px 0' }} />
                  <button className="dropdown-btn logout-btn" onClick={logout} style={{ 
                      width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px',
                      border: 'none', background: 'none', color: '#ef4444', fontWeight: '600', cursor: 'pointer', borderRadius: '10px'
                  }}>
                      <FaSignOutAlt /> Logout
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

export default Dashboard;