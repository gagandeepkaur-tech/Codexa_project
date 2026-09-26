import { useEffect, useState } from "react";
import { PlatformSection, PlatformStats } from "../PlatformLayout/PlatformLayout";
import { getAuthHeaders } from "../../utils/session";
import { useTheme } from "../ThemeProvider";
import { ACCENT_PRESETS } from "../accentPresets";

const apiBaseUrl = import.meta.env.VITE_API_URL || "https://codexa-project.onrender.com/api";

export default function AccountSection({ role, session, saveSession }) {
  const user = session?.user;
  const profile = user?.profile || null;
  const [profileForm, setProfileForm] = useState({
    fullName: user?.full_name || "",
    email: user?.email || ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: ""
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileStatus, setProfileStatus] = useState({
    message: "",
    error: ""
  });
  const [passwordStatus, setPasswordStatus] = useState({
    message: "",
    error: ""
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    setProfileForm({
      fullName: user?.full_name || "",
      email: user?.email || ""
    });
  }, [user?.email, user?.full_name]);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileStatus({
      message: "",
      error: ""
    });

    try {
      const response = await fetch(`${apiBaseUrl}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify(profileForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update account details.");
      }

      const updatedSession = {
        token: data.token,
        user: data.user
      };

      saveSession(updatedSession);
      setProfileStatus({
        message: data.message,
        error: ""
      });
      setIsEditingProfile(false);
    } catch (error) {
      setProfileStatus({
        message: "",
        error: error.message
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setIsSavingPassword(true);
    setPasswordStatus({
      message: "",
      error: ""
    });

    try {
      const response = await fetch(`${apiBaseUrl}/users/me/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify(passwordForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to change password.");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: ""
      });
      setPasswordStatus({
        message: data.message,
        error: ""
      });
      setIsChangingPassword(false);
    } catch (error) {
      setPasswordStatus({
        message: "",
        error: error.message
      });
    } finally {
      setIsSavingPassword(false);
    }
  }

  const roleStats =
    role === "student"
      ? [
          {
            label: "Roll number",
            value: profile?.roll_number || "-",
            note: "Institute identifier"
          },
          {
            label: "Branch",
            value: profile?.branch || "-",
            note: "Academic department"
          },
          {
            label: "Semester",
            value: profile?.semester || "-",
            note: "Current term"
          }
        ]
      : role === "faculty"
        ? [
            {
              label: "Employee ID",
              value: profile?.employee_id || "-",
              note: "Institute identifier"
            },
            {
              label: "Department",
              value: profile?.department || "-",
              note: "Teaching department"
            },
            {
              label: "Designation",
              value: profile?.designation || "-",
              note: "Current role"
            }
          ]
        : [
            {
              label: "Role",
              value: user?.role || role,
              note: "Current access level"
            },
            {
              label: "Email",
              value: user?.email || "-",
              note: "Login email"
            },
            {
              label: "Created",
              value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : "-",
              note: "Account start date"
            }
          ];

  return (
    <PlatformSection
      label="Account"
      title={
        role === "admin"
          ? "Admin details and security"
          : role === "faculty"
            ? "Faculty details and security"
            : "Student details and security"
      }
      actions={
        <>
          <button
            className={`auth-button ${role === "admin" ? "admin-button" : "student-button"} panel-action-button`}
            type="button"
            onClick={() => {
              setIsEditingProfile((value) => !value);
              setProfileStatus({
                message: "",
                error: ""
              });
            }}
          >
            {isEditingProfile ? "Close edit" : "Edit details"}
          </button>
          <button
            className="auth-button ghost-button panel-action-button"
            type="button"
            onClick={() => {
              setIsChangingPassword((value) => !value);
              setPasswordStatus({
                message: "",
                error: ""
              });
            }}
          >
            {isChangingPassword ? "Close password" : "Change password"}
          </button>
        </>
      }
    >
      <PlatformStats
        items={[
          {
            label: "Name",
            value: user?.full_name || "-",
            note: "Current profile name"
          },
          ...roleStats
        ]}
      />

      {isEditingProfile ? (
        <form className="auth-form account-form-card" onSubmit={handleProfileSubmit}>
          <label className="form-field" htmlFor={`${role}-full-name`}>
            Full name
          </label>
          <input
            id={`${role}-full-name`}
            name="fullName"
            type="text"
            value={profileForm.fullName}
            onChange={(event) => {
              setProfileForm((current) => ({
                ...current,
                fullName: event.target.value
              }));
            }}
            required
          />

          <label className="form-field" htmlFor={`${role}-email`}>
            Email
          </label>
          <input
            id={`${role}-email`}
            name="email"
            type="email"
            value={profileForm.email}
            onChange={(event) => {
              setProfileForm((current) => ({
                ...current,
                email: event.target.value
              }));
            }}
            required
          />

          <button
            className={`auth-button ${role === "admin" ? "admin-button" : "student-button"}`}
            type="submit"
            disabled={isSavingProfile}
          >
            {isSavingProfile ? "Saving..." : "Save account details"}
          </button>

          {profileStatus.message ? <p className="form-status success">{profileStatus.message}</p> : null}
          {profileStatus.error ? <p className="form-status error">{profileStatus.error}</p> : null}
        </form>
      ) : null}

      {isChangingPassword ? (
        <form className="auth-form account-form-card" onSubmit={handlePasswordSubmit}>
          <label className="form-field" htmlFor={`${role}-current-password`}>
            Current password
          </label>
          <input
            id={`${role}-current-password`}
            name="currentPassword"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) => {
              setPasswordForm((current) => ({
                ...current,
                currentPassword: event.target.value
              }));
            }}
            required
          />

          <label className="form-field" htmlFor={`${role}-new-password`}>
            New password
          </label>
          <input
            id={`${role}-new-password`}
            name="newPassword"
            type="password"
            minLength={8}
            value={passwordForm.newPassword}
            onChange={(event) => {
              setPasswordForm((current) => ({
                ...current,
                newPassword: event.target.value
              }));
            }}
            required
          />

          <button
            className={`auth-button ${role === "admin" ? "admin-button" : "student-button"}`}
            type="submit"
            disabled={isSavingPassword}
          >
            {isSavingPassword ? "Saving..." : "Update password"}
          </button>

          {passwordStatus.message ? <p className="form-status success">{passwordStatus.message}</p> : null}
          {passwordStatus.error ? <p className="form-status error">{passwordStatus.error}</p> : null}
        </form>
      ) : null}

      {/* Interface Customization & Accent Color Settings */}
      <div style={{
        marginTop: "2rem",
        background: "var(--lc-card-bg)",
        border: "1px solid var(--lc-border)",
        borderRadius: "16px",
        padding: "1.5rem"
      }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--lc-text-primary)", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          🎨 Interface Customization & Theme Settings
        </h3>
        <p style={{ fontSize: "0.85rem", color: "var(--lc-text-muted)", marginBottom: "1.25rem" }}>
          Choose your workspace accent colors and appearance mode. Changes take effect instantly across all pages.
        </p>

        <AccountThemeCustomizer />
      </div>
    </PlatformSection>
  );
}

