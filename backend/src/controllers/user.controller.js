import { pool } from "../config/db.js";
import { env } from "../config/env.js";
import { hashPassword, signAuthToken, verifyPassword } from "../utils/auth.js";

function sanitizeUser(row) {
  const profile =
    row.role === "student"
      ? {
          roll_number: row.roll_number || null,
          branch: row.branch || null,
          semester: row.semester || null,
          section: row.section || null,
          batch: row.batch || null
        }
      : row.role === "faculty"
        ? {
            employee_id: row.employee_id || null,
            department: row.department || null,
            designation: row.designation || null
          }
        : null;

  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
    submission_count: row.submission_count,
    accepted_count: row.accepted_count,
    profile
  };
}

async function fetchUserSummary(userId) {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.created_at,
        COUNT(s.id)::int AS submission_count,
        COUNT(*) FILTER (WHERE s.status = 'accepted')::int AS accepted_count,
        sp.roll_number,
        sp.branch,
        sp.semester,
        sp.section,
        sp.batch,
        fp.employee_id,
        fp.department,
        fp.designation
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
      LEFT JOIN submissions s ON s.student_id = u.id
      WHERE u.id = $1
      GROUP BY
        u.id,
        sp.roll_number,
        sp.branch,
        sp.semester,
        sp.section,
        sp.batch,
        fp.employee_id,
        fp.department,
        fp.designation
    `,
    [userId]
  );

  return result.rows[0] ? sanitizeUser(result.rows[0]) : null;
}

async function hasFacultyStudentAccess(facultyId, studentId) {
  const result = await pool.query(
    `
      SELECT 1
      FROM course_faculty cf
      JOIN course_enrollments ce
        ON ce.course_id = cf.course_id
       AND ce.status = 'enrolled'
      WHERE cf.faculty_id = $1
        AND ce.student_id = $2
      LIMIT 1
    `,
    [facultyId, studentId]
  );

  return result.rows.length > 0;
}

function normalizeIdentifier(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function validateCollegeEmail({ email, role, rollNumber, employeeId }) {
  const normalizedEmail = email.trim().toLowerCase();
  const domainSuffix = `@${env.collegeEmailDomain}`;

  if (!normalizedEmail.endsWith(domainSuffix)) {
    return `Email must use the college domain ${env.collegeEmailDomain}.`;
  }

  const [localPart] = normalizedEmail.split("@");
  if (!/^[a-z0-9._-]+$/.test(localPart) || !localPart.includes("_")) {
    return "Email must follow the college format like name_identifier@college.com.";
  }

  if (role === "student") {
    const normalizedRollNumber = normalizeIdentifier(rollNumber);
    if (normalizedRollNumber && !normalizeIdentifier(localPart).includes(normalizedRollNumber)) {
      return "Student email must include the student's roll number, like name_rollno@college.com.";
    }
  }

  if (role === "faculty") {
    const normalizedEmployeeId = normalizeIdentifier(employeeId);
    if (normalizedEmployeeId && !normalizeIdentifier(localPart).includes(normalizedEmployeeId)) {
      return "Faculty email must include the faculty employee ID, like name_employeeid@college.com.";
    }
  }

  return "";
}

async function registerUser(req, res, next, role, options = {}) {
  const {
    allowPublicRegistration = false,
    issueToken = true,
    successMessage = `${role === "admin" ? "Admin" : role === "faculty" ? "Faculty" : "Student"} account created successfully.`
  } = options;
  const {
    fullName,
    email,
    password,
    rollNumber,
    branch,
    semester,
    section,
    batch,
    employeeId,
    department,
    designation
  } = req.body;

  if (!fullName?.trim() || !email?.trim() || !password?.trim()) {
    return res.status(400).json({
      message: "Full name, email, and password are required."
    });
  }

  if (password.trim().length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters long."
    });
  }

  if (
    role === "student" &&
    (!rollNumber?.trim() || !branch?.trim() || !semester || !section?.trim() || !batch?.trim())
  ) {
    return res.status(400).json({
      message: "Student registration requires roll number, branch, semester, section, and batch."
    });
  }

  if (role === "faculty" && (!employeeId?.trim() || !department?.trim())) {
    return res.status(400).json({
      message: "Faculty registration requires employee ID and department."
    });
  }

  if (!allowPublicRegistration && req.auth?.role !== "admin") {
    return res.status(403).json({
      message: `Only admins can create ${role} accounts.`
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    const emailValidationMessage = validateCollegeEmail({
      email: normalizedEmail,
      role,
      rollNumber,
      employeeId
    });

    if (emailValidationMessage) {
      return res.status(400).json({
        message: emailValidationMessage
      });
    }

    const passwordHash = await hashPassword(password.trim());

    const existingUser = await pool.query(
      `
        SELECT id, role, password_hash
        FROM users
        WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];

      if (existing.role !== role) {
        return res.status(409).json({
          message: "This email is already registered under a different role."
        });
      }

      if (!existing.password_hash) {
        const upgradedUser = await pool.query(
          `
            UPDATE users
            SET full_name = $1, password_hash = $2, role = $3
            WHERE id = $4
            RETURNING id, full_name, email, role, created_at
          `,
          [normalizedName, passwordHash, role, existing.id]
        );

        const user = await fetchUserSummary(upgradedUser.rows[0].id);
        const responseBody = {
          message: `${role === "admin" ? "Admin" : role === "faculty" ? "Faculty" : "Student"} account secured successfully.`,
          user
        };

        if (issueToken) {
          responseBody.token = signAuthToken(upgradedUser.rows[0]);
        }

        return res.status(201).json(responseBody);
      }

      return res.status(409).json({
        message: `An ${role} account with this email already exists. Please log in instead.`
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
          INSERT INTO users (full_name, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
          RETURNING id, full_name, email, role, created_at
        `,
        [normalizedName, normalizedEmail, passwordHash, role]
      );

      const user = result.rows[0];

      if (role === "student") {
        await client.query(
          `
            INSERT INTO student_profiles (user_id, roll_number, branch, semester, section, batch)
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            user.id,
            rollNumber.trim(),
            branch.trim().toUpperCase(),
            Number(semester),
            section.trim().toUpperCase(),
            batch.trim()
          ]
        );
      }

      if (role === "faculty") {
        await client.query(
          `
            INSERT INTO faculty_profiles (user_id, employee_id, department, designation)
            VALUES ($1, $2, $3, $4)
          `,
          [user.id, employeeId.trim(), department.trim().toUpperCase(), designation?.trim() || "Faculty"]
        );
      }

      await client.query("COMMIT");
      const createdUser = await fetchUserSummary(user.id);
      const responseBody = {
        message: successMessage,
        user: createdUser
      };

      if (issueToken) {
        responseBody.token = signAuthToken(user);
      }

      res.status(201).json(responseBody);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
}

