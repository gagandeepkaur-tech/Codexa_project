import { randomBytes } from "node:crypto";
import { pool } from "../config/db.js";
import { hashPassword } from "../utils/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { executeSubmission } from "../utils/codeExecution.js";

function normalizeStringArray(values, formatter = (value) => value) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map((value) => formatter(String(value).trim())).filter(Boolean))];
}

function normalizeCoursePayload(body, currentUser = null) {
  let branches = normalizeStringArray(body.branchTargets, (value) => value.toUpperCase());
  let semesters = normalizeStringArray(body.semesterTargets, (value) => Number(value)).filter((value) =>
    Number.isFinite(value)
  );
  let sections = normalizeStringArray(body.sectionTargets, (value) => value.toUpperCase());
  let batches = normalizeStringArray(body.batchTargets);
  let facultyIds = normalizeStringArray(body.facultyIds);

  // Friendly defaults for quick course creation
  if (branches.length === 0) branches = ["CSE"];
  if (semesters.length === 0) semesters = [1, 2, 3, 4, 5, 6, 7, 8];
  if (sections.length === 0) sections = ["A", "B"];
  if (batches.length === 0) batches = ["2022-2026", "2023-2027", "2024-2028", "2025-2029"];
  if (facultyIds.length === 0 && currentUser?.id) facultyIds = [currentUser.id];

  return {
    program: body.program?.trim() || "",
    code: body.code?.trim().toUpperCase() || "",
    title: body.title?.trim() || "",
    description: body.description?.trim() || "",
    audiences: branches.flatMap((branch) =>
      semesters.flatMap((semester) =>
        sections.flatMap((section) => batches.map((batch) => ({ branch, semester, section, batch })))
      )
    ),
    facultyIds
  };
}

async function buildCourseCard(client, courseId, currentUser) {
  const courseResult = await client.query(
    `
      SELECT id, program, code, title, description, is_active, created_at, updated_at
      FROM courses
      WHERE id = $1
    `,
    [courseId]
  );

  if (courseResult.rows.length === 0) {
    return null;
  }

  const audienceResult = await client.query(
    `
      SELECT branch, semester, section, batch
      FROM course_audiences
      WHERE course_id = $1
      ORDER BY branch, semester, section, batch
    `,
    [courseId]
  );
  const facultyResult = await client.query(
    `
      SELECT u.id, u.full_name, u.email
      FROM course_faculty cf
      JOIN users u ON u.id = cf.faculty_id
      WHERE cf.course_id = $1
      ORDER BY u.full_name ASC
    `,
    [courseId]
  );
  const countsResult = await client.query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM course_assignments WHERE course_id = $1) AS assignment_count,
        (SELECT COUNT(*)::int FROM course_materials WHERE course_id = $1) AS materials_count,
        (SELECT COUNT(*)::int FROM course_coding_problems WHERE course_id = $1) AS coding_problems_count,
        (SELECT COUNT(*)::int FROM course_enrollments WHERE course_id = $1 AND status = 'enrolled') AS enrolled_count
    `,
    [courseId]
  );

  const audiences = audienceResult.rows;
  const branchTargets = [...new Set(audiences.map((row) => row.branch))];
  const semesterTargets = [...new Set(audiences.map((row) => row.semester))];
  const sectionTargets = [...new Set(audiences.map((row) => row.section))];
  const batchTargets = [...new Set(audiences.map((row) => row.batch))];
  const counts = countsResult.rows[0];

  let isEnrolled = false;
  if (currentUser?.role === "student" && currentUser?.id) {
    const enrollRes = await client.query(
      `SELECT 1 FROM course_enrollments WHERE course_id = $1 AND student_id = $2 AND status = 'enrolled'`,
      [courseId, currentUser.id]
    );
    isEnrolled = enrollRes.rows.length > 0;
  }

  return {
    id: courseId,
    program: courseResult.rows[0].program || "",
    code: courseResult.rows[0].code,
    title: courseResult.rows[0].title,
    description: courseResult.rows[0].description || "",
    audiences,
    branchTargets,
    semesterTargets,
    sectionTargets,
    batchTargets,
    faculty: facultyResult.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email
    })),
    materialsCount: counts.materials_count,
    codingProblemsCount: counts.coding_problems_count,
    assignmentCount: counts.assignment_count,
    enrolledCount: counts.enrolled_count,
    isEnrolled,
    isActive: courseResult.rows[0].is_active,
    canManage:
      currentUser?.role === "admin" ||
      facultyResult.rows.some((row) => row.id === currentUser?.id),
    createdAt: courseResult.rows[0].created_at,
    updatedAt: courseResult.rows[0].updated_at
  };
}

async function syncCourseRelations(client, courseId, audiences, facultyIds) {
  await client.query("DELETE FROM course_audiences WHERE course_id = $1", [courseId]);
  await client.query("DELETE FROM course_faculty WHERE course_id = $1", [courseId]);

  for (const audience of audiences) {
    await client.query(
      `
        INSERT INTO course_audiences (course_id, branch, semester, section, batch)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [courseId, audience.branch, audience.semester, audience.section, audience.batch]
    );
  }

  for (const facultyId of facultyIds) {
    await client.query(
      `
        INSERT INTO course_faculty (course_id, faculty_id)
        VALUES ($1, $2)
      `,
      [courseId, facultyId]
    );
  }
}

