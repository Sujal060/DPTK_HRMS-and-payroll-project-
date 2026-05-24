import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../style/Login.css";

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = request OTP, 2 = reset password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Timer states
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const navigate = useNavigate();

  /* ===============================
      HELPER: SHOW MESSAGE
  =============================== */
  const showMsg = (text, type = "error") => {
    setMessage({ text, type });
    // Don't auto-hide success messages that lead to a redirect
    if (type === "error") {
      setTimeout(() => setMessage({ text: "", type: "" }), 5000);
    }
  };

  useEffect(() => {
    let interval;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      showMsg("OTP expired. Please request a new one.");
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // STEP 1: REQUEST OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!email.includes("@")) return showMsg("Please enter a valid email.");

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      showMsg(res.data.message || "OTP sent successfully! Check your inbox. ✅", "success");
      setStep(2);
      setTimeLeft(300); // 5 minutes
      setTimerActive(true);
    } catch (err) {
      showMsg(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: RESET PASSWORD
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!timerActive) return showMsg("Your OTP has expired.");
    if (otp.length < 4) return showMsg("Please enter a valid OTP.");
    if (newPassword.length < 6) return showMsg("Password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return showMsg("Passwords do not match.");

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/reset-password", {
        email: email.trim().toLowerCase(),
        otp,
        newPassword,
      });

      showMsg("Password updated successfully! Redirecting to login... ✅", "success");
      setTimerActive(false);
      
      // Delay navigation so user can read the success message
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      showMsg(err.response?.data?.message || "Failed to reset password. ❌");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="login-container">
      <form
        className="login-card"
        onSubmit={step === 1 ? handleRequestOtp : handleResetPassword}
      >
        <h2 className="login-title animate-delay-1">
          {step === 1 ? "Forgot Password" : "Set New Password"}
        </h2>

        {/* REFINED MESSAGE BOX */}
        {message.text && (
          <div className="animate-delay-2" style={{
            padding: "12px",
            marginBottom: "20px",
            borderRadius: "8px",
            textAlign: "center",
            fontSize: "14px",
            fontWeight: "600",
            backgroundColor: message.type === "success" ? "#dcfce7" : "#fee2e2",
            color: message.type === "success" ? "#166534" : "#991b1b",
            border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`
          }}>
            {message.text}
          </div>
        )}

        <input
          className="login-input animate-delay-3"
          type="email"
          placeholder="Enter Registered Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading || step === 2}
          required
        />

        {step === 2 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <span className={`animate-delay-4`} style={{ 
                fontSize: '14px', 
                color: timeLeft < 60 ? '#ef4444' : '#6366f1',
                fontWeight: 'bold'
              }}>
                {timerActive ? `Time remaining: ${formatTime(timeLeft)}` : "OTP Expired"}
              </span>
            </div>

            <input
              className="login-input animate-delay-5"
              type="text"
              placeholder="Enter 6-Digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={loading}
              maxLength={6}
              required
            />

            <input
              className="login-input animate-delay-6"
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              required
            />

            <input
              className="login-input animate-delay-7"
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
            
            {!timerActive && (
              <p 
                onClick={!loading ? handleRequestOtp : null} 
                className="animate-delay-8"
                style={{ 
                  textAlign: 'center', 
                  fontSize: '13px', 
                  color: '#f59e0b', 
                  cursor: 'pointer',
                  fontWeight: '600',
                  textDecoration: 'underline'
                }}
              >
                Didn't receive code? Resend OTP
              </p>
            )}
          </>
        )}

        <button
          className="login-button animate-delay-9"
          type="submit"
          disabled={loading || (step === 2 && !timerActive)}
          style={{
            marginTop: "10px",
            opacity: (loading || (step === 2 && !timerActive)) ? 0.7 : 1,
            cursor: (loading || (step === 2 && !timerActive)) ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Processing..." : step === 1 ? "Send OTP" : "Update Password"}
        </button>

        <p className="forgot-text animate-delay-10">
          <Link to="/login" style={{ textDecoration: 'none', color: '#6366f1', fontWeight: 'bold' }}>
            ← Back to Login
          </Link>
        </p>
      </form>
    </div>
  );
}