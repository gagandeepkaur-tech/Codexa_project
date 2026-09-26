import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlatformLayout, PlatformSection } from "../../components/PlatformLayout/PlatformLayout";
import { apiRequest } from "../../utils/api";
import { getStudentSession } from "../../utils/session";

export default function StudentCourseList() {
  const session = getStudentSession();
  const user = session?.user;
  const profile = user?.profile || null;
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
      role="student"
      eyebrow="Student Courses"
      title={user ? `${user.fullName || user.full_name}'s assigned courses` : "Assigned courses"}
      subtitle={
        user
          ? `You can only see courses mapped to ${profile?.branch || "-"}, semester ${profile?.semester || "-"}, section ${profile?.section || "-"}, batch ${profile?.batch || "-"}.`
          : "Only the courses mapped to your branch, semester, section, and batch appear here."
      }
      meta="Batch-wise Access"
      sidebarNote="Course visibility is validated on the backend too, so changing the URL alone is not enough to open another batch's course."
    >
      <PlatformSection label="Course Search" title="Browse your course set">
        <input
          className="filter-input"
          placeholder="Search by course title or code"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {status.loading ? <p className="dashboard-copy">Loading assigned courses...</p> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}
        {!status.loading && !status.error && courses.length === 0 ? (
          <p className="dashboard-copy">No courses are assigned to your academic profile yet.</p>
        ) : null}
        {!status.loading && !status.error && courses.length > 0 ? (
          <div className="course-grid">
            {courses.map((course) => (
              <article className="question-card course-card" key={course.id}>
                <div className="question-card-top">
                  <span className="difficulty-pill easy">{course.code}</span>
                  <span className="question-meta">{course.assignmentCount} assignments</span>
                </div>
                <h3>{course.title}</h3>
                <p>{course.description || "No description added yet."}</p>
                <p className="question-meta">
                  Faculty: {course.faculty.map((member) => member.fullName).join(", ")}
                </p>
                <p className="question-meta">
                  Semester {course.semesterTargets.join(", ")} | Section {course.sectionTargets.join(", ")}
                </p>
                <Link className="auth-button student-button detail-link" to={`/student/courses/${course.id}`}>
                  Open course
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </PlatformSection>
    </PlatformLayout>
  );
}