async function syncCourseEnrollments(client, courseId) {
  const studentResult = await client.query(
    `
      SELECT DISTINCT sp.user_id
      FROM student_profiles sp
      JOIN course_audiences ca
        ON ca.branch = sp.branch
       AND ca.semester = sp.semester
       AND ca.section = sp.section
       AND ca.batch = sp.batch
      WHERE ca.course_id = $1
    `,
    [courseId]
  );

  const matchedStudentIds = studentResult.rows.map((row) => row.user_id);
  await client.query(
    `
      UPDATE course_enrollments
      SET status = 'archived', updated_at = NOW()
      WHERE course_id = $1
    `,
    [courseId]
  );

  for (const studentId of matchedStudentIds) {
    await client.query(
      `
        INSERT INTO course_enrollments (course_id, student_id, status)
        VALUES ($1, $2, 'enrolled')
        ON CONFLICT (course_id, student_id)
        DO UPDATE SET status = 'enrolled', updated_at = NOW()
      `,
      [courseId, studentId]
    );
  }
}

function mapAssignmentRow(row, includeSubmissionDetails = false) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    type: row.assignment_type,
    dueDate: row.due_date,
    startTime: row.start_time,
    endTime: row.end_time,
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
    isMst: row.is_mst,
    isProctored: row.is_proctored,
    maxScore: row.max_score,
    submissionsCount: row.submissions_count ?? 0,
    createdAt: row.created_at,
    ...(includeSubmissionDetails ? { submissions: row.submissions || [] } : {})
  };
}

function normalizeCourseProblemExecutionPayload(body) {
  return {
    language: body.language?.trim()?.toLowerCase() || "",
    sourceCode: body.sourceCode?.trim() || ""
  };
}

function normalizeCourseProblemTestCases(rawCases) {
  if (!Array.isArray(rawCases)) {
    return [];
  }

  return rawCases
    .map((entry, index) => ({
      input_data: entry?.input_data ?? "",
      expected_output: entry?.expected_output ?? "",
      sort_order: typeof entry?.sort_order === "number" ? entry.sort_order : index
    }))
    .filter((entry) => entry.input_data.trim() || entry.expected_output.trim());
}

async function replaceCourseProblemTestCases(client, problemId, testCases, isSample) {
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

async function fetchCourseProblemTestCases(client, problemIds, includeHidden) {
  if (!problemIds.length) {
    return new Map();
  }

  const values = [problemIds];
  const hiddenFilter = includeHidden ? "" : "AND is_sample = TRUE";
  const result = await client.query(
    `
      SELECT id, course_problem_id, input_data, expected_output, is_sample, sort_order
      FROM course_problem_test_cases
      WHERE course_problem_id = ANY($1::uuid[])
      ${hiddenFilter}
      ORDER BY is_sample DESC, sort_order ASC, created_at ASC
    `,
    values
  );

  const map = new Map();
  result.rows.forEach((row) => {
    const entry = map.get(row.course_problem_id) || {
      sampleTestCases: [],
      hiddenTestCases: []
    };

    if (row.is_sample) {
      entry.sampleTestCases.push(row);
    } else {
      entry.hiddenTestCases.push(row);
    }

    map.set(row.course_problem_id, entry);
  });

  return map;
}

export const getCourseFilters = asyncHandler(async (_req, res) => {
  const [branchResult, sectionResult, batchResult, semesterResult, facultyResult] = await Promise.all([
    pool.query("SELECT DISTINCT branch FROM student_profiles ORDER BY branch ASC"),
    pool.query("SELECT DISTINCT section FROM student_profiles ORDER BY section ASC"),
    pool.query("SELECT DISTINCT batch FROM student_profiles ORDER BY batch ASC"),
    pool.query("SELECT DISTINCT semester FROM student_profiles ORDER BY semester ASC"),
    pool.query(
      `
        SELECT u.id, u.full_name, u.email
        FROM users u
        JOIN faculty_profiles fp ON fp.user_id = u.id
        WHERE u.role = 'faculty'
        ORDER BY u.full_name ASC
      `
    )
  ]);

  res.json({
    branches: branchResult.rows.map((row) => row.branch),
    sections: sectionResult.rows.map((row) => row.section),
    batches: batchResult.rows.map((row) => row.batch),
    semesters: semesterResult.rows.map((row) => row.semester),
    faculty: facultyResult.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email
    }))
  });
});

