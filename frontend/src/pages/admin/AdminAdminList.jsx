import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout/PlatformLayout";
import { clearAdminSession, getAdminSession, getAuthHeaders } from "../../utils/session";

const apiBaseUrl = import.meta.env.VITE_API_URL || "https://codexa-project.onrender.com/api";
const initialAdminForm = {
  fullName: "",
  email: "",
  password: ""
};

export default function AdminAdminList() {
  const session = getAdminSession();
  const [admins, setAdmins] = useState([]);
  const [filters, setFilters] = useState({
    search: ""
  });
  const [adminForm, setAdminForm] = useState(initialAdminForm);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const [createStatus, setCreateStatus] = useState({ message: "", error: "" });
  const [isCreating, setIsCreating] = useState(false);

  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editAdminForm, setEditAdminForm] = useState({
    fullName: "",
    email: "",
    password: ""
  });
  const [editStatus, setEditStatus] = useState({ loading: false, message: "", error: "" });

  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    userId: null,
    userName: null,
    role: "admin",
    isDeleting: false,
    statusMessage: "",
    statusType: ""
  });

  function handleExpiredAdminSession(message = "Your admin session expired. Please log in again.") {
    clearAdminSession();
    setAdmins([]);
    setStatus({
      loading: false,
      error: message
    });
  }

  async function loadAdmins(searchValue = filters.search) {
    setStatus({
      loading: true,
      error: ""
    });

    if (!session?.token) {
      setAdmins([]);
      setStatus({
        loading: false,
        error: "Log in as an admin to view admins."
      });
      return;
    }

    try {
      const params = new URLSearchParams({
        role: "admin"
      });

      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
      }

      const response = await fetch(`${apiBaseUrl}/users?${params.toString()}`, {
        headers: {
          ...getAuthHeaders(session.token)
        }
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          handleExpiredAdminSession(data.message || "Your admin session expired. Please log in again.");
          return;
        }

        throw new Error(data.message || "Unable to load admins.");
      }

      setAdmins(data);
      setStatus({
        loading: false,
        error: ""
      });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message
      });
    }
  }

  useEffect(() => {
    loadAdmins();
  }, [filters.search, session?.token]);

  async function handleCreateAdmin(event) {
    event.preventDefault();
    setIsCreating(true);
    setCreateStatus({ message: "", error: "" });

    try {
      const response = await fetch(`${apiBaseUrl}/users/admin-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify(adminForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create admin account.");
      }

      setCreateStatus({
        message: data.message || "Admin account created successfully.",
        error: ""
      });
      setAdminForm(initialAdminForm);
      loadAdmins();
    } catch (error) {
      setCreateStatus({
        message: "",
        error: error.message
      });
    } finally {
      setIsCreating(false);
    }
  }

  function handleOpenEdit(adm) {
    setEditingAdmin(adm);
    setEditAdminForm({
      fullName: adm.full_name || "",
      email: adm.email || "",
      password: ""
    });
    setEditStatus({ loading: false, message: "", error: "" });
  }

  async function handleSaveEditAdmin(event) {
    event.preventDefault();
    if (!editingAdmin) return;
    setEditStatus({ loading: true, message: "", error: "" });

    try {
      const payload = { ...editAdminForm };
      if (!payload.password || payload.password.trim().length === 0) {
        delete payload.password;
      }
      const response = await fetch(`${apiBaseUrl}/users/${editingAdmin.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update admin details.");
      }

      setAdmins((prev) =>
        prev.map((a) => (a.id === editingAdmin.id ? { ...a, ...data.user } : a))
      );

      setEditStatus({
        loading: false,
        message: "Admin details updated successfully!",
        error: ""
      });

      setTimeout(() => {
        setEditingAdmin(null);
        setEditStatus({ loading: false, message: "", error: "" });
      }, 1000);
    } catch (err) {
      setEditStatus({
        loading: false,
        message: "",
        error: err.message
      });
    }
  }

  function handleDeleteAdmin(adminId, fullName) {
    setDeleteConfirm({
      show: true,
      userId: adminId,
      userName: fullName,
      role: "admin",
      isDeleting: false,
      statusMessage: "",
      statusType: ""
    });
  }

  async function confirmDeleteAdmin() {
    setDeleteConfirm((prev) => ({ ...prev, isDeleting: true }));
    try {
      const response = await fetch(`${apiBaseUrl}/users/${deleteConfirm.userId}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeaders(session?.token)
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete admin account.");
      }

      setAdmins((prev) => prev.filter((a) => a.id !== deleteConfirm.userId));
      setDeleteConfirm((prev) => ({
        ...prev,
        isDeleting: false,
        statusMessage: data.message || "Admin account deleted successfully.",
        statusType: "success"
      }));
    } catch (error) {
      setDeleteConfirm((prev) => ({
        ...prev,
        isDeleting: false,
        statusMessage: error.message,
        statusType: "error"
      }));
    }
  }

  function closeDeleteModal() {
    setDeleteConfirm({
      show: false,
      userId: null,
      userName: null,
      role: "admin",
      isDeleting: false,
      statusMessage: "",
      statusType: ""
    });
  }

  const filteredAdmins = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    if (!q) return admins;
    return admins.filter(
      (adm) =>
        adm.full_name?.toLowerCase().includes(q) ||
        adm.email?.toLowerCase().includes(q)
    );
  }, [admins, filters.search]);

  return (
    <PlatformLayout
      role="admin"
      eyebrow="Admin Directory"
      title="Create and review administrator accounts"
      subtitle="Authorized administrator accounts can manage courses, problem bank, faculty and students."
      meta={`${admins.length} admins`}
      sidebarNote="Admin accounts have full backend control of the platform. Make sure only authorized university admins have access."
    >
      {/* Role Switcher Tabs (Students / Faculty / Admins) */}
      <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.5rem", background: "rgba(15, 23, 42, 0.8)", padding: "5px", borderRadius: "14px", width: "fit-content", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <Link
          to="/admin/students"
          style={{
            padding: "0.55rem 1.2rem",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "0.85rem",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "transparent",
            color: "#94A3B8"
          }}
        >
          👨‍🎓 Students Directory
        </Link>
        <Link
          to="/admin/faculty"
          style={{
            padding: "0.55rem 1.2rem",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "0.85rem",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "transparent",
            color: "#94A3B8"
          }}
        >
          👨‍🏫 Faculty Directory
        </Link>
        <Link
          to="/admin/admins"
          style={{
            padding: "0.55rem 1.2rem",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "0.85rem",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "linear-gradient(135deg, #7C5CFF, #6366F1)",
            color: "#fff",
            boxShadow: "0 4px 14px rgba(124, 92, 255, 0.4)"
          }}
        >
          🛡️ Administrators
        </Link>
      </div>

      <PlatformStats
        items={[
          {
            label: "Administrators",
            value: admins.length,
            note: "Total platform managers"
          },
          {
            label: "Control Level",
            value: "Full Control",
            note: "Read & write database privilege"
          }
        ]}
      />

      <PlatformSection label="Search" title="Find admin quickly">
        <div className="filter-bar">
          <input
            aria-label="Search admins"
            className="filter-input"
            placeholder="Search by admin name or email"
            type="search"
            value={filters.search}
            onChange={(event) => {
              setFilters({
                search: event.target.value
              });
            }}
          />
        </div>
      </PlatformSection>

      <PlatformSection label="Roster" title="Issued administrator accounts">
        {status.loading ? <p className="dashboard-copy">Loading admins...</p> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}
        {!status.loading && !status.error && filteredAdmins.length === 0 ? (
          <p className="dashboard-copy">No admins matched the current search.</p>
        ) : null}
        {!status.loading && !status.error && filteredAdmins.length > 0 ? (
          <div className="question-list">
            {filteredAdmins.map((adm) => {
              const isCurrentUser = adm.id === session?.user?.id;
              return (
                <article className="question-card" key={adm.id}>
                  <div className="question-card-top">
                    <span className="difficulty-pill hard">admin</span>
                    <span className="question-meta">
                      Joined {new Date(adm.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3>{adm.full_name}</h3>
                  <p>{adm.email}</p>
                  {isCurrentUser ? (
                    <p className="question-meta" style={{ color: "#22c55e", fontWeight: "bold", margin: "0.4rem 0" }}>
                      ● Currently logged in
                    </p>
                  ) : null}

                  <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                    <button
                      className="compact-btn compact-btn-secondary"
                      type="button"
                      onClick={() => handleOpenEdit(adm)}
                      style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.35)", padding: "0.45rem 0.8rem", fontSize: "0.82rem" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: "4px", verticalAlign: "middle" }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit Details
                    </button>
                    {!isCurrentUser && (
                      <button
                        className="auth-button ghost-button detail-link inline-link-button platform-danger-btn"
                        type="button"
                        onClick={() => handleDeleteAdmin(adm.id, adm.full_name)}
                        style={{ padding: "0.45rem 0.8rem", fontSize: "0.82rem", margin: 0 }}
                      >
                        Delete Admin
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </PlatformSection>

      {/* EDIT ADMIN MODAL */}
      {editingAdmin && (
        <div
          className="custom-modal-overlay"
          onClick={(e) => {
            if (e.target.className === "custom-modal-overlay") setEditingAdmin(null);
          }}
        >
          <div className="custom-modal" style={{ maxWidth: "560px", width: "94%", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.8rem" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", margin: 0, color: "#fff" }}>
                  Edit Administrator
                </h2>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                  Updating account for {editingAdmin.full_name}
                </span>
              </div>
              <button
                className="compact-btn compact-btn-secondary"
                type="button"
                onClick={() => setEditingAdmin(null)}
                style={{ padding: "0.3rem 0.6rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditAdmin} className="auth-form" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Full Name</label>
                <input
                  required
                  value={editAdminForm.fullName}
                  onChange={(e) => setEditAdminForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>College Email</label>
                <input
                  required
                  type="email"
                  value={editAdminForm.email}
                  onChange={(e) => setEditAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>New Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  placeholder="Enter new password (min 8 chars)"
                  value={editAdminForm.password}
                  onChange={(e) => setEditAdminForm((prev) => ({ ...prev, password: e.target.value }))}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              {editStatus.message ? (
                <p className="form-status success" style={{ margin: "0.4rem 0" }}>{editStatus.message}</p>
              ) : null}
              {editStatus.error ? (
                <p className="form-status error" style={{ margin: "0.4rem 0" }}>{editStatus.error}</p>
              ) : null}

              <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.6rem" }}>
                <button
                  type="button"
                  className="compact-btn compact-btn-secondary"
                  style={{ flex: 1, padding: "0.65rem" }}
                  onClick={() => setEditingAdmin(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="compact-btn compact-btn-primary"
                  style={{ flex: 1, padding: "0.65rem" }}
                  disabled={editStatus.loading}
                >
                  {editStatus.loading ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm.show && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                color: "#ef4444"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2h2M10 11v6M14 11v6" />
                </svg>
              </div>
            </div>
            
            {deleteConfirm.statusMessage ? (
              <>
                <h2 style={{ fontSize: "1.35rem", margin: "0 0 0.5rem" }}>
                  {deleteConfirm.statusType === "success" ? "Success" : "Error"}
                </h2>
                <p style={{ color: deleteConfirm.statusType === "success" ? "#10b981" : "#ef4444", marginBottom: "1.5rem" }}>
                  {deleteConfirm.statusMessage}
                </p>
                <button
                  className="auth-button admin-button"
                  style={{ width: "100%", marginTop: 0 }}
                  onClick={closeDeleteModal}
                >
                  Okay
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: "1.35rem", margin: "0 0 0.5rem" }}>Delete Administrator</h2>
                <p style={{ opacity: 0.8, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
                  Are you sure you want to permanently delete administrator account <strong>{deleteConfirm.userName}</strong>?
                </p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    className="auth-button ghost-button"
                    style={{ flex: 1, marginTop: 0, border: "1px solid rgba(148, 163, 184, 0.3)" }}
                    onClick={closeDeleteModal}
                    disabled={deleteConfirm.isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    className="auth-button"
                    style={{
                      flex: 1,
                      marginTop: 0,
                      background: "#ef4444",
                      borderColor: "#ef4444",
                      color: "#ffffff"
                    }}
                    onClick={confirmDeleteAdmin}
                    disabled={deleteConfirm.isDeleting}
                  >
                    {deleteConfirm.isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}
