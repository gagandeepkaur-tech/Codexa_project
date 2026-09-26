import { Link } from "react-router-dom";
import AccountSection from "../../components/AccountSection/AccountSection";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout/PlatformLayout";
import { getAdminSession, saveAdminSession } from "../../utils/session";

export default function AdminAccountPage() {
  const session = getAdminSession();
  const user = session?.user;

  return (
    <PlatformLayout
      role="admin"
      eyebrow="Account Settings"
      title={user ? `${user.full_name}'s admin profile` : "Admin account"}
      subtitle="Manage admin identity details and password from a dedicated settings page, more like the account areas on established coding platforms."
      meta="Admin Profile"
      actions={
        <Link className="auth-button admin-button panel-action-button" to="/admin/dashboard">
          Back to dashboard
        </Link>
      }
      sidebarNote="This is the admin account center for profile maintenance and security settings, separate from problem-bank and student-review workflows."
    >
      <PlatformStats
        items={[
          {
            label: "Full name",
            value: user?.full_name || "-",
            note: "Admin profile name"
          },
          {
            label: "Email",
            value: user?.email || "-",
            note: "Current sign-in email"
          },
          {
            label: "Role",
            value: user?.role || "admin",
            note: "Access type"
          }
        ]}
      />

      <PlatformSection label="Profile" title="Admin account overview">
        <p className="dashboard-copy">
          Keep admin details and password management in this dedicated settings area so the main
          dashboard stays focused on platform operations.
        </p>
      </PlatformSection>

      <AccountSection role="admin" session={session} saveSession={saveAdminSession} />
    </PlatformLayout>
  );
}