export const createCourse = asyncHandler(async (req, res) => {
  const payload = normalizeCoursePayload(req.body, req.currentUser);

  if (!payload.program || !payload.code || !payload.title) {
    return res.status(400).json({
      message: "Program, course code, and course name are required."
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertResult = await client.query(
      `
        INSERT INTO courses (program, code, title, description, instructor_id, is_active, roster_restricted, updated_at)
        VALUES ($1, $2, $3, $4, $5, TRUE, FALSE, NOW())
        RETURNING id, roster_restricted
      `,
      [payload.program, payload.code, payload.title, payload.description, payload.facultyIds[0] || null]
    );

    const courseId = insertResult.rows[0].id;
    await syncCourseRelations(client, courseId, payload.audiences, payload.facultyIds);
    await syncCourseEnrollments(client, courseId);

    await client.query("COMMIT");

    res.status(201).json({
      message: "Course created successfully.",
      course: await buildCourseCard(client, courseId, req.currentUser)
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const updateCourse = asyncHandler(async (req, res) => {
  const payload = normalizeCoursePayload(req.body);

  if (!payload.program || !payload.code || !payload.title || payload.audiences.length === 0 || payload.facultyIds.length === 0) {
    return res.status(400).json({
      message: "Program, course code, course name, audience filters, and assigned faculty are required."
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const updateResult = await client.query(
      `
        UPDATE courses
        SET program = $1,
            code = $2,
            title = $3,
            description = $4,
            instructor_id = $5,
            updated_at = NOW()
        WHERE id = $6 AND is_active = TRUE
        RETURNING id, roster_restricted
      `,
      [payload.program, payload.code, payload.title, payload.description, payload.facultyIds[0] || null, req.params.courseId]
    );

    if (updateResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Course not found." });
    }

    await syncCourseRelations(client, req.params.courseId, payload.audiences, payload.facultyIds);
    if (!updateResult.rows[0].roster_restricted) {
      await syncCourseEnrollments(client, req.params.courseId);
    }
    await client.query("COMMIT");

    res.json({
      message: "Course updated successfully.",
      course: await buildCourseCard(client, req.params.courseId, req.currentUser)
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const deleteCourse = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
      UPDATE courses
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [req.params.courseId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "Course not found." });
  }

  await pool.query(
    `
      UPDATE course_enrollments
      SET status = 'archived', updated_at = NOW()
      WHERE course_id = $1
    `,
    [req.params.courseId]
  );

  res.json({ message: "Course archived successfully." });
});

export const listCourses = asyncHandler(async (req, res) => {
  const search = req.query.search?.trim() ?? "";
  const enrolledOnly = req.query.enrolledOnly === "true" || req.query.enrolled === "true";
  const values = [];
  const filters = ["c.is_active = TRUE"];

  if (req.currentUser.role === "faculty") {
    values.push(req.currentUser.id);
    filters.push(`EXISTS (SELECT 1 FROM course_faculty cf WHERE cf.course_id = c.id AND cf.faculty_id = $${values.length})`);
  }

  if (req.currentUser.role === "student") {
    values.push(req.currentUser.id);
    const studentIdIndex = values.length;

    if (enrolledOnly) {
      filters.push(
        `EXISTS (
          SELECT 1
          FROM course_enrollments ce
          WHERE ce.course_id = c.id
            AND ce.student_id = $${studentIdIndex}
            AND ce.status = 'enrolled'
        )`
      );
    } else if (req.roleProfile) {
      const studentBranch = (req.roleProfile.branch || "").trim().toUpperCase();
      const studentSem = Number(req.roleProfile.semester) || 1;
      const studentSec = (req.roleProfile.section || "").trim().toUpperCase();
      const studentBatch = (req.roleProfile.batch || "").trim();

      values.push(
        studentBranch,
        studentSem,
        studentSec,
        studentBatch
      );

      filters.push(
        `(
          EXISTS (
            SELECT 1
            FROM course_enrollments ce
            WHERE ce.course_id = c.id
              AND ce.student_id = $${studentIdIndex}
              AND ce.status = 'enrolled'
          )
          OR
            (
              NOT c.roster_restricted
              AND (
                EXISTS (
                  SELECT 1
                  FROM course_audiences ca
                  WHERE ca.course_id = c.id
                    AND (UPPER(ca.branch) = $${values.length - 3} OR UPPER(ca.branch) = 'ALL')
                    AND (ca.semester = $${values.length - 2} OR ca.semester = 0)
                    AND (UPPER(ca.section) = $${values.length - 1} OR UPPER(ca.section) = 'ALL')
                    AND (ca.batch = $${values.length} OR ca.batch = 'ALL')
                )
                OR NOT EXISTS (
                  SELECT 1
                  FROM course_audiences ca
                  WHERE ca.course_id = c.id
                )
              )
          )
        )`
      );
    } else {
      filters.push(
        `EXISTS (
          SELECT 1
          FROM course_enrollments ce
          WHERE ce.course_id = c.id
            AND ce.student_id = $${studentIdIndex}
            AND ce.status = 'enrolled'
        )`
      );
    }
  }

  if (search) {
    values.push(`%${search}%`);
    filters.push(`(c.program ILIKE $${values.length} OR c.code ILIKE $${values.length} OR c.title ILIKE $${values.length} OR COALESCE(c.description, '') ILIKE $${values.length})`);
  }

  const result = await pool.query(
    `
      SELECT c.id
      FROM courses c
      WHERE ${filters.join(" AND ")}
      ORDER BY c.updated_at DESC, c.created_at DESC
    `,
    values
  );

  const client = await pool.connect();
  try {
    const materialsResult = await client.query(
      `
        SELECT id, title, description, material_type AS type, url, created_at
        FROM course_materials
        WHERE course_id = $1
        ORDER BY created_at DESC
      `,
      [req.course.id]
    );
    const problemsResult = await client.query(
      `
        SELECT id, title, statement, input_format, output_format, constraints_text, examples_text, difficulty, created_at
        FROM course_coding_problems
        WHERE course_id = $1
        ORDER BY created_at DESC
      `,
      [req.course.id]
    );
    const assignmentsResult = await client.query(
      `
        SELECT
          a.id,
          a.title,
          a.description,
          a.assignment_type,
          a.start_date,
          a.due_date,
          a.start_time,
          a.end_time,
          a.duration_minutes,
          a.is_mst,
          a.is_proctored,
          a.max_score,
          a.target_batch,
          a.target_year,
          a.target_semester,
          a.created_at,
          COUNT(s.id)::int AS submissions_count
        FROM course_assignments a
        LEFT JOIN assignment_student_attempts s ON s.assignment_id = a.id
        WHERE a.course_id = $1
        GROUP BY a.id
        ORDER BY a.start_time ASC NULLS LAST, a.due_date ASC NULLS LAST, a.created_at DESC
      `,
      [req.course.id]
    );

    let students = [];
    if (req.currentUser.role === "faculty" || req.currentUser.role === "admin") {
      const studentResult = await client.query(
        `
          SELECT
            u.id,
            u.full_name,
            u.email,
            sp.roll_number,
            sp.branch,
            sp.semester,
            sp.section,
            sp.batch,
            (
              SELECT COUNT(DISTINCT s.assignment_id)::int
              FROM course_assignment_submissions s
              JOIN course_assignments ca ON ca.id = s.assignment_id
              WHERE s.student_id = u.id AND ca.course_id = $1
            ) AS completed_assignments,
            (
              SELECT COUNT(DISTINCT sub.problem_id)::int
              FROM submissions sub
              JOIN course_coding_problems ccp ON ccp.id = sub.problem_id
              WHERE sub.student_id = u.id AND ccp.course_id = $1 AND sub.status = 'ACCEPTED'
            ) AS solved_problems
          FROM course_enrollments ce
          JOIN users u ON u.id = ce.student_id
          LEFT JOIN student_profiles sp ON sp.user_id = u.id
          WHERE ce.course_id = $1 AND ce.status = 'enrolled'
          ORDER BY u.full_name ASC
        `,
        [req.course.id]
      );
      students = studentResult.rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        rollNumber: row.roll_number || "-",
        branch: row.branch || "-",
        semester: row.semester || "-",
        section: row.section || "-",
        batch: row.batch || "-",
        completedAssignments: row.completed_assignments || 0,
        solvedProblems: row.solved_problems || 0
      }));
    }

    let assignmentsRows = assignmentsResult.rows;
    if (req.currentUser.role === "student") {
      const isEnrolledCheck = await client.query(
        `SELECT 1 FROM course_enrollments WHERE course_id = $1 AND student_id = $2 AND status = 'enrolled'`,
        [req.course.id, req.currentUser.id]
      );
      if (isEnrolledCheck.rows.length === 0) {
        assignmentsRows = [];
      } else if (req.roleProfile) {
        const studentSem = Number(req.roleProfile.semester) || 1;
        const studentYear =
          studentSem <= 2 ? "1st Year" : studentSem <= 4 ? "2nd Year" : studentSem <= 6 ? "3rd Year" : "4th Year";
        const studentBatch = req.roleProfile.batch;

        assignmentsRows = assignmentsRows.filter((row) => {
          const targetBatch = row.target_batch || "ALL";
          const targetYear = row.target_year || "ALL";
          const targetSemester = row.target_semester || "ALL";

          if (targetBatch !== "ALL" && targetBatch !== studentBatch) return false;
          if (targetYear !== "ALL" && targetYear !== studentYear) return false;
          if (targetSemester !== "ALL" && String(targetSemester) !== String(studentSem)) return false;
          return true;
        });
      }
    }

    let assignments = assignmentsRows.map((row) => mapAssignmentRow(row));
    if (req.currentUser.role === "student" && assignments.length > 0) {
      const submissionResult = await client.query(
        `
          SELECT assignment_id, id, submitted_at, grade, feedback, status
          FROM course_assignment_submissions
          WHERE student_id = $1
            AND assignment_id = ANY($2::uuid[])
        `,
        [req.currentUser.id, assignments.map((assignment) => assignment.id)]
      );
      const submissionMap = new Map();
      submissionResult.rows.forEach((row) => {
        submissionMap.set(row.assignment_id, [
          {
            id: row.id,
            submittedAt: row.submitted_at,
            grade: row.grade,
            feedback: row.feedback,
            status: row.status
          }
        ]);
      });
      assignments = assignments.map((assignment) => ({
        ...assignment,
        submissions: submissionMap.get(assignment.id) || []
      }));
    }

    const includeHiddenCourseCases = req.currentUser.role === "admin" || req.currentUser.role === "faculty";
    const courseProblemTestCaseMap = await fetchCourseProblemTestCases(
      client,
      problemsResult.rows.map((row) => row.id),
      includeHiddenCourseCases
    );

    let codingProblems = problemsResult.rows.map((row) => {
      const testCases = courseProblemTestCaseMap.get(row.id) || {
        sampleTestCases: [],
        hiddenTestCases: []
      };

      return {
        ...row,
        sampleTestCases: testCases.sampleTestCases,
        hiddenTestCases: includeHiddenCourseCases ? testCases.hiddenTestCases : [],
        submissions: []
      };
    });

    if (codingProblems.length > 0) {
      const problemSubmissionResult = await client.query(
        `
          SELECT
            cps.id,
            cps.course_problem_id,
            cps.language,
            cps.source_code,
            cps.status,
            cps.passed_test_cases,
            cps.total_test_cases,
            cps.execution_time_ms,
            cps.memory_kb,
            cps.compiler_output,
            cps.submitted_at
          FROM course_problem_submissions cps
          WHERE cps.student_id = $1
            AND cps.course_problem_id = ANY($2::uuid[])
          ORDER BY cps.submitted_at DESC
        `,
        [req.currentUser.id, codingProblems.map((problem) => problem.id)]
      );

      const submissionMap = new Map();
      problemSubmissionResult.rows.forEach((row) => {
        const current = submissionMap.get(row.course_problem_id) || [];
        current.push({
          id: row.id,
          language: row.language,
          sourceCode: row.source_code,
          status: row.status,
          passedTestCases: row.passed_test_cases,
          totalTestCases: row.total_test_cases,
          executionTimeMs: row.execution_time_ms,
          memoryKb: row.memory_kb,
          compilerOutput: row.compiler_output,
          submittedAt: row.submitted_at
        });
        submissionMap.set(row.course_problem_id, current);
      });

      codingProblems = codingProblems.map((problem) => ({
        ...problem,
        submissions: submissionMap.get(problem.id) || []
      }));
    }

    const mcqResult = await client.query(
      `
        SELECT id, question_text, options, correct_option_index, marks, negative_marks, created_at
        FROM mcq_questions
        WHERE course_id = $1
        ORDER BY created_at DESC
      `,
      [req.course.id]
    );

    res.json({
      course: {
        ...courseCard,
        materials: materialsResult.rows,
        codingProblems,
        mcqQuestions: mcqResult.rows,
        assignments,
        students
      }
    });
  } finally {
    client.release();
  }
});

export const addCourseMaterial = asyncHandler(async (req, res) => {
  const { title, description, type, url } = req.body;

  if (!title?.trim() || !url?.trim()) {
    return res.status(400).json({ message: "Material title and URL are required." });
  }

  await pool.query(
    `
      INSERT INTO course_materials (course_id, title, description, material_type, url, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [req.course.id, title.trim(), description?.trim() || "", type?.trim() || "notes", url.trim(), req.currentUser.id]
  );

  res.status(201).json({ message: "Study material uploaded successfully." });
});

export const addCourseCodingProblem = asyncHandler(async (req, res) => {
  const {
    title,
    statement,
    difficulty,
    inputFormat = "",
    outputFormat = "",
    constraintsText = "",
    examplesText = "",
    sampleTestCases = [],
    hiddenTestCases = []
  } = req.body;

  if (!title?.trim() || !statement?.trim()) {
    return res.status(400).json({ message: "Coding problem title and statement are required." });
  }

  const normalizedSampleTestCases = normalizeCourseProblemTestCases(sampleTestCases);
  const normalizedHiddenTestCases = normalizeCourseProblemTestCases(hiddenTestCases);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        INSERT INTO course_coding_problems (
          course_id,
          title,
          statement,
          input_format,
          output_format,
          constraints_text,
          examples_text,
          difficulty,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `,
      [
        req.course.id,
        title.trim(),
        statement.trim(),
        inputFormat.trim() || null,
        outputFormat.trim() || null,
        constraintsText.trim() || null,
        examplesText.trim() || null,
        difficulty?.trim()?.toLowerCase() || "medium",
        req.currentUser.id
      ]
    );

    await replaceCourseProblemTestCases(client, result.rows[0].id, normalizedSampleTestCases, true);
    await replaceCourseProblemTestCases(client, result.rows[0].id, normalizedHiddenTestCases, false);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  res.status(201).json({ message: "Coding problem created successfully." });
});

export const addCourseMcqQuestion = asyncHandler(async (req, res) => {
  const { questionText, options, correctOptionIndex = 0, marks = 1, negativeMarks = 0 } = req.body;

  if (!questionText?.trim()) {
    return res.status(400).json({ message: "Question text is required." });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO mcq_questions (course_id, question_text, options, correct_option_index, marks, negative_marks)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, question_text, options, correct_option_index, marks, negative_marks, created_at`,
      [
        req.course.id,
        questionText.trim(),
        JSON.stringify(Array.isArray(options) ? options : ["Option 1", "Option 2", "Option 3", "Option 4"]),
        typeof correctOptionIndex === "number" ? correctOptionIndex : 0,
        Number(marks) || 1,
        Number(negativeMarks) || 0
      ]
    );

    res.status(201).json({
      message: "MCQ question created successfully.",
      question: result.rows[0]
    });
  } finally {
    client.release();
  }
});

export const addCourseQuestionsBulk = asyncHandler(async (req, res) => {
  const { questions } = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ message: "An array of questions is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = [];

    for (const q of questions) {
      if (q.type === "mcq") {
        const mcqResult = await client.query(
          `INSERT INTO mcq_questions (course_id, question_text, options, correct_option_index, marks, negative_marks)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, question_text, options, correct_option_index, marks, negative_marks, created_at`,
          [
            req.course.id,
            q.questionText || q.title || "MCQ Question",
            JSON.stringify(Array.isArray(q.options) ? q.options : ["Option 1", "Option 2", "Option 3", "Option 4"]),
            typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : 0,
            Number(q.marks) || 1,
            Number(q.negativeMarks) || 0
          ]
        );
        inserted.push({ type: "mcq", ...mcqResult.rows[0] });
      } else {
        const codingResult = await client.query(
          `INSERT INTO course_coding_problems (course_id, title, statement, input_format, output_format, constraints_text, examples_text, difficulty, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, title, statement, difficulty`,
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
        const problemId = codingResult.rows[0].id;

        const sampleCases = Array.isArray(q.sampleTestCases) && q.sampleTestCases.length > 0
          ? normalizeCourseProblemTestCases(q.sampleTestCases)
          : (q.sampleInput ? normalizeCourseProblemTestCases([{ input_data: q.sampleInput, expected_output: q.sampleOutput || "" }]) : []);

        const hiddenCases = Array.isArray(q.hiddenTestCases) && q.hiddenTestCases.length > 0
          ? normalizeCourseProblemTestCases(q.hiddenTestCases)
          : (q.hiddenInput ? normalizeCourseProblemTestCases([{ input_data: q.hiddenInput, expected_output: q.hiddenOutput || "" }]) : []);

        await replaceCourseProblemTestCases(client, problemId, sampleCases, true);
        await replaceCourseProblemTestCases(client, problemId, hiddenCases, false);

        inserted.push({ type: "coding", ...codingResult.rows[0] });
      }
    }

    await client.query("COMMIT");
    res.status(201).json({
      message: `Successfully imported ${inserted.length} questions into course.`,
      count: inserted.length,
      questions: inserted
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

export const runCourseCodingProblem = asyncHandler(async (req, res) => {
  const payload = normalizeCourseProblemExecutionPayload(req.body);

  if (!payload.language || !payload.sourceCode) {
    return res.status(400).json({
      message: "Language and source code are required."
    });
  }

  const problemResult = await pool.query(
    `
      SELECT id
      FROM course_coding_problems
      WHERE id = $1 AND course_id = $2
    `,
    [req.params.problemId, req.course.id]
  );

  if (problemResult.rows.length === 0) {
    return res.status(404).json({ message: "Course coding problem not found." });
  }

  const sampleTestCaseResult = await pool.query(
    `
      SELECT id, input_data, expected_output, is_sample, sort_order
      FROM course_problem_test_cases
      WHERE course_problem_id = $1 AND is_sample = true
      ORDER BY sort_order ASC, created_at ASC
    `,
    [req.params.problemId]
  );

  let testCasesToRun = sampleTestCaseResult.rows;

  if (testCasesToRun.length === 0) {
    const allTestCaseResult = await pool.query(
      `
        SELECT id, input_data, expected_output, is_sample, sort_order
        FROM course_problem_test_cases
        WHERE course_problem_id = $1
        ORDER BY sort_order ASC, created_at ASC
      `,
      [req.params.problemId]
    );
    testCasesToRun = allTestCaseResult.rows;
  }

  if (testCasesToRun.length === 0) {
    testCasesToRun = [
      {
        id: "course-problem-run",
        input_data: "",
        expected_output: "",
        is_sample: true,
        sort_order: 0
      }
    ];
  }

  const executionResult = await executeSubmission({
    language: payload.language,
    sourceCode: payload.sourceCode,
    problemId: req.params.problemId,
    testCases: testCasesToRun
  });

  res.json({
    message: "Course problem code executed.",
    result: {
      ...executionResult,
      language: payload.language
    }
  });
});

export const submitCourseCodingProblem = asyncHandler(async (req, res) => {
  const payload = normalizeCourseProblemExecutionPayload(req.body);

  if (!payload.language || !payload.sourceCode) {
    return res.status(400).json({
      message: "Language and source code are required."
    });
  }

  const problemResult = await pool.query(
    `
      SELECT id
      FROM course_coding_problems
      WHERE id = $1 AND course_id = $2
    `,
    [req.params.problemId, req.course.id]
  );

  if (problemResult.rows.length === 0) {
    return res.status(404).json({ message: "Course coding problem not found." });
  }

  const allTestCaseResult = await pool.query(
    `
      SELECT id, input_data, expected_output, is_sample, sort_order
      FROM course_problem_test_cases
      WHERE course_problem_id = $1
      ORDER BY is_sample DESC, sort_order ASC, created_at ASC
    `,
    [req.params.problemId]
  );

  const executionResult = await executeSubmission({
    language: payload.language,
    sourceCode: payload.sourceCode,
    problemId: req.params.problemId,
    testCases:
      allTestCaseResult.rows.length > 0
        ? allTestCaseResult.rows
        : [
            {
              id: "course-problem-submit",
              input_data: "",
              expected_output: "",
              is_sample: true,
              sort_order: 0
            }
          ]
  });

  const result = await pool.query(
    `
      INSERT INTO course_problem_submissions (
        course_problem_id,
        student_id,
        language,
        source_code,
        status,
        passed_test_cases,
        total_test_cases,
        execution_time_ms,
        memory_kb,
        compiler_output
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        id,
        course_problem_id,
        student_id,
        language,
        source_code,
        status,
        passed_test_cases,
        total_test_cases,
        execution_time_ms,
        memory_kb,
        compiler_output,
        submitted_at
    `,
    [
      req.params.problemId,
      req.currentUser.id,
      payload.language,
      payload.sourceCode,
      executionResult.status,
      executionResult.passedTestCases,
      executionResult.totalTestCases,
      executionResult.executionTimeMs,
      executionResult.memoryKb,
      executionResult.compilerOutput
    ]
  );

  res.status(201).json({
    message: "Course problem submitted successfully.",
    submission: result.rows[0],
    execution: {
      errorType: executionResult.errorType ?? null,
      verdictLabel: executionResult.verdictLabel ?? result.rows[0].status,
      stdout: executionResult.stdout ?? "",
      stderr: executionResult.stderr ?? "",
      executionTimeMs: executionResult.executionTimeMs ?? 0
    },
    testCaseResults: executionResult.testCaseResults ?? []
  });
});

export const getCourseStudents = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
      SELECT u.id, u.full_name, u.email
      FROM course_enrollments ce
      JOIN users u ON u.id = ce.student_id
      WHERE ce.course_id = $1 AND ce.status = 'enrolled'
      ORDER BY u.full_name ASC
    `,
    [req.course.id]
  );

  res.json(
    result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email
    }))
  );
});

export const getCourseRoster = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
      SELECT u.id, u.full_name, u.email, sp.roll_number
      FROM course_enrollments ce
      JOIN users u ON u.id = ce.student_id AND u.role = 'student'
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE ce.course_id = $1 AND ce.status = 'enrolled'
      ORDER BY u.full_name ASC
    `,
    [req.course.id]
  );

  res.json(result.rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    username: row.roll_number,
    email: row.email
  })));
});

async function restrictCourseToRoster(client, courseId) {
  const courseResult = await client.query(
    "SELECT roster_restricted FROM courses WHERE id = $1 FOR UPDATE",
    [courseId]
  );

  if (!courseResult.rows[0]?.roster_restricted) {
    await client.query(
      "UPDATE courses SET roster_restricted = TRUE, updated_at = NOW() WHERE id = $1",
      [courseId]
    );
    await client.query(
      "UPDATE course_enrollments SET status = 'archived', updated_at = NOW() WHERE course_id = $1",
      [courseId]
    );
  }
}

export const importCourseStudents = asyncHandler(async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0 || students.length > 500) {
    return res.status(400).json({ message: "Upload a CSV containing between 1 and 500 students." });
  }

  const normalizedStudents = students.map((student) => ({
    crn: String(student?.crn || "").trim(),
    fullName: String(student?.fullName || "").trim(),
    branch: String(student?.branch || "UNASSIGNED").trim().toUpperCase(),
    semester: Number(student?.semester || 1),
    section: String(student?.section || "UNASSIGNED").trim().toUpperCase(),
    batch: String(student?.batch || "UNASSIGNED").trim()
  }));

  const seenCrns = new Set();
  for (const student of normalizedStudents) {
    const key = student.crn.toLowerCase();
    if (!/^[a-z0-9_-]{1,80}$/i.test(student.crn)) {
      return res.status(400).json({ message: "Every CSV row must have a valid CRN (letters, numbers, _ or -)." });
    }
    if (seenCrns.has(key)) {
      return res.status(400).json({ message: `The CSV contains duplicate CRN ${student.crn}.` });
    }
    if (!Number.isInteger(student.semester) || student.semester < 1 || student.semester > 12) {
      return res.status(400).json({ message: `Invalid semester for CRN ${student.crn}.` });
    }
    seenCrns.add(key);
  }

  const client = await pool.connect();
  const credentials = [];

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `
        SELECT sp.roll_number
        FROM student_profiles sp
        WHERE LOWER(sp.roll_number) = ANY($1::text[])
      `,
      [normalizedStudents.map((student) => student.crn.toLowerCase())]
    );

    if (existingResult.rows.length > 0) {
      await client.query("ROLLBACK");
      const existingCrns = existingResult.rows.map((row) => row.roll_number);
      return res.status(409).json({
        message: `These CRNs already have student accounts: ${existingCrns.join(", ")}. Add existing students from the roster panel instead.`
      });
    }

    await restrictCourseToRoster(client, req.course.id);

    for (const student of normalizedStudents) {
      const password = randomBytes(18).toString("base64url");
      const email = `crn.${student.crn.toLowerCase()}@students.codexa.local`;
      const userResult = await client.query(
        `
          INSERT INTO users (full_name, email, password_hash, role)
          VALUES ($1, $2, $3, 'student')
          RETURNING id
        `,
        [student.fullName || `Student ${student.crn}`, email, await hashPassword(password)]
      );
      const userId = userResult.rows[0].id;

      await client.query(
        `
          INSERT INTO student_profiles (user_id, roll_number, branch, semester, section, batch)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [userId, student.crn, student.branch, student.semester, student.section, student.batch]
      );
      await client.query(
        `
          INSERT INTO course_enrollments (course_id, student_id, status)
          VALUES ($1, $2, 'enrolled')
          ON CONFLICT (course_id, student_id)
          DO UPDATE SET status = 'enrolled', updated_at = NOW()
        `,
        [req.course.id, userId]
      );
      credentials.push({ username: student.crn, password, fullName: student.fullName || `Student ${student.crn}` });
    }

    await client.query("COMMIT");
    res.status(201).json({
      message: `${credentials.length} student account${credentials.length === 1 ? "" : "s"} created and enrolled.`,
      credentials
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const addCourseStudent = asyncHandler(async (req, res) => {
  const username = String(req.body.username || req.body.crn || "").trim();
  if (!username) {
    return res.status(400).json({ message: "Enter a student's CRN / username." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const studentResult = await client.query(
      `
        SELECT u.id, u.full_name, sp.roll_number
        FROM users u
        JOIN student_profiles sp ON sp.user_id = u.id
        WHERE u.role = 'student' AND LOWER(sp.roll_number) = LOWER($1)
      `,
      [username]
    );

    if (studentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: `No student account found for CRN ${username}.` });
    }

    await restrictCourseToRoster(client, req.course.id);
    const student = studentResult.rows[0];
    await client.query(
      `
        INSERT INTO course_enrollments (course_id, student_id, status)
        VALUES ($1, $2, 'enrolled')
        ON CONFLICT (course_id, student_id)
        DO UPDATE SET status = 'enrolled', updated_at = NOW()
      `,
      [req.course.id, student.id]
    );

    await client.query("COMMIT");
    res.status(200).json({
      message: `${student.full_name} (${student.roll_number}) added to this course.`,
      student: { id: student.id, fullName: student.full_name, username: student.roll_number }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});
