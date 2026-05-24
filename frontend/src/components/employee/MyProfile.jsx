import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000";

const MyProfile = () => {
  const token = localStorage.getItem("token");

  const [profile, setProfile] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const fetchProfile = useCallback(async () => {
    try {
      setFetching(true);
      const res = await axios.get(`${API_BASE_URL}/api/employee/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
    } catch (err) {
      showMsg("Error loading profile. Please login again.");
    } finally {
      setFetching(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setSelectedImage(null);
    setPreviewUrl(null);
    fetchProfile();
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("firstName", profile.firstName);
      formData.append("lastName", profile.lastName);
      formData.append("mobile", profile.mobile || "");
      formData.append("address", profile.address || "");
      if (selectedImage) formData.append("profilePhoto", selectedImage);

      const res = await axios.put(`${API_BASE_URL}/api/employee/profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setProfile(res.data.updatedProfile || profile);
      showMsg("Profile updated successfully ✅", "success");
      setEditMode(false);
      setSelectedImage(null);
    } catch (err) {
      showMsg("Update failed. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const s = {
    wrapper: { backgroundColor: "#f8fafc", minHeight: "100vh", padding: "40px 20px", fontFamily: "'Inter', sans-serif", color: "#1e293b" },
    card: { maxWidth: "1100px", margin: "0 auto", backgroundColor: "#fff", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)", overflow: "hidden", border: "1px solid #e2e8f0" },
    header: { 
  position: "relative", 
  height: "200px", 
  background: "radial-gradient(circle at top right, #1e293b, #0f172a)",
  overflow: "hidden" 
}, 
    headerOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: "100%", background: "linear-gradient(to top, rgba(15,23,42,0.8), transparent)" },
    
    // FIXED: Avatar Section - Remove the large top margin here
    avatarSection: { display: "flex", alignItems: "center", padding: "0 40px", gap: "25px", position: "relative", zIndex: 2 },

    // FIXED: Avatar Wrapper - Apply the negative margin ONLY here to pull the photo up
    avatarWrapper: {
      position: "relative",
      cursor: editMode ? "pointer" : "default",
      width: "140px", // Slightly reduced container size to prevent half-cut look
      height: "140px",
      borderRadius: "50%",
      border: "4px solid #fff",
      backgroundColor: "#fff",
      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
      boxSizing: "border-box",
      marginTop: "-70px", // Pulls only the image up, not the text
    },
    avatar: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transition: "all 0.3s ease",
      display: "block",
      borderRadius: "50%",
    },
    cameraBadge: {
      position: "absolute",
      bottom: "0px",
      right: "0px",
      backgroundColor: "#2563eb",
      width: "36px",
      height: "36px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      border: "3px solid #fff",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      zIndex: 3
    },

    nameArea: { flex: 1, marginTop: "15px" }, // Aligned with the bottom of the photo container
    mainName: { fontSize: "28px", fontWeight: "700", color: "#1e293b", margin: "0 0 4px 0", letterSpacing: "-0.5px" }, // Changed text color to be visible against white card
    subTitle: { fontSize: "14px", color: "#64748b", fontWeight: "400", display: "flex", alignItems: "center", gap: "8px" },
    badge: { backgroundColor: "#f1f5f9", padding: "3px 10px", borderRadius: "100px", fontSize: "11px", color: "#475569", border: "1px solid #e2e8f0" },
    contentGrid: { padding: "40px", display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "50px" },
    sectionTitle: { fontSize: "14px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" },
    inputGroup: { marginBottom: "20px" },
    label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "8px" },
    input: { width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "15px", color: "#1e293b", outline: "none", transition: "all 0.2s ease" },
    readOnlyBox: { padding: "12px 16px", borderRadius: "8px", backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0", color: "#64748b", fontSize: "15px" },
    sidebarCard: { backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px" },
    metricRow: { display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #e2e8f0" },
    metricLabel: { color: "#64748b", fontSize: "14px" },
    metricValue: { fontWeight: "600", color: "#0f172a", fontSize: "14px" },
    pointCard: { marginTop: "24px", padding: "20px", background: "#f0f9ff", borderRadius: "12px", border: "1px solid #bae6fd", textAlign: "center" },
    btnPrimary: { backgroundColor: "#2563eb", color: "#fff", padding: "10px 24px", borderRadius: "8px", border: "none", fontWeight: "600", fontSize: "13px", cursor: "pointer", transition: "0.2s", marginTop: "15px" },
    btnSecondary: { backgroundColor: "#fff", color: "#475569", padding: "10px 20px", borderRadius: "8px", border: "1px solid #e2e8f0", fontWeight: "600", fontSize: "13px", cursor: "pointer", marginRight: "12px", marginTop: "15px" }
  };

  if (fetching) return <div style={{ textAlign: "center", padding: "100px", fontSize: "16px", color: "#64748b" }}>Synchronizing Profile Data...</div>;

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.headerOverlay}></div>
        </div>
        
        {/* The avatar section is now placed outside the header div to guarantee visibility */}
        <div style={s.avatarSection}>
          {/* FIXED PHOTO SECTION */}
          <div style={s.avatarWrapper}>
            <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: "50%" }}>
              <img
                src={previewUrl || (profile.profilePhoto ? `${API_BASE_URL}/uploads/${profile.profilePhoto}` : `https://ui-avatars.com/api/?name=${profile.firstName}+${profile.lastName}&background=2563eb&color=fff`)}
                alt="Profile"
                style={{
                  ...s.avatar,
                  filter: (editMode && selectedImage) || (editMode && previewUrl) ? "brightness(0.8)" : "none"
                }}
              />
              {editMode && (
                <label style={{
                  position: "absolute",
                  top: 0, left: 0, width: "100%", height: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(15, 23, 42, 0.3)",
                  cursor: "pointer",
                  transition: "0.3s opacity"
                }}>
                  <input type="file" onChange={handleImageChange} hidden />
                </label>
              )}
            </div>
            {/* Camera badge moved outside the overflow:hidden div */}
            {editMode && (
              <div style={s.cameraBadge}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </div>
            )}
          </div>

          <div style={s.nameArea}>
            <h1 style={s.mainName}>{profile.firstName} {profile.lastName}</h1>
            <div style={s.subTitle}>
              <span>{profile.designation || "Executive"}</span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span style={s.badge}>ID: {profile.employeeId}</span>
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            {!editMode ? (
              <button style={s.btnPrimary} onClick={() => setEditMode(true)}>Edit Profile</button>
            ) : (
              <div style={{ display: "flex" }}>
                <button style={s.btnSecondary} onClick={handleCancel}>Cancel</button>
                <button style={s.btnPrimary} onClick={updateProfile} disabled={loading}>
                  {loading ? "Updating..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>

        {message.text && (
          <div style={{ margin: "20px 40px 0", padding: "14px", borderRadius: "8px", backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', color: message.type === 'success' ? '#15803d' : '#b91c1c', textAlign: "center", fontSize: "14px", fontWeight: "500", border: `1px solid ${message.type === 'success' ? '#bcf0da' : '#fecaca'}` }}>
            {message.text}
          </div>
        )}

        <div style={s.contentGrid}>
          {/* Main Content Area */}
          <div>
            <div style={{ marginBottom: "40px" }}>
              <h3 style={s.sectionTitle}>
                <span style={{ width: "4px", height: "14px", backgroundColor: "#2563eb", display: "inline-block", borderRadius: "4px" }}></span>
                Personal Information
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div style={s.inputGroup}>
                  <label style={s.label}>First Name</label>
                  {editMode ? (<input style={s.input} name="firstName" value={profile.firstName || ""} onChange={handleChange} />) : (<div style={s.readOnlyBox}>{profile.firstName}</div>)}
                </div>
                <div style={s.inputGroup}>
                  <label style={s.label}>Last Name</label>
                  {editMode ? (<input style={s.input} name="lastName" value={profile.lastName || ""} onChange={handleChange} />) : (<div style={s.readOnlyBox}>{profile.lastName}</div>)}
                </div>
                <div style={s.inputGroup}>
                  <label style={s.label}>Contact Number</label>
                  {editMode ? (<input style={s.input} name="mobile" value={profile.mobile || ""} onChange={handleChange} />) : (<div style={s.readOnlyBox}>{profile.mobile || "—"}</div>)}
                </div>
                <div style={s.inputGroup}>
                  <label style={s.label}>Primary Address</label>
                  {editMode ? (<input style={s.input} name="address" value={profile.address || ""} onChange={handleChange} />) : (<div style={s.readOnlyBox}>{profile.address || "—"}</div>)}
                </div>
              </div>
            </div>

            <div>
              <h3 style={s.sectionTitle}>
                <span style={{ width: "4px", height: "14px", backgroundColor: "#94a3b8", display: "inline-block", borderRadius: "4px" }}></span>
                System Access
              </h3>
              <div style={s.inputGroup}>
                <label style={s.label}>Corporate Email</label>
                <div style={s.readOnlyBox}>{profile.email}</div>
              </div>
            </div>
          </div>

          <div>
            <div style={s.sidebarCard}>
              <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "20px" }}>Work Record</h3>
              <div style={s.metricRow}> <span style={s.metricLabel}>Employee ID</span> <span style={s.metricValue}>{profile.employeeId}</span> </div>
              <div style={s.metricRow}> <span style={s.metricLabel}>Department</span> <span style={s.metricValue}>{profile.department?.name || "Corporate"}</span> </div>
              <div style={s.metricRow}> <span style={s.metricLabel}>Hire Date</span> <span style={s.metricValue}>{profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString('en-GB') : "N/A"}</span> </div>
              <div style={s.metricRow}> <span style={s.metricLabel}>Base Salary</span> <span style={{ ...s.metricValue, color: "#16a34a" }}>₹{profile.salary?.toLocaleString()}</span> </div>
              <div style={s.metricRow}> <span style={s.metricLabel}>Gender</span> <span style={s.metricValue}>{profile.gender}</span> </div>

              <div style={s.pointCard}>
                <div style={{ fontSize: "11px", color: "#0369a1", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Performance Score</div>
                <div style={{ fontSize: "28px", fontWeight: "800", color: "#0284c7" }}>{profile.points || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;