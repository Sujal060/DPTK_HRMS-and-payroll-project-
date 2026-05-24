import React, { useState, useEffect } from "react";
import axios from "axios";
import "../../../style/admin/EmployeeForm.css";

const EditEmployee = ({ employeeId, onBack, onSuccess }) => {
  const token = localStorage.getItem("token");

  const [departments, setDepartments] = useState([]);
  // UI Message state
  const [message, setMessage] = useState({ text: "", type: "" });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    gender: "",
    department: "",
    designation: "",
    joiningDate: "",
    dob: "",
    salary: "",
    role: "employee",
    status: "Active",
    address: "",
  });

  const [documents, setDocuments] = useState({
    profilePhoto: null,
    resume: null,
    aadhaarCard: null,
    panCard: null,
    educationCertificate: null,
    experienceLetter: null,
    bankPassbook: null,
  });

  /* ===============================
      HELPER: SHOW MESSAGE FOR TIME
  =============================== */
  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  /* ===============================
      LOAD EMPLOYEE DATA
  =============================== */
useEffect(() => {
  let isMounted = true;
  const fetchEmployee = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/employees/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (isMounted) {
        const emp = res.data;
        setFormData({
          firstName: emp.firstName || "",
          lastName: emp.lastName || "",
          email: emp.email || "",
          mobile: emp.mobile || "",
          gender: emp.gender || "",
          department: emp.department?._id || emp.department || "",
          designation: emp.designation || "",
          joiningDate: emp.joiningDate ? emp.joiningDate.split("T")[0] : "",
          dob: emp.dob ? emp.dob.split("T")[0] : "",
          salary: emp.salary || "",
          role: emp.role || "employee",
          status: emp.status || "Active",
          address: emp.address || "",
        });
      }
    } catch (err) {
      if (isMounted) showMsg("Failed to load employee details.");
    }
  };

  if (employeeId) fetchEmployee();
  return () => { isMounted = false; };
}, [employeeId, token]);

  /* ===============================
      LOAD DEPARTMENTS
  =============================== */
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/departments",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setDepartments(res.data);
      } catch (err) {
        showMsg("Failed to load departments.");
      }
    };

    fetchDepartments();
  }, [token]);

  /* ===============================
      INPUT CHANGE
  =============================== */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  /* ===============================
      FILE CHANGE WITH VALIDATION
  =============================== */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const name = e.target.name;

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

    if (!allowedTypes.includes(file.type)) {
      showMsg(`Invalid file type for ${name}. Only JPG, PNG or PDF allowed`);
      e.target.value = null; 
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showMsg(`File ${name} is too large. Max limit is 2MB`);
      e.target.value = null;
      return;
    }

    setDocuments({
      ...documents,
      [name]: file,
    });
  };

  /* ===============================
      FORM VALIDATION
  =============================== */
  const validateForm = () => {
    if (!formData.firstName.trim() || !formData.email.trim() || !formData.salary) {
      showMsg("First Name, Email, and Salary are mandatory fields.");
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      showMsg("Please enter a valid email address.");
      return false;
    }

    if (formData.mobile && !/^\d{10}$/.test(formData.mobile)) {
      showMsg("Mobile number must be exactly 10 digits.");
      return false;
    }

    if (!formData.department) {
      showMsg("Please assign a department to the employee.");
      return false;
    }

    return true;
  };

  /* ===============================
      UPDATE SUBMIT
  =============================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const data = new FormData();

      Object.keys(formData).forEach((key) => {
        if (formData[key] !== "") {
          data.append(key, formData[key]);
        }
      });

      Object.keys(documents).forEach((key) => {
        if (documents[key]) {
          data.append(key, documents[key]);
        }
      });

      const res = await axios.put(
        `http://localhost:5000/api/employees/${employeeId}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      showMsg("Employee Updated Successfully ✅", "success");

      if (onSuccess) {
        setTimeout(() => onSuccess(res.data), 1500);
      }

    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to update employee record ❌";
      showMsg(errMsg);
    }
  };

  return (
    <div className="employee-form-page">
      <div className="employee-form-card">
        <h2>Edit Employee</h2>

        {/* Floating UI Message */}
        {message.text && (
          <div style={{
            padding: '10px',
            marginBottom: '15px',
            borderRadius: '4px',
            textAlign: 'center',
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">

            <div className="form-group">
              <label>First Name</label>
              <input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Mobile Number</label>
              <input
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Designation</label>
              <input
                name="designation"
                value={formData.designation}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Joining Date</label>
              <input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Salary</label>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select name="role" value={formData.role} onChange={handleChange}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

          </div>

          <div className="document-section">
            <h3>Update Documents</h3>

            <div className="form-group">
              <label>Profile Photo</label>
              <input type="file" name="profilePhoto" accept=".jpg,.jpeg,.png" onChange={handleFileChange} />
            </div>

            <div className="form-group">
              <label>Resume</label>
              <input type="file" name="resume" accept=".pdf" onChange={handleFileChange} />
            </div>

            <div className="form-group">
              <label>Aadhaar Card</label>
              <input type="file" name="aadhaarCard" accept=".pdf,.jpg,.png" onChange={handleFileChange} />
            </div>

            <div className="form-group">
              <label>PAN Card</label>
              <input type="file" name="panCard" accept=".pdf,.jpg,.png" onChange={handleFileChange} />
            </div>

            <div className="form-group">
              <label>Education Certificate</label>
              <input type="file" name="educationCertificate" accept=".pdf" onChange={handleFileChange} />
            </div>

            <div className="form-group">
              <label>Experience Letter</label>
              <input type="file" name="experienceLetter" accept=".pdf" onChange={handleFileChange} />
            </div>

            <div className="form-group">
              <label>Bank Passbook</label>
              <input type="file" name="bankPassbook" accept=".pdf,.jpg,.png" onChange={handleFileChange} />
            </div>

          </div>

          <div className="form-buttons">
            <button type="submit" className="save-btn">Update</button>

            <button type="button" className="cancel-btn" onClick={onBack}>
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditEmployee;