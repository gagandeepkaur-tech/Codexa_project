import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PlatformLayout } from "../../components/PlatformLayout/PlatformLayout";
import { apiRequest } from "../../utils/api";
import { getFacultySession, getAdminSession } from "../../utils/session";
import CsvQuestionImporter from "../../components/CsvQuestionImporter";

const BATCH_OPTIONS = [
  { value: "ALL", label: "All Batches (Open to All)" },
  { value: "2022-2026", label: "Batch 2022-2026" },
  { value: "2023-2027", label: "Batch 2023-2027" },
  { value: "2024-2028", label: "Batch 2024-2028" },
  { value: "2025-2029", label: "Batch 2025-2029" }
];

const YEAR_OPTIONS = [
  { value: "ALL", label: "All Academic Years (1st to 4th)" },
  { value: "1st Year", label: "1st Year (Semesters 1 & 2)" },
  { value: "2nd Year", label: "2nd Year (Semesters 3 & 4)" },
  { value: "3rd Year", label: "3rd Year (Semesters 5 & 6)" },
  { value: "4th Year", label: "4th Year (Semesters 7 & 8)" }
];

export default function FacultyExamsPage({ role = "faculty" }) {
  const isAdmin = role === "admin";
  const session = isAdmin ? getAdminSession() : getFacultySession();
  const user = session?.user;

  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCodingModal, setShowCodingModal] = useState(null);
  const [showEditModal, setShowEditModal] = useState(null);

  // New course quick-creation state (if course not present in dropdown)
  const [showNewCourseInputs, setShowNewCourseInputs] = useState(false);
  const [newCourseForm, setNewCourseForm] = useState({
    code: "",
    title: "",
    description: ""
  });
  const [newCourseStatus, setNewCourseStatus] = useState({ loading: false, success: "", error: "" });

  // Question Modal State (supporting manual MCQ/Coding and CSV Bulk Import)
  const [codingExamQuestions, setCodingExamQuestions] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState("new");
  const [questionAddMode, setQuestionAddMode] = useState("manual"); // "manual" | "csv"
  const [manualQuestionType, setManualQuestionType] = useState("coding"); // "coding" | "mcq"
  const [mcqForm, setMcqForm] = useState({
    questionText: "",
    options: ["", "", "", ""],
    correctOptionIndex: 0,
    marks: 1,
    negativeMarks: 0
  });

