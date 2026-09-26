import { lazy, Suspense } from "react";
import { Route, Routes, Navigate, Outlet } from "react-router-dom";
import { getStudentSession, getFacultySession, getAdminSession } from "../utils/session";

// Lazy-loaded route components for optimal initial bundle size and performance
const HomePage = lazy(() => import("../pages/HomePage"));
const Login = lazy(() => import("../pages/login/Login"));
const StudentDashboard = lazy(() => import("../pages/dashboard/StudentDashboard"));
const FacultyDashboard = lazy(() => import("../pages/dashboard/FacultyDashboard"));
const AdminDashboard = lazy(() => import("../pages/dashboard/AdminDashboard"));
const StudentAccountPage = lazy(() => import("../pages/account/StudentAccountPage"));
const FacultyAccountPage = lazy(() => import("../pages/account/FacultyAccountPage"));
const AdminAccountPage = lazy(() => import("../pages/account/AdminAccountPage"));
const AdminProblemList = lazy(() => import("../pages/problems/AdminProblemList"));
const AdminProblemCreate = lazy(() => import("../pages/problems/AdminProblemCreate"));
const AdminProblemDetails = lazy(() => import("../pages/problems/AdminProblemDetails"));
const AdminStudentList = lazy(() => import("../pages/admin/AdminStudentList"));
const AdminStudentSubmissions = lazy(() => import("../pages/admin/AdminStudentSubmissions"));
const AdminFacultyList = lazy(() => import("../pages/admin/AdminFacultyList"));
const AdminAdminList = lazy(() => import("../pages/admin/AdminAdminList"));
const AdminAddUser = lazy(() => import("../pages/admin/AdminAddUser"));
const AdminCourseManager = lazy(() => import("../pages/courses/AdminCourseManager"));
const AdminCourseDetails = lazy(() => import("../pages/courses/AdminCourseDetails"));
const AdminCourseProblemDetails = lazy(() => import("../pages/courses/AdminCourseProblemDetails"));
const FacultyCourseDetails = lazy(() => import("../pages/courses/FacultyCourseDetails"));
const FacultyCourseProblemDetails = lazy(() => import("../pages/courses/FacultyCourseProblemDetails"));
const FacultyCourseList = lazy(() => import("../pages/courses/FacultyCourseList"));
const FacultyStudentList = lazy(() => import("../pages/faculty/FacultyStudentList"));
const FacultyStudentSubmissions = lazy(() => import("../pages/faculty/FacultyStudentSubmissions"));
const StudentCourseDetails = lazy(() => import("../pages/courses/StudentCourseDetails"));
const StudentCourseProblemDetails = lazy(() => import("../pages/courses/StudentCourseProblemDetails"));
const StudentCourseList = lazy(() => import("../pages/courses/StudentCourseList"));
const StudentProblemList = lazy(() => import("../pages/problems/StudentProblemList"));
const StudentProblemDetails = lazy(() => import("../pages/problems/StudentProblemDetails"));
const CreateAssignmentPage = lazy(() => import("../pages/courses/CreateAssignmentPage"));
const AssignmentAttemptPage = lazy(() => import("../pages/courses/AssignmentAttemptPage"));
const AssignmentRecordsPage = lazy(() => import("../pages/courses/AssignmentRecordsPage"));
const StudentExamsPage = lazy(() => import("../pages/exams/StudentExamsPage"));
const FacultyExamsPage = lazy(() => import("../pages/exams/FacultyExamsPage"));
const AdminExamsPage = lazy(() => import("../pages/exams/AdminExamsPage"));

