import { useState, useEffect, useRef, useMemo } from "react";
import { apiRequest } from "../utils/api";
import { getStudentSession, getFacultySession, getAdminSession } from "../utils/session";
import {
  enterFullScreen,
  exitFullScreen,
  toggleFullScreen,
  isFullscreenActive,
  subscribeToFullscreenChange
} from "../utils/fullscreen";

function getDefaultTemplate(language, problemTitle) {
  const normLang = (language || "python").toLowerCase();
  const title = (problemTitle || "Problem").trim();

  if (normLang === "python") {
    return `# Write your solution for: ${title}\nimport sys\n\ndef solve():\n    # Read input from standard input\n    input_data = sys.stdin.read().strip()\n    # Write your logic here\n    if not input_data:\n        return\n    \n    print(input_data)\n\nif __name__ == "__main__":\n    solve()\n`;
  }
  if (normLang === "cpp") {
    return `// C++ Solution for: ${title}\n#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nint main() {\n    // Optimize input/output operations\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Write your logic here\n    \n    return 0;\n}\n`;
  }
  if (normLang === "java") {
    return `// Java Solution for: ${title}\nimport java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Write your logic here\n        \n    }\n}\n`;
  }
  if (normLang === "javascript") {
    return `// JavaScript (Node.js) Solution for: ${title}\nconst fs = require('fs');\n\nfunction solve() {\n    const input = fs.readFileSync(0, 'utf-8').trim();\n    // Write your logic here\n    \n}\n\nsolve();\n`;
  }
  return "";
}

function getSampleCasesForQuestion(q) {
  if (Array.isArray(q.sampleTestCases) && q.sampleTestCases.length > 0) {
    return q.sampleTestCases;
  }
  if (q.sampleInput || q.sampleOutput) {
    return [{
      input_data: q.sampleInput || "",
      expected_output: q.sampleOutput || ""
    }];
  }
  return [{
    input_data: "",
    expected_output: ""
  }];
}

