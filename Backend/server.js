const express = require("express"); 
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

require("dotenv").config();
const SECRET_KEY = process.env.JWT_SECRET;

/* ======================================
   📦 MongoDB Connection
====================================== */
mongoose
  .connect("mongodb://127.0.0.1:27017/hr")
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.log("DB Error:", err));

/* ======================================
   👤 USER SCHEMA
====================================== */
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true },
  password: { type: String, required: true },
  otp: Number,
  otpExpiry: Date
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);


/* ======================================
   👤 EMPLOYEE SCHEMA
====================================== */
  const EmployeeSchema = new mongoose.Schema({
  employeeId: String,
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  mobile: String,
  gender: String,
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department"
  },
  designation: String,
  joiningDate: Date,
  salary: Number,
  
  // --- PROFESSIONAL UPDATES START ---
  points: { type: Number, default: 0 }, // Tracks performance for milestones
  salaryHistory: [{
    previousSalary: Number,
    newSalary: Number,
    incrementDate: { type: Date, default: Date.now },
    reason: { type: String, default: "Performance Milestone Reached" }
  }],
  // --- PROFESSIONAL UPDATES END ---

  role: String,
  status: String,
  password: String,
  address: String,
  dob: Date,
  resume: String,
  profilePhoto: String,
  documents: {
    aadhaarCard: String,
    panCard: String,
    offerLetter: String,
    appointmentLetter: String,
    educationCertificate: String,
    experienceLetter: String,
    bankPassbook: String
  },
  liveLocation: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }
}, { timestamps: true });

const Employee = mongoose.model("Employee", EmployeeSchema);

  // Department Schema
const DepartmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  status: { type: String, default: "Active" }
}, { timestamps: true });

const Department = mongoose.model("Department", DepartmentSchema);


const LeaveSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  fromDate: Date,
  toDate: Date,
  reason: String,
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  }
}, { timestamps: true });

const Leave = mongoose.model("Leave", LeaveSchema);
/* ======================================
   📧 Mail Configuration
====================================== */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
},
});
transporter.verify((error, success) => {
  if (error) console.log("Mail Error ❌:", error);
  else console.log("Mail Server Ready ✅");
});

/* ======================================
   🔐 Multer File Upload Config
====================================== */
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Serve uploads publicly
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ======================================
   🔐 LOGIN - SIMPLE
====================================== */
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check Admin (User Collection)
    const admin = await User.findOne({ email });
    if (admin) {
      if (admin.password !== password) {
        return res.status(401).json({ message: "Invalid Email or Password" });
      }
      
      // Included role in token
      const token = jwt.sign(
        { id: admin._id, role: "admin" }, 
        SECRET_KEY, 
        { expiresIn: "1d" }
      );
      
      return res.json({ 
        message: "Admin Login Successful", 
        token, 
        role: "admin",
        user: { id: admin._id, firstName: "Admin", email: admin.email } 
      });
    }

    // 2. Check Employee Collection (Handles both HR and Employee)
    const person = await Employee.findOne({ email });
    
    if (person) {
      if (person.password !== password) {
        return res.status(401).json({ message: "Invalid Email or Password" });
      }

      if (person.status === "Inactive") {
        return res.status(403).json({ message: "Account is deactivated. Contact Admin." });
      }

      const userRole = person.role || "employee"; 

      /* ==========================================================
         CRITICAL UPDATE: Added employeeId to the JWT payload
      ========================================================== */
      const token = jwt.sign(
        { 
          id: person._id, 
          role: userRole, 
          employeeId: person.employeeId // Added for Peer-Block verification
        }, 
        SECRET_KEY, 
        { expiresIn: "1d" }
      );

      return res.json({
        message: `${userRole.toUpperCase()} Login Successful`,
        token,
        role: userRole,
        user: {
          id: person._id,
          employeeId: person.employeeId,
          firstName: person.firstName,
          lastName: person.lastName,
          points: person.points,
          profilePhoto: person.profilePhoto,
          lastLocation: person.liveLocation 
        }
      });
    }

    return res.status(404).json({ message: "User not found" });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ======================================
   🔐 FORGOT PASSWORD - SEND OTP
====================================== */
app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user =
      (await User.findOne({ email })) ||
      (await Admin.findOne({ email })) ||
      (await HR.findOne({ email })) ||
      (await Employee.findOne({ email }));

    if (!user)
      return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000); // NUMBER

    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await user.save();

    await transporter.sendMail({
      from: `"HR System" <patelsujal097@gmail.com>`,
      to: user.email,
      subject: "Password Reset OTP",
      html: `<h2>Your OTP is: ${otp}</h2>
             <p>Valid for 5 minutes</p>`
    });

    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ==============================
   🔹 VERIFY OTP API
============================== */

app.post("/api/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const user =
    (await Admin.findOne({ email })) ||
    (await HR.findOne({ email }));

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // ❌ Wrong OTP
  if (user.otp != otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // ❌ Expired OTP
  if (Date.now() > user.otpExpiry) {
    return res.status(400).json({ message: "OTP expired" });
  }

  // ✅ Correct OTP
  res.json({ message: "OTP verified successfully ✅" });
});
/* ======================================
   🔐 RESET PASSWORD - VERIFY OTP
====================================== */
app.post("/api/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user =
      (await User.findOne({ email })) ||
      (await Admin.findOne({ email })) ||
      (await HR.findOne({ email })) ||
      (await Employee.findOne({ email }));

    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.otp !== Number(otp))
      return res.status(400).json({ message: "Invalid OTP" });

    if (user.otpExpiry < new Date())
      return res.status(400).json({ message: "OTP expired" });

    user.password = newPassword;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    res.json({ message: "Password reset successful ✅" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});
/* ======================================
    🔑 AUTH MIDDLEWARE
====================================== */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    
    // Decoded now includes: { id, role, employeeId }
    req.user = decoded; 
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* ======================================
    👤 GET CURRENT USER
====================================== */
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    let user = null;
    // Extracting employeeId alongside id and role from the verified token
    const { id, role, employeeId } = req.user; 

    // 1. ADMIN LOGIC
    if (role === "admin") {
      user = await User.findById(id).select("-password -otp -otpExpiry");
    } 
    
    // 2. HR LOGIC
    else if (role === "hr") {
      user = await Employee.findById(id)
        .populate("department")
        .select("-password -otp -otpExpiry");
    } 
    
    // 3. EMPLOYEE LOGIC
    else if (role === "employee") {
      user = await Employee.findById(id)
        .populate("department")
        .select("-password");
    }

    // Validation Check: Verify database existence AND employeeId match (if applicable)
    if (!user) {
      return res.status(404).json({ message: "User session invalid" });
    }

    // Security Verification: If the user is an employee/hr, 
    // ensure the ID in the token matches the ID in the database record.
    if (role !== "admin" && user.employeeId !== employeeId) {
       return res.status(403).json({ message: "Identity mismatch. Please login again." });
    }

    const userData = user.toObject();

    res.json({
      ...userData,
      role: role // Explicitly send back the verified role
    });

  } catch (err) {
    console.error("Auth Me Error:", err);
    res.status(500).json({ message: "Server error during session fetch" });
  }
});

/* ======================================
   🧾 EMPLOYEE CRUD ROUTES
====================================== */
const employeeRouter = express.Router();

