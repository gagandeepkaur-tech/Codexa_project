import { useState, useRef } from "react";
import { parseQuestionsCsv, downloadSampleCsv } from "../utils/csvQuestionParser";

export default function CsvQuestionImporter({
  onImport,
  targetLabel = "Assessment",
  allowedTypes = "all", // "all" | "mcq" | "coding"
  isSubmitting = false
}) {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [inputMode, setInputMode] = useState("file"); // "file" | "paste"
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleProcessCsv = (text, name = "") => {
    setCsvText(text);
    if (name) setFileName(name);
    const result = parseQuestionsCsv(text);

    // If allowedTypes is filtered, filter questions
    if (allowedTypes !== "all") {
      result.questions = result.questions.filter((q) => q.type === allowedTypes);
      result.total = result.questions.length;
      result.mcqCount = result.questions.filter((q) => q.type === "mcq").length;
      result.codingCount = result.questions.filter((q) => q.type === "coding").length;
    }

    setParsedData(result);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        handleProcessCsv(text, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === "string") {
          handleProcessCsv(text, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleClear = () => {
    setCsvText("");
    setFileName("");
    setParsedData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = () => {
    if (!parsedData || parsedData.questions.length === 0) return;
    onImport(parsedData.questions);
  };

  return (
    <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--lc-border)", borderRadius: "12px", padding: "1.25rem", margin: "1rem 0" }}>
      {/* Top Header & Template Download Links */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--lc-text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>📄</span> Import Questions from CSV
          </h3>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "var(--lc-text-muted)" }}>
            Upload or paste CSV with multiple-choice questions, coding challenges, or both.
          </p>
        </div>

        {/* Template Downloads */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {allowedTypes !== "coding" && (
            <button
              type="button"
              onClick={() => downloadSampleCsv("mcq")}
              style={{
                background: "rgba(56, 189, 248, 0.12)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                padding: "0.35rem 0.65rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
              title="Download sample CSV format for Multiple Choice Questions"
            >
              📥 Sample MCQ CSV
            </button>
          )}

          {allowedTypes !== "mcq" && (
            <button
              type="button"
              onClick={() => downloadSampleCsv("coding")}
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "0.35rem 0.65rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
              title="Download sample CSV format for Coding Problems"
            >
              📥 Sample Coding CSV
            </button>
          )}

          {allowedTypes === "all" && (
            <button
              type="button"
              onClick={() => downloadSampleCsv("mixed")}
              style={{
                background: "rgba(249, 115, 22, 0.12)",
                color: "#f97316",
                border: "1px solid rgba(249, 115, 22, 0.3)",
                padding: "0.35rem 0.65rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
              title="Download sample CSV with both MCQ and Coding Problems"
            >
              📥 Sample Mixed CSV
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher: File Upload vs Direct Paste */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <button
          type="button"
          onClick={() => setInputMode("file")}
          style={{
            padding: "0.35rem 0.8rem",
            borderRadius: "6px",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            background: inputMode === "file" ? "var(--lc-accent, #ff7e29)" : "rgba(255, 255, 255, 0.05)",
            color: inputMode === "file" ? "#fff" : "var(--lc-text-muted)",
            border: "1px solid",
            borderColor: inputMode === "file" ? "var(--lc-accent, #ff7e29)" : "var(--lc-border)"
          }}
        >
          📁 Upload File
        </button>
        <button
          type="button"
          onClick={() => setInputMode("paste")}
          style={{
            padding: "0.35rem 0.8rem",
            borderRadius: "6px",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            background: inputMode === "paste" ? "var(--lc-accent, #ff7e29)" : "rgba(255, 255, 255, 0.05)",
            color: inputMode === "paste" ? "#fff" : "var(--lc-text-muted)",
            border: "1px solid",
            borderColor: inputMode === "paste" ? "var(--lc-accent, #ff7e29)" : "var(--lc-border)"
          }}
        >
          📋 Paste CSV Text
        </button>
      </div>

      {/* Upload Zone */}
      {inputMode === "file" ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: dragActive ? "2px dashed #ff7e29" : "2px dashed var(--lc-border)",
            background: dragActive ? "rgba(255, 126, 41, 0.08)" : "rgba(0, 0, 0, 0.15)",
            borderRadius: "10px",
            padding: "1.5rem",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>📊</div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", color: "var(--lc-text-primary)" }}>
            {fileName ? `Selected: ${fileName}` : "Click to browse or drop CSV file here"}
          </p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--lc-text-muted)" }}>
            Supports comma-separated `.csv` with MCQ columns (option_a..d, correct_option) and/or Coding columns (statement, input/output, sample cases).
          </p>
        </div>
      ) : (
        <div>
          <textarea
            rows="5"
            placeholder="Paste your CSV content here (including header row)..."
            value={csvText}
            onChange={(e) => handleProcessCsv(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(0, 0, 0, 0.25)",
              color: "var(--lc-text-primary)",
              border: "1px solid var(--lc-border)",
              borderRadius: "8px",
              padding: "0.75rem",
              fontFamily: "monospace",
              fontSize: "0.8rem",
              resize: "vertical"
            }}
          />
        </div>
      )}

      {/* Errors banner if any */}
      {parsedData?.errors?.length > 0 && (
        <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.8rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: "0.8rem" }}>
          <strong>Notice:</strong>
          <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0 }}>
            {parsedData.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Parsed Preview Table */}
      {parsedData && parsedData.questions.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--lc-text-primary)" }}>
                Parsed Questions Preview ({parsedData.total})
              </span>
              {parsedData.mcqCount > 0 && (
                <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                  🔘 {parsedData.mcqCount} MCQ
                </span>
              )}
              {parsedData.codingCount > 0 && (
                <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                  💻 {parsedData.codingCount} Coding
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleClear}
              style={{ background: "transparent", border: "none", color: "#f87171", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}
            >
              Clear
            </button>
          </div>

          <div style={{ maxHeight: "280px", overflowY: "auto", border: "1px solid var(--lc-border)", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.05)", borderBottom: "1px solid var(--lc-border)", color: "var(--lc-text-muted)" }}>
                  <th style={{ padding: "0.5rem 0.6rem" }}>#</th>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Type</th>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Title / Question</th>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Key Details</th>
                  <th style={{ padding: "0.5rem 0.6rem" }}>Marks</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.questions.map((q, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--lc-text-muted)", fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: "0.5rem 0.6rem" }}>
                      {q.type === "mcq" ? (
                        <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 700, fontSize: "0.7rem" }}>
                          MCQ
                        </span>
                      ) : (
                        <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 700, fontSize: "0.7rem" }}>
                          CODE
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--lc-text-primary)", fontWeight: 600, maxWidth: "240px" }}>
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {q.type === "mcq" ? q.questionText : q.title}
                      </div>
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--lc-text-muted)", fontSize: "0.72rem" }}>
                      {q.type === "mcq" ? (
                        <span>
                          {q.options?.length || 0} options | Correct: <strong>Option {String.fromCharCode(65 + (q.correctOptionIndex || 0))}</strong>
                        </span>
                      ) : (
                        <span>
                          Diff: <strong style={{ textTransform: "capitalize" }}>{q.difficulty}</strong>
                          {q.sampleInput ? " | Sample Cases ✓" : ""}
                          {q.hiddenInput ? " | Hidden Cases ✓" : ""}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--lc-text-primary)", fontWeight: 700 }}>
                      {q.marks} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import Action Bar */}
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isSubmitting || parsedData.questions.length === 0}
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "0.6rem 1.4rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <span>📥</span>
              <span>{isSubmitting ? "Importing Questions..." : `Import ${parsedData.questions.length} Questions into ${targetLabel}`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