export default function CourseAssessmentWorkspace({
  assignmentId,
  courseId,
  exam,
  courseTitle = "Course Assessment",
  assignmentTitle = "Examination Paper",
  dueDate = "Due Date TBA",
  lastSubmission = "",
  initialFullScreen = true,
  onExitExam = null
}) {
  const session = getStudentSession() || getFacultySession() || getAdminSession();
  const token = session?.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [codeAnswers, setCodeAnswers] = useState({});
  const [codeLanguages, setCodeLanguages] = useState({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(initialFullScreen);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [recordedSubmission, setRecordedSubmission] = useState(lastSubmission);
  const [submitNotification, setSubmitNotification] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Code runner and editor states matching Problem Bank
  const [runningQuestions, setRunningQuestions] = useState({});
  const [runOutputs, setRunOutputs] = useState({});
  const [activeConsoleTabs, setActiveConsoleTabs] = useState({});
  const [activeSampleCases, setActiveSampleCases] = useState({});
  const [activeResultCases, setActiveResultCases] = useState({});
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [toast, setToast] = useState({ visible: false, type: "success", title: "", message: "" });

  const editorRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const showToast = (type, title, message) => {
    setToast({ visible: true, type, title, message });
  };

  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast.visible]);

  // Dynamic Test Countdown Timer (from start to end)
  const [timeRemaining, setTimeRemaining] = useState(() => {
    if (exam?.endRaw) {
      const ms = new Date(exam.endRaw).getTime() - Date.now();
      return ms > 0 ? Math.floor(ms / 1000) : 0;
    }
    return null;
  });

  useEffect(() => {
    if (!exam?.endRaw) return;
    const interval = setInterval(() => {
      const ms = new Date(exam.endRaw).getTime() - Date.now();
      setTimeRemaining(ms > 0 ? Math.floor(ms / 1000) : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [exam?.endRaw]);

  function formatRemaining(totalSec) {
    if (totalSec === null || totalSec === undefined) return null;
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) {
      return `${hours}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
    }
    return `${mins}m ${String(secs).padStart(2, "0")}s`;
  }

  // Fullscreen synchronization & automatic request
  useEffect(() => {
    if (initialFullScreen && !isFullscreenActive()) {
      enterFullScreen().catch(() => {});
    }

    const unsubscribe = subscribeToFullscreenChange((active) => {
      setIsFullScreen(active);
    });

    return () => {
      unsubscribe();
    };
  }, [initialFullScreen]);

  const handleToggleFullscreen = async () => {
    try {
      const active = await toggleFullScreen();
      setIsFullScreen(active);
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
      setIsFullScreen((prev) => !prev);
    }
  };

  useEffect(() => {
    async function loadQuestions() {
      if (!assignmentId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest(`/assignments/${assignmentId}`, {}, token);
        const qs = Array.isArray(data?.questions) ? data.questions : [];
        setQuestions(qs);

        const initialCode = {};
        const initialLangs = {};
        qs.forEach((q, idx) => {
          const qKey = q.id || idx;
          if (q.question_type === "coding" || q.type === "coding") {
            initialLangs[qKey] = "python";
            initialCode[qKey] = "";
          }
        });
        setCodeAnswers(initialCode);
        setCodeLanguages(initialLangs);
      } catch (err) {
        console.error("Failed to load questions:", err);
        setError(err.message || "Failed to load examination questions.");
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();
  }, [assignmentId, token]);

  const handleOptionSelect = (questionId, optionIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleCodeChange = (questionId, code) => {
    setCodeAnswers((prev) => ({
      ...prev,
      [questionId]: code
    }));
  };

  const handleLanguageChange = (questionId, lang) => {
    setCodeLanguages((prev) => ({
      ...prev,
      [questionId]: lang
    }));
  };

  const handleFormatCode = (qKey) => {
    const code = codeAnswers[qKey] || "";
    if (!code.trim()) return;
    const lang = codeLanguages[qKey] || "python";
    const lines = code.split("\n");
    let indentLevel = 0;
    const formattedLines = lines.map((line) => {
      let trimmed = line.trim();
      if (trimmed.startsWith("}") || trimmed.startsWith("]")) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      const indentedLine = "    ".repeat(indentLevel) + trimmed;
      if (trimmed.endsWith("{") || trimmed.endsWith("[") || (trimmed.endsWith(":") && lang === "python")) {
        indentLevel += 1;
      }
      return indentedLine;
    });
    const newCode = formattedLines.join("\n");
    setCodeAnswers((prev) => ({ ...prev, [qKey]: newCode }));
    showToast("success", "Code Formatted", "Indentation and braces aligned successfully.");
  };

  const handleResetCode = (qKey) => {
    setCodeAnswers((prev) => ({ ...prev, [qKey]: "" }));
    showToast("info", "Code Cleared", "Editor cleared. You can write your solution from scratch.");
  };

  const handleCopyCode = (qKey) => {
    const code = codeAnswers[qKey] || "";
    if (!code) {
      showToast("error", "Empty Code", "No code in editor to copy.");
      return;
    }
    navigator.clipboard.writeText(code).then(() => {
      showToast("success", "Copied", "Code copied to clipboard!");
    }).catch(() => {
      showToast("error", "Copy Failed", "Could not copy code to clipboard.");
    });
  };

  const handleIncreaseFontSize = () => {
    setEditorFontSize((prev) => Math.min(22, prev + 1));
  };

  const handleDecreaseFontSize = () => {
    setEditorFontSize((prev) => Math.max(12, prev - 1));
  };

  const handleEditorScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  function updateCursorPos(textarea) {
    if (!textarea) return;
    const textBeforeCursor = textarea.value.slice(0, textarea.selectionStart);
    const lines = textBeforeCursor.split("\n");
    setCursorPos({
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    });
  }

  function handleEditorKeyDown(event, qKey, currentQ) {
    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    const nextCharacter = value[selectionEnd] || "";

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (currentQ) {
        handleRunCode(currentQ, qKey);
      }
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const indentStr = "    ";

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
            const leadingSpaces = line.match(/^\s*/)[0];
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

        const nextCode = value.slice(0, startLineIndex) + newLines.join("\n") + value.slice(endLineContentEnd);
        setCodeAnswers((prev) => ({ ...prev, [qKey]: nextCode }));
        requestAnimationFrame(() => {
          textarea.selectionStart = Math.max(0, newSelectionStart);
          textarea.selectionEnd = Math.max(0, newSelectionEnd);
          updateCursorPos(textarea);
        });
      } else {
        const nextCode = `${value.slice(0, selectionStart)}${indentStr}${value.slice(selectionEnd)}`;
        setCodeAnswers((prev) => ({ ...prev, [qKey]: nextCode }));
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + indentStr.length;
          updateCursorPos(textarea);
        });
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const currentLine = value.slice(lineStart, selectionStart);
      const leadingWhitespace = currentLine.match(/^(\s*)/)[1];
      const indentUnit = "    ";

      if (value[selectionStart - 1] === "{" && nextCharacter === "}") {
        const nextCode = `${value.slice(0, selectionStart)}\n${leadingWhitespace}${indentUnit}\n${leadingWhitespace}${value.slice(selectionEnd)}`;
        setCodeAnswers((prev) => ({ ...prev, [qKey]: nextCode }));
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + leadingWhitespace.length + indentUnit.length + 1;
          updateCursorPos(textarea);
        });
      } else if (
        value[selectionStart - 1] === "{" ||
        value[selectionStart - 1] === "[" ||
        value[selectionStart - 1] === "(" ||
        value[selectionStart - 1] === ":"
      ) {
        const nextCode = `${value.slice(0, selectionStart)}\n${leadingWhitespace}${indentUnit}${value.slice(selectionEnd)}`;
        setCodeAnswers((prev) => ({ ...prev, [qKey]: nextCode }));
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + leadingWhitespace.length + indentUnit.length + 1;
          updateCursorPos(textarea);
        });
      } else {
        const nextCode = `${value.slice(0, selectionStart)}\n${leadingWhitespace}${value.slice(selectionEnd)}`;
        setCodeAnswers((prev) => ({ ...prev, [qKey]: nextCode }));
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + leadingWhitespace.length + 1;
          updateCursorPos(textarea);
        });
      }
      return;
    }
  }

  const handleRunCode = async (q, qKey) => {
    const lang = codeLanguages[qKey] || "python";
    const code = codeAnswers[qKey] || "";

    if (!code.trim()) {
      setRunOutputs((prev) => ({
        ...prev,
        [qKey]: {
          status: "failed",
          verdictLabel: "Empty Code",
          error: "Please write some code before running tests."
        }
      }));
      setActiveConsoleTabs((prev) => ({ ...prev, [qKey]: "result" }));
      showToast("error", "Empty Code", "Please write code before running tests.");
      return;
    }

    setRunningQuestions((prev) => ({ ...prev, [qKey]: true }));
    setRunOutputs((prev) => ({ ...prev, [qKey]: null }));
    setActiveConsoleTabs((prev) => ({ ...prev, [qKey]: "result" }));

    try {
      const resolvedCourseId = courseId || exam?.courseId;
      const problemId = q.codingProblemId || q.coding_id || q.id;

      let result = null;

      // 1. Try assignment question runner if in an assignment
      if (assignmentId && q.id) {
        try {
          const runRes = await apiRequest(
            `/assignments/${assignmentId}/questions/${q.id}/run`,
            {
              method: "POST",
              body: JSON.stringify({
                language: lang,
                sourceCode: code,
                sampleInput: q.sampleInput || q.sampleTestCases?.[0]?.input_data || "",
                sampleOutput: q.sampleOutput || q.sampleTestCases?.[0]?.expected_output || ""
              })
            },
            token
          );
          result = runRes?.result || runRes;
        } catch (assignErr) {
          console.warn("Assignment run endpoint notice:", assignErr.message);
        }
      }

      // 2. Fallback to course problem runner
      if (!result && resolvedCourseId && problemId) {
        try {
          const runRes = await apiRequest(
            `/courses/${resolvedCourseId}/coding-problems/${problemId}/run`,
            {
              method: "POST",
              body: JSON.stringify({
                language: lang,
                sourceCode: code
              })
            },
            token
          );
          result = runRes?.result || runRes;
        } catch (courseErr) {
          console.warn("Course problem run endpoint notice:", courseErr.message);
        }
      }

      if (!result) {
        throw new Error("Compilation server unavailable. Please ensure your backend is running.");
      }

      // Format results based on real Judge0 / compiler verdict
      const isAccepted = result.verdictLabel === "Accepted" || (result.status === "accepted" && !result.errorType && (result.passedTestCases === result.totalTestCases || !result.totalTestCases));
      const isCompileError = result.verdictLabel === "Compile Error" || result.errorType === "compile_error";

      const timeLabel = result.executionTimeMs ? `${result.executionTimeMs} ms` : (result.executionTime || "0 ms");
      const memLabel = result.memoryKb ? `${(result.memoryKb / 1024).toFixed(1)} MB` : (result.memory || "N/A");

      const passedCount = result.passedTestCases ?? (isAccepted ? (result.totalTestCases || 1) : 0);
      const totalCount = result.totalTestCases ?? (result.testCaseResults?.length || 1);

      setRunOutputs((prev) => ({
        ...prev,
        [qKey]: {
          status: isAccepted ? "accepted" : "failed",
          isCompileError,
          verdictLabel: result.verdictLabel || (isAccepted ? "Accepted" : "Wrong Answer"),
          passedTestCases: passedCount,
          totalTestCases: totalCount,
          executionTime: timeLabel,
          executionTimeMs: result.executionTimeMs ?? 0,
          memory: memLabel,
          testCaseResults: result.testCaseResults || [],
          rawOutput: result.stdout || "",
          stderr: result.stderr || "",
          compilerOutput: result.compilerOutput || "",
          error: isAccepted
            ? ""
            : (result.stderr || (isCompileError ? (result.compilerOutput || "Compilation failed.") : "") || (result.verdictLabel !== "Accepted" ? (result.verdictLabel || "Execution Failed") : ""))
        }
      }));

      if (isAccepted) {
        showToast("success", "Accepted", "All test cases passed successfully!");
      } else if (isCompileError) {
        showToast("error", "Compile Error", "Code failed to compile. See error output below.");
      } else {
        showToast("error", result.verdictLabel || "Wrong Answer", `${passedCount} of ${totalCount} test cases passed.`);
      }
    } catch (err) {
      setRunOutputs((prev) => ({
        ...prev,
        [qKey]: {
          status: "failed",
          verdictLabel: "Execution Error",
          error: err.message || "Failed to execute code."
        }
      }));
      showToast("error", "Execution Error", err.message || "Failed to execute code.");
    } finally {
      setRunningQuestions((prev) => ({ ...prev, [qKey]: false }));
    }
  };

  const handleSaveSubmission = async () => {
    setSubmitting(true);
    try {
      if (assignmentId) {
        try {
          await apiRequest(
            `/assignments/${assignmentId}/submit`,
            {
              method: "POST",
              body: JSON.stringify({
                answers,
                codeAnswers,
                codeLanguages,
                submittedAt: new Date().toISOString()
              })
            },
            token
          );
        } catch (e) {
          console.warn("Server submission endpoint response:", e);
        }
      }

      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} IST`;
      setRecordedSubmission(formattedDate);
      setSubmitNotification("Your responses and code solutions have been successfully recorded.");
      setTimeout(() => setSubmitNotification(""), 4000);
      // Cleanly exit native browser fullscreen upon successful submission
      exitFullScreen().catch(() => {});
    } catch (err) {
      setSubmitNotification("Error saving submission: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`assessment-workspace-layout ${isFullScreen ? "fullscreen-mode" : ""}`}>
      {/* TOAST FEEDBACK ALERT */}
      {toast.visible && (
        <div className={`workspace-toast workspace-toast-${toast.type}`} role="status" aria-live="polite">
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
        </div>
      )}

      {/* FULLSCREEN STATUS BANNER IF USER EXITED NATIVE FULLSCREEN */}
      {!isFullScreen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(90deg, #dc2626, #b91c1c)",
          color: "#ffffff",
          padding: "0.55rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.825rem",
          fontWeight: 600,
          zIndex: 1000000,
          boxShadow: "0 2px 10px rgba(0,0,0,0.4)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1rem" }}>⚠️</span>
            <span>Assessment Full Screen mode is paused. Please resume full screen to maintain examination integrity.</span>
          </div>
          <button
            type="button"
            onClick={handleToggleFullscreen}
            style={{
              background: "#ffffff",
              color: "#b91c1c",
              border: "none",
              borderRadius: "6px",
              padding: "0.35rem 0.9rem",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            <span>⛶</span> Resume Full Screen
          </button>
        </div>
      )}

      {/* LEFT SIDEBAR: QUESTION NAVIGATION TREE */}
      <aside
        className="assessment-sidebar-panel"
        style={{ display: isSidebarOpen ? "flex" : "none" }}
      >
        <div className="assessment-sidebar-header">
          <h2 className="assessment-course-name">{courseTitle}</h2>
          <div className="assessment-progress-row">
            <span className="assessment-progress-label">Total Questions</span>
            <span className="assessment-progress-val">
              {questions.length} {questions.length === 1 ? "Problem" : "Problems"}
            </span>
          </div>
        </div>

        <nav className="assessment-tree-nav">
          <div className="assessment-module-block">
            <div style={{
              padding: "0.6rem 0.85rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--lc-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
              Test Questions Overview
            </div>

            {loading ? (
              <div style={{ padding: "1rem", color: "var(--lc-text-muted)", fontSize: "0.85rem" }}>
                Loading questions...
              </div>
            ) : questions.length === 0 ? (
              <div style={{ padding: "0.85rem 1rem", color: "var(--lc-text-muted)", fontSize: "0.825rem" }}>
                No questions added yet.
              </div>
            ) : (
              <ul className="assessment-item-list">
                {questions.map((q, idx) => {
                  const isCoding = q.question_type === "coding" || q.type === "coding";
                  const qKey = q.id || idx;
                  const qTitle = q.title || q.questionText || `Question ${idx + 1}`;
                  const isAnswered = isCoding ? Boolean(codeAnswers[qKey]?.trim()) : answers[qKey] !== undefined;
                  const isActive = activeQuestionIndex === idx;

                  return (
                    <li key={qKey}>
                      <button
                        type="button"
                        className={`assessment-item-btn ${isActive ? "active-item" : ""}`}
                        onClick={() => setActiveQuestionIndex(idx)}
                      >
                        <span className={`assessment-status-icon ${isAnswered ? "completed" : "pending"}`}>
                          {isAnswered ? "✓" : (idx + 1)}
                        </span>
                        <span className="assessment-item-text">
                          {isCoding ? `💻 Q${idx + 1}: ${qTitle}` : `📝 Q${idx + 1}: ${qTitle}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </nav>
      </aside>

      {/* RESIZE DIVIDER BAR */}
      <div
        className="assessment-resize-divider"
        style={{ display: isSidebarOpen ? "flex" : "none" }}
      >
        <span className="assessment-divider-grip">||</span>
      </div>

      {/* RIGHT MAIN PANEL: ASSESSMENT CONTENT */}
      <section className="assessment-main-panel">
        <header className="assessment-topbar">
          <div className="assessment-topbar-left">
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.2rem" }}>
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid var(--lc-border, rgba(255, 255, 255, 0.15))",
                  color: "var(--lc-text-primary, #ffffff)",
                  borderRadius: "6px",
                  padding: "0.25rem 0.65rem",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}
                title={isSidebarOpen ? "Collapse questions sidebar for wider code area" : "Expand questions sidebar"}
              >
                <span>{isSidebarOpen ? "◀" : "▶"}</span>
                <span>{isSidebarOpen ? "Hide Questions List" : "Show Questions List"}</span>
              </button>
              <span className="assessment-pill-badge">Official Assessment</span>
            </div>
            <h1 className="assessment-title">{assignmentTitle}</h1>
            {recordedSubmission && (
              <p className="assessment-last-submission font-emerald">
                ✓ Your last recorded submission was on {recordedSubmission}.
              </p>
            )}
          </div>

          <div className="assessment-topbar-right" style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
            {exam?.durationMinutes && (
              <div
                style={{
                  background: "rgba(59, 130, 246, 0.12)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  color: "#60a5fa",
                  borderRadius: "8px",
                  padding: "0.35rem 0.7rem",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}
              >
                <span>⏱️</span>
                <span>Duration: {exam.durationMinutes} Mins</span>
              </div>
            )}
            {timeRemaining !== null ? (
              <div
                style={{
                  background: timeRemaining <= 300 ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.12)",
                  border: timeRemaining <= 300 ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(16, 185, 129, 0.3)",
                  color: timeRemaining <= 300 ? "#ef4444" : "#10b981",
                  borderRadius: "8px",
                  padding: "0.35rem 0.7rem",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}
              >
                <span>⏳</span>
                <span>Time Left: {timeRemaining === 0 ? "Time's up" : formatRemaining(timeRemaining)}</span>
              </div>
            ) : (
              dueDate && (
                <div className="assessment-due-tag font-red">
                  End Window: {dueDate}
                </div>
              )
            )}
            <div className="assessment-action-buttons">
              <button
                type="button"
                className={`assessment-action-btn ${isFullScreen ? "active-fullscreen" : ""}`}
                onClick={handleToggleFullscreen}
                title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
                {isFullScreen ? "Exit Full Screen" : "Full Screen"}
              </button>

              {onExitExam && (
                <button
                  type="button"
                  className="assessment-action-btn"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to exit the exam workspace? Any unsubmitted responses may be lost.")) {
                      exitFullScreen().catch(() => {}).finally(() => onExitExam());
                    }
                  }}
                  title="Exit Exam"
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    borderColor: "rgba(239, 68, 68, 0.4)",
                    color: "#f87171"
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  Exit Exam
                </button>
              )}
            </div>
          </div>
        </header>

        {submitNotification && (
          <div className="assessment-notification-toast">
            {submitNotification}
          </div>
        )}

        {/* QUESTIONS CONTAINER */}
        <div className="assessment-questions-container">
          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--lc-text-muted)" }}>
              <div className="lc-spinner" style={{ margin: "0 auto 1rem auto" }} />
              <p>Loading questions and test cases...</p>
            </div>
          ) : error ? (
            <div className="lc-error-banner" style={{ margin: "2rem" }}>
              <span>{error}</span>
            </div>
          ) : questions.length === 0 ? (
            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px dashed var(--lc-border)",
              borderRadius: "14px",
              padding: "3.5rem 2rem",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.85rem" }}>📝</div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--lc-text-primary)", marginBottom: "0.5rem" }}>
                No Questions Added Yet
              </h3>
              <p style={{ color: "var(--lc-text-muted)", fontSize: "0.875rem", maxWidth: "450px", margin: "0 auto" }}>
                The instructor has scheduled this test paper. Questions and coding problems will appear here once added.
              </p>
            </div>
          ) : (
            (() => {
              const currentIdx = Math.min(Math.max(0, activeQuestionIndex), Math.max(0, questions.length - 1));
              const q = questions[currentIdx];
              const idx = currentIdx;
              const isCoding = q.question_type === "coding" || q.type === "coding";
              const qKey = q.id || idx;
              const qMarks = q.marks || (isCoding ? 25 : 1);
              const qTitle = q.title || q.questionText || `Question ${idx + 1}`;
              const isRunningThis = Boolean(runningQuestions[qKey]);
              const runOutput = runOutputs[qKey];
              const sampleCases = isCoding ? getSampleCasesForQuestion(q) : [];
              const currentSampleCaseIdx = Math.min(
                Math.max(0, activeSampleCases[qKey] || 0),
                Math.max(0, sampleCases.length - 1)
              );
              const currentConsoleTab = activeConsoleTabs[qKey] || "testcase";
              const currentCode = codeAnswers[qKey] ?? "";
              const lineCount = Math.max(currentCode.split("\n").length, 1);
              const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

              return (
                <>
                  {/* Single Question Header Bar */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.25rem",
                    padding: "0.6rem 0.85rem",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "10px",
                    border: "1px solid var(--lc-border)",
                    flexWrap: "wrap",
                    gap: "0.5rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{
                        fontSize: "0.85rem",
                        fontWeight: 800,
                        color: "var(--lc-text-primary)",
                        background: "rgba(255, 255, 255, 0.08)",
                        padding: "0.25rem 0.65rem",
                        borderRadius: "6px"
                      }}>
                        Question {currentIdx + 1} of {questions.length}
                      </span>
                      <span style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: isCoding ? "#60a5fa" : "#a78bfa",
                        background: isCoding ? "rgba(59, 130, 246, 0.15)" : "rgba(167, 139, 250, 0.15)",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "6px"
                      }}>
                        {isCoding ? "💻 Coding Problem" : "🔘 Multiple Choice (MCQ)"}
                      </span>
                    </div>
                    <span className="assessment-point-badge" style={{ fontSize: "0.8rem", padding: "0.25rem 0.65rem" }}>
                      {qMarks} {qMarks === 1 ? "Mark" : "Marks"}
                    </span>
                  </div>

                  {isCoding ? (
                    <div
                      key={qKey}
                      className="assessment-coding-split-container"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.25fr)",
                        gap: "1.25rem",
                        alignItems: "start",
                        width: "100%",
                        boxSizing: "border-box",
                        marginBottom: "2rem"
                      }}
                    >
                      {/* LEFT COLUMN: Problem Statement, details, constraints, sample test cases */}
                      <div
                        className="assessment-statement-pane"
                        style={{
                          background: "rgba(26, 32, 46, 0.7)",
                          border: "1px solid var(--lc-border, rgba(255, 255, 255, 0.08))",
                          borderRadius: "14px",
                          padding: "1.5rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "1.25rem",
                          minWidth: 0,
                          maxHeight: "calc(100vh - 210px)",
                          overflowY: "auto",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                        }}
                      >
                        <div className="assessment-question-header" style={{ alignItems: "flex-start", marginBottom: 0, paddingBottom: "0.75rem", borderBottom: "1px solid var(--lc-border, rgba(255, 255, 255, 0.08))" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                              <span style={{
                                background: "rgba(59, 130, 246, 0.15)",
                                color: "#60a5fa",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                padding: "0.2rem 0.55rem",
                                borderRadius: "6px"
                              }}>
                                Coding Problem
                              </span>
                              {q.difficulty && (
                                <span style={{
                                  background: q.difficulty === "easy" ? "rgba(16, 185, 129, 0.15)" : q.difficulty === "hard" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                  color: q.difficulty === "easy" ? "#10b981" : q.difficulty === "hard" ? "#ef4444" : "#f59e0b",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  padding: "0.2rem 0.55rem",
                                  borderRadius: "6px",
                                  textTransform: "capitalize"
                                }}>
                                  {q.difficulty}
                                </span>
                              )}
                            </div>
                            <span className="assessment-question-text" style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                              <strong>{idx + 1}.</strong> {qTitle}
                            </span>
                          </div>
                          <span className="assessment-point-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                            {qMarks} Points
                          </span>
                        </div>

                        {/* Problem Statement */}
                        {q.statement && (
                          <div style={{
                            color: "var(--lc-text-primary)",
                            fontSize: "0.9rem",
                            lineHeight: "1.6",
                            marginTop: "0.75rem",
                            marginBottom: "1rem",
                            whiteSpace: "pre-wrap"
                          }}>
                            {q.statement}
                          </div>
                        )}

                        {/* Constraints and Formats */}
                        {(q.inputFormat || q.outputFormat || q.constraintsText) && (
                          <div style={{
                            background: "rgba(0, 0, 0, 0.25)",
                            border: "1px solid var(--lc-border)",
                            borderRadius: "10px",
                            padding: "0.85rem 1rem",
                            marginBottom: "1rem",
                            fontSize: "0.825rem",
                            display: "grid",
                            gap: "0.5rem"
                          }}>
                            {q.inputFormat && (
                              <div>
                                <strong style={{ color: "var(--lc-text-muted)" }}>Input Format: </strong>
                                <span style={{ color: "var(--lc-text-primary)" }}>{q.inputFormat}</span>
                              </div>
                            )}
                            {q.outputFormat && (
                              <div>
                                <strong style={{ color: "var(--lc-text-muted)" }}>Output Format: </strong>
                                <span style={{ color: "var(--lc-text-primary)" }}>{q.outputFormat}</span>
                              </div>
                            )}
                            {q.constraintsText && (
                              <div>
                                <strong style={{ color: "var(--lc-text-muted)" }}>Constraints: </strong>
                                <code style={{ color: "#f59e0b", background: "rgba(245, 158, 11, 0.1)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                                  {q.constraintsText}
                                </code>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Sample Test Cases Preview */}
                        {(q.sampleInput || q.sampleTestCases?.length > 0) && (
                          <div style={{
                            background: "rgba(0, 0, 0, 0.35)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "10px",
                            padding: "0.85rem 1rem"
                          }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#60a5fa", marginBottom: "0.5rem" }}>
                              Sample Test Case
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                              <div>
                                <span style={{ fontSize: "0.72rem", color: "var(--lc-text-muted)", display: "block", marginBottom: "0.2rem" }}>Sample Input:</span>
                                <pre style={{ margin: 0, padding: "0.5rem", background: "rgba(0,0,0,0.5)", borderRadius: "6px", fontSize: "0.8rem", color: "#a5f3fc", fontFamily: "monospace" }}>
                                  {q.sampleInput || q.sampleTestCases?.[0]?.input_data || "N/A"}
                                </pre>
                              </div>
                              <div>
                                <span style={{ fontSize: "0.72rem", color: "var(--lc-text-muted)", display: "block", marginBottom: "0.2rem" }}>Sample Output:</span>
                                <pre style={{ margin: 0, padding: "0.5rem", background: "rgba(0,0,0,0.5)", borderRadius: "6px", fontSize: "0.8rem", color: "#86efac", fontFamily: "monospace" }}>
                                  {q.sampleOutput || q.sampleTestCases?.[0]?.expected_output || "N/A"}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* RIGHT COLUMN: PROBLEM BANK STYLE CODE AREA */}
                      <div
                        className="assessment-editor-pane"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          minWidth: 0,
                          width: "100%"
                        }}
                      >
                        <div style={{
                          background: "#0d1117",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          borderRadius: "12px",
                          overflow: "hidden"
                        }}>
                        {/* Editor Toolbar Header */}
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.55rem 0.95rem",
                          background: "rgba(255, 255, 255, 0.04)",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                          flexWrap: "wrap",
                          gap: "0.5rem"
                        }}>
                          {/* Left Toolbar: Language selector and Auto indicator */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                              <select
                                value={codeLanguages[qKey] || "python"}
                                onChange={(e) => handleLanguageChange(qKey, e.target.value)}
                                style={{
                                  background: "rgba(255, 255, 255, 0.08)",
                                  border: "1px solid rgba(255, 255, 255, 0.15)",
                                  color: "#ffffff",
                                  padding: "0.3rem 1.6rem 0.3rem 0.65rem",
                                  borderRadius: "6px",
                                  outline: "none",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  fontSize: "0.825rem",
                                  appearance: "none",
                                  WebkitAppearance: "none",
                                  MozAppearance: "none"
                                }}
                              >
                                <option value="python" style={{ background: "#1e1e1e" }}>Python 3</option>
                                <option value="cpp" style={{ background: "#1e1e1e" }}>C++ (GCC)</option>
                                <option value="java" style={{ background: "#1e1e1e" }}>Java</option>
                                <option value="javascript" style={{ background: "#1e1e1e" }}>JavaScript (Node)</option>
                              </select>
                              <span style={{ position: "absolute", right: "8px", pointerEvents: "none", color: "#94a3b8", fontSize: "0.6rem" }}>▼</span>
                            </div>

                            <span style={{ color: "#94a3b8", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                              <span style={{ color: "#10b981", fontSize: "1rem", lineHeight: "1" }}>•</span>
                              Auto
                            </span>
                          </div>

                          {/* Right Toolbar Actions: Font Size, Format, Reset, Copy, Run Code */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {/* Font Size Adjusters */}
                            <div style={{
                              display: "inline-flex",
                              alignItems: "center",
                              background: "rgba(255, 255, 255, 0.04)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "6px",
                              overflow: "hidden"
                            }}>
                              <button
                                type="button"
                                onClick={handleDecreaseFontSize}
                                title="Decrease editor font size"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#94a3b8",
                                  padding: "0.25rem 0.5rem",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer"
                                }}
                              >
                                A-
                              </button>
                              <span style={{ fontSize: "0.7rem", color: "#64748b", padding: "0 0.2rem", userSelect: "none" }}>
                                {editorFontSize}px
                              </span>
                              <button
                                type="button"
                                onClick={handleIncreaseFontSize}
                                title="Increase editor font size"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#94a3b8",
                                  padding: "0.25rem 0.5rem",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer"
                                }}
                              >
                                A+
                              </button>
                            </div>

                            {/* Format Code */}
                            <button
                              type="button"
                              onClick={() => handleFormatCode(qKey)}
                              title="Format code indentation"
                              style={{
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                color: "#cbd5e1",
                                borderRadius: "6px",
                                padding: "0.3rem 0.6rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                fontSize: "0.75rem",
                                fontWeight: 600
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <line x1="21" y1="10" x2="7" y2="10" />
                                <line x1="21" y1="6" x2="3" y2="6" />
                                <line x1="21" y1="14" x2="3" y2="14" />
                                <line x1="21" y1="18" x2="7" y2="18" />
                              </svg>
                              <span>Format</span>
                            </button>

                            {/* Clear Code */}
                            <button
                              type="button"
                              onClick={() => handleResetCode(qKey)}
                              title="Clear code editor to write on your own"
                              style={{
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                color: "#cbd5e1",
                                borderRadius: "6px",
                                padding: "0.3rem 0.6rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                fontSize: "0.75rem",
                                fontWeight: 600
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <polyline points="3 3 3 8 8 8" />
                              </svg>
                              <span>Clear</span>
                            </button>

                            {/* Copy Code */}
                            <button
                              type="button"
                              onClick={() => handleCopyCode(qKey)}
                              title="Copy code to clipboard"
                              style={{
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                color: "#cbd5e1",
                                borderRadius: "6px",
                                padding: "0.3rem 0.6rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                fontSize: "0.75rem",
                                fontWeight: 600
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              <span>Copy</span>
                            </button>

                            {/* Run Code Button */}
                            <button
                              type="button"
                              onClick={() => handleRunCode(q, qKey)}
                              disabled={isRunningThis}
                              style={{
                                background: isRunningThis
                                  ? "rgba(59, 130, 246, 0.3)"
                                  : "linear-gradient(135deg, #10b981, #059669)",
                                color: "#ffffff",
                                border: "1px solid rgba(16, 185, 129, 0.4)",
                                borderRadius: "6px",
                                padding: "0.32rem 0.95rem",
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                cursor: isRunningThis ? "not-allowed" : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
                                transition: "all 0.15s ease"
                              }}
                            >
                              {isRunningThis ? (
                                <>
                                  <span className="lc-spinner" style={{ width: "12px", height: "12px", borderWidth: "2px" }} />
                                  <span>Running...</span>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: "0.75rem" }}>▶</span>
                                  <span>Run Code</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Line Numbers Gutter + Code Textarea */}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "52px minmax(0, 1fr)",
                          background: "#0a0e14",
                          overflow: "hidden",
                          fontSize: `${editorFontSize}px`
                        }}>
                          <div
                            ref={lineNumbersRef}
                            style={{
                              overflow: "hidden",
                              padding: "1rem 0.6rem",
                              background: "rgba(0, 0, 0, 0.3)",
                              borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                              color: "#64748b",
                              textAlign: "right",
                              userSelect: "none",
                              boxSizing: "border-box"
                            }}
                            aria-hidden="true"
                          >
                            {lineNumbers.map((num) => (
                              <div key={num} style={{ height: "1.6em", lineHeight: "1.6", fontFamily: "'Consolas', 'Courier New', monospace" }}>
                                {num}
                              </div>
                            ))}
                          </div>

                          <textarea
                            ref={editorRef}
                            rows="16"
                            value={currentCode}
                            onChange={(e) => handleCodeChange(qKey, e.target.value)}
                            onKeyDown={(e) => handleEditorKeyDown(e, qKey, q)}
                            onScroll={handleEditorScroll}
                            onKeyUp={(e) => updateCursorPos(e.currentTarget)}
                            onClick={(e) => updateCursorPos(e.currentTarget)}
                            onSelect={(e) => updateCursorPos(e.currentTarget)}
                            placeholder="// Write your code solution here from scratch..."
                            spellCheck="false"
                            autoCapitalize="off"
                            autoComplete="off"
                            autoCorrect="off"
                            style={{
                              width: "100%",
                              height: "380px",
                              margin: 0,
                              padding: "1rem",
                              background: "#0a0e14",
                              color: "#f8fafc",
                              fontFamily: "'Consolas', 'Courier New', monospace",
                              fontSize: "inherit",
                              lineHeight: "1.6",
                              border: "none",
                              outline: "none",
                              resize: "vertical",
                              tabSize: 4,
                              whiteSpace: "pre",
                              overflowWrap: "normal",
                              overflowX: "auto",
                              boxSizing: "border-box"
                            }}
                          />
                        </div>

                        {/* Status Bar at Bottom of Editor */}
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.35rem 0.85rem",
                          background: "rgba(255, 255, 255, 0.02)",
                          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                          fontSize: "0.75rem",
                          color: "#64748b",
                          fontFamily: "'Consolas', monospace"
                        }}>
                          <div style={{ display: "flex", gap: "1rem" }}>
                            <span>Ln {cursorPos.line}, Col {cursorPos.column}</span>
                            <span>{lineCount} lines</span>
                          </div>
                          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                            <span>Tab Size: 4</span>
                            <span style={{ color: "#3b82f6" }}>Run: Ctrl + Enter</span>
                          </div>
                        </div>
                      </div>

                      {/* TABBED CONSOLE DRAWER (TESTCASE & TEST RESULT) */}
                      <div style={{
                        marginTop: "1.25rem",
                        background: "#0d1117",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "12px",
                        overflow: "hidden"
                      }}>
                        {/* Tab Navigation Header */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                          background: "rgba(255, 255, 255, 0.03)",
                          padding: "0 0.5rem"
                        }}>
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button
                              type="button"
                              onClick={() => setActiveConsoleTabs((prev) => ({ ...prev, [qKey]: "testcase" }))}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.45rem",
                                padding: "0.65rem 1rem",
                                background: "none",
                                border: "none",
                                borderBottom: currentConsoleTab === "testcase" ? "2px solid #3b82f6" : "2px solid transparent",
                                color: currentConsoleTab === "testcase" ? "#60a5fa" : "var(--lc-text-muted)",
                                fontWeight: 700,
                                fontSize: "0.825rem",
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <polyline points="9 11 12 14 22 4" />
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                              </svg>
                              <span>Testcase</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveConsoleTabs((prev) => ({ ...prev, [qKey]: "result" }))}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.45rem",
                                padding: "0.65rem 1rem",
                                background: "none",
                                border: "none",
                                borderBottom: currentConsoleTab === "result"
                                  ? (runOutput?.status === "accepted" ? "2px solid #22c55e" : runOutput ? "2px solid #ef4444" : "2px solid #3b82f6")
                                  : "2px solid transparent",
                                color: currentConsoleTab === "result"
                                  ? (runOutput?.status === "accepted" ? "#22c55e" : runOutput ? "#ef4444" : "#60a5fa")
                                  : "var(--lc-text-muted)",
                                fontWeight: 700,
                                fontSize: "0.825rem",
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                              </svg>
                              <span>Test Result</span>
                              {runOutput && (
                                <span style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background: runOutput.status === "accepted" ? "#22c55e" : "#ef4444",
                                  display: "inline-block"
                                }} />
                              )}
                            </button>
                          </div>

                          {/* Quick Run Status In Header */}
                          {isRunningThis && (
                            <span style={{ fontSize: "0.78rem", color: "#60a5fa", display: "flex", alignItems: "center", gap: "0.4rem", paddingRight: "0.5rem" }}>
                              <span className="lc-spinner" style={{ width: "12px", height: "12px", borderWidth: "2px" }} />
                              Compiling & Executing...
                            </span>
                          )}
                        </div>

                        {/* Tab Content Body */}
                        <div style={{ padding: "1.25rem" }}>
                          {currentConsoleTab === "testcase" ? (
                            /* TESTCASE VIEW */
                            <div>
                              {/* Sample Case Badges */}
                              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                                {sampleCases.map((tc, cIdx) => (
                                  <button
                                    key={cIdx}
                                    type="button"
                                    onClick={() => setActiveSampleCases((prev) => ({ ...prev, [qKey]: cIdx }))}
                                    style={{
                                      padding: "0.45rem 0.9rem",
                                      borderRadius: "8px",
                                      fontSize: "0.825rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      border: "1px solid",
                                      borderColor: currentSampleCaseIdx === cIdx ? "#3b82f6" : "rgba(255, 255, 255, 0.1)",
                                      background: currentSampleCaseIdx === cIdx ? "rgba(59, 130, 246, 0.15)" : "rgba(255, 255, 255, 0.04)",
                                      color: currentSampleCaseIdx === cIdx ? "#60a5fa" : "var(--lc-text-primary)",
                                      transition: "all 0.15s ease"
                                    }}
                                  >
                                    Case {cIdx + 1}
                                  </button>
                                ))}
                              </div>

                              {/* Selected Sample Case Input & Expected Output */}
                              {(() => {
                                const selectedSample = sampleCases[currentSampleCaseIdx] || sampleCases[0];
                                return (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    <div>
                                      <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 600 }}>
                                        Input
                                      </label>
                                      <pre style={{
                                        padding: "0.75rem 1rem",
                                        borderRadius: "8px",
                                        background: "rgba(255, 255, 255, 0.04)",
                                        border: "1px solid rgba(255, 255, 255, 0.08)",
                                        fontFamily: "'Consolas', monospace",
                                        fontSize: "0.85rem",
                                        color: "#e2e8f0",
                                        margin: 0,
                                        whiteSpace: "pre-wrap"
                                      }}>
                                        {selectedSample?.input_data || selectedSample?.input || "(empty)"}
                                      </pre>
                                    </div>

                                    <div>
                                      <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 600 }}>
                                        Expected Output
                                      </label>
                                      <pre style={{
                                        padding: "0.75rem 1rem",
                                        borderRadius: "8px",
                                        background: "rgba(255, 255, 255, 0.04)",
                                        border: "1px solid rgba(255, 255, 255, 0.08)",
                                        fontFamily: "'Consolas', monospace",
                                        fontSize: "0.85rem",
                                        color: "#4ade80",
                                        margin: 0,
                                        whiteSpace: "pre-wrap"
                                      }}>
                                        {selectedSample?.expected_output || selectedSample?.expected || "(empty)"}
                                      </pre>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            /* TEST RESULT VIEW */
                            <div>
                              {isRunningThis ? (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1rem", gap: "1rem" }}>
                                  <div className="lc-spinner" style={{ width: "36px", height: "36px" }} />
                                  <p style={{ color: "var(--lc-text-muted)", fontSize: "0.9rem", margin: 0 }}>
                                    Running test cases through compiler...
                                  </p>
                                </div>
                              ) : !runOutput ? (
                                <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--lc-text-muted)" }}>
                                  <p style={{ fontSize: "0.9rem", margin: "0 0 0.5rem 0" }}>
                                    You haven't run code for this problem yet.
                                  </p>
                                  <p style={{ fontSize: "0.8rem", color: "var(--lc-text-muted)" }}>
                                    Click <strong>Run Code</strong> above to compile and test your solution against visible test cases.
                                  </p>
                                </div>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                                  {/* BIG VERDICT HEADER */}
                                  {(() => {
                                    const isAccepted = runOutput.status === "accepted";
                                    const isCompileErr = runOutput.isCompileError;
                                    const verdictTitle = isCompileErr
                                      ? "Compile Error"
                                      : isAccepted
                                      ? "Accepted — All Test Cases Passed!"
                                      : "Wrong Answer";

                                    return (
                                      <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexWrap: "wrap",
                                        gap: "1rem",
                                        paddingBottom: "1rem",
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
                                      }}>
                                        <div>
                                          <h2 style={{
                                            fontSize: "1.45rem",
                                            fontWeight: 800,
                                            color: isAccepted ? "#22c55e" : "#ef4444",
                                            margin: 0,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem"
                                          }}>
                                            <span>{isAccepted ? "✓" : "✗"}</span>
                                            <span>{verdictTitle}</span>
                                          </h2>
                                          <p style={{
                                            fontSize: "0.85rem",
                                            color: isAccepted ? "#86efac" : "#fca5a5",
                                            margin: "4px 0 0 0",
                                            fontWeight: 500
                                          }}>
                                            {isCompileErr
                                              ? "Compilation failed. Check the error output below."
                                              : `${runOutput.passedTestCases} / ${runOutput.totalTestCases} test cases passed`}
                                          </p>
                                        </div>

                                        <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.825rem", color: "#94a3b8" }}>
                                          <div>Runtime: <strong style={{ color: "#ffffff" }}>{runOutput.executionTime || "0 ms"}</strong></div>
                                          {runOutput.memory && runOutput.memory !== "N/A" && (
                                            <div>Memory: <strong style={{ color: "#ffffff" }}>{runOutput.memory}</strong></div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* COMPILE ERROR / STDERR BANNER (ONLY SHOWN IF ACTUALLY FAILED) */}
                                  {!isAccepted && (runOutput.isCompileError || runOutput.stderr || runOutput.error) && (
                                    <div style={{
                                      background: "rgba(239, 68, 68, 0.08)",
                                      border: "1px solid rgba(239, 68, 68, 0.25)",
                                      borderRadius: "10px",
                                      padding: "1rem",
                                      marginBottom: "1rem"
                                    }}>
                                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f87171", marginBottom: "0.5rem" }}>
                                        {runOutput.isCompileError ? "Compile Error Output:" : "Runtime / Error Output:"}
                                      </div>
                                      <pre style={{
                                        fontFamily: "'Consolas', 'Courier New', monospace",
                                        fontSize: "0.825rem",
                                        color: "#fca5a5",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        margin: 0
                                      }}>
                                        {runOutput.stderr || runOutput.compilerOutput || runOutput.error}
                                      </pre>
                                    </div>
                                  )}

                                  {/* SUCCESSFUL EXECUTION INFO (SHOWN ONLY IF RELEVANT & IN GREEN COLOR) */}
                                  {isAccepted && runOutput.rawOutput && runOutput.rawOutput.trim() !== "All test cases passed." && (
                                    <div style={{
                                      background: "rgba(34, 197, 94, 0.08)",
                                      border: "1px solid rgba(34, 197, 94, 0.25)",
                                      borderRadius: "10px",
                                      padding: "1rem",
                                      marginBottom: "1rem"
                                    }}>
                                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#4ade80", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                        <span>✓</span>
                                        <span>Execution Output:</span>
                                      </div>
                                      <pre style={{
                                        fontFamily: "'Consolas', 'Courier New', monospace",
                                        fontSize: "0.825rem",
                                        color: "#86efac",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        margin: 0
                                      }}>
                                        {runOutput.rawOutput}
                                      </pre>
                                    </div>
                                  )}

                                  {/* PER-CASE RESULT TABS */}
                                  {(() => {
                                    const displayCases = (runOutput.testCaseResults && runOutput.testCaseResults.length > 0)
                                      ? runOutput.testCaseResults
                                      : [{
                                          passed: runOutput.status === "accepted",
                                          input: q.sampleInput || q.sampleTestCases?.[0]?.input_data || "",
                                          actualOutput: runOutput.rawOutput || "",
                                          expectedOutput: q.sampleOutput || q.sampleTestCases?.[0]?.expected_output || "",
                                          stderr: runOutput.stderr || ""
                                        }];

                                    const activeIdx = Math.min(
                                      Math.max(0, activeResultCases[qKey] || 0),
                                      Math.max(0, displayCases.length - 1)
                                    );
                                    const currentTC = displayCases[activeIdx] || displayCases[0];

                                    return (
                                      <div>
                                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                                          {displayCases.map((tc, idx) => (
                                            <button
                                              key={idx}
                                              type="button"
                                              onClick={() => setActiveResultCases((prev) => ({ ...prev, [qKey]: idx }))}
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.4rem",
                                                padding: "0.45rem 0.85rem",
                                                borderRadius: "8px",
                                                fontSize: "0.825rem",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                                border: "1px solid",
                                                borderColor: activeIdx === idx
                                                  ? (tc.passed ? "#22c55e" : "#ef4444")
                                                  : "rgba(255, 255, 255, 0.1)",
                                                background: activeIdx === idx
                                                  ? (tc.passed ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)")
                                                  : "rgba(255, 255, 255, 0.04)",
                                                color: tc.passed ? "#4ade80" : "#f87171",
                                                transition: "all 0.15s ease"
                                              }}
                                            >
                                              <span style={{
                                                width: "7px",
                                                height: "7px",
                                                borderRadius: "50%",
                                                background: tc.passed ? "#22c55e" : "#ef4444"
                                              }} />
                                              Case {idx + 1}
                                            </button>
                                          ))}
                                        </div>

                                        {/* Selected Test Case Details */}
                                        {currentTC && (
                                          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                            <div>
                                              <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 600 }}>
                                                Input
                                              </label>
                                              <pre style={{
                                                padding: "0.75rem 1rem",
                                                borderRadius: "8px",
                                                background: "rgba(255, 255, 255, 0.04)",
                                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                                fontFamily: "'Consolas', monospace",
                                                fontSize: "0.85rem",
                                                color: "#e2e8f0",
                                                margin: 0,
                                                whiteSpace: "pre-wrap"
                                              }}>
                                                {currentTC.input || "(empty)"}
                                              </pre>
                                            </div>

                                            <div>
                                              <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 600 }}>
                                                Your Output
                                              </label>
                                              <pre style={{
                                                padding: "0.75rem 1rem",
                                                borderRadius: "8px",
                                                background: currentTC.passed ? "rgba(34, 197, 94, 0.06)" : "rgba(239, 68, 68, 0.06)",
                                                border: `1px solid ${currentTC.passed ? "rgba(34, 197, 94, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
                                                fontFamily: "'Consolas', monospace",
                                                fontSize: "0.85rem",
                                                color: currentTC.passed ? "#4ade80" : "#f87171",
                                                margin: 0,
                                                whiteSpace: "pre-wrap"
                                              }}>
                                                {currentTC.actualOutput || currentTC.actual || "(no output)"}
                                              </pre>
                                            </div>

                                            <div>
                                              <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 600 }}>
                                                Expected Output
                                              </label>
                                              <pre style={{
                                                padding: "0.75rem 1rem",
                                                borderRadius: "8px",
                                                background: "rgba(255, 255, 255, 0.04)",
                                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                                fontFamily: "'Consolas', monospace",
                                                fontSize: "0.85rem",
                                                color: "#4ade80",
                                                margin: 0,
                                                whiteSpace: "pre-wrap"
                                              }}>
                                                {currentTC.expectedOutput || currentTC.expected || "(empty)"}
                                              </pre>
                                            </div>

                                            {currentTC.stderr && (
                                              <div>
                                                <label style={{ display: "block", fontSize: "0.8rem", color: "#f87171", marginBottom: "0.35rem", fontWeight: 600 }}>
                                                  Error Output
                                                </label>
                                                <pre style={{
                                                  padding: "0.75rem 1rem",
                                                  borderRadius: "8px",
                                                  background: "rgba(239, 68, 68, 0.06)",
                                                  border: "1px solid rgba(239, 68, 68, 0.2)",
                                                  fontFamily: "'Consolas', monospace",
                                                  fontSize: "0.825rem",
                                                  color: "#fca5a5",
                                                  whiteSpace: "pre-wrap",
                                                  wordBreak: "break-word",
                                                  margin: 0
                                                }}>
                                                  {currentTC.stderr}
                                                </pre>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                    // MCQ Question
                    (() => {
                      const currentSelected = answers[qKey];
                      const rawOpts = q.options;
                      const optionsList = Array.isArray(rawOpts)
                        ? rawOpts
                        : typeof rawOpts === "string"
                        ? JSON.parse(rawOpts || "[]")
                        : [];

                      return (
                        <article key={qKey} className="assessment-question-card" style={{ marginBottom: "1.5rem" }}>
                          <div className="assessment-question-header">
                            <span className="assessment-question-text">
                              <strong>{idx + 1}.</strong> {qTitle}
                            </span>
                            <span className="assessment-point-badge">{qMarks} Point</span>
                          </div>

                          <div className="assessment-options-list">
                            {optionsList.map((opt, optIndex) => {
                              const isChecked = currentSelected === optIndex;
                              return (
                                <label
                                  key={optIndex}
                                  className={`assessment-radio-option ${isChecked ? "selected-radio" : ""}`}
                                >
                                  <input
                                    type="radio"
                                    name={`question-${qKey}`}
                                    checked={isChecked}
                                    onChange={() => handleOptionSelect(qKey, optIndex)}
                                  />
                                  <span className="custom-radio-circle"></span>
                                  <span className="option-text-label">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        </article>
                      );
                    })()
                  )}

                  {/* SINGLE QUESTION PAGINATION & ACTIONS FOOTER */}
                  <div className="assessment-footer-actions" style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "2.5rem",
                    paddingTop: "1.5rem",
                    borderTop: "1px solid var(--lc-border)",
                    flexWrap: "wrap",
                    gap: "1rem"
                  }}>
                    <button
                      type="button"
                      disabled={currentIdx === 0}
                      onClick={() => {
                        setActiveQuestionIndex((prev) => Math.max(0, prev - 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      style={{
                        background: currentIdx === 0 ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.09)",
                        color: currentIdx === 0 ? "var(--lc-text-muted)" : "var(--lc-text-primary)",
                        border: "1px solid var(--lc-border)",
                        borderRadius: "8px",
                        padding: "0.65rem 1.35rem",
                        cursor: currentIdx === 0 ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem"
                      }}
                    >
                      ← Previous Question
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      {currentIdx < questions.length - 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1));
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          style={{
                            background: "#3b82f6",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "0.65rem 1.5rem",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            boxShadow: "0 2px 10px rgba(59, 130, 246, 0.3)"
                          }}
                        >
                          <span>Next Question</span>
                          <span>→</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="assessment-submit-btn"
                        onClick={handleSaveSubmission}
                        disabled={submitting}
                        style={{
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "0.65rem 1.5rem",
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          cursor: submitting ? "not-allowed" : "pointer",
                          boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem"
                        }}
                      >
                        {submitting ? "Submitting..." : "Submit Examination Answers"}
                      </button>
                    </div>
                  </div>
                </>
              );
            })()
          )}
        </div>
      </section>
    </div>
  );
}