// 1. CREATE EMPLOYEE / HR (Unified)
employeeRouter.post("/", authMiddleware, upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "resume", maxCount: 1 },
    { name: "aadhaarCard", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "educationCertificate", maxCount: 1 },
    { name: "experienceLetter", maxCount: 1 },
    { name: "bankPassbook", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        firstName, lastName, email, mobile, gender,
        department, designation, joiningDate, salary,
        role, status, password, address, dob,
      } = req.body;

      // 1. STAGE ONE: Validation
      // Ensure these match exactly what you send from the frontend
      if (!firstName || !email || !password) {
        return res.status(400).json({ message: "Missing First Name, Email, or Password" });
      }

      const existing = await Employee.findOne({ email });
      if (existing) return res.status(400).json({ message: "This email is already registered." });

      // 2. STAGE TWO: ID Generation
      const userRole = role?.toLowerCase() || "employee";
      const isHR = userRole === "hr" || userRole === "management";
      const prefix = isHR ? "HR-DPTK-" : "DPTK-";

      const count = await Employee.countDocuments({ 
        employeeId: { $regex: new RegExp(`^${prefix}`) } 
      });
      const employeeId = `${prefix}${String(count + 1).padStart(3, "0")}`;

      // 3. STAGE THREE: Save to Database (With fallbacks for empty fields)
      const newEmployee = new Employee({
        employeeId,
        firstName, 
        lastName: lastName || "", 
        email, 
        mobile: mobile || "", 
        gender: gender || "Male",
        department: department || null, 
        designation: designation || "HR Manager", 
        joiningDate: joiningDate || new Date(),
        salary: Number(salary) || 0,
        role: userRole,
        status: status || "Active",
        password, // Ensure your schema doesn't have a 'min' length higher than what you send
        address: address || "", 
        dob: dob || null,
        
        // Optional Chaining to prevent "Cannot read property of undefined" crashes
        profilePhoto: req.files?.profilePhoto?.[0]?.filename || "",
        resume: req.files?.resume?.[0]?.filename || "",
        documents: {
          aadhaarCard: req.files?.aadhaarCard?.[0]?.filename || "",
          panCard: req.files?.panCard?.[0]?.filename || "",
          educationCertificate: req.files?.educationCertificate?.[0]?.filename || "",
          experienceLetter: req.files?.experienceLetter?.[0]?.filename || "",
          bankPassbook: req.files?.bankPassbook?.[0]?.filename || ""
        }
      });

      await newEmployee.save();

      // 4. STAGE FOUR: Safe Email Sending
      // We wrap this in its own try/catch so an email error doesn't roll back the whole registration
      try {
        if (transporter) {
            await transporter.sendMail({
                from: `"HR DPTK" <patelsujal097@gmail.com>`,
                to: newEmployee.email,
                subject: `Login Credentials - ${isHR ? 'HR' : 'Employee'}`,
                html: `<h3>Welcome to DPTradeKing, ${newEmployee.firstName}!</h3>
                       <p><b>Employee ID:</b> ${newEmployee.employeeId}</p>
                       <p><b>Password:</b> ${newEmployee.password}</p>`
            });
        }
      } catch (mailErr) {
        console.error("Email failed to send, but user was created:", mailErr.message);
      }

      const employeeData = newEmployee.toObject();
      delete employeeData.password;
      res.status(201).json({ message: "Registered Successfully ✅", employee: employeeData });

    } catch (err) {
      console.error("BACKEND CRASH LOG:", err); // CHECK YOUR TERMINAL FOR THIS
      res.status(500).json({ 
        message: "Internal Server Error", 
        error: err.message, // This helps you see the error in Chrome DevTools
        stack: err.stack 
      });
    }
  }
);

// 2. GET ALL (With Query Filtering)
employeeRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const { type } = req.query; // Capture ?type=hr or ?type=staff
    let query = {};

    if (type === "hr") {
      query = { employeeId: { $regex: /^HR-DPTK-/ } };
    } else if (type === "staff") {
      query = { employeeId: { $regex: /^DPTK(?!-HR)/ } };
    }

    const employees = await Employee.find(query)
      .populate("department", "name")
      .sort({ createdAt: -1 });

    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET EMPLOYEE BY ID
// NEW: GET AUDIT HISTORY (Salary History for Admin/HR)
// GET SINGLE EMPLOYEE DETAILS (This is what your Edit component needs)
employeeRouter.get("/:id", authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate("department"); // Populate if you want department names

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: "Error fetching employee", error: err.message });
  }
});
  
// UPDATE EMPLOYEE
employeeRouter.put(
  "/:id",
  authMiddleware,
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "resume", maxCount: 1 },
    { name: "aadhaarCard", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "educationCertificate", maxCount: 1 },
    { name: "experienceLetter", maxCount: 1 },
    { name: "bankPassbook", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const employeeIdParam = req.params.id;
      const employee = await Employee.findById(employeeIdParam);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const {
        firstName, lastName, email, mobile, gender,
        department, designation, joiningDate, salary,
        role, status, password, address, dob,
      } = req.body;

      // PROFESSIONAL LOGIC: Detect Salary Change & Log History
      if (salary && Number(salary) !== employee.salary) {
        employee.salaryHistory.push({
          previousSalary: employee.salary,
          newSalary: Number(salary),
          reason: "Manual Performance Increment"
        });
        employee.salary = Number(salary);
        // Optional: Reset points if a raise is given manually
        employee.points = 0; 
      }

      // Update remaining fields (keeping your existing logic)
      employee.firstName = firstName || employee.firstName;
      employee.lastName = lastName || employee.lastName;
      employee.email = email || employee.email;
      employee.mobile = mobile || employee.mobile;
      employee.gender = gender || employee.gender;
      employee.designation = designation || employee.designation;
      employee.role = role || employee.role;
      employee.status = status || employee.status;
      employee.address = address || employee.address;
      employee.dob = dob || employee.dob;

      if (password && password.trim() !== "") {
        employee.password = password; 
      }

      if (department && department !== "[object Object]" && department !== "") {
        employee.department = department;
      }

      // File handling (Keeping your code as is)
      if (req.files?.profilePhoto) employee.profilePhoto = req.files.profilePhoto[0].filename;
      if (req.files?.resume) employee.resume = req.files.resume[0].filename;

      if (!employee.documents) employee.documents = {};
      const docKeys = ["aadhaarCard", "panCard", "educationCertificate", "experienceLetter", "bankPassbook"];
      docKeys.forEach(key => {
        if (req.files?.[key]) {
          employee.documents[key] = req.files[key][0].filename;
        }
      });

      employee.markModified('documents');
      employee.markModified('salaryHistory'); // Ensure history is saved

      await employee.save();

      const employeeData = employee.toObject();
      delete employeeData.password;

      res.status(200).json({
        message: "Employee Updated Professionally",
        employee: employeeData,
      });

    } catch (err) {
      console.error("Update Error:", err);
      res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
  }
);

// DELETE EMPLOYEE (Admin Only - Permanent Cleanup)
employeeRouter.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin only" });
    }

    const employeeId = req.params.id;

    // 1. Delete the Employee
    const emp = await Employee.findByIdAndDelete(employeeId);
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    // 2. Automation: Remove Attendance and Leave data permanently
    await Attendance.deleteMany({ employeeId: employeeId });
    await Leave.deleteMany({ employeeId: employeeId });

    res.json({ message: "Employee and all associated records deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SOFT DELETE EMPLOYEE (HR and Admin - Deactivate & Full Cleanup)
employeeRouter.patch("/:id/soft-delete", authMiddleware, async (req, res) => {
  try {
    // 1. Permission Check
    const userRole = req.user.role.toLowerCase(); // Case-insensitive check
    if (userRole !== "admin" && userRole !== "hr") {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    const employeeId = req.params.id;

    // 2. Update Employee status to Inactive first
    const emp = await Employee.findByIdAndUpdate(
      employeeId,
      { status: "Inactive" },
      { new: true }
    );

    if (!emp) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // 3. Parallel Cleanup: Remove records from ALL associated collections
    // Using Promise.all is more efficient for multiple deletions
    await Promise.all([
      Attendance.deleteMany({ employeeId }),
      Leave.deleteMany({ employeeId }),
      Payroll.deleteMany({ employeeId }),
      Performance.deleteMany({ employeeId }) // Assuming this is your collection name
    ]);

    res.json({ 
      message: `Employee ${emp.firstName} deactivated. All attendance, leaves, performance, and payroll records have been purged.` 
    });

  } catch (err) {
    console.error("Soft Delete Cleanup Error:", err);
    res.status(500).json({ message: "Internal Server Error during cleanup" });
  }
});

// NEW: UPDATE LIVE LOCATION (Called by Employee Dashboard)
employeeRouter.patch("/location/update", authMiddleware, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    // We use the ID from the token (authMiddleware) to ensure 
    // an employee can only update their own location.
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          "liveLocation.lat": Number(lat),
          "liveLocation.lng": Number(lng),
          "liveLocation.lastUpdated": new Date()
        }
      },
      { new: true }
    );

    if (!updatedEmployee) return res.status(404).json({ message: "Employee not found" });

    res.json({ message: "Location updated successfully ✅" });
  } catch (err) {
    res.status(500).json({ message: "Location update failed", error: err.message });
  }
});

