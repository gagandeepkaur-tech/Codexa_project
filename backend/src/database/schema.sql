CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE users
SET role = 'faculty'
WHERE role = 'instructor';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'faculty', 'admin'));

CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  roll_number VARCHAR(80) NOT NULL UNIQUE,
  branch VARCHAR(30) NOT NULL,
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 12),
  section VARCHAR(10) NOT NULL,
  batch VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faculty_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employee_id VARCHAR(80) NOT NULL UNIQUE,
  department VARCHAR(50) NOT NULL,
  designation VARCHAR(120) NOT NULL DEFAULT 'Faculty',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program VARCHAR(120) NOT NULL DEFAULT '',
  title VARCHAR(180) NOT NULL,
  description TEXT,
  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  roster_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS roster_restricted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS program VARCHAR(120) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(180) NOT NULL,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  statement TEXT NOT NULL,
  input_format TEXT,
  output_format TEXT,
  constraints_text TEXT,
  examples_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE problems
ADD COLUMN IF NOT EXISTS input_format TEXT,
ADD COLUMN IF NOT EXISTS output_format TEXT,
ADD COLUMN IF NOT EXISTS constraints_text TEXT,
ADD COLUMN IF NOT EXISTS examples_text TEXT,
ADD COLUMN IF NOT EXISTS target_branch VARCHAR(50) DEFAULT 'ALL',
ADD COLUMN IF NOT EXISTS target_semester VARCHAR(20) DEFAULT 'ALL',
ADD COLUMN IF NOT EXISTS target_batch VARCHAR(50) DEFAULT 'ALL',
ADD COLUMN IF NOT EXISTS allow_faculty_edit BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_code_unique ON courses(code) WHERE code IS NOT NULL;

CREATE TABLE IF NOT EXISTS course_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  branch VARCHAR(30) NOT NULL,
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 12),
  section VARCHAR(10) NOT NULL,
  batch VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, branch, semester, section, batch)
);

CREATE TABLE IF NOT EXISTS course_faculty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, faculty_id)
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, student_id)
);

CREATE TABLE IF NOT EXISTS course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  material_type VARCHAR(20) NOT NULL DEFAULT 'notes'
    CHECK (material_type IN ('notes', 'slides', 'video', 'link', 'document')),
  url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_coding_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  statement TEXT NOT NULL,
  input_format TEXT,
  output_format TEXT,
  constraints_text TEXT,
  examples_text TEXT,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE course_coding_problems
ADD COLUMN IF NOT EXISTS input_format TEXT,
ADD COLUMN IF NOT EXISTS output_format TEXT,
ADD COLUMN IF NOT EXISTS constraints_text TEXT,
ADD COLUMN IF NOT EXISTS examples_text TEXT;

CREATE TABLE IF NOT EXISTS course_problem_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_problem_id UUID NOT NULL REFERENCES course_coding_problems(id) ON DELETE CASCADE,
  input_data TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_sample BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_problem_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_problem_id UUID NOT NULL REFERENCES course_coding_problems(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(30) NOT NULL CHECK (language IN ('cpp', 'java', 'python', 'javascript')),
  source_code TEXT NOT NULL,
  custom_input TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL CHECK (status IN ('accepted', 'wrong_answer', 'time_limit')),
  passed_test_cases INTEGER NOT NULL DEFAULT 0,
  total_test_cases INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  memory_kb INTEGER,
  compiler_output TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  assignment_type VARCHAR(20) NOT NULL DEFAULT 'coding',
  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  time_limit_minutes INTEGER,
  max_score INTEGER NOT NULL DEFAULT 100,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE course_assignments
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published',
ADD COLUMN IF NOT EXISTS target_batch VARCHAR(100) DEFAULT 'ALL',
ADD COLUMN IF NOT EXISTS target_year VARCHAR(50) DEFAULT 'ALL',
ADD COLUMN IF NOT EXISTS target_semester VARCHAR(50) DEFAULT 'ALL';

ALTER TABLE course_assignments DROP CONSTRAINT IF EXISTS course_assignments_assignment_type_check;
ALTER TABLE course_assignments ADD CONSTRAINT course_assignments_assignment_type_check CHECK (assignment_type IN ('coding', 'theory', 'mst', 'quiz', 'assignment'));

-- Legacy table kept for reference, but won't be actively used by new system
CREATE TABLE IF NOT EXISTS course_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES course_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_code TEXT NOT NULL DEFAULT '',
  answer_text TEXT NOT NULL DEFAULT '',
  attachment_url TEXT NOT NULL DEFAULT '',
  grade INTEGER CHECK (grade BETWEEN 0 AND 100),
  feedback TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS mcq_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option_index INTEGER NOT NULL,
  marks INTEGER NOT NULL DEFAULT 1,
  negative_marks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES course_assignments(id) ON DELETE CASCADE,
  question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('mcq', 'coding')),
  mcq_id UUID REFERENCES mcq_questions(id) ON DELETE CASCADE,
  course_coding_problem_id UUID REFERENCES course_coding_problems(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  marks INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignment_student_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES course_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'late')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  total_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS assignment_mcq_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES assignment_student_attempts(id) ON DELETE CASCADE,
  assignment_question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
  selected_option_index INTEGER,
  is_correct BOOLEAN,
  marks_obtained INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_id, assignment_question_id)
);

