import React, { useState, useEffect } from "react"; 
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../style/Login.css";
import logo from "../assets/images/dplogo.png";

export default function Login({ setAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const navigate = useNavigate();

  /* ==========================================
      NEW: SESSION TRACING (HEARTBEAT) LOGIC
  ========================================== */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role) {
      const sendHeartbeat = async () => {
        try {
          await axios.post("http://localhost:5000/api/heartbeat", { role }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) {
          console.error("Session heartbeat failed", err);
        }
      };

      const interval = setInterval(sendHeartbeat, 120000);
      return () => clearInterval(interval);
    }
  }, []); 

  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    if (type === "error") {
      setTimeout(() => setMessage({ text: "", type: "" }), 5000);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!email.includes("@")) {
      return showMsg("Please enter a valid email address.");
    }
    if (password.length < 6) {
      return showMsg("Password must be at least 6 characters long.");
    }

    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/api/login", {
        email: email.trim(),
        password,
      });

      // Added 'user' to the destructured response
      const { token, role, user } = res.data; 
      
      if (!token || !role) {
        throw new Error("The server returned an incomplete response.");
      }

      showMsg("Login successful! Redirecting...", "success");

      localStorage.setItem("token", token);
      localStorage.setItem("role", role.toLowerCase());
      
      // SAVE THE USER DATA (Contains salaryHistory and points for the dashboard)
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      if (setAuth) setAuth({ token, role: role.toLowerCase() });

      setTimeout(() => {
        const userRole = role.toLowerCase();
        if (userRole === "admin") navigate("/dashboard", { replace: true });
        else if (userRole === "hr") navigate("/hrdashboard", { replace: true });
        else if (userRole === "employee") navigate("/employeedashboard", { replace: true });
        else navigate("/", { replace: true });
      }, 800);

    } catch (err) {
      const errorMsg = err.response?.data?.message || "Invalid credentials or server error ❌";
      showMsg(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const goToForgotPassword = () => {
    navigate("/forgot-password");
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleLogin}>
        <img src={logo} alt="DP Logo" className="login-logo animate-delay-1" />

        <h2 className="login-title animate-delay-2">Login to your account</h2>

        {message.text && (
          <div 
            className={`animate-delay-3`}
            style={{
              padding: "10px",
              marginBottom: "15px",
              borderRadius: "6px",
              fontSize: "14px",
              textAlign: "center",
              fontWeight: "600",
              backgroundColor: message.type === "success" ? "#dcfce7" : "#fee2e2",
              color: message.type === "success" ? "#166534" : "#991b1b",
              border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`
            }}
          >
            {message.text}
          </div>
        )}

        <input
          className="login-input animate-delay-4"
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="email"
          required
        />
        <input
          className="login-input animate-delay-5"
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="current-password"
          required
        />

        <button
          className="login-button animate-delay-6"
          type="submit"
          disabled={loading}
          style={{
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Authenticating..." : "Login"}
        </button>

        <p
          className="forgot-text animate-delay-7"
          onClick={!loading ? goToForgotPassword : null}
          style={{ cursor: loading ? "default" : "pointer" }}
        >
          Forgot Password?
        </p>
      </form>
    </div>
  );
}