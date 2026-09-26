import { verifyAuthToken } from "../utils/auth.js";
import { pool } from "../config/db.js";

function getBearerToken(req) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

export function requireAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      message: "Authentication required."
    });
  }

  try {
    const payload = verifyAuthToken(token);
    req.auth = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role
    };
    next();
  } catch (_error) {
    return res.status(401).json({
      message: "Invalid or expired token."
    });
  }
}

export async function requireMongoUser(req, res, next) {
  if (!req.auth?.userId) {
    return res.status(401).json({
      message: "Authentication required."
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT id, full_name, email, role, created_at
        FROM users
        WHERE id = $1
      `,
      [req.auth.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Account not found."
      });
    }

    req.currentUser = {
      id: result.rows[0].id,
      full_name: result.rows[0].full_name,
      email: result.rows[0].email,
      role: result.rows[0].role,
      created_at: result.rows[0].created_at
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return function enforceRole(req, res, next) {
    if (!req.auth) {
      return res.status(401).json({
        message: "Authentication required."
      });
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource."
      });
    }

    next();
  };
}

export async function attachRoleProfile(req, _res, next) {
  if (!req.currentUser) {
    return next();
  }

  try {
    if (req.currentUser.role === "student") {
      const result = await pool.query(
        `
          SELECT roll_number, branch, semester, section, batch
          FROM student_profiles
          WHERE user_id = $1
        `,
        [req.currentUser.id]
      );
      req.roleProfile = result.rows[0] || null;
    } else if (req.currentUser.role === "faculty") {
      const result = await pool.query(
        `
          SELECT employee_id, department, designation
          FROM faculty_profiles
          WHERE user_id = $1
        `,
        [req.currentUser.id]
      );
      req.roleProfile = result.rows[0] || null;
    } else {
      req.roleProfile = null;
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function requireSelfOrRoles(...roles) {
  return function enforceSelfOrRole(req, res, next) {
    const sameUser = String(req.currentUser?.id || "") === String(req.params.userId || "");

    if (sameUser || roles.includes(req.currentUser?.role)) {
      return next();
    }

    return res.status(403).json({
      message: "You do not have permission to access this resource."
    });
  };
}

export async function requireCourseAccess(req, res, next) {
  try {
    const courseResult = await pool.query(
      `
        SELECT id, code, title, description, is_active, roster_restricted
        FROM courses
        WHERE id = $1
      `,
      [req.params.courseId]
    );

    if (courseResult.rows.length === 0 || !courseResult.rows[0].is_active) {
      return res.status(404).json({
        message: "Course not found."
      });
    }

    const course = courseResult.rows[0];
    let allowed = req.currentUser.role === "admin";

    if (req.currentUser.role === "faculty") {
      const facultyResult = await pool.query(
        `
          SELECT 1
          FROM course_faculty
          WHERE course_id = $1 AND faculty_id = $2
        `,
        [course.id, req.currentUser.id]
      );
      allowed = facultyResult.rows.length > 0;
    }

    let enrollment = null;
    if (req.currentUser.role === "student") {
      const enrollmentResult = await pool.query(
        `
          SELECT id, status
          FROM course_enrollments
          WHERE course_id = $1 AND student_id = $2 AND status = 'enrolled'
        `,
        [course.id, req.currentUser.id]
      );
      enrollment = enrollmentResult.rows[0] || null;

      if (enrollment) {
        allowed = true;
      } else if (course.roster_restricted) {
        allowed = false;
      } else if (req.roleProfile) {
        const studentBranch = (req.roleProfile.branch || "").trim().toUpperCase();
        const studentSem = Number(req.roleProfile.semester) || 1;
        const studentSec = (req.roleProfile.section || "").trim().toUpperCase();
        const studentBatch = (req.roleProfile.batch || "").trim();

        const audienceCountResult = await pool.query(
          `SELECT COUNT(*)::int as count FROM course_audiences WHERE course_id = $1`,
          [course.id]
        );

        if (audienceCountResult.rows[0].count === 0) {
          allowed = true;
        } else {
          const audienceResult = await pool.query(
            `
              SELECT 1
              FROM course_audiences
              WHERE course_id = $1
                AND (UPPER(branch) = $2 OR UPPER(branch) = 'ALL')
                AND (semester = $3 OR semester = 0)
                AND (UPPER(section) = $4 OR UPPER(section) = 'ALL')
                AND (batch = $5 OR batch = 'ALL')
            `,
            [course.id, studentBranch, studentSem, studentSec, studentBatch]
          );

          if (audienceResult.rows.length > 0) {
            allowed = true;
            // Auto-enroll eligible student
            try {
              const autoEnrollResult = await pool.query(
                `
                  INSERT INTO course_enrollments (course_id, student_id, status)
                  VALUES ($1, $2, 'enrolled')
                  ON CONFLICT (course_id, student_id) DO UPDATE SET status = 'enrolled'
                  RETURNING id, status
                `,
                [course.id, req.currentUser.id]
              );
              enrollment = autoEnrollResult.rows[0] || null;
            } catch (e) {
              console.warn("Auto-enrollment notice:", e.message);
            }
          }
        }
      } else {
        allowed = false;
      }
    }

    if (!allowed) {
      return res.status(403).json({
        message:
          req.currentUser.role === "student"
            ? "You do not have access to this course. Only students from the assigned branch, semester, section, and batch can open it."
            : "You do not have access to this course."
      });
    }

    req.course = course;
    req.enrollment = enrollment;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireCourseManagementAccess(req, res, next) {
  try {
    const courseResult = await pool.query(
      `
        SELECT id, code, title, description, is_active, roster_restricted
        FROM courses
        WHERE id = $1
      `,
      [req.params.courseId]
    );

    if (courseResult.rows.length === 0 || !courseResult.rows[0].is_active) {
      return res.status(404).json({
        message: "Course not found."
      });
    }

    let canManage = req.currentUser.role === "admin";

    if (!canManage && req.currentUser.role === "faculty") {
      const facultyResult = await pool.query(
        `
          SELECT 1
          FROM course_faculty
          WHERE course_id = $1 AND faculty_id = $2
        `,
        [req.params.courseId, req.currentUser.id]
      );
      canManage = facultyResult.rows.length > 0;
    }

    if (!canManage) {
      return res.status(403).json({
        message: "You do not have permission to manage this course."
      });
    }

    req.course = courseResult.rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateStudentCourseAccess(req, res, next) {
  try {
    if (req.currentUser?.role !== "student") {
      return next();
    }

    if (req.course.roster_restricted) {
      if (!req.enrollment) {
        return res.status(403).json({ message: "You must be enrolled in this course to access it." });
      }
      return next();
    }

    const result = await pool.query(
      `
        SELECT 1
        FROM course_audiences
        WHERE course_id = $1
          AND branch = $2
          AND semester = $3
          AND section = $4
          AND batch = $5
      `,
      [req.course.id, req.roleProfile.branch, req.roleProfile.semester, req.roleProfile.section, req.roleProfile.batch]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        message: "This course is not assigned to your branch, semester, section, or batch."
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function requireStudentMatchOrAdmin(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({
      message: "Authentication required."
    });
  }

  if (req.auth.role === "admin" || req.auth.role === "faculty" || req.auth.userId === req.params.studentId) {
    return next();
  }

  return res.status(403).json({
    message: "You do not have permission to access this student's data."
  });
}