function PageFallback() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "80vh",
      gap: "12px",
      color: "#94a3b8",
      fontFamily: "var(--lc-font-body, system-ui, sans-serif)"
    }}>
      <div style={{
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        border: "3px solid rgba(255, 255, 255, 0.1)",
        borderTopColor: "#ff7e29",
        animation: "routeSpin 0.8s linear infinite"
      }} />
      <style>{`@keyframes routeSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: "0.85rem", letterSpacing: "0.02em" }}>Loading...</span>
    </div>
  );
}

function ProtectedRoute({ role }) {
  const session =
    role === "student"
      ? getStudentSession()
      : role === "faculty"
        ? getFacultySession()
        : role === "admin"
          ? getAdminSession()
          : null;

  if (!session || !session.token || session.user?.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function NotFoundPage() {
  return (
    <main className="route-status-page">
      <p className="route-status-label">404</p>
      <h1>Page not found</h1>
      <p>The route you requested does not exist yet.</p>
    </main>
  );
}

export default function MainRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/student/login" element={<Navigate to="/login" replace />} />
        <Route path="/studentLogin" element={<Navigate to="/login" replace />} />
        <Route path="/faculty/login" element={<Navigate to="/login" replace />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />

        {/* Student Protected Routes */}
        <Route element={<ProtectedRoute role="student" />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/courses" element={<StudentCourseList />} />
          <Route path="/student/courses/:courseId" element={<StudentCourseDetails />} />
          <Route path="/student/courses/:courseId/problems/:problemId" element={<StudentCourseProblemDetails />} />
          <Route path="/student/account" element={<StudentAccountPage />} />
          <Route path="/student/problems" element={<StudentProblemList />} />
          <Route path="/student/problems/:problemId" element={<StudentProblemDetails />} />
          <Route path="/student/problems/:problemId/solve" element={<StudentProblemDetails />} />
          <Route path="/student/exams" element={<StudentExamsPage />} />
          <Route path="/studentDashboard" element={<StudentDashboard />} />
          <Route path="/student/courses/:courseId/assignments/:assignmentId/attempt" element={<AssignmentAttemptPage />} />
        </Route>

        {/* Faculty Protected Routes */}
        <Route element={<ProtectedRoute role="faculty" />}>
          <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
          <Route path="/faculty/courses" element={<FacultyCourseList />} />
          <Route path="/faculty/courses/:courseId" element={<FacultyCourseDetails />} />
          <Route path="/faculty/courses/:courseId/problems/:problemId" element={<FacultyCourseProblemDetails />} />
          <Route path="/faculty/students" element={<FacultyStudentList />} />
          <Route path="/faculty/students/:studentId/submissions" element={<FacultyStudentSubmissions />} />
          <Route path="/faculty/problems" element={<Navigate to="/faculty/dashboard?tab=practice" replace />} />
          <Route path="/faculty/problems/:problemId/solve" element={<StudentProblemDetails />} />
          <Route path="/faculty/exams" element={<FacultyExamsPage />} />
          <Route path="/faculty/account" element={<FacultyAccountPage />} />
          <Route path="/faculty/courses/:courseId/assignments/new" element={<CreateAssignmentPage role="faculty" />} />
          <Route path="/faculty/courses/:courseId/assignments/:assignmentId/records" element={<AssignmentRecordsPage role="faculty" />} />
        </Route>

        {/* Admin Protected Routes */}
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/courses" element={<AdminCourseManager />} />
          <Route path="/admin/courses/:courseId" element={<AdminCourseDetails />} />
          <Route path="/admin/courses/:courseId/problems/:problemId" element={<AdminCourseProblemDetails />} />
          <Route path="/admin/account" element={<AdminAccountPage />} />
          <Route path="/admin/exams" element={<AdminExamsPage />} />
          <Route path="/admin/problems/new" element={<AdminProblemCreate />} />
          <Route path="/admin/problems" element={<AdminProblemList />} />
          <Route path="/admin/problems/:problemId" element={<AdminProblemDetails />} />
          <Route path="/admin/problems/:problemId/solve" element={<StudentProblemDetails />} />
          <Route path="/admin/students" element={<AdminStudentList />} />
          <Route path="/admin/add-user" element={<AdminAddUser />} />
          <Route path="/admin/users/add" element={<AdminAddUser />} />
          <Route path="/admin/admins" element={<AdminAdminList />} />
          <Route path="/admin/faculty" element={<AdminFacultyList />} />
          <Route path="/admin/students/:studentId/submissions" element={<AdminStudentSubmissions />} />
          <Route path="/admin/courses/:courseId/assignments/new" element={<CreateAssignmentPage role="admin" />} />
          <Route path="/admin/courses/:courseId/assignments/:assignmentId/records" element={<AssignmentRecordsPage role="admin" />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
