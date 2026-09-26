import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PlatformLayout, PlatformSection } from "../../components/PlatformLayout/PlatformLayout";
import { getAdminSession, getAuthHeaders } from "../../utils/session";
import { apiRequest } from "../../utils/api";

const apiBaseUrl = import.meta.env.VITE_API_URL || "https://codexa-project.onrender.com/api";

const initialStudentForm = {
  fullName: "",
  email: "",
  password: "",
  rollNumber: "",
  branch: "CSE",
  semester: "1",
  section: "A",
  batch: ""
};

const initialFacultyForm = {
  fullName: "",
  email: "",
  password: "",
  employeeId: "",
  department: "CSE",
  designation: "Faculty"
};

const initialAdminForm = {
  fullName: "",
  email: "",
  password: ""
};

export default function AdminAddUser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get("role") || "student";
  const [selectedRole, setSelectedRole] = useState(initialRole);

  const session = getAdminSession();

  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [facultyForm, setFacultyForm] = useState(initialFacultyForm);
  const [adminForm, setAdminForm] = useState(initialAdminForm);

  const [status, setStatus] = useState({
    loading: false,
    success: "",
    error: ""
  });

  function handleRoleChange(role) {
    setSelectedRole(role);
    setSearchParams({ role });
    setStatus({ loading: false, success: "", error: "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, success: "", error: "" });

    if (!session?.token) {
      setStatus({ loading: false, success: "", error: "Admin authentication token missing. Please log in again." });
      return;
    }

    try {
      if (selectedRole === "student") {
        if (!studentForm.fullName.trim() || !studentForm.email.trim() || !studentForm.password || !studentForm.rollNumber.trim()) {
          throw new Error("Please fill in all required student details including full name, email, roll number, and password.");
        }

        await apiRequest("/users/student-register", {
          method: "POST",
          headers: getAuthHeaders(session.token),
          body: JSON.stringify(studentForm)
        }, session.token);

        setStatus({
          loading: false,
          success: `Student account "${studentForm.fullName}" created successfully!`,
          error: ""
        });
        setStudentForm(initialStudentForm);
      } else if (selectedRole === "faculty") {
        if (!facultyForm.fullName.trim() || !facultyForm.email.trim() || !facultyForm.password || !facultyForm.employeeId.trim()) {
          throw new Error("Please fill in all required faculty details including full name, email, employee ID, and password.");
        }

        await apiRequest("/users/faculty-register", {
          method: "POST",
          headers: getAuthHeaders(session.token),
          body: JSON.stringify(facultyForm)
        }, session.token);

        setStatus({
          loading: false,
          success: `Faculty account "${facultyForm.fullName}" created successfully!`,
          error: ""
        });
        setFacultyForm(initialFacultyForm);
      } else if (selectedRole === "admin") {
        if (!adminForm.fullName.trim() || !adminForm.email.trim() || !adminForm.password) {
          throw new Error("Please fill in all required administrator details including full name, email, and password.");
        }

        await apiRequest("/users/admin-register", {
          method: "POST",
          headers: getAuthHeaders(session.token),
          body: JSON.stringify(adminForm)
        }, session.token);

        setStatus({
          loading: false,
          success: `Administrator account "${adminForm.fullName}" created successfully!`,
          error: ""
        });
        setAdminForm(initialAdminForm);
      }
    } catch (err) {
      setStatus({
        loading: false,
        success: "",
        error: err.message || "Failed to create user account."
      });
    }
  }

  return (
    <PlatformLayout
      role="admin"
      eyebrow="User Provisioning"
      title="Add New Platform User"
      subtitle="Issue credentials for new students, faculty instructors, or system administrators."
      sidebarNote="Admins can provision credentials across all roles. Students and Faculty will receive their login details to access their respective workspaces."
    >
      {/* Role Selection Section */}
      {/* Role Selection Section */}
      <PlatformSection label="Select Account Role" title="Choose the type of account to create">
        <div className="role-pill-bar">
          <button
            type="button"
            className={`role-pill-btn student ${selectedRole === "student" ? "active" : ""}`}
            onClick={() => handleRoleChange("student")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5" />
            </svg>
            <span>Student Account</span>
            {selectedRole === "student" && <span className="active-tag">✓ ACTIVE</span>}
          </button>

          <button
            type="button"
            className={`role-pill-btn faculty ${selectedRole === "faculty" ? "active" : ""}`}
            onClick={() => handleRoleChange("faculty")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Faculty Instructor</span>
            {selectedRole === "faculty" && <span className="active-tag">✓ ACTIVE</span>}
          </button>

          <button
            type="button"
            className={`role-pill-btn admin ${selectedRole === "admin" ? "active" : ""}`}
            onClick={() => handleRoleChange("admin")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>Platform Administrator</span>
            {selectedRole === "admin" && <span className="active-tag" style={{ background: "#be123c" }}>⚠️ SUPERUSER</span>}
          </button>
        </div>

        {/* Compact Alert Notice */}
        {selectedRole === "admin" && (
          <div className="role-alert-compact admin">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              <strong>Warning:</strong> Creating a <strong>Platform Administrator</strong> with unrestricted system control and full user access.
            </span>
          </div>
        )}

        {selectedRole === "faculty" && (
          <div className="role-alert-compact faculty">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              Creating a <strong>Faculty Instructor Account</strong> with access to course management, roster, and grading.
            </span>
          </div>
        )}

        {selectedRole === "student" && (
          <div className="role-alert-compact student">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              Creating a <strong>Student Account</strong> with access to problem sets, assigned courses, and submission tracking.
            </span>
          </div>
        )}
      </PlatformSection>

      {/* Creation Status Feedback */}

      {/* Creation Status Feedback */}
      {status.success ? (
        <div className="form-status success" style={{ marginBottom: "1.5rem", padding: "1rem" }}>
          <strong>{status.success}</strong>
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
            <Link
              className="auth-button admin-button"
              to={
                selectedRole === "student"
                  ? "/admin/students"
                  : selectedRole === "faculty"
                    ? "/admin/faculty"
                    : "/admin/admins"
              }
              style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}
            >
              View in Manage Users →
            </Link>
          </div>
        </div>
      ) : null}

      {status.error ? (
        <p className="form-status error" style={{ marginBottom: "1.5rem" }}>
          {status.error}
        </p>
      ) : null}

      {/* Dynamic Form per Role */}
      <PlatformSection
        label={selectedRole.toUpperCase()}
        title={`Enter ${selectedRole === "student" ? "Student" : selectedRole === "faculty" ? "Faculty" : "Administrator"} Details`}
      >
        <form className="auth-form course-form-grid" onSubmit={handleSubmit} autoComplete="off">
          {/* COMMON FIELDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            <div>
              <label className="platform-field-label">Full Name *</label>
              <input
                placeholder="Enter full name (e.g. Alex Morgan)"
                required
                autoComplete="off"
                value={
                  selectedRole === "student"
                    ? studentForm.fullName
                    : selectedRole === "faculty"
                      ? facultyForm.fullName
                      : adminForm.fullName
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (selectedRole === "student") setStudentForm((c) => ({ ...c, fullName: val }));
                  else if (selectedRole === "faculty") setFacultyForm((c) => ({ ...c, fullName: val }));
                  else setAdminForm((c) => ({ ...c, fullName: val }));
                }}
              />
            </div>

            <div>
              <label className="platform-field-label">Email Address *</label>
              <input
                placeholder={
                  selectedRole === "student"
                    ? "student@college.edu"
                    : selectedRole === "faculty"
                      ? "faculty@college.edu"
                      : "admin@college.edu"
                }
                required
                type="email"
                autoComplete="off"
                value={
                  selectedRole === "student"
                    ? studentForm.email
                    : selectedRole === "faculty"
                      ? facultyForm.email
                      : adminForm.email
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (selectedRole === "student") setStudentForm((c) => ({ ...c, email: val }));
                  else if (selectedRole === "faculty") setFacultyForm((c) => ({ ...c, email: val }));
                  else setAdminForm((c) => ({ ...c, email: val }));
                }}
              />
            </div>

            <div>
              <label className="platform-field-label">Temporary Password *</label>
              <input
                placeholder="Min 6 characters"
                required
                minLength={6}
                type="password"
                autoComplete="new-password"
                value={
                  selectedRole === "student"
                    ? studentForm.password
                    : selectedRole === "faculty"
                      ? facultyForm.password
                      : adminForm.password
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (selectedRole === "student") setStudentForm((c) => ({ ...c, password: val }));
                  else if (selectedRole === "faculty") setFacultyForm((c) => ({ ...c, password: val }));
                  else setAdminForm((c) => ({ ...c, password: val }));
                }}
              />
            </div>
          </div>

          {/* STUDENT SPECIFIC FIELDS */}
          {selectedRole === "student" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
              <div>
                <label className="platform-field-label">Roll Number *</label>
                <input
                  placeholder="e.g. 21CSE045"
                  required
                  autoComplete="off"
                  value={studentForm.rollNumber}
                  onChange={(e) => setStudentForm((c) => ({ ...c, rollNumber: e.target.value }))}
                />
              </div>

              <div>
                <label className="platform-field-label">Branch *</label>
                <select
                  className="roster-filter-select"
                  style={{ width: "100%" }}
                  value={studentForm.branch}
                  onChange={(e) => setStudentForm((c) => ({ ...c, branch: e.target.value }))}
                >
                  <option value="CSE">CSE - Computer Science</option>
                  <option value="ECE">ECE - Electronics</option>
                  <option value="ME">ME - Mechanical</option>
                  <option value="CE">CE - Civil</option>
                  <option value="IT">IT - Information Tech</option>
                  <option value="EE">EE - Electrical</option>
                </select>
              </div>

              <div>
                <label className="platform-field-label">Semester *</label>
                <select
                  className="roster-filter-select"
                  style={{ width: "100%" }}
                  value={studentForm.semester}
                  onChange={(e) => setStudentForm((c) => ({ ...c, semester: e.target.value }))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="platform-field-label">Section *</label>
                <select
                  className="roster-filter-select"
                  style={{ width: "100%" }}
                  value={studentForm.section}
                  onChange={(e) => setStudentForm((c) => ({ ...c, section: e.target.value }))}
                >
                  {["A", "B", "C", "D", "E"].map((sec) => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="platform-field-label">Batch *</label>
                <input
                  placeholder="e.g. 2023-2027"
                  required
                  autoComplete="off"
                  value={studentForm.batch}
                  onChange={(e) => setStudentForm((c) => ({ ...c, batch: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* FACULTY SPECIFIC FIELDS */}
          {selectedRole === "faculty" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
              <div>
                <label className="platform-field-label">Employee ID *</label>
                <input
                  placeholder="e.g. EMP-104"
                  required
                  autoComplete="off"
                  value={facultyForm.employeeId}
                  onChange={(e) => setFacultyForm((c) => ({ ...c, employeeId: e.target.value }))}
                />
              </div>

              <div>
                <label className="platform-field-label">Department *</label>
                <select
                  className="roster-filter-select"
                  style={{ width: "100%" }}
                  value={facultyForm.department}
                  onChange={(e) => setFacultyForm((c) => ({ ...c, department: e.target.value }))}
                >
                  <option value="CSE">Computer Science & Engineering</option>
                  <option value="ECE">Electronics & Communication</option>
                  <option value="ME">Mechanical Engineering</option>
                  <option value="CE">Civil Engineering</option>
                  <option value="IT">Information Technology</option>
                  <option value="EE">Electrical Engineering</option>
                  <option value="BSH">Basic Sciences & Humanities</option>
                </select>
              </div>

              <div>
                <label className="platform-field-label">Designation *</label>
                <select
                  className="roster-filter-select"
                  style={{ width: "100%" }}
                  value={facultyForm.designation}
                  onChange={(e) => setFacultyForm((c) => ({ ...c, designation: e.target.value }))}
                >
                  <option value="Professor">Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Lecturer">Lecturer</option>
                  <option value="Faculty">Faculty Instructor</option>
                </select>
              </div>
            </div>
          )}

          {/* ADMIN SPECIFIC NOTE */}
          {selectedRole === "admin" && (
            <p className="question-meta" style={{ marginTop: "1rem", color: "#94a3b8" }}>
              Note: Administrator accounts have full access to platform configuration, course management, user accounts, and problem bank creation.
            </p>
          )}

          <div style={{ marginTop: "1.5rem" }}>
            <button
              className={`auth-button ${
                selectedRole === "student"
                  ? "student-submit-btn"
                  : selectedRole === "faculty"
                    ? "faculty-submit-btn"
                    : "admin-danger-submit-btn"
              }`}
              type="submit"
              disabled={status.loading}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem", padding: "0.75rem 1.4rem" }}
            >
              {status.loading ? (
                "Creating Account..."
              ) : selectedRole === "admin" ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Create Platform Administrator Account
                </>
              ) : selectedRole === "faculty" ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Create Faculty Instructor Account
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5" />
                  </svg>
                  Create Student Account
                </>
              )}
            </button>
          </div>
        </form>
      </PlatformSection>
    </PlatformLayout>
  );
}
