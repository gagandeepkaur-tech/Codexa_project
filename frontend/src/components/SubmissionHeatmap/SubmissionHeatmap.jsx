import "./SubmissionHeatmap.css";
import { useState, useEffect, useMemo } from "react";
import { getAuthHeaders } from "../../utils/session";
import { apiRequest } from "../../utils/api";

export default function SubmissionHeatmap({ studentId, session }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredDay, setHoveredDay] = useState(null);

  const targetStudentId = studentId || session?.user?.id;
  const token = session?.token;

  useEffect(() => {
    let isMounted = true;

    async function fetchSubmissions() {
      if (!targetStudentId || !token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest(`/submissions/student/${targetStudentId}`, {}, token);
        if (isMounted) {
          setSubmissions(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Submission history notice:", err.message);
          setSubmissions([]);
          setLoading(false);
        }
      }
    }

    fetchSubmissions();

    return () => {
      isMounted = false;
    };
  }, [targetStudentId, token]);

  // Compute daily map
  const dailyMap = useMemo(() => {
    const map = new Map();
    submissions.forEach((sub) => {
      if (!sub.submitted_at) return;
      const dateStr = new Date(sub.submitted_at).toISOString().split("T")[0];
      map.set(dateStr, (map.get(dateStr) || 0) + 1);
    });
    return map;
  }, [submissions]);

  // Build 12 distinct month blocks & stats
  const {
    monthBlocks,
    totalYearSubmissions,
    totalActiveDays,
    maxStreak,
    currentStreak
  } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const monthBlocks = [];
    let totalYearSubmissions = 0;

    // 12 months going back 11 months from today
    for (let i = 11; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m < 0) {
        m += 12;
        y -= 1;
      }

      const monthName = new Date(y, m, 1).toLocaleDateString("en-US", { month: "short" });
      const daysInMonth = new Date(y, m + 1, 0).getDate();

      const firstDayObj = new Date(y, m, 1);
      const startDayOfWeek = firstDayObj.getDay(); // 0 = Sun

      const weeksInMonth = [];
      let currentWeek = [];

      // Leading padding for month start day
      for (let pad = 0; pad < startDayOfWeek; pad++) {
        currentWeek.push({ isPadding: true });
      }

      for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        const dateObj = new Date(y, m, dayNum);
        const dateStr = dateObj.toISOString().split("T")[0];
        const count = dailyMap.get(dateStr) || 0;

        if (dateObj <= today) {
          totalYearSubmissions += count;
        }

        currentWeek.push({
          isPadding: false,
          dateStr,
          date: dateObj,
          count,
          isFuture: dateObj > today
        });

        if (currentWeek.length === 7) {
          weeksInMonth.push(currentWeek);
          currentWeek = [];
        }
      }

      // Trailing padding to finish week
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push({ isPadding: true });
        }
        weeksInMonth.push(currentWeek);
      }

      monthBlocks.push({
        year: y,
        month: m,
        name: monthName,
        weeks: weeksInMonth
      });
    }

    // Active days count
    let totalActiveDays = 0;
    dailyMap.forEach((count, dateStr) => {
      const d = new Date(dateStr);
      if (d <= today && count > 0) {
        totalActiveDays++;
      }
    });

    // Streak calculations
    let maxStreak = 0;
    let tempStreak = 0;
    let currentStreak = 0;

    let scanDate = new Date(today);
    while (true) {
      const ds = scanDate.toISOString().split("T")[0];
      const c = dailyMap.get(ds) || 0;
      if (c > 0) {
        currentStreak++;
        scanDate.setDate(scanDate.getDate() - 1);
      } else {
        if (currentStreak === 0 && scanDate.getTime() === today.getTime()) {
          scanDate.setDate(scanDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 1);

    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split("T")[0];
      const c = dailyMap.get(ds) || 0;
      if (c > 0) {
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    return {
      monthBlocks,
      totalYearSubmissions,
      totalActiveDays,
      maxStreak,
      currentStreak
    };
  }, [dailyMap]);

  function getSquareColor(count, isFuture) {
    if (isFuture) return "rgba(255, 255, 255, 0.02)";
    if (count === 0) return "rgba(255, 255, 255, 0.07)";
    if (count === 1) return "#0e4429";
    if (count <= 3) return "#006d32";
    if (count <= 6) return "#26a641";
    return "#39d353";
  }

  function formatTooltip(day) {
    if (!day || day.isPadding) return "";
    const dateFormatted = day.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    if (day.count === 0) return `No submissions on ${dateFormatted}`;
    if (day.count === 1) return `1 submission on ${dateFormatted}`;
    return `${day.count} submissions on ${dateFormatted}`;
  }

  return (
    <div className="lc-heatmap-card">


      {/* Eyebrow & Section Title inside Card */}
      <p className="lc-heatmap-eyebrow">Activity</p>
      <h2 className="lc-heatmap-main-title">1-Year Submission Calendar</h2>

      {/* Header Info Bar */}
      <div className="lc-heatmap-header">
        <div className="lc-heatmap-title-group">
          <span className="lc-heatmap-title-count">{totalYearSubmissions}</span>
          <span className="lc-heatmap-title-text">submissions in the past one year</span>
          <span className="lc-heatmap-info-icon" title="Includes practice problem and course submissions over the past 365 days">i</span>
        </div>

        <div className="lc-heatmap-stats-group">
          <div className="lc-heatmap-stat-item">
            Total active days: <strong>{totalActiveDays}</strong>
          </div>
          <div className="lc-heatmap-stat-item">
            Max streak: <strong>{maxStreak}</strong>
          </div>
          {currentStreak > 0 && (
            <div className="lc-heatmap-stat-item">
              Current streak: <strong style={{ color: "#22c55e" }}>{currentStreak}🔥</strong>
            </div>
          )}
          <select className="lc-heatmap-year-select" defaultValue="current" aria-label="Filter submission activity by year">
            <option value="current">Current ∨</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>

      {/* Heatmap Grid Grouped by Months */}
      {loading ? (
        <p style={{ color: "#94a3b8", fontSize: "13px", margin: "16px 0" }}>Loading activity heatmap...</p>
      ) : error ? (
        <p style={{ color: "#ef4444", fontSize: "13px", margin: "16px 0" }}>{error}</p>
      ) : (
        <div className="lc-heatmap-scroll-area">
          <div className="lc-heatmap-months-wrapper">
            {monthBlocks.map((monthBlock, mIdx) => (
              <div key={mIdx} className="lc-heatmap-month-block">
                <span className="lc-heatmap-month-name">{monthBlock.name}</span>
                <div className="lc-heatmap-month-weeks">
                  {monthBlock.weeks.map((week, wIdx) => (
                    <div key={wIdx} className="lc-heatmap-week-col">
                      {week.map((day, dIdx) =>
                        day.isPadding ? (
                          <div key={dIdx} className="lc-heatmap-day-square padding" />
                        ) : (
                          <div
                            key={dIdx}
                            className="lc-heatmap-day-square"
                            style={{ backgroundColor: getSquareColor(day.count, day.isFuture) }}
                            onMouseEnter={() => setHoveredDay(day)}
                            onMouseLeave={() => setHoveredDay(null)}
                          >
                            {hoveredDay && hoveredDay.dateStr === day.dateStr && (
                              <div className="lc-heatmap-tooltip">
                                {formatTooltip(day)}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend Footer */}
      <div className="lc-heatmap-legend">
        <span>Less</span>
        <span className="lc-heatmap-legend-square" style={{ backgroundColor: "rgba(255, 255, 255, 0.07)" }}></span>
        <span className="lc-heatmap-legend-square" style={{ backgroundColor: "#0e4429" }}></span>
        <span className="lc-heatmap-legend-square" style={{ backgroundColor: "#006d32" }}></span>
        <span className="lc-heatmap-legend-square" style={{ backgroundColor: "#26a641" }}></span>
        <span className="lc-heatmap-legend-square" style={{ backgroundColor: "#39d353" }}></span>
        <span>More</span>
      </div>
    </div>
  );
}
