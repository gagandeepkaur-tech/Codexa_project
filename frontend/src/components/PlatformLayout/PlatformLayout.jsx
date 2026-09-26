import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import {
  clearStudentSession,
  clearFacultySession,
  clearAdminSession,
  getStudentSession,
  getFacultySession,
  getAdminSession
} from "../../utils/session";

const studentNavCategories = [
  {
    title: "PLATFORM",
    items: [
      { to: "/student/dashboard", label: "Dashboard", icon: "dashboard" },
      { to: "/student/courses", label: "Courses", icon: "courses" },
      { to: "/student/problems", label: "Practice", icon: "problems" },
      { to: "/student/exams", label: "Tests & MST", icon: "exam" }
    ]
  },
  {
    title: "ACCOUNT",
    items: [
      { to: "/student/account", label: "Account", icon: "account" }
    ]
  }
];

const facultyNavCategories = [
  {
    title: "PLATFORM",
    items: [
      { to: "/faculty/dashboard", label: "Dashboard", icon: "dashboard" },
      { to: "/faculty/courses", label: "Courses", icon: "courses" },
      { to: "/faculty/students", label: "Students", icon: "users" },
      { to: "/faculty/exams", label: "Tests & MST", icon: "exam" },
      { to: "/faculty/dashboard?tab=analytics", label: "Analytics", icon: "analytics" },
      { to: "/faculty/dashboard?tab=practice", label: "Practice", icon: "problems" }
    ]
  },
  {
    title: "ACCOUNT",
    items: [
      { to: "/faculty/account", label: "Account", icon: "account" }
    ]
  }
];

const adminNavCategories = [
  {
    title: "PLATFORM",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
      { to: "/admin/students", label: "Manage Users", icon: "users" },
      { to: "/admin/courses", label: "Courses", icon: "courses" },
      { to: "/admin/problems", label: "Problem Bank", icon: "problems" },
      { to: "/admin/exams", label: "Tests & MST", icon: "exam" }
    ]
  },
  {
    title: "MANAGEMENT",
    items: [
      { to: "/admin/dashboard?tab=analytics", label: "Analytics", icon: "analytics" }
    ]
  },
  {
    title: "ACCOUNT",
    items: [
      { to: "/admin/account", label: "Settings", icon: "settings" }
    ]
  }
];


const navCategoriesByRole = {
  student: studentNavCategories,
  faculty: facultyNavCategories,
  admin: adminNavCategories
};

function getSidebarIcon(icon) {
  switch (icon) {
    case "dashboard":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    case "users":
    case "students":
    case "manage-users":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "courses":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case "problems":
    case "problem-bank":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 6 22 12 16 18" />
          <polyline points="8 18 2 12 8 6" />
        </svg>
      );
    case "exam":
    case "test":
    case "mst":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M9 15l2 2 4-4" />
        </svg>
      );
    case "add-user":
    case "add-student":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="16" y1="11" x2="22" y2="11" />
        </svg>
      );
    case "analytics":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case "account":
    case "settings":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
}

function isItemActive(pathname, search, target) {
  const [targetPath, targetQuery] = target.split("?");
  if (targetQuery) {
    return pathname === targetPath && search.includes(targetQuery);
  }
  if (targetPath === "/admin/students") {
    if (pathname.startsWith("/admin/students") || pathname.startsWith("/admin/faculty") || pathname.startsWith("/admin/admins")) {
      return true;
    }
  }
  if (pathname === targetPath) {
    return !search || !search.includes("tab=");
  }
  return pathname.startsWith(`${targetPath}/`);
}

