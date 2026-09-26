import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PlatformLayout, PlatformSection } from "../../components/PlatformLayout";
import { apiRequest } from "../../utils/api";
import { getStudentSession } from "../../utils/session";
import { enterFullScreen } from "../../utils/fullscreen";

export default function StudentCourseDetails() {
  const { courseId } = useParams();
  const session = getStudentSession();
  const user = session?.user;
  const profile = user?.profile || null;
  const [data, setData] = useState(null);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const [submissionForms, setSubmissionForms] = useState({});
  const [submitStatus, setSubmitStatus] = useState({});

  function applyOptimisticAssignmentSubmission(assignmentId) {
    setData((currentData) => {
      if (!currentData) {
        return currentData;
      }

      return {
        ...currentData,
        assignments: currentData.assignments.map((assignment) =>
          assignment.id === assignmentId
            ? {
                ...assignment,
                submissions: [
                  {
                    id: `${assignmentId}-latest`,
                    submittedAt: new Date().toISOString(),
                    grade: null,
                    feedback: "",
                    status: "submitted"
                  }
                ]
              }
            : assignment
        )
      };
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function loadCourse() {
      try {
        const result = await apiRequest(`/courses/${courseId}`, {}, session?.token);

        if (isMounted) {
          setData(result.course);
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

    loadCourse();
    return () => {
      isMounted = false;
    };
  }, [courseId, session?.token]);

  async function handleAssignmentSubmit(assignmentId) {
    try {
      await apiRequest(
        `/assignments/${assignmentId}/submissions`,
        {
          method: "POST",
          body: JSON.stringify(submissionForms[assignmentId] || {})
        },
        session?.token
      );

      applyOptimisticAssignmentSubmission(assignmentId);

      setSubmitStatus((current) => ({
        ...current,
        [assignmentId]: {
          success: "Assignment submitted successfully.",
          error: ""
        }
      }));
    } catch (error) {
      setSubmitStatus((current) => ({
        ...current,
        [assignmentId]: {
          success: "",
          error: error.message
        }
      }));
    }
  }

  return (
    <PlatformLayout
      role="student"
      eyebrow="Course Details"
      title={data ? `${data.code} - ${data.title}` : "Course details"}
      subtitle={
        user
          ? `This course is available to your academic profile: ${profile?.branch || "-"}, semester ${profile?.semester || "-"}, section ${profile?.section || "-"}, batch ${profile?.batch || "-"}.`
          : "Assignments, materials, and coding content that belong to your own batch and section."
      }
      meta="Protected Course"
      sidebarNote="If a course is not assigned to your academic profile, the backend blocks the request before data is returned."
    >
      {status.loading ? <p className="dashboard-copy">Loading course details...</p> : null}
      {status.error ? <p className="form-status error">{status.error}</p> : null}

      {!status.loading && !status.error && data ? (
        <>
              <PlatformSection label="Study Material" title="Course resources">
            {data.materials.length === 0 ? <p className="dashboard-copy">No study material uploaded yet.</p> : null}
            <div className="history-list">
              {data.materials.map((material) => (
                <article className="history-card" key={material.id}>
                  <div className="question-card-top">
                    <span className="difficulty-pill medium">{material.type}</span>
                  </div>
                  <strong>{material.title}</strong>
                  <p>{material.description || "No description provided."}</p>
                  <a className="auth-button ghost-button detail-link" href={material.url} target="_blank" rel="noreferrer">
                    Open material
                  </a>
                </article>
              ))}
            </div>
          </PlatformSection>

          <PlatformSection label="Assignments" title="Submit and track your work">
            {data.assignments.length === 0 ? <p className="dashboard-copy">No assignments published yet.</p> : null}
            <div className="history-list">
              {data.assignments.map((assignment) => {
                const ownSubmission = assignment.submissions?.[0] || null;

                return (
                  <article className="history-card" key={assignment.id}>
                    <strong>{assignment.title}</strong>
                    <p>{assignment.description || "No assignment description provided."}</p>
                    <p className="question-meta">
                      {assignment.type} | Due{" "}
                      {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : "No deadline"}
                    </p>
                    <Link
                      className="auth-button student-button detail-link"
                      to={`/student/courses/${courseId}/assignments/${assignment.id}/attempt`}
                      onClick={() => {
                        enterFullScreen().catch(() => {});
                      }}
                      style={{ marginTop: "1rem", display: "inline-block" }}
                    >
                      {assignment.attempt?.status === 'submitted' ? 'View Result' : (assignment.attempt ? 'Continue Assignment' : 'Start Assignment')}
                    </Link>
                    
                    {assignment.attempt ? (
                      <div className="course-progress-block" style={{ marginTop: "1rem" }}>
                        <p className="question-meta" style={{ margin: 0 }}>
                          Status: <strong style={{ color: assignment.attempt.status === 'submitted' ? "green" : "orange" }}>{assignment.attempt.status}</strong>
                        </p>
                        {assignment.attempt.status === 'submitted' && (
                           <p className="question-meta" style={{ margin: "0.25rem 0 0 0" }}>
                             Score: <strong>{assignment.attempt.total_score} / {assignment.max_score}</strong>
                           </p>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </PlatformSection>

          <PlatformSection label="Coding Problems" title="Course questions">
            {data.codingProblems.length === 0 ? <p className="dashboard-copy">No course coding problems yet.</p> : null}
            {data.codingProblems.length > 0 ? (
              <div className="question-list">
                {data.codingProblems.map((problem) => (
                  <Link
                    className="question-card question-link-card"
                    key={problem.id}
                    to={`/student/courses/${courseId}/problems/${problem.id}`}
                  >
                    <div className="question-card-top">
                      <span className={`difficulty-pill ${problem.difficulty}`}>{problem.difficulty}</span>
                      <span className="question-meta">{problem.sampleTestCases?.length || 0} sample cases</span>
                    </div>
                    <h3>{problem.title}</h3>
                    <p>{problem.statement}</p>
                    <span className="question-cta">Open workspace</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </PlatformSection>

          <Link className="auth-button student-button detail-link" to="/student/courses">
            Back to courses
          </Link>
        </>
      ) : null}
    </PlatformLayout>
  );
}