app.use("/api/employees", employeeRouter);


/* ======================================
   🧪 TEST MAIL ROUTE
====================================== */
app.get("/test-mail", async (req, res) => {
  try {
    await transporter.sendMail({
      from: "YOUR_GMAIL@gmail.com",
      to: "YOUR_GMAIL@gmail.com",
      subject: "Test Mail",
      text: "Mail is working successfully!",
    });
    res.send("Mail sent successfully ✅");
  } catch (err) {
    console.log("Test Mail Error:", err);
    res.send("Mail failed ❌");
  }
});

//  Add Department
app.post("/api/departments", authMiddleware, async (req, res) => {
  try {
    // Check if the user is neither an admin nor an HR
    if (req.user.role !== "admin" && req.user.role !== "hr") {
      return res.status(403).json({ message: "Access denied: Admins or HR only" });
    }

    const { name } = req.body;

    // Basic validation to ensure name is provided
    if (!name) {
      return res.status(400).json({ message: "Department name is required" });
    }

    const existing = await Department.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Department already exists" });
    }

    const newDepartment = new Department({ name });
    await newDepartment.save();

    res.status(201).json(newDepartment);

  } catch (err) {
    console.error(err); // Good practice to log the error for debugging
    res.status(500).json({ message: "Server Error" });
  }
});
//  Get All Departments
app.get("/api/departments", authMiddleware, async (req, res) => {
  try {
    const departments = await Department.find({ status: "Active" });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});
// DELETE Department
app.delete("/api/departments/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin"&& req.user.role !== "hr") {
      return res.status(403).json({ message: "Admin only" });
    }

    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: "Department deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

//========ATTENDANCE ROUTES========

const cron = require('node-cron');

// ======================================
// 📍 CONFIGURATION
// ======================================
const OFFICE_LAT = 22.553912; 
const OFFICE_LNG = 72.963428; 
const MAX_RADIUS = 2000;      // 2km for your testing
const SHIFT_START_TIME = 9;   // 09:00 AM
const SHIFT_END_TIME = 18;    // 06:00 PM

/* ======================================
   👤 SCHEMA: Each record is tied to 1 Employee + 1 Date
====================================== */
// ===============================
// Attendance Schema
// ===============================
const AttendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },

  // New field to satisfy old index
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },

  date: { type: String, required: true },
  status: { type: String, enum: ["Present", "Absent", "Half-Day", "Leave"], default: "Present" },
  inTime: String,
  outTime: String,
  lat: Number,
  lng: Number,
  remarks: { type: String, default: "" }
}, { timestamps: true });

// Keep old unique index
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", AttendanceSchema, "attendances");

// ===============================
// Auto-Punch Attendance (Fixed)
// ===============================
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // meters
  const toRad = x => x * Math.PI / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // distance in meters
}

// ===============================
// Auto-Punch Attendance (With Points Engine)
// ===============================
app.post("/api/attendance/auto-punch", async (req, res) => {
  try {
    const { employeeId, lat, lng, type } = req.body;

    if (!employeeId || !type) {
      return res.status(400).json({ message: "employeeId and type are required." });
    }

    const Employee = mongoose.model("Employee");
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found." });

    // --- GEODENCING STRICT CHECK ---
    // This prevents the code from even reaching the punch logic if they are outside
    const distance = calculateDistance(lat, lng, OFFICE_LAT, OFFICE_LNG);
    const isInsideOffice = distance <= MAX_RADIUS;

    if (!isInsideOffice) {
      return res.status(403).json({ 
        message: `Punch failed. You are ${Math.round(distance)}m away. You must be within ${MAX_RADIUS}m of the office.` 
      });
    }

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].slice(0, 5);

    let attendance = await Attendance.findOne({ employeeId: employee._id, date: todayStr });

    // Points earned in this specific transaction
    let earnedPointsTotal = 0;

    // --- PUNCH IN LOGIC ---
    if (type === "in") {
      if (attendance) return res.status(400).json({ message: "Already punched in for today." });

      const hour = now.getHours();
      const minute = now.getMinutes();
      let status;
      let earnedPoints = 0;

      // Because of the check above, we know they ARE inside the office here
      if (hour < 12) {
        status = "Present";
        earnedPoints += 5;
        if (hour < 9 || (hour === 9 && minute <= 15)) earnedPoints += 10;
      } else {
        status = "Half-Day";
        earnedPoints -= 5;
      }

      attendance = new Attendance({
        employeeId: employee._id,
        employee: employee._id,
        date: todayStr,
        status,
        inTime: timeStr,
        lat,
        lng,
        remarks: `In: Office | Points: +${earnedPoints}`
      });

      earnedPointsTotal = earnedPoints;
    }

    // --- PUNCH OUT LOGIC ---
    if (type === "out") {
      if (!attendance) return res.status(400).json({ message: "Punch in first." });
      if (attendance.outTime) return res.status(400).json({ message: "Already punched out." });

      const hour = now.getHours();
      let outPoints = 0;
      let earlyLeaveMsg = "";

      if (hour < SHIFT_END_TIME) {
        const hoursEarly = SHIFT_END_TIME - hour;
        outPoints = -(hoursEarly * 5); 
        if (hour < 16) attendance.status = "Half-Day";
        earlyLeaveMsg = ` | Early Leave Penalty: ${outPoints} points`;
      } else {
        outPoints = 2; 
        earlyLeaveMsg = ` | Shift Completed: +${outPoints} points`;
      }

      attendance.outTime = timeStr;
      attendance.remarks += ` | Out: Recorded${earlyLeaveMsg}`;
      earnedPointsTotal = outPoints;
    }

    // ======================================
    // GLOBAL POINTS & MILESTONE UPDATE
    // ======================================
    employee.points = Math.max(0, (employee.points || 0) + earnedPointsTotal);

    let promoMsg = "";
    if (employee.points >= 10000) {
      const oldSalary = employee.salary || 0;
      const newSalary = Math.round(oldSalary * 1.10);

      employee.salaryHistory.push({
        previousSalary: oldSalary,
        newSalary: newSalary,
        reason: "Automated Performance Milestone (10,000 Points reached)",
        date: new Date()
      });

      employee.salary = newSalary;
      employee.points -= 10000; 
      promoMsg = " | PROMOTED: 10% Increment Applied! ✅";
      attendance.remarks += promoMsg;
    }

    await Promise.all([employee.save(), attendance.save()]);

    return res.json({ 
      success: true, 
      message: `${type === "in" ? "Punch-in" : "Punch-out"} successful.${promoMsg}`,
      currentPoints: employee.points 
    });

  } catch (err) {
    console.error("❌ Auto-Punch Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ===============================
// Updated Cron Job (With Penalty Logic)
// ===============================
cron.schedule("25 20 * * *", async () => {
  try {
    const now = new Date();
    if (now.getDay() === 0 || now.getDay() === 6) return;

    const todayStr = now.toLocaleDateString('en-CA'); 
    const Employee = mongoose.model("Employee");
    const allEmployees = await Employee.find();

    for (const emp of allEmployees) {
      const attendance = await Attendance.findOne({ employeeId: emp._id, date: todayStr });

      if (!attendance) {
        // Mark as Absent and Deduct Points
        const absentRecord = new Attendance({
          employeeId: emp._id,
          date: todayStr,
          status: "Absent",
          remarks: "Auto-marked: No activity. Points: -20"
        });
        
        await absentRecord.save();
        
        // Professional Penalty: Subtract points for unannounced absence
        emp.points = Math.max(0, (emp.points || 0) - 20); 
        await emp.save();
      } 
      else if (attendance.inTime && !attendance.outTime) {
        attendance.outTime = "18:00";
        attendance.remarks += " | Auto-Punch Out";
        await attendance.save();
      }
    }
  } catch (err) {
    console.error("❌ Cron Error:", err.message);
  }
});
// Role-based access middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient privileges" });
    }

    next();
  };
};