CREATE TABLE IF NOT EXISTS assignment_coding_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES assignment_student_attempts(id) ON DELETE CASCADE,
  assignment_question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
  language VARCHAR(30),
  source_code TEXT,
  execution_result JSONB,
  passed_test_cases INTEGER DEFAULT 0,
  total_test_cases INTEGER DEFAULT 0,
  marks_obtained INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_id, assignment_question_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  language VARCHAR(30) NOT NULL CHECK (language IN ('cpp', 'java', 'python', 'javascript')),
  source_code TEXT NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('accepted', 'wrong_answer', 'time_limit')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS passed_test_cases INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_test_cases INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS memory_kb INTEGER,
ADD COLUMN IF NOT EXISTS compiler_output TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS problem_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  tag_name VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (problem_id, tag_name)
);

CREATE TABLE IF NOT EXISTS test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  input_data TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_sample BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(80) NOT NULL,
  target_type VARCHAR(80) NOT NULL,
  target_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  total_submissions INTEGER NOT NULL DEFAULT 0,
  accepted_submissions INTEGER NOT NULL DEFAULT 0,
  wrong_answer_submissions INTEGER NOT NULL DEFAULT 0,
  time_limit_submissions INTEGER NOT NULL DEFAULT 0,
  latest_status VARCHAR(30) CHECK (latest_status IN ('accepted', 'wrong_answer', 'time_limit')),
  first_attempted_at TIMESTAMPTZ,
  last_submitted_at TIMESTAMPTZ,
  solved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, problem_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem_id ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_problem_tags_problem_id ON problem_tags(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_tags_tag_name ON problem_tags(tag_name);

CREATE INDEX IF NOT EXISTS idx_test_cases_problem_id ON test_cases(problem_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_problem_sort ON test_cases(problem_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_problem_id ON student_progress(problem_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_latest_status ON student_progress(latest_status);

CREATE INDEX IF NOT EXISTS idx_student_profiles_branch_semester
  ON student_profiles(branch, semester, section, batch);
CREATE INDEX IF NOT EXISTS idx_faculty_profiles_department ON faculty_profiles(department);
CREATE INDEX IF NOT EXISTS idx_course_audiences_course_id ON course_audiences(course_id);
CREATE INDEX IF NOT EXISTS idx_course_audiences_match
  ON course_audiences(branch, semester, section, batch);
CREATE INDEX IF NOT EXISTS idx_course_faculty_faculty_id ON course_faculty(faculty_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_coding_problems_course_id ON course_coding_problems(course_id);
CREATE INDEX IF NOT EXISTS idx_course_problem_test_cases_problem_id ON course_problem_test_cases(course_problem_id);
CREATE INDEX IF NOT EXISTS idx_course_problem_submissions_problem_id ON course_problem_submissions(course_problem_id);
CREATE INDEX IF NOT EXISTS idx_course_problem_submissions_student_id ON course_problem_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_course_id ON course_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_assignment_submissions_assignment_id
  ON course_assignment_submissions(assignment_id);
