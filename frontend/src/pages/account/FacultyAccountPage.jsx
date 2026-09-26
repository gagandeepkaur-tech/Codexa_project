import { Link } from "react-router-dom";
import AccountSection from "../../components/AccountSection/AccountSection";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout/PlatformLayout";
import { getFacultySession, saveFacultySession } from "../../utils/session";

export default function FacultyAccountPage() {
  const session = getFacultySession();
  const user = session?.user;
  const profile = user?.profile || null;

  return (
    <PlatformLayout
      role="faculty"
      eyebrow="Account Settings"
      title={user ? `${user.full_name}'s faculty profile` : "Faculty account"}
      subtitle="Manage faculty identity details and password from a dedicated settings page without mixing it into course delivery screens."
      meta="Faculty Profile"
      actions={
        <Link className="auth-button student-button panel-action-button" to="/faculty/dashboard">
          Back to dashboard
        </Link>
      }
      sidebarNote="This is the faculty account center for profile maintenance and sign-in security, separate from course publishing and student review workflows."
    >
      <PlatformStats
        items={[
          {
            label: "Full name",
            value: user?.full_name || "-",
            note: "Faculty profile name"
          },
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
            note: "Current faculty role"
          }
        ]}
      />

      <PlatformSection label="Profile" title="Faculty account overview">
        <p className="dashboard-copy">
          Keep faculty identity details, department information, and password management in this
          dedicated settings area so the course workspace stays focused on teaching tasks.
        </p>
      </PlatformSection>

      <AccountSection role="faculty" session={session} saveSession={saveFacultySession} />
    </PlatformLayout>
  );
}
