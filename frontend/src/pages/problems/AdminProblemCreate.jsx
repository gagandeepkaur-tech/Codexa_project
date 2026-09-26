import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlatformLayout, PlatformSection } from "../../components/PlatformLayout/PlatformLayout";
import { getAdminSession, getAuthHeaders } from "../../utils/session";

const apiBaseUrl = import.meta.env.VITE_API_URL || "https://codexa-project.onrender.com/api";
const initialProblemForm = {
  title: "",
  difficulty: "easy",
  statement: "",
  inputFormat: "",
  outputFormat: "",
  constraintsText: "",
  examplesText: "",
  tagsText: "",
  targetBranch: "ALL",
  targetSemester: "ALL",
  targetBatch: "ALL",
  allowFacultyEdit: true
};
const blankTestCase = {
  input_data: "",
  expected_output: ""
};

export default function AdminProblemCreate() {
  const navigate = useNavigate();
  const session = getAdminSession();
  const [problemForm, setProblemForm] = useState(initialProblemForm);
  const [sampleTestCases, setSampleTestCases] = useState([{ ...blankTestCase }]);
  const [hiddenTestCases, setHiddenTestCases] = useState([{ input_data: "", expected_output: "" }]);
  const [status, setStatus] = useState({
    message: "",
    error: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setProblemForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({
      message: "",
      error: ""
    });

    const tags = problemForm.tagsText
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
      const response = await fetch(`${apiBaseUrl}/problems`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify({
          title: problemForm.title,
          difficulty: problemForm.difficulty,
          statement: problemForm.statement,
          inputFormat: problemForm.inputFormat,
          outputFormat: problemForm.outputFormat,
          constraintsText: problemForm.constraintsText,
          examplesText: problemForm.examplesText,
          targetBranch: problemForm.targetBranch,
          targetSemester: problemForm.targetSemester,
          targetBatch: problemForm.targetBatch,
          allowFacultyEdit: problemForm.allowFacultyEdit,
          tags,
          sampleTestCases: finalSampleCases,
          hiddenTestCases: finalHiddenCases
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to add coding question.");
      }

      setStatus({
        message: data.message,
        error: ""
      });
      setProblemForm(initialProblemForm);
      setSampleTestCases([{ ...blankTestCase }]);
      setHiddenTestCases([{ input_data: "", expected_output: "" }]);

      navigate("/admin/problems", {
        state: {
          createdProblem: data.problem
        }
      });
    } catch (error) {
      setStatus({
        message: "",
        error: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PlatformLayout
      role="admin"
      eyebrow="Problem Creation"
      title="Add a new coding question"
      subtitle="Write the prompt the way you would for a real practice or assessment platform: statement, requirements, tags, and sample cases."
      meta="Authoring Mode"
      sidebarNote="This screen is your authoring studio for the problem bank. Capture the prompt clearly so students can solve it with minimal ambiguity."
    >
      <PlatformSection label="Authoring Form" title="Create a polished problem statement">
        {!session?.token ? (
          <p className="form-status error">Log in as an admin to create questions.</p>
        ) : null}

        <form className="auth-form admin-problem-form" onSubmit={handleSubmit}>
          <label className="form-field" htmlFor="title">
            Question title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            placeholder="Enter the coding question title"
            value={problemForm.title}
            onChange={handleChange}
            required
          />

          <label className="form-field" htmlFor="difficulty">
            Difficulty
          </label>
          <select
            id="difficulty"
            name="difficulty"
            value={problemForm.difficulty}
            onChange={handleChange}
          >
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
            placeholder="array, loops, greedy"
            value={problemForm.tagsText}
            onChange={handleChange}
          />

          <div style={{ margin: "1.5rem 0 1rem", borderTop: "1px solid rgba(148, 163, 184, 0.12)", paddingTop: "1rem" }}>
            <h3 style={{ fontSize: "1.05rem", margin: "0 0 0.25rem 0" }}>🎯 Target Audience & Permissions</h3>
            <p className="detail-copy" style={{ marginTop: 0, fontSize: "0.85rem" }}>
              Restrict visibility by student cohort and control whether faculty instructors are permitted to edit this problem.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
              <div>
                <label className="form-field" htmlFor="targetBranch">Target Branch</label>
                <select id="targetBranch" name="targetBranch" value={problemForm.targetBranch} onChange={handleChange} className="filter-select" style={{ width: "100%" }}>
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
                <select id="targetSemester" name="targetSemester" value={problemForm.targetSemester} onChange={handleChange} className="filter-select" style={{ width: "100%" }}>
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
                <select id="targetBatch" name="targetBatch" value={problemForm.targetBatch} onChange={handleChange} className="filter-select" style={{ width: "100%" }}>
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
                  checked={problemForm.allowFacultyEdit}
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
          <textarea
            id="statement"
            name="statement"
            placeholder="Describe the problem for students"
            value={problemForm.statement}
            onChange={handleChange}
            rows="6"
            required
          />

          <label className="form-field" htmlFor="inputFormat">
            Input format
          </label>
          <textarea
            id="inputFormat"
            name="inputFormat"
            placeholder="Describe the input format"
            value={problemForm.inputFormat}
            onChange={handleChange}
            rows="4"
          />

          <label className="form-field" htmlFor="outputFormat">
            Output format
          </label>
          <textarea
            id="outputFormat"
            name="outputFormat"
            placeholder="Describe the output format"
            value={problemForm.outputFormat}
            onChange={handleChange}
            rows="4"
          />

          <label className="form-field" htmlFor="constraintsText">
            Constraints
          </label>
          <textarea
            id="constraintsText"
            name="constraintsText"
            placeholder="1 <= n <= 10^5"
            value={problemForm.constraintsText}
            onChange={handleChange}
            rows="4"
          />

          <label className="form-field" htmlFor="examplesText">
            Examples
          </label>
          <textarea
            id="examplesText"
            name="examplesText"
            placeholder="Explain examples or walkthroughs"
            value={problemForm.examplesText}
            onChange={handleChange}
            rows="5"
          />

          <div style={{ margin: "2rem 0 1rem", borderTop: "1px solid rgba(148, 163, 184, 0.12)", paddingTop: "1rem" }} />
          <h3>Sample Test Cases</h3>
          <p className="detail-copy" style={{ marginTop: 0 }}>
            These public examples are visible to students before they submit.
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
                  placeholder="1 2 3"
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
                  placeholder="6"
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

          <button
            className="auth-button admin-button"
            type="submit"
            disabled={isSubmitting || !session?.token}
          >
            {isSubmitting ? "Saving..." : "Add coding question"}
          </button>
        </form>

        {status.message ? <p className="form-status success">{status.message}</p> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}

        <div className="detail-actions">
          <Link className="auth-button admin-button detail-link" to="/admin/problems">
            View question list
          </Link>
          <Link className="auth-button ghost-button detail-link" to="/admin/dashboard">
            Back to dashboard
          </Link>
        </div>
      </PlatformSection>
    </PlatformLayout>
  );
}
