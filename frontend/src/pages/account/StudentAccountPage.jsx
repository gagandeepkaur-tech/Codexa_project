
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  TrendingUp,
  Flame,
  Award,
  Edit3,
  Share2,
  GraduationCap,
  Building2,
  IdCard,
  Calendar,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  KeyRound,
  Laptop,
  Globe,
  FileText,
  Check,
  X,
  ExternalLink,
  Code2
} from "lucide-react";
import { PlatformLayout } from "../../components/PlatformLayout/PlatformLayout";
import SubmissionHeatmap from "../../components/SubmissionHeatmap/SubmissionHeatmap";
import { useTheme } from "../../components/ThemeProvider";
import { ACCENT_PRESETS } from "../../components/accentPresets";
import { getStudentSession, getAuthHeaders } from "../../utils/session";
import { apiBaseUrl } from "../../utils/api";

// Inline SVG icons for GitHub and LinkedIn brand logos
function GithubIcon({ size = 20, color = "#cbd5e1" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon({ size = 20, color = "#0077b5" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function LeetcodeIcon({ size = 20, color = "#ffa116" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      <path d="M15 5l3 3" />
    </svg>
  );
}

function CodechefIcon({ size = 20, color = "#d97706" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 10.5 0A4 4 0 0 1 18 13.87" />
      <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
    </svg>
  );
}

function CodeforcesIcon({ size = 20, color = "#ef4444" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="6" width="4" height="15" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}

export default function StudentAccountPage() {
  const session = getStudentSession();
  const user = session?.user;
  const profile = user?.profile || null;

  const [extraProfile, setExtraProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("codexa_extra_profile_" + user?.id);
      return saved
        ? JSON.parse(saved)
        : {
            bio: profile?.bio || "Student on Codexa coding platform.",
            college: profile?.college || "Institute Student",
            leetcode: "",
            codechef: "",
            codeforces: "",
            github: "",
            linkedin: "",
            portfolio: ""
          };
    } catch {
      return {
        bio: profile?.bio || "Student on Codexa coding platform.",
        college: profile?.college || "Institute Student",
        leetcode: "",
        codechef: "",
        codeforces: "",
        github: "",
        linkedin: "",
        portfolio: ""
      };
    }
  });

  const [statsData, setStatsData] = useState({
    loading: true,
    solvedTotal: 0,
    totalSubmissions: 0,
    totalAccepted: 0,
    accuracyRate: "0.0%",
    currentStreak: 0,
    maxStreak: 0,
    easy: { solved: 0, total: 4, percent: 0 },
    medium: { solved: 0, total: 4, percent: 0 },
    hard: { solved: 0, total: 2, percent: 0 },
    sqlSolved: 0,
    dpSolved: 0
  });

  const [recommendedProblems, setRecommendedProblems] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const [editForm, setEditForm] = useState({
    fullName: user?.full_name || "",
    bio: extraProfile.bio,
    college: extraProfile.college,
    leetcode: extraProfile.leetcode || "",
    codechef: extraProfile.codechef || "",
    codeforces: extraProfile.codeforces || "",
    github: extraProfile.github || "",
    linkedin: extraProfile.linkedin || "",
    portfolio: extraProfile.portfolio || ""
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: ""
  });
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, error: "", success: "" });

  useEffect(() => {
    let isMounted = true;
    async function fetchStudentMetrics() {
      if (!user?.id || !session?.token) {
        setStatsData((prev) => ({ ...prev, loading: false }));
        return;
      }
      try {
        const headers = getAuthHeaders(session.token);

        // 1. Fetch Student Progress by Difficulty
        const progressRes = await fetch(`${apiBaseUrl}/submissions/student/${user.id}/progress`, { headers });
        let progressData = [];
        if (progressRes.ok) {
          progressData = await progressRes.json();
        }

        // 2. Fetch All Submissions for Real Streak & Acceptance Calculation
        const subRes = await fetch(`${apiBaseUrl}/submissions/student/${user.id}`, { headers });
        let subData = [];
        if (subRes.ok) {
          subData = await subRes.json();
        }

        // 3. Fetch Problem Bank for Recommendations & Tag Analysis
        const probRes = await fetch(`${apiBaseUrl}/problems`, { headers });
        let probData = [];
        if (probRes.ok) {
          probData = await probRes.json();
        }

        if (!isMounted) return;

        // Process Difficulty Progress & Submissions
        let totalSub = Array.isArray(subData) ? subData.length : 0;
        const acceptedSubmissions = Array.isArray(subData)
          ? subData.filter((s) => (s.status || "").toLowerCase() === "accepted")
          : [];
        let totalAccepted = acceptedSubmissions.length;

        // Unique solved problem IDs (across both problem bank and course problems)
        const uniqueSolvedIds = new Set(acceptedSubmissions.map((s) => s.problem_id));
        let totalSolved = uniqueSolvedIds.size;

        // Extract solved problem IDs by difficulty from subData
        const solvedEasyIds = new Set(
          acceptedSubmissions
            .filter((s) => (s.difficulty || "").toLowerCase() === "easy")
            .map((s) => s.problem_id)
        );
        const solvedMediumIds = new Set(
          acceptedSubmissions
            .filter((s) => (s.difficulty || "").toLowerCase() === "medium")
            .map((s) => s.problem_id)
        );
        const solvedHardIds = new Set(
          acceptedSubmissions
            .filter((s) => (s.difficulty || "").toLowerCase() === "hard")
            .map((s) => s.problem_id)
        );

        let easyObj = { solved: solvedEasyIds.size, total: 0, percent: 0 };
        let mediumObj = { solved: solvedMediumIds.size, total: 0, percent: 0 };
        let hardObj = { solved: solvedHardIds.size, total: 0, percent: 0 };

        if (Array.isArray(progressData)) {
          progressData.forEach((entry) => {
            const diff = (entry.difficulty || "").toLowerCase();
            const solved = Number(entry.solved_problems || 0);
            const totalProbs = Number(entry.total_problems || 0);

            if (diff === "easy") {
              easyObj.solved = Math.max(easyObj.solved, solved);
              easyObj.total = Math.max(easyObj.total, totalProbs);
            } else if (diff === "medium") {
              mediumObj.solved = Math.max(mediumObj.solved, solved);
              mediumObj.total = Math.max(mediumObj.total, totalProbs);
            } else if (diff === "hard") {
              hardObj.solved = Math.max(hardObj.solved, solved);
              hardObj.total = Math.max(hardObj.total, totalProbs);
            }
          });
        }

        // Calculate actual total problems per difficulty from database (probData)
        const easyDbCount = Array.isArray(probData)
          ? probData.filter((p) => (p.difficulty || "").toLowerCase() === "easy").length
          : 0;
        const mediumDbCount = Array.isArray(probData)
          ? probData.filter((p) => (p.difficulty || "").toLowerCase() === "medium").length
          : 0;
        const hardDbCount = Array.isArray(probData)
          ? probData.filter((p) => (p.difficulty || "").toLowerCase() === "hard").length
          : 0;

        // Ensure total problem counts never default to 0
        easyObj.total = Math.max(easyObj.total, easyDbCount, easyObj.solved, 4);
        easyObj.percent = Math.round((easyObj.solved / easyObj.total) * 100);

        mediumObj.total = Math.max(mediumObj.total, mediumDbCount, mediumObj.solved, 4);
        mediumObj.percent = Math.round((mediumObj.solved / mediumObj.total) * 100);

        hardObj.total = Math.max(hardObj.total, hardDbCount, hardObj.solved, 2);
        hardObj.percent = Math.round((hardObj.solved / hardObj.total) * 100);

        const accRate = totalSub > 0 ? ((totalAccepted / totalSub) * 100).toFixed(1) + "%" : "0.0%";

        // Process Daily Map and Streaks
        const dailyMap = new Map();
        if (Array.isArray(subData)) {
          subData.forEach((sub) => {
            if (!sub.submitted_at) return;
            const dateStr = new Date(sub.submitted_at).toISOString().split("T")[0];
            dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1);
          });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let maxStreak = 0;
        let tempStreak = 0;
        let currentStreak = 0;

        // Compute current streak
        let scanDate = new Date(today);
        let activeToday = (dailyMap.get(scanDate.toISOString().split("T")[0]) || 0) > 0;
        if (!activeToday) {
          scanDate.setDate(scanDate.getDate() - 1);
        }

        while (true) {
          const ds = scanDate.toISOString().split("T")[0];
          const count = dailyMap.get(ds) || 0;
          if (count > 0) {
            currentStreak++;
            scanDate.setDate(scanDate.getDate() - 1);
          } else {
            break;
          }
        }

        // Compute max streak
        const sortedDates = Array.from(dailyMap.keys()).sort();
        if (sortedDates.length > 0) {
          let prevDate = null;
          sortedDates.forEach((dStr) => {
            const curDate = new Date(dStr);
            if (prevDate) {
              const diffDays = Math.round((curDate - prevDate) / (1000 * 60 * 60 * 24));
              if (diffDays === 1) {
                tempStreak++;
              } else {
                tempStreak = 1;
              }
            } else {
              tempStreak = 1;
            }
            if (tempStreak > maxStreak) {
              maxStreak = tempStreak;
            }
            prevDate = curDate;
          });
        }

        // Count Solved SQL & Solved DP problems
        let sqlSolved = 0;
        let dpSolved = 0;
        const acceptedProblemIds = new Set(
          Array.isArray(subData)
            ? subData.filter((s) => (s.status || "").toLowerCase() === "accepted").map((s) => s.problem_id)
            : []
        );

        if (Array.isArray(probData)) {
          probData.forEach((p) => {
            if (acceptedProblemIds.has(p.id)) {
              const titleLower = (p.title || "").toLowerCase();
              const tagsLower = Array.isArray(p.tags) ? p.tags.map((t) => (t || "").toLowerCase()) : [];
              if (titleLower.includes("sql") || titleLower.includes("query") || tagsLower.includes("sql") || tagsLower.includes("database")) {
                sqlSolved++;
              }
              if (titleLower.includes("dp") || titleLower.includes("dynamic") || tagsLower.includes("dp") || tagsLower.includes("dynamic programming")) {
                dpSolved++;
              }
            }
          });
        }

        setStatsData({
          loading: false,
          solvedTotal,
          totalSubmissions: totalSub,
          totalAccepted,
          accuracyRate: accRate,
          currentStreak,
          maxStreak,
          easy: easyObj,
          medium: mediumObj,
          hard: hardObj,
          sqlSolved,
          dpSolved
        });

        // Set Recommended Unsolved Problems
        if (Array.isArray(probData) && probData.length > 0) {
          const unsolved = probData.filter((p) => !acceptedProblemIds.has(p.id));
          setRecommendedProblems(unsolved.length > 0 ? unsolved.slice(0, 3) : probData.slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to load student metrics", err);
        if (isMounted) {
          setStatsData((prev) => ({ ...prev, loading: false }));
        }
      }
    }

    fetchStudentMetrics();
    return () => {
      isMounted = false;
    };
  }, [user?.id, session?.token]);

  const joinedDate = useMemo(() => {
    const raw = user?.created_at || user?.createdAt;
    if (!raw) return "Member";
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return "Member";
      return `Joined ${d.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
    } catch {
      return "Member";
    }
  }, [user?.created_at, user?.createdAt]);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  }

  function handleShareProfile() {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast("Profile URL copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  }

  function handleSaveProfile(e) {
    e.preventDefault();
    const updatedExtra = {
      bio: editForm.bio,
      college: editForm.college,
      leetcode: editForm.leetcode,
      codechef: editForm.codechef,
      codeforces: editForm.codeforces,
      github: editForm.github,
      linkedin: editForm.linkedin,
      portfolio: editForm.portfolio
    };
    setExtraProfile(updatedExtra);
    try {
      localStorage.setItem("codexa_extra_profile_" + user?.id, JSON.stringify(updatedExtra));
    } catch (err) {
      console.error(err);
    }
    setIsEditModalOpen(false);
    showToast("Profile details updated successfully!");
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordStatus({ loading: true, error: "", success: "" });
    try {
      const res = await fetch(`${apiBaseUrl}/users/me/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify(passwordForm)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update password");
      }
      setPasswordStatus({ loading: false, error: "", success: "Password changed successfully!" });
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordStatus({ loading: false, error: "", success: "" });
      }, 1500);
    } catch (err) {
      setPasswordStatus({ loading: false, error: err.message, success: "" });
    }
  }

  function handleDownloadResume() {
    const studentName = user?.full_name || "Student";
    const element = document.createElement("a");
    const file = new Blob(
      [
        `CODEXA STUDENT PROFILE RESUME\n\nName: ${studentName}\nEmail: ${user?.email || "N/A"}\nBranch: ${profile?.branch || "N/A"}\nRoll Number: ${profile?.roll_number || "N/A"}\nCollege: ${extraProfile.college || profile?.college || "Institute Student"}\n\nPERFORMANCE METRICS\nProblems Solved: ${statsData.solvedTotal}\nTotal Submissions: ${statsData.totalSubmissions}\nAcceptance Rate: ${statsData.accuracyRate}\nCurrent Streak: ${statsData.currentStreak} Days\nMax Streak: ${statsData.maxStreak} Days\n\nGenerated from Codexa Platform.`
      ],
      { type: "text/plain" }
    );
    element.href = URL.createObjectURL(file);
    element.download = `${studentName.replace(/\s+/g, "_")}_Resume.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast("Resume downloaded successfully!");
  }

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email || "ST").slice(0, 2).toUpperCase();

  return (
    <PlatformLayout
      role="student"
      eyebrow="Student Profile"
      title={`${user?.full_name || "Student"}'s Profile`}
      subtitle="Overview of your actual coding performance, activity streaks, credentials, and security settings."
      meta="Verified Student"
    >
      {toastMessage ? (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#1e1e24",
            border: "1px solid #7C3AED",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(124, 58, 237, 0.3)",
            zIndex: 2000,
            fontSize: "14px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <CheckCircle2 size={18} color="#4ade80" />
          {toastMessage}
        </div>
      ) : null}

      <section className="sap-profile-hero">
        <div className="sap-hero-flex">
          <div className="sap-hero-identity">
            <div className="sap-avatar-ring">
              <div className="sap-avatar-inner">{initials}</div>
              <div className="sap-online-indicator" title="Active on Codexa" />
            </div>

            <div className="sap-identity-details">
              <h1>
                {user?.full_name || "Student"}
                <span className="sap-verified-badge" title="Verified Codexa Student">✓</span>
              </h1>
              <p className="sap-user-bio">{extraProfile.bio}</p>

              <div className="sap-meta-chips">
                <span className="sap-badge-chip">
                  <Building2 size={13} color="#38bdf8" />
                  {extraProfile.college}
                </span>
                <span className="sap-badge-chip">
                  <GraduationCap size={13} color="#a855f7" />
                  {profile?.branch || "N/A"} • {profile?.semester ? `Sem ${profile.semester}` : "Sem N/A"}
                </span>
                <span className="sap-badge-chip">
                  <IdCard size={13} color="#facc15" />
                  Roll: {profile?.roll_number || "N/A"}
                </span>
                <span className="sap-badge-chip">
                  <Calendar size={13} color="#4ade80" />
                  {joinedDate}
                </span>
              </div>
            </div>
          </div>

          <div className="sap-hero-actions">
            <button className="sap-btn-primary" onClick={() => setIsEditModalOpen(true)}>
              <Edit3 size={15} />
              Edit Profile
            </button>
            <button className="sap-btn-secondary" onClick={handleShareProfile}>
              {copiedLink ? <Check size={15} color="#4ade80" /> : <Share2 size={15} />}
              {copiedLink ? "Copied Link!" : "Share Profile"}
            </button>
          </div>
        </div>
      </section>

      <section className="sap-stats-grid">
        <article className="sap-stat-card">
          <div className="sap-stat-icon-wrapper purple">
            <Trophy size={22} />
          </div>
          <div className="sap-stat-value">{statsData.solvedTotal}</div>
          <div className="sap-stat-label">Problems Solved</div>
          <div className="sap-stat-subtitle">
            {statsData.solvedTotal} of {statsData.easy.total + statsData.medium.total + statsData.hard.total} total solved
          </div>
        </article>

        <article className="sap-stat-card">
          <div className="sap-stat-icon-wrapper blue">
            <Code2 size={22} />
          </div>
          <div className="sap-stat-value">{statsData.totalSubmissions}</div>
          <div className="sap-stat-label">Total Submissions</div>
          <div className="sap-stat-subtitle">All test evaluations</div>
        </article>

        <article className="sap-stat-card">
          <div className="sap-stat-icon-wrapper green">
            <TrendingUp size={22} />
          </div>
          <div className="sap-stat-value">{statsData.accuracyRate}</div>
          <div className="sap-stat-label">Acceptance Rate</div>
          <div className="sap-stat-subtitle">Submission accuracy</div>
        </article>

        <article className="sap-stat-card">
          <div className="sap-stat-icon-wrapper orange">
            <Flame size={22} />
          </div>
          <div className="sap-stat-value">{statsData.currentStreak} Days 🔥</div>
          <div className="sap-stat-label">Current Streak</div>
          <div className="sap-stat-subtitle">Active daily coding</div>
        </article>

        <article className="sap-stat-card">
          <div className="sap-stat-icon-wrapper yellow">
            <Award size={22} />
          </div>
          <div className="sap-stat-value">{statsData.maxStreak} Days</div>
          <div className="sap-stat-label">Max Streak</div>
          <div className="sap-stat-subtitle">Personal best record</div>
        </article>
      </section>

      <SubmissionHeatmap studentId={user?.id} session={session} />

      <section className="sap-section-card">
        <div className="sap-section-head">
          <div className="sap-section-title-group">
            <p className="sap-section-eyebrow">Practice Breakdown</p>
            <h2>Difficulty Progress</h2>
          </div>
        </div>

        <div className="sap-difficulty-grid">
          <div className="sap-difficulty-card">
            <div className="sap-diff-header">
              <span className="sap-diff-badge easy">Easy</span>
              <div className="sap-diff-count">
                {statsData.easy.solved} <span>/ {statsData.easy.total} Solved</span>
              </div>
            </div>
            <div className="sap-progress-track">
              <div className="sap-progress-fill easy" style={{ width: `${statsData.easy.percent}%` }} />
            </div>
            <div className="sap-diff-percent">
              {statsData.easy.solved} of {statsData.easy.total} Easy problems solved ({statsData.easy.percent}%)
            </div>
          </div>

          <div className="sap-difficulty-card">
            <div className="sap-diff-header">
              <span className="sap-diff-badge medium">Medium</span>
              <div className="sap-diff-count">
                {statsData.medium.solved} <span>/ {statsData.medium.total} Solved</span>
              </div>
            </div>
            <div className="sap-progress-track">
              <div className="sap-progress-fill medium" style={{ width: `${statsData.medium.percent}%` }} />
            </div>
            <div className="sap-diff-percent">
              {statsData.medium.solved} of {statsData.medium.total} Medium problems solved ({statsData.medium.percent}%)
            </div>
          </div>

          <div className="sap-difficulty-card">
            <div className="sap-diff-header">
              <span className="sap-diff-badge hard">Hard</span>
              <div className="sap-diff-count">
                {statsData.hard.solved} <span>/ {statsData.hard.total} Solved</span>
              </div>
            </div>
            <div className="sap-progress-track">
              <div className="sap-progress-fill hard" style={{ width: `${statsData.hard.percent}%` }} />
            </div>
            <div className="sap-diff-percent">
              {statsData.hard.solved} of {statsData.hard.total} Hard problems solved ({statsData.hard.percent}%)
            </div>
          </div>
        </div>
      </section>

      <div className="sap-two-col-grid">
        <section className="sap-section-card" style={{ marginBottom: 0 }}>
          <div className="sap-section-head">
            <div className="sap-section-title-group">
              <p className="sap-section-eyebrow">Authentication</p>
              <h2>Security & Sign-in</h2>
            </div>
          </div>

          <div className="sap-security-item">
            <div>
              <div className="sap-sec-label">Email Address</div>
              <div className="sap-sec-val">{user?.email || "No email on record"}</div>
            </div>
            <span className="sap-badge-chip" style={{ color: "#4ade80", borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.1)" }}>
              <ShieldCheck size={13} /> Verified
            </span>
          </div>

          <div className="sap-security-item">
            <div>
              <div className="sap-sec-label">Password</div>
              <div className="sap-sec-val">Password protected</div>
            </div>
            <button className="sap-btn-secondary" style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem" }} onClick={() => setIsPasswordModalOpen(true)}>
              <KeyRound size={13} /> Change Password
            </button>
          </div>

          <div className="sap-security-item">
            <div>
              <div className="sap-sec-label">Active Session</div>
              <div className="sap-sec-val">1 Active • Current Browser Session • Active Now</div>
            </div>
            <Laptop size={18} color="#38bdf8" />
          </div>
        </section>

        <section className="sap-section-card" style={{ marginBottom: 0 }}>
          <div className="sap-section-head">
            <div className="sap-section-title-group">
              <p className="sap-section-eyebrow">Online Presence</p>
              <h2>Social Links & Credentials</h2>
            </div>
          </div>

          <div className="sap-social-grid" style={{ marginBottom: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
            {/* LeetCode Card */}
            {extraProfile.leetcode ? (
              <a href={extraProfile.leetcode.startsWith("http") ? extraProfile.leetcode : `https://leetcode.com/u/${extraProfile.leetcode}`} target="_blank" rel="noreferrer" className="sap-social-card">
                <LeetcodeIcon size={20} color="#ffa116" />
                <div>
                  <div className="sap-social-title">LeetCode</div>
                  <div className="sap-social-handle">{extraProfile.leetcode}</div>
                </div>
                <ExternalLink size={14} color="#64748b" style={{ marginLeft: "auto" }} />
              </a>
            ) : (
              <div className="sap-social-card" style={{ opacity: 0.75, cursor: "pointer" }} onClick={() => setIsEditModalOpen(true)}>
                <LeetcodeIcon size={20} color="#ffa116" />
                <div>
                  <div className="sap-social-title">LeetCode</div>
                  <div className="sap-social-handle" style={{ color: "#94a3b8" }}>Add LeetCode handle</div>
                </div>
              </div>
            )}

            {/* CodeChef Card */}
            {extraProfile.codechef ? (
              <a href={extraProfile.codechef.startsWith("http") ? extraProfile.codechef : `https://codechef.com/users/${extraProfile.codechef}`} target="_blank" rel="noreferrer" className="sap-social-card">
                <CodechefIcon size={20} color="#d97706" />
                <div>
                  <div className="sap-social-title">CodeChef</div>
                  <div className="sap-social-handle">{extraProfile.codechef}</div>
                </div>
                <ExternalLink size={14} color="#64748b" style={{ marginLeft: "auto" }} />
              </a>
            ) : (
              <div className="sap-social-card" style={{ opacity: 0.75, cursor: "pointer" }} onClick={() => setIsEditModalOpen(true)}>
                <CodechefIcon size={20} color="#d97706" />
                <div>
                  <div className="sap-social-title">CodeChef</div>
                  <div className="sap-social-handle" style={{ color: "#94a3b8" }}>Add CodeChef handle</div>
                </div>
              </div>
            )}

            {/* Codeforces Card */}
            {extraProfile.codeforces ? (
              <a href={extraProfile.codeforces.startsWith("http") ? extraProfile.codeforces : `https://codeforces.com/profile/${extraProfile.codeforces}`} target="_blank" rel="noreferrer" className="sap-social-card">
                <CodeforcesIcon size={20} color="#ef4444" />
                <div>
                  <div className="sap-social-title">Codeforces</div>
                  <div className="sap-social-handle">{extraProfile.codeforces}</div>
                </div>
                <ExternalLink size={14} color="#64748b" style={{ marginLeft: "auto" }} />
              </a>
            ) : (
              <div className="sap-social-card" style={{ opacity: 0.75, cursor: "pointer" }} onClick={() => setIsEditModalOpen(true)}>
                <CodeforcesIcon size={20} color="#ef4444" />
                <div>
                  <div className="sap-social-title">Codeforces</div>
                  <div className="sap-social-handle" style={{ color: "#94a3b8" }}>Add Codeforces handle</div>
                </div>
              </div>
            )}

            {/* GitHub Card */}
            {extraProfile.github ? (
              <a href={extraProfile.github.startsWith("http") ? extraProfile.github : `https://${extraProfile.github}`} target="_blank" rel="noreferrer" className="sap-social-card">
                <GithubIcon size={20} color="#cbd5e1" />
                <div>
                  <div className="sap-social-title">GitHub</div>
                  <div className="sap-social-handle">{extraProfile.github}</div>
                </div>
                <ExternalLink size={14} color="#64748b" style={{ marginLeft: "auto" }} />
              </a>
            ) : (
              <div className="sap-social-card" style={{ opacity: 0.75, cursor: "pointer" }} onClick={() => setIsEditModalOpen(true)}>
                <GithubIcon size={20} color="#64748b" />
                <div>
                  <div className="sap-social-title">GitHub</div>
                  <div className="sap-social-handle" style={{ color: "#94a3b8" }}>Add GitHub profile</div>
                </div>
              </div>
            )}

            {/* LinkedIn Card */}
            {extraProfile.linkedin ? (
              <a href={extraProfile.linkedin.startsWith("http") ? extraProfile.linkedin : `https://${extraProfile.linkedin}`} target="_blank" rel="noreferrer" className="sap-social-card">
                <LinkedinIcon size={20} color="#0077b5" />
                <div>
                  <div className="sap-social-title">LinkedIn</div>
                  <div className="sap-social-handle">{extraProfile.linkedin}</div>
                </div>
                <ExternalLink size={14} color="#64748b" style={{ marginLeft: "auto" }} />
              </a>
            ) : (
              <div className="sap-social-card" style={{ opacity: 0.75, cursor: "pointer" }} onClick={() => setIsEditModalOpen(true)}>
                <LinkedinIcon size={20} color="#64748b" />
                <div>
                  <div className="sap-social-title">LinkedIn</div>
                  <div className="sap-social-handle" style={{ color: "#94a3b8" }}>Add LinkedIn profile</div>
                </div>
              </div>
            )}

            {/* Portfolio Card */}
            {extraProfile.portfolio ? (
              <a href={extraProfile.portfolio.startsWith("http") ? extraProfile.portfolio : `https://${extraProfile.portfolio}`} target="_blank" rel="noreferrer" className="sap-social-card">
                <Globe size={20} color="#a855f7" />
                <div>
                  <div className="sap-social-title">Portfolio</div>
                  <div className="sap-social-handle">{extraProfile.portfolio}</div>
                </div>
                <ExternalLink size={14} color="#64748b" style={{ marginLeft: "auto" }} />
              </a>
            ) : (
              <div className="sap-social-card" style={{ opacity: 0.75, cursor: "pointer" }} onClick={() => setIsEditModalOpen(true)}>
                <Globe size={20} color="#64748b" />
                <div>
                  <div className="sap-social-title">Portfolio</div>
                  <div className="sap-social-handle" style={{ color: "#94a3b8" }}>Add website link</div>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              padding: "1.25rem",
              borderRadius: "14px",
              background: "rgba(124, 58, 237, 0.08)",
              border: "1px solid rgba(124, 58, 237, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <FileText size={24} color="#a855f7" />
              <div>
                <div style={{ fontWeight: 700, color: "#ffffff", fontSize: "0.925rem" }}>Student Coding Resume</div>
                <div style={{ fontSize: "0.775rem", color: "#94a3b8" }}>Export verified progress report for campus placements</div>
              </div>
            </div>
            <button className="sap-btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.825rem" }} onClick={handleDownloadResume}>
              Download Resume
            </button>
          </div>

          {/* Interface Customization & Theme Settings */}
          <div style={{
            marginTop: "1.5rem",
            padding: "1.25rem",
            borderRadius: "14px",
            background: "var(--lc-card-bg)",
            border: "1px solid var(--lc-border)"
          }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              🎨 Interface Customization & Theme Settings
            </h3>
            <p style={{ fontSize: "0.775rem", color: "#94a3b8", marginBottom: "1rem" }}>
              Personalize your workspace accent colors and light/dark theme. Changes take effect instantly across all pages.
            </p>
            <StudentThemeCustomizerBlock />
          </div>
        </section>
      </div>

      {isEditModalOpen ? (
        <div 
          className="sap-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setIsEditModalOpen(false); }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1.5rem"
          }}
        >
          <div 
            className="sap-modal-card"
            style={{
              background: "#161b26",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "20px",
              padding: "2rem",
              width: "min(560px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)",
              color: "#ffffff",
              position: "relative",
              zIndex: 100000
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>Edit Profile Information</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: "#94a3b8", cursor: "pointer", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.825rem", color: "#94a3b8", marginBottom: "0.35rem" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.fullName}
                  disabled
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#94a3b8"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.825rem", color: "#cbd5e1", marginBottom: "0.35rem" }}>
                  Personal Bio
                </label>
                <textarea
                  rows="3"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    fontFamily: "inherit"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.825rem", color: "#cbd5e1", marginBottom: "0.35rem" }}>
                  College / Institute
                </label>
                <input
                  type="text"
                  value={editForm.college}
                  onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.825rem", color: "#cbd5e1", marginBottom: "0.35rem" }}>
                    LeetCode Handle / URL
                  </label>
                  <input
                    type="text"
                    value={editForm.leetcode}
                    placeholder="leetcode.com/u/username"
                    onChange={(e) => setEditForm({ ...editForm, leetcode: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.825rem", color: "#cbd5e1", marginBottom: "0.35rem" }}>
                    CodeChef Handle / URL
                  </label>
                  <input
                    type="text"
                    value={editForm.codechef}
                    placeholder="codechef.com/users/username"
                    onChange={(e) => setEditForm({ ...editForm, codechef: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.825rem", color: "#cbd5e1", marginBottom: "0.35rem" }}>
                    Codeforces Handle / URL
                  </label>
                  <input
                    type="text"
                    value={editForm.codeforces}
                    placeholder="codeforces.com/profile/username"
                    onChange={(e) => setEditForm({ ...editForm, codeforces: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.825rem", color: "#cbd5e1", marginBottom: "0.35rem" }}>
                    GitHub Handle / URL
                  </label>
                  <input
                    type="text"
                    value={editForm.github}
                    placeholder="github.com/username"
                    onChange={(e) => setEditForm({ ...editForm, github: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.825rem", color: "#cbd5e1", marginBottom: "0.35rem" }}>
                    LinkedIn Handle / URL
                  </label>
                  <input
                    type="text"
                    value={editForm.linkedin}
                    placeholder="linkedin.com/in/username"
                    onChange={(e) => setEditForm({ ...editForm, linkedin: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.825rem", color: "#cbd5e1", marginBottom: "0.35rem" }}>
                    Portfolio Website
                  </label>
                  <input
                    type="text"
                    value={editForm.portfolio}
                    placeholder="yourportfolio.dev"
                    onChange={(e) => setEditForm({ ...editForm, portfolio: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button type="button" className="sap-btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="sap-btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isPasswordModalOpen ? (
        <div 
          className="sap-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setIsPasswordModalOpen(false); }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1.5rem"
          }}
        >
          <div 
            className="sap-modal-card"
            style={{
              background: "#161b26",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "20px",
              padding: "2rem",
              width: "min(500px, 100%)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)",
              color: "#ffffff",
              position: "relative",
              zIndex: 100000
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>Change Sign-in Password</h3>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: "#94a3b8", cursor: "pointer", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} />
              </button>
            </div>

            {passwordStatus.error ? (
              <p style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", padding: "10px", borderRadius: "8px", fontSize: "13px" }}>
                {passwordStatus.error}
              </p>
            ) : null}

            {passwordStatus.success ? (
              <p style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", padding: "10px", borderRadius: "8px", fontSize: "13px" }}>
                {passwordStatus.success}
              </p>
            ) : null}

            <form onSubmit={handlePasswordSubmit} style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.825rem", color: "#cbd5e1", marginBottom: "0.35rem" }}>
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.825rem", color: "#cbd5e1", marginBottom: "0.35rem" }}>
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button type="button" className="sap-btn-secondary" onClick={() => setIsPasswordModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="sap-btn-primary" disabled={passwordStatus.loading}>
                  {passwordStatus.loading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PlatformLayout>
  );
}

function StudentThemeCustomizerBlock() {
  const { theme, toggleTheme, accentColor, setAccentColor } = useTheme();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", flexWrap: "wrap" }}>
      <div>
        <label style={{ fontSize: "0.825rem", fontWeight: 700, color: "#cbd5e1", display: "block", marginBottom: "0.5rem" }}>
          Appearance Mode
        </label>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => theme !== "dark" && toggleTheme()}
            style={{
              background: theme === "dark" ? "var(--lc-accent, #ff7e29)" : "rgba(255, 255, 255, 0.05)",
              color: theme === "dark" ? "#fff" : "#94a3b8",
              border: "1px solid",
              borderColor: theme === "dark" ? "var(--lc-accent, #ff7e29)" : "rgba(255, 255, 255, 0.12)",
              borderRadius: "8px",
              padding: "0.55rem 1rem",
              fontWeight: 600,
              fontSize: "0.825rem",
              cursor: "pointer"
            }}
          >
            🌙 Dark Mode
          </button>
          <button
            type="button"
            onClick={() => theme !== "light" && toggleTheme()}
            style={{
              background: theme === "light" ? "var(--lc-accent, #ff7e29)" : "rgba(255, 255, 255, 0.05)",
              color: theme === "light" ? "#fff" : "#94a3b8",
              border: "1px solid",
              borderColor: theme === "light" ? "var(--lc-accent, #ff7e29)" : "rgba(255, 255, 255, 0.12)",
              borderRadius: "8px",
              padding: "0.55rem 1rem",
              fontWeight: 600,
              fontSize: "0.825rem",
              cursor: "pointer"
            }}
          >
            ☀️ Light Mode
          </button>
        </div>
      </div>

      <div>
        <label style={{ fontSize: "0.825rem", fontWeight: 700, color: "#cbd5e1", display: "block", marginBottom: "0.5rem" }}>
          Primary Accent Color
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
          {ACCENT_PRESETS.map((preset) => {
            const isSelected = accentColor.toLowerCase() === preset.color.toLowerCase();
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setAccentColor(preset.color)}
                style={{
                  background: "rgba(0, 0, 0, 0.2)",
                  border: isSelected ? `2px solid ${preset.color}` : "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: "0.45rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  cursor: "pointer",
                  boxShadow: isSelected ? `0 0 10px ${preset.color}66` : "none"
                }}
              >
                <span style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: preset.color,
                  display: "inline-block",
                  flexShrink: 0
                }} />
                <span style={{
                  fontSize: "0.725rem",
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? preset.color : "#94a3b8",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
