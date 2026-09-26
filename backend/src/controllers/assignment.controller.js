import { pool } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { executeSubmission } from "../utils/codeExecution.js";

function normalizeTestCases(rawCases) {
  if (!Array.isArray(rawCases)) {
    return [];
  }

  return rawCases
    .map((entry, index) => ({
      input_data: entry?.input_data ?? entry?.inputData ?? "",
      expected_output: entry?.expected_output ?? entry?.expectedOutput ?? "",
      sort_order: typeof entry?.sort_order === "number" ? entry.sort_order : index
    }))
    .filter((entry) => entry.input_data.trim() || entry.expected_output.trim());
}

async function saveProblemTestCases(client, problemId, testCases, isSample) {
  await client.query("DELETE FROM course_problem_test_cases WHERE course_problem_id = $1 AND is_sample = $2", [
    problemId,
    isSample
  ]);

  for (const testCase of testCases) {
    await client.query(
      `
        INSERT INTO course_problem_test_cases (course_problem_id, input_data, expected_output, is_sample, sort_order)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [problemId, testCase.input_data, testCase.expected_output, isSample, testCase.sort_order]
    );
  }
}

function isStudentEligibleForAssignment(studentProfile, assignment) {
  if (!studentProfile) return false;

  const targetBatch = assignment.target_batch || assignment.targetBatch || "ALL";
  const targetYear = assignment.target_year || assignment.targetYear || "ALL";
  const targetSemester = assignment.target_semester || assignment.targetSemester || "ALL";

  if (targetBatch !== "ALL" && targetBatch !== studentProfile.batch) {
    return false;
  }

  const studentSem = Number(studentProfile.semester) || 1;
  const studentYear =
    studentSem <= 2 ? "1st Year" : studentSem <= 4 ? "2nd Year" : studentSem <= 6 ? "3rd Year" : "4th Year";

  if (targetYear !== "ALL" && targetYear !== studentYear) {
    return false;
  }

  if (targetSemester !== "ALL" && String(targetSemester) !== String(studentSem)) {
    return false;
  }

  return true;
}

export const createAssignment = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    startDate,
    dueDate,
    startTime,
    endTime,
    timeLimitMinutes,
    durationMinutes,
    maxScore,
    status,
    questions,
    type,
    isMst,
    isProctored,
    targetBatch,
    targetYear,
    targetSemester
  } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ message: "Assignment title is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const startVal = startTime || startDate || null;
    const endVal = endTime || dueDate || null;
    const allowedTypes = ['coding', 'theory', 'mst', 'quiz', 'assignment'];
    const safeType = type && allowedTypes.includes(type.trim().toLowerCase()) 
      ? type.trim().toLowerCase() 
      : (isMst ? 'mst' : 'coding');

    const safeBatch = targetBatch?.trim() || 'ALL';
    const safeYear = targetYear?.trim() || 'ALL';
    const safeSemester = targetSemester?.trim() || 'ALL';

    let finalDuration = Number(durationMinutes);
    if (startVal && endVal) {
      const s = new Date(startVal).getTime();
      const e = new Date(endVal).getTime();
      if (!isNaN(s) && !isNaN(e) && e > s) {
        const diff = Math.round((e - s) / 60000);
        if (!finalDuration || finalDuration === 90 || Boolean(isMst)) {
          finalDuration = diff;
        }
      }
    }
    finalDuration = finalDuration > 0 ? finalDuration : 90;

    // 1. Create Assignment
    const assignmentResult = await client.query(
      `
        INSERT INTO course_assignments (
          course_id, title, description, assignment_type, start_date, due_date, start_time, end_time, time_limit_minutes, duration_minutes, max_score, status, is_mst, is_proctored, target_batch, target_year, target_semester, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id, course_id, title, description, assignment_type, start_date, due_date, start_time, end_time, time_limit_minutes, duration_minutes, max_score, status, is_mst, is_proctored, target_batch, target_year, target_semester
      `,
      [
        req.course.id,
        title.trim(),
        description?.trim() || "",
        safeType,
        startVal,
        endVal,
        startVal,
        endVal,
        timeLimitMinutes || null,
        finalDuration,
        Number(maxScore) || 100,
        status || 'published',
        Boolean(isMst),
        isProctored !== undefined ? Boolean(isProctored) : true,
        safeBatch,
        safeYear,
        safeSemester,
        req.currentUser.id
      ]
    );

    const createdAssignment = assignmentResult.rows[0];
    const assignmentId = createdAssignment.id;

    // 2. Add Questions (if provided)
    if (questions && Array.isArray(questions)) {
      let sortOrder = 0;
      for (const q of questions) {
        let mcqId = null;
        let codingProblemId = q.course_coding_problem_id || null;

        if (q.type === 'mcq') {
          const mcqResult = await client.query(
            `
              INSERT INTO mcq_questions (course_id, question_text, options, correct_option_index, marks, negative_marks)
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id
            `,
            [
              req.course.id,
              q.questionText || "Question",
              JSON.stringify(q.options || ["", "", "", ""]),
              q.correctOptionIndex || 0,
              q.marks || 1,
              q.negativeMarks || 0
            ]
          );
          mcqId = mcqResult.rows[0].id;
        } else if (q.type === 'coding' && !codingProblemId) {
          const codingResult = await client.query(
            `
                INSERT INTO course_coding_problems (course_id, title, statement, input_format, output_format, constraints_text, examples_text, difficulty, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `,
            [
              req.course.id,
              q.title || "Coding Question",
              q.statement || "",
              q.inputFormat || "",
              q.outputFormat || "",
              q.constraintsText || "",
              q.examplesText || "",
              q.difficulty || 'medium',
              req.currentUser.id
            ]
          );
          codingProblemId = codingResult.rows[0].id;

          const sampleCases = Array.isArray(q.sampleTestCases) && q.sampleTestCases.length > 0
            ? normalizeTestCases(q.sampleTestCases)
            : (q.sampleInput ? normalizeTestCases([{ input_data: q.sampleInput, expected_output: q.sampleOutput || "" }]) : []);

          const hiddenCases = Array.isArray(q.hiddenTestCases) && q.hiddenTestCases.length > 0
            ? normalizeTestCases(q.hiddenTestCases)
            : (q.hiddenInput ? normalizeTestCases([{ input_data: q.hiddenInput, expected_output: q.hiddenOutput || "" }]) : []);

          await saveProblemTestCases(client, codingProblemId, sampleCases, true);
          await saveProblemTestCases(client, codingProblemId, hiddenCases, false);
        }

        await client.query(
          `
            INSERT INTO assignment_questions (assignment_id, question_type, mcq_id, course_coding_problem_id, sort_order, marks)
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            assignmentId,
            q.type || 'coding',
            mcqId,
            codingProblemId,
            sortOrder++,
            q.marks || 1
          ]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({
      message: "Assignment created successfully.",
      assignmentId,
      assignment: createdAssignment
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const getAssignment = asyncHandler(async (req, res) => {
    const assignmentResult = await pool.query(
        `SELECT * FROM course_assignments WHERE id = $1`, [req.params.assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
        return res.status(404).json({ message: "Assignment not found." });
    }

    const assignment = assignmentResult.rows[0];

    // Check student audience eligibility and enrollment
    if (req.currentUser.role === 'student') {
      const enrollCheck = await pool.query(
        `SELECT 1 FROM course_enrollments WHERE course_id = $1 AND student_id = $2 AND status = 'enrolled'`,
        [assignment.course_id, req.currentUser.id]
      );
      if (enrollCheck.rows.length === 0) {
        return res.status(403).json({
          message: "You must be enrolled in this course to access this examination."
        });
      }
      if (!isStudentEligibleForAssignment(req.roleProfile, assignment)) {
        return res.status(403).json({
          message: `This examination is restricted to Batch ${assignment.target_batch || 'assigned'} / ${assignment.target_year || 'specified year'} students.`
        });
      }
    }

    const questionsResult = await pool.query(
        `
        SELECT aq.id as assignment_question_id, aq.question_type, aq.marks, aq.sort_order,
               m.id as mcq_id, m.question_text, m.options, m.correct_option_index, m.negative_marks,
               c.id as coding_id, c.title, c.statement, c.input_format, c.output_format, c.constraints_text, c.examples_text, c.difficulty
        FROM assignment_questions aq
        LEFT JOIN mcq_questions m ON aq.mcq_id = m.id
        LEFT JOIN course_coding_problems c ON aq.course_coding_problem_id = c.id
        WHERE aq.assignment_id = $1
        ORDER BY aq.sort_order ASC
        `, [assignment.id]
    );

    const codingProblemIds = questionsResult.rows
        .filter(q => q.coding_id)
        .map(q => q.coding_id);

    let testCasesMap = new Map();
    if (codingProblemIds.length > 0) {
        const tcResult = await pool.query(
            `SELECT course_problem_id, input_data, expected_output, is_sample, sort_order
             FROM course_problem_test_cases
             WHERE course_problem_id = ANY($1::uuid[])
             ORDER BY sort_order ASC, created_at ASC`,
            [codingProblemIds]
        );
        for (const tc of tcResult.rows) {
            if (!testCasesMap.has(tc.course_problem_id)) {
                testCasesMap.set(tc.course_problem_id, { samples: [], hidden: [] });
            }
            if (tc.is_sample) {
                testCasesMap.get(tc.course_problem_id).samples.push(tc);
            } else {
                testCasesMap.get(tc.course_problem_id).hidden.push(tc);
            }
        }
    }

    const questions = questionsResult.rows.map(q => {
        if (q.question_type === 'mcq') {
            const mcq = {
                id: q.assignment_question_id,
                type: 'mcq',
                marks: q.marks,
                sortOrder: q.sort_order,
                questionText: q.question_text,
                options: q.options,
                negativeMarks: q.negative_marks
            };
            if (req.currentUser.role !== 'student') {
                mcq.correctOptionIndex = q.correct_option_index;
            }
            return mcq;
        } else {
            const tcs = testCasesMap.get(q.coding_id) || { samples: [], hidden: [] };
            return {
                id: q.assignment_question_id,
                type: 'coding',
                marks: q.marks,
                sortOrder: q.sort_order,
                codingProblemId: q.coding_id,
                title: q.title,
                statement: q.statement,
                inputFormat: q.input_format,
                outputFormat: q.output_format,
                constraintsText: q.constraints_text,
                examplesText: q.examples_text,
                difficulty: q.difficulty,
                sampleTestCases: tcs.samples,
                hiddenTestCases: req.currentUser.role === 'student' ? [] : tcs.hidden,
                sampleInput: tcs.samples[0]?.input_data || "",
                sampleOutput: tcs.samples[0]?.expected_output || "",
                hiddenInput: req.currentUser.role === 'student' ? "" : (tcs.hidden[0]?.input_data || ""),
                hiddenOutput: req.currentUser.role === 'student' ? "" : (tcs.hidden[0]?.expected_output || "")
            };
        }
    });

    let durationMinutes = assignment.duration_minutes;
    if (assignment.start_time && assignment.end_time) {
      const s = new Date(assignment.start_time).getTime();
      const e = new Date(assignment.end_time).getTime();
      if (!isNaN(s) && !isNaN(e) && e > s) {
        const diff = Math.round((e - s) / 60000);
        if (assignment.is_mst || !durationMinutes || durationMinutes === 90) {
          durationMinutes = diff;
        }
      }
    }

    res.json({
      ...assignment,
      duration_minutes: durationMinutes || 90,
      durationMinutes: durationMinutes || 90,
      targetBatch: assignment.target_batch || "ALL",
      targetYear: assignment.target_year || "ALL",
      targetSemester: assignment.target_semester || "ALL",
      questions
    });
});

export const listAssignmentsForCourse = asyncHandler(async (req, res) => {
  const assignmentResult = await pool.query(
    `
      SELECT ca.id, ca.title, ca.description, ca.assignment_type, ca.start_date, ca.due_date, ca.start_time, ca.end_time, ca.time_limit_minutes, ca.duration_minutes, ca.max_score, ca.status, ca.is_mst, ca.is_proctored, ca.target_batch, ca.target_year, ca.target_semester, ca.created_at,
             (SELECT COUNT(*)::int FROM assignment_questions aq WHERE aq.assignment_id = ca.id) AS questions_count
      FROM course_assignments ca
      WHERE ca.course_id = $1
      ORDER BY ca.start_time ASC NULLS LAST, ca.due_date ASC NULLS LAST, ca.created_at DESC
    `,
    [req.course.id]
  );

  const submissionsResult = await pool.query(
    `
      SELECT id, assignment_id, student_id, status, total_score, submitted_at
      FROM assignment_student_attempts
      WHERE assignment_id IN (SELECT id FROM course_assignments WHERE course_id = $1)
    `,
    [req.course.id]
  );

  const groupedSubmissions = new Map();
  submissionsResult.rows.forEach((sub) => {
    if (!groupedSubmissions.has(sub.assignment_id)) {
      groupedSubmissions.set(sub.assignment_id, []);
    }
    groupedSubmissions.get(sub.assignment_id).push(sub);
  });

  let attempts = { rows: [] };
  if (req.currentUser.role === 'student') {
    attempts = await pool.query(
        `SELECT assignment_id, status, total_score FROM assignment_student_attempts WHERE student_id = $1`,
        [req.currentUser.id]
    );
  }

  const attemptsMap = new Map();
  attempts.rows.forEach(a => attemptsMap.set(a.assignment_id, a));

  let filteredRows = assignmentResult.rows;
  if (req.currentUser.role === 'student') {
    const enrollCheck = await pool.query(
      `SELECT 1 FROM course_enrollments WHERE course_id = $1 AND student_id = $2 AND status = 'enrolled'`,
      [req.course.id, req.currentUser.id]
    );
    if (enrollCheck.rows.length === 0) {
      return res.json([]);
    }
    filteredRows = filteredRows.filter(row => isStudentEligibleForAssignment(req.roleProfile, row));
  }

  res.json(
    filteredRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description || "",
      type: row.assignment_type,
      startDate: row.start_date,
      dueDate: row.due_date,
      startTime: row.start_time,
      endTime: row.end_time,
      timeLimitMinutes: row.time_limit_minutes,
      durationMinutes: (() => {
        let duration = row.duration_minutes;
        if (row.start_time && row.end_time) {
          const s = new Date(row.start_time).getTime();
          const e = new Date(row.end_time).getTime();
          if (!isNaN(s) && !isNaN(e) && e > s) {
            const diff = Math.round((e - s) / 60000);
            if (row.is_mst || !duration || duration === 90) {
              return diff;
            }
          }
        }
        return duration || 90;
      })(),
      maxScore: row.max_score,
      status: row.status,
      isMst: row.is_mst,
      isProctored: row.is_proctored,
      targetBatch: row.target_batch || "ALL",
      targetYear: row.target_year || "ALL",
      targetSemester: row.target_semester || "ALL",
      questionsCount: Number(row.questions_count) || 0,
      submissions: groupedSubmissions.get(row.id) || [],
      attempt: req.currentUser.role === 'student' ? attemptsMap.get(row.id) || null : undefined
    }))
  );
});

export const getStudentExams = asyncHandler(async (req, res) => {
  if (req.currentUser.role !== "student") {
    return res.status(403).json({ message: "Only students can access this examination portal endpoint." });
  }

  const queryResult = await pool.query(
    `
      SELECT 
        ca.id,
        ca.course_id,
        ca.title,
        ca.description,
        ca.assignment_type,
        ca.start_date,
        ca.due_date,
        ca.start_time,
        ca.end_time,
        ca.time_limit_minutes,
        ca.duration_minutes,
        ca.max_score,
        ca.status,
        ca.is_mst,
        ca.is_proctored,
        ca.target_batch,
        ca.target_year,
        ca.target_semester,
        ca.created_at,
        c.code as course_code,
        c.title as course_title,
        (
          SELECT u.full_name 
          FROM course_faculty cf 
          JOIN users u ON u.id = cf.faculty_id 
          WHERE cf.course_id = c.id 
          LIMIT 1
        ) as instructor_name,
        asa.id as attempt_id,
        asa.status as attempt_status,
        asa.total_score as attempt_score,
        asa.started_at as attempt_started_at,
        asa.submitted_at as attempt_submitted_at,
        (
          SELECT COUNT(*)::int 
          FROM assignment_questions aq 
          WHERE aq.assignment_id = ca.id
        ) as questions_count
      FROM course_assignments ca
      JOIN course_enrollments ce 
        ON ce.course_id = ca.course_id 
       AND ce.student_id = $1 
       AND ce.status = 'enrolled'
      JOIN courses c 
        ON c.id = ca.course_id
      LEFT JOIN assignment_student_attempts asa 
        ON asa.assignment_id = ca.id 
       AND asa.student_id = $1
      ORDER BY ca.start_time ASC NULLS LAST, ca.due_date ASC NULLS LAST, ca.created_at DESC
    `,
    [req.currentUser.id]
  );

  const coursesMap = new Map();
  const exams = [];
  const now = new Date();

  for (const row of queryResult.rows) {
    if (!coursesMap.has(row.course_id)) {
      coursesMap.set(row.course_id, {
        id: row.course_id,
        code: row.course_code || "COURSE",
        title: row.course_title || "Course",
        instructor: row.instructor_name || "Faculty Instructor"
      });
    }

    if (req.roleProfile && !isStudentEligibleForAssignment(req.roleProfile, row)) {
      continue;
    }

    const start = row.start_time ? new Date(row.start_time) : (row.due_date ? new Date(row.due_date) : null);
    const end = row.end_time ? new Date(row.end_time) : (row.due_date ? new Date(row.due_date) : null);

    const isMst = Boolean(
      row.is_mst ||
      (row.title && (row.title.toLowerCase().includes("mst") || row.title.toLowerCase().includes("mid-semester")))
    );
    const isQuiz = Boolean(
      row.title && (row.title.toLowerCase().includes("quiz") || row.title.toLowerCase().includes("unit"))
    );

    const isCompleted = row.attempt_status === "submitted" || row.attempt_status === "graded";

    let status = "upcoming";
    if (isCompleted) {
      status = "completed";
    } else if (start && end) {
      if (now >= start && now <= end) {
        status = "live";
      } else if (now > end) {
        status = "completed";
      } else {
        status = "upcoming";
      }
    } else if (end && now <= end) {
      status = "live";
    }

    let durationMinutes = row.duration_minutes;
    if (start && end) {
      const diff = Math.round((end.getTime() - start.getTime()) / 60000);
      if (diff > 0 && (isMst || !durationMinutes || durationMinutes === 90)) {
        durationMinutes = diff;
      }
    }
    durationMinutes = durationMinutes > 0 ? durationMinutes : 90;

    exams.push({
      id: row.id,
      courseId: row.course_id,
      type: isMst ? "mst" : isQuiz ? "quiz" : (row.assignment_type || "assignment"),
      isMst,
      title: row.title,
      description: row.description || "Official institutional paper.",
      courseCode: row.course_code || "COURSE",
      courseTitle: row.course_title || "Course",
      instructor: row.instructor_name || "Faculty Instructor",
      status,
      startRaw: start,
      endRaw: end,
      startTime: start ? start.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Scheduled",
      endTime: end ? end.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "TBA",
      durationMinutes,
      totalMarks: row.max_score || 100,
      targetBatch: row.target_batch || "ALL",
      targetYear: row.target_year || "ALL",
      targetSemester: row.target_semester || "ALL",
      questionsCount: row.questions_count || 0,
      score: row.attempt_score ?? null,
      attemptStatus: row.attempt_status || null,
      submittedAt: row.attempt_submitted_at
        ? new Date(row.attempt_submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
        : null,
      proctored: row.is_proctored !== undefined ? row.is_proctored : true,
      instructions: [
        "Ensure a stable internet connection before starting the examination.",
        "Full-screen tab switching is monitored. Do not exit full-screen during timed paper.",
        "Your code submissions and answers are auto-saved and recorded directly in the server database."
      ]
    });
  }

  // Also include any other enrolled courses so filter dropdowns have the complete list
  const enrolledCoursesResult = await pool.query(
    `
      SELECT c.id, c.code, c.title
      FROM course_enrollments ce
      JOIN courses c ON c.id = ce.course_id
      WHERE ce.student_id = $1 AND ce.status = 'enrolled'
      ORDER BY c.code ASC
    `,
    [req.currentUser.id]
  );

  for (const c of enrolledCoursesResult.rows) {
    if (!coursesMap.has(c.id)) {
      coursesMap.set(c.id, {
        id: c.id,
        code: c.code || "COURSE",
        title: c.title || "Course"
      });
    }
  }

  res.json({
    exams,
    courses: Array.from(coursesMap.values())
  });
});

export const addAssignmentQuestion = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const {
    type = 'coding',
    title,
    statement,
    difficulty = 'medium',
    inputFormat,
    outputFormat,
    constraintsText,
    examplesText,
    marks = 10,
    sampleInput,
    sampleOutput,
    hiddenInput,
    hiddenOutput,
    sampleTestCases,
    hiddenTestCases,
    questionText,
    options,
    correctOptionIndex,
    negativeMarks
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const asgCheck = await client.query(
      "SELECT id FROM course_assignments WHERE id = $1 AND course_id = $2",
      [assignmentId, req.course.id]
    );
    if (asgCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Assignment not found." });
    }

    const sortRes = await client.query(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM assignment_questions WHERE assignment_id = $1",
      [assignmentId]
    );
    const nextOrder = sortRes.rows[0].next_order;

    let mcqId = null;
    let codingProblemId = null;

    if (type === 'mcq') {
      const mcqResult = await client.query(
        `INSERT INTO mcq_questions (course_id, question_text, options, correct_option_index, marks, negative_marks)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          req.course.id,
          questionText || title || "MCQ Question",
          JSON.stringify(options || ["", "", "", ""]),
          correctOptionIndex || 0,
          Number(marks) || 1,
          Number(negativeMarks) || 0
        ]
      );
      mcqId = mcqResult.rows[0].id;
    } else {
      const codingResult = await client.query(
        `INSERT INTO course_coding_problems (course_id, title, statement, input_format, output_format, constraints_text, examples_text, difficulty, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          req.course.id,
          title?.trim() || "Coding Problem",
          statement?.trim() || "",
          inputFormat?.trim() || null,
          outputFormat?.trim() || null,
          constraintsText?.trim() || null,
          examplesText?.trim() || null,
          difficulty?.trim()?.toLowerCase() || "medium",
          req.currentUser.id
        ]
      );
      codingProblemId = codingResult.rows[0].id;

      const sampleCases = Array.isArray(sampleTestCases) && sampleTestCases.length > 0
        ? normalizeTestCases(sampleTestCases)
        : (sampleInput ? normalizeTestCases([{ input_data: sampleInput, expected_output: sampleOutput || "" }]) : []);

      const hiddenCases = Array.isArray(hiddenTestCases) && hiddenTestCases.length > 0
        ? normalizeTestCases(hiddenTestCases)
        : (hiddenInput ? normalizeTestCases([{ input_data: hiddenInput, expected_output: hiddenOutput || "" }]) : []);

      await saveProblemTestCases(client, codingProblemId, sampleCases, true);
      await saveProblemTestCases(client, codingProblemId, hiddenCases, false);
    }

    const aqResult = await client.query(
      `INSERT INTO assignment_questions (assignment_id, question_type, mcq_id, course_coding_problem_id, sort_order, marks)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, question_type, sort_order, marks`,
      [assignmentId, type, mcqId, codingProblemId, nextOrder, Number(marks) || 10]
    );

    await client.query("COMMIT");
    res.status(201).json({
      message: "Question added to exam successfully.",
      question: {
        id: aqResult.rows[0].id,
        type,
        marks: aqResult.rows[0].marks,
        codingProblemId,
        mcqId,
        title,
        statement,
        difficulty
      }
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

export const addAssignmentQuestionsBulk = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { questions } = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ message: "An array of questions is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const asgCheck = await client.query(
      "SELECT id FROM course_assignments WHERE id = $1 AND course_id = $2",
      [assignmentId, req.course.id]
    );
    if (asgCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Assignment not found." });
    }

    const sortRes = await client.query(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM assignment_questions WHERE assignment_id = $1",
      [assignmentId]
    );
    let nextOrder = parseInt(sortRes.rows[0].next_order, 10);
    const insertedQuestions = [];

    for (const q of questions) {
      const type = q.type === 'mcq' ? 'mcq' : 'coding';
      let mcqId = null;
      let codingProblemId = null;

      if (type === 'mcq') {
        const mcqResult = await client.query(
          `INSERT INTO mcq_questions (course_id, question_text, options, correct_option_index, marks, negative_marks)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            req.course.id,
            q.questionText || q.title || "MCQ Question",
            JSON.stringify(Array.isArray(q.options) ? q.options : ["Option 1", "Option 2", "Option 3", "Option 4"]),
            typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
            Number(q.marks) || 1,
            Number(q.negativeMarks) || 0
          ]
        );
        mcqId = mcqResult.rows[0].id;
      } else {
        const codingResult = await client.query(
          `INSERT INTO course_coding_problems (course_id, title, statement, input_format, output_format, constraints_text, examples_text, difficulty, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [
            req.course.id,
            q.title?.trim() || "Coding Problem",
            q.statement?.trim() || q.description?.trim() || "",
            q.inputFormat?.trim() || null,
            q.outputFormat?.trim() || null,
            q.constraintsText?.trim() || null,
            q.examplesText?.trim() || null,
            q.difficulty?.trim()?.toLowerCase() || "medium",
            req.currentUser.id
          ]
        );
        codingProblemId = codingResult.rows[0].id;

        const sampleCases = Array.isArray(q.sampleTestCases) && q.sampleTestCases.length > 0
          ? normalizeTestCases(q.sampleTestCases)
          : (q.sampleInput ? normalizeTestCases([{ input_data: q.sampleInput, expected_output: q.sampleOutput || "" }]) : []);

        const hiddenCases = Array.isArray(q.hiddenTestCases) && q.hiddenTestCases.length > 0
          ? normalizeTestCases(q.hiddenTestCases)
          : (q.hiddenInput ? normalizeTestCases([{ input_data: q.hiddenInput, expected_output: q.hiddenOutput || "" }]) : []);

        await saveProblemTestCases(client, codingProblemId, sampleCases, true);
        await saveProblemTestCases(client, codingProblemId, hiddenCases, false);
      }

      const aqResult = await client.query(
        `INSERT INTO assignment_questions (assignment_id, question_type, mcq_id, course_coding_problem_id, sort_order, marks)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, question_type, sort_order, marks`,
        [assignmentId, type, mcqId, codingProblemId, nextOrder++, Number(q.marks) || (type === 'mcq' ? 1 : 10)]
      );

      insertedQuestions.push({
        id: aqResult.rows[0].id,
        type,
        marks: aqResult.rows[0].marks,
        codingProblemId,
        mcqId,
        title: q.title || q.questionText
      });
    }

    await client.query("COMMIT");
    res.status(201).json({
      message: `Successfully imported ${insertedQuestions.length} questions.`,
      count: insertedQuestions.length,
      questions: insertedQuestions
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

export const updateAssignmentQuestion = asyncHandler(async (req, res) => {
  const { assignmentId, questionId } = req.params;
  const {
    title,
    statement,
    difficulty,
    inputFormat,
    outputFormat,
    constraintsText,
    examplesText,
    marks,
    sampleInput,
    sampleOutput,
    hiddenInput,
    hiddenOutput,
    sampleTestCases,
    hiddenTestCases,
    questionText,
    options,
    correctOptionIndex,
    negativeMarks
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const qRes = await client.query(
      `SELECT aq.id, aq.question_type, aq.course_coding_problem_id, aq.mcq_id
       FROM assignment_questions aq
       JOIN course_assignments ca ON aq.assignment_id = ca.id
       WHERE aq.id = $1 AND aq.assignment_id = $2 AND ca.course_id = $3`,
      [questionId, assignmentId, req.course.id]
    );

    if (qRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Question not found in this assignment." });
    }

    const currentQ = qRes.rows[0];

    if (marks !== undefined) {
      await client.query("UPDATE assignment_questions SET marks = $1 WHERE id = $2", [Number(marks), questionId]);
    }

    if (currentQ.question_type === 'coding' && currentQ.course_coding_problem_id) {
      await client.query(
        `UPDATE course_coding_problems
         SET title = COALESCE($1, title),
             statement = COALESCE($2, statement),
             input_format = COALESCE($3, input_format),
             output_format = COALESCE($4, output_format),
             constraints_text = COALESCE($5, constraints_text),
             examples_text = COALESCE($6, examples_text),
             difficulty = COALESCE($7, difficulty),
             updated_at = NOW()
         WHERE id = $8`,
        [
          title?.trim() || null,
          statement?.trim() || null,
          inputFormat !== undefined ? inputFormat.trim() : null,
          outputFormat !== undefined ? outputFormat.trim() : null,
          constraintsText !== undefined ? constraintsText.trim() : null,
          examplesText !== undefined ? examplesText.trim() : null,
          difficulty?.trim()?.toLowerCase() || null,
          currentQ.course_coding_problem_id
        ]
      );

      const sampleCases = Array.isArray(sampleTestCases)
        ? normalizeTestCases(sampleTestCases)
        : (sampleInput !== undefined ? normalizeTestCases([{ input_data: sampleInput, expected_output: sampleOutput || "" }]) : null);

      if (sampleCases !== null) {
        await saveProblemTestCases(client, currentQ.course_coding_problem_id, sampleCases, true);
      }

      const hiddenCases = Array.isArray(hiddenTestCases)
        ? normalizeTestCases(hiddenTestCases)
        : (hiddenInput !== undefined ? normalizeTestCases([{ input_data: hiddenInput, expected_output: hiddenOutput || "" }]) : null);

      if (hiddenCases !== null) {
        await saveProblemTestCases(client, currentQ.course_coding_problem_id, hiddenCases, false);
      }
    } else if (currentQ.question_type === 'mcq' && currentQ.mcq_id) {
      await client.query(
        `UPDATE mcq_questions
         SET question_text = COALESCE($1, question_text),
             options = COALESCE($2, options),
             correct_option_index = COALESCE($3, correct_option_index),
             negative_marks = COALESCE($4, negative_marks)
         WHERE id = $5`,
        [
          questionText || title || null,
          options ? JSON.stringify(options) : null,
          correctOptionIndex !== undefined ? Number(correctOptionIndex) : null,
          negativeMarks !== undefined ? Number(negativeMarks) : null,
          currentQ.mcq_id
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Question updated successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

export const deleteAssignmentQuestion = asyncHandler(async (req, res) => {
  const { assignmentId, questionId } = req.params;

  const result = await pool.query(
    `DELETE FROM assignment_questions aq
     USING course_assignments ca
     WHERE aq.id = $1 AND aq.assignment_id = $2 AND ca.id = aq.assignment_id AND ca.course_id = $3
     RETURNING aq.id, aq.course_coding_problem_id`,
    [questionId, assignmentId, req.course.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "Question not found." });
  }

  const codingProblemId = result.rows[0].course_coding_problem_id;
  if (codingProblemId) {
    const checkOtherUses = await pool.query(
      "SELECT id FROM assignment_questions WHERE course_coding_problem_id = $1",
      [codingProblemId]
    );
    if (checkOtherUses.rows.length === 0) {
      await pool.query("DELETE FROM course_coding_problems WHERE id = $1", [codingProblemId]);
    }
  }

  res.json({ message: "Question removed successfully." });
});

export const startAttempt = asyncHandler(async (req, res) => {
    const assignmentResult = await pool.query(
      `SELECT * FROM course_assignments WHERE id = $1`,
      [req.params.assignmentId]
    );
    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    if (req.currentUser.role === 'student') {
      const enrollCheck = await pool.query(
        `SELECT 1 FROM course_enrollments WHERE course_id = $1 AND student_id = $2 AND status = 'enrolled'`,
        [assignmentResult.rows[0].course_id, req.currentUser.id]
      );
      if (enrollCheck.rows.length === 0) {
        return res.status(403).json({
          message: "You must be enrolled in this course to take this examination."
        });
      }
      if (!isStudentEligibleForAssignment(req.roleProfile, assignmentResult.rows[0])) {
        return res.status(403).json({
          message: "You are not eligible to start this examination paper."
        });
      }
    }

    const result = await pool.query(
        `
        INSERT INTO assignment_student_attempts (assignment_id, student_id, status, started_at)
        VALUES ($1, $2, 'in_progress', NOW())
        ON CONFLICT (assignment_id, student_id) DO UPDATE SET updated_at = NOW()
        RETURNING id, status, started_at
        `,
        [req.params.assignmentId, req.currentUser.id]
    );
    res.json(result.rows[0]);
});

export const saveProgress = asyncHandler(async (req, res) => {
    const { attemptId, questionId, type, answer } = req.body;

    if (type === 'mcq') {
        await pool.query(
            `
            INSERT INTO assignment_mcq_answers (attempt_id, assignment_question_id, selected_option_index)
            VALUES ($1, $2, $3)
            ON CONFLICT (attempt_id, assignment_question_id) DO UPDATE SET selected_option_index = EXCLUDED.selected_option_index, updated_at = NOW()
            `,
            [attemptId, questionId, answer]
        );
    } else if (type === 'coding') {
        await pool.query(
            `
            INSERT INTO assignment_coding_answers (attempt_id, assignment_question_id, language, source_code)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (attempt_id, assignment_question_id) DO UPDATE SET language = EXCLUDED.language, source_code = EXCLUDED.source_code, updated_at = NOW()
            `,
            [attemptId, questionId, answer.language, answer.code]
        );
    }
    res.json({ message: "Progress saved." });
});

export const submitAttempt = asyncHandler(async (req, res) => {
    const { attemptId } = req.body;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Fetch all MCQ answers for this attempt and grade them
        const mcqs = await client.query(`
            SELECT ama.id, ama.selected_option_index, mq.correct_option_index, aq.marks, mq.negative_marks
            FROM assignment_mcq_answers ama
            JOIN assignment_questions aq ON ama.assignment_question_id = aq.id
            JOIN mcq_questions mq ON aq.mcq_id = mq.id
            WHERE ama.attempt_id = $1
        `, [attemptId]);

        let totalMcqScore = 0;
        for (const ans of mcqs.rows) {
            const isCorrect = ans.selected_option_index === ans.correct_option_index;
            const marksObtained = isCorrect ? ans.marks : (ans.selected_option_index !== null && ans.selected_option_index !== undefined ? -ans.negative_marks : 0);
            totalMcqScore += Math.max(0, marksObtained);

            await client.query(`
                UPDATE assignment_mcq_answers
                SET is_correct = $1, marks_obtained = $2, updated_at = NOW()
                WHERE id = $3
            `, [isCorrect, marksObtained, ans.id]);
        }

        // Coding questions grading usually happens asynchronously via judge.
        // For simplicity, we just finalize attempt status and MCQ score for now.
        const codings = await client.query(`
             SELECT COALESCE(SUM(marks_obtained), 0) as coding_score FROM assignment_coding_answers WHERE attempt_id = $1
        `, [attemptId]);

        const totalScore = totalMcqScore + parseInt(codings.rows[0].coding_score || 0);

        await client.query(`
            UPDATE assignment_student_attempts
            SET status = 'submitted', submitted_at = NOW(), total_score = $1, updated_at = NOW()
            WHERE id = $2
        `, [totalScore, attemptId]);

        await client.query("COMMIT");
        res.json({ message: "Attempt submitted successfully.", totalScore });
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
});

export const getAssignmentRecords = asyncHandler(async (req, res) => {
    const attempts = await pool.query(`
        SELECT asa.id as attempt_id, asa.status, asa.started_at, asa.submitted_at, asa.total_score,
               u.id as student_id, u.full_name, u.email
        FROM assignment_student_attempts asa
        JOIN users u ON u.id = asa.student_id
        WHERE asa.assignment_id = $1
        ORDER BY asa.submitted_at DESC NULLS LAST
    `, [req.params.assignmentId]);

    res.json(attempts.rows);
});

export const getAttemptDetails = asyncHandler(async (req, res) => {
     const attemptId = req.params.attemptId;

     const attemptInfo = await pool.query(`SELECT * FROM assignment_student_attempts WHERE id = $1`, [attemptId]);
     if (attemptInfo.rows.length === 0) return res.status(404).json({message: "Not found"});

     const mcqAnswers = await pool.query(`
        SELECT ama.assignment_question_id, ama.selected_option_index, ama.is_correct, ama.marks_obtained,
               mq.correct_option_index
        FROM assignment_mcq_answers ama
        JOIN assignment_questions aq ON ama.assignment_question_id = aq.id
        JOIN mcq_questions mq ON aq.mcq_id = mq.id
        WHERE ama.attempt_id = $1
     `, [attemptId]);

     const codingAnswers = await pool.query(`
         SELECT aca.assignment_question_id, aca.language, aca.source_code, aca.execution_result, aca.passed_test_cases, aca.total_test_cases, aca.marks_obtained
         FROM assignment_coding_answers aca
         WHERE aca.attempt_id = $1
     `, [attemptId]);

     res.json({
         attempt: attemptInfo.rows[0],
         mcqAnswers: mcqAnswers.rows,
         codingAnswers: codingAnswers.rows
     });
});

export const updateAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const {
    title,
    description,
    type,
    dueDate,
    startTime,
    endTime,
    durationMinutes,
    maxScore,
    isMst,
    isProctored,
    targetBatch,
    targetYear,
    targetSemester
  } = req.body;

  // Anti-tamper check: Students cannot edit assignments or scores
  if (req.currentUser.role === "student") {
    return res.status(403).json({ message: "Access denied. Students cannot modify examination papers or test scores." });
  }

  const allowedTypes = ['coding', 'theory', 'mst', 'quiz', 'assignment'];
  const safeType = type && allowedTypes.includes(type.trim().toLowerCase()) ? type.trim().toLowerCase() : null;

  let finalDuration = durationMinutes ? Number(durationMinutes) : null;
  const startVal = startTime || null;
  const endVal = endTime || dueDate || null;
  if (startVal && endVal) {
    const s = new Date(startVal).getTime();
    const e = new Date(endVal).getTime();
    if (!isNaN(s) && !isNaN(e) && e > s) {
      const diff = Math.round((e - s) / 60000);
      if (!finalDuration || finalDuration === 90 || Boolean(isMst)) {
        finalDuration = diff;
      }
    }
  }

  const result = await pool.query(
    `
      UPDATE course_assignments
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          assignment_type = COALESCE($3, assignment_type),
          due_date = COALESCE($4, due_date),
          start_time = COALESCE($5, start_time),
          end_time = COALESCE($6, end_time),
          duration_minutes = COALESCE($7, duration_minutes),
          max_score = COALESCE($8, max_score),
          is_mst = COALESCE($9, is_mst),
          is_proctored = COALESCE($10, is_proctored),
          target_batch = COALESCE($11, target_batch),
          target_year = COALESCE($12, target_year),
          target_semester = COALESCE($13, target_semester),
          updated_at = NOW()
      WHERE id = $14 AND course_id = $15
      RETURNING id, title, description, assignment_type, due_date, start_time, end_time, duration_minutes, max_score, is_mst, is_proctored, target_batch, target_year, target_semester
    `,
    [
      title?.trim() || null,
      description?.trim() || null,
      safeType,
      dueDate || endTime || null,
      startTime || null,
      endTime || dueDate || null,
      finalDuration,
      maxScore ? Number(maxScore) : null,
      isMst !== undefined ? Boolean(isMst) : null,
      isProctored !== undefined ? Boolean(isProctored) : null,
      targetBatch !== undefined ? (targetBatch?.trim() || 'ALL') : null,
      targetYear !== undefined ? (targetYear?.trim() || 'ALL') : null,
      targetSemester !== undefined ? (targetSemester?.trim() || 'ALL') : null,
      assignmentId,
      req.course.id
    ]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "Examination paper not found." });
  }

  res.json({
    message: "Examination parameters updated successfully.",
    assignment: result.rows[0]
  });
});

export const deleteAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  // Anti-tamper check: Students cannot delete assignments
  if (req.currentUser.role === "student") {
    return res.status(403).json({ message: "Access denied. Students cannot delete examination papers." });
  }

  const result = await pool.query(
    `DELETE FROM course_assignments WHERE id = $1 AND course_id = $2 RETURNING id`,
    [assignmentId, req.course.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "Examination paper not found." });
  }

  res.json({ message: "Examination paper deleted successfully." });
});

export const runAssignmentQuestionCode = asyncHandler(async (req, res) => {
  const { assignmentId, questionId } = req.params;
  const { language, sourceCode, sampleInput, sampleOutput } = req.body;

  if (!language || !sourceCode) {
    return res.status(400).json({ message: "Language and source code are required." });
  }

  // Find the question and its associated coding problem
  const qResult = await pool.query(
    `SELECT aq.id, aq.question_type, aq.course_coding_problem_id,
            ccp.title, ccp.statement
     FROM assignment_questions aq
     JOIN course_assignments ca ON aq.assignment_id = ca.id
     LEFT JOIN course_coding_problems ccp ON aq.course_coding_problem_id = ccp.id
     WHERE aq.id = $1 AND aq.assignment_id = $2`,
    [questionId, assignmentId]
  );

  if (qResult.rows.length === 0) {
    return res.status(404).json({ message: "Question not found in this assignment." });
  }

  const q = qResult.rows[0];
  const codingProblemId = q.course_coding_problem_id;

  let testCases = [];
  if (codingProblemId) {
    const tcResult = await pool.query(
      `SELECT id, input_data, expected_output, is_sample, sort_order
       FROM course_problem_test_cases
       WHERE course_problem_id = $1 AND is_sample = true
       ORDER BY sort_order ASC, created_at ASC`,
      [codingProblemId]
    );
    testCases = tcResult.rows;

    if (testCases.length === 0) {
      const allTc = await pool.query(
        `SELECT id, input_data, expected_output, is_sample, sort_order
         FROM course_problem_test_cases
         WHERE course_problem_id = $1
         ORDER BY sort_order ASC, created_at ASC`,
        [codingProblemId]
      );
      testCases = allTc.rows;
    }
  }

  // If no test cases in database, provide sample from request if provided
  if (testCases.length === 0 && (sampleInput || sampleOutput)) {
    testCases = [{
      id: "sample-case-1",
      input_data: sampleInput || "",
      expected_output: sampleOutput || "",
      is_sample: true,
      sort_order: 0
    }];
  }

  if (testCases.length === 0) {
    testCases = [{
      id: "run-case-1",
      input_data: "",
      expected_output: "",
      is_sample: true,
      sort_order: 0
    }];
  }

  const executionResult = await executeSubmission({
    language,
    sourceCode,
    problemId: codingProblemId || questionId,
    testCases
  });

  res.json({
    message: "Assignment question code executed.",
    result: {
      ...executionResult,
      language
    }
  });
});