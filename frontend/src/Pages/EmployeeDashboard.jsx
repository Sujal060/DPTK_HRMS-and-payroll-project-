import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  FaHome, FaUser, FaCalendarCheck, FaFileAlt, FaMoneyBillWave, FaSignOutAlt, 
  FaBars, FaChartLine, FaTrophy, FaBell, FaChevronRight
} from "react-icons/fa";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";

// Components
import MyProfile from "../components/employee/MyProfile";
import MyAttendance from "../components/employee/Myattendance";
import MyLeaves from "../components/employee/ApplyLeave";
import MyPayroll from "../components/employee/Payslip";
import MyPerformance from "../components/employee/ViewPerformance";

const API = "http://localhost:5000/api";
const BASE_URL = "http://localhost:5000";

// --- HomeCalendar Component (Refined Styling) ---
const HomeCalendar = () => {
  const [value, onChange] = useState(new Date());

  const holidays2026 = {
    "2026-01-26": { name: "Republic Day", type: "NATIONAL" },
    "2026-03-03": { name: "Holi", type: "MARKET" },
    "2026-03-26": { name: "Ram Navami", type: "MARKET" },
    "2026-03-31": { name: "Mahavir Jayanti", type: "MARKET" },
    "2026-04-03": { name: "Good Friday", type: "NATIONAL" },
    "2026-04-14": { name: "Ambedkar Jayanti", type: "MARKET" },
    "2026-05-01": { name: "Maharashtra Day", type: "MARKET" },
    "2026-05-28": { name: "Bakri Id", type: "MARKET" },
    "2026-06-26": { name: "Muharram", type: "MARKET" },
    "2026-08-15": { name: "Independence Day", type: "NATIONAL" },
    "2026-09-14": { name: "Ganesh Chaturthi", type: "MARKET" },
    "2026-10-02": { name: "Gandhi Jayanti", type: "NATIONAL" },
    "2026-10-20": { name: "Dussehra", type: "MARKET" },
    "2026-11-08": { name: "Diwali (Laxmi Pujan)", type: "MUHURAT" },
    "2026-11-10": { name: "Diwali Balipratipada", type: "MARKET" },
    "2026-11-24": { name: "Guru Nanak Jayanti", type: "MARKET" },
    "2026-12-25": { name: "Christmas", type: "NATIONAL" },
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = date.toLocaleDateString('en-CA');
      const day = date.getDay();
      if (holidays2026[dateStr]) return `holiday-tile ${holidays2026[dateStr].type.toLowerCase()}`;
      if (day === 0) return 'sun-tile';
      if (day === 6) return 'sat-tile';
    }
  };

  const tileContent = ({ date, view }) => {
    const dateStr = date.toLocaleDateString('en-CA');
    const holiday = holidays2026[dateStr];
    if (view === 'month' && holiday) {
      return (
        <div className="holiday-indicator">
          <span className="dot"></span>
          <span className="holiday-label" style={{ fontWeight: '500' }}>{holiday.name}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="calendar-card">
      <div className="calendar-header">
        <h4 style={{ fontWeight: '600' }}><FaCalendarCheck style={{marginRight: '8px', color: '#6366f1'}} /> 2026 Schedule</h4>
        <div className="year-badge">2026</div>
      </div>
      
      <style>{`
        .calendar-card { background: white; padding: 20px; border-radius: 24px; border: 1px solid #f1f5f9; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
        .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .year-badge { background: #2f32ee15; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #6366f1; }
        .react-calendar { border: none !important; width: 100% !important; font-family: 'Inter', sans-serif !important; }
        .react-calendar__tile { height: 60px !important; border-radius: 12px !important; transition: all 0.2s ease; font-weight: 500; }
        .react-calendar__tile:hover { background-color: #f8fafc !important; transform: scale(1.05); }
        .holiday-indicator { display: flex; flex-direction: column; align-items: center; width: 100%; }
        .dot { width: 5px; height: 5px; border-radius: 50%; margin-top: 4px; }
        .national .dot { background: #0ea5e9; }
        .market .dot { background: #ef4444; }
        .muhurat .dot { background: #f59e0b; }
      `}</style>

      <Calendar onChange={onChange} value={value} tileClassName={tileClassName} tileContent={tileContent} />
    </div>
  );
};

// --- EmployeeDashboard ---
const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profile, setProfile] = useState({});
  const [showDropdown, setShowDropdown] = useState(false);
  const [attendanceChartData, setAttendanceChartData] = useState([]);
  const [leaveChartData, setLeaveChartData] = useState([]);
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchMsg, setPunchMsg] = useState("");

  const COLORS = {
    primary: "#6366f1",
    sidebarDark: "#0f172a",
    sidebarHover: "#1e293b",
    bgApp: "#f8fafc",
    textPrimary: "#1e293b",
    textSecondary: "#64748b",
    border: "#e2e8f0",
    white: "#ffffff",
    success: "#10b981",
    warning: "#f59e0b"
  };

  const menuItems = [
    { name: "Dashboard", icon: <FaHome /> },
    { name: "My Profile", icon: <FaUser /> },
    { name: "My Attendance", icon: <FaCalendarCheck /> },
    { name: "My Leaves", icon: <FaFileAlt /> },
    { name: "My Payroll", icon: <FaMoneyBillWave /> },
    { name: "My Performance", icon: <FaChartLine /> }
  ];

  const fetchEmployeeData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [profRes, attRes, leaveRes] = await Promise.all([
        axios.get(`${API}/employee/profile`, { headers }),
        axios.get(`${API}/employee/attendance?page=1&limit=50`, { headers }),
        axios.get(`${API}/leaves`, { headers })
      ]);
      setProfile(profRes.data);
      
      const att = attRes.data.records || attRes.data || [];
      setAttendanceChartData([
        { name: "Present", value: att.filter(a => a.status === "Present").length },
        { name: "Absent", value: att.filter(a => a.status === "Absent").length },
        { name: "Half-Day", value: att.filter(a => a.status === "Half-Day").length },
        { name: "WFH", value: att.filter(a => a.status === "WFH").length }
      ]);
      
      const lvs = leaveRes.data || [];
      setLeaveChartData([
        { name: "Pending", value: lvs.filter(l => l.status === "Pending").length },
        { name: "Approved", value: lvs.filter(l => l.status === "Approved").length },
        { name: "Rejected", value: lvs.filter(l => l.status === "Rejected").length }
      ]);
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    }
  }, [token]);

  useEffect(() => {
    if (!token) navigate("/");
    else fetchEmployeeData();
  }, [token, navigate, fetchEmployeeData]);

  // --- ADDED: LIVE GPS TRACKING LOGIC ---
  useEffect(() => {
    if (!token) return;

    const syncLiveLocation = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              await axios.patch(
                `${API}/employees/location/update`, 
                { lat: pos.coords.latitude, lng: pos.coords.longitude },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              console.log("📍 Live location synced to database.");
            } catch (err) {
              console.error("Location sync failed:", err.message);
            }
          },
          (error) => console.warn("GPS Permission Denied for live tracking."),
          { enableHighAccuracy: true }
        );
      }
    };

    // Run once on load and then every 5 minutes
    syncLiveLocation();
    const locationInterval = setInterval(syncLiveLocation, 300000);

    return () => clearInterval(locationInterval);
  }, [token]);
  // --- END OF GPS TRACKING LOGIC ---

  const handleAutoPunch = (type) => {
    if (!navigator.geolocation) return setPunchMsg("GPS is not supported.");
    setPunchLoading(true);
    setPunchMsg("Detecting location...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await axios.post(`${API}/attendance/auto-punch`, {
            employeeId: profile._id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            type
          }, { headers: { Authorization: `Bearer ${token}` } });
          setPunchMsg(res.data.message || "Attendance updated ✅");
          fetchEmployeeData();
        } catch (err) {
          setPunchMsg(err.response?.data?.message || "Verification failed ❌");
        } finally {
          setPunchLoading(false);
        }
      },
      () => { setPunchLoading(false); setPunchMsg("Please enable GPS 📍"); },
      { enableHighAccuracy: true }
    );
  };

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  const getAvatarUrl = () => {
    if (profile.profilePhoto) return `${BASE_URL}/uploads/${profile.profilePhoto}`;
    return `https://ui-avatars.com/api/?name=${profile.firstName}+${profile.lastName}&background=6366f1&color=fff&bold=true`;
  };

  const PointsProgress = ({ points }) => {
    const currentPoints = points || 0;
    const percentage = Math.min((currentPoints / 10000) * 100, 100);
    
    return (
      <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
            <FaTrophy color={COLORS.warning} /> Performance Milestone
          </h4>
          <span style={{ fontWeight: '600', color: COLORS.primary, background: '#6366f110', padding: '2px 10px', borderRadius: '8px' }}>{currentPoints} Pts</span>
        </div>
        <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${percentage}%`, height: '100%', background: `linear-gradient(90deg, ${COLORS.primary}, #818cf8)`,
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
        <p style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '12px', fontWeight: '500' }}>
          {10000 - currentPoints} points left for your <strong>10% Increment!</strong>
        </p>
      </div>
    );
  };

  const DashboardHome = () => (
    <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
      <div style={{
        width: '100%', height: '175px', borderRadius: '24px', overflow: 'hidden',
        position: 'relative', marginBottom: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
      }}>
        <img 
          src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80" 
          alt="Modern Office" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.4) 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 50px', color: 'white'
        }}>
          <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '500', letterSpacing: '-0.5px' }}>Welcome back, {profile.firstName}!</h2>
          <p style={{ margin: '12px 0 0', opacity: 0.85, fontSize: '1.1rem', maxWidth: '500px', fontWeight: '400', lineHeight: '1.6' }}>
            Ready to track your growth? You have some tasks pending in your performance module.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '32px', marginBottom: '32px' }}>
        <div style={{
          background: COLORS.white, padding: '28px', borderRadius: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', border: `1px solid ${COLORS.border}`
        }}>
          <div>
            <h4 style={{ margin: 0, color: COLORS.textPrimary, fontSize: '1.2rem', fontWeight: '600' }}>Daily Work Hours</h4>
            <p style={{ margin: '6px 0 0', fontSize: '14px', color: punchMsg.includes('✅') ? COLORS.success : COLORS.textSecondary, fontWeight: '500' }}>
              {punchMsg || "Verify your location to punch in."}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '14px' }}>
            <button disabled={punchLoading} onClick={() => handleAutoPunch("in")}
              style={{ padding: '14px 32px', borderRadius: '14px', border: 'none', fontWeight: '600', cursor: 'pointer', background: COLORS.primary, color: 'white', boxShadow: '0 8px 15px rgba(99, 102, 241, 0.3)', transition: '0.3s' }}>
              {punchLoading ? "..." : "Punch In"}
            </button>
            <button disabled={punchLoading} onClick={() => handleAutoPunch("out")}
              style={{ padding: '14px 32px', borderRadius: '14px', fontWeight: '600', cursor: 'pointer', background: 'white', color: COLORS.textPrimary, border: `1px solid ${COLORS.border}`, transition: '0.3s' }}>
              Punch Out
            </button>
          </div>
        </div>
        <PointsProgress points={profile.points} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px' }}>
        <div style={{ background: 'white', padding: '28px', borderRadius: '24px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <h4 style={{ marginBottom: '24px', color: COLORS.textPrimary, fontWeight: '600' }}>Attendance Analytics</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={attendanceChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}} />
              <Bar dataKey="value" fill={COLORS.primary} radius={[8, 8, 0, 0]} barSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <HomeCalendar />
        <div style={{ background: 'white', padding: '28px', borderRadius: '24px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <h4 style={{ marginBottom: '24px', color: COLORS.textPrimary, fontWeight: '600' }}>Leave Insights</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={leaveChartData} innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                {leaveChartData.map((e, i) => <Cell key={i} fill={["#f59e0b", "#10b981", "#f43f5e"][i % 3]} />)}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontWeight: '500' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: COLORS.bgApp, overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .nav-item:hover { background: rgba(255, 255, 255, 0.05) !important; color: white !important; }
        .active-nav { background: ${COLORS.primary} !important; color: white !important; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3) !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>

      {/* Sidebar */}
      <aside style={{
        width: isCollapsed ? '90px' : '280px', background: COLORS.sidebarDark,
        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 100
      }}>
        <div style={{ height: '90px', display: 'flex', alignItems: 'center', padding: '0 28px' }}>
          <div style={{ minWidth: '40px', height: '40px', background: `linear-gradient(135deg, ${COLORS.primary}, #818cf8)`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.4)' }}>
            <span style={{color: 'white', fontWeight: '500', fontSize: '1.2rem'}}>D</span>
          </div>
          {!isCollapsed && <span style={{ marginLeft: '16px', fontWeight: '500', color: 'white', fontSize: '1.1rem', letterSpacing: '-0.5px' }}>DPTradeKing</span>}
        </div>

        <ul style={{ listStyle: 'none', padding: '15px 18px', flex: 1 }}>
          {menuItems.map((item) => (
            <li key={item.name} className={`nav-item ${activeMenu === item.name ? 'active-nav' : ''}`} 
              onClick={() => setActiveMenu(item.name)}
              style={{
                display: 'flex', alignItems: 'center', padding: '14px 18px', marginBottom: '8px', borderRadius: '16px',
                cursor: 'pointer', transition: '0.3s', color: activeMenu === item.name ? 'white' : '#94a3b8',
              }}>
              <span style={{ fontSize: '1.3rem', minWidth: '28px', display: 'flex', justifyContent: 'center' }}>{item.icon}</span>
              {!isCollapsed && <span style={{ marginLeft: '14px', fontWeight: '500', fontSize: '0.95rem' }}>{item.name}</span>}
            </li>
          ))}
        </ul>

        <div style={{ padding: '24px 18px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#f87171', cursor: 'pointer', padding: '14px 18px', borderRadius: '14px', fontWeight: '600', transition: '0.3s' }}>
            <FaSignOutAlt /> {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
        
        <button onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ position: 'absolute', top: '35px', right: '-15px', background: COLORS.white, border: `1px solid ${COLORS.border}`, color: COLORS.sidebarDark, width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
          <FaBars size={12} />
        </button>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          height: '85px', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', zIndex: 90
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <span style={{ color: COLORS.textSecondary, fontSize: '14px', fontWeight: '500' }}>Pages</span>
             <FaChevronRight size={10} color={COLORS.textSecondary} />
             <span style={{ color: COLORS.textPrimary, fontSize: '14px', fontWeight: '600' }}>{activeMenu}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ position: 'relative', color: COLORS.textSecondary, cursor: 'pointer' }}>
                <FaBell size={20} />
                <span style={{ position: 'absolute', top: '-5px', right: '-2px', background: '#ef4444', width: '8px', height: '8px', borderRadius: '50%', border: '2px solid white' }}></span>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', background: '#f8fafc', padding: '6px 16px', borderRadius: '50px', border: `1px solid ${COLORS.border}` }} 
                  onClick={() => setShowDropdown(!showDropdown)}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '13px', color: COLORS.textPrimary }}>{profile.firstName || "User"}</p>
                <p style={{ margin: 0, color: COLORS.primary, fontSize: '10px', fontWeight: '600', textTransform: 'uppercase' }}>{profile.designation || 'Staff'}</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${COLORS.primary}`, position: 'relative' }}>
                <img style={{ width: '100%', height: '100%', objectFit: 'cover' }} src={getAvatarUrl()} alt="Profile" />
              </div>

              {showDropdown && (
                <div style={{ position: 'absolute', top: '55px', right: 0, background: 'white', minWidth: '180px', borderRadius: '16px', boxShadow: '0 15px 35px rgba(0,0,0,0.12)', border: `1px solid ${COLORS.border}`, padding: '10px', zIndex: 100 }}>
                  <button onClick={() => {setActiveMenu("My Profile"); setShowDropdown(false);}} style={{ width: '100%', textAlign: 'left', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textPrimary, fontWeight: '500', fontSize: '14px' }}>Account Settings</button>
                  <hr style={{ border: '0', borderTop: `1px solid ${COLORS.border}`, margin: '5px 0' }} />
                  <button onClick={logout} style={{ width: '100%', textAlign: 'left', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: '600', fontSize: '14px' }}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '40px', scrollBehavior: 'smooth' }}>
          {activeMenu === "My Profile" ? <MyProfile /> : 
           activeMenu === "My Attendance" ? <MyAttendance /> : 
           activeMenu === "My Leaves" ? <MyLeaves /> : 
           activeMenu === "My Payroll" ? <MyPayroll /> : 
           activeMenu === "My Performance" ? <MyPerformance /> : 
           <DashboardHome />}
        </main>
      </div>
    </div>
  );
};

export default EmployeeDashboard;