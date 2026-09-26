import { Router } from "express";
import {
  addCourseCodingProblem,
  addCourseStudent,
  addCourseMaterial,
  addCourseMcqQuestion,
  addCourseQuestionsBulk,
  createCourse,
  deleteCourse,
  getCourseById,
  getCourseFilters,
  getCourseStudents,
  getCourseRoster,
  importCourseStudents,
  listCourses,
  runCourseCodingProblem,
  submitCourseCodingProblem,
  updateCourse
} from "../controllers/course.controller.js";
import {
  createAssignment,
  listAssignmentsForCourse,
  updateAssignment,
  deleteAssignment,
  addAssignmentQuestion,
  addAssignmentQuestionsBulk,
  updateAssignmentQuestion,
  deleteAssignmentQuestion
} from "../controllers/assignment.controller.js";
import {
  attachRoleProfile,
  requireAuth,
  requireCourseAccess,
  requireCourseManagementAccess,
  requireMongoUser,
  requireRole,
  validateStudentCourseAccess
} from "../middleware/auth.middleware.js";

const courseRouter = Router();

courseRouter.use(requireAuth, requireMongoUser, attachRoleProfile);

courseRouter.get("/filters", requireRole("admin"), getCourseFilters);
courseRouter.get("/", listCourses);
courseRouter.post("/", requireRole("admin", "faculty"), createCourse);
courseRouter.get("/:courseId", requireCourseAccess, validateStudentCourseAccess, getCourseById);
courseRouter.put("/:courseId", requireRole("admin"), updateCourse);
courseRouter.delete("/:courseId", requireRole("admin"), deleteCourse);
courseRouter.get("/:courseId/students", requireCourseManagementAccess, getCourseStudents);
courseRouter.get("/:courseId/enrollments", requireRole("admin"), requireCourseManagementAccess, getCourseRoster);
courseRouter.post("/:courseId/enrollments", requireRole("admin"), requireCourseManagementAccess, addCourseStudent);
courseRouter.post("/:courseId/enrollments/import", requireRole("admin"), requireCourseManagementAccess, importCourseStudents);
courseRouter.get("/:courseId/assignments", requireCourseAccess, validateStudentCourseAccess, listAssignmentsForCourse);
courseRouter.post("/:courseId/assignments", requireCourseManagementAccess, createAssignment);
courseRouter.put("/:courseId/assignments/:assignmentId", requireCourseManagementAccess, updateAssignment);
courseRouter.delete("/:courseId/assignments/:assignmentId", requireCourseManagementAccess, deleteAssignment);
courseRouter.post("/:courseId/assignments/:assignmentId/questions", requireCourseManagementAccess, addAssignmentQuestion);
courseRouter.post("/:courseId/assignments/:assignmentId/questions/bulk", requireCourseManagementAccess, addAssignmentQuestionsBulk);
courseRouter.put("/:courseId/assignments/:assignmentId/questions/:questionId", requireCourseManagementAccess, updateAssignmentQuestion);
courseRouter.delete("/:courseId/assignments/:assignmentId/questions/:questionId", requireCourseManagementAccess, deleteAssignmentQuestion);
courseRouter.post("/:courseId/materials", requireCourseManagementAccess, addCourseMaterial);
courseRouter.post("/:courseId/coding-problems", requireCourseManagementAccess, addCourseCodingProblem);
courseRouter.post("/:courseId/mcq-questions", requireCourseManagementAccess, addCourseMcqQuestion);
courseRouter.post("/:courseId/questions/bulk", requireCourseManagementAccess, addCourseQuestionsBulk);
courseRouter.post("/:courseId/coding-problems/:problemId/run", requireCourseAccess, validateStudentCourseAccess, runCourseCodingProblem);
courseRouter.post("/:courseId/coding-problems/:problemId/submit", requireCourseAccess, validateStudentCourseAccess, submitCourseCodingProblem);

export default courseRouter;
