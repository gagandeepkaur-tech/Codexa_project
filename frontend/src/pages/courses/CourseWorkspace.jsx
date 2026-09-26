import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout";
import { apiRequest } from "../../utils/api";
import CsvQuestionImporter from "../../components/CsvQuestionImporter";

const initialAssignmentForm = {
  title: "",
  description: "",
  type: "coding",
  dueDate: "",
  maxScore: 100
};

const initialMaterialForm = {
  title: "",
  description: "",
  type: "notes",
  url: ""
};

const initialProblemForm = {
  title: "",
  statement: "",
  difficulty: "medium",
  inputFormat: "",
  outputFormat: "",
  constraintsText: "",
  examplesText: ""
};

const blankTestCase = {
  input_data: "",
  expected_output: ""
};

function formatDateTime(value) {
  if (!value) {
    return "No deadline";
  }

  return new Date(value).toLocaleString();
}

function getAudienceLabel(course) {
  return `${course.branchTargets.join(", ")} | Sem ${course.semesterTargets.join(", ")} | Sec ${course.sectionTargets.join(", ")}`;
}

function getStudentCourseProgress(student, totalAssignments, totalProblems) {
  const totalItems = (totalAssignments || 0) + (totalProblems || 0);
  if (totalItems === 0) return 0;
  const completedAssig = student.completedAssignments || 0;
  const solvedProb = student.solvedProblems || 0;
  return Math.min(100, Math.round(((completedAssig + solvedProb) / totalItems) * 100));
}

