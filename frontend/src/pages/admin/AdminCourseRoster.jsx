import { useEffect, useState } from "react";
import { Download, Upload, UserPlus } from "lucide-react";
import { PlatformSection } from "../../components/PlatformLayout/PlatformLayout";
import { apiRequest } from "../../utils/api";
import { getAdminSession } from "../../utils/session";

function parseCsv(text) {
  const records = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) records.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error("The CSV has an unterminated quoted value.");
  row.push(value.trim());
  if (row.some(Boolean)) records.push(row);
  if (records.length < 2) throw new Error("The CSV must contain a header and at least one student row.");

  const normalizeHeader = (header) => header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const headers = records[0].map(normalizeHeader);
  const crnIndex = headers.findIndex((header) => ["crn", "username", "roll_number", "rollnumber"].includes(header));
  if (crnIndex < 0) throw new Error("Add a CRN column to the CSV. A header named CRN is recommended.");

  const fieldIndex = (aliases) => headers.findIndex((header) => aliases.includes(header));
  return records.slice(1).map((values) => ({
    crn: values[crnIndex] || "",
    fullName: values[fieldIndex(["full_name", "fullname", "name"])] || "",
    branch: values[fieldIndex(["branch", "department"])] || "",
    semester: values[fieldIndex(["semester", "sem"])] || "",
    section: values[fieldIndex(["section", "class_section"])] || "",
    batch: values[fieldIndex(["batch", "academic_batch"])] || ""
  })).filter((student) => student.crn);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export default function AdminCourseRoster() {
  const session = getAdminSession();
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [roster, setRoster] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importRows, setImportRows] = useState([]);
  const [username, setUsername] = useState("");
  const [credentials, setCredentials] = useState([]);
  const [status, setStatus] = useState({ loading: true, busy: false, message: "", error: "" });

  useEffect(() => {
    let mounted = true;
    apiRequest("/courses", {}, session?.token)
      .then((data) => {
        if (!mounted) return;
        const activeCourses = Array.isArray(data) ? data : [];
        setCourses(activeCourses);
        setCourseId(activeCourses[0]?.id || "");
        setStatus((current) => ({ ...current, loading: false }));
      })
      .catch((error) => {
        if (mounted) setStatus((current) => ({ ...current, loading: false, error: error.message }));
      });
    return () => { mounted = false; };
  }, [session?.token]);

  useEffect(() => {
    if (!courseId || !session?.token) {
      setRoster([]);
      return;
    }
    let mounted = true;
    apiRequest(`/courses/${courseId}/enrollments`, {}, session.token)
      .then((data) => { if (mounted) setRoster(Array.isArray(data) ? data : []); })
      .catch((error) => { if (mounted) setStatus((current) => ({ ...current, error: error.message })); });
    return () => { mounted = false; };
  }, [courseId, session?.token]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    setFileName(file?.name || "");
    setImportRows([]);
    setCredentials([]);
    setStatus((current) => ({ ...current, message: "", error: "" }));
    if (!file) return;

    try {
      const rows = parseCsv(await file.text());
      if (rows.length === 0) throw new Error("No CRNs were found in the CSV.");
      if (rows.length > 500) throw new Error("Import up to 500 students at a time.");
      const seen = new Set();
      for (const student of rows) {
        const crn = student.crn.trim().toLowerCase();
        if (seen.has(crn)) throw new Error(`Duplicate CRN in CSV: ${student.crn}`);
        seen.add(crn);
      }
      setImportRows(rows);
    } catch (error) {
      setStatus((current) => ({ ...current, error: error.message }));
    }
  }

  async function refreshRoster() {
    const data = await apiRequest(`/courses/${courseId}/enrollments`, {}, session.token);
    setRoster(Array.isArray(data) ? data : []);
  }

  async function handleImport() {
    if (!courseId || !importRows.length) return;
    setStatus({ loading: false, busy: true, message: "", error: "" });
    setCredentials([]);
    try {
      const result = await apiRequest(`/courses/${courseId}/enrollments/import`, {
        method: "POST",
        body: JSON.stringify({ students: importRows })
      }, session.token);
      setCredentials(result.credentials || []);
      setImportRows([]);
      setFileName("");
      setStatus({ loading: false, busy: false, message: result.message, error: "" });
      await refreshRoster();
    } catch (error) {
      setStatus({ loading: false, busy: false, message: "", error: error.message });
    }
  }

  async function handleAddStudent(event) {
    event.preventDefault();
    if (!courseId || !username.trim()) return;
    setStatus({ loading: false, busy: true, message: "", error: "" });
    try {
      const result = await apiRequest(`/courses/${courseId}/enrollments`, {
        method: "POST",
        body: JSON.stringify({ username })
      }, session.token);
      setUsername("");
      setStatus({ loading: false, busy: false, message: result.message, error: "" });
      await refreshRoster();
    } catch (error) {
      setStatus({ loading: false, busy: false, message: "", error: error.message });
    }
  }

  function downloadCredentials() {
    const csv = [
      ["username", "password", "full_name"].map(csvCell).join(","),
      ...credentials.map((student) => [student.username, student.password, student.fullName].map(csvCell).join(","))
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-credentials.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setCredentials([]);
  }

  return (
    <PlatformSection label="Course access" title="Manage course roster">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", alignItems: "end" }}>
        <div>
          <label className="platform-field-label" htmlFor="roster-course">Course</label>
          <select id="roster-course" className="roster-filter-select" style={{ width: "100%" }} value={courseId} onChange={(event) => {
            setCourseId(event.target.value);
            setCredentials([]);
            setStatus((current) => ({ ...current, message: "", error: "" }));
          }} disabled={status.loading || courses.length === 0}>
            {courses.length === 0 && <option value="">{status.loading ? "Loading courses..." : "No courses available"}</option>}
            {courses.map((course) => <option key={course.id} value={course.id}>{course.code} - {course.title}</option>)}
          </select>
        </div>
        <form className="auth-form" onSubmit={handleAddStudent} style={{ display: "flex", alignItems: "end", gap: "0.6rem", marginTop: 0 }}>
          <div style={{ flex: 1 }}>
            <label className="platform-field-label" htmlFor="roster-username">Add existing student by CRN</label>
            <input id="roster-username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="2421002" />
          </div>
          <button className="compact-btn compact-btn-primary" type="submit" disabled={!courseId || status.busy} title="Add student to course">
            <UserPlus size={16} aria-hidden="true" /> Add
          </button>
        </form>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "1rem", alignItems: "end" }}>
        <div>
          <label className="platform-field-label" htmlFor="roster-csv">Import students from CSV</label>
          <input id="roster-csv" className="roster-search-input" style={{ paddingLeft: "0.85rem" }} type="file" accept=".csv,text/csv" onChange={handleFileChange} />
          <small style={{ display: "block", marginTop: "0.35rem", opacity: 0.72 }}>Required column: CRN. Optional: full_name, branch, semester, section, batch. Maximum 500 students.</small>
        </div>
        <button className="compact-btn compact-btn-primary" type="button" onClick={handleImport} disabled={!courseId || !importRows.length || status.busy}>
          <Upload size={16} aria-hidden="true" /> {status.busy ? "Working..." : `Import ${importRows.length || "students"}`}
        </button>
      </div>

      {fileName && <p style={{ margin: "0.65rem 0 0", fontSize: "0.85rem" }}>{fileName}{importRows.length ? ` · ${importRows.length} student${importRows.length === 1 ? "" : "s"} ready` : ""}</p>}
      {status.error && <p className="form-status error" role="alert">{status.error}</p>}
      {status.message && <p className="form-status success" role="status">{status.message}</p>}

      {credentials.length > 0 && (
        <div className="form-status success" style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
            <strong>Generated passwords are shown once. Download and deliver this file securely.</strong>
            <button type="button" className="compact-btn compact-btn-primary" onClick={downloadCredentials}>
              <Download size={16} aria-hidden="true" /> Download credentials
            </button>
          </div>
          <div style={{ marginTop: "0.7rem", maxHeight: "180px", overflow: "auto" }}>
            {credentials.map((student) => <div key={student.username} style={{ fontFamily: "monospace", padding: "0.2rem 0" }}>{student.username} : {student.password}</div>)}
          </div>
        </div>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 0.7rem", fontSize: "1rem" }}>Enrolled students ({roster.length})</h3>
        {roster.length === 0 ? <p style={{ opacity: 0.7 }}>No students are enrolled in this course yet.</p> : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: "380px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", padding: "0.55rem 0.75rem", borderBottom: "1px solid var(--lc-border)", fontWeight: 700 }}>
                <span>Student</span><span>CRN / Username</span>
              </div>
              {roster.map((student) => (
                <div key={student.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--lc-border)" }}>
                  <span>{student.fullName}</span><span>{student.username || "-"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PlatformSection>
  );
}
