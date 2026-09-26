import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PlatformLayout, PlatformSection } from "../../components/PlatformLayout/PlatformLayout";
import { apiRequest } from "../../utils/api";

const languageOptions = [
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" }
];

function buildStarterCode(language) {
  switch (language) {
    case "java":
      return [
        "public class Main {",
        "  public static void main(String[] args) {",
        '    System.out.println("Hello from Java");',
        "  }",
        "}"
      ].join("\n");
    case "cpp":
      return [
        "#include <bits/stdc++.h>",
        "using namespace std;",
        "",
        "int main() {",
        '  cout << "Hello from C++" << endl;',
        "  return 0;",
        "}"
      ].join("\n");
    case "javascript":
      return ['console.log("Hello from JavaScript");'].join("\n");
    case "python":
    default:
      return ['print("Hello from Python")'].join("\n");
  }
}

export default function CourseProblemWorkspace({ role, session }) {
  const { courseId, problemId } = useParams();
  const [course, setCourse] = useState(null);
  const [problem, setProblem] = useState(null);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const [workspace, setWorkspace] = useState({
    language: "java",
    sourceCode: buildStarterCode("java")
  });
  const [runStatus, setRunStatus] = useState({
    success: "",
    error: "",
    latestRun: null
  });

  const isStudent = role === "student";
  const accentRole = role === "admin" ? "admin" : role === "faculty" ? "faculty" : "student";
  const accentButtonClass = role === "admin" ? "admin-button" : "student-button";
  const backToCoursePath = `/${accentRole}/courses/${courseId}`;

  useEffect(() => {
    let isMounted = true;

    async function loadCourseProblem() {
      try {
        const result = await apiRequest(`/courses/${courseId}`, {}, session?.token);
        const selectedProblem = result.course.codingProblems.find((entry) => entry.id === problemId);

        if (!selectedProblem) {
          throw new Error("Course coding problem not found.");
        }

        if (isMounted) {
          setCourse(result.course);
          setProblem(selectedProblem);
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

    loadCourseProblem();
    return () => {
      isMounted = false;
    };
  }, [courseId, problemId, session?.token]);

  async function handleRun() {
    try {
      const result = await apiRequest(
        `/courses/${courseId}/coding-problems/${problemId}/run`,
        {
          method: "POST",
          body: JSON.stringify(workspace)
        },
        session?.token
      );

      setRunStatus({
        success: "Code executed successfully.",
        error: "",
        latestRun: result.result
      });
    } catch (error) {
      setRunStatus((current) => ({
        ...current,
        success: "",
        error: error.message
      }));
    }
  }

  async function handleSubmit() {
    try {
      const result = await apiRequest(
        `/courses/${courseId}/coding-problems/${problemId}/submit`,
        {
          method: "POST",
          body: JSON.stringify(workspace)
        },
        session?.token
      );

      const newSubmission = {
        id: result.submission.id,
        language: result.submission.language,
        sourceCode: result.submission.source_code,
        status: result.submission.status,
        passedTestCases: result.submission.passed_test_cases,
        totalTestCases: result.submission.total_test_cases,
        executionTimeMs: result.submission.execution_time_ms,
        memoryKb: result.submission.memory_kb,
        compilerOutput: result.submission.compiler_output,
        submittedAt: result.submission.submitted_at
      };

      setProblem((current) =>
        current
          ? {
              ...current,
              submissions: [newSubmission, ...(current.submissions || [])]
            }
          : current
      );
      const isAccepted = result.submission.status === "accepted";
      setRunStatus({
        success: isAccepted
          ? "All test cases passed! (Including all hidden test cases)"
          : "Solution submitted successfully.",
        error: "",
        latestRun: {
          verdictLabel: result.execution?.verdictLabel || result.submission.status,
          passedTestCases: result.submission.passed_test_cases,
          totalTestCases: result.submission.total_test_cases,
          executionTimeMs: result.submission.execution_time_ms,
          compilerOutput: result.submission.compiler_output
        }
      });
    } catch (error) {
      setRunStatus((current) => ({
        ...current,
        success: "",
        error: error.message
      }));
    }
  }

  const latestSubmission = problem?.submissions?.[0] || null;

  function handleCodeKeyDown(event) {
    const textarea = event.currentTarget;
    const { value, selectionStart, selectionEnd } = textarea;
    const indentStr = workspace.language === "python" ? "    " : "  ";
    const nextCharacter = value[selectionEnd] || "";

    if (event.key === "Tab") {
      event.preventDefault();

      const actualSelectionEnd = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n" ? selectionEnd - 1 : selectionEnd;
      const startLineIndex = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const endLineIndex = value.indexOf("\n", actualSelectionEnd);
      const endLineContentEnd = endLineIndex === -1 ? value.length : endLineIndex;

      const hasNewlineInSelection = selectionStart !== selectionEnd && value.slice(selectionStart, actualSelectionEnd).includes("\n");

      if (hasNewlineInSelection || event.shiftKey) {
        const lines = value.slice(startLineIndex, endLineContentEnd).split("\n");

        let newSelectionStart = selectionStart;
        let newSelectionEnd = selectionEnd;
        let currentLineOriginalStart = startLineIndex;

        const newLines = lines.map((line, index) => {
          const isFirstLine = index === 0;
          const isLastLine = index === lines.length - 1;

          if (event.shiftKey) {
            const leadingSpaces = line.match(/^ */)[0];
            const removeCount = Math.min(leadingSpaces.length, indentStr.length);

            if (isFirstLine) {
              const spacesBeforeStart = Math.min(removeCount, Math.max(0, selectionStart - currentLineOriginalStart));
              newSelectionStart -= spacesBeforeStart;
            }
            if (isLastLine) {
              const spacesBeforeEnd = Math.min(removeCount, Math.max(0, selectionEnd - currentLineOriginalStart));
              newSelectionEnd -= spacesBeforeEnd;
            } else {
              newSelectionEnd -= removeCount;
            }
            currentLineOriginalStart += line.length + 1;
            return line.slice(removeCount);
          } else {
            if (isFirstLine) newSelectionStart += indentStr.length;
            newSelectionEnd += indentStr.length;

            currentLineOriginalStart += line.length + 1;
            return indentStr + line;
          }
        });

        const nextSourceCode = value.slice(0, startLineIndex) + newLines.join("\n") + value.slice(endLineContentEnd);
        setWorkspace((current) => ({ ...current, sourceCode: nextSourceCode }));
        requestAnimationFrame(() => {
          textarea.selectionStart = Math.max(0, newSelectionStart);
          textarea.selectionEnd = Math.max(0, newSelectionEnd);
        });
      } else {
        const nextSourceCode = `${value.slice(0, selectionStart)}${indentStr}${value.slice(selectionEnd)}`;
        setWorkspace((current) => ({ ...current, sourceCode: nextSourceCode }));
        requestAnimationFrame(() => {
          textarea.selectionStart = selectionStart + indentStr.length;
          textarea.selectionEnd = selectionStart + indentStr.length;
        });
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const currentLine = value.slice(lineStart, selectionStart);
      const leadingWhitespace = currentLine.match(/^(\s*)/)[1];
      const prevChar = value[selectionStart - 1];

      let inserted;
      let cursorOffset;

      if (prevChar === "{" && nextCharacter === "}") {
        inserted = `\n${leadingWhitespace}${indentStr}\n${leadingWhitespace}`;
        cursorOffset = 1 + leadingWhitespace.length + indentStr.length;
      } else if (prevChar === "{" || prevChar === ":" || prevChar === "(") {
        inserted = `\n${leadingWhitespace}${indentStr}`;
        cursorOffset = inserted.length;
      } else {
        inserted = `\n${leadingWhitespace}`;
        cursorOffset = inserted.length;
      }

      const next = `${value.slice(0, selectionStart)}${inserted}${value.slice(selectionEnd)}`;
      setWorkspace((current) => ({ ...current, sourceCode: next }));
      requestAnimationFrame(() => {
        textarea.selectionStart = selectionStart + cursorOffset;
        textarea.selectionEnd = selectionStart + cursorOffset;
      });
    }
  }

  return (
    <PlatformLayout
      role={accentRole}
      eyebrow={isStudent ? "Course Problem" : role === "admin" ? "Admin Course Problem" : "Faculty Course Problem"}
      title={problem ? problem.title : "Course coding problem"}
      subtitle={course ? `${course.code} - ${course.title}` : "Open the course problem workspace and solve it in a focused coding screen."}
      meta="Coding Workspace"
      actions={
        <Link className={`auth-button ${accentButtonClass} panel-action-button`} to={backToCoursePath}>
          Back to course
        </Link>
      }
      sidebarNote="This workspace is dedicated to a single course question so you can focus on reading the prompt, writing code, running samples, and submitting the final solution."
    >
      {status.loading ? <p className="dashboard-copy">Loading course problem...</p> : null}
      {status.error ? <p className="form-status error">{status.error}</p> : null}

      {!status.loading && !status.error && problem ? (
        <>
          <PlatformSection label="Problem" title="Read the question">
            <div className="history-list">
              <article className="history-card">
                <div className="question-card-top">
                  <span className={`difficulty-pill ${problem.difficulty}`}>{problem.difficulty}</span>
                </div>
                <p>{problem.statement}</p>
                {problem.input_format ? <p className="question-meta">Input format: {problem.input_format}</p> : null}
                {problem.output_format ? <p className="question-meta">Output format: {problem.output_format}</p> : null}
                {problem.constraints_text ? <p className="question-meta">Constraints: {problem.constraints_text}</p> : null}
                {problem.examples_text ? <p className="question-meta">Examples: {problem.examples_text}</p> : null}
              </article>
            </div>
          </PlatformSection>

          <PlatformSection label="Samples" title="Public sample test cases">
            {problem.sampleTestCases?.length === 0 ? <p className="dashboard-copy">No sample cases added yet.</p> : null}
            {problem.sampleTestCases?.length > 0 ? (
              <div className="history-list">
                {problem.sampleTestCases.map((testCase, index) => (
                  <article className="history-card" key={testCase.id || index}>
                    <strong>Sample #{index + 1}</strong>
                    <textarea rows="4" readOnly value={testCase.input_data || ""} />
                    <textarea rows="4" readOnly value={testCase.expected_output || ""} />
                  </article>
                ))}
              </div>
            ) : null}
          </PlatformSection>

          <PlatformSection label="Workspace" title="Write, run, and submit">
            <div className="auth-form course-form-grid">
              <select
                value={workspace.language}
                onChange={(event) =>
                  setWorkspace({
                    language: event.target.value,
                    sourceCode: buildStarterCode(event.target.value)
                  })
                }
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <textarea
                rows="16"
                placeholder="Write your solution here"
                value={workspace.sourceCode}
                onChange={(event) =>
                  setWorkspace((current) => ({
                    ...current,
                    sourceCode: event.target.value
                  }))
                }
                onKeyDown={handleCodeKeyDown}
                style={{ fontFamily: "monospace", tabSize: 2 }}
              />
              <div className="platform-section-actions">
                <button className={`auth-button ${accentButtonClass} detail-link`} type="button" onClick={handleRun}>
                  Run code
                </button>
                <button className={`auth-button ${accentButtonClass} detail-link`} type="button" onClick={handleSubmit}>
                  Submit solution
                </button>
              </div>
              {runStatus.success ? <p className="form-status success">{runStatus.success}</p> : null}
              {runStatus.error ? <p className="form-status error">{runStatus.error}</p> : null}
              {runStatus.latestRun ? (
                <div>
                  <p className="question-meta">
                    Latest result: {runStatus.latestRun.verdictLabel || runStatus.latestRun.status} | Passed{" "}
                    {runStatus.latestRun.passedTestCases}/{runStatus.latestRun.totalTestCases} | Time{" "}
                    {runStatus.latestRun.executionTimeMs || 0} ms
                  </p>
                  <textarea rows="6" readOnly value={runStatus.latestRun.compilerOutput || ""} />
                </div>
              ) : null}
            </div>
          </PlatformSection>

          <PlatformSection
            label="Submissions"
            title={isStudent ? "Your latest course submissions" : "Your latest course runs and submissions"}
          >
            {!latestSubmission ? <p className="dashboard-copy">No submissions yet. Submit your first solution above.</p> : null}
            {problem.submissions?.length > 0 ? (
              <div className="history-list">
                {problem.submissions.map((submission) => (
                  <article className="history-card" key={submission.id}>
                    <strong>{submission.status}</strong>
                    <p className="question-meta">
                      {submission.language} | {new Date(submission.submittedAt).toLocaleString()}
                    </p>
                    <p className="question-meta">
                      Passed {submission.passedTestCases}/{submission.totalTestCases}
                      {submission.executionTimeMs ? ` | ${submission.executionTimeMs} ms` : ""}
                    </p>
                    {submission.compilerOutput ? <textarea rows="5" readOnly value={submission.compilerOutput} /> : null}
                  </article>
                ))}
              </div>
            ) : null}
          </PlatformSection>
        </>
      ) : null}
    </PlatformLayout>
  );
}
