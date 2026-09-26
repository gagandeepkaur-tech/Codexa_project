import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout/PlatformLayout";
import { getFacultySession, clearFacultySession, saveFacultySession } from "../../utils/session";

import FacultyDashboardOverview from "../../components/faculty/FacultyDashboardOverview";
import FacultyCoursesView from "../../components/faculty/FacultyCoursesView";
import FacultyStudentsView from "../../components/faculty/FacultyStudentsView";
import FacultyAnalyticsView from "../../components/faculty/FacultyAnalyticsView";
import FacultyPracticeView from "../../components/faculty/FacultyPracticeView";
import FacultyAccountView from "../../components/faculty/FacultyAccountView";
import FacultyLogoutModal from "../../components/faculty/FacultyLogoutModal";
import FacultyActionModals from "../../components/faculty/FacultyActionModals";

export default function FacultyDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  // Synchronize initial active tab with URL query parameter or default to overview
  const activeTab = searchParams.get("tab") || "overview";
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeQuickAction, setActiveQuickAction] = useState(null);

  // Retrieve user session
  const [session, setSession] = useState(() => location.state?.session || getFacultySession());
  const user = session?.user;
  const profile = user?.profile || null;

  // Sync active tab with URL query parameters when tab changes
  const handleSelectTab = (tabId) => {
    if (tabId === "logout") {
      setShowLogoutModal(true);
      return;
    }
    navigate(`/faculty/dashboard?tab=${tabId}`, { replace: true });
  };

  const handleConfirmLogout = () => {
    clearFacultySession();
    navigate("/login", { replace: true });
  };

  const handleOpenAction = (actionId) => {
    if (actionId === "add_problem") {
      navigate("/faculty/dashboard?tab=practice", { replace: true });
      return;
    }
    setActiveQuickAction(actionId);
  };

  const handleSaveSession = (newSession) => {
    saveFacultySession(newSession);
    setSession(newSession);
  };

  return (
    <PlatformLayout
      role="faculty"
      eyebrow="Faculty Portal"
      title={
        activeTab === "analytics"
          ? "Student Analytics & Insights"
          : activeTab === "courses"
          ? "Academic Courses"
          : activeTab === "students"
          ? "Enrolled Students Roster"
          : activeTab === "practice"
          ? "Practice Problem Bank"
          : activeTab === "account"
          ? "Faculty Account Settings"
          : user
          ? `Welcome back, ${user.fullName || user.full_name}`
          : "Faculty Dashboard"
      }
      subtitle={
        activeTab === "analytics"
          ? "Monitor student course progress, completion metrics, and submission history"
          : activeTab === "courses"
          ? "Manage course curricula, modules, assignments, and student enrollments"
          : activeTab === "students"
          ? "Review student attendance, coding scores, assignments, and grades"
          : activeTab === "practice"
          ? "Author coding challenges, manage test cases, and review submissions"
          : activeTab === "account"
          ? "Update personal details, professional teaching info, and security preferences"
          : "Manage courses, students, assignments, coding assessments, and analytics from one centralized dashboard"
      }
      meta={profile?.designation ? `${profile.designation} | ${profile.department || "CS Dept"}` : "Faculty Details"}
      actions={
        <>
          <button
            className={`auth-button ${activeTab === "overview" ? "student-button" : "ghost-button"} panel-action-button`}
            onClick={() => handleSelectTab("overview")}
          >
            Overview
          </button>
          <button
            className={`auth-button ${activeTab === "courses" ? "student-button" : "ghost-button"} panel-action-button`}
            onClick={() => handleSelectTab("courses")}
          >
            Courses
          </button>
          <button
            className={`auth-button ${activeTab === "students" ? "student-button" : "ghost-button"} panel-action-button`}
            onClick={() => handleSelectTab("students")}
          >
            Students
          </button>
          <button
            className={`auth-button ${activeTab === "analytics" ? "student-button" : "ghost-button"} panel-action-button`}
            onClick={() => handleSelectTab("analytics")}
          >
            Analytics
          </button>
          <button
            className={`auth-button ${activeTab === "practice" ? "student-button" : "ghost-button"} panel-action-button`}
            onClick={() => handleSelectTab("practice")}
          >
            Practice
          </button>
          <button
            className={`auth-button ${activeTab === "account" ? "student-button" : "ghost-button"} panel-action-button`}
            onClick={() => handleSelectTab("account")}
          >
            Account
          </button>
        </>
      }
      sidebarNote="Monitor student course completion metrics, submission history, and roster progress."
    >
      {/* Top Platform Overview Stats */}
      <PlatformStats
        items={[
          {
            label: "Faculty Role",
            value: profile?.designation || "Faculty",
            note: "Current designation"
          },
          {
            label: "Department",
            value: profile?.department || "Computer Science",
            note: "Academic department"
          },
          {
            label: "Employee ID",
            value: profile?.employee_id || profile?.employeeId || "N/A",
            note: "Institute record"
          }
        ]}
      />

      {/* Tab Views Content wrapped inside unified Codexa layout */}
      {activeTab === "overview" && (
        <FacultyDashboardOverview
          onQuickAction={handleOpenAction}
          onNavigateTab={handleSelectTab}
        />
      )}

      {activeTab === "courses" && (
        <FacultyCoursesView onQuickAction={handleOpenAction} />
      )}

      {activeTab === "students" && <FacultyStudentsView />}

      {activeTab === "analytics" && <FacultyAnalyticsView />}

      {activeTab === "practice" && (
        <FacultyPracticeView onQuickAction={handleOpenAction} />
      )}

      {activeTab === "account" && <FacultyAccountView user={user} />}

      {/* Logout Confirmation Modal */}
      <FacultyLogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirmLogout={handleConfirmLogout}
      />

      {/* Quick Action & Settings Modals */}
      <FacultyActionModals
        activeAction={activeQuickAction}
        onClose={() => setActiveQuickAction(null)}
      />
    </PlatformLayout>
  );
}