async function loginUser(req, res, next, role) {
  const { email, password } = req.body;

  if (!email?.trim() || !password?.trim()) {
    return res.status(400).json({
      message: "Email and password are required."
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `
        SELECT id, full_name, email, password_hash, role, created_at
        FROM users
        WHERE email = $1 AND role = $2
      `,
      [normalizedEmail, role]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const userRecord = result.rows[0];
    if (!userRecord.password_hash) {
      return res.status(401).json({
        message: "This account needs to be registered again with a password first."
      });
    }

    const isValidPassword = await verifyPassword(password.trim(), userRecord.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = await fetchUserSummary(userRecord.id);
    const token = signAuthToken(userRecord);

    res.json({
      message: `${role === "admin" ? "Admin" : role === "faculty" ? "Faculty" : "Student"} login successful.`,
      token,
      user
    });
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req, res, next) {
  const role = req.query.role?.trim().toLowerCase() ?? "";
  const search = req.query.search?.trim() ?? "";

  if (role && !["student", "faculty", "admin"].includes(role)) {
    return res.status(400).json({
      message: "Role filter must be student, faculty, or admin."
    });
  }

  try {
    const values = [];
    const filters = [];

    if (role) {
      values.push(role);
      filters.push(`u.role = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      filters.push(`(
        u.full_name ILIKE $${values.length}
        OR u.email ILIKE $${values.length}
        OR sp.roll_number ILIKE $${values.length}
        OR fp.employee_id ILIKE $${values.length}
      )`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const result = await pool.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.role,
          u.created_at,
          COUNT(s.id)::int AS submission_count,
          COUNT(*) FILTER (WHERE s.status = 'accepted')::int AS accepted_count,
          sp.roll_number,
          sp.branch,
          sp.semester,
          sp.section,
          sp.batch,
          fp.employee_id,
          fp.department,
          fp.designation
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
        LEFT JOIN submissions s ON s.student_id = u.id
        ${whereClause}
        GROUP BY
          u.id,
          sp.roll_number,
          sp.branch,
          sp.semester,
          sp.section,
          sp.batch,
          fp.employee_id,
          fp.department,
          fp.designation
        ORDER BY u.created_at DESC
      `,
      values
    );

    res.json(result.rows.map(sanitizeUser));
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req, res, next) {
  const { userId } = req.params;

  try {
    const user = await fetchUserSummary(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await fetchUserSummary(req.auth.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateCurrentUser(req, res, next) {
  const { fullName, email } = req.body;

  if (!fullName?.trim() || !email?.trim()) {
    return res.status(400).json({
      message: "Full name and email are required."
    });
  }

  try {
    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const duplicateResult = await pool.query(
      `
        SELECT id
        FROM users
        WHERE email = $1 AND id <> $2
      `,
      [normalizedEmail, req.auth.userId]
    );

    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({
        message: "This email is already in use by another account."
      });
    }

    const result = await pool.query(
      `
        UPDATE users
        SET full_name = $1,
            email = $2
        WHERE id = $3
        RETURNING id, full_name, email, role, created_at
      `,
      [normalizedName, normalizedEmail, req.auth.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    const updatedUser = await fetchUserSummary(req.auth.userId);
    const token = signAuthToken(result.rows[0]);

    res.json({
      message: "Account details updated successfully.",
      token,
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
}

export async function changeCurrentUserPassword(req, res, next) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword?.trim() || !newPassword?.trim()) {
    return res.status(400).json({
      message: "Current password and new password are required."
    });
  }

  if (newPassword.trim().length < 8) {
    return res.status(400).json({
      message: "New password must be at least 8 characters long."
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT id, full_name, email, role, created_at, password_hash
        FROM users
        WHERE id = $1
      `,
      [req.auth.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    const userRecord = result.rows[0];
    const isValidPassword = await verifyPassword(currentPassword.trim(), userRecord.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        message: "Current password is incorrect."
      });
    }

    const passwordHash = await hashPassword(newPassword.trim());

    await pool.query(
      `
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
      `,
      [passwordHash, req.auth.userId]
    );

    res.json({
      message: "Password changed successfully."
    });
  } catch (error) {
    next(error);
  }
}

export function registerStudent(req, res, next) {
  return registerUser(req, res, next, "student", {
    allowPublicRegistration: false,
    issueToken: false,
    successMessage: "Student account created successfully."
  });
}

export async function getAccessibleStudents(req, res, next) {
  const search = req.query.search?.trim() ?? "";

  try {
    const values = [];
    const filters = ["u.role = 'student'"];

    if (req.currentUser.role === "faculty") {
      values.push(req.currentUser.id);
      filters.push(`EXISTS (
        SELECT 1
        FROM course_faculty cf
        JOIN course_enrollments ce
          ON ce.course_id = cf.course_id
         AND ce.status = 'enrolled'
        WHERE cf.faculty_id = $${values.length}
          AND ce.student_id = u.id
      )`);
    } else if (req.currentUser.role !== "admin") {
      return res.status(403).json({
        message: "You do not have permission to view students."
      });
    }

    if (search) {
      values.push(`%${search}%`);
      filters.push(`(
        u.full_name ILIKE $${values.length}
        OR u.email ILIKE $${values.length}
        OR sp.roll_number ILIKE $${values.length}
      )`);
    }

    const result = await pool.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.role,
          u.created_at,
          COUNT(s.id)::int AS submission_count,
          COUNT(*) FILTER (WHERE s.status = 'accepted')::int AS accepted_count,
          sp.roll_number,
          sp.branch,
          sp.semester,
          sp.section,
          sp.batch
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN submissions s ON s.student_id = u.id
        WHERE ${filters.join(" AND ")}
        GROUP BY
          u.id,
          sp.roll_number,
          sp.branch,
          sp.semester,
          sp.section,
          sp.batch
        ORDER BY u.created_at DESC
      `,
      values
    );

    res.json(result.rows.map(sanitizeUser));
  } catch (error) {
    next(error);
  }
}

export async function getAccessibleStudentById(req, res, next) {
  const { studentId } = req.params;

  try {
    if (req.currentUser.role === "faculty") {
      const allowed = await hasFacultyStudentAccess(req.currentUser.id, studentId);

      if (!allowed) {
        return res.status(403).json({
          message: "You do not have permission to access this student."
        });
      }
    } else if (req.currentUser.role !== "admin") {
      return res.status(403).json({
        message: "You do not have permission to access this student."
      });
    }

    const user = await fetchUserSummary(studentId);

    if (!user || user.role !== "student") {
      return res.status(404).json({
        message: "Student not found."
      });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}

export function loginStudent(req, res, next) {
  return loginUser(req, res, next, "student");
}

export function registerAdmin(req, res, next) {
  return registerUser(req, res, next, "admin", {
    allowPublicRegistration: false
  });
}

export function loginAdmin(req, res, next) {
  return loginUser(req, res, next, "admin");
}

export async function resetStudentPassword(req, res, next) {
  const { userId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword?.trim()) {
    return res.status(400).json({
      message: "New password is required."
    });
  }

  if (newPassword.trim().length < 8) {
    return res.status(400).json({
      message: "New password must be at least 8 characters long."
    });
  }

  try {
    const userResult = await pool.query(
      `
        SELECT id, role, full_name, email
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    const targetUser = userResult.rows[0];

    if (targetUser.role !== "student") {
      return res.status(400).json({
        message: "Only student passwords can be reset by admins."
      });
    }

    const passwordHash = await hashPassword(newPassword.trim());

    await pool.query(
      `
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
      `,
      [passwordHash, userId]
    );

    await pool.query(
      `
        INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, details)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        req.auth.userId,
        "reset_password",
        "user",
        userId,
        JSON.stringify({ email: targetUser.email, full_name: targetUser.full_name })
      ]
    );

    res.json({
      message: `Password for ${targetUser.full_name} has been reset successfully.`
    });
  } catch (error) {
    next(error);
  }
}

export function registerFaculty(req, res, next) {
  return registerUser(req, res, next, "faculty", {
    allowPublicRegistration: false,
    issueToken: false,
    successMessage: "Faculty account created successfully."
  });
}

export function loginFaculty(req, res, next) {
  return loginUser(req, res, next, "faculty");
}

export async function deleteUser(req, res, next) {
  const { userId } = req.params;

  try {
    const userResult = await pool.query(
      `
        SELECT id, role, full_name, email
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    const targetUser = userResult.rows[0];

    if (!["student", "faculty"].includes(targetUser.role)) {
      return res.status(400).json({
        message: "Only student and faculty accounts can be deleted."
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Log the action first
      await client.query(
        `
          INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, details)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          req.auth.userId,
          "delete_user",
          "user",
          userId,
          JSON.stringify({
            email: targetUser.email,
            full_name: targetUser.full_name,
            role: targetUser.role
          })
        ]
      );

      // Now delete the user
      await client.query(
        `
          DELETE FROM users
          WHERE id = $1
        `,
        [userId]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res.json({
      message: `${targetUser.role.charAt(0).toUpperCase() + targetUser.role.slice(1)} account for ${targetUser.full_name} has been deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserById(req, res, next) {
  const { userId } = req.params;
  const {
    fullName,
    email,
    password,
    rollNumber,
    branch,
    semester,
    section,
    batch,
    employeeId,
    department,
    designation
  } = req.body;

  try {
    const userRes = await pool.query(
      `SELECT id, role, email, full_name FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const targetUser = userRes.rows[0];

    // Check duplicate email if changed
    if (email && email.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
      const dupCheck = await pool.query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2`,
        [email.trim(), userId]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({ message: "This email is already in use by another account." });
      }
    }

    const updatedName = fullName?.trim() || targetUser.full_name;
    const updatedEmail = email?.trim()?.toLowerCase() || targetUser.email;

    // Update password if provided
    if (password && password.trim().length >= 8) {
      const passwordHash = await hashPassword(password.trim());
      await pool.query(
        `UPDATE users SET full_name = $1, email = $2, password_hash = $3 WHERE id = $4`,
        [updatedName, updatedEmail, passwordHash, userId]
      );
    } else {
      await pool.query(
        `UPDATE users SET full_name = $1, email = $2 WHERE id = $3`,
        [updatedName, updatedEmail, userId]
      );
    }

    // If Student: update student_profiles
    if (targetUser.role === "student") {
      await pool.query(
        `
        INSERT INTO student_profiles (user_id, roll_number, branch, semester, section, batch, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET roll_number = COALESCE(NULLIF($2, ''), student_profiles.roll_number),
            branch = COALESCE(NULLIF($3, ''), student_profiles.branch),
            semester = COALESCE($4, student_profiles.semester),
            section = COALESCE(NULLIF($5, ''), student_profiles.section),
            batch = COALESCE(NULLIF($6, ''), student_profiles.batch),
            updated_at = NOW()
        `,
        [
          userId,
          rollNumber ? String(rollNumber).trim() : "",
          branch ? String(branch).trim() : "",
          semester ? parseInt(semester, 10) : null,
          section ? String(section).trim() : "",
          batch ? String(batch).trim() : ""
        ]
      );
    }

    // If Faculty: update faculty_profiles
    if (targetUser.role === "faculty") {
      await pool.query(
        `
        INSERT INTO faculty_profiles (user_id, employee_id, department, designation, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET employee_id = COALESCE(NULLIF($2, ''), faculty_profiles.employee_id),
            department = COALESCE(NULLIF($3, ''), faculty_profiles.department),
            designation = COALESCE(NULLIF($4, ''), faculty_profiles.designation),
            updated_at = NOW()
        `,
        [
          userId,
          employeeId ? String(employeeId).trim() : "",
          department ? String(department).trim() : "",
          designation ? String(designation).trim() : ""
        ]
      );
    }

    const updatedSummary = await fetchUserSummary(userId);
    res.json({
      message: `${targetUser.role === "student" ? "Student" : targetUser.role === "faculty" ? "Faculty" : "User"} details updated successfully.`,
      user: updatedSummary
    });
  } catch (error) {
    next(error);
  }
}

