import React, { useState, useEffect } from "react";
import axios from "axios";
import "../../../style/admin/EmployeeForm.css";

const AddEmployee = ({ onBack, onSuccess }) => {
  const token = localStorage.getItem("token");

  const [departments, setDepartments] = useState([]);
  // New state for specific UI feedback
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
    password: "",
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
  const showMessage = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000); // Message disappears after 5 seconds
  };

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
        showMessage("Failed to load departments from server");
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

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      showMessage(`Invalid file type for ${name}. Only JPG, PNG or PDF allowed`);
      e.target.value = null; // Reset input
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showMessage(`File ${name} is too large. Must be less than 2MB`);
      e.target.value = null; // Reset input
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
    if (!formData.firstName.trim()) { showMessage("First Name is required"); return false; }
    if (!formData.email.trim()) { showMessage("Email is required"); return false; }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) { showMessage("Invalid Email format"); return false; }
    if (!formData.mobile) { showMessage("Mobile number is required"); return false; }
    if (!/^\d{10}$/.test(formData.mobile)) { showMessage("Mobile number must be exactly 10 digits"); return false; }
    if (!formData.department) { showMessage("Please select a department"); return false; }
    if (!formData.salary || formData.salary <= 0) { showMessage("Please enter a valid salary amount"); return false; }
    if (!formData.password || formData.password.length < 6) { showMessage("Password must be at least 6 characters"); return false; }
    if (!formData.joiningDate) { showMessage("Joining Date is required"); return false; }
    
    return true;
  };

  /* ===============================
      SUBMIT
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

      const res = await axios.post(
        "http://localhost:5000/api/employees",
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      showMessage("Employee Added Successfully ✅", "success");

      if (onSuccess) {
        setTimeout(() => onSuccess(res.data), 1500);
      }

    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to add employee to the database";
      showMessage(errMsg);
    }
  };

  return (
    <div className="employee-form-page">
      <div className="employee-form-card">
        <h2>Add Employee</h2>

        {/* Floating Message Display */}
        {message.text && (
          <div className={`form-message ${message.type}`}>
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
              <label>Mobile</label>
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
                <option value="">Select</option>
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
                required
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
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
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
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="employee">Employee</option>
                <option value="manager">HRManager</option>
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

          </div>

          <div className="document-section">
            <h3>Employee Documents</h3>

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
            <button type="submit" className="save-btn">
              Save
            </button>

            <button
              type="button"
              className="cancel-btn"
              onClick={onBack}
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddEmployee;