import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../utils/api";
import { getStudentSession } from "../../utils/session";
import {
  enterFullScreen,
  exitFullScreen,
  toggleFullScreen,
  isFullscreenActive,
  subscribeToFullscreenChange
} from "../../utils/fullscreen";

export default function AssignmentAttemptPage() {
  const { courseId, assignmentId } = useParams();
  const navigate = useNavigate();
  const session = getStudentSession();

  const [assignment, setAssignment] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    enterFullScreen().catch(() => {});
    const unsubscribe = subscribeToFullscreenChange((active) => {
      setIsFullScreen(active);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function initAttempt() {
      try {
        const asgRes = await apiRequest(`/assignments/${assignmentId}`, {}, session?.token);
        setAssignment(asgRes);
        
        const attRes = await apiRequest(`/assignments/${assignmentId}/start`, { method: "POST" }, session?.token);
        setAttempt(attRes);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
    initAttempt();
  }, [assignmentId, session?.token]);

  const handleSaveProgress = async (questionId, type, answerData) => {
    setSaving(true);
    setAnswers(prev => ({ ...prev, [questionId]: answerData }));
    
    try {
      await apiRequest(
        `/assignments/${assignmentId}/save-progress`,
        {
          method: "POST",
          body: JSON.stringify({
            attemptId: attempt.id,
            questionId,
            type,
            answer: answerData
          })
        },
        session?.token
      );
    } catch (err) {
      console.error("Failed to save progress", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAttempt = async () => {
    if (!window.confirm("Are you sure you want to submit? You cannot change your answers after submitting.")) return;
    setLoading(true);
    
    try {
      await apiRequest(
        `/assignments/${assignmentId}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ attemptId: attempt.id })
        },
        session?.token
      );
      await exitFullScreen();
      navigate(`/student/courses/${courseId}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleBackToCourse = async () => {
    await exitFullScreen();
    navigate(`/student/courses/${courseId}`);
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading assignment...</div>;
  if (error) return <div className="form-status error">{error}</div>;
  if (!assignment || !assignment.questions?.length) return <div>No questions in this assignment.</div>;

  const currentQ = assignment.questions[currentQuestionIndex];

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar Navigation */}
      <div style={{ width: "250px", background: "#f8fafc", padding: "1rem", borderRight: "1px solid #e2e8f0", overflowY: "auto" }}>
        <button
          onClick={handleBackToCourse}
          style={{ background: "none", border: "none", color: "#0284c7", cursor: "pointer", padding: 0, marginBottom: "1rem", textAlign: "left", fontSize: "0.9rem" }}
        >
          ← Back to Course
        </button>

        <button
          type="button"
          onClick={() => toggleFullScreen()}
          style={{
            marginBottom: "1rem",
            width: "100%",
            padding: "0.45rem 0.75rem",
            background: isFullScreen ? "rgba(16, 185, 129, 0.12)" : "#e2e8f0",
            color: isFullScreen ? "#10b981" : "#334155",
            border: isFullScreen ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid #cbd5e1",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.825rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem"
          }}
        >
          <span>{isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}</span>
          <span>⛶</span>
        </button>

        <h3 style={{ marginBottom: "1rem" }}>{assignment.title}</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {assignment.questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(idx)}
              style={{
                padding: "0.75rem",
                textAlign: "left",
                background: currentQuestionIndex === idx ? "#e0f2fe" : "white",
                border: currentQuestionIndex === idx ? "1px solid #38bdf8" : "1px solid #cbd5e1",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Q{idx + 1}: {q.type === 'mcq' ? 'Multiple Choice' : 'Coding'}
              {answers[q.id] && <span style={{ float: "right", color: "green" }}>✓</span>}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "2rem" }}>
          <button onClick={handleSubmitAttempt} className="auth-button" style={{ width: "100%", background: "#ef4444" }}>
            Submit Assignment
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h2>Question {currentQuestionIndex + 1} of {assignment.questions.length} <span style={{ fontSize: "1rem", color: "#64748b" }}>({currentQ.marks} Marks)</span></h2>
          {saving && <span style={{ color: "#38bdf8" }}>Saving progress...</span>}
        </div>

        <div style={{ background: "white", padding: "2rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          {currentQ.type === 'mcq' ? (
            <div>
              <p style={{ fontSize: "1.1rem", marginBottom: "1.5rem" }}>{currentQ.questionText}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {currentQ.options.map((opt, oIdx) => (
                  <label key={oIdx} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer", background: answers[currentQ.id] === oIdx ? "#f0f9ff" : "white" }}>
                    <input 
                      type="radio" 
                      name={`q-${currentQ.id}`} 
                      checked={answers[currentQ.id] === oIdx}
                      onChange={() => handleSaveProgress(currentQ.id, 'mcq', oIdx)}
                      style={{ transform: "scale(1.2)" }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.5rem",
              alignItems: "start"
            }}>
              <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <h3 style={{ marginTop: 0 }}>{currentQ.title}</h3>
                <p style={{ whiteSpace: "pre-wrap", margin: "1rem 0", lineHeight: 1.6, color: "#334155" }}>{currentQ.statement}</p>
                {currentQ.inputFormat && (
                  <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    <strong>Input Format:</strong> {currentQ.inputFormat}
                  </p>
                )}
                {currentQ.outputFormat && (
                  <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    <strong>Output Format:</strong> {currentQ.outputFormat}
                  </p>
                )}
                {currentQ.constraintsText && (
                  <p style={{ fontSize: "0.85rem", color: "#f59e0b" }}>
                    <strong>Constraints:</strong> <code>{currentQ.constraintsText}</code>
                  </p>
                )}
              </div>
              
              <div>
                <label className="auth-label">Your Code (Language: JavaScript)</label>
                <textarea 
                  className="auth-input" 
                  rows={18}
                  style={{ fontFamily: "monospace", background: "#1e293b", color: "#f8fafc", width: "100%", height: "420px" }}
                  value={answers[currentQ.id]?.code || ""}
                  onChange={e => handleSaveProgress(currentQ.id, 'coding', { language: 'javascript', code: e.target.value })}
                  placeholder="// Write your code here..."
                />
              </div>
            </div>
          )}
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem" }}>
          <button 
            className="auth-button student-button" 
            disabled={currentQuestionIndex === 0} 
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
          >
            Previous
          </button>
          
          <button 
            className="auth-button student-button" 
            disabled={currentQuestionIndex === assignment.questions.length - 1} 
            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