function calculateDurationMinutes(startStr, endStr) {
  if (!startStr || !endStr) return null;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const diffMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return diffMinutes > 0 ? diffMinutes : null;
}

  // Form state for faculty to schedule test / MST (Step 1)
  const [scheduleForm, setScheduleForm] = useState({
    courseId: "",
    title: "",
    description: "",
    type: "coding",
    isMst: true,
    startTime: "",
    endTime: "",
    durationMinutes: "",
    maxScore: 50,
    isProctored: true,
    targetBatch: "ALL",
    targetYear: "ALL"
  });
  const [scheduleStatus, setScheduleStatus] = useState({ loading: false, success: "", error: "" });

  // Form state for editing MST parameters
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    type: "coding",
    isMst: true,
    startTime: "",
    endTime: "",
    durationMinutes: "",
    maxScore: 50,
    isProctored: true,
    targetBatch: "ALL",
    targetYear: "ALL"
  });
  const [editStatus, setEditStatus] = useState({ loading: false, success: "", error: "" });

  // Form state for adding/editing coding content to test (Step 2)
  const [codingForm, setCodingForm] = useState({
    title: "",
    statement: "",
    difficulty: "medium",
    inputFormat: "Standard Space-separated integers",
    outputFormat: "Output integer / array",
    constraintsText: "1 <= N <= 10^5",
    marks: 25,
    sampleInput: "",
    sampleOutput: "",
    hiddenInput: "",
    hiddenOutput: ""
  });
  const [codingStatus, setCodingStatus] = useState({ loading: false, success: "", error: "" });

  async function loadFacultyExams() {
    setLoading(true);
    setError("");
    try {
      if (!session?.token) {
        setLoading(false);
        return;
      }

      const coursesData = await apiRequest("/courses", {}, session.token);
      const fetchedCourses = Array.isArray(coursesData) ? coursesData : [];
      setCourses(fetchedCourses);

      const fetchedExams = [];

      for (const course of fetchedCourses) {
        try {
          const assignments = await apiRequest(`/courses/${course.id}/assignments`, {}, session.token);
          if (Array.isArray(assignments)) {
            for (const item of assignments) {
              const now = new Date();
              const start = item.startTime ? new Date(item.startTime) : (item.dueDate ? new Date(item.dueDate) : null);
              const end = item.endTime ? new Date(item.endTime) : (item.dueDate ? new Date(item.dueDate) : null);

              const isMst = item.isMst || item.title.toLowerCase().includes("mst") || item.title.toLowerCase().includes("mid-semester");
              const isQuiz = item.title.toLowerCase().includes("quiz") || item.title.toLowerCase().includes("unit");

              let status = "upcoming";
              if (start && end) {
                if (now >= start && now <= end) {
                  status = "live";
                } else if (now > end) {
                  status = "closed";
                } else {
                  status = "upcoming";
                }
              }

              fetchedExams.push({
                id: item.id,
                courseId: course.id,
                type: isMst ? "mst" : isQuiz ? "quiz" : "assignment",
                isMst: Boolean(isMst),
                title: item.title,
                description: item.description || "Course assessment paper.",
                courseCode: course.code || "COURSE",
                courseTitle: course.title || "Course",
                status,
                startRaw: start,
                endRaw: end,
                startTime: start ? start.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not Scheduled",
                endTime: end ? end.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "TBA",
                durationMinutes: (() => {
                  let d = item.durationMinutes;
                  if (start && end) {
                    const diff = Math.round((end.getTime() - start.getTime()) / 60000);
                    if (diff > 0 && (isMst || !d || d === 90)) {
                      return diff;
                    }
                  }
                  return d || 90;
                })(),
                totalMarks: item.maxScore || 100,
                targetBatch: item.targetBatch || item.target_batch || "ALL",
                targetYear: item.targetYear || item.target_year || "ALL",
                targetSemester: item.targetSemester || item.target_semester || "ALL",
                questionsCount: item.questionsCount !== undefined ? item.questionsCount : (item.questions?.length || 0),
                submissionsCount: item.submissions?.length || 0,
                proctored: item.isProctored !== undefined ? item.isProctored : true
              });
            }
          }
        } catch (err) {
          console.warn(`Could not fetch assignments for course ${course.id}:`, err);
        }
      }

      setExams(fetchedExams);
    } catch (err) {
      console.error("Failed to load faculty exams:", err);
      setError(err.message || "Failed to load examination schedule.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFacultyExams();
  }, [session?.token]);

  // Helper to quickly create a course if not in list
  async function handleQuickCreateCourse() {
    if (!newCourseForm.code.trim() || !newCourseForm.title.trim()) {
      setNewCourseStatus({ loading: false, success: "", error: "Please enter Course Code and Course Title." });
      return null;
    }

    setNewCourseStatus({ loading: true, success: "", error: "" });
    try {
      const res = await apiRequest(
        "/courses",
        {
          method: "POST",
          body: JSON.stringify({
            code: newCourseForm.code.trim().toUpperCase(),
            title: newCourseForm.title.trim(),
            description: newCourseForm.description?.trim() || "",
            branchTargets: ["CSE"],
            semesterTargets: [1, 2, 3, 4, 5, 6, 7, 8],
            sectionTargets: ["A", "B"],
            batchTargets: ["2022-2026", "2023-2027", "2024-2028", "2025-2029"]
          })
        },
        session.token
      );

      const createdCourse = res.course || {
        id: res.id || res.courseId,
        code: newCourseForm.code.trim().toUpperCase(),
        title: newCourseForm.title.trim()
      };

      setCourses((prev) => {
        if (prev.some((c) => c.id === createdCourse.id || c.code === createdCourse.code)) {
          return prev;
        }
        return [createdCourse, ...prev];
      });

      setScheduleForm((prev) => ({ ...prev, courseId: createdCourse.id }));
      setShowNewCourseInputs(false);
      setNewCourseStatus({ loading: false, success: `Course ${createdCourse.code} created & selected!`, error: "" });
      return createdCourse.id;
    } catch (err) {
      setNewCourseStatus({ loading: false, success: "", error: err.message || "Failed to create course." });
      return null;
    }
  }

  // Step 1: Schedule Test / Exam
  async function handleScheduleSubmit(e, andAddProblems = true) {
    if (e) e.preventDefault();
    setScheduleStatus({ loading: true, success: "", error: "" });

    let activeCourseId = scheduleForm.courseId;

    // If user entered a new course inline, create it first
    if (activeCourseId === "__new__" || showNewCourseInputs) {
      activeCourseId = await handleQuickCreateCourse();
      if (!activeCourseId) {
        setScheduleStatus({ loading: false, success: "", error: "Please provide valid Course Code and Title." });
        return;
      }
    }

    if (!activeCourseId) {
      setScheduleStatus({ loading: false, success: "", error: "Please select a course for the exam." });
      return;
    }

    if (!scheduleForm.title.trim()) {
      setScheduleStatus({ loading: false, success: "", error: "Examination title is required." });
      return;
    }

    try {
      const selectedCourse = courses.find((c) => c.id === activeCourseId) || {
        code: newCourseForm.code || "COURSE",
        title: newCourseForm.title || "Course"
      };

      const res = await apiRequest(
        `/courses/${activeCourseId}/assignments`,
        {
          method: "POST",
          body: JSON.stringify({
            title: scheduleForm.title,
            description: scheduleForm.description,
            type: scheduleForm.type,
            startTime: scheduleForm.startTime ? new Date(scheduleForm.startTime).toISOString() : null,
            endTime: scheduleForm.endTime ? new Date(scheduleForm.endTime).toISOString() : null,
            dueDate: scheduleForm.endTime ? new Date(scheduleForm.endTime).toISOString() : null,
            durationMinutes: Number(scheduleForm.durationMinutes) || calculateDurationMinutes(scheduleForm.startTime, scheduleForm.endTime) || 90,
            maxScore: Number(scheduleForm.maxScore),
            isMst: scheduleForm.isMst,
            isProctored: scheduleForm.isProctored,
            targetBatch: scheduleForm.targetBatch || "ALL",
            targetYear: scheduleForm.targetYear || "ALL"
          })
        },
        session.token
      );

      const createdAssignmentId = res.assignmentId || res.assignment?.id;
      const createdExamObj = {
        id: createdAssignmentId,
        courseId: activeCourseId,
        title: scheduleForm.title,
        courseCode: selectedCourse?.code || "COURSE",
        courseTitle: selectedCourse?.title || "Course"
      };

      setScheduleStatus({ loading: false, success: "MST Exam scheduled successfully!", error: "" });
      setShowScheduleModal(false);

      // Reset schedule form
      setScheduleForm({
        courseId: "",
        title: "",
        description: "",
        type: "coding",
        isMst: true,
        startTime: "",
        endTime: "",
        durationMinutes: "",
        maxScore: 50,
        isProctored: true,
        targetBatch: "ALL",
        targetYear: "ALL"
      });
      setShowNewCourseInputs(false);
      setNewCourseForm({ code: "", title: "", description: "" });

      await loadFacultyExams();

      // Step 2: Smoothly transition directly to adding coding problem and test cases!
      if (andAddProblems && createdAssignmentId) {
        openCodingModal(createdExamObj, true);
      }
    } catch (err) {
      setScheduleStatus({ loading: false, success: "", error: err.message });
    }
  }

  function openEditModal(exam) {
    setShowEditModal(exam);
    const calcFromRaw = (exam.startRaw && exam.endRaw)
      ? Math.round((exam.endRaw.getTime() - exam.startRaw.getTime()) / 60000)
      : null;
    const resolvedDuration = calcFromRaw && calcFromRaw > 0 ? calcFromRaw : (exam.durationMinutes || 90);

    setEditForm({
      title: exam.title,
      description: exam.description,
      type: exam.type,
      isMst: exam.isMst,
      startTime: exam.startRaw ? new Date(exam.startRaw.getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
      endTime: exam.endRaw ? new Date(exam.endRaw.getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
      durationMinutes: resolvedDuration,
      maxScore: exam.totalMarks,
      isProctored: exam.proctored,
      targetBatch: exam.targetBatch || "ALL",
      targetYear: exam.targetYear || "ALL"
    });
    setEditStatus({ loading: false, success: "", error: "" });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setEditStatus({ loading: true, success: "", error: "" });

    try {
      await apiRequest(
        `/courses/${showEditModal.courseId}/assignments/${showEditModal.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: editForm.title,
            description: editForm.description,
            type: editForm.type,
            startTime: editForm.startTime ? new Date(editForm.startTime).toISOString() : null,
            endTime: editForm.endTime ? new Date(editForm.endTime).toISOString() : null,
            dueDate: editForm.endTime ? new Date(editForm.endTime).toISOString() : null,
            durationMinutes: Number(editForm.durationMinutes),
            maxScore: Number(editForm.maxScore),
            isMst: editForm.isMst,
            isProctored: editForm.isProctored,
            targetBatch: editForm.targetBatch || "ALL",
            targetYear: editForm.targetYear || "ALL"
          })
        },
        session.token
      );

      setEditStatus({ loading: false, success: "Parameters updated successfully!", error: "" });
      setShowEditModal(null);
      loadFacultyExams();
    } catch (err) {
      setEditStatus({ loading: false, success: "", error: err.message });
    }
  }

  async function handleDeleteExam(exam) {
    if (!window.confirm(`Are you sure you want to delete the examination "${exam.title}"? This will permanently delete the test paper, questions, and all student submissions.`)) {
      return;
    }

    try {
      await apiRequest(
        `/courses/${exam.courseId}/assignments/${exam.id}`,
        { method: "DELETE" },
        session.token
      );
      loadFacultyExams();
    } catch (err) {
      alert("Failed to delete exam: " + err.message);
    }
  }

  // Open problem management modal (fetches existing questions attached to exam)
  async function openCodingModal(exam, forceNew = false) {
    setShowCodingModal(exam);
    setQuestionAddMode("manual");
    setCodingStatus({ loading: true, success: "", error: "" });
    try {
      const asgData = await apiRequest(`/assignments/${exam.id}`, {}, session?.token);
      const qs = Array.isArray(asgData?.questions) ? asgData.questions : [];
      setCodingExamQuestions(qs);

      if (qs.length > 0 && !forceNew) {
        const firstQ = qs[0];
        setSelectedQuestionId(firstQ.id);
        if (firstQ.type === "mcq") {
          setManualQuestionType("mcq");
          setMcqForm({
            questionText: firstQ.questionText || firstQ.title || "",
            options: Array.isArray(firstQ.options) ? firstQ.options : ["", "", "", ""],
            correctOptionIndex: typeof firstQ.correctOptionIndex === "number" ? firstQ.correctOptionIndex : 0,
            marks: firstQ.marks || 1,
            negativeMarks: firstQ.negativeMarks || 0
          });
        } else {
          setManualQuestionType("coding");
          setCodingForm({
            title: firstQ.title || firstQ.questionText || "",
            statement: firstQ.statement || firstQ.questionText || "",
            difficulty: firstQ.difficulty || "medium",
            inputFormat: firstQ.inputFormat || "Standard Space-separated integers",
            outputFormat: firstQ.outputFormat || "Output integer / array",
            constraintsText: firstQ.constraintsText || "1 <= N <= 10^5",
            marks: firstQ.marks || 25,
            sampleInput: firstQ.sampleInput || (firstQ.sampleTestCases?.[0]?.input_data || ""),
            sampleOutput: firstQ.sampleOutput || (firstQ.sampleTestCases?.[0]?.expected_output || ""),
            hiddenInput: firstQ.hiddenInput || (firstQ.hiddenTestCases?.[0]?.input_data || ""),
            hiddenOutput: firstQ.hiddenOutput || (firstQ.hiddenTestCases?.[0]?.expected_output || "")
          });
        }
      } else {
        setSelectedQuestionId("new");
        setManualQuestionType("coding");
        setCodingForm({
          title: "",
          statement: "",
          difficulty: "medium",
          inputFormat: "Standard Space-separated integers",
          outputFormat: "Output integer / array",
          constraintsText: "1 <= N <= 10^5",
          marks: 25,
          sampleInput: "",
          sampleOutput: "",
          hiddenInput: "",
          hiddenOutput: ""
        });
        setMcqForm({
          questionText: "",
          options: ["", "", "", ""],
          correctOptionIndex: 0,
          marks: 1,
          negativeMarks: 0
        });
      }
      setCodingStatus({ loading: false, success: "", error: "" });
    } catch (err) {
      console.error("Failed to load questions for exam", err);
      setCodingExamQuestions([]);
      setSelectedQuestionId("new");
      setCodingStatus({ loading: false, success: "", error: "" });
    }
  }

  function selectQuestionTab(qId) {
    setSelectedQuestionId(qId);
    setCodingStatus({ loading: false, success: "", error: "" });
    if (qId === "new") {
      setCodingForm({
        title: "",
        statement: "",
        difficulty: "medium",
        inputFormat: "Standard Space-separated integers",
        outputFormat: "Output integer / array",
        constraintsText: "1 <= N <= 10^5",
        marks: 25,
        sampleInput: "",
        sampleOutput: "",
        hiddenInput: "",
        hiddenOutput: ""
      });
      setMcqForm({
        questionText: "",
        options: ["", "", "", ""],
        correctOptionIndex: 0,
        marks: 1,
        negativeMarks: 0
      });
    } else {
      const q = codingExamQuestions.find((item) => item.id === qId);
      if (q) {
        if (q.type === "mcq") {
          setManualQuestionType("mcq");
          setMcqForm({
            questionText: q.questionText || q.title || "",
            options: Array.isArray(q.options) ? q.options : ["", "", "", ""],
            correctOptionIndex: typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : 0,
            marks: q.marks || 1,
            negativeMarks: q.negativeMarks || 0
          });
        } else {
          setManualQuestionType("coding");
          setCodingForm({
            title: q.title || q.questionText || "",
            statement: q.statement || q.questionText || "",
            difficulty: q.difficulty || "medium",
            inputFormat: q.inputFormat || "Standard Space-separated integers",
            outputFormat: q.outputFormat || "Output integer / array",
            constraintsText: q.constraintsText || "1 <= N <= 10^5",
            marks: q.marks || 25,
            sampleInput: q.sampleInput || (q.sampleTestCases?.[0]?.input_data || ""),
            sampleOutput: q.sampleOutput || (q.sampleTestCases?.[0]?.expected_output || ""),
            hiddenInput: q.hiddenInput || (q.hiddenTestCases?.[0]?.input_data || ""),
            hiddenOutput: q.hiddenOutput || (q.hiddenTestCases?.[0]?.expected_output || "")
          });
        }
      }
    }
  }

  async function handleSaveQuestion(e, andAddAnother = false) {
    if (e) e.preventDefault();
    setCodingStatus({ loading: true, success: "", error: "" });

    if (!showCodingModal?.courseId || !showCodingModal?.id) {
      setCodingStatus({ loading: false, success: "", error: "Target exam missing." });
      return;
    }

    try {
      if (manualQuestionType === "mcq") {
        if (!mcqForm.questionText?.trim()) {
          setCodingStatus({ loading: false, success: "", error: "MCQ question text is required." });
          return;
        }

        const payload = {
          type: "mcq",
          questionText: mcqForm.questionText.trim(),
          options: mcqForm.options.map((opt) => opt.trim()),
          correctOptionIndex: Number(mcqForm.correctOptionIndex) || 0,
          marks: Number(mcqForm.marks) || 1,
          negativeMarks: Number(mcqForm.negativeMarks) || 0
        };

        if (selectedQuestionId === "new") {
          await apiRequest(
            `/courses/${showCodingModal.courseId}/assignments/${showCodingModal.id}/questions`,
            {
              method: "POST",
              body: JSON.stringify(payload)
            },
            session.token
          );
          setCodingStatus({ loading: false, success: "MCQ Question added successfully!", error: "" });
        } else {
          await apiRequest(
            `/courses/${showCodingModal.courseId}/assignments/${showCodingModal.id}/questions/${selectedQuestionId}`,
            {
              method: "PUT",
              body: JSON.stringify(payload)
            },
            session.token
          );
          setCodingStatus({ loading: false, success: "MCQ Question updated successfully!", error: "" });
        }
      } else {
        // Coding Question
        if (!codingForm.title?.trim()) {
          setCodingStatus({ loading: false, success: "", error: "Problem title is required." });
          return;
        }

        const payload = {
          type: "coding",
          title: codingForm.title,
          statement: codingForm.statement,
          difficulty: codingForm.difficulty,
          inputFormat: codingForm.inputFormat,
          outputFormat: codingForm.outputFormat,
          constraintsText: codingForm.constraintsText,
          marks: Number(codingForm.marks) || 25,
          sampleInput: codingForm.sampleInput,
          sampleOutput: codingForm.sampleOutput,
          hiddenInput: codingForm.hiddenInput,
          hiddenOutput: codingForm.hiddenOutput
        };

        if (selectedQuestionId === "new") {
          await apiRequest(
            `/courses/${showCodingModal.courseId}/assignments/${showCodingModal.id}/questions`,
            {
              method: "POST",
              body: JSON.stringify(payload)
            },
            session.token
          );
          setCodingStatus({ loading: false, success: "Coding Problem & Test Cases added successfully!", error: "" });
        } else {
          await apiRequest(
            `/courses/${showCodingModal.courseId}/assignments/${showCodingModal.id}/questions/${selectedQuestionId}`,
            {
              method: "PUT",
              body: JSON.stringify(payload)
            },
            session.token
          );
          setCodingStatus({ loading: false, success: "Coding Problem & Test Cases updated successfully!", error: "" });
        }
      }

      const asgData = await apiRequest(`/assignments/${showCodingModal.id}`, {}, session?.token);
      const qs = Array.isArray(asgData?.questions) ? asgData.questions : [];
      setCodingExamQuestions(qs);
      loadFacultyExams();

      if (andAddAnother) {
        setSelectedQuestionId("new");
        setCodingForm({
          title: "",
          statement: "",
          difficulty: "medium",
          inputFormat: "Standard Space-separated integers",
          outputFormat: "Output integer / array",
          constraintsText: "1 <= N <= 10^5",
          marks: 25,
          sampleInput: "",
          sampleOutput: "",
          hiddenInput: "",
          hiddenOutput: ""
        });
        setMcqForm({
          questionText: "",
          options: ["", "", "", ""],
          correctOptionIndex: 0,
          marks: 1,
          negativeMarks: 0
        });
      }
    } catch (err) {
      setCodingStatus({ loading: false, success: "", error: err.message });
    }
  }

  async function handleBulkImportQuestions(parsedQuestions) {
    if (!showCodingModal?.courseId || !showCodingModal?.id) return;
    setCodingStatus({ loading: true, success: "", error: "" });
    try {
      const res = await apiRequest(
        `/courses/${showCodingModal.courseId}/assignments/${showCodingModal.id}/questions/bulk`,
        {
          method: "POST",
          body: JSON.stringify({ questions: parsedQuestions })
        },
        session.token
      );

      const asgData = await apiRequest(`/assignments/${showCodingModal.id}`, {}, session?.token);
      const qs = Array.isArray(asgData?.questions) ? asgData.questions : [];
      setCodingExamQuestions(qs);
      loadFacultyExams();

      setCodingStatus({
        loading: false,
        success: res.message || `Successfully imported ${parsedQuestions.length} questions into exam!`,
        error: ""
      });
      setQuestionAddMode("manual");
      if (qs.length > 0) {
        selectQuestionTab(qs[qs.length - 1].id);
      }
    } catch (err) {
      setCodingStatus({ loading: false, success: "", error: err.message || "Bulk import failed." });
    }
  }

  async function handleDeleteQuestion(qId) {
    if (!window.confirm("Are you sure you want to remove this question from the test?")) return;
    setCodingStatus({ loading: true, success: "", error: "" });
    try {
      await apiRequest(
        `/courses/${showCodingModal.courseId}/assignments/${showCodingModal.id}/questions/${qId}`,
        { method: "DELETE" },
        session.token
      );

      const asgData = await apiRequest(`/assignments/${showCodingModal.id}`, {}, session?.token);
      const qs = Array.isArray(asgData?.questions) ? asgData.questions : [];
      setCodingExamQuestions(qs);
      loadFacultyExams();

      if (qs.length > 0) {
        selectQuestionTab(qs[0].id);
      } else {
        selectQuestionTab("new");
      }
      setCodingStatus({ loading: false, success: "Question removed successfully.", error: "" });
    } catch (err) {
      setCodingStatus({ loading: false, success: "", error: err.message });
    }
  }

  const filteredExams = exams.filter((exam) => {
    if (filterTab === "mst" && !exam.isMst && exam.type !== "mst") return false;
    if (filterTab === "quiz" && exam.type !== "quiz" && exam.type !== "assignment") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        exam.title.toLowerCase().includes(q) ||
        exam.courseCode.toLowerCase().includes(q) ||
        exam.courseTitle.toLowerCase().includes(q) ||
        (exam.targetBatch && exam.targetBatch.toLowerCase().includes(q)) ||
        (exam.targetYear && exam.targetYear.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalExamsCount = exams.length;

  return (
    <PlatformLayout role={isAdmin ? "admin" : "faculty"} activeItem={isAdmin ? "/admin/exams" : "/faculty/exams"}>
      <div className="lc-dashboard-container" style={{ maxWidth: "1280px", margin: "0 auto", padding: "1.5rem 1rem" }}>
        
        {/* Modern Top Header Card */}
        <div style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.85))",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "1.75rem 2rem",
          marginBottom: "2rem",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                <span style={{
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#60a5fa",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "0.25rem 0.75rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase"
                }}>
                  {isAdmin ? "Admin Controller • Examinations & MST" : "Faculty Portal • Examinations & MST"}
                </span>
              </div>
              <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--lc-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                {isAdmin ? "Admin MST & Examination Manager" : "MST & Test Papers Management"}
              </h1>
              <p style={{ color: "var(--lc-text-muted)", fontSize: "0.9rem", margin: "0.4rem 0 0 0", maxWidth: "680px" }}>
                Schedule tests with target student batch/year audience, add coding problems with automated test cases, and edit parameters.
              </p>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setShowScheduleModal(true);
                  setShowNewCourseInputs(false);
                }}
                style={{
                  background: "linear-gradient(135deg, #ff7e29, #f97316)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "0.75rem 1.4rem",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(255, 126, 41, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease"
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Test Paper
              </button>

              <div style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "0.6rem 1.25rem",
                textAlign: "center",
                minWidth: "110px"
              }}>
                <span style={{ fontSize: "0.72rem", color: "var(--lc-text-muted)", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Created Tests
                </span>
                <strong style={{ fontSize: "1.35rem", color: "var(--lc-text-primary)", fontWeight: 800 }}>
                  {totalExamsCount}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Navigation Bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--lc-border)",
          paddingBottom: "1rem",
          marginBottom: "1.75rem",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[
              { id: "all", label: "All Papers" },
              { id: "mst", label: "MST Exams" },
              { id: "quiz", label: "Quizzes & Assignments" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                style={{
                  background: filterTab === tab.id ? "var(--lc-accent, #ff7e29)" : "rgba(255,255,255,0.05)",
                  color: filterTab === tab.id ? "#fff" : "var(--lc-text-muted)",
                  border: "1px solid",
                  borderColor: filterTab === tab.id ? "var(--lc-accent, #ff7e29)" : "var(--lc-border)",
                  borderRadius: "10px",
                  padding: "0.55rem 1.1rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", minWidth: "280px" }}>
            <input
              type="text"
              placeholder="Search by title, subject, batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "var(--lc-card-bg)",
                border: "1px solid var(--lc-border)",
                borderRadius: "10px",
                padding: "0.55rem 1rem 0.55rem 2.4rem",
                color: "var(--lc-text-primary)",
                fontSize: "0.85rem",
                outline: "none"
              }}
            />
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--lc-text-muted)" }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--lc-text-muted)" }}>
            <div className="lc-spinner" style={{ margin: "0 auto 1rem auto" }} />
            <p>Loading course examination papers...</p>
          </div>
        ) : error ? (
          <div className="lc-error-banner" style={{ margin: "2rem 0" }}>
            <span>{error}</span>
          </div>
        ) : filteredExams.length === 0 ? (
          <div style={{
            background: "var(--lc-card-bg)",
            border: "1px solid var(--lc-border)",
            borderRadius: "16px",
            padding: "4rem 2rem",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📋</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--lc-text-primary)", marginBottom: "0.5rem" }}>
              No examination papers found
            </h3>
            <p style={{ color: "var(--lc-text-muted)", fontSize: "0.9rem", maxWidth: "420px", margin: "0 auto 1.5rem auto" }}>
              Create your first Mid-Semester Examination or Assignment with batch/year audience targeting and coding problems.
            </p>
            <button
              onClick={() => {
                setShowScheduleModal(true);
                setShowNewCourseInputs(false);
              }}
              style={{
                background: "var(--lc-accent, #ff7e29)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "0.65rem 1.35rem",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              Create Test Paper
            </button>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: "1.5rem"
          }}>
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                style={{
                  background: "linear-gradient(180deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.75))",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "1.4rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                      <span style={{
                        background: "rgba(59, 130, 246, 0.15)",
                        color: "#60a5fa",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.22rem 0.65rem",
                        borderRadius: "6px",
                        border: "1px solid rgba(59, 130, 246, 0.3)"
                      }}>
                        {exam.courseCode}
                      </span>

                      {exam.questionsCount > 0 ? (
                        <span style={{
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "0.22rem 0.65rem",
                          borderRadius: "6px",
                          border: "1px solid rgba(16, 185, 129, 0.3)"
                        }}>
                          🎯 {exam.questionsCount} {exam.questionsCount === 1 ? "Problem" : "Problems"}
                        </span>
                      ) : (
                        <span style={{
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#f59e0b",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "0.22rem 0.65rem",
                          borderRadius: "6px",
                          border: "1px solid rgba(245, 158, 11, 0.3)"
                        }}>
                          ⚠️ No Problems Added
                        </span>
                      )}
                    </div>

                    {exam.status === "live" && (
                      <span style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#10b981",
                        background: "rgba(16, 185, 129, 0.15)",
                        padding: "0.22rem 0.7rem",
                        borderRadius: "999px",
                        border: "1px solid rgba(16, 185, 129, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem"
                      }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                        LIVE NOW
                      </span>
                    )}

                    {exam.status === "upcoming" && (
                      <span style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#f59e0b",
                        background: "rgba(245, 158, 11, 0.12)",
                        padding: "0.22rem 0.7rem",
                        borderRadius: "999px",
                        border: "1px solid rgba(245, 158, 11, 0.3)"
                      }}>
                        SCHEDULED
                      </span>
                    )}

                    {exam.status === "closed" && (
                      <span style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "var(--lc-text-muted)",
                        background: "rgba(255, 255, 255, 0.08)",
                        padding: "0.22rem 0.7rem",
                        borderRadius: "999px",
                        border: "1px solid var(--lc-border)"
                      }}>
                        CLOSED
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--lc-text-primary)", marginBottom: "0.3rem", lineHeight: 1.3 }}>
                    {exam.title}
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--lc-text-muted)", marginBottom: "0.85rem" }}>
                    {exam.courseTitle}
                  </p>

                  {/* Audience Targeting Badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "1.1rem", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "0.72rem",
                      background: "rgba(168, 85, 247, 0.15)",
                      color: "#c084fc",
                      border: "1px solid rgba(168, 85, 247, 0.3)",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "6px",
                      fontWeight: 600
                    }}>
                      🎓 Batch: {exam.targetBatch || "ALL"}
                    </span>
                    <span style={{
                      fontSize: "0.72rem",
                      background: "rgba(59, 130, 246, 0.15)",
                      color: "#93c5fd",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "6px",
                      fontWeight: 600
                    }}>
                      📅 {exam.targetYear || "All Years"}
                    </span>
                  </div>

                  {/* Schedule Details Grid */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.35)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                    padding: "0.85rem 1rem",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.85rem",
                    marginBottom: "1.25rem",
                    fontSize: "0.8rem"
                  }}>
                    <div>
                      <span style={{ color: "var(--lc-text-muted)", display: "block", fontSize: "0.72rem" }}>Start Window</span>
                      <strong style={{ color: "var(--lc-text-primary)", fontWeight: 600 }}>{exam.startTime}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--lc-text-muted)", display: "block", fontSize: "0.72rem" }}>End Window</span>
                      <strong style={{ color: "var(--lc-text-primary)", fontWeight: 600 }}>{exam.endTime}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--lc-text-muted)", display: "block", fontSize: "0.72rem" }}>Duration & Total</span>
                      <strong style={{ color: "var(--lc-text-primary)", fontWeight: 600 }}>{exam.durationMinutes} Mins ({exam.totalMarks} M)</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--lc-text-muted)", display: "block", fontSize: "0.72rem" }}>Submissions</span>
                      <strong style={{ color: "#38bdf8", fontWeight: 600 }}>{exam.submissionsCount} Submissions</strong>
                    </div>
                  </div>
                </div>

                {/* Content Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.25rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => openEditModal(exam)}
                      style={{
                        flex: 1,
                        background: "rgba(255, 255, 255, 0.08)",
                        color: "var(--lc-text-primary)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "10px",
                        padding: "0.55rem 0.75rem",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem",
                        transition: "background 0.15s ease"
                      }}
                    >
                      ✏️ Edit Parameters
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam)}
                      style={{
                        background: "rgba(239, 68, 68, 0.12)",
                        color: "#ef4444",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "10px",
                        padding: "0.55rem 0.85rem",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem"
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>

                  <button
                    onClick={() => openCodingModal(exam)}
                    style={{
                      background: exam.questionsCount > 0 ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #ff7e29, #f97316)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "0.7rem",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.45rem",
                      boxShadow: exam.questionsCount > 0 ? "0 4px 14px rgba(16, 185, 129, 0.25)" : "0 4px 14px rgba(255, 126, 41, 0.25)",
                      transition: "transform 0.15s ease"
                    }}
                  >
                    <span>📝</span>
                    <span>{exam.questionsCount > 0 ? `Manage & Edit Questions (${exam.questionsCount})` : `Add Questions (Manual / CSV)`}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 1: Schedule Modal (First Step: Date, Time, Batch/Year & Parameters) */}
        {showScheduleModal && (
          <div className="lc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowScheduleModal(false); }}>
            <div className="lc-modal-card" style={{ maxWidth: "640px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    <span style={{
                      background: "rgba(255, 126, 41, 0.15)",
                      color: "#ff7e29",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.6rem",
                      borderRadius: "999px",
                      border: "1px solid rgba(255, 126, 41, 0.3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>
                      Step 1 of 2: Schedule & Audience
                    </span>
                  </div>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--lc-text-primary)", margin: 0 }}>
                    Create & Schedule Test Paper
                  </h2>
                  <p style={{ fontSize: "0.825rem", color: "var(--lc-text-muted)", marginTop: "0.25rem", margin: 0 }}>
                    Choose course (or create a new course inline), batch/year audience visibility, and date/time window.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "var(--lc-text-muted)",
                    borderRadius: "8px",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}
                >
                  ✕
                </button>
              </div>

              {scheduleStatus.error && (
                <div className="lc-error-banner" style={{ marginBottom: "1.25rem", padding: "0.75rem 1rem", borderRadius: "10px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", fontSize: "0.85rem" }}>
                  <span>{scheduleStatus.error}</span>
                </div>
              )}

              <form onSubmit={(e) => handleScheduleSubmit(e, true)}>
                
                {/* Target Course with Inline New Course Option */}
                <div className="lc-form-group" style={{ marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <label className="lc-input-label lc-input-label-required" style={{ margin: 0 }}>
                      Target Course
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const toggled = !showNewCourseInputs;
                        setShowNewCourseInputs(toggled);
                        if (toggled) {
                          setScheduleForm((prev) => ({ ...prev, courseId: "__new__" }));
                        } else {
                          setScheduleForm((prev) => ({ ...prev, courseId: courses[0]?.id || "" }));
                        }
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: showNewCourseInputs ? "#ef4444" : "var(--lc-accent, #ff7e29)",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: 0
                      }}
                    >
                      {showNewCourseInputs ? "✕ Select Existing Course" : "+ Add New Course"}
                    </button>
                  </div>

                  {!showNewCourseInputs ? (
                    <select
                      className="lc-form-input"
                      value={scheduleForm.courseId}
                      onChange={(e) => {
                        if (e.target.value === "__new__") {
                          setShowNewCourseInputs(true);
                          setScheduleForm({ ...scheduleForm, courseId: "__new__" });
                        } else {
                          setScheduleForm({ ...scheduleForm, courseId: e.target.value });
                        }
                      }}
                      required={!showNewCourseInputs}
                    >
                      <option value="">-- Select Course --</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code}: {c.title}
                        </option>
                      ))}
                      <option value="__new__" style={{ fontWeight: "bold", color: "#ff7e29" }}>
                        + Add New Course (If not present in list)...
                      </option>
                    </select>
                  ) : (
                    <div style={{
                      background: "rgba(255, 126, 41, 0.08)",
                      border: "1px dashed rgba(255, 126, 41, 0.4)",
                      borderRadius: "10px",
                      padding: "1rem",
                      marginTop: "0.25rem"
                    }}>
                      <div style={{ fontSize: "0.825rem", fontWeight: 700, color: "#ff7e29", marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        📘 Create & Register New Course
                      </div>

                      {newCourseStatus.error && (
                        <div style={{ fontSize: "0.75rem", color: "#ef4444", marginBottom: "0.5rem" }}>
                          ⚠️ {newCourseStatus.error}
                        </div>
                      )}
                      {newCourseStatus.success && (
                        <div style={{ fontSize: "0.75rem", color: "#10b981", marginBottom: "0.5rem" }}>
                          ✓ {newCourseStatus.success}
                        </div>
                      )}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                        <div>
                          <label style={{ fontSize: "0.75rem", color: "var(--lc-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                            Course Code *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. CS301 / DSA202"
                            value={newCourseForm.code}
                            onChange={(e) => setNewCourseForm({ ...newCourseForm, code: e.target.value.toUpperCase() })}
                            className="lc-form-input"
                            style={{ fontSize: "0.85rem" }}
                            required={showNewCourseInputs}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.75rem", color: "var(--lc-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                            Course Title / Subject Name *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Data Structures & Algorithms"
                            value={newCourseForm.title}
                            onChange={(e) => setNewCourseForm({ ...newCourseForm, title: e.target.value })}
                            className="lc-form-input"
                            style={{ fontSize: "0.85rem" }}
                            required={showNewCourseInputs}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={handleQuickCreateCourse}
                          disabled={newCourseStatus.loading}
                          style={{
                            background: "rgba(255, 126, 41, 0.2)",
                            color: "#ff7e29",
                            border: "1px solid rgba(255, 126, 41, 0.5)",
                            borderRadius: "6px",
                            padding: "0.35rem 0.85rem",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          {newCourseStatus.loading ? "Creating..." : "✓ Create & Select Course"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lc-form-group">
                  <label className="lc-input-label lc-input-label-required">Examination Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Mid-Semester Examination 1 (MST-1)"
                    className="lc-form-input"
                    value={scheduleForm.title}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                    required
                  />
                </div>

                {/* Audience Visibility: Year & Batch Section */}
                <div style={{
                  background: "rgba(147, 51, 234, 0.08)",
                  border: "1px solid rgba(147, 51, 234, 0.25)",
                  borderRadius: "10px",
                  padding: "1rem",
                  marginBottom: "1rem"
                }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#c084fc", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    🎯 Student Audience & Visibility Control
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="lc-form-group">
                      <label className="lc-input-label" style={{ color: "var(--lc-text-primary)", fontWeight: 600 }}>
                        Target Batch
                      </label>
                      <select
                        className="lc-form-input"
                        value={scheduleForm.targetBatch}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, targetBatch: e.target.value })}
                      >
                        {BATCH_OPTIONS.map((b) => (
                          <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="lc-form-group">
                      <label className="lc-input-label" style={{ color: "var(--lc-text-primary)", fontWeight: 600 }}>
                        Target Academic Year
                      </label>
                      <select
                        className="lc-form-input"
                        value={scheduleForm.targetYear}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, targetYear: e.target.value })}
                      >
                        {YEAR_OPTIONS.map((y) => (
                          <option key={y.value} value={y.value}>{y.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--lc-text-muted)", display: "block", marginTop: "0.35rem" }}>
                    * Only students belonging to the chosen Batch & Academic Year will see this test in their exam portal.
                  </span>
                </div>

                <div className="lc-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="lc-form-group">
                    <label className="lc-input-label lc-input-label-required">Start Date & Time (When to Start)</label>
                    <input
                      type="datetime-local"
                      className="lc-form-input"
                      value={scheduleForm.startTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        const calc = calculateDurationMinutes(val, scheduleForm.endTime);
                        setScheduleForm((prev) => ({
                          ...prev,
                          startTime: val,
                          durationMinutes: calc !== null ? calc : prev.durationMinutes
                        }));
                      }}
                      required
                    />
                  </div>
                  <div className="lc-form-group">
                    <label className="lc-input-label lc-input-label-required">End Date & Time (When to End)</label>
                    <input
                      type="datetime-local"
                      className="lc-form-input"
                      value={scheduleForm.endTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        const calc = calculateDurationMinutes(scheduleForm.startTime, val);
                        setScheduleForm((prev) => ({
                          ...prev,
                          endTime: val,
                          durationMinutes: calc !== null ? calc : prev.durationMinutes
                        }));
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="lc-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="lc-form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <label className="lc-input-label lc-input-label-required" style={{ margin: 0 }}>Duration</label>
                      {scheduleForm.startTime && scheduleForm.endTime && scheduleForm.durationMinutes ? (
                        <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 600 }}>
                          🔒 Auto-calculated ({scheduleForm.durationMinutes}m)
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.72rem", color: "var(--lc-text-muted)" }}>
                          🔒 Computed from start &amp; end
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      readOnly
                      placeholder="Auto-calculated from start & end time"
                      className="lc-form-input"
                      value={scheduleForm.durationMinutes ? `${scheduleForm.durationMinutes} Minutes (Locked)` : ""}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        cursor: "not-allowed",
                        color: "var(--lc-text-primary)",
                        border: "1px solid var(--lc-border)"
                      }}
                      title="Duration is automatically computed from the start and end time and cannot be manually changed"
                    />
                  </div>
                  <div className="lc-form-group">
                    <label className="lc-input-label lc-input-label-required">Total Marks</label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      className="lc-form-input"
                      value={scheduleForm.maxScore}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, maxScore: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="lc-form-group" style={{ marginTop: "0.75rem" }}>
                  <label className="lc-input-label">Description & Syllabus</label>
                  <textarea
                    placeholder="e.g. Institutional MST covering Units 1 & 2."
                    className="lc-form-input"
                    rows="2"
                    value={scheduleForm.description}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "#cbd5e1",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "10px",
                      padding: "0.65rem 1.25rem",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={scheduleStatus.loading || newCourseStatus.loading}
                    style={{
                      background: "linear-gradient(135deg, #ff7e29, #f97316)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "0.65rem 1.5rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      boxShadow: "0 4px 14px rgba(255, 126, 41, 0.35)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem"
                    }}
                  >
                    {scheduleStatus.loading ? "Scheduling..." : "Save Schedule & Add Problems →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Test Parameters Modal */}
        {showEditModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem"
          }}>
            <div style={{
              background: "var(--lc-card-bg)",
              border: "1px solid var(--lc-border)",
              borderRadius: "16px",
              padding: "2rem",
              maxWidth: "580px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--lc-accent, #ff7e29)", fontWeight: 700, textTransform: "uppercase" }}>
                    Edit Parameters & Audience
                  </span>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0.2rem 0 0 0", color: "var(--lc-text-primary)" }}>
                    {showEditModal.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "none",
                    color: "var(--lc-text-muted)",
                    borderRadius: "8px",
                    width: "30px",
                    height: "30px",
                    cursor: "pointer"
                  }}
                >
                  ✕
                </button>
              </div>

              {editStatus.error && (
                <div className="lc-error-banner" style={{ marginBottom: "1rem" }}>
                  <span>{editStatus.error}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit}>
                <div className="lc-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="lc-input-label">Paper Title</label>
                  <input
                    type="text"
                    className="lc-form-input"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    required
                  />
                </div>

                {/* Audience Targeting */}
                <div style={{
                  background: "rgba(147, 51, 234, 0.08)",
                  border: "1px solid rgba(147, 51, 234, 0.25)",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  marginBottom: "1rem"
                }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#c084fc", marginBottom: "0.5rem" }}>
                    🎯 Student Audience (Who can see this test)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className="lc-form-group">
                      <label className="lc-input-label">Target Batch</label>
                      <select
                        className="lc-form-input"
                        value={editForm.targetBatch}
                        onChange={(e) => setEditForm({ ...editForm, targetBatch: e.target.value })}
                      >
                        {BATCH_OPTIONS.map((b) => (
                          <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="lc-form-group">
                      <label className="lc-input-label">Target Year</label>
                      <select
                        className="lc-form-input"
                        value={editForm.targetYear}
                        onChange={(e) => setEditForm({ ...editForm, targetYear: e.target.value })}
                      >
                        {YEAR_OPTIONS.map((y) => (
                          <option key={y.value} value={y.value}>{y.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="lc-form-group">
                    <label className="lc-input-label">Start Date & Time (When to Start)</label>
                    <input
                      type="datetime-local"
                      className="lc-form-input"
                      value={editForm.startTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        const calc = calculateDurationMinutes(val, editForm.endTime);
                        setEditForm((prev) => ({
                          ...prev,
                          startTime: val,
                          durationMinutes: calc !== null ? calc : prev.durationMinutes
                        }));
                      }}
                      required
                    />
                  </div>
                  <div className="lc-form-group">
                    <label className="lc-input-label">End Date & Time (When to End)</label>
                    <input
                      type="datetime-local"
                      className="lc-form-input"
                      value={editForm.endTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        const calc = calculateDurationMinutes(editForm.startTime, val);
                        setEditForm((prev) => ({
                          ...prev,
                          endTime: val,
                          durationMinutes: calc !== null ? calc : prev.durationMinutes
                        }));
                      }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="lc-form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <label className="lc-input-label" style={{ margin: 0 }}>Duration</label>
                      {editForm.startTime && editForm.endTime && editForm.durationMinutes ? (
                        <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 600 }}>
                          🔒 Auto-calculated ({editForm.durationMinutes}m)
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.72rem", color: "var(--lc-text-muted)" }}>
                          🔒 Computed from start &amp; end
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      readOnly
                      placeholder="Auto-calculated from start & end time"
                      className="lc-form-input"
                      value={editForm.durationMinutes ? `${editForm.durationMinutes} Minutes (Locked)` : ""}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        cursor: "not-allowed",
                        color: "var(--lc-text-primary)",
                        border: "1px solid var(--lc-border)"
                      }}
                      title="Duration is automatically computed from the start and end time and cannot be manually changed"
                    />
                  </div>
                  <div className="lc-form-group">
                    <label className="lc-input-label">Total Marks</label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      className="lc-form-input"
                      value={editForm.maxScore}
                      onChange={(e) => setEditForm({ ...editForm, maxScore: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="lc-form-group" style={{ marginBottom: "1.5rem" }}>
                  <label className="lc-input-label">Description / Syllabus</label>
                  <textarea
                    className="lc-form-input"
                    rows="2"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(null)}
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.6rem 1.2rem",
                      cursor: "pointer",
                      fontSize: "0.85rem"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editStatus.loading}
                    style={{
                      background: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.6rem 1.4rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.85rem"
                    }}
                  >
                    {editStatus.loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STEP 2 / MANAGE PROBLEMS MODAL: Add / Edit Coding Problem & Test Cases */}
        {showCodingModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem"
          }}>
            <div style={{
              background: "var(--lc-card-bg)",
              border: "1px solid var(--lc-border)",
              borderRadius: "16px",
              padding: "2rem",
              maxWidth: "760px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto"
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.6rem",
                      borderRadius: "999px",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      textTransform: "uppercase"
                    }}>
                      Assessment Questions ({codingExamQuestions.length})
                    </span>
                  </div>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "var(--lc-text-primary)" }}>
                    {showCodingModal.title}
                  </h2>
                  <p style={{ fontSize: "0.85rem", color: "var(--lc-text-muted)", margin: "0.2rem 0 0 0" }}>
                    Course: {showCodingModal.courseCode} — {showCodingModal.courseTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCodingModal(null)}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "none",
                    color: "var(--lc-text-muted)",
                    borderRadius: "8px",
                    width: "32px",
                    height: "32px",
                    cursor: "pointer"
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Main Mode Toggle: Manual Builder vs CSV Importer */}
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

              {codingStatus.success && (
                <div style={{ marginBottom: "1rem", padding: "0.6rem 0.85rem", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981", fontSize: "0.85rem" }}>
                  <span>✓ {codingStatus.success}</span>
                </div>
              )}

              {codingStatus.error && (
                <div className="lc-error-banner" style={{ marginBottom: "1rem" }}>
                  <span>{codingStatus.error}</span>
                </div>
              )}

              {/* CSV Import Mode */}
              {questionAddMode === "csv" ? (
                <CsvQuestionImporter
                  onImport={handleBulkImportQuestions}
                  targetLabel={showCodingModal.title}
                  isSubmitting={codingStatus.loading}
                  allowedTypes="all"
                />
              ) : (
                /* Manual Mode */
                <div>
                  {/* Problem Tabs Navigation */}
                  <div style={{
                    display: "flex",
                    gap: "0.5rem",
                    overflowX: "auto",
                    paddingBottom: "0.75rem",
                    marginBottom: "1.25rem",
                    borderBottom: "1px solid var(--lc-border)"
                  }}>
                    {codingExamQuestions.map((q, idx) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => selectQuestionTab(q.id)}
                        style={{
                          background: selectedQuestionId === q.id ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.05)",
                          color: selectedQuestionId === q.id ? "#10b981" : "var(--lc-text-muted)",
                          border: "1px solid",
                          borderColor: selectedQuestionId === q.id ? "#10b981" : "var(--lc-border)",
                          borderRadius: "8px",
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem"
                        }}
                      >
                        <span>{q.type === "mcq" ? "🔘 MCQ" : "💻 Code"} Q{idx + 1}</span>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => selectQuestionTab("new")}
                      style={{
                        background: selectedQuestionId === "new" ? "var(--lc-accent, #ff7e29)" : "rgba(255, 126, 41, 0.1)",
                        color: selectedQuestionId === "new" ? "#fff" : "var(--lc-accent, #ff7e29)",
                        border: "1px dashed var(--lc-accent, #ff7e29)",
                        borderRadius: "8px",
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap"
                      }}
                    >
                      + Add Question
                    </button>
                  </div>

                  {/* Question Type Selector for New Questions */}
                  {selectedQuestionId === "new" && (
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
                  )}

                  <form onSubmit={(e) => handleSaveQuestion(e, false)}>
                    {/* CODING PROBLEM FORM */}
                    {manualQuestionType === "coding" && (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                          <div className="lc-form-group">
                            <label className="lc-input-label lc-input-label-required">Problem Title</label>
                            <input
                              type="text"
                              placeholder="e.g. Reverse a Linked List / Two Sum"
                              className="lc-form-input"
                              value={codingForm.title}
                              onChange={(e) => setCodingForm({ ...codingForm, title: e.target.value })}
                              required
                            />
                          </div>
                          <div className="lc-form-group">
                            <label className="lc-input-label">Difficulty</label>
                            <select
                              className="lc-form-input"
                              value={codingForm.difficulty}
                              onChange={(e) => setCodingForm({ ...codingForm, difficulty: e.target.value })}
                            >
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>
                          <div className="lc-form-group">
                            <label className="lc-input-label">Marks</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              className="lc-form-input"
                              value={codingForm.marks}
                              onChange={(e) => setCodingForm({ ...codingForm, marks: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="lc-form-group" style={{ marginBottom: "1rem" }}>
                          <label className="lc-input-label lc-input-label-required">Problem Statement &amp; Description</label>
                          <textarea
                            placeholder="Provide detailed problem description, explanation, examples..."
                            className="lc-form-input"
                            rows="3"
                            value={codingForm.statement}
                            onChange={(e) => setCodingForm({ ...codingForm, statement: e.target.value })}
                            required
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                          <div className="lc-form-group">
                            <label className="lc-input-label">Input Format</label>
                            <input
                              type="text"
                              placeholder="e.g. First line contains N, second line array"
                              className="lc-form-input"
                              value={codingForm.inputFormat}
                              onChange={(e) => setCodingForm({ ...codingForm, inputFormat: e.target.value })}
                            />
                          </div>
                          <div className="lc-form-group">
                            <label className="lc-input-label">Output Format</label>
                            <input
                              type="text"
                              placeholder="e.g. Print space-separated integers"
                              className="lc-form-input"
                              value={codingForm.outputFormat}
                              onChange={(e) => setCodingForm({ ...codingForm, outputFormat: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="lc-form-group" style={{ marginBottom: "1rem" }}>
                          <label className="lc-input-label">Constraints</label>
                          <input
                            type="text"
                            placeholder="e.g. 1 <= N <= 10^5, -10^9 <= Arr[i] <= 10^9"
                            className="lc-form-input"
                            value={codingForm.constraintsText}
                            onChange={(e) => setCodingForm({ ...codingForm, constraintsText: e.target.value })}
                          />
                        </div>

                        {/* Test Cases Section */}
                        <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "1rem", borderRadius: "10px", marginBottom: "1.25rem", border: "1px solid var(--lc-border)" }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--lc-text-primary)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            🧪 Automated Judge Test Cases
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                            <div className="lc-form-group">
                              <label className="lc-input-label" style={{ fontSize: "0.75rem", color: "#60a5fa" }}>
                                Sample Input Case (Visible to students)
                              </label>
                              <textarea
                                placeholder="e.g. 5&#10;1 2 3 4 5"
                                className="lc-form-input"
                                rows="2"
                                value={codingForm.sampleInput}
                                onChange={(e) => setCodingForm({ ...codingForm, sampleInput: e.target.value })}
                              />
                            </div>
                            <div className="lc-form-group">
                              <label className="lc-input-label" style={{ fontSize: "0.75rem", color: "#60a5fa" }}>
                                Expected Sample Output
                              </label>
                              <textarea
                                placeholder="e.g. 5 4 3 2 1"
                                className="lc-form-input"
                                rows="2"
                                value={codingForm.sampleOutput}
                                onChange={(e) => setCodingForm({ ...codingForm, sampleOutput: e.target.value })}
                              />
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className="lc-form-group">
                              <label className="lc-input-label" style={{ fontSize: "0.75rem", color: "#f59e0b" }}>
                                Hidden Judge Input (For evaluation grading)
                              </label>
                              <textarea
                                placeholder="e.g. 8&#10;10 20 30 40 50 60 70 80"
                                className="lc-form-input"
                                rows="2"
                                value={codingForm.hiddenInput}
                                onChange={(e) => setCodingForm({ ...codingForm, hiddenInput: e.target.value })}
                              />
                            </div>
                            <div className="lc-form-group">
                              <label className="lc-input-label" style={{ fontSize: "0.75rem", color: "#f59e0b" }}>
                                Expected Hidden Output
                              </label>
                              <textarea
                                placeholder="e.g. 80 70 60 50 40 30 20 10"
                                className="lc-form-input"
                                rows="2"
                                value={codingForm.hiddenOutput}
                                onChange={(e) => setCodingForm({ ...codingForm, hiddenOutput: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MCQ FORM */}
                    {manualQuestionType === "mcq" && (
                      <div>
                        <div className="lc-form-group" style={{ marginBottom: "1rem" }}>
                          <label className="lc-input-label lc-input-label-required">Question Text / Prompt</label>
                          <textarea
                            placeholder="Enter multiple choice question statement..."
                            className="lc-form-input"
                            rows="3"
                            value={mcqForm.questionText}
                            onChange={(e) => setMcqForm({ ...mcqForm, questionText: e.target.value })}
                            required
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                          <div className="lc-form-group">
                            <label className="lc-input-label">Marks</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              className="lc-form-input"
                              value={mcqForm.marks}
                              onChange={(e) => setMcqForm({ ...mcqForm, marks: Number(e.target.value) })}
                              required
                            />
                          </div>
                          <div className="lc-form-group">
                            <label className="lc-input-label">Negative Marks (Penalty)</label>
                            <input
                              type="number"
                              min="0"
                              max="50"
                              className="lc-form-input"
                              value={mcqForm.negativeMarks}
                              onChange={(e) => setMcqForm({ ...mcqForm, negativeMarks: Number(e.target.value) })}
                            />
                          </div>
                        </div>

                        <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "1rem", borderRadius: "10px", marginBottom: "1.25rem", border: "1px solid var(--lc-border)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--lc-text-primary)" }}>
                              🔘 Options (Select the correct answer)
                            </span>
                            <button
                              type="button"
                              onClick={() => setMcqForm({ ...mcqForm, options: [...mcqForm.options, ""] })}
                              style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "6px", padding: "0.25rem 0.6rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                            >
                              + Add Option
                            </button>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                            {mcqForm.options.map((opt, oIdx) => (
                              <div key={oIdx} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", color: mcqForm.correctOptionIndex === oIdx ? "#10b981" : "var(--lc-text-muted)", fontWeight: 700, fontSize: "0.85rem", minWidth: "85px" }}>
                                  <input
                                    type="radio"
                                    name="correctOption"
                                    checked={mcqForm.correctOptionIndex === oIdx}
                                    onChange={() => setMcqForm({ ...mcqForm, correctOptionIndex: oIdx })}
                                    style={{ cursor: "pointer", accentColor: "#10b981" }}
                                  />
                                  <span>{String.fromCharCode(65 + oIdx)} {mcqForm.correctOptionIndex === oIdx ? "✓" : ""}</span>
                                </label>
                                <input
                                  type="text"
                                  className="lc-form-input"
                                  placeholder={`Option ${String.fromCharCode(65 + oIdx)} text`}
                                  value={opt}
                                  onChange={(e) => {
                                    const nextOpts = [...mcqForm.options];
                                    nextOpts[oIdx] = e.target.value;
                                    setMcqForm({ ...mcqForm, options: nextOpts });
                                  }}
                                  required
                                  style={{ margin: 0 }}
                                />
                                {mcqForm.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextOpts = mcqForm.options.filter((_, idx) => idx !== oIdx);
                                      const nextCorrect = mcqForm.correctOptionIndex >= nextOpts.length ? 0 : mcqForm.correctOptionIndex;
                                      setMcqForm({ ...mcqForm, options: nextOpts, correctOptionIndex: nextCorrect });
                                    }}
                                    style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "none", borderRadius: "6px", padding: "0.4rem 0.6rem", cursor: "pointer", fontSize: "0.75rem" }}
                                    title="Delete this option"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer Buttons */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                      <div>
                        {selectedQuestionId !== "new" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(selectedQuestionId)}
                            style={{
                              background: "rgba(239, 68, 68, 0.15)",
                              color: "#ef4444",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              borderRadius: "8px",
                              padding: "0.55rem 1rem",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              cursor: "pointer"
                            }}
                          >
                            🗑️ Remove Question
                          </button>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => setShowCodingModal(null)}
                          style={{
                            background: "rgba(255, 255, 255, 0.1)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "0.6rem 1.2rem",
                            cursor: "pointer",
                            fontSize: "0.85rem"
                          }}
                        >
                          Done / Close
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleSaveQuestion(e, true)}
                          disabled={codingStatus.loading}
                          style={{
                            background: "rgba(255, 126, 41, 0.15)",
                            color: "#ff7e29",
                            border: "1px solid rgba(255, 126, 41, 0.4)",
                            borderRadius: "8px",
                            padding: "0.6rem 1.2rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontSize: "0.85rem"
                          }}
                        >
                          + Save &amp; Add Another
                        </button>

                        <button
                          type="submit"
                          disabled={codingStatus.loading}
                          style={{
                            background: "#10b981",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "0.6rem 1.4rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)"
                          }}
                        >
                          {codingStatus.loading
                            ? "Saving..."
                            : selectedQuestionId === "new"
                            ? (manualQuestionType === "mcq" ? "💾 Save MCQ Question" : "💾 Save Coding Problem")
                            : "💾 Update Question"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}