function AccountThemeCustomizer() {
  const { theme, toggleTheme, accentColor, setAccentColor } = useTheme();

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", flexWrap: "wrap" }}>
        {/* Appearance Mode */}
        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--lc-text-primary)", display: "block", marginBottom: "0.5rem" }}>
            Appearance Mode
          </label>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={() => theme !== "dark" && toggleTheme()}
              style={{
                background: theme === "dark" ? "var(--lc-accent, #ff7e29)" : "rgba(255, 255, 255, 0.05)",
                color: theme === "dark" ? "#fff" : "var(--lc-text-muted)",
                border: "1px solid",
                borderColor: theme === "dark" ? "var(--lc-accent, #ff7e29)" : "var(--lc-border)",
                borderRadius: "8px",
                padding: "0.6rem 1rem",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              🌙 Dark Mode
            </button>
            <button
              type="button"
              onClick={() => theme !== "light" && toggleTheme()}
              style={{
                background: theme === "light" ? "var(--lc-accent, #ff7e29)" : "rgba(255, 255, 255, 0.05)",
                color: theme === "light" ? "#fff" : "var(--lc-text-muted)",
                border: "1px solid",
                borderColor: theme === "light" ? "var(--lc-accent, #ff7e29)" : "var(--lc-border)",
                borderRadius: "8px",
                padding: "0.6rem 1rem",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              ☀️ Light Mode
            </button>
          </div>
        </div>

        {/* Accent Color Preset Swatches */}
        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--lc-text-primary)", display: "block", marginBottom: "0.5rem" }}>
            Primary Accent Color
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            {ACCENT_PRESETS.map((preset) => {
              const isSelected = accentColor.toLowerCase() === preset.color.toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setAccentColor(preset.color)}
                  style={{
                    background: "rgba(0, 0, 0, 0.2)",
                    border: isSelected ? `2px solid ${preset.color}` : "1px solid var(--lc-border)",
                    borderRadius: "8px",
                    padding: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    boxShadow: isSelected ? `0 0 10px ${preset.color}66` : "none"
                  }}
                >
                  <span style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    background: preset.color,
                    display: "inline-block",
                    flexShrink: 0
                  }} />
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? preset.color : "var(--lc-text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