// GET all Attendance (admin + hr only)
 app.get(
  "/api/attendance",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  async (req, res) => {
    try {
      const records = await Attendance.find()
        .populate("employeeId", "firstName lastName customId")
        .sort({ createdAt: -1 });

      res.json(records);
    } catch (err) {
      console.error("❌ GET ERROR:", err.message);
      res.status(500).json({ message: "Failed to fetch records" });
    }
  }
);

// DELETE attendance by ID (admin + hr only)
app.delete(
  "/api/attendance/:id",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await Attendance.findByIdAndDelete(id);

      if (!deleted)
        return res.status(404).json({ message: "Attendance record not found." });

      res.json({ success: true, message: "Attendance record deleted successfully." });
    } catch (err) {
      res.status(500).json({
        message: "Failed to delete attendance record.",
        error: err.message,
      });
    }
  }
);

/* ======================================
   📝 LEAVE ROUTES
====================================== */

// ======================================
// 📝 APPLY LEAVE (Employee)
// ======================================
app.post("/api/leaves", authMiddleware, async (req, res) => {
  try {

    if (req.user.role !== "employee") {
      return res.status(403).json({ message: "Employee only" });
    }

    const { fromDate, toDate, reason } = req.body;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({
        message: "All fields required"
      });
    }

    const leave = new Leave({
      employeeId: req.user.id,
      fromDate,
      toDate,
      reason,
      status: "Pending"
    });

    await leave.save();

    res.status(201).json({
      message: "Leave applied successfully ✅",
      leave
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.get("/api/employee/leaves", authMiddleware, async (req, res) => {
  try {

    if (req.user.role !== "employee") {
      return res.status(403).json({ message: "Employee only" });
    }

    const leaves = await Leave.find({
      employeeId: req.user.id
    }).sort({ fromDate: -1 });

    res.json(leaves);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET ALL LEAVES (Admin)
app.get("/api/leaves", authMiddleware, async (req, res) => {
  try {

    // 👨‍💼 EMPLOYEE → only their leaves
    if (req.user.role === "employee") {
      const leaves = await Leave.find({
        employeeId: req.user.id
      }).sort({ fromDate: -1 });

      return res.json(leaves);
    }

    // 👑 ADMIN / HR → all leaves
    if (req.user.role === "admin" || req.user.role === "hr") {
      const leaves = await Leave.find()
        .populate("employeeId", "firstName lastName email")
        .sort({ fromDate: -1 });

      return res.json(leaves);
    }

    return res.status(403).json({ message: "Access denied" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE LEAVE STATUS
app.put("/api/leaves/:id", authMiddleware, async (req, res) => {
  try {
    // Allow both admin and hr roles
    if (req.user.role !== "admin" && req.user.role !== "hr") {
      return res.status(403).json({ message: "Admin or HR only" });
    }

    const { status } = req.body;

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!leave)
      return res.status(404).json({ message: "Leave not found" });

    res.json({ message: "Leave updated successfully", leave });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE LEAVE
app.delete("/api/leaves/:id", authMiddleware, async (req, res) => {
  try {
    // FIX: Use && so it only blocks if BOTH conditions are met
    if (req.user.role !== "admin" && req.user.role !== "hr") {
      return res.status(403).json({ message: "Access denied: Admin or HR only" });
    }

    const deletedLeave = await Leave.findByIdAndDelete(req.params.id);

    // Safety check: Make sure the ID actually existed in the DB
    if (!deletedLeave) {
      return res.status(404).json({ message: "Leave record not found" });
    }

    res.json({ message: "Leave deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// ==========================================
// 1. SCHEMAS
// ==========================================

const PayrollSettingSchema = new mongoose.Schema({
  hraPercent: { type: Number, default: 20 },
  daPercent: { type: Number, default: 10 },
  pfPercent: { type: Number, default: 12 },
  taxPercent: { type: Number, default: 5 },
  latePenaltyGrace: { type: Number, default: 3 }
}, { timestamps: true });

const PayrollSetting = mongoose.model("PayrollSetting", PayrollSettingSchema);

const PayrollSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },

  month: Number,
  year: Number,

  basicSalary: Number,
  hra: Number,
  da: Number,
  overtimePay: { type: Number, default: 0 },

  grossSalary: Number,

  pf: Number,
  tax: Number,

  lateDeductionAmount: { type: Number, default: 0 },
  otherDeductions: { type: Number, default: 0 },

  bonus: { type: Number, default: 0 },

  presentDays: Number,
  halfDays: Number,
  absentDays: Number,

  lateMarks: Number,
  overtimeHours: Number,

  totalDeductions: Number,
  netSalary: Number,

  status: { type: String, enum: ["Generated", "Paid"], default: "Generated" },
  paymentDate: Date

}, { timestamps: true });

PayrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

const Payroll = mongoose.model("Payroll", PayrollSchema);

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

const round2 = (num) => Math.round((num || 0) * 100) / 100;

// ==========================================
// 3. SALARY CALCULATION BASED ON ATTENDANCE
// ==========================================

/**
 * Calculates monthly salary based on current employee status.
 * Note: Milestone increments are handled in the Auto-Punch route to prevent duplicates.
 */
const calculateSalary = async (employeeId, month, year, bonus = 0, otherDeductions = 0) => {
  const Employee = mongoose.model("Employee");
  const Attendance = mongoose.model("Attendance");
  const PayrollSetting = mongoose.model("PayrollSetting");

  const round2 = (val) => Math.round(val * 100) / 100;

  // 1. Fetch Employee Data
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new Error("Employee not found");

  // 2. Fetch Global Settings
  const settings = (await PayrollSetting.findOne()) || {
    hraPercent: 20,
    daPercent: 10,
    pfPercent: 12,
    taxPercent: 5,
    latePenaltyGrace: 3,
  };

  // ======================================
  // 3. READ-ONLY BASE SALARY
  // ======================================
  // We use the salary currently in the DB. 
  // If a milestone was reached during the month, Auto-Punch already updated this.
  const baseSalary = round2(employee.salary || 0);

  // ======================================
  // 4. WORKING DAYS CALCULATION
  // ======================================
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  let totalWorkingDaysInMonth = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) totalWorkingDaysInMonth++; 
  }

  // ======================================
  // 5. ATTENDANCE & OVERTIME
  // ======================================
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const attendanceRecords = await Attendance.find({
    employeeId,
    date: { $gte: startStr, $lte: endStr },
  });

  let presentDays = 0;
  let halfDays = 0;
  let lateMarks = 0;
  let overtimeHours = 0;

  attendanceRecords.forEach((a) => {
    if (a.status === "Present" || a.status === "WFH") presentDays += 1;
    else if (a.status === "Half-Day") halfDays += 1;
    if (a.isLate) lateMarks++;
    if (a.workHours && a.workHours > 9) overtimeHours += a.workHours - 9;
  });

  // ======================================
  // 6. FINAL PAYROLL MATH
  // ======================================
  const paidDays = presentDays + halfDays * 0.5;
  const perDaySalary = totalWorkingDaysInMonth > 0 ? baseSalary / totalWorkingDaysInMonth : 0;
  const payableBasic = round2(perDaySalary * paidDays);

  const hourlyRate = perDaySalary / 8;
  const overtimePay = round2(overtimeHours * (hourlyRate * 1.5));

  const hra = round2(payableBasic * (settings.hraPercent / 100));
  const da = round2(payableBasic * (settings.daPercent / 100));

  const grossSalary = round2(payableBasic + hra + da + overtimePay + bonus);

  const lateDeductionDays = Math.floor(lateMarks / settings.latePenaltyGrace) * 0.5;
  const lateDeductionAmount = round2(lateDeductionDays * perDaySalary);

  const pf = round2(payableBasic * (settings.pfPercent / 100));
  const tax = round2(grossSalary * (settings.taxPercent / 100));

  const totalDeductions = round2(pf + tax + lateDeductionAmount + otherDeductions);
  const netSalary = round2(grossSalary - totalDeductions);

  return {
    employeeName: `${employee.firstName} ${employee.lastName}`,
    month,
    year,
    basicSalary: payableBasic,
    hra,
    da,
    overtimePay,
    overtimeHours,
    attendance: {
      presentDays,
      halfDays,
      absentDays: Math.max(0, totalWorkingDaysInMonth - paidDays),
      lateMarks,
    },
    deductions: {
      pf,
      tax,
      lateDeductionAmount,
      otherDeductions,
    },
    grossSalary,
    totalDeductions,
    netSalary,
    currentPoints: employee.points // Pass this to the frontend to show progress
  };
};
// ==========================================
// 4. GENERATE PAYROLL
// ==========================================

app.post("/api/payroll", authMiddleware, async (req, res) => {

  try {

    const {
      employeeId,
      month,
      year,
      bonus = 0,
      otherDeductions = 0
    } = req.body;



    if (!employeeId || !month || !year) {

      return res.status(400).json({
        message: "EmployeeId, month and year required"
      });

    }



    const salaryData = await calculateSalary(
      employeeId,
      Number(month),
      Number(year),
      Number(bonus),
      Number(otherDeductions)
    );



    const payroll = await Payroll.findOneAndUpdate(

      { employeeId, month, year },

      {
        ...salaryData,
        bonus,
        otherDeductions,
        status: "Generated"
      },

      {
        new: true,
        upsert: true
      }

    );



    res.json({
      message: "Payroll Generated Successfully",
      payroll
    });

  }

  catch (err) {

    console.error(err);

    res.status(500).json({
      message: err.message
    });

  }

});

// ==========================================
// 5. GET PAYROLL LIST
// ==========================================

app.get("/api/payroll", authMiddleware, async (req, res) => {

  try {

    const payrolls = await Payroll.find()
      .populate("employeeId", "firstName lastName customId")
      .sort({ createdAt: -1 });

    res.json(payrolls);

  }

  catch (err) {

    res.status(500).json({
      message: "Failed to fetch payroll"
    });

  }

});

// ==========================================
// 6. DELETE PAYROLL
// ==========================================

app.delete("/api/payroll/:id", authMiddleware, async (req, res) => {

  try {

    await Payroll.findByIdAndDelete(req.params.id);

    res.json({
      message: "Payroll deleted"
    });

  }

  catch (err) {

    res.status(500).json({
      message: "Delete failed"
    });

  }

});


// ==========================================
// 7. MARK PAYROLL PAID
// ==========================================

app.put("/api/payroll/:id/pay", authMiddleware, async (req, res) => {

  try {

    const payroll = await Payroll.findByIdAndUpdate(

      req.params.id,

      {
        status: "Paid",
        paymentDate: new Date()
      },

      { new: true }

    );

    res.json({
      message: "Marked as Paid",
      payroll
    });

  }

  catch (err) {

    res.status(500).json({
      message: "Update failed"
    });

  }

});

// ==========================================
// Download Payslip in Tabular Format
// ==========================================
const PDFDocument = require("pdfkit");

app.get("/api/payroll/:id/payslip", authMiddleware, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id).populate("employeeId");
    if (!payroll || !payroll.employeeId) {
      return res.status(404).json({ message: "Payroll not found or Employee missing" });
    }

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const fileName = `Payslip_${payroll.employeeId.firstName}_${payroll.month}_${payroll.year}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    doc.pipe(res);

    const emp = payroll.employeeId;

    // ===== HEADER (Corporate Style) =====
    doc
      .rect(0, 0, 612, 70)
      .fill("#0f172a");

    doc
      .fillColor("#ffffff")
      .fontSize(18)
      .text("DP Tradeking Pvt Ltd", 40, 25);

    doc
      .fontSize(10)
      .text(`Payslip - ${payroll.month}/${payroll.year}`, 400, 30, {
        align: "right",
      });

    doc.moveDown(2);

    // ===== EMPLOYEE INFO (CLEAN ROW STYLE) =====
    doc.fillColor("#000").fontSize(11);

    let infoY = 90;

    doc.text("Employee Name:", 40, infoY);
    doc.text(`${emp.firstName} ${emp.lastName}`, 160, infoY);

    doc.text("Employee ID:", 40, infoY + 20);
    doc.text(`${emp.employeeId || "N/A"}`, 160, infoY + 20);

    doc.text("Designation:", 320, infoY);
    doc.text(`${emp.designation || "N/A"}`, 420, infoY);

    // Divider
    doc.moveTo(40, 140).lineTo(555, 140).strokeColor("#cbd5e1").stroke();

    let y = 160;

    // ===== TABLE HEADER =====
    doc.fontSize(12).fillColor("#1e293b");

    doc.text("EARNINGS", 60, y);
    doc.text("AMOUNT", 200, y);

    doc.text("DEDUCTIONS", 320, y);
    doc.text("AMOUNT ", 500, y, { align: "right" });

    y += 15;

    doc.moveTo(40, y).lineTo(555, y).strokeColor("#94a3b8").stroke();
    y += 10;

    // ===== ROW FUNCTION =====
    const row = (eLabel, eVal, dLabel, dVal) => {
      doc.fontSize(11).fillColor("#000");

      if (eLabel) doc.text(eLabel, 60, y);
      if (eVal) doc.text(eVal, 200, y);

      if (dLabel) doc.text(dLabel, 320, y);
      if (dVal) doc.text(dVal, 500, y, { align: "right" });

      y += 20;
    };

    // ===== DATA =====
    row("Basic Salary", `₹${(payroll.basicSalary || 0).toFixed(2)}`, "PF", `₹${(payroll.pf || 0).toFixed(2)}`);
    row("HRA", `₹${(payroll.hra || 0).toFixed(2)}`, "Income Tax", `₹${(payroll.tax || 0).toFixed(2)}`);
    row("DA", `₹${(payroll.da || 0).toFixed(2)}`, "Late Deduction", `₹${(payroll.lateDeductionAmount || 0).toFixed(2)}`);
    row(`Overtime (${payroll.overtimeHours || 0}h)`, `₹${(payroll.overtimePay || 0).toFixed(2)}`, "Other Deduction", `₹${(payroll.otherDeductions || 0).toFixed(2)}`);
    row("Bonus", `₹${(payroll.bonus || 0).toFixed(2)}`, "", "");

    // ===== TOTAL LINE =====
    y += 10;
    doc.moveTo(40, y).lineTo(555, y).strokeColor("#000").stroke();
    y += 15;

    // ===== NET SALARY (HIGHLIGHTED CLEAN) =====
    doc
      .rect(40, y - 10, 515, 35)
      .fill("#f1f5f9");

    doc
      .fillColor("#16a34a")
      .fontSize(14)
      .text(`Net Payable: ₹${(payroll.netSalary || 0).toFixed(2)}`, 40, y, {
        align: "right",
        width: 500,
      });

    // ===== FOOTER =====
    doc
      .fontSize(9)
      .fillColor("gray")
      .text(
        "This is a computer-generated payslip.",
        40,
        780,
        { align: "center" }
      );

    doc.end();
  } catch (err) {
    console.error("PDF Error:", err);
    res.status(500).json({ message: "Failed to generate payslip" });
  }
});
// ======================================
// 🌴 Emp Profile (Role Based)
// ======================================
app.get("/api/employee/profile", authMiddleware, async (req, res) => {
  try {
    // 1. Update the role check to allow both 'employee' and 'hr'
    const allowedRoles = ["employee", "hr"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: Unauthorized role" });
    }

    // 2. Fetch the user profile using the ID from the token
    // Using .populate() ensures we get the department name instead of just the ID
    const userProfile = await Employee.findById(req.user.id)
      .populate("department", "name")
      .select("-password");

    if (!userProfile) {
      return res.status(404).json({ message: "User profile not found" });
    }

    // 3. Send the profile data
    res.json(userProfile);

  } catch (err) {
    console.error("Profile Fetch Error:", err.message);
    res.status(500).json({ message: "Server error while fetching profile" });
  }
});
app.put(
  "/api/employee/profile",
  authMiddleware,
  upload.single("profilePhoto"),
  async (req, res) => {
    try {
      // 1. Allow both 'employee' and 'hr' to update their own profile
      const allowedRoles = ["employee", "hr"];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const employee = await Employee.findById(req.user.id);
      if (!employee) {
        return res.status(404).json({ message: "User not found" });
      }

      // 2. Destructure allowed fields from the request body
      const { firstName, lastName, mobile, address } = req.body;

      // 3. Update fields if they exist in the request
      if (firstName) employee.firstName = firstName;
      if (lastName) employee.lastName = lastName;
      if (mobile) employee.mobile = mobile;
      if (address) employee.address = address;

      // 4. Handle Profile Photo update
      if (req.file) {
        employee.profilePhoto = req.file.filename;
      }

      // 5. Save and return the updated document
      // We populate department so the frontend receives the full object again
      await employee.save();
      const updatedProfile = await Employee.findById(employee._id)
        .populate("department", "name")
        .select("-password");

      res.json({
        message: "Profile updated successfully ✅",
        updatedProfile // Returning the full profile helps React update the state immediately
      });

    } catch (err) {
      console.error("Update Error:", err.message);
      res.status(500).json({ message: "Server error during update" });
    }
  }
);


// ======================================
// 📊 EMPLOYEE DASHBOARD
// ======================================

app.get("/api/employee/dashboard", authMiddleware, async (req, res) => {
  try {

    if (req.user.role !== "employee") {
      return res.status(403).json({ message: "Employee access only" });
    }

    const attendanceCount = await Attendance.countDocuments({
      employeeId: req.user.id
    });

    const leaveCount = await Leave.countDocuments({
      employeeId: req.user.id
    });

    const pendingLeaves = await Leave.countDocuments({
      employeeId: req.user.id,
      status: "Pending"
    });

    res.json({
      attendanceCount,
      leaveCount,
      pendingLeaves
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ======================================
// 📅 ATTENDANCE (Role Based)
// ======================================
// GET MY ATTENDANCE (Employee Only)
// ===============================
// Employee: Get Own Attendance
// ===============================
// routes/employee.js
app.get("/api/employee/attendance", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "employee") {
      return res.status(403).json({ message: "Employee only" });
    }

    const attendance = await Attendance.find({ employeeId: req.user.id }).sort({ date: -1 });

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Employee payroll view
app.get("/api/employee/payroll", authMiddleware, async (req, res) => {
  try {

    if (req.user.role !== "employee") {
      return res.status(403).json({ message: "Employee only" });
    }

    const payrolls = await Payroll.find({
      employeeId: req.user.id
    }).sort({ createdAt: -1 });

    res.json(payrolls);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================================
   Payroll Settings
========================================= */

// GET Payroll Settings
app.get("/api/payroll-settings", authMiddleware, async (req, res) => {
  try {

    let setting = await PayrollSetting.findOne();

    if (!setting) {
      setting = new PayrollSetting({});
      await setting.save();
    }

    res.json(setting);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================================
   Update Payroll Settings (Admin Only)
========================================= */

app.put("/api/payroll-settings", authMiddleware, async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const { pfPercentage, taxPercentage, hraPercentage, daPercentage } = req.body;

    let setting = await PayrollSetting.findOne();

    if (!setting) {

      setting = new PayrollSetting({
        pfPercentage,
        taxPercentage,
        hraPercentage,
        daPercentage,
        updatedBy: req.user.id
      });

    } else {

      setting.pfPercentage = pfPercentage;
      setting.taxPercentage = taxPercentage;
      setting.hraPercentage = hraPercentage;
      setting.daPercentage = daPercentage;
      setting.updatedBy = req.user.id;
      setting.updatedAt = new Date();

    }

    await setting.save();

    res.json({ message: "Payroll settings updated successfully", setting });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================================
   HR Request Payroll Setting Change
========================================= */

// POST: HR requests payroll update from Admin
app.post("/api/payroll-settings", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "hr") {
      return res.status(403).json({ message: "HR access only" });
    }

    const { message } = req.body;

    // 1. Find the HR details using the ID from the token
    // We search the HR collection to get the name
    const hrUser = await HR.findById(req.user.id);
    const hrName = hrUser ? hrUser.name : "Unknown HR";

    // 2. Save Request to Database
    const request = new PayrollSetting({
      requestedBy: req.user.id,
      message: message || "Requesting permission to update payroll settings."
    });
    await request.save();

    // 3. Find Admin Email
    const admin = await User.findOne({ role: "admin" }) || { email: "admin@yourcompany.com" };

    // 4. Send Email to Admin with the HR Name
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: admin.email,
      subject: "⚠️ Payroll Settings Update Request",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">Payroll Update Request</h2>
          <p>Hello Admin,</p>
          <p><strong>HR Name:</strong> ${hrName}</p>
          <p><strong>HR ID:</strong> ${req.user.id}</p>
          <p><strong>Message:</strong> ${message || "No additional notes provided."}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">This is an automated notification from DP Tradeking HRMS.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: `Request from ${hrName} sent to admin successfully ✅` });

  } catch (error) {
    console.error("Payroll Request Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================================
   Admin View Requests
========================================= */

app.get("/api/payroll-settings/requests", authMiddleware, async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const requests = await PayrollSettingRequest
      .find()
      .populate("requestedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(requests);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================================
   Admin Approve / Reject Request
========================================= */

app.put("/api/payroll-settings/requests/:id", authMiddleware, async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const { status } = req.body;

    const request = await PayrollSettingRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = status;

    await request.save();

    res.json({ message: "Request updated successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* ======================================
   📊 PERFORMANCE SCHEMA
====================================== */

const PerformanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },

  reviewPeriod: {
    type: String, // Example: "Jan 2026"
    required: true
  },

  workQuality: { type: Number, min: 1, max: 5, required: true },
  behavior: { type: Number, min: 1, max: 5, required: true },
  initiative: { type: Number, min: 1, max: 5, required: true },

  attendanceScore: { type: Number }, // auto calculated
  finalRating: { type: Number }, // auto calculated
  grade: { type: String }, // auto calculated
  incrementSuggestion: { type: Number, default: 0 },

  comments: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HR"
  }

}, { timestamps: true });

// Prevent duplicate review per period
PerformanceSchema.index({ employeeId: 1, reviewPeriod: 1 }, { unique: true });

const Performance = mongoose.model("Performance", PerformanceSchema);


/* ======================================
    CALCULATE ATTENDANCE SCORE (Point-Based)
====================================== */
const calculateAttendanceScore = async (employeeId) => {
  const Employee = mongoose.model("Employee");
  const emp = await Employee.findById(employeeId);
  
  if (!emp) return 1;

  // Professional Logic: Base the score on how many points they've earned 
  // toward their next 1000-point milestone.
  const points = emp.points || 0;

  if (points >= 800) return 5;  // Exceptional Punctuality
  if (points >= 600) return 4;  // Very Good
  if (points >= 400) return 3;  // Average
  if (points >= 200) return 2;  // Below Average
  return 1;                     // Poor/New Joiner
};

/* ======================================
   AUTOMATED PERFORMANCE GENERATOR (HR ONLY)
====================================== */

app.post("/api/performance/auto-generate", authMiddleware, async (req, res) => {

  if (req.user.role !== "hr")
    return res.status(403).json({ message: "HR only" });

  try {
    const { reviewPeriod } = req.body;
    if (!reviewPeriod) return res.status(400).json({ message: "Review period is required" });

    const employees = await Employee.find();
    const results = [];

    for (const emp of employees) {
      // 1. Skip if already exists for this period (Existing logic)
      const exists = await Performance.findOne({
        employeeId: emp._id,
        reviewPeriod
      });
      if (exists) continue;

      // 2. UPDATED: Attendance Score now uses our point-based calculation
      // We pass emp._id to our new point-aware function
      const attendanceScore = await calculateAttendanceScore(emp._id);

      // Default Ratings (HR can adjust later)
      const workQuality = 3;
      const behavior = 3;
      const initiative = 3;

      // 3. Final Rating (Weighted Formula)
      const finalRating = Number((
        attendanceScore * 0.4 + // Increased weight for behavior/points discipline
        workQuality * 0.3 +
        behavior * 0.15 +
        initiative * 0.15
      ).toFixed(2));

      // 4. UPDATED: Grade and Increment based on Score AND Milestone
      let grade = "C";
      let incrementSuggestion = 0;

      // Logic: If they have 1000+ points, they get an automatic Grade A + 10% increment
      if (finalRating >= 4.5) {
        grade = "A+";
        incrementSuggestion = 15;
      } else if (finalRating >= 4 || emp.points >= 1000) { 
        grade = "A";
        incrementSuggestion = 10;
      } else if (finalRating >= 3) {
        grade = "B";
        incrementSuggestion = 5;
      }

      // 5. Create Performance Record with Point Comments
      const performance = await Performance.create({
        employeeId: emp._id,
        reviewPeriod,
        attendanceScore,
        workQuality,
        behavior,
        initiative,
        finalRating,
        grade,
        incrementSuggestion,
        reviewedBy: req.user.id,
        // Pro tip: Add a comment if the milestone triggered the grade
        comments: emp.points >= 1000 
          ? `Performance boosted by 1000+ Milestone Points (${emp.points} pts)` 
          : "Standard monthly review"
      });

      results.push(performance);
    }

    res.json({
      message: "Automated performance generated ✅",
      total: results.length,
      data: results
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================================
   📊 GET PERFORMANCE
====================================== */

app.get("/api/performance", authMiddleware, async (req, res) => {
  try {
    if (req.user.role === "employee") {
      const records = await Performance.find({ employeeId: req.user.id }).sort({ createdAt: -1 });
      return res.json(records);
    }

    if (req.user.role === "hr" || req.user.role === "admin") {
      const records = await Performance.find()
        .populate("employeeId", "firstName lastName email designation")
        .sort({ createdAt: -1 });
      return res.json(records);
    }

    res.status(403).json({ message: "Access denied" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});  

/* ======================================
   📊 DELETE PERFORMANCE
====================================== */

app.delete("/api/performance/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "hr")
    return res.status(403).json({ message: "HR only" });

  await Performance.findByIdAndDelete(req.params.id);
  res.json({ message: "Performance record deleted ✅" });
});
/* ======================================
    📊 GET LOGGED-IN EMPLOYEE'S LATEST PERFORMANCE
   ====================================== */
app.get("/api/performance/me", authMiddleware, async (req, res) => {
  try {
    // Only allow employees to access this specific 'me' route
    if (req.user.role !== "employee") {
      return res.status(403).json({ message: "Employee access only" });
    }

    // Find all records for the logged-in user, sorted by the most recent
    const records = await Performance.find({ employeeId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "firstName lastName"); // Optional: see who reviewed it

    if (!records || records.length === 0) {
      return res.status(404).json({ message: "No performance records found for you." });
    }

    // You can return the whole array or just the latest one [0]
    res.json(records); 
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
/* ======================================
   👥 RECRUITMENT SCHEMA
====================================== */

const RecruitmentSchema = new mongoose.Schema({

  name: String,
  email: String,
  position: String,

  status: {
    type: String,
    enum: [
      "Applied",
      "Shortlisted",
      "Interview Scheduled",
      "Selected",
      "Rejected"
    ],
    default: "Applied"
  },

  interviewDate: Date,
  remarks: String

}, { timestamps: true });

const Recruitment = mongoose.model("Recruitment", RecruitmentSchema);

const getNextWorkingDay = () => {

  let date = new Date();
  date.setDate(date.getDate() + 2); // initial interview after 2 days

  // Skip weekend
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date;

};

/* ======================================
   👥 CREATE RECRUITMENT (HR ONLY)
====================================== */

app.post("/api/recruitment", authMiddleware, async (req, res) => {

  try {

    if (req.user.role !== "hr" && req.user.role !== "admin") {
      return res.status(403).json({ message: "HR only" });
    }

    let { name, email, position, status, interviewDate, remarks } = req.body;

    // Auto schedule interview
    if (status === "Interview Scheduled" && !interviewDate) {
      interviewDate = getNextWorkingDay();
    }

    const candidate = new Recruitment({
      name,
      email,
      position,
      status,
      interviewDate,
      remarks
    });

    await candidate.save();

    // Send Interview Email
    if (status === "Interview Scheduled") {

      await transporter.sendMail({

        from: `"HR Department DPTK" <patelsujal097@gmail.com>`,
        to: email,
        subject: "Interview Invitation",

        html: `
          <h2>Interview Invitation</h2>

          <p>Dear ${name},</p>

          <p>You have been shortlisted for the position of <b>${position}</b>.</p>

          <p><b>Interview Date:</b> ${new Date(interviewDate).toDateString()}</p>

          <p>Please attend the interview on time.</p>

          <br>

          <p>Regards</p>
          <p>HR Team DPTK</p>
        `

      });

    }

    res.status(201).json({
      message: "Candidate added successfully",
      candidate
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

});

/* ======================================
   👥 GET RECRUITMENT DATA
====================================== */
app.get("/api/recruitment", authMiddleware, async (req, res) => {

  try {

    // HR & Admin can view all
    if (req.user.role === "hr" || req.user.role === "admin") {

      const candidates = await Recruitment.find()
        .sort({ createdAt: -1 });

      return res.json(candidates);
    }

    return res.status(403).json({ message: "Access denied" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================================
   👥 UPDATE RECRUITMENT (HR ONLY)
====================================== */
app.put("/api/recruitment/:id", authMiddleware, async (req, res) => {
  try {
    let { name, email, position, status, interviewDate, remarks } = req.body;

    // Automation for Interview Date (Skips manual entry if needed)
    if (status === "Interview Scheduled" && !interviewDate) {
      interviewDate = getNextWorkingDay();
    }

    const candidate = await Recruitment.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        position,
        status,
        interviewDate,
        remarks
      },
      { new: true }
    );

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    /* ================= INTERVIEW EMAIL ================= */
    if (status === "Interview Scheduled") {
      await transporter.sendMail({
        from: `"HR Department" <patelsujal097@gmail.com>`,
        to: email,
        subject: "Interview Scheduled - DPTradeKing",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #2563eb;">Interview Scheduled</h2>
            <p>Hello <b>${name}</b>,</p>
            <p>Your interview for the position of <b>${position}</b> has been scheduled successfully.</p>
            <p style="background: #f1f5f9; padding: 10px;"><b>Scheduled Date:</b> ${new Date(interviewDate).toDateString()}</p>
            <p>Best of luck for your preparation!</p>
            <p>Regards,<br>HR Department, DPTK</p>
          </div>
        `
      });
    }

    /* ================= SELECTION EMAIL ================= */
    if (status === "Selected") {
      await transporter.sendMail({
        from: `"HR Department" <patelsujal097@gmail.com>`,
        to: email,
        subject: "Congratulations! You Are Selected - DPTradeKing",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #22c55e;">Congratulations ${name} 🎉</h2>
            <p>We are pleased to inform you that you have been <b>selected</b> for the position of <b>${position}</b>.</p>
            <p>Our onboarding team will contact you shortly with the next steps and document requirements.</p>
            <br>
            <p>Welcome to the team!</p>
            <p>HR Team, DPTK</p>
          </div>
        `
      });
    }

    /* ================= REJECTION EMAIL (New Functionality) ================= */
    if (status === "Rejected") {
      await transporter.sendMail({
        from: `"HR Department" <patelsujal097@gmail.com>`,
        to: email,
        subject: "Update regarding your application - DPTradeKing",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
            <p>Hello <b>${name}</b>,</p>
            <p>Thank you for your interest in the <b>${position}</b> role at DPTradeKing and for taking the time to apply.</p>
            <p>After careful review, we regret to inform you that we are moving forward with other candidates at this time.</p>
            <p>We will keep your resume in our database for future opportunities that match your skill set.</p>
            <p>We wish you the very best in your job search.</p>
            <p>Regards,<br>HR Department, DPTK</p>
          </div>
        `
      });
    }

    res.json({
      message: "Candidate status updated and email sent ✅",
      candidate
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================================
   👥 DELETE RECRUITMENT (HR ONLY)
====================================== */

app.delete("/api/recruitment/:id", authMiddleware, async (req, res) => {

  if (req.user.role !== "hr")
    return res.status(403).json({ message: "HR only" });

  try {

    const deleted = await Recruitment.findByIdAndDelete(req.params.id);

    if (!deleted)
      return res.status(404).json({ message: "Candidate not found" });

    res.json({ message: "Candidate deleted successfully ✅" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
 
/* ======================================
   🔔 NOTIFICATIONS API
====================================== */

app.get("/api/notifications", authMiddleware, async (req, res) => {

  try {

    // Only Admin and HR can view notifications
    if (req.user.role !== "admin" && req.user.role !== "hr") {
      return res.status(403).json({ message: "Access denied" });
    }

    // New job applications
    const appliedCandidates = await Recruitment.countDocuments({
      status: "Applied"
    });

    // Pending leave requests
    const pendingLeaves = await Leave.countDocuments({
      status: "Pending"
    });

    // Payroll generated but not paid
    const pendingPayroll = await Payroll.countDocuments({
      status: "Generated"
    });

    const notifications = [];

    if (appliedCandidates > 0) {
      notifications.push({
        type: "Recruitment",
        message: `${appliedCandidates} new job applications`,
      });
    }

    if (pendingLeaves > 0) {
      notifications.push({
        type: "Leave",
        message: `${pendingLeaves} leave requests pending`,
      });
    }

    if (pendingPayroll > 0) {
      notifications.push({
        type: "Payroll",
        message: `${pendingPayroll} payroll pending`,
      });
    }

    res.json({
      total: notifications.length,
      notifications
    });

  } catch (err) {

    res.status(500).json({ message: err.message });

  }

});

/* ======================================
    📧 SEND LEAVE EMAIL TO HR (UPDATED)
====================================== */
app.post("/api/leaves/send-email", authMiddleware, async (req, res) => {
  try {
    const { fromDate, toDate, reason, totalDays, leaveId } = req.body;
    const employee = await Employee.findById(req.user.id);

    // 🟢 MUST MATCH THE IP USED IN FRONTEND
    const MY_IP = "172.20.10.3"; 
    const BASE_URL = `http://${MY_IP}:5001`; 

    const mailOptions = {
      from: `"HR System" <your-email@gmail.com>`,
      to: "hr-manager@company.com", 
      subject: `Leave Request: ${employee.firstName} ${employee.lastName}`,
      html: `
        <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
          <h2 style="color: #6366f1;">New Leave Application</h2>
          <p><strong>Employee:</strong> ${employee.firstName} ${employee.lastName}</p>
          <p><strong>Duration:</strong> ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()} (${totalDays} Days)</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <hr />
          <p>Action required (Click one):</p>
          <a href="${BASE_URL}/api/leaves/remote-update/${leaveId}/Approved" 
             style="background: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px; display: inline-block;">
             Approve
          </a>
          <a href="${BASE_URL}/api/leaves/remote-update/${leaveId}/Rejected" 
             style="background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
             Reject
          </a>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Email sent to HR ✅" });
  } catch (err) {
    res.status(500).json({ message: "Error sending email" });
  }
});

/* ======================================
    🔗 REMOTE UPDATE + CONFIRMATION EMAIL
====================================== */
app.get("/api/leaves/remote-update/:id/:status", async (req, res) => {
  try {
    const { id, status } = req.params;

    // 1. Update the record and populate employee details
    const updatedLeave = await Leave.findByIdAndUpdate(
      id,
      { status: status },
      { new: true }
    ).populate("employeeId"); // We populate to get the employee's email

    if (!updatedLeave) {
      return res.status(404).send("<h1>Error: Leave record not found.</h1>");
    }

    const employee = updatedLeave.employeeId;

    // 2. Prepare the confirmation email for the Employee
    const mailOptions = {
      from: `"HR Department" <your-email@gmail.com>`,
      to: employee.email, // Sends to the employee's email address
      subject: `Leave Application Update: ${status}`,
      html: `
        <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px; max-width: 500px;">
          <h2 style="color: ${status === 'Approved' ? '#22c55e' : '#ef4444'};">
            Leave Request ${status}
          </h2>
          <p>Dear ${employee.firstName},</p>
          <p>Your leave request from <strong>${new Date(updatedLeave.fromDate).toLocaleDateString()}</strong> 
             to <strong>${new Date(updatedLeave.toDate).toLocaleDateString()}</strong> 
             has been <strong>${status.toLowerCase()}</strong> by HR.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">You can check your updated status in the Employee Portal.</p>
        </div>
      `
    };

    // 3. Send the email
    await transporter.sendMail(mailOptions);

    // 4. Send success response to HR's browser
    res.send(`
      <div style="text-align: center; font-family: sans-serif; margin-top: 50px;">
        <h1 style="color: ${status === 'Approved' ? '#22c55e' : '#ef4444'};">Done!</h1>
        <p>Leave status changed to <strong>${status}</strong>.</p>
        <p>A confirmation email has been sent to <strong>${employee.firstName}</strong>.</p>
      </div>
    `);

  } catch (err) {
    console.error("Email/DB Error:", err);
    res.status(500).send("An error occurred during the update.");
  }
});

// CRITICAL: Ensure server listens on 0.0.0.0
 app.listen(5001, "0.0.0.0", () => {
  console.log("Server running on port 5000 - Network accessible ✅");
});

/* ====================================== */
//app.listen(5000, () => {
  console.log("Server running on http://localhost:5000 🚀");
//});

