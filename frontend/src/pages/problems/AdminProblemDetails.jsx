import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout/PlatformLayout";
import { getAdminSession, getAuthHeaders } from "../../utils/session";


const apiBaseUrl = import.meta.env.VITE_API_URL || "https://codexa-project.onrender.com/api";
const blankTestCase = {
  input_data: "",
  expected_output: ""
};

function buildForm(problem) {
  return {
    title: problem.title,
    difficulty: problem.difficulty,
    statement: problem.statement,
    inputFormat: problem.input_format || "",
    outputFormat: problem.output_format || "",
    constraintsText: problem.constraints_text || "",
    examplesText: problem.examples_text || "",
    targetBranch: problem.target_branch || "ALL",
    targetSemester: problem.target_semester || "ALL",
    targetBatch: problem.target_batch || "ALL",
    allowFacultyEdit: problem.allow_faculty_edit !== false,
    tagsText: (problem.tags || []).join(", ")
  };
}

function buildEditableTestCases(testCases) {
  return testCases?.length ? testCases.map((testCase) => ({ ...testCase })) : [{ ...blankTestCase }];
}

export default function AdminProblemDetails() {
  const navigate = useNavigate();
  const { problemId } = useParams();
  const session = getAdminSession();
  const [problem, setProblem] = useState(null);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const [form, setForm] = useState({
    title: "",
    difficulty: "easy",
    statement: "",
    inputFormat: "",
    outputFormat: "",
    constraintsText: "",
    examplesText: "",
    targetBranch: "ALL",
    targetSemester: "ALL",
    targetBatch: "ALL",
    allowFacultyEdit: true,
    tagsText: "",
    sampleInput: "",
    sampleOutput: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [sampleTestCases, setSampleTestCases] = useState([{ ...blankTestCase }]);
  const [hiddenTestCases, setHiddenTestCases] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadProblem() {
      try {
        const response = await fetch(`${apiBaseUrl}/problems/${problemId}`, {
          headers: {
            ...getAuthHeaders(session?.token)
          }
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load coding question.");
        }

        if (isMounted) {
          setProblem(data);
          setForm(buildForm(data));
          setSampleTestCases(buildEditableTestCases(data.sample_test_cases));
          setHiddenTestCases(data.hidden_test_cases || []);
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

    loadProblem();

    return () => {
      isMounted = false;
    };
  }, [problemId, session?.token]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    setActionMessage("");
    setStatus((currentStatus) => ({
      ...currentStatus,
      error: ""
    }));

    const tags = form.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
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

    try {
      const response = await fetch(`${apiBaseUrl}/problems/${problemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify({
          title: form.title,
          difficulty: form.difficulty,
          statement: form.statement,
          inputFormat: form.inputFormat,
          outputFormat: form.outputFormat,
          constraintsText: form.constraintsText,
          examplesText: form.examplesText,
          targetBranch: form.targetBranch,
          targetSemester: form.targetSemester,
          targetBatch: form.targetBatch,
          allowFacultyEdit: form.allowFacultyEdit,
          tags,
          sampleTestCases: finalSampleCases,
          hiddenTestCases: finalHiddenCases
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update coding question.");
      }

      setProblem(data.problem);
      setForm(buildForm(data.problem));
      setSampleTestCases(buildEditableTestCases(data.problem.sample_test_cases));
      setHiddenTestCases(data.problem.hidden_test_cases || []);
      setIsEditing(false);
      setActionMessage(data.message);
    } catch (error) {
      setStatus((currentStatus) => ({
        ...currentStatus,
        error: error.message
      }));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Delete this coding question permanently?");

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setActionMessage("");
    setStatus((currentStatus) => ({
      ...currentStatus,
      error: ""
    }));

    try {
      const response = await fetch(`${apiBaseUrl}/problems/${problemId}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeaders(session?.token)
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete coding question.");
      }

      navigate("/admin/problems");
    } catch (error) {
      setStatus((currentStatus) => ({
        ...currentStatus,
        error: error.message
      }));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <PlatformLayout
      role="admin"
      eyebrow="Problem Review"
      title={problem ? problem.title : "Admin question view"}
      subtitle="Inspect the prompt like a content QA pass, then edit metadata, examples, and requirements when the problem needs improvement."
      meta={problem ? problem.difficulty : "Problem"}
      sidebarNote="Use this screen as a quality-review surface for the problem bank. Validate the student-facing experience before editing or deleting the prompt."
    >
      {status.loading ? <h1>Loading question...</h1> : null}
      {status.error ? <p className="form-status error">{status.error}</p> : null}
      {!session?.token ? <p className="form-status error">Log in as an admin to edit questions.</p> : null}

      {problem ? (
        <>
          <PlatformStats
            items={[
              { label: "Difficulty", value: problem.difficulty, note: "Current assigned level" },
              { label: "Tags", value: (problem.tags || []).length, note: "Topics on the prompt" },
              { label: "Sample cases", value: problem.sample_test_cases?.length || 0, note: "Public examples" }
            ]}
          />

          <PlatformSection
            label="Question View"
            title={isEditing ? "Edit the problem" : "Problem details"}
            actions={
              problem && !isEditing ? (
                <>
                  <Link
                    className="auth-button ghost-button detail-link"
                    to={`/admin/problems/${problem.id}/solve`}
                    style={{ background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.4)", color: "#c6f6d5" }}
                  >
                    Solve problem
                  </Link>
                  <button
                    className="auth-button admin-button detail-link"
                    type="button"
                    onClick={() => setIsEditing(true)}
                    disabled={!session?.token}
                  >
                    Edit question
                  </button>
                  <button
                    className="auth-button danger-button detail-link"
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting || !session?.token}
                  >
                    {isDeleting ? "Deleting..." : "Delete question"}
                  </button>
                </>
              ) : null
            }
          >
            {!isEditing ? (
              <>
                <div className="detail-hero">
                  <span className={`difficulty-pill ${problem.difficulty}`}>{problem.difficulty}</span>
                  <span className="question-meta">
                    Added {new Date(problem.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Target Audience & Permission Badges */}
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", margin: "1rem 0" }}>
                  <span className="role-badge-tag" style={{ background: "rgba(14, 165, 233, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                    🎯 Branch: {problem.target_branch || "ALL"}
                  </span>
                  <span className="role-badge-tag" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "1px solid rgba(192, 132, 252, 0.3)" }}>
                    🎓 Semester: {problem.target_semester === "ALL" ? "All Semesters" : `Sem ${problem.target_semester}`}
                  </span>
                  <span className="role-badge-tag" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(74, 222, 128, 0.3)" }}>
                    📅 Batch: {problem.target_batch || "ALL"}
                  </span>
                  <span className="role-badge-tag" style={{ background: problem.allow_faculty_edit ? "rgba(234, 179, 8, 0.15)" : "rgba(239, 68, 68, 0.15)", color: problem.allow_faculty_edit ? "#fde047" : "#f87171", border: problem.allow_faculty_edit ? "1px solid rgba(234, 179, 8, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)" }}>
                    {problem.allow_faculty_edit ? "✏️ Faculty Editable" : "🔒 Admin Only"}
                  </span>
                </div>

                <p className="detail-copy">
                  Review how students will see this prompt and confirm the question quality before
                  sharing more tasks.
                </p>

                <div className="detail-grid">
                  <article className="detail-block">
                    <h2>Problem Statement</h2>
                    <p>{problem.statement}</p>
                    <div className="pill-row">
                      {(problem.tags || []).map((tag) => (
                        <span className="tag-pill" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </article>

                  <article className="detail-block">
                    <h2>Sample Test Cases</h2>
                    {problem.sample_test_cases?.length ? (
                      <div className="sample-case-list">
                        {problem.sample_test_cases.map((testCase, index) => (
                          <article className="sample-case-card" key={testCase.id || index}>
                            <strong>Sample {index + 1}</strong>
                            <p className="history-snippet">{testCase.input_data}</p>
                            <strong>Expected output</strong>
                            <p className="history-snippet">{testCase.expected_output}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p>No sample test cases added yet.</p>
                    )}
                  </article>
                </div>

                <div className="detail-grid" style={{ marginTop: "1rem" }}>
                  <article className="detail-block" style={{ gridColumn: "span 2" }}>
                    <h2>Hidden Test Cases (Admin Only)</h2>
                    {problem.hidden_test_cases?.length ? (
                      <div className="sample-case-list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
                        {problem.hidden_test_cases.map((testCase, index) => (
                          <article className="sample-case-card" key={testCase.id || index} style={{ border: "1px solid rgba(251, 146, 60, 0.2)" }}>
                            <strong>Hidden Case {index + 1}</strong>
                            <p className="history-snippet">{testCase.input_data}</p>
                            <strong>Expected output</strong>
                            <p className="history-snippet">{testCase.expected_output}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p>No hidden test cases added yet.</p>
                    )}
                  </article>
                </div>

                <div className="detail-grid">
                  <article className="detail-block">
                    <h2>Input format</h2>
                    <p>{problem.input_format || "Not provided yet."}</p>
                  </article>

                  <article className="detail-block">
                    <h2>Output format</h2>
                    <p>{problem.output_format || "Not provided yet."}</p>
                  </article>
                </div>

                <div className="detail-grid">
                  <article className="detail-block">
                    <h2>Constraints</h2>
                    <p>{problem.constraints_text || "Not provided yet."}</p>
                  </article>

                  <article className="detail-block">
                    <h2>Examples</h2>
                    <p>{problem.examples_text || "Not provided yet."}</p>
                  </article>
                </div>
              </>
            ) : (
              <form className="auth-form edit-problem-form" onSubmit={handleSave}>
                <label className="form-field" htmlFor="title">
                  Question title
                </label>
                <input id="title" name="title" type="text" value={form.title} onChange={handleChange} required />

                <label className="form-field" htmlFor="difficulty">
                  Difficulty
                </label>
                <select id="difficulty" name="difficulty" value={form.difficulty} onChange={handleChange}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>

                <label className="form-field" htmlFor="tagsText">
                  Tags
                </label>
                <input
                  id="tagsText"
                  name="tagsText"
                  type="text"
                  value={form.tagsText}
                  onChange={handleChange}
                  placeholder="array, strings, sorting"
                />

                <div style={{ margin: "1.5rem 0 1rem", borderTop: "1px solid rgba(148, 163, 184, 0.12)", paddingTop: "1rem" }}>
                  <h3 style={{ fontSize: "1.05rem", margin: "0 0 0.25rem 0" }}>🎯 Target Audience & Permissions</h3>
                  <p className="detail-copy" style={{ marginTop: 0, fontSize: "0.85rem" }}>
                    Restrict visibility by student cohort and control whether faculty instructors are permitted to edit this problem.
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                    <div>
                      <label className="form-field" htmlFor="targetBranch">Target Branch</label>
                      <select id="targetBranch" name="targetBranch" value={form.targetBranch} onChange={handleChange} className="filter-select" style={{ width: "100%" }}>
                        <option value="ALL">🌐 All Branches</option>
                        <option value="CSE">CSE</option>
                        <option value="IT">IT</option>
                        <option value="ECE">ECE</option>
                        <option value="ME">ME</option>
                        <option value="CE">CE</option>
                        <option value="EE">EE</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-field" htmlFor="targetSemester">Target Semester</label>
                      <select id="targetSemester" name="targetSemester" value={form.targetSemester} onChange={handleChange} className="filter-select" style={{ width: "100%" }}>
                        <option value="ALL">🌐 All Semesters</option>
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                        <option value="3">Semester 3</option>
                        <option value="4">Semester 4</option>
                        <option value="5">Semester 5</option>
                        <option value="6">Semester 6</option>
                        <option value="7">Semester 7</option>
                        <option value="8">Semester 8</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-field" htmlFor="targetBatch">Target Batch</label>
                      <select id="targetBatch" name="targetBatch" value={form.targetBatch} onChange={handleChange} className="filter-select" style={{ width: "100%" }}>
                        <option value="ALL">🌐 All Batches</option>
                        <option value="2023-2027">Batch 2023-2027</option>
                        <option value="2024-2028">Batch 2024-2028</option>
                        <option value="2025-2029">Batch 2025-2029</option>
                        <option value="2026-2030">Batch 2026-2030</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: "1.2rem", background: "rgba(255, 255, 255, 0.03)", padding: "0.85rem 1.1rem", borderRadius: "12px", border: "1px solid rgba(148, 163, 184, 0.15)" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
                      <input
                        type="checkbox"
                        name="allowFacultyEdit"
                        checked={form.allowFacultyEdit}
                        onChange={handleChange}
                        style={{ width: "18px", height: "18px", accentColor: "#0284c7", cursor: "pointer" }}
                      />
                      <span>Allow Faculty Instructors to edit or modify this question</span>
                    </label>
                    <p style={{ margin: "0.3rem 0 0 2rem", fontSize: "0.8rem", color: "#94a3b8" }}>
                      If unchecked, only Platform Administrators will be allowed to modify or delete this practice question.
                    </p>
                  </div>
                </div>

                <label className="form-field" htmlFor="statement">
                  Problem statement
                </label>
                <textarea id="statement" name="statement" rows="7" value={form.statement} onChange={handleChange} required />

                <label className="form-field" htmlFor="inputFormat">
                  Input format
                </label>
                <textarea id="inputFormat" name="inputFormat" rows="4" value={form.inputFormat} onChange={handleChange} />

                <label className="form-field" htmlFor="outputFormat">
                  Output format
                </label>
                <textarea id="outputFormat" name="outputFormat" rows="4" value={form.outputFormat} onChange={handleChange} />

                <label className="form-field" htmlFor="constraintsText">
                  Constraints
                </label>
                <textarea
                  id="constraintsText"
                  name="constraintsText"
                  rows="4"
                  value={form.constraintsText}
                  onChange={handleChange}
                />

                <label className="form-field" htmlFor="examplesText">
                  Examples
                </label>
                <textarea
                  id="examplesText"
                  name="examplesText"
                  rows="5"
                  value={form.examplesText}
                  onChange={handleChange}
                />

                <div style={{ margin: "2rem 0 1rem", borderTop: "1px solid rgba(148, 163, 184, 0.12)", paddingTop: "1rem" }} />
                <h3>Sample Test Cases</h3>
                <p className="detail-copy" style={{ marginTop: 0 }}>
                  These public examples are visible to students in the problem statement.
                </p>

                {sampleTestCases.map((tc, index) => (
                  <div key={index} className="detail-grid detail-grid-tight" style={{ border: "1px solid rgba(148, 163, 184, 0.16)", borderRadius: "16px", padding: "1.2rem", marginBottom: "1rem", position: "relative" }}>
                    <div style={{ position: "absolute", top: "0.8rem", right: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="platform-sidebar-label">Sample #{index + 1}</span>
                      {sampleTestCases.length > 1 ? (
                        <button
                          type="button"
                          className="auth-button danger-button"
                          style={{ margin: 0, padding: "0.25rem 0.6rem", fontSize: "0.75rem", borderRadius: "8px" }}
                          onClick={() => {
                            setSampleTestCases(sampleTestCases.filter((_, i) => i !== index));
                          }}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div style={{ marginTop: "1rem" }}>
                      <label className="form-field" htmlFor={`sample-input-${index}`}>
                        Sample input
                      </label>
                      <textarea
                        id={`sample-input-${index}`}
                        rows="5"
                        value={tc.input_data}
                        onChange={(event) => {
                          const nextCases = [...sampleTestCases];
                          nextCases[index].input_data = event.target.value;
                          setSampleTestCases(nextCases);
                        }}
                      />
                    </div>
                    <div style={{ marginTop: "1rem" }}>
                      <label className="form-field" htmlFor={`sample-output-${index}`}>
                        Sample output
                      </label>
                      <textarea
                        id={`sample-output-${index}`}
                        rows="5"
                        value={tc.expected_output}
                        onChange={(event) => {
                          const nextCases = [...sampleTestCases];
                          nextCases[index].expected_output = event.target.value;
                          setSampleTestCases(nextCases);
                        }}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="auth-button ghost-button"
                  style={{
                    marginTop: "0.5rem",
                    background: "transparent",
                    border: "1px solid rgba(148, 163, 184, 0.24)",
                    color: "#f8fafc",
                    padding: "0.6rem 1.2rem",
                    fontSize: "0.9rem",
                    borderRadius: "999px"
                  }}
                  onClick={() => {
                    setSampleTestCases([...sampleTestCases, { ...blankTestCase }]);
                  }}
                >
                  + Add Sample Test Case
                </button>

                <div style={{ margin: "2rem 0 1rem", borderTop: "1px solid rgba(148, 163, 184, 0.12)", paddingTop: "1rem" }} />
                <h3>Hidden Test Cases (Admin Only)</h3>
                <p className="detail-copy" style={{ marginTop: 0 }}>
                  These test cases are hidden from students and used to evaluate their submissions.
                </p>

                {hiddenTestCases.map((tc, index) => (
                  <div key={index} className="detail-grid detail-grid-tight" style={{ border: "1px solid rgba(148, 163, 184, 0.16)", borderRadius: "16px", padding: "1.2rem", marginBottom: "1rem", position: "relative" }}>
                    <div style={{ position: "absolute", top: "0.8rem", right: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="platform-sidebar-label">Case #{index + 1}</span>
                      {hiddenTestCases.length > 1 ? (
                        <button
                          type="button"
                          className="auth-button danger-button"
                          style={{ margin: 0, padding: "0.25rem 0.6rem", fontSize: "0.75rem", borderRadius: "8px" }}
                          onClick={() => {
                            setHiddenTestCases(hiddenTestCases.filter((_, i) => i !== index));
                          }}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div style={{ marginTop: "1rem" }}>
                      <label className="form-field" htmlFor={`hidden-input-${index}`}>
                        Hidden Input
                      </label>
                      <textarea
                        id={`hidden-input-${index}`}
                        rows="3"
                        placeholder="e.g. 7 8"
                        value={tc.input_data}
                        onChange={(e) => {
                          const newCases = [...hiddenTestCases];
                          newCases[index].input_data = e.target.value;
                          setHiddenTestCases(newCases);
                        }}
                        required
                      />
                    </div>

                    <div style={{ marginTop: "1rem" }}>
                      <label className="form-field" htmlFor={`hidden-output-${index}`}>
                        Hidden Expected Output
                      </label>
                      <textarea
                        id={`hidden-output-${index}`}
                        rows="3"
                        placeholder="e.g. 15"
                        value={tc.expected_output}
                        onChange={(e) => {
                          const newCases = [...hiddenTestCases];
                          newCases[index].expected_output = e.target.value;
                          setHiddenTestCases(newCases);
                        }}
                        required
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="auth-button ghost-button"
                  style={{
                    marginTop: "0.5rem",
                    background: "transparent",
                    border: "1px solid rgba(251, 146, 60, 0.4)",
                    color: "#f8fafc",
                    padding: "0.6rem 1.2rem",
                    fontSize: "0.9rem",
                    borderRadius: "999px"
                  }}
                  onClick={() => {
                    setHiddenTestCases([...hiddenTestCases, { input_data: "", expected_output: "" }]);
                  }}
                >
                  + Add Hidden Test Case
                </button>

                <div style={{ margin: "2rem 0 1rem" }} />

                <div className="detail-actions">
                  <button className="auth-button admin-button detail-link" type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    className="auth-button ghost-button detail-link"
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setForm(buildForm(problem));
                      setSampleTestCases(buildEditableTestCases(problem.sample_test_cases));
                      setHiddenTestCases(problem.hidden_test_cases || []);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {actionMessage ? <p className="form-status success">{actionMessage}</p> : null}

            <div className="detail-actions">
              <Link className="auth-button admin-button detail-link" to="/admin/problems">
                Back to question list
              </Link>
              <Link className="auth-button ghost-button detail-link" to="/admin/dashboard">
                Back to dashboard
              </Link>
            </div>
          </PlatformSection>
        </>
      ) : null}
    </PlatformLayout>
  );
}
