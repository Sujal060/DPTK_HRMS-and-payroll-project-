import React, { useEffect, useState } from "react";
import axios from "axios";
import "../style/admin/EmployeeList.css"; // reuse your existing styles for cards & dark mode

const Notifications = () => {
  const token = localStorage.getItem("token");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH NOTIFICATIONS ================= */
  const fetchNotifications = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setList(res.data.notifications || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  if (loading) {
    return (
      <div className="employee-page" style={{ fontSize: "14px" }}>
        Loading notifications...
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="employee-page" style={{ fontSize: "14px" }}>
        No notifications available
      </div>
    );
  }

  return (
    <div className="employee-page">
      <div className="employee-card" style={{ maxWidth: "500px", margin: "auto" }}>
        <div className="card-header">
          <h2>Notifications</h2>
        </div>
        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          {list.map((item, index) => (
            <div
              key={index}
              className={`notification-item ${
                item.type === "info"
                  ? "status-active"
                  : item.type === "error"
                  ? "status-inactive"
                  : "status-pending"
              }`}
              style={{
                padding: "12px",
                marginBottom: "10px",
                borderRadius: "12px",
                background:
                  item.type === "info"
                    ? "rgba(37, 99, 235, 0.1)"
                    : item.type === "error"
                    ? "rgba(239, 68, 68, 0.1)"
                    : "rgba(234, 179, 8, 0.1)",
                borderLeft:
                  item.type === "info"
                    ? "4px solid #2563eb"
                    : item.type === "error"
                    ? "4px solid #ef4444"
                    : "4px solid #fbbf24",
                transition: "transform 0.2s ease",
                cursor: "default",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "4px" }}>
                {item.title || "Notification"}
              </div>
              <div style={{ fontSize: "14px", marginBottom: "6px", color: "#334155" }}>
                {item.message}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {new Date(item.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notifications;