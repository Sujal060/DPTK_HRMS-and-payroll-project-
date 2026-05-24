import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";

const HRList = () => {
  const [hrs, setHrs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [view, setView] = useState("list");
  const [selectedHR, setSelectedHR] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });
  const token = localStorage.getItem("token");

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", mobile: "", gender: "Male",
    department: "", designation: "HR Manager", joiningDate: new Date().toISOString().split('T')[0],
    dob: "", salary: "", role: "hr", status: "Active", password: "", address: "",
  });

  const [documents, setDocuments] = useState({
    profilePhoto: null, resume: null, aadhaarCard: null,
    panCard: null, educationCertificate: null, bankPassbook: null
  });

  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const fetchData = useCallback(async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [deptRes, hrRes] = await Promise.all([
        axios.get("http://localhost:5000/api/departments", config),
        axios.get("http://localhost:5000/api/employees?role=hr", config)
      ]);
      setDepartments(deptRes.data);
      setHrs(hrRes.data.filter(emp => emp.role === "hr" || emp.employeeId?.startsWith("HR-")));
    } catch (error) {
      showMsg("Failed to load data from server");
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ===============================
      DELETE HANDLER
  =============================== */
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this HR record? This action cannot be undone.")) {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        await axios.delete(`http://localhost:5000/api/employees/${id}`, config);
        showMsg("HR Record Deleted Successfully", "success");
        // Update local state to remove the deleted item immediately
        setHrs(prev => prev.filter(hr => hr._id !== id));
      } catch (err) {
        showMsg(err.response?.data?.message || "Failed to delete record");
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      showMsg(`Invalid type for ${e.target.name}. Use JPG, PNG or PDF`);
      e.target.value = null;
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showMsg("File is too large (Max 2MB)");
      e.target.value = null;
      return;
    }
    setDocuments({ ...documents, [e.target.name]: file });
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) return showMsg("First Name is required");
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) return showMsg("Invalid Email format");
    if (!/^\d{10}$/.test(formData.mobile)) return showMsg("Mobile must be 10 digits");
    if (!formData.department) return showMsg("Select a Department");
    if (!selectedHR && (!formData.password || formData.password.length < 6)) 
       return showMsg("Password must be at least 6 characters");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    Object.keys(documents).forEach(key => {
      if (documents[key]) data.append(key, documents[key]);
    });

    try {
      const config = { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } };
      if (selectedHR) {
        await axios.put(`http://localhost:5000/api/employees/${selectedHR._id}`, data, config);
        showMsg("HR Updated Successfully ✅", "success");
      } else {
        await axios.post("http://localhost:5000/api/employees", data, config);
        showMsg("HR Registered Successfully ✅", "success");
      }
      resetForm();
      fetchData();
    } catch (err) {
      showMsg(err.response?.data?.message || "Server Error");
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "", lastName: "", email: "", mobile: "", gender: "Male",
      department: "", designation: "HR Manager", salary: "", role: "hr",
      status: "Active", password: "", address: "", dob: "",
      joiningDate: new Date().toISOString().split('T')[0],
    });
    setDocuments({ profilePhoto: null, resume: null, aadhaarCard: null, panCard: null, educationCertificate: null, bankPassbook: null });
    setSelectedHR(null);
    setView("list");
  };

  return (
    <div className="hr-panel">
      <style>{`
        .hr-panel { padding: 30px; background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .card { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .main-table { width: 100%; border-collapse: collapse; }
        .main-table th { background: #0f5ad1; color: white; padding: 12px; text-align: left; font-size: 13px; }
        .main-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .btn-edit { color: #2563eb; border: none; background: none; cursor: pointer; font-weight: bold; margin-right: 15px; }
        .btn-delete { color: #ef4444; border: none; background: none; cursor: pointer; font-weight: bold; }
        .btn-primary { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
        .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 25px; }
        .doc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; background: #f1f5f9; padding: 15px; border-radius: 8px; }
        .input-item { display: flex; flex-direction: column; gap: 5px; }
        .input-item label { font-weight: 600; font-size: 13px; color: #475569; }
        .input-item input, .input-item select { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; }
      `}</style>

      <div style={{display:'flex', justifyContent:'space-between', marginBottom: '20px', alignItems:'center'}}>
        <h2 style={{color: '#1e293b', margin:0}}>HR Management</h2>
        {view === "list" && <button className="btn-primary" onClick={() => setView("form")}>+ Add HR</button>}
      </div>

      {message.text && (
        <div style={{padding:'12px', borderRadius:'6px', marginBottom:'20px', textAlign:'center',
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#15803d' : '#b91c1c', fontWeight: 'bold'}}>{message.text}</div>
      )}

      <div className="card">
        {view === "list" ? (
          <table className="main-table">
            <thead>
              <tr><th>ID</th><th>Name</th><th>Department</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {hrs.length > 0 ? hrs.map(hr => (
                <tr key={hr._id}>
                  <td>{hr.employeeId}</td>
                  <td>{hr.firstName} {hr.lastName}</td>
                  <td>{hr.department?.name || "N/A"}</td>
                  <td style={{color: hr.status === 'Active' ? '#10b981' : '#f59e0b'}}>{hr.status}</td>
                  <td>
                    <button className="btn-edit" onClick={() => { 
                      setSelectedHR(hr); 
                      setFormData({...hr, department: hr.department?._id || "", password: ""});
                      setView("form");
                    }}>Edit</button>
                    
                    {/* DELETE BUTTON */}
                    <button className="btn-delete" onClick={() => handleDelete(hr._id)}>Delete</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" style={{textAlign:'center', padding:'30px', color:'#64748b'}}>No records found.</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Form Fields remain same as previous update */}
            <div className="form-grid">
              <div className="input-item"><label>First Name*</label><input name="firstName" value={formData.firstName} onChange={handleChange} required /></div>
              <div className="input-item"><label>Last Name</label><input name="lastName" value={formData.lastName} onChange={handleChange} /></div>
              <div className="input-item"><label>Email*</label><input type="email" name="email" value={formData.email} onChange={handleChange} required /></div>
              <div className="input-item"><label>Mobile*</label><input name="mobile" value={formData.mobile} onChange={handleChange} required /></div>
              <div className="input-item">
                <label>Department*</label>
                <select name="department" value={formData.department} onChange={handleChange} required>
                  <option value="">Select Dept</option>
                  {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
              <div className="input-item"><label>Salary (LPA)*</label><input type="number" name="salary" value={formData.salary} onChange={handleChange} required /></div>
              {!selectedHR && <div className="input-item"><label>Password*</label><input type="password" name="password" value={formData.password} onChange={handleChange} required /></div>}
              <div className="input-item"><label>Joining Date</label><input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} /></div>
              <div className="input-item"><label>DOB</label><input type="date" name="dob" value={formData.dob} onChange={handleChange} /></div>
            </div>

            <h3 style={{fontSize:'16px', marginBottom:'10px'}}>HR Documents</h3>
            <div className="doc-grid">
              <div className="input-item"><label>Profile Photo</label><input type="file" name="profilePhoto" onChange={handleFileChange} accept="image/*" /></div>
              <div className="input-item"><label>Resume (PDF)</label><input type="file" name="resume" onChange={handleFileChange} accept=".pdf" /></div>
              <div className="input-item"><label>Aadhaar Card</label><input type="file" name="aadhaarCard" onChange={handleFileChange} /></div>
              <div className="input-item"><label>PAN Card</label><input type="file" name="panCard" onChange={handleFileChange} /></div>
            </div>

            <div style={{textAlign:'right', marginTop:'20px'}}>
              <button type="button" onClick={resetForm} style={{marginRight:'10px', padding:'10px 20px', borderRadius:'6px', border:'1px solid #ccc', cursor:'pointer'}}>Cancel</button>
              <button type="submit" className="btn-primary">{selectedHR ? "Update HR" : "Save HR"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default HRList;