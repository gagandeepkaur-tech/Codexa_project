import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../utils/api";
import { getAdminSession, getFacultySession } from "../../utils/session";
import CsvQuestionImporter from "../../components/CsvQuestionImporter";

export default function CreateAssignmentPage({ role }) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const session = role === "admin" ? getAdminSession() : getFacultySession();

  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    dueDate: "",
    timeLimitMinutes: "",
    maxScore: 100,
    status: "published"
  });

  const [questions, setQuestions] = useState([]);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const backLink = role === "admin" ? `/admin/courses/${courseId}` : `/faculty/courses/${courseId}`;

  const addMcq = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        type: "mcq",
        questionText: "",
        options: ["", "", "", ""],
        correctOptionIndex: 0,
        marks: 1,
        negativeMarks: 0
      }
    ]);
  };

  const addCoding = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        type: "coding",
        title: "",
        statement: "",
        difficulty: "medium",
        inputFormat: "",
        outputFormat: "",
        constraintsText: "",
        examplesText: "",
        marks: 10
      }
    ]);
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const updateOption = (qId, optionIndex, value) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiRequest(
        `/courses/${courseId}/assignments`,
        {
          method: "POST",
          body: JSON.stringify({ ...form, questions })
        },
        session?.token
      );
      navigate(backLink);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <Link to={backLink} className="auth-button student-button" style={{ display: "inline-block", marginBottom: "1rem" }}>← Back to Course</Link>
      <h1>Create New Assignment</h1>
      {error && <p className="form-status error">{error}</p>}
      
      <form onSubmit={handleSubmit} className="auth-form" style={{ maxWidth: "100%", padding: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label className="auth-label">Title</label>
            <input type="text" className="auth-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
          </div>
          <div>
            <label className="auth-label">Status</label>
            <select className="auth-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="auth-label">Start Date</label>
            <input type="datetime-local" className="auth-input" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
          </div>
          <div>
            <label className="auth-label">Due Date</label>
            <input type="datetime-local" className="auth-input" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="auth-label">Description</label>
            <textarea className="auth-input" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ margin: 0 }}>Questions ({questions.length})</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" className="auth-button admin-button" onClick={addMcq}>+ Add MCQ Manually</button>
            <button type="button" className="auth-button faculty-button" onClick={addCoding}>+ Add Coding Question Manually</button>
            <button
              type="button"
              className="auth-button"
              onClick={() => setShowCsvImport(!showCsvImport)}
              style={{
                background: showCsvImport ? "rgba(255, 126, 41, 0.2)" : "rgba(255, 255, 255, 0.08)",
                color: showCsvImport ? "#ff7e29" : "#fff",
                border: "1px solid",
                borderColor: showCsvImport ? "#ff7e29" : "var(--lc-border)"
              }}
            >
              📄 {showCsvImport ? "Close CSV Importer" : "Import from CSV"}
            </button>
          </div>
        </div>

        {showCsvImport && (
          <CsvQuestionImporter
            onImport={(imported) => {
              setQuestions([...questions, ...imported]);
              setShowCsvImport(false);
            }}
            targetLabel="Assignment"
            allowedTypes="all"
          />
        )}

        {questions.map((q, index) => (
          <div key={q.id} style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem", borderRadius: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>{index + 1}. {q.type === 'mcq' ? "Multiple Choice" : "Coding Problem"}</h3>
              <button type="button" style={{ color: "red", background: "transparent", border: "none", cursor: "pointer" }} onClick={() => removeQuestion(q.id)}>Remove</button>
            </div>

            {q.type === 'mcq' && (
              <>
                <label className="auth-label">Question Text</label>
                <textarea className="auth-input" rows={2} value={q.questionText} onChange={e => updateQuestion(q.id, 'questionText', e.target.value)} required />
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "1rem" }}>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input type="radio" name={`correct-${q.id}`} checked={q.correctOptionIndex === oIdx} onChange={() => updateQuestion(q.id, 'correctOptionIndex', oIdx)} />
                      <input type="text" className="auth-input" style={{ margin: 0 }} placeholder={`Option ${oIdx + 1}`} value={opt} onChange={e => updateOption(q.id, oIdx, e.target.value)} required />
                    </div>
                  ))}
                </div>
              </>
            )}

            {q.type === 'coding' && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                 <label className="auth-label">Problem Title</label>
                 <input type="text" className="auth-input" value={q.title} onChange={e => updateQuestion(q.id, 'title', e.target.value)} required />
                 
                 <label className="auth-label">Problem Statement</label>
                 <textarea className="auth-input" rows={3} value={q.statement} onChange={e => updateQuestion(q.id, 'statement', e.target.value)} required />
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
               <div>
                  <label className="auth-label" style={{ fontSize: "0.8rem" }}>Marks</label>
                  <input type="number" className="auth-input" value={q.marks} onChange={e => updateQuestion(q.id, 'marks', Number(e.target.value))} />
               </div>
               {q.type === 'mcq' && (
                  <div>
                    <label className="auth-label" style={{ fontSize: "0.8rem" }}>Negative Marks</label>
                    <input type="number" className="auth-input" value={q.negativeMarks} onChange={e => updateQuestion(q.id, 'negativeMarks', Number(e.target.value))} />
                  </div>
               )}
            </div>
          </div>
        ))}

        <div style={{ marginTop: "2rem" }}>
          <button type="submit" className="auth-button" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Saving..." : "Create Assignment"}
          </button>
        </div>
      </form>
    </div>
  );
}
