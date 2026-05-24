import React, { useState } from "react";
import "../../../style/admin/EmployeeProfile.css";
// Added icons for better UI
import { FaDownload, FaHistory, FaTrophy, FaMapMarkerAlt, FaExternalLinkAlt, FaBuilding, FaWalking } from "react-icons/fa";

const ViewEmployee = ({ employee, onBack }) => {
  // --- CONFIGURATION: OFFICE LOCATION ---
  const OFFICE_COORDS = { lat: 22.5996, lng: 72.8205 }; // Replace with your actual office coordinates
  const ALLOWED_RADIUS_KM = 0.2; // 200 meters buffer for GPS drift

  const [message] = useState({ 
    text: !employee ? "No employee record was selected for viewing." : "", 
    type: "error" 
  });

  // --- HELPER: DISTANCE CALCULATION ---
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  // --- DATA MAPPING ---
  const latestLoc = employee.liveLocation || employee.lastLocation;
  const history = employee.locationHistory || [];
  const isInOffice = latestLoc?.lat 
    ? calculateDistance(latestLoc.lat, latestLoc.lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng) <= ALLOWED_RADIUS_KM
    : false;

  // --- DOWNLOAD FUNCTIONS ---
  const downloadHistory = () => {
    if (!employee.salaryHistory || employee.salaryHistory.length === 0) return;
    let csvContent = "Date,Previous Salary,New Salary,Reason\n";
    employee.salaryHistory.forEach(h => {
      const date = new Date(h.date).toLocaleDateString();
      csvContent += `${date},${h.previousSalary},${h.newSalary},"${h.reason}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${employee.firstName}_Salary_History.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadGPSHistory = () => {
    if (!history.length) return;
    let csvContent = "Timestamp,Latitude,Longitude,Status\n";
    history.forEach(loc => {
      const dist = calculateDistance(loc.lat, loc.lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng);
      const status = dist <= ALLOWED_RADIUS_KM ? "In Office" : "Field";
      csvContent += `"${new Date(loc.timestamp).toLocaleString()}",${loc.lat},${loc.lng},${status}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${employee.firstName}_GPS_Audit.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!employee) {
    return (
      <div className="profile-container">
        <div className="profile-header">
          <h2>Employee Profile</h2>
        </div>
        <div style={{ padding: '12px', margin: '20px 0', borderRadius: '8px', textAlign: 'center', fontWeight: '600', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
          {message.text}
        </div>
        <button onClick={onBack} className="back-btn">← Back to List</button>
      </div>
    );
  }

  const fullName = `${employee.firstName || ""} ${employee.lastName || ""}`;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Employee Profile</h2>
        <span className={`status-badge ${employee.status || 'inactive'}`}>
          {employee.status || "Unknown"}
        </span>
      </div>

      <div className="profile-pic-container">
        <img
          src={employee.profilePhoto ? `http://localhost:5000/uploads/${employee.profilePhoto}` : "https://via.placeholder.com/140"}
          alt="Profile"
          className="profile-pic"
          onError={(e) => { e.target.src = "https://via.placeholder.com/140"; }}
        />
      </div>

      <div className="profile-card">
        <div className="profile-row">
          <label>Employee ID</label>
          <span>{employee.employeeId || "N/A"}</span>
        </div>

        <div className="profile-row">
          <label>Full Name</label>
          <span>{fullName.trim() || "N/A"}</span>
        </div>

        {/* --- NEW: WORK STATUS ROW --- */}
        <div className="profile-row">
          <label>Current Work Status</label>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isInOffice ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
            {latestLoc?.lat ? (
              isInOffice ? <><FaBuilding /> In Office</> : <><FaWalking /> Field / Remote</>
            ) : <span style={{color: '#94a3b8'}}>Offline</span>}
          </span>
        </div>

        <div className="profile-row">
          <label>Points Balance</label>
          <span style={{ color: '#10b981', fontWeight: 'bold' }}>
            <FaTrophy style={{ marginRight: '5px' }} /> {employee.points || 0} Pts
          </span>
        </div>

        <div className="profile-row">
          <label>Email</label>
          <span style={{ color: '#6366f1' }}>{employee.email || "N/A"}</span>
        </div>

        <div className="profile-row">
          <label>Current Salary</label>
          <span style={{ fontWeight: 'bold' }}>₹ {employee.salary?.toLocaleString() || 0}</span>
        </div>

        <div className="profile-row">
          <label>Last Known Map</label>
          <span>
            {latestLoc?.lat ? (
              <a href={`https://www.google.com/maps?q=${latestLoc.lat},${latestLoc.lng}`} target="_blank" rel="noreferrer" style={{ color: '#ef4444', fontWeight: '600', textDecoration: 'none' }}>
                <FaMapMarkerAlt /> Open Google Maps <FaExternalLinkAlt size={10} />
              </a>
            ) : "N/A"}
          </span>
        </div>
      </div>

      {/* SALARY HISTORY SECTION (Original) */}
      <div className="document-section-profile" style={{ marginTop: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3><FaHistory /> Salary & Increment History</h3>
          {employee.salaryHistory?.length > 0 && (
            <button onClick={downloadHistory} className="doc-link" style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <FaDownload /> Download CSV
            </button>
          )}
        </div>
        {employee.salaryHistory && employee.salaryHistory.length > 0 ? (
          <div style={{ overflowX: 'auto', background: '#f8fafc', borderRadius: '10px', padding: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px' }}>Date</th>
                  <th style={{ padding: '10px' }}>Old Salary</th>
                  <th style={{ padding: '10px' }}>New Salary</th>
                  <th style={{ padding: '10px' }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {employee.salaryHistory.map((h, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px' }}>{new Date(h.date).toLocaleDateString()}</td>
                    <td style={{ padding: '10px' }}>₹{h.previousSalary.toLocaleString()}</td>
                    <td style={{ padding: '10px', color: '#10b981', fontWeight: 'bold' }}>₹{h.newSalary.toLocaleString()}</td>
                    <td style={{ padding: '10px' }}>{h.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No increment history found.</p>
        )}
      </div>

      {/* --- NEW: GPS AUDIT HISTORY SECTION --- */}
      <div className="document-section-profile" style={{ marginTop: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3><FaMapMarkerAlt /> GPS Audit History</h3>
          {history.length > 0 && (
            <button onClick={downloadGPSHistory} className="doc-link" style={{ background: '#6366f1', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <FaDownload /> Download Logs
            </button>
          )}
        </div>
        {history.length > 0 ? (
          <div style={{ overflowX: 'auto', background: '#f8fafc', borderRadius: '10px', padding: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px' }}>Time</th>
                  <th style={{ padding: '10px' }}>Coordinates</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Map</th>
                </tr>
              </thead>
              <tbody>
                {history.slice().reverse().slice(0, 5).map((loc, i) => {
                  const dist = calculateDistance(loc.lat, loc.lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px' }}>{new Date(loc.timestamp).toLocaleString()}</td>
                      <td style={{ padding: '10px' }}>{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</td>
                      <td style={{ padding: '10px', color: dist <= ALLOWED_RADIUS_KM ? '#10b981' : '#f59e0b', fontWeight: '600' }}>
                        {dist <= ALLOWED_RADIUS_KM ? "In Office" : "Outside"}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <a href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>View</a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No location tracking data available.</p>
        )}
      </div>

      {/* DOCUMENTS SECTION (Original) */}
      <div className="document-section-profile" style={{ marginTop: '25px' }}>
        <h3>Verified Documents</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {employee.resume && <a href={`http://localhost:5000/uploads/${employee.resume}`} target="_blank" rel="noreferrer" className="doc-link">📄 View Resume</a>}
          {employee.documents?.aadhaarCard && <a href={`http://localhost:5000/uploads/${employee.documents.aadhaarCard}`} target="_blank" rel="noreferrer" className="doc-link">🆔 Aadhaar Card</a>}
          {employee.documents?.panCard && <a href={`http://localhost:5000/uploads/${employee.documents.panCard}`} target="_blank" rel="noreferrer" className="doc-link">💳 PAN Card</a>}
          {employee.documents?.educationCertificate && <a href={`http://localhost:5000/uploads/${employee.documents.educationCertificate}`} target="_blank" rel="noreferrer" className="doc-link">🎓 Education Cert.</a>}
          {employee.documents?.experienceLetter && <a href={`http://localhost:5000/uploads/${employee.documents.experienceLetter}`} target="_blank" rel="noreferrer" className="doc-link">💼 Experience Letter</a>}
          {employee.documents?.bankPassbook && <a href={`http://localhost:5000/uploads/${employee.documents.bankPassbook}`} target="_blank" rel="noreferrer" className="doc-link">🏦 Bank Passbook</a>}
        </div>
      </div>

      <button onClick={onBack} className="back-btn" style={{ marginTop: '30px' }}>
        ← Back to Employee List
      </button>
    </div>
  );
};

export default ViewEmployee;