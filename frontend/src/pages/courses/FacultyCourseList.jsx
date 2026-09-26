import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlatformLayout, PlatformSection } from "../../components/PlatformLayout/PlatformLayout";
import { apiRequest } from "../../utils/api";
import { getFacultySession } from "../../utils/session";

export default function FacultyCourseList() {
  const session = getFacultySession();
  const user = session?.user;
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      try {
        const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
        const data = await apiRequest(`/courses${query}`, {}, session?.token);

        if (isMounted) {
          setCourses(data);
          setStatus({
            loading: false,
            error: ""
          });
        }
      } catch (error) {
        if (isMounted) {
          setStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    loadCourses();
    return () => {
      isMounted = false;
    };
  }, [search, session?.token]);

  return (
    <PlatformLayout
      role="faculty"
      eyebrow="Faculty Courses"
      title={user ? `${user.fullName || user.full_name}'s teaching courses` : "Faculty courses"}
      subtitle="This page is only for assigned courses. Open a course to manage roster, materials, assignments, and coding practice."
      meta="Course Workspaces"
      sidebarNote="Unlike the dashboard, this page is course-focused. Each card leads into a separate course management workspace."
    >
      <PlatformSection
        label="Assigned Courses"
        title="Browse course workspaces"
        actions={
          <input
            className="filter-input"
            placeholder="Search by course title or code"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        {status.loading ? <p className="dashboard-copy">Loading assigned courses...</p> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}
        {!status.loading && !status.error && courses.length === 0 ? (
          <p className="dashboard-copy">No courses are assigned to this faculty account yet.</p>
        ) : null}
        {!status.loading && !status.error && courses.length > 0 ? (
          <div className="course-grid">
            {courses.map((course) => (
              <article className="question-card course-card" key={course.id}>
                <div className="question-card-top">
                  <span className="difficulty-pill easy">{course.code}</span>
                  <span className="question-meta">{course.enrolledCount || 0} students</span>
                </div>
                <h3>{course.title}</h3>
                <p>{course.description || "No description added yet."}</p>
                <p className="question-meta">
                  {course.branchTargets.join(", ")} | Sem {course.semesterTargets.join(", ")} | Sec{" "}
                  {course.sectionTargets.join(", ")}
                </p>
                <p className="question-meta">Assignments: {course.assignmentCount || 0}</p>
                <Link className="auth-button student-button detail-link" to={`/faculty/courses/${course.id}`}>
                  Open course workspace
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </PlatformSection>
    </PlatformLayout>
  );
}