export default function CourseWorkspace({ role, session }) {
  const { courseId } = useParams();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("workbench");
  const [rosterSearch, setRosterSearch] = useState("");
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const [assignmentForm, setAssignmentForm] = useState(initialAssignmentForm);
  const [materialForm, setMaterialForm] = useState(initialMaterialForm);
  const [problemForm, setProblemForm] = useState(initialProblemForm);
  const [sampleTestCases, setSampleTestCases] = useState([{ ...blankTestCase }]);
  const [hiddenTestCases, setHiddenTestCases] = useState([{ ...blankTestCase }]);
  const [actionStatus, setActionStatus] = useState({
    success: "",
    error: ""
  });
  const [questionAddMode, setQuestionAddMode] = useState("manual"); // "manual" | "csv"
  const [manualQuestionType, setManualQuestionType] = useState("coding"); // "coding" | "mcq"
  const [mcqForm, setMcqForm] = useState({
    questionText: "",
    options: ["", "", "", ""],
    correctOptionIndex: 0,
    marks: 1,
    negativeMarks: 0
  });
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [practiceFilter, setPracticeFilter] = useState("all");

  const isAdmin = role === "admin";
  const isFaculty = role === "faculty";
  const accentButtonClass = isAdmin ? "admin-button" : "student-button";
  const accentRole = isAdmin ? "admin" : "faculty";
  const backToCoursesPath = isAdmin ? "/admin/courses" : "/faculty/courses";

  async function loadCourse() {
    setStatus((current) => ({
      ...current,
      loading: true
    }));

    try {
      const result = await apiRequest(`/courses/${courseId}`, {}, session?.token);
      setData(result.course);
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
    loadCourse();
  }, [courseId]);

  async function handleCreateAssignment(event) {
    event.preventDefault();

    try {
      await apiRequest(
        `/courses/${courseId}/assignments`,
        {
          method: "POST",
          body: JSON.stringify(assignmentForm)
        },
        session?.token
      );
      setAssignmentForm(initialAssignmentForm);
      setActionStatus({
        success: "Assignment created successfully.",
        error: ""
      });
      loadCourse();
    } catch (error) {
      setActionStatus({
        success: "",
        error: error.message
      });
    }
  }

  async function handleCreateMaterial(event) {
    event.preventDefault();

    try {
      await apiRequest(
        `/courses/${courseId}/materials`,
        {
          method: "POST",
          body: JSON.stringify(materialForm)
        },
        session?.token
      );
      setMaterialForm(initialMaterialForm);
      setActionStatus({
        success: "Study material uploaded successfully.",
        error: ""
      });
      loadCourse();
    } catch (error) {
      setActionStatus({
        success: "",
        error: error.message
      });
    }
  }

  async function handleCreateProblem(event) {
    event.preventDefault();

    try {
      const finalSampleCases = sampleTestCases
        .map((tc, index) => ({
          input_data: tc.input_data.trim(),
          expected_output: tc.expected_output.trim(),
          sort_order: index
        }))
        .filter((tc) => tc.input_data || tc.expected_output);
      const finalHiddenCases = hiddenTestCases
        .map((tc, index) => ({
          input_data: tc.input_data.trim(),
          expected_output: tc.expected_output.trim(),
          sort_order: index
        }))
        .filter((tc) => tc.input_data || tc.expected_output);

      await apiRequest(
        `/courses/${courseId}/coding-problems`,
        {
          method: "POST",
          body: JSON.stringify({
            ...problemForm,
            sampleTestCases: finalSampleCases,
            hiddenTestCases: finalHiddenCases
          })
        },
        session?.token
      );
      setProblemForm(initialProblemForm);
      setSampleTestCases([{ ...blankTestCase }]);
      setHiddenTestCases([{ ...blankTestCase }]);
      setActionStatus({
        success: "Coding problem added to the course successfully.",
        error: ""
      });
      loadCourse();
    } catch (error) {
      setActionStatus({
        success: "",
        error: error.message
      });
    }
  }

  async function handleCreateMcq(event) {
    event.preventDefault();
    if (!mcqForm.questionText.trim()) {
      setActionStatus({ success: "", error: "Question text is required." });
      return;
    }
    try {
      await apiRequest(
        `/courses/${courseId}/mcq-questions`,
        {
          method: "POST",
          body: JSON.stringify({
            questionText: mcqForm.questionText.trim(),
            options: mcqForm.options.map((opt) => opt.trim()),
            correctOptionIndex: Number(mcqForm.correctOptionIndex) || 0,
            marks: Number(mcqForm.marks) || 1,
            negativeMarks: Number(mcqForm.negativeMarks) || 0
          })
        },
        session?.token
      );
      setMcqForm({
        questionText: "",
        options: ["", "", "", ""],
        correctOptionIndex: 0,
        marks: 1,
        negativeMarks: 0
      });
      setActionStatus({
        success: "MCQ question added to course question bank successfully.",
        error: ""
      });
      loadCourse();
    } catch (error) {
      setActionStatus({
        success: "",
        error: error.message
      });
    }
  }

  async function handleBulkImportCourseQuestions(parsedQuestions) {
    setIsBulkImporting(true);
    try {
      const res = await apiRequest(
        `/courses/${courseId}/questions/bulk`,
        {
          method: "POST",
          body: JSON.stringify({ questions: parsedQuestions })
        },
        session?.token
      );
      setActionStatus({
        success: res.message || `Successfully imported ${parsedQuestions.length} questions into course!`,
        error: ""
      });
      loadCourse();
    } catch (error) {
      setActionStatus({
        success: "",
        error: error.message || "Failed to import questions."
      });
    } finally {
      setIsBulkImporting(false);
    }
  }

  const facultyActionCards = data
    ? [
        {
          title: "Assignment lane",
          metric: `${data.assignments.length} items`,
          note: "Publish, pace, and manage course work."
        },
        {
          title: "Resource lane",
          metric: `${data.materials.length} items`,
          note: "Upload notes, slides, and support material."
        },
        {
          title: "Practice lane",
          metric: `${data.codingProblems.length} items`,
          note: "Add coding work with visible and hidden cases."
        }
      ]
    : [];

  return (
    <PlatformLayout
      role={accentRole}
      eyebrow={isAdmin ? "Admin Course Workspace" : "Faculty Course Workspace"}
      title={data ? `${data.code} - ${data.title}` : "Course workspace"}
      subtitle={
        isAdmin
          ? "Review the full course setup, assign resources, and add coding questions that stay inside this course."
          : "Run day-to-day teaching from one workspace: publish tasks, share resources, manage practice, and follow student progress."
      }
      meta={isAdmin ? "Admin Managed Course" : "Faculty Delivery Hub"}
      actions={
        <Link className={`auth-button ${accentButtonClass} panel-action-button`} to={backToCoursesPath}>
          Back to courses
        </Link>
      }
      sidebarNote={
        isAdmin
          ? "Admins can configure the full course experience here, including assignments, study materials, and course-specific coding questions."
          : "Faculty access stays focused on delivery: admins control visibility and ownership, while faculty handle teaching content and learner follow-up."
      }
    >
      {status.loading ? <p className="dashboard-copy">Loading course workspace...</p> : null}
      {status.error ? <p className="form-status error">{status.error}</p> : null}
      {actionStatus.success ? <p className="form-status success">{actionStatus.success}</p> : null}
      {actionStatus.error ? <p className="form-status error">{actionStatus.error}</p> : null}

      {!status.loading && !status.error && data ? (
        <>
          <PlatformStats
            items={[
              {
                label: "Students",
                value: data.students.length,
                note: "Currently enrolled"
              },
              {
                label: "Assignments",
                value: data.assignments.length,
                note: "Published in this course"
              },
              {
                label: "Coding Problems",
                value: data.codingProblems.length,
                note: "Practice inside the course"
              }
            ]}
          />

          <div className="platform-tab-bar" style={{ marginBottom: "1.5rem" }}>
            <button
              type="button"
              className={`platform-tab ${activeTab === "workbench" ? "active" : ""}`}
              onClick={() => setActiveTab("workbench")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Course Workbench
            </button>

            <button
              type="button"
              className={`platform-tab ${activeTab === "roster" ? "active" : ""}`}
              onClick={() => setActiveTab("roster")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Student Roster & Progress ({data.students.length})
            </button>
          </div>

          {activeTab === "roster" ? (
            <PlatformSection label="Roster & Progress" title="Enrolled students & course completion metrics">
              <div className="filter-bar" style={{ marginBottom: "1.25rem" }}>
                <input
                  aria-label="Search student roster"
                  className="filter-input"
                  placeholder="Search student by name, roll number, email, or section..."
                  type="search"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                />
              </div>

              {data.students.length === 0 ? (
                <p className="dashboard-copy">No students enrolled in this course yet.</p>
              ) : null}

              {data.students.length > 0 ? (
                <div className="question-list">
                  {data.students
                    .filter((s) => {
                      if (!rosterSearch.trim()) return true;
                      const q = rosterSearch.toLowerCase();
                      return (
                        s.fullName?.toLowerCase().includes(q) ||
                        s.email?.toLowerCase().includes(q) ||
                        s.rollNumber?.toLowerCase().includes(q) ||
                        s.section?.toLowerCase().includes(q) ||
                        s.branch?.toLowerCase().includes(q)
                      );
                    })
                    .map((student) => {
                      const progressPct = getStudentCourseProgress(student, data.assignments.length, data.codingProblems.length);

                      return (
                        <article className="question-card student-roster-progress-card" key={student.id}>
                          <div className="question-card-top">
                            <span className="difficulty-pill easy">
                              {student.rollNumber && student.rollNumber !== "-" ? `Roll: ${student.rollNumber}` : "Student"}
                            </span>
                            <span className="question-meta">
                              {student.branch} | Sem {student.semester} | Sec {student.section}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "8px 0" }}>
                            <div className="sidebar-profile-avatar" style={{ width: "38px", height: "38px", fontSize: "14px" }}>
                              {student.fullName ? student.fullName.slice(0, 2).toUpperCase() : "ST"}
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{student.fullName}</h3>
                              <p className="question-meta" style={{ margin: 0 }}>{student.email}</p>
                            </div>
                          </div>

                          <div className="course-progress-block" style={{ margin: "1rem 0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                              <span>Course Completion</span>
                              <span style={{ color: progressPct > 70 ? "#16a34a" : progressPct > 35 ? "#0284c7" : "#d97706" }}>
                                {progressPct}% Completed
                              </span>
                            </div>
                            <div className="progress-meter" style={{ height: "10px", background: "rgba(148, 163, 184, 0.15)" }}>
                              <div
                                className="progress-meter-fill"
                                style={{
                                  width: `${progressPct}%`,
                                  background: progressPct > 70 ? "linear-gradient(90deg, #22c55e, #16a34a)" : progressPct > 35 ? "linear-gradient(90deg, #38bdf8, #0284c7)" : "linear-gradient(90deg, #fbbf24, #d97706)",
                                  height: "100%",
                                  borderRadius: "6px"
                                }}
                              />
                            </div>
                            <div className="stats-inline" style={{ marginTop: "8px", fontSize: "0.8rem", color: "#64748b" }}>
                              <span>Assignments: {student.completedAssignments || 0} / {data.assignments.length}</span>
                              <span>Coding Problems: {student.solvedProblems || 0} / {data.codingProblems.length}</span>
                            </div>
                          </div>

                          <div className="compact-action-row">
                            <Link className="compact-btn compact-btn-primary" to={`/${accentRole}/students/${student.id}/submissions`}>
                              Open Student Progress →
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                </div>
              ) : null}
            </PlatformSection>
          ) : (
            <>
              {isFaculty ? (
                <PlatformSection label="Course Studio" title="Teaching workbench for this course">
                  <div className="faculty-workbench">
                    <article className="faculty-workbench-main">
                      <span className="faculty-feature-label">Active course</span>
                      <h3>{data.code}</h3>
                      <p>{data.title}</p>
                      <div className="faculty-chip-row">
                        <span className="tag-pill">{getAudienceLabel(data)}</span>
                        <span className="tag-pill">Batch {data.batchTargets.join(", ")}</span>
                        <span className="tag-pill">{data.students.length} students</span>
                      </div>
                    </article>
                    <article className="faculty-workbench-side">
                      <strong>Assigned faculty</strong>
                      <p>{data.faculty.map((member) => member.fullName).join(", ") || "No faculty assigned"}</p>
                      <strong>Purpose</strong>
                      <p>Use this page to build, update, and manage the learning experience for this one course.</p>
                    </article>
                  </div>
                  <div className="faculty-feature-grid">
                    {facultyActionCards.map((card) => (
                      <article className="faculty-mini-panel" key={card.title}>
                        <strong>{card.title}</strong>
                        <span className="faculty-mini-metric">{card.metric}</span>
                        <p>{card.note}</p>
                      </article>
                    ))}
                  </div>
                </PlatformSection>
              ) : null}

              <PlatformSection label="Course Brief" title={isFaculty ? "Course context for publishing" : "Complete course details"}>
                <div className="history-list">
                  <article className="history-card faculty-overview-card">
                    <strong>Course description</strong>
                    <p>{data.description || "No description added yet."}</p>
                    <div className="faculty-chip-row">
                      <span className="tag-pill">{data.branchTargets.join(", ")}</span>
                      <span className="tag-pill">Sem {data.semesterTargets.join(", ")}</span>
                      <span className="tag-pill">Sec {data.sectionTargets.join(", ")}</span>
                      <span className="tag-pill">Batch {data.batchTargets.join(", ")}</span>
                    </div>
                    <p className="question-meta">
                      Faculty: {data.faculty.map((member) => member.fullName).join(", ") || "No faculty assigned"}
                    </p>
                  </article>
                </div>
              </PlatformSection>

              <PlatformSection label="Roster" title={isFaculty ? "Student list for this course" : "Enrolled students"}>
                {data.students.length === 0 ? <p className="dashboard-copy">No students enrolled yet.</p> : null}
                {data.students.length > 0 ? (
                  <div className="table-shell">
                    <table className="course-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Roll No.</th>
                          <th>Email</th>
                          <th>Course Progress</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.students.map((student) => {
                          const progressPct = getStudentCourseProgress(student, data.assignments.length, data.codingProblems.length);

                          return (
                            <tr key={student.id}>
                              <td><strong>{student.fullName}</strong></td>
                              <td>{student.rollNumber || "-"}</td>
                              <td>{student.email}</td>
                              <td>
                                <div style={{ minWidth: "140px" }}>
                                  <div style={{ fontSize: "0.8rem", fontWeight: "600", color: progressPct > 70 ? "#16a34a" : "#0284c7" }}>
                                    {progressPct}% Completed
                                  </div>
                                  <div className="progress-meter" style={{ height: "6px", marginTop: "2px" }}>
                                    <div className="progress-meter-fill" style={{ width: `${progressPct}%`, background: progressPct > 70 ? "#16a34a" : "#0284c7" }} />
                                  </div>
                                </div>
                              </td>
                              <td>
                                <Link className={`auth-button ${accentButtonClass} detail-link`} to={`/${accentRole}/students/${student.id}/submissions`}>
                                  Open Student Progress →
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </PlatformSection>

          <PlatformSection label="Assignments" title={isFaculty ? "Assignment stream" : "Current assignment list"}>
            {data.assignments.length === 0 ? <p className="dashboard-copy">No assignments published yet.</p> : null}
            {data.assignments.length > 0 ? (
              <div className="history-list">
                {data.assignments.map((assignment) => (
                  <article className="history-card faculty-list-card" key={assignment.id}>
                    <div className="question-card-top">
                      <span className="difficulty-pill medium">{assignment.type}</span>
                      <span className="question-meta">Max score {assignment.maxScore}</span>
                    </div>
                    <strong>{assignment.title}</strong>
                    <p>{assignment.description || "No assignment description provided."}</p>
                    <p className="question-meta">Due {formatDateTime(assignment.dueDate)}</p>
                    <Link className={`auth-button ${accentButtonClass} detail-link`} style={{ marginTop: "1rem", display: "inline-block" }} to={`/${accentRole}/courses/${courseId}/assignments/${assignment.id}/records`}>
                      View Student Submissions
                    </Link>
                  </article>
                ))}
              </div>
            ) : null}
          </PlatformSection>

          <PlatformSection label="Resources" title={isFaculty ? "Resource shelf" : "Uploaded resources"}>
            {data.materials.length === 0 ? <p className="dashboard-copy">No study material uploaded yet.</p> : null}
            {data.materials.length > 0 ? (
              <div className="history-list">
                {data.materials.map((material) => (
                  <article className="history-card faculty-list-card" key={material.id}>
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
            ) : null}
          </PlatformSection>

          <PlatformSection label="Practice" title={isFaculty ? "Course question bank & practice studio" : "Course question bank"}>
            {/* Filter pills */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`platform-tab ${practiceFilter === "all" ? "active" : ""}`}
                style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}
                onClick={() => setPracticeFilter("all")}
              >
                All Questions ({(data.codingProblems?.length || 0) + (data.mcqQuestions?.length || 0)})
              </button>
              <button
                type="button"
                className={`platform-tab ${practiceFilter === "coding" ? "active" : ""}`}
                style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}
                onClick={() => setPracticeFilter("coding")}
              >
                💻 Coding Problems ({data.codingProblems?.length || 0})
              </button>
              <button
                type="button"
                className={`platform-tab ${practiceFilter === "mcq" ? "active" : ""}`}
                style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}
                onClick={() => setPracticeFilter("mcq")}
              >
                🔘 MCQs ({data.mcqQuestions?.length || 0})
              </button>
            </div>

            {(!data.codingProblems || data.codingProblems.length === 0) && (!data.mcqQuestions || data.mcqQuestions.length === 0) ? (
              <p className="dashboard-copy">No course questions yet. Use the Add Question section below to add questions manually or import via CSV.</p>
            ) : null}

            <div className="history-list">
              {/* Coding Problems */}
              {(practiceFilter === "all" || practiceFilter === "coding") &&
                data.codingProblems?.map((problem) => (
                  <article className="history-card faculty-list-card" key={problem.id}>
                    <div className="question-card-top">
                      <span className={`difficulty-pill ${problem.difficulty}`}>{problem.difficulty}</span>
                      <span style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 700 }}>
                        CODING
                      </span>
                    </div>
                    <strong>{problem.title}</strong>
                    <p>{problem.statement}</p>
                    {problem.input_format ? <p className="question-meta">Input: {problem.input_format}</p> : null}
                    {problem.output_format ? <p className="question-meta">Output: {problem.output_format}</p> : null}
                    <p className="question-meta">
                      Sample cases: {problem.sampleTestCases?.length || 0}
                      {isAdmin || isFaculty ? ` | Hidden cases: ${problem.hiddenTestCases?.length || 0}` : ""}
                    </p>
                    <Link className={`auth-button ${accentButtonClass} detail-link`} to={`/${accentRole}/courses/${courseId}/problems/${problem.id}`}>
                      Open problem workspace
                    </Link>
                  </article>
                ))}

              {/* MCQ Questions */}
              {(practiceFilter === "all" || practiceFilter === "mcq") &&
                data.mcqQuestions?.map((mcq, idx) => (
                  <article className="history-card faculty-list-card" key={mcq.id || idx}>
                    <div className="question-card-top">
                      <span style={{ fontSize: "0.75rem", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 700 }}>
                        MCQ ({mcq.marks || 1} pts)
                      </span>
                      {mcq.negative_marks > 0 ? (
                        <span style={{ fontSize: "0.7rem", color: "#f87171" }}>
                          -{mcq.negative_marks} neg
                        </span>
                      ) : null}
                    </div>
                    <strong>{mcq.question_text}</strong>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginTop: "0.6rem" }}>
                      {(Array.isArray(mcq.options) ? mcq.options : []).map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          style={{
                            padding: "0.4rem 0.6rem",
                            borderRadius: "6px",
                            fontSize: "0.8rem",
                            background: (isAdmin || isFaculty) && mcq.correct_option_index === oIdx ? "rgba(16, 185, 129, 0.18)" : "rgba(255, 255, 255, 0.04)",
                            border: "1px solid",
                            borderColor: (isAdmin || isFaculty) && mcq.correct_option_index === oIdx ? "#10b981" : "var(--lc-border)",
                            color: (isAdmin || isFaculty) && mcq.correct_option_index === oIdx ? "#10b981" : "var(--lc-text-primary)"
                          }}
                        >
                          <strong>{String.fromCharCode(65 + oIdx)}.</strong> {opt} {(isAdmin || isFaculty) && mcq.correct_option_index === oIdx ? "✓ (Correct)" : ""}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
            </div>
          </PlatformSection>

          {isFaculty ? (
            <PlatformSection label="Teaching Actions" title="Choose the kind of course work you want to build">
              <div className="faculty-builder-grid">
                <article className="faculty-focus-item">
                  <strong>Build an assignment</strong>
                  <p>Create the next classroom task with due dates, score limits, and instructions for this course only.</p>
                </article>
                <article className="faculty-focus-item">
                  <strong>Add teaching material</strong>
                  <p>Upload support content students can open immediately while studying this subject.</p>
                </article>
                <article className="faculty-focus-item">
                  <strong>Create coding practice</strong>
                  <p>Write course-specific problems with sample cases for learning and hidden cases for evaluation.</p>
                </article>
              </div>
            </PlatformSection>
          ) : null}

          <PlatformSection label="Publish Assignment" title="Create a new assignment">
            <div style={{ padding: "1rem 0" }}>
              <p style={{ marginBottom: "1rem" }}>Assignments can now include multiple-choice questions and coding problems. Use the builder to construct your assignment.</p>
              <Link to={`/${accentRole}/courses/${courseId}/assignments/new`} className={`auth-button ${accentButtonClass}`} style={{ display: "inline-block" }}>
                Open Assignment Builder
              </Link>
            </div>
          </PlatformSection>

          <PlatformSection label="Study Material" title="Upload notes or references">
            <form className="auth-form course-form-grid" onSubmit={handleCreateMaterial}>
              <input
                placeholder="Material title"
                value={materialForm.title}
                onChange={(event) => setMaterialForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
              <select
                value={materialForm.type}
                onChange={(event) => setMaterialForm((current) => ({ ...current, type: event.target.value }))}
              >
                <option value="notes">Notes</option>
                <option value="slides">Slides</option>
                <option value="video">Video</option>
                <option value="link">Link</option>
                <option value="document">Document</option>
              </select>
              <input
                placeholder="https://resource-link"
                value={materialForm.url}
                onChange={(event) => setMaterialForm((current) => ({ ...current, url: event.target.value }))}
                required
              />
              <textarea
                rows="4"
                placeholder="Material description"
                value={materialForm.description}
                onChange={(event) => setMaterialForm((current) => ({ ...current, description: event.target.value }))}
              />
              <button className={`auth-button ${accentButtonClass}`} type="submit">
                Upload material
              </button>
            </form>
          </PlatformSection>

          <PlatformSection label="Add Question" title="Add questions to this course">
            {/* Mode Switcher: Manual vs CSV */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
              marginBottom: "1.25rem",
              background: "rgba(255, 255, 255, 0.04)",
              padding: "0.35rem",
              borderRadius: "10px",
              border: "1px solid var(--lc-border)"
            }}>
              <button
                type="button"
                onClick={() => setQuestionAddMode("manual")}
                style={{
                  padding: "0.55rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "none",
                  background: questionAddMode === "manual" ? "var(--lc-accent, #ff7e29)" : "transparent",
                  color: questionAddMode === "manual" ? "#fff" : "var(--lc-text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.45rem",
                  transition: "all 0.15s ease"
                }}
              >
                <span>✍️</span>
                <span>Add Question Manually</span>
              </button>
              <button
                type="button"
                onClick={() => setQuestionAddMode("csv")}
                style={{
                  padding: "0.55rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "none",
                  background: questionAddMode === "csv" ? "var(--lc-accent, #ff7e29)" : "transparent",
                  color: questionAddMode === "csv" ? "#fff" : "var(--lc-text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.45rem",
                  transition: "all 0.15s ease"
                }}
              >
                <span>📄</span>
                <span>Import via CSV File</span>
              </button>
            </div>

            {/* CSV Import Mode */}
            {questionAddMode === "csv" ? (
              <CsvQuestionImporter
                onImport={handleBulkImportCourseQuestions}
                targetLabel={data.title || "Course"}
                isSubmitting={isBulkImporting}
                allowedTypes="all"
              />
            ) : (
              /* Manual Mode */
              <div>
                {/* Manual Question Type Selector: Coding Problem vs MCQ */}
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <button
                    type="button"
                    onClick={() => setManualQuestionType("coding")}
                    style={{
                      flex: 1,
                      padding: "0.6rem",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: manualQuestionType === "coding" ? "#10b981" : "var(--lc-border)",
                      background: manualQuestionType === "coding" ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.03)",
                      color: manualQuestionType === "coding" ? "#10b981" : "var(--lc-text-muted)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem"
                    }}
                  >
                    <span>💻 Coding Problem</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualQuestionType("mcq")}
                    style={{
                      flex: 1,
                      padding: "0.6rem",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: manualQuestionType === "mcq" ? "#38bdf8" : "var(--lc-border)",
                      background: manualQuestionType === "mcq" ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.03)",
                      color: manualQuestionType === "mcq" ? "#38bdf8" : "var(--lc-text-muted)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem"
                    }}
                  >
                    <span>🔘 Multiple Choice (MCQ)</span>
                  </button>
                </div>

                {manualQuestionType === "coding" ? (
                  <form className="auth-form course-form-grid" onSubmit={handleCreateProblem}>
                    <input
                      placeholder="Problem title"
                      value={problemForm.title}
                      onChange={(event) => setProblemForm((current) => ({ ...current, title: event.target.value }))}
                      required
                    />
                    <select
                      value={problemForm.difficulty}
                      onChange={(event) => setProblemForm((current) => ({ ...current, difficulty: event.target.value }))}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    <textarea
                      rows="6"
                      placeholder="Problem statement"
                      value={problemForm.statement}
                      onChange={(event) => setProblemForm((current) => ({ ...current, statement: event.target.value }))}
                      required
                    />
                    <textarea
                      rows="4"
                      placeholder="Input format"
                      value={problemForm.inputFormat}
                      onChange={(event) => setProblemForm((current) => ({ ...current, inputFormat: event.target.value }))}
                    />
                    <textarea
                      rows="4"
                      placeholder="Output format"
                      value={problemForm.outputFormat}
                      onChange={(event) => setProblemForm((current) => ({ ...current, outputFormat: event.target.value }))}
                    />
                    <textarea
                      rows="4"
                      placeholder="Constraints"
                      value={problemForm.constraintsText}
                      onChange={(event) => setProblemForm((current) => ({ ...current, constraintsText: event.target.value }))}
                    />
                    <textarea
                      rows="4"
                      placeholder="Examples or walkthrough"
                      value={problemForm.examplesText}
                      onChange={(event) => setProblemForm((current) => ({ ...current, examplesText: event.target.value }))}
                    />

                    <div className="history-card">
                      <strong>Sample Test Cases</strong>
                      <p className="question-meta">These are visible to students and used by the Run Code action.</p>
                      {sampleTestCases.map((testCase, index) => (
                        <div className="course-test-case-grid" key={`sample-${index}`}>
                          <textarea
                            rows="4"
                            placeholder={`Sample input #${index + 1}`}
                            value={testCase.input_data}
                            onChange={(event) =>
                              setSampleTestCases((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, input_data: event.target.value } : entry
                                )
                              )
                            }
                          />
                          <textarea
                            rows="4"
                            placeholder={`Expected output #${index + 1}`}
                            value={testCase.expected_output}
                            onChange={(event) =>
                              setSampleTestCases((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, expected_output: event.target.value } : entry
                                )
                              )
                            }
                          />
                          {sampleTestCases.length > 1 ? (
                            <button
                              className={`auth-button ${accentButtonClass}`}
                              type="button"
                              onClick={() => setSampleTestCases((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                            >
                              Remove sample
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <button
                        className={`auth-button ${accentButtonClass}`}
                        type="button"
                        onClick={() => setSampleTestCases((current) => [...current, { ...blankTestCase }])}
                      >
                        Add sample test case
                      </button>
                    </div>

                    <div className="history-card">
                      <strong>Hidden Test Cases</strong>
                      <p className="question-meta">These are checked during final submission and are not shown to students.</p>
                      {hiddenTestCases.map((testCase, index) => (
                        <div className="course-test-case-grid" key={`hidden-${index}`}>
                          <textarea
                            rows="4"
                            placeholder={`Hidden input #${index + 1}`}
                            value={testCase.input_data}
                            onChange={(event) =>
                              setHiddenTestCases((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, input_data: event.target.value } : entry
                                )
                              )
                            }
                          />
                          <textarea
                            rows="4"
                            placeholder={`Expected output #${index + 1}`}
                            value={testCase.expected_output}
                            onChange={(event) =>
                              setHiddenTestCases((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, expected_output: event.target.value } : entry
                                )
                              )
                            }
                          />
                          {hiddenTestCases.length > 1 ? (
                            <button
                              className={`auth-button ${accentButtonClass}`}
                              type="button"
                              onClick={() => setHiddenTestCases((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                            >
                              Remove hidden
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <button
                        className={`auth-button ${accentButtonClass}`}
                        type="button"
                        onClick={() => setHiddenTestCases((current) => [...current, { ...blankTestCase }])}
                      >
                        Add hidden test case
                      </button>
                    </div>

                    <button className={`auth-button ${accentButtonClass}`} type="submit">
                      Add coding question
                    </button>
                  </form>
                ) : (
                  <form className="auth-form course-form-grid" onSubmit={handleCreateMcq}>
                    <textarea
                      rows="4"
                      placeholder="MCQ Question Prompt / Statement"
                      value={mcqForm.questionText}
                      onChange={(e) => setMcqForm({ ...mcqForm, questionText: e.target.value })}
                      required
                    />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label className="auth-label" style={{ fontSize: "0.8rem" }}>Marks</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={mcqForm.marks}
                          onChange={(e) => setMcqForm({ ...mcqForm, marks: Number(e.target.value) })}
                          required
                        />
                      </div>
                      <div>
                        <label className="auth-label" style={{ fontSize: "0.8rem" }}>Negative Marks</label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={mcqForm.negativeMarks}
                          onChange={(e) => setMcqForm({ ...mcqForm, negativeMarks: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="history-card" style={{ gridColumn: "1 / -1" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <strong>Options (Select the correct answer)</strong>
                        <button
                          type="button"
                          className={`auth-button ${accentButtonClass}`}
                          style={{ padding: "0.3rem 0.7rem", fontSize: "0.75rem" }}
                          onClick={() => setMcqForm({ ...mcqForm, options: [...mcqForm.options, ""] })}
                        >
                          + Add Option
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        {mcqForm.options.map((opt, oIdx) => (
                          <div key={oIdx} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", minWidth: "90px", fontWeight: 700 }}>
                              <input
                                type="radio"
                                name="courseMcqCorrect"
                                checked={mcqForm.correctOptionIndex === oIdx}
                                onChange={() => setMcqForm({ ...mcqForm, correctOptionIndex: oIdx })}
                                style={{ accentColor: "#10b981", cursor: "pointer" }}
                              />
                              <span>{String.fromCharCode(65 + oIdx)} {mcqForm.correctOptionIndex === oIdx ? "✓" : ""}</span>
                            </label>
                            <input
                              type="text"
                              placeholder={`Option ${String.fromCharCode(65 + oIdx)} text`}
                              value={opt}
                              onChange={(e) => {
                                const next = [...mcqForm.options];
                                next[oIdx] = e.target.value;
                                setMcqForm({ ...mcqForm, options: next });
                              }}
                              required
                              style={{ margin: 0, flex: 1 }}
                            />
                            {mcqForm.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = mcqForm.options.filter((_, idx) => idx !== oIdx);
                                  const nextCorrect = mcqForm.correctOptionIndex >= next.length ? 0 : mcqForm.correctOptionIndex;
                                  setMcqForm({ ...mcqForm, options: next, correctOptionIndex: nextCorrect });
                                }}
                                style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "none", borderRadius: "6px", padding: "0.5rem 0.7rem", cursor: "pointer" }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <button className={`auth-button ${accentButtonClass}`} type="submit">
                      Add MCQ Question to Course Bank
                    </button>
                  </form>
                )}
              </div>
            )}
          </PlatformSection>
            </>
          )}
        </>
      ) : null}
    </PlatformLayout>
  );
}