export function PlatformLayout({
  role = "student",
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  children,
  sidebarNote,
  showQuickActions
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get("tab") || "overview";

  const isDashboardOverviewActive = location.pathname === "/admin/dashboard" && activeTab === "overview";
  const isDashboardAnalyticsActive = location.pathname === "/admin/dashboard" && activeTab === "analytics";
  const isUsersActive = location.pathname.startsWith("/admin/students");
  const isCoursesActive = location.pathname.startsWith("/admin/courses");
  const isProblemsActive = location.pathname.startsWith("/admin/problems");
  const isExamsActive = location.pathname.startsWith("/admin/exams");

  const navigate = useNavigate();
  const categories = navCategoriesByRole[role] ?? [];

  const session =
    role === "admin"
      ? getAdminSession()
      : role === "faculty"
        ? getFacultySession()
        : getStudentSession();
  const user = session?.user;

  useEffect(() => {
    setIsSidebarOpen(false);
    const items = categories.flatMap((c) => c.items);
    const activeItem = [...items]
      .sort((a, b) => b.to.length - a.to.length)
      .find((item) => {
        return isItemActive(location.pathname, location.search, item.to);
      });

    const activeLabel = activeItem ? activeItem.label : title;

    if (activeLabel) {
      document.title = `Codexa: ${activeLabel}`;
    } else {
      document.title = "Codexa";
    }
  }, [location.pathname, location.search, categories, title]);

  const handleLogout = () => {
    if (role === "student") {
      clearStudentSession();
    } else if (role === "faculty") {
      clearFacultySession();
    } else if (role === "admin") {
      clearAdminSession();
    }
    navigate("/login");
  };

  return (
    <main className={`platform-page ${role}-platform-page`}>
      {/* Mobile Header Bar */}
      <div className="platform-mobile-header">
        <button
          type="button"
          className="platform-mobile-menu-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Link className="platform-mobile-brand" to="/">
          <span className="platform-brand-mark" style={{ display: "flex", alignItems: "center", marginRight: "0.25rem" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" style={{ display: "inline-block", verticalAlign: "middle" }}>
              <defs>
                <linearGradient id="codexa-grad-pl-mob" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <path 
                d="M16.5 5.5 L12 2.9 L4 7.5 L4 16.5 L12 21.1 L16.5 18.5" 
                fill="none" 
                stroke="url(#codexa-grad-pl-mob)" 
                strokeWidth="3.6" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M8.5 9.5 L6 12 L8.5 14.5 M15.5 9.5 L18 12 L15.5 14.5 M13.5 8 L10.5 16" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <strong>codexa</strong>
        </Link>
        <ThemeToggle inline={true} />
      </div>

      {isSidebarOpen && (
        <div className="platform-sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`platform-sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', paddingRight: '0.25rem', flexShrink: 0 }}>
          <Link className="platform-brand" to="/" style={{ margin: 0 }}>
            <span className="platform-brand-mark" style={{ display: "flex", alignItems: "center" }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34" style={{ display: "inline-block", verticalAlign: "middle" }}>
                <defs>
                  <linearGradient id="codexa-grad-pl" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <path 
                  d="M16.5 5.5 L12 2.9 L4 7.5 L4 16.5 L12 21.1 L16.5 18.5" 
                  fill="none" 
                  stroke="url(#codexa-grad-pl)" 
                  strokeWidth="3.6" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                <path 
                  d="M8.5 9.5 L6 12 L8.5 14.5 M15.5 9.5 L18 12 L15.5 14.5 M13.5 8 L10.5 16" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <strong>codexa</strong>
          </Link>
          <ThemeToggle inline={true} />
        </div>

        <nav className="platform-nav" aria-label={`${role} navigation`}>
          {categories.map((category) => (
            <div key={category.title} style={{ display: 'contents' }}>
              <div className="platform-nav-category-title">{category.title}</div>
              {category.items.map((item) => (
                <Link
                  className={`platform-nav-item ${isItemActive(location.pathname, location.search, item.to) ? "active" : ""}`}
                  key={item.to + item.label}
                  to={item.to}
                >
                  {getSidebarIcon(item.icon)}
                  {item.label}
                </Link>
              ))}
            </div>
          ))}

          <button
            onClick={handleLogout}
            className="platform-nav-item platform-logout-btn"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </nav>

        <div className="sidebar-profile-card">
          <div className="sidebar-profile-avatar">
            {(() => {
              const name = user?.full_name || user?.fullName || user?.name || (user?.email ? user.email.split("@")[0].replace(/[._-]/g, " ").replace(/\d+/g, "").trim() : "");
              if (name) {
                const words = name.split(" ").filter(Boolean);
                if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
                return name.slice(0, 2).toUpperCase();
              }
              return role === "admin" ? "AD" : role === "faculty" ? "FC" : "ST";
            })()}
          </div>
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">
              {(() => {
                if (user?.full_name && user.full_name.trim() && user.full_name.toLowerCase() !== "student" && user.full_name.toLowerCase() !== "admin") {
                  return user.full_name.trim();
                }
                if (user?.fullName && user.fullName.trim()) return user.fullName.trim();
                if (user?.name && user.name.trim()) return user.name.trim();
                if (user?.email) {
                  const raw = user.email.split("@")[0].replace(/[._-]/g, " ").replace(/\d+/g, "").trim();
                  if (raw) return raw.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                }
                return role === "admin" ? "Platform Administrator" : role === "faculty" ? "Faculty Member" : "Student";
              })()}
            </span>
            <span className="sidebar-profile-role">
              {role === "admin"
                ? "Platform Administrator"
                : role === "faculty"
                  ? "Faculty Instructor"
                  : "Student"}
            </span>
          </div>
        </div>
      </aside>

      <section className="platform-main">
        {(title || subtitle || actions) && (
          <header className="platform-hero">
            <div className="platform-hero-copy">
              {eyebrow ? <p className="platform-eyebrow" style={{ display: "none" }}>{eyebrow}</p> : null}
              {title && <h1>{title}</h1>}
              {subtitle ? <p className="platform-hero-text">{subtitle}</p> : null}
            </div>
            <div className="platform-hero-side">
              {role === "admin" && <span className="admin-access-pill-sub">ADMIN ACCESS</span>}
              {meta ? <div className="platform-meta-chip">{meta}</div> : null}
              {actions ? <div className="platform-hero-actions">{actions}</div> : null}
            </div>
          </header>
        )}

        <div className="platform-content">
          {children}
        </div>
      </section>
    </main>
  );
}

export function PlatformSection({ title, label, actions, children }) {
  return (
    <section className="platform-section-card">
      <div className="platform-section-head">
        <div>
          {label ? <p className="platform-section-label">{label}</p> : null}
          <h2>{title}</h2>
        </div>
        {actions ? <div className="platform-section-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function PlatformStats({ items }) {
  return (
    <div className="platform-stats-grid">
      {items.map((item) => {
        const valStr = String(item.value ?? "");
        const isLongOrText = valStr.length > 8 || /[a-zA-Z]/.test(valStr);
        return (
          <article className="platform-stat-card" key={item.label}>
            <span>{item.label}</span>
            <strong className={isLongOrText ? "long-value" : ""}>{item.value}</strong>
            {item.note ? <p>{item.note}</p> : null}
          </article>
        );
      })}
    </div>
  );
}
