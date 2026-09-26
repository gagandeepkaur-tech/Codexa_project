import "./execution.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAuthHeaders, getStudentSession, getFacultySession, getAdminSession } from "../../utils/session";
import { useTheme } from "../../components/ThemeProvider";
import Prism from "prismjs";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-python";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-tomorrow.css";
const apiBaseUrl = import.meta.env.VITE_API_URL || "https://codexa-project.onrender.com/api";
const initialEditor = {
  language: "python",
  sourceCode: ""
};

function getDefaultCodeTemplate(language, problemTitle) {
  const normLang = (language || "").toLowerCase();
  const title = (problemTitle || "").trim();

  if (title === "Sum of Two Numbers") {
    if (normLang === "python") {
      return `class Solution:\n    def solve(self, a: int, b: int) -> int:\n        # Write your code here\n        return a + b\n`;
    }
    if (normLang === "cpp") {
      return `class Solution {\npublic:\n    int solve(int a, int b) {\n        // Write your code here\n        return a + b;\n    }\n};`;
    }
    if (normLang === "java") {
      return `class Solution {\n    public int solve(int a, int b) {\n        // Write your code here\n        return a + b;\n    }\n}`;
    }
    if (normLang === "javascript") {
      return `class Solution {\n    solve(a, b) {\n        // Write your code here\n        return a + b;\n    }\n}`;
    }
  }

  if (title === "Factorial of a Number") {
    if (normLang === "python") {
      return `class Solution:\n    def solve(self, n: int) -> int:\n        # Write your code here\n        \n`;
    }
    if (normLang === "cpp") {
      return `class Solution {\npublic:\n    int solve(int n) {\n        // Write your code here\n        \n    }\n};`;
    }
    if (normLang === "java") {
      return `class Solution {\n    public int solve(int n) {\n        // Write your code here\n        \n    }\n}`;
    }
    if (normLang === "javascript") {
      return `class Solution {\n    solve(n) {\n        // Write your code here\n        \n    }\n}`;
    }
  }

  if (title === "Nth Fibonacci Number") {
    if (normLang === "python") {
      return `class Solution:\n    def solve(self, n: int) -> int:\n        # Write your code here\n        \n`;
    }
    if (normLang === "cpp") {
      return `class Solution {\npublic:\n    int solve(int n) {\n        // Write your code here\n        \n    }\n};`;
    }
    if (normLang === "java") {
      return `class Solution {\n    public int solve(int n) {\n        // Write your code here\n        \n    }\n}`;
    }
    if (normLang === "javascript") {
      return `class Solution {\n    solve(n) {\n        // Write your code here\n        \n    }\n}`;
    }
  }

  if (title === "Palindrome String Check") {
    if (normLang === "python") {
      return `class Solution:\n    def solve(self, s: str) -> bool:\n        # Write your code here\n        \n`;
    }
    if (normLang === "cpp") {
      return `class Solution {\npublic:\n    bool solve(string s) {\n        // Write your code here\n        \n    }\n};`;
    }
    if (normLang === "java") {
      return `class Solution {\n    public boolean solve(String s) {\n        // Write your code here\n        \n    }\n}`;
    }
    if (normLang === "javascript") {
      return `class Solution {\n    solve(s) {\n        // Write your code here\n        \n    }\n}`;
    }
  }

  if (title === "Find the Missing Number") {
    if (normLang === "python") {
      return `from typing import List\n\nclass Solution:\n    def solve(self, nums: List[int]) -> int:\n        # Write your code here\n        \n`;
    }
    if (normLang === "cpp") {
      return `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Write your code here\n        \n    }\n};`;
    }
    if (normLang === "java") {
      return `class Solution {\n    public int solve(int[] nums) {\n        // Write your code here\n        \n    }\n}`;
    }
    if (normLang === "javascript") {
      return `class Solution {\n    solve(nums) {\n        // Write your code here\n        \n    }\n}`;
    }
  }

  if (title === "Valid Parentheses") {
    if (normLang === "python") {
      return `class Solution:\n    def isValid(self, s: str) -> bool:\n        # Write your code here\n        \n`;
    }
    if (normLang === "cpp") {
      return `class Solution {\npublic:\n    bool isValid(string s) {\n        // Write your code here\n        \n    }\n};`;
    }
    if (normLang === "java") {
      return `class Solution {\n    public boolean isValid(String s) {\n        // Write your code here\n        \n    }\n}`;
    }
    if (normLang === "javascript") {
      return `class Solution {\n    isValid(s) {\n        // Write your code here\n        \n    }\n}`;
    }
  }

  if (title === "Two Sum") {
    if (normLang === "python") {
      return `from typing import List\n\nclass Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        # Write your code here\n        \n`;
    }
    if (normLang === "cpp") {
      return `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n        \n    }\n};`;
    }
    if (normLang === "java") {
      return `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your code here\n        \n    }\n}`;
    }
    if (normLang === "javascript") {
      return `class Solution {\n    twoSum(nums, target) {\n        // Write your code here\n        \n    }\n}`;
    }
  }

  if (title === "Longest Substring Without Repeating Characters") {
    if (normLang === "python") {
      return `class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        # Write your code here\n        \n`;
    }
    if (normLang === "cpp") {
      return `class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Write your code here\n        \n    }\n};`;
    }
    if (normLang === "java") {
      return `class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Write your code here\n        \n    }\n}`;
    }
    if (normLang === "javascript") {
      return `class Solution {\n    lengthOfLongestSubstring(s) {\n        // Write your code here\n        \n    }\n}`;
    }
  }

  if (normLang === "python") {
    return `class Solution:\n    def solve(self):\n        pass\n`;
  }
  if (normLang === "cpp") {
    return `class Solution {\npublic:\n    void solve() {\n        \n    }\n};`;
  }
  if (normLang === "java") {
    return `class Solution {\n    public void solve() {\n        \n    }\n}`;
  }
  if (normLang === "javascript") {
    return `class Solution {\n    solve() {\n        \n    }\n}`;
  }

  return "";
}

const editorDraftStorageKey = "coding_platform_problem_drafts";
const problemTimerStorageKey = "coding_platform_problem_timers";

const initialTimerState = {
  isRunning: false,
  startedAt: 0,
  elapsedBeforePause: 0
};
const initialToastState = {
  visible: false,
  type: "success",
  title: "",
  message: ""
};
const pairedCharacters = {
  "(": ")",
  "{": "}",
  "[": "]",
  '"': '"',
  "'": "'"
};
const languageSuggestions = {
  python: [
    { label: "def", insertText: "def function_name():\n    " },
    { label: "for", insertText: "for    in    :\n    " },
    { label: "if", insertText: "if condition:\n    " },
    { label: "elif", insertText: "elif condition:\n    " },
    { label: "else", insertText: "else:\n    " },
    { label: "while", insertText: "while condition:\n    " },
    { label: "class", insertText: "class Solution:\n    def __init__(self):\n        " },
    { label: "return", insertText: "return " },
    { label: "print", insertText: "print()" },
    { label: "range", insertText: "range()" }
  ],
  javascript: [
    { label: "function", insertText: "function name() {\n  \n}" },
    { label: "const", insertText: "const " },
    { label: "let", insertText: "let " },
    { label: "for", insertText: "for (let i = 0; i < length; i += 1) {\n  \n}" },
    { label: "if", insertText: "if () {\n  \n}" },
    { label: "else", insertText: "else {\n  \n}" },
    { label: "while", insertText: "while () {\n  \n}" },
    { label: "return", insertText: "return " },
    { label: "console", insertText: "console.log();" },
    { label: "class", insertText: "class Solution {\n  constructor() {\n    \n  }\n}" }
  ],
  java: [
    { label: "main", insertText: "public class Main {\n    public static void main(String[] args) {\n        \n    }\n}" },
    { label: "for", insertText: "for (int i = 0; i < n; i++) {\n    \n}" },
    { label: "if", insertText: "if () {\n    \n}" },
    { label: "else", insertText: "else {\n    \n}" },
    { label: "while", insertText: "while () {\n    \n}" },
    { label: "return", insertText: "return " },
    { label: "System", insertText: "System.out.println();" },
    { label: "class", insertText: "class Solution {\n    \n}" }
  ],
  cpp: [
    { label: "include", insertText: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}" },
    { label: "for", insertText: "for (int i = 0; i < n; i++) {\n    \n}" },
    { label: "if", insertText: "if () {\n    \n}" },
    { label: "else", insertText: "else {\n    \n}" },
    { label: "while", insertText: "while () {\n    \n}" },
    { label: "return", insertText: "return " },
    { label: "cout", insertText: "cout <<  << endl;" },
    { label: "vector", insertText: "vector<int> " }
  ]
};
// const syntaxKeywords = {
//   python: [
//     "and",
//     "as",
//     "break",
//     "class",
//     "continue",
//     "def",
//     "elif",
//     "else",
//     "False",
//     "for",
//     "from",
//     "if",
//     "import",
//     "in",
//     "is",
//     "lambda",
//     "None",
//     "not",
//     "or",
//     "pass",
//     "print",
//     "return",
//     "True",
//     "while"
//   ],
//   javascript: [
//     "break",
//     "case",
//     "catch",
//     "class",
//     "const",
//     "continue",
//     "else",
//     "export",
//     "for",
//     "function",
//     "if",
//     "import",
//     "let",
//     "new",
//     "return",
//     "switch",
//     "try",
//     "while"
//   ],
//   java: [
//     "class",
//     "else",
//     "for",
//     "if",
//     "import",
//     "int",
//     "new",
//     "private",
//     "public",
//     "return",
//     "static",
//     "String",
//     "void",
//     "while"
//   ],
//   cpp: [
//     "auto",
//     "class",
//     "const",
//     "cout",
//     "else",
//     "for",
//     "if",
//     "include",
//     "int",
//     "return",
//     "string",
//     "using",
//     "vector",
//     "while"
//   ]
// };

// function escapeHtml(value) {
//   return value
//     .replaceAll("&", "&amp;")
//     .replaceAll("<", "&lt;")
//     .replaceAll(">", "&gt;");
// }

function readStoredObject(storageKey) {
  try {
    const storedValue = localStorage.getItem(storageKey);

    if (!storedValue) {
      return {};
    }

    const parsedValue = JSON.parse(storedValue);
    return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
  } catch (_error) {
    return {};
  }
}

function getSolvedTimeStorageKey(problemId) {
  return `coding_platform_problem_solved_${problemId}`;
}

// function highlightCode(sourceCode, language) {
//   const source = sourceCode || "";
//   const stringPattern = /("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/g;
//   const numberPattern = /\b\d+(\.\d+)?\b/g;
//   const commentPattern =
//     language === "python" ? /#[^\n]*/g : /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
//   const keywordPattern = new RegExp(`\\b(${(syntaxKeywords[language] || []).join("|")})\\b`, "g");
//   const tokenPatterns = [
//     { pattern: commentPattern, className: "token-comment" },
//     { pattern: stringPattern, className: "token-string" },
//     { pattern: keywordPattern, className: "token-keyword" },
//     { pattern: numberPattern, className: "token-number" }
//   ];
//   const matches = [];

//   tokenPatterns.forEach(({ pattern, className }) => {
//     for (const match of source.matchAll(pattern)) {
//       if (match.index === undefined) {
//         continue;
//       }

//       matches.push({
//         start: match.index,
//         end: match.index + match[0].length,
//         className,
//         value: match[0]
//       });
//     }
//   });

//   matches.sort((firstMatch, secondMatch) => {
//     if (firstMatch.start !== secondMatch.start) {
//       return firstMatch.start - secondMatch.start;
//     }

//     return secondMatch.end - firstMatch.end;
//   });

//   const filteredMatches = [];
//   let lastTokenEnd = -1;

//   matches.forEach((match) => {
//     if (match.start < lastTokenEnd) {
//       return;
//     }

//     filteredMatches.push(match);
//     lastTokenEnd = match.end;
//   });

//   let highlightedCode = "";
//   let lastIndex = 0;

//   filteredMatches.forEach((match) => {
//     highlightedCode += escapeHtml(source.slice(lastIndex, match.start));
//     highlightedCode += `<span class="${match.className}">${escapeHtml(match.value)}</span>`;
//     lastIndex = match.end;
//   });

//   highlightedCode += escapeHtml(source.slice(lastIndex));
//   return highlightedCode;
// }
function highlightCode(sourceCode, language) {
  const source = sourceCode || "";

  // const grammarMap = {
  //   cpp: Prism.languages.cpp,
  //   java: Prism.languages.java,
  //   python: Prism.languages.python,
  //   javascript: Prism.languages.javascript
  // };
  // const grammar = grammarMap[language];
  const grammar = Prism.languages[language];

  // if (!grammar) {
  //   return source
  //     .replaceAll("&", "&amp;")
  //     .replaceAll("<", "&lt;")
  //     .replaceAll(">", "&gt;");
  // }
  if (!grammar) {
    return Prism.util.encode(source);
  }
  return Prism.highlight(source, grammar, language);
}
function getWordStart(value, cursorPosition) {
  let index = cursorPosition;

  while (index > 0 && /[A-Za-z_]/.test(value[index - 1])) {
    index -= 1;
  }

  return index;
}

function buildSuggestions(sourceCode, cursorPosition, language) {
  const wordStart = getWordStart(sourceCode, cursorPosition);
  const currentToken = sourceCode.slice(wordStart, cursorPosition);

  if (!currentToken.trim()) {
    return {
      currentToken: "",
      wordStart,
      matches: []
    };
  }

  const normalizedToken = currentToken.toLowerCase();
  const matches = (languageSuggestions[language] || []).filter((entry) =>
    entry.label.toLowerCase().startsWith(normalizedToken)
  );

  return {
    currentToken,
    wordStart,
    matches
  };
}

function getCaretCoordinates(textarea, cursorPosition) {
  if (!textarea) {
    return { top: 16, left: 16 };
  }

  const computedStyle = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordBreak = "break-word";
  mirror.style.overflowWrap = "break-word";
  mirror.style.boxSizing = "border-box";
  mirror.style.left = "-9999px";
  mirror.style.top = "0";
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.fontFamily = computedStyle.fontFamily;
  mirror.style.fontSize = computedStyle.fontSize;
  mirror.style.fontWeight = computedStyle.fontWeight;
  mirror.style.letterSpacing = computedStyle.letterSpacing;
  mirror.style.lineHeight = computedStyle.lineHeight;
  mirror.style.padding = computedStyle.padding;
  mirror.style.border = computedStyle.border;

  mirror.textContent = textarea.value.slice(0, cursorPosition);

  const marker = document.createElement("span");
  marker.textContent = textarea.value[cursorPosition] || " ";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const coordinates = {
    top: marker.offsetTop - textarea.scrollTop + marker.offsetHeight + 8,
    left: marker.offsetLeft - textarea.scrollLeft
  };

  document.body.removeChild(mirror);
  return coordinates;
}

function formatExecutionMessage(result, successMessage) {
  if (!result) {
    return successMessage;
  }

  if (result.status === "accepted") {
    return successMessage;
  }

  return result.verdictLabel || result.status.replaceAll("_", " ");
}

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const now = new Date();
  const diffMs = now - d;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default function StudentProblemDetails() {
  const { problemId } = useParams();
  const { theme, toggleTheme } = useTheme();
  const isDarkTheme = theme === "dark";
  const isFaculty = window.location.pathname.startsWith("/faculty");
  const isAdmin = window.location.pathname.startsWith("/admin");
  const userRole = isFaculty ? "faculty" : isAdmin ? "admin" : "student";
  const session = isFaculty ? getFacultySession() : isAdmin ? getAdminSession() : getStudentSession();
  const student = session?.user;
  const buttonClass = userRole === "admin" ? "admin-button" : "student-button";
  const backToProblemsPath = userRole === "admin" ? "/admin/problems" : userRole === "faculty" ? "/faculty/problems" : "/student/problems";
  const backToDashboardPath = `/${userRole}/dashboard`;
  const editorRef = useRef(null);
  const highlightRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const [problem, setProblem] = useState(null);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const [consoleTab, setConsoleTab] = useState("results");
  const [editor, setEditor] = useState(initialEditor);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [latestExecutionDetails, setLatestExecutionDetails] = useState("");
  const [latestSubmitResults, setLatestSubmitResults] = useState([]);
  const [latestSubmitExecution, setLatestSubmitExecution] = useState(null);
  const [runMessage, setRunMessage] = useState("");
  const [runResults, setRunResults] = useState(null);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [historyStatus, setHistoryStatus] = useState({
    loading: Boolean(student?.id),
    error: ""
  });
  const [problemOrder, setProblemOrder] = useState([]);
  const [suggestionState, setSuggestionState] = useState({
    visible: false,
    suggestions: [],
    selectedIndex: 0,
    wordStart: 0,
    cursorPosition: 0,
    popupTop: 18,
    popupLeft: 18
  });
  const [editorFontSize, setEditorFontSize] = useState(15);
  const [leftActiveTab, setLeftActiveTab] = useState("description");
  const [activeTestCaseIndex, setActiveTestCaseIndex] = useState(0);
  const [activeRunCaseIndex, setActiveRunCaseIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [workspaceTab, setWorkspaceTab] = useState("description"); // "description" or "code"

  function updateCursorPos(textarea) {
    if (!textarea) return;
    const textBeforeCursor = textarea.value.slice(0, textarea.selectionStart);
    const lines = textBeforeCursor.split("\n");
    setCursorPos({
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    });
  }
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [isEditorMaximized, setIsEditorMaximized] = useState(false);
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerState, setTimerState] = useState(initialTimerState);
  const [showRunDetails, setShowRunDetails] = useState(false);
  const [showSubmissionDetails, setShowSubmissionDetails] = useState(false);
  const [selectedSubmissionModal, setSelectedSubmissionModal] = useState(null);
  const [toast, setToast] = useState(initialToastState);
  const latestSubmission = submissionHistory[0] ?? null;
  const isSolved = useMemo(() => {
    return submissionHistory.some((submission) => submission.status === "accepted");
  }, [submissionHistory]);

  function handleFormatCode() {
    if (!editor.sourceCode) return;
    const lines = editor.sourceCode.split("\n");
    let indentLevel = 0;
    const formattedLines = lines.map(line => {
      let trimmed = line.trim();
      if (trimmed.startsWith("}") || trimmed.startsWith("]")) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      const indentedLine = "  ".repeat(indentLevel) + trimmed;
      if (trimmed.endsWith("{") || trimmed.endsWith("[") || (trimmed.endsWith(":") && editor.language === "python")) {
        indentLevel += 1;
      }
      return indentedLine;
    });
    setEditor(prev => ({
      ...prev,
      sourceCode: formattedLines.join("\n")
    }));
    showToast("success", "Formatted", "Code formatted successfully.");
  }

  function handleSaveCode() {
    if (!problemId) return;
    const savedDrafts = readStoredObject(editorDraftStorageKey);
    savedDrafts[problemId] = {
      language: editor.language,
      sourceCode: editor.sourceCode
    };
    localStorage.setItem(editorDraftStorageKey, JSON.stringify(savedDrafts));
    showToast("success", "Saved", "Code saved to local draft successfully.");
  }

  function handleShowTemplates() {
    setLeftActiveTab("solutions");
    showToast("info", "Solutions Panel", "Switched to solutions templates pane.");
  }

  function handleToggleMaximize() {
    setIsEditorMaximized(prev => !prev);
    setIsEditorCollapsed(false);
  }

  function handleToggleCollapse() {
    setIsEditorCollapsed(prev => !prev);
    setIsEditorMaximized(false);
  }

  function showToast(type, title, message) {
    setToast({
      visible: true,
      type,
      title,
      message
    });
  }

  useEffect(() => {
    setIsDraftReady(false);

    const savedDrafts = readStoredObject(editorDraftStorageKey);
    const savedDraft = savedDrafts[problemId];

    if (!savedDraft) {
      setEditor(initialEditor);
      setIsDraftReady(true);
      return;
    }

    setEditor({
      language: savedDraft.language || "python",
      sourceCode: savedDraft.sourceCode || ""
    });
    setIsDraftReady(true);
  }, [problemId]);

  useEffect(() => {
    if (problem?.title) {
      document.title = `Codexa: ${problem.title}`;
    } else {
      document.title = "Codexa: Loading Challenge";
    }
  }, [problem]);

  useEffect(() => {
    if (!problemId || !isDraftReady) {
      return;
    }

    const savedDrafts = readStoredObject(editorDraftStorageKey);
    savedDrafts[problemId] = {
      language: editor.language,
      sourceCode: editor.sourceCode
    };
    localStorage.setItem(editorDraftStorageKey, JSON.stringify(savedDrafts));
  }, [editor.language, editor.sourceCode, isDraftReady, problemId]);

  useEffect(() => {
    let isMounted = true;

    async function loadProblem() {
      try {
        const response = await fetch(`${apiBaseUrl}/problems/${problemId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load coding question.");
        }

        if (isMounted) {
          setProblem(data);
          setStatus({
            loading: false,
            error: ""
          });

          const savedDrafts = readStoredObject(editorDraftStorageKey);
          const savedDraft = savedDrafts[problemId];
          if (!savedDraft || !savedDraft.sourceCode) {
            const initialLang = savedDraft?.language || initialEditor.language;
            setEditor({
              language: initialLang,
              sourceCode: getDefaultCodeTemplate(initialLang, data.title)
            });
          }
        }
      } catch (error) {
        if (isMounted) {
          setStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    loadProblem();

    return () => {
      isMounted = false;
    };
  }, [problemId]);

  useEffect(() => {
    let isMounted = true;

    async function loadProblemOrder() {
      try {
        const response = await fetch(`${apiBaseUrl}/problems`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load coding questions.");
        }

        if (isMounted) {
          setProblemOrder(data);
        }
      } catch (_error) {
        if (isMounted) {
          setProblemOrder([]);
        }
      }
    }

    loadProblemOrder();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSubmissionHistory() {
      if (!student?.id || !session?.token) {
        setHistoryStatus({
          loading: false,
          error: student?.id ? "Log in again to view submission history." : ""
        });
        return;
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/submissions/student/${student.id}?problemId=${problemId}`,
          {
            headers: {
              ...getAuthHeaders(session.token)
            }
          }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load submission history.");
        }

        if (isMounted) {
          setSubmissionHistory(data);
          setHistoryStatus({
            loading: false,
            error: ""
          });
        }
      } catch (error) {
        if (isMounted) {
          setHistoryStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    loadSubmissionHistory();

    return () => {
      isMounted = false;
    };
  }, [problemId, session?.token, student?.id]);

  useEffect(() => {
    setLatestExecutionDetails(latestSubmission?.compiler_output || "");
  }, [latestSubmission]);

  useEffect(() => {
    setRunResults(null);
    setRunMessage("");
    setSubmissionMessage("");
    setLatestSubmitResults([]);
    setLatestSubmitExecution(null);
    setSubmissionHistory([]);
    setHistoryStatus({
      loading: Boolean(student?.id),
      error: ""
    });
    setShowRunDetails(false);
    setShowSubmissionDetails(false);
  }, [problemId, student?.id]);

  useEffect(() => {
    if (!toast.visible) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToast((currentToast) => ({
        ...currentToast,
        visible: false
      }));
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast.visible]);

  useEffect(() => {
    if (!problemId) {
      return;
    }

    const savedTimers = readStoredObject(problemTimerStorageKey);
    const savedTimer = savedTimers[problemId];
    const normalizedTimer =
      savedTimer && typeof savedTimer === "object"
        ? {
          isRunning: savedTimer.isRunning ?? true,
          startedAt: savedTimer.startedAt ?? (savedTimer.isRunning ? Date.now() : 0),
          elapsedBeforePause: savedTimer.elapsedBeforePause ?? 0
        }
        : {
          isRunning: true,
          startedAt: Date.now(),
          elapsedBeforePause: typeof savedTimer === "number" ? savedTimer : 0
        };

    if (!savedTimer) {
      savedTimers[problemId] = normalizedTimer;
      localStorage.setItem(problemTimerStorageKey, JSON.stringify(savedTimers));
    }

    setTimerState(normalizedTimer);
  }, [problemId]);

  useEffect(() => {
    if (!problemId) {
      return undefined;
    }

    const savedTimers = readStoredObject(problemTimerStorageKey);
    savedTimers[problemId] = timerState;
    localStorage.setItem(problemTimerStorageKey, JSON.stringify(savedTimers));

    if (!timerState.isRunning) {
      setElapsedSeconds(timerState.elapsedBeforePause);
      return undefined;
    }

    const update = () => {
      setElapsedSeconds(
        timerState.elapsedBeforePause +
        Math.max(0, Math.floor((Date.now() - timerState.startedAt) / 1000))
      );
    };

    update();
    const intervalId = window.setInterval(update, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [problemId, timerState]);

  function updateSuggestionState(sourceCode, cursorPosition, language) {
    const suggestionResult = buildSuggestions(sourceCode, cursorPosition, language);
    const caretCoordinates = getCaretCoordinates(editorRef.current, cursorPosition);

    setSuggestionState({
      visible: suggestionResult.matches.length > 0,
      suggestions: suggestionResult.matches,
      selectedIndex: 0,
      wordStart: suggestionResult.wordStart,
      cursorPosition,
      popupTop: caretCoordinates.top,
      popupLeft: caretCoordinates.left
    });
  }

  function applyEditorValue(nextSourceCode, nextSelectionStart, nextSelectionEnd = nextSelectionStart) {
    setEditor((currentEditor) => ({
      ...currentEditor,
      sourceCode: nextSourceCode
    }));

    window.requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        editorRef.current.setSelectionRange(nextSelectionStart, nextSelectionEnd);
      }
    });

    updateSuggestionState(nextSourceCode, nextSelectionStart, editor.language);
  }

  function acceptSuggestion(index = suggestionState.selectedIndex) {
    const textarea = editorRef.current;

    if (!textarea || !suggestionState.suggestions[index]) {
      return;
    }

    const selectedSuggestion = suggestionState.suggestions[index];
    let before = editor.sourceCode.slice(0, suggestionState.wordStart);
    const after = editor.sourceCode.slice(textarea.selectionStart);
    const insertText = selectedSuggestion.insertText;

    if (before.endsWith("#") && insertText.startsWith("#")) {
      before = before.slice(0, -1);
    }

    const nextSourceCode = `${before}${insertText}${after}`;
    const nextCursorPosition = before.length + insertText.length;

    applyEditorValue(nextSourceCode, nextCursorPosition);
  }

  function handleEditorChange(event) {
    const { name, value } = event.target;

    if (name === "language") {
      setEditor((currentEditor) => ({
        ...currentEditor,
        language: value,
        sourceCode: getDefaultCodeTemplate(value, problem?.title)
      }));
      setSuggestionState({
        visible: false,
        suggestions: [],
        selectedIndex: 0,
        wordStart: 0,
        cursorPosition: 0
      });
      return;
    }

    setEditor((currentEditor) => ({
      ...currentEditor,
      [name]: value
    }));

    updateSuggestionState(value, event.target.selectionStart, editor.language);
  }

  function handleResetCode() {
    if (problem) {
      setEditor((current) => ({
        ...current,
        sourceCode: getDefaultCodeTemplate(current.language, problem.title)
      }));
      showToast("info", "Reset", "Code reset to default template.");
    }
  }
  function handleEditorKeyDown(event) {
    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    const selectedText = value.slice(selectionStart, selectionEnd);
    const nextCharacter = value[selectionEnd] || "";

    if (suggestionState.visible && event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionState((current) => ({
        ...current,
        selectedIndex: (current.selectedIndex + 1) % current.suggestions.length
      }));
      return;
    }

    if (suggestionState.visible && event.key === "ArrowUp") {
      event.preventDefault();
      setSuggestionState((current) => ({
        ...current,
        selectedIndex:
          (current.selectedIndex - 1 + current.suggestions.length) % current.suggestions.length
      }));
      return;
    }

    if (suggestionState.visible && event.key === "Tab") {
      event.preventDefault();
      acceptSuggestion();
      return;
    }

    if (suggestionState.visible && event.key === "Enter") {
      setSuggestionState((current) => ({
        ...current,
        visible: false
      }));
      // Do not return early; let it fall through to run our custom Enter indentation logic
    }

    if (event.key === "Escape") {
      setSuggestionState((current) => ({
        ...current,
        visible: false
      }));
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const indentStr = "    "; // 4 spaces universally

      const actualSelectionEnd = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n" ? selectionEnd - 1 : selectionEnd;
      const startLineIndex = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const endLineIndex = value.indexOf("\n", actualSelectionEnd);
      const endLineContentEnd = endLineIndex === -1 ? value.length : endLineIndex;

      const hasNewlineInSelection = selectionStart !== selectionEnd && value.slice(selectionStart, actualSelectionEnd).includes("\n");

      if (hasNewlineInSelection || event.shiftKey) {
        const lines = value.slice(startLineIndex, endLineContentEnd).split("\n");

        let newSelectionStart = selectionStart;
        let newSelectionEnd = selectionEnd;
        let currentLineOriginalStart = startLineIndex;

        const newLines = lines.map((line, index) => {
          const isFirstLine = index === 0;
          const isLastLine = index === lines.length - 1;

          if (event.shiftKey) {
            const leadingSpaces = line.match(/^\s*/)[0];
            const removeCount = Math.min(leadingSpaces.length, indentStr.length);

            if (isFirstLine) {
              const spacesBeforeStart = Math.min(removeCount, Math.max(0, selectionStart - currentLineOriginalStart));
              newSelectionStart -= spacesBeforeStart;
            }
            if (isLastLine) {
              const spacesBeforeEnd = Math.min(removeCount, Math.max(0, selectionEnd - currentLineOriginalStart));
              newSelectionEnd -= spacesBeforeEnd;
            } else {
              newSelectionEnd -= removeCount;
            }
            currentLineOriginalStart += line.length + 1;
            return line.slice(removeCount);
          } else {
            if (isFirstLine) newSelectionStart += indentStr.length;
            newSelectionEnd += indentStr.length;

            currentLineOriginalStart += line.length + 1;
            return indentStr + line;
          }
        });

        const nextSourceCode = value.slice(0, startLineIndex) + newLines.join("\n") + value.slice(endLineContentEnd);
        applyEditorValue(nextSourceCode, Math.max(0, newSelectionStart), Math.max(0, newSelectionEnd));
      } else {
        const nextSourceCode = `${value.slice(0, selectionStart)}${indentStr}${value.slice(selectionEnd)}`;
        applyEditorValue(nextSourceCode, selectionStart + indentStr.length);
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      // Find the start of the current line to detect its indentation
      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const currentLine = value.slice(lineStart, selectionStart);
      const leadingWhitespace = currentLine.match(/^(\s*)/)[1];
      const indentUnit = "    "; // 4 spaces universally

      if (value[selectionStart - 1] === "{" && nextCharacter === "}") {
        // Special case: cursor inside { } — add extra indent level and place closing brace below
        const nextSourceCode = `${value.slice(0, selectionStart)}\n${leadingWhitespace}${indentUnit}\n${leadingWhitespace}${value.slice(selectionEnd)}`;
        applyEditorValue(nextSourceCode, selectionStart + leadingWhitespace.length + indentUnit.length + 1);
      } else if (
        value[selectionStart - 1] === "{" ||
        value[selectionStart - 1] === "[" ||
        value[selectionStart - 1] === "(" ||
        value[selectionStart - 1] === ":"
      ) {
        // Opening brace/bracket/parenthesis/colon — indent one level deeper
        const nextSourceCode = `${value.slice(0, selectionStart)}\n${leadingWhitespace}${indentUnit}${value.slice(selectionEnd)}`;
        applyEditorValue(nextSourceCode, selectionStart + leadingWhitespace.length + indentUnit.length + 1);
      } else {
        // Normal Enter — carry current line's indentation
        const nextSourceCode = `${value.slice(0, selectionStart)}\n${leadingWhitespace}${value.slice(selectionEnd)}`;
        applyEditorValue(nextSourceCode, selectionStart + leadingWhitespace.length + 1);
      }
      return;
    }

    if (event.key === "}" && selectionStart === selectionEnd) {
      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const textBeforeCursorOnLine = value.slice(lineStart, selectionStart);
      if (/^\s+$/.test(textBeforeCursorOnLine)) {
        // Line has only whitespace up to the cursor. Let's unindent it by up to 4 spaces or 1 tab.
        let removeCount = 0;
        if (textBeforeCursorOnLine.endsWith("\t")) {
          removeCount = 1;
        } else if (textBeforeCursorOnLine.endsWith("    ")) {
          removeCount = 4;
        } else {
          const spaceMatch = textBeforeCursorOnLine.match(/ *$/);
          if (spaceMatch) {
            removeCount = spaceMatch[0].length % 4 || spaceMatch[0].length;
          }
        }
        if (removeCount > 0) {
          event.preventDefault();
          const nextSourceCode = `${value.slice(0, selectionStart - removeCount)}}${value.slice(selectionEnd)}`;
          applyEditorValue(nextSourceCode, selectionStart - removeCount + 1);
          return;
        }
      }
    }

    if (pairedCharacters[event.key]) {
      event.preventDefault();
      const closingCharacter = pairedCharacters[event.key];
      const nextSourceCode = `${value.slice(0, selectionStart)}${event.key}${selectedText}${closingCharacter}${value.slice(selectionEnd)}`;
      const nextCursorPosition = selectedText ? selectionEnd + 2 : selectionStart + 1;
      const nextSelectionEnd = selectedText ? selectionEnd + 1 : nextCursorPosition;
      applyEditorValue(nextSourceCode, nextCursorPosition, nextSelectionEnd);
      return;
    }

    if (Object.values(pairedCharacters).includes(event.key) && nextCharacter === event.key) {
      event.preventDefault();
      applyEditorValue(value, selectionStart + 1);
      return;
    }

    if (
      event.key === "Backspace" &&
      selectionStart === selectionEnd &&
      pairedCharacters[value[selectionStart - 1]] === value[selectionStart]
    ) {
      event.preventDefault();
      const nextSourceCode = `${value.slice(0, selectionStart - 1)}${value.slice(selectionStart + 1)}`;
      applyEditorValue(nextSourceCode, selectionStart - 1);
      return;
    }
  }

  function handleEditorScroll(event) {
    const { scrollTop, scrollLeft } = event.currentTarget;

    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }

    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!student?.id || !session?.token) {
      setSubmissionMessage("Student session not found. Please log in again.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionMessage("");
    setRunResults(null);
    setRunMessage("");
    setConsoleTab("results");
    setLeftActiveTab("testResult");
    setWorkspaceTab("description");

    try {
      const response = await fetch(`${apiBaseUrl}/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session.token)
        },
        body: JSON.stringify({
          studentId: student.id,
          problemId,
          language: editor.language,
          sourceCode: editor.sourceCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to submit solution.");
      }

      setSubmissionHistory((currentHistory) => [data.submission, ...currentHistory]);
      const isAccepted = data.submission?.status === "accepted";
      const successMsg = isAccepted
        ? "All test cases passed! (Including all hidden test cases)"
        : "Latest result: success.";
      setSubmissionMessage(
        formatExecutionMessage(data.execution, successMsg)
      );
      setLatestExecutionDetails(data.submission.compiler_output || "");
      setLatestSubmitResults(data.testCaseResults || []);
      setLatestSubmitExecution(data.execution || null);
      setShowSubmissionDetails(true);

      if (isAccepted) {
        showToast("success", "Accepted", "All test cases passed (including all hidden test cases)!");
        handleTimerPause();
      } else {
        showToast(
          "error",
          data.execution?.verdictLabel || "Submission failed",
          "Check the submission panel for detailed feedback."
        );
      }
    } catch (error) {
      setSubmissionMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRunCode() {
    if (!session?.token) {
      setRunMessage("Student session not found. Please log in again.");
      return;
    }

    if (!editor.sourceCode.trim()) {
      setRunMessage("Write some code before running sample test cases.");
      return;
    }

    setIsRunning(true);
    setRunResults(null);
    setRunMessage("");
    setSubmissionMessage("");
    setLatestExecutionDetails("");
    setLatestSubmitResults([]);
    setLatestSubmitExecution(null);
    setConsoleTab("results");
    setLeftActiveTab("testResult");
    setWorkspaceTab("description");

    try {
      const response = await fetch(`${apiBaseUrl}/submissions/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session.token)
        },
        body: JSON.stringify({
          problemId,
          language: editor.language,
          sourceCode: editor.sourceCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to run sample test cases.");
      }

      setRunResults(data.result);
      setRunMessage(
        formatExecutionMessage(data.result, "Run completed on sample test cases.")
      );
      setShowRunDetails(true);

      if (data.result?.status === "accepted") {
        showToast("success", "Accepted", "All visible test cases passed.");
      } else {
        showToast(
          "error",
          data.result?.verdictLabel || "Run failed",
          "Open the test cases below to review the failure."
        );
      }
    } catch (error) {
      setRunMessage(error.message);
    } finally {
      setIsRunning(false);
    }
  }

  function formatElapsedTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function handleTimerStart() {
    setTimerState((currentTimerState) => {
      if (currentTimerState.isRunning) {
        return currentTimerState;
      }

      return {
        isRunning: true,
        startedAt: Date.now(),
        elapsedBeforePause: currentTimerState.elapsedBeforePause
      };
    });
  }

  function handleTimerPause() {
    setTimerState((currentTimerState) => {
      if (!currentTimerState.isRunning) {
        return currentTimerState;
      }

      return {
        isRunning: false,
        startedAt: currentTimerState.startedAt,
        elapsedBeforePause:
          currentTimerState.elapsedBeforePause +
          Math.max(0, Math.floor((Date.now() - currentTimerState.startedAt) / 1000))
      };
    });
  }

  function handleTimerReset() {
    if (problemId) {
      localStorage.removeItem(getSolvedTimeStorageKey(problemId));

      const savedTimers = readStoredObject(problemTimerStorageKey);
      delete savedTimers[problemId];
      localStorage.setItem(problemTimerStorageKey, JSON.stringify(savedTimers));
    }

    setTimerState(initialTimerState);
    setElapsedSeconds(0);
  }

  const currentProblemIndex = problemOrder.findIndex((entry) => entry.id === problemId);
  const previousProblem =
    currentProblemIndex > 0 ? problemOrder[currentProblemIndex - 1] : null;
  const nextProblem =
    currentProblemIndex >= 0 && currentProblemIndex < problemOrder.length - 1
      ? problemOrder[currentProblemIndex + 1]
      : null;
  const failedTestCount = latestSubmission
    ? Math.max((latestSubmission.total_test_cases || 0) - (latestSubmission.passed_test_cases || 0), 0)
    : 0;
  const editorLineNumbers = useMemo(() => {
    const lineCount = Math.max(editor.sourceCode.split("\n").length, 1);
    return Array.from({ length: lineCount }, (_, index) => index + 1);
  }, [editor.sourceCode]);
  const highlightedCode = useMemo(
    () => highlightCode(editor.sourceCode, editor.language),
    [editor.language, editor.sourceCode]
  );
  // const submissionMessageClassName = submissionMessage.toLowerCase().includes("success")
  //   ? "success"
  //   : "error";
  // const runMessageClassName = runResults?.status === "accepted" ? "success" : "error";
  const submissionVerdict = (
    latestSubmitExecution?.verdictLabel ||
    latestSubmission?.status?.replaceAll("_", " ") ||
    ""
  ).toLowerCase();

  const submissionMessageClassName =
    submissionVerdict === "accepted"
      ? "success"
      : "error";

  const runMessageClassName =
    runResults?.status === "accepted"
      ? "success"
      : "error";

  const latestRunErrorType = runResults?.errorType
    ? runResults.errorType.replaceAll("_", " ")
    : "none";
  const latestSubmitErrorType = latestSubmitExecution?.errorType
    ? latestSubmitExecution.errorType.replaceAll("_", " ")
    : "none";

  return (
    <main className="detail-page student-detail-page">
      {toast.visible ? (
        <div className={`workspace-toast workspace-toast-${toast.type}`} role="status" aria-live="polite">
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
        </div>
      ) : null}
      <section className="detail-card student-detail-card student-workspace-card">
        <header className="leetcode-topbar">
          <div className="leetcode-topbar-left">
            <span className="leetcode-logo" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" style={{ display: "inline-block", verticalAlign: "middle" }}>
                <defs>
                  <linearGradient id="codexa-grad-ws" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <path
                  d="M16.5 5.5 L12 2.9 L4 7.5 L4 16.5 L12 21.1 L16.5 18.5"
                  fill="none"
                  stroke="url(#codexa-grad-ws)"
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
              <span className="brand-text-desktop">codexa</span>
            </span>
            <span className="leetcode-logo-separator" style={{ color: "#2d2d2d", margin: "0 0.5rem" }}>|</span>
            <span style={{ fontSize: "0.85rem", fontWeight: "500" }}>
              {currentProblemIndex >= 0 ? `Problem ${currentProblemIndex + 1}` : "Problem"}
            </span>

            <Link
              className={`leetcode-nav-btn ${previousProblem ? "" : "disabled"}`}
              to={previousProblem ? `/${userRole}/problems/${previousProblem.id}/solve` : "#"}
              aria-disabled={previousProblem ? "false" : "true"}
              onClick={(event) => {
                if (!previousProblem) {
                  event.preventDefault();
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
            </Link>
            <Link
              className={`leetcode-nav-btn ${nextProblem ? "" : "disabled"}`}
              to={nextProblem ? `/${userRole}/problems/${nextProblem.id}/solve` : "#"}
              aria-disabled={nextProblem ? "false" : "true"}
              onClick={(event) => {
                if (!nextProblem) {
                  event.preventDefault();
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
            </Link>
            <Link to={backToProblemsPath} className="leetcode-nav-btn" title="All Problems">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" /></svg>
            </Link>
          </div>

          <div className="leetcode-topbar-center">
            <button
              className="leetcode-action-btn"
              onClick={handleRunCode}
              disabled={isRunning || isSubmitting}
              title="Run code against visible sample test cases"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              {isRunning ? "Running..." : "Run"}
            </button>
            <button
              className="leetcode-action-btn leetcode-submit-btn"
              type="submit"
              form="problem-editor-form"
              disabled={isSubmitting || isRunning}
              title="Evaluate code against hidden test cases and save solution"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "2px" }}><polyline points="20 6 9 17 4 12" /></svg>
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>

          <div className="leetcode-topbar-right" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Inline Theme Toggle on the left side of the timer */}
            <button
              type="button"
              className="leetcode-nav-btn"
              onClick={toggleTheme}
              style={{
                background: "transparent",
                border: "none",
                color: isDarkTheme ? "#FFA116" : "#FF8F00",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.25rem",
                transition: "transform 0.3s ease"
              }}
              title={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkTheme ? (
                /* Sun Icon */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                /* Moon Icon */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <div className="leetcode-timer-wrapper" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <div className={`leetcode-timer-chip ${!timerState.isRunning ? "paused" : ""}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
                <span style={{ minWidth: "42px", textAlign: "center", fontFamily: "SF Mono, Consolas, monospace", fontVariantNumeric: "tabular-nums", display: "inline-block" }}>
                  {formatElapsedTime(elapsedSeconds)}
                </span>
              </div>
              <button
                type="button"
                className="leetcode-nav-btn"
                onClick={timerState.isRunning ? handleTimerPause : handleTimerStart}
                title={timerState.isRunning ? "Pause timer" : "Start timer"}
              >
                {timerState.isRunning ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              <button
                type="button"
                className="leetcode-nav-btn"
                onClick={handleTimerReset}
                title="Reset timer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
              </button>
            </div>
          </div>
        </header>

        {status.loading ? <h1>Loading question...</h1> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}

        {problem ? (
          <>
            {/* Mobile Workspace Toggle Tabs */}
            <div className="mobile-workspace-tabs">
              <button
                type="button"
                className={`mobile-workspace-tab ${workspaceTab === "description" ? "active" : ""}`}
                onClick={() => setWorkspaceTab("description")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style={{ marginRight: "4px", verticalAlign: "middle" }}><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
                Description
              </button>
              <button
                type="button"
                className={`mobile-workspace-tab ${workspaceTab === "code" ? "active" : ""}`}
                onClick={() => setWorkspaceTab("code")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px", verticalAlign: "middle" }}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                Code
              </button>
            </div>

            <section className="workspace-shell" style={{ padding: "0.5rem" }}>
              <article className={`detail-block workspace-column workspace-problem-panel ${workspaceTab !== "description" ? "mobile-hidden" : ""}`}>
                <div className="leetcode-tab-container">
                  <button
                    type="button"
                    className={`leetcode-tab ${leftActiveTab === "description" ? "active" : ""}`}
                    onClick={() => setLeftActiveTab("description")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
                    Description
                  </button>
                  <button
                    type="button"
                    className={`leetcode-tab ${leftActiveTab === "editorial" ? "active" : ""}`}
                    onClick={() => setLeftActiveTab("editorial")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" /></svg>
                    Editorial
                  </button>
                  <button
                    type="button"
                    className={`leetcode-tab ${leftActiveTab === "solutions" ? "active" : ""}`}
                    onClick={() => setLeftActiveTab("solutions")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12M12 3v11M16 14l-4-5-4 5v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-5z" /></svg>
                    Solutions
                  </button>
                  <button
                    type="button"
                    className={`leetcode-tab ${leftActiveTab === "submissions" ? "active" : ""}`}
                    onClick={() => setLeftActiveTab("submissions")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
                    Submissions
                  </button>
                  <button
                    type="button"
                    className={`leetcode-tab ${leftActiveTab === "testResult" ? "active" : ""}`}
                    onClick={() => setLeftActiveTab("testResult")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>
                    Test Result
                  </button>
                  <button
                    type="button"
                    className={`leetcode-tab ${leftActiveTab === "testcase" ? "active" : ""}`}
                    onClick={() => setLeftActiveTab("testcase")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2cbb5d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Testcase
                  </button>
                </div>

                <div className="workspace-problem-content-scroll">
                  {leftActiveTab === "description" && (
                    <>
                      <div className="workspace-problem-header">
                        <div>
                          <h1 style={{ fontSize: "1.45rem", fontWeight: "700", marginBottom: "0.75rem" }}>
                            {currentProblemIndex >= 0 ? `${currentProblemIndex + 1}. ${problem.title}` : problem.title}
                          </h1>
                        </div>
                        <span className="question-count">#{currentProblemIndex >= 0 ? currentProblemIndex + 1 : "-"}</span>
                      </div>

                      <div className="workspace-meta-row workspace-meta-row-rich">
                        <span className={`difficulty-pill ${problem.difficulty}`}>{problem.difficulty}</span>
                        <span className="workspace-meta-chip">
                          {(problem.sample_test_cases || []).length} sample cases
                        </span>
                        <span className="workspace-meta-chip">
                          {(problem.tags || []).length} topics
                        </span>
                      </div>

                      <div className="pill-row" style={{ marginBottom: "1.5rem" }}>
                        {(problem.tags || []).map((tag) => (
                          <span className="tag-pill" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="workspace-subsection workspace-statement-section">
                        <p className="workspace-statement-copy" style={{ whiteSpace: "pre-line" }}>{problem.statement}</p>
                      </div>

                      <div className="workspace-subsection" style={{ marginTop: "2rem" }}>
                        <div className="workspace-section-heading">
                          <h3>Constraints</h3>
                        </div>
                        <div className="workspace-note-card">
                          <p style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{problem.constraints_text || "No constraints provided."}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {leftActiveTab === "editorial" && (
                    <div style={{ padding: "1rem", color: "#8a8a8a" }}>
                      <h3>Editorial Hint</h3>
                      <p style={{ whiteSpace: "pre-line" }}>{problem.examples_text || "No editorial guide available for this challenge."}</p>
                    </div>
                  )}

                  {leftActiveTab === "solutions" && (
                    <div style={{ padding: "1rem", color: "#8a8a8a" }}>
                      <h3>Community Solutions</h3>
                      <p>No community solutions have been submitted yet. Be the first to share your approach!</p>
                    </div>
                  )}

                  {leftActiveTab === "submissions" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--lc-text-primary, #ffffff)" }}>
                          Submissions ({submissionHistory.length})
                        </h2>
                      </div>
                      {historyStatus.loading ? <p className="dashboard-copy">Loading submission history...</p> : null}
                      {historyStatus.error ? <p className="form-status error">{historyStatus.error}</p> : null}

                      {!historyStatus.loading && !historyStatus.error && submissionHistory.length === 0 ? (
                        <p className="dashboard-copy">No submissions yet. Submit your first solution above.</p>
                      ) : null}

                      {!historyStatus.loading && !historyStatus.error && submissionHistory.length > 0 ? (
                        <div className="leetcode-submissions-table-shell" style={{ overflowX: "auto" }}>
                          <table style={{
                            width: "100%",
                            borderCollapse: "separate",
                            borderSpacing: "0 6px",
                            fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
                            fontSize: "0.85rem"
                          }}>
                            <thead>
                              <tr style={{ color: "#94a3b8", textAlign: "left", fontSize: "0.775rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                <th style={{ padding: "0.5rem 0.85rem", width: "40px" }}>#</th>
                                <th style={{ padding: "0.5rem 0.85rem" }}>Status</th>
                                <th style={{ padding: "0.5rem 0.85rem" }}>Language</th>
                                <th style={{ padding: "0.5rem 0.85rem" }}>Runtime</th>
                                <th style={{ padding: "0.5rem 0.85rem" }}>Memory</th>
                              </tr>
                            </thead>
                            <tbody>
                              {submissionHistory.map((sub, index) => {
                                const subNum = submissionHistory.length - index;
                                const isAccepted = sub.status === "accepted";
                                const langDisplay = sub.language === "python" ? "Python3" : sub.language === "cpp" ? "C++" : sub.language === "javascript" ? "JavaScript" : "Java";
                                const timeDisplay = isAccepted ? `${sub.execution_time_ms ?? 0} ms` : "N/A";
                                const memoryDisplay = isAccepted ? `${(sub.memory_kb ? (sub.memory_kb / 1024).toFixed(1) : (14.2 + (index % 5) * 1.1).toFixed(1))} MB` : "N/A";
                                const statusText = isAccepted ? "Accepted" : sub.status === "wrong_answer" ? "Wrong Answer" : sub.status === "compile_error" ? "Compile Error" : "Runtime Error";

                                return (
                                  <tr
                                    key={sub.id || index}
                                    onClick={() => setSelectedSubmissionModal(sub)}
                                    style={{
                                      background: "rgba(255, 255, 255, 0.03)",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease"
                                    }}
                                    className="leetcode-submission-row"
                                    title="Click to view submitted code"
                                  >
                                    <td style={{ padding: "0.75rem 0.85rem", color: "#64748b", fontWeight: 600, borderTopLeftRadius: "8px", borderBottomLeftRadius: "8px" }}>
                                      {subNum}
                                    </td>
                                    <td style={{ padding: "0.75rem 0.85rem" }}>
                                      <div style={{ fontWeight: 700, color: isAccepted ? "#22c55e" : "#ef4444", fontSize: "0.875rem" }}>
                                        {statusText}
                                      </div>
                                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                                        {formatRelativeTime(sub.submitted_at)}
                                      </div>
                                    </td>
                                    <td style={{ padding: "0.75rem 0.85rem" }}>
                                      <span style={{
                                        padding: "0.2rem 0.5rem",
                                        borderRadius: "10px",
                                        background: "rgba(255, 255, 255, 0.08)",
                                        border: "1px solid rgba(255, 255, 255, 0.12)",
                                        fontSize: "0.75rem",
                                        color: "#cbd5e1",
                                        fontWeight: 600
                                      }}>
                                        {langDisplay}
                                      </span>
                                    </td>
                                    <td style={{ padding: "0.75rem 0.85rem", color: isAccepted ? "#e2e8f0" : "#64748b", fontWeight: 600, fontSize: "0.825rem" }}>
                                      {isAccepted ? `⏱️ ${timeDisplay}` : "⏱️ N/A"}
                                    </td>
                                    <td style={{ padding: "0.75rem 0.85rem", color: isAccepted ? "#e2e8f0" : "#64748b", fontWeight: 600, fontSize: "0.825rem", borderTopRightRadius: "8px", borderBottomRightRadius: "8px" }}>
                                      {isAccepted ? `⚙️ ${memoryDisplay}` : "⚙️ N/A"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {leftActiveTab === "testResult" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div className="workspace-column-header" style={{ marginBottom: "1rem" }}>
                        <h2>Execution Results</h2>
                      </div>

                      {isRunning || isSubmitting ? (
                        <div className="workspace-loading-result" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 2rem", gap: "1rem" }}>
                          <div className="leetcode-spinner" style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            border: "3px solid rgba(59, 130, 246, 0.15)",
                            borderTopColor: "#8B5CF6",
                            animation: "leetcode-spin 0.8s linear infinite"
                          }}></div>

                          <p style={{ color: "#8a8a8a", fontSize: "0.9rem", fontWeight: "500" }}>
                            {isRunning ? "Running sample test cases..." : "Submitting code & analyzing results..."}
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Run Results */}
                          {runResults && (
                            <div className="leetcode-test-result-wrapper" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                              {/* Top Verdict Header */}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                                <div>
                                  <h2 style={{
                                    fontSize: "1.5rem",
                                    fontWeight: 800,
                                    color: (runResults.verdictLabel === "Accepted" || runResults.passedTestCases === runResults.totalTestCases) ? "#22c55e" : "#ef4444",
                                    margin: 0
                                  }}>
                                    {runResults.verdictLabel || (runResults.passedTestCases === runResults.totalTestCases ? "Accepted" : "Wrong Answer")}
                                  </h2>
                                  <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: "4px 0 0 0" }}>
                                    {runResults.passedTestCases} / {runResults.totalTestCases} sample test cases passed
                                  </p>
                                </div>
                                <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: "#94a3b8" }}>
                                  <div>Runtime: <strong style={{ color: "#ffffff" }}>{runResults.executionTimeMs ?? 0} ms</strong></div>
                                </div>
                              </div>

                              {/* If Compile Error or Runtime Error with Stderr */}
                              {(runResults.verdictLabel === "Compile Error" || runResults.errorType === "compile_error" || runResults.stderr) ? (
                                <div style={{
                                  background: "rgba(239, 68, 68, 0.08)",
                                  border: "1px solid rgba(239, 68, 68, 0.25)",
                                  borderRadius: "12px",
                                  padding: "1rem"
                                }}>
                                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f87171", marginBottom: "0.5rem" }}>
                                    {runResults.verdictLabel === "Compile Error" || runResults.errorType === "compile_error" ? "Compile Error Output:" : "Runtime Error Output:"}
                                  </div>
                                  <pre style={{
                                    fontFamily: "'Consolas', 'Courier New', monospace",
                                    fontSize: "0.85rem",
                                    color: "#fca5a5",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    margin: 0
                                  }}>
                                    {runResults.stderr || runResults.compilerOutput || "Syntax or runtime error in script."}
                                  </pre>
                                </div>
                              ) : null}

                              {/* Per-Case Interactive Tabs */}
                              {Array.isArray(runResults.testCaseResults) && runResults.testCaseResults.length > 0 ? (
                                <div>
                                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                                    {runResults.testCaseResults.map((tc, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setActiveRunCaseIndex(idx)}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "0.4rem",
                                          padding: "0.45rem 0.85rem",
                                          borderRadius: "8px",
                                          fontSize: "0.825rem",
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          border: "1px solid",
                                          borderColor: activeRunCaseIndex === idx ? (tc.passed ? "#22c55e" : "#ef4444") : "rgba(255, 255, 255, 0.1)",
                                          background: activeRunCaseIndex === idx ? (tc.passed ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)") : "rgba(255, 255, 255, 0.04)",
                                          color: tc.passed ? "#4ade80" : "#f87171"
                                        }}
                                      >
                                        <span style={{
                                          width: "7px",
                                          height: "7px",
                                          borderRadius: "50%",
                                          background: tc.passed ? "#22c55e" : "#ef4444"
                                        }} />
                                        Case {idx + 1}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Selected Testcase Details */}
                                  {(() => {
                                    const currentTC = runResults.testCaseResults[activeRunCaseIndex] || runResults.testCaseResults[0];
                                    if (!currentTC) return null;
                                    return (
                                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                        {/* Input */}
                                        <div>
                                          <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 600 }}>
                                            Input
                                          </label>
                                          <div style={{
                                            padding: "0.75rem 1rem",
                                            borderRadius: "8px",
                                            background: "rgba(255, 255, 255, 0.04)",
                                            border: "1px solid rgba(255, 255, 255, 0.08)",
                                            fontFamily: "'Consolas', monospace",
                                            fontSize: "0.875rem",
                                            color: "#e2e8f0"
                                          }}>
                                            {currentTC.input || "(empty)"}
                                          </div>
                                        </div>

                                        {/* Output */}
                                        <div>
                                          <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 600 }}>
                                            Output
                                          </label>
                                          <div style={{
                                            padding: "0.75rem 1rem",
                                            borderRadius: "8px",
                                            background: currentTC.passed ? "rgba(34, 197, 94, 0.06)" : "rgba(239, 68, 68, 0.06)",
                                            border: `1px solid ${currentTC.passed ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                                            fontFamily: "'Consolas', monospace",
                                            fontSize: "0.875rem",
                                            color: currentTC.passed ? "#4ade80" : "#f87171"
                                          }}>
                                            {currentTC.actualOutput || "(no output)"}
                                          </div>
                                        </div>

                                        {/* Expected Output */}
                                        <div>
                                          <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 600 }}>
                                            Expected Output
                                          </label>
                                          <div style={{
                                            padding: "0.75rem 1rem",
                                            borderRadius: "8px",
                                            background: "rgba(255, 255, 255, 0.04)",
                                            border: "1px solid rgba(255, 255, 255, 0.08)",
                                            fontFamily: "'Consolas', monospace",
                                            fontSize: "0.875rem",
                                            color: "#4ade80"
                                          }}>
                                            {currentTC.expectedOutput || "(empty)"}
                                          </div>
                                        </div>

                                        {/* Stdout / Stderr */}
                                        {currentTC.stderr ? (
                                          <div>
                                            <label style={{ display: "block", fontSize: "0.8rem", color: "#f87171", marginBottom: "0.35rem", fontWeight: 600 }}>
                                              Error Output
                                            </label>
                                            <pre style={{
                                              padding: "0.75rem 1rem",
                                              borderRadius: "8px",
                                              background: "rgba(239, 68, 68, 0.06)",
                                              border: "1px solid rgba(239, 68, 68, 0.2)",
                                              fontFamily: "'Consolas', monospace",
                                              fontSize: "0.825rem",
                                              color: "#fca5a5",
                                              whiteSpace: "pre-wrap",
                                              wordBreak: "break-word",
                                              margin: 0
                                            }}>
                                              {currentTC.stderr}
                                            </pre>
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : null}
                            </div>
                          )}

                          {/* Submit Results */}
                          {latestSubmission && !runResults && (
                            <div className="leetcode-test-result-wrapper" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                              {/* Top Verdict Header */}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                                <div>
                                  <h2 style={{
                                    fontSize: "1.5rem",
                                    fontWeight: 800,
                                    color: latestSubmission.status === "accepted" ? "#22c55e" : "#ef4444",
                                    margin: 0
                                  }}>
                                    {latestSubmitExecution?.verdictLabel || (latestSubmission.status === "accepted" ? "Accepted" : "Wrong Answer")}
                                  </h2>
                                  <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: "4px 0 0 0" }}>
                                    {latestSubmission.passed_test_cases} / {latestSubmission.total_test_cases} test cases passed
                                  </p>
                                </div>
                                <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: "#94a3b8" }}>
                                  <div>Runtime: <strong style={{ color: "#ffffff" }}>{latestSubmission.execution_time_ms ?? 0} ms</strong></div>
                                </div>
                              </div>

                              {/* If Compile Error or Runtime Error with Stderr */}
                              {(latestSubmitExecution?.errorType === "compile_error" || latestSubmitExecution?.stderr) ? (
                                <div style={{
                                  background: "rgba(239, 68, 68, 0.08)",
                                  border: "1px solid rgba(239, 68, 68, 0.25)",
                                  borderRadius: "12px",
                                  padding: "1rem"
                                }}>
                                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f87171", marginBottom: "0.5rem" }}>
                                    {latestSubmitExecution?.errorType === "compile_error" ? "Compile Error Output:" : "Runtime Error Output:"}
                                  </div>
                                  <pre style={{
                                    fontFamily: "'Consolas', 'Courier New', monospace",
                                    fontSize: "0.85rem",
                                    color: "#fca5a5",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    margin: 0
                                  }}>
                                    {latestSubmitExecution?.stderr || latestExecutionDetails || "Syntax or runtime error in script."}
                                  </pre>
                                </div>
                              ) : null}

                              {/* Per-Case Interactive Tabs for Submit */}
                              {Array.isArray(latestSubmitResults) && latestSubmitResults.length > 0 ? (
                                <div>
                                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                                    {latestSubmitResults.map((tc, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setActiveRunCaseIndex(idx)}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "0.4rem",
                                          padding: "0.45rem 0.85rem",
                                          borderRadius: "8px",
                                          fontSize: "0.825rem",
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          border: "1px solid",
                                          borderColor: activeRunCaseIndex === idx ? (tc.passed ? "#22c55e" : "#ef4444") : "rgba(255, 255, 255, 0.1)",
                                          background: activeRunCaseIndex === idx ? (tc.passed ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)") : "rgba(255, 255, 255, 0.04)",
                                          color: tc.passed ? "#4ade80" : "#f87171"
                                        }}
                                      >
                                        <span style={{
                                          width: "7px",
                                          height: "7px",
                                          borderRadius: "50%",
                                          background: tc.passed ? "#22c55e" : "#ef4444"
                                        }} />
                                        Case {idx + 1}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Selected Testcase Details */}
                                  {(() => {
                                    const currentTC = latestSubmitResults[activeRunCaseIndex] || latestSubmitResults[0];
                                    if (!currentTC) return null;
                                    return (
                                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                        {/* Input */}
                                        <div>
                                          <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 600 }}>
                                            Input
                                          </label>
                                          <div style={{
                                            padding: "0.75rem 1rem",
                                            borderRadius: "8px",
                                            background: "rgba(255, 255, 255, 0.04)",
                                            border: "1px solid rgba(255, 255, 255, 0.08)",
                                            fontFamily: "'Consolas', monospace",
                                            fontSize: "0.875rem",
                                            color: "#e2e8f0"
                                          }}>
                                            {currentTC.input || "(empty)"}
                                          </div>
                                        </div>

                                        {/* Output */}
                                        <div>
                                          <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 600 }}>
                                            Output
                                          </label>
                                          <div style={{
                                            padding: "0.75rem 1rem",
                                            borderRadius: "8px",
                                            background: currentTC.passed ? "rgba(34, 197, 94, 0.06)" : "rgba(239, 68, 68, 0.06)",
                                            border: `1px solid ${currentTC.passed ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                                            fontFamily: "'Consolas', monospace",
                                            fontSize: "0.875rem",
                                            color: currentTC.passed ? "#4ade80" : "#f87171"
                                          }}>
                                            {currentTC.actualOutput || "(no output)"}
                                          </div>
                                        </div>

                                        {/* Expected Output */}
                                        <div>
                                          <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 600 }}>
                                            Expected Output
                                          </label>
                                          <div style={{
                                            padding: "0.75rem 1rem",
                                            borderRadius: "8px",
                                            background: "rgba(255, 255, 255, 0.04)",
                                            border: "1px solid rgba(255, 255, 255, 0.08)",
                                            fontFamily: "'Consolas', monospace",
                                            fontSize: "0.875rem",
                                            color: "#4ade80"
                                          }}>
                                            {currentTC.expectedOutput || "(empty)"}
                                          </div>
                                        </div>

                                        {/* Stdout / Stderr */}
                                        {currentTC.stderr ? (
                                          <div>
                                            <label style={{ display: "block", fontSize: "0.8rem", color: "#f87171", marginBottom: "0.35rem", fontWeight: 600 }}>
                                              Error Output
                                            </label>
                                            <pre style={{
                                              padding: "0.75rem 1rem",
                                              borderRadius: "8px",
                                              background: "rgba(239, 68, 68, 0.06)",
                                              border: "1px solid rgba(239, 68, 68, 0.2)",
                                              fontFamily: "'Consolas', monospace",
                                              fontSize: "0.825rem",
                                              color: "#fca5a5",
                                              whiteSpace: "pre-wrap",
                                              wordBreak: "break-word",
                                              margin: 0
                                            }}>
                                              {currentTC.stderr}
                                            </pre>
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : null}
                            </div>
                          )}

                          {!runResults && !latestSubmission && (
                            <p className="dashboard-copy">
                              Use Run to execute sample test cases, or Submit to evaluate against all test cases.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {leftActiveTab === "testcase" && (
                    <div className="leetcode-testcase-container">
                      <div className="leetcode-testcase-tab-row">
                        {(problem.sample_test_cases || []).map((testCase, index) => (
                          <button
                            key={index}
                            type="button"
                            className={`leetcode-testcase-tab ${activeTestCaseIndex === index ? "active" : ""}`}
                            onClick={() => setActiveTestCaseIndex(index)}
                          >
                            Case {index + 1}
                          </button>
                        ))}
                        <button type="button" className="leetcode-testcase-tab" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                          +
                        </button>
                      </div>
                      {problem.sample_test_cases?.[activeTestCaseIndex] && (
                        <div className="leetcode-testcase-input-box">
                          <label className="leetcode-testcase-label">intervals =</label>
                          <textarea
                            className="leetcode-testcase-textarea"
                            rows="4"
                            readOnly
                            value={problem.sample_test_cases[activeTestCaseIndex].input_data}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </article>

              <article className={`detail-block workspace-column editor-column ${workspaceTab !== "code" ? "mobile-hidden" : ""}`}>
                <div className="leetcode-tab-container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", paddingRight: "0.5rem", height: "38px" }}>
                  <span className="leetcode-tab active" style={{ cursor: "default", display: "flex", alignItems: "center", gap: "0.4rem", padding: "0 0.8rem", height: "100%", borderBottom: "2px solid #10b981" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                    <span style={{ fontWeight: "600", fontSize: "0.85rem" }}>Code</span>
                  </span>
                </div>

                <div className="workspace-column-header workspace-editor-header" style={{ padding: "0.5rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", height: "38px" }}>
                  <div className="editor-toolbar" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                      <select
                        id="language"
                        name="language"
                        value={editor.language}
                        onChange={handleEditorChange}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#eff1f5",
                          padding: "0.25rem 1.25rem 0.25rem 0.5rem",
                          borderRadius: "4px",
                          outline: "none",
                          cursor: "pointer",
                          fontWeight: "500",
                          fontSize: "0.85rem",
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none"
                        }}
                      >
                        <option value="python" style={{ background: "#1e1e1e" }}>Python</option>
                        <option value="cpp" style={{ background: "#1e1e1e" }}>C++</option>
                        <option value="java" style={{ background: "#1e1e1e" }}>Java</option>
                        <option value="javascript" style={{ background: "#1e1e1e" }}>JavaScript</option>
                      </select>
                      <span style={{ position: "absolute", right: "2px", pointerEvents: "none", color: "#8a8a8a", fontSize: "0.6rem" }}>▼</span>
                    </div>
                    <span style={{ color: "#8a8a8a", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ color: "#10b981", fontSize: "1.2rem", lineHeight: "1", display: "inline-block", marginTop: "-2px" }}>•</span>
                      Auto
                    </span>
                  </div>

                  <div className="editor-actions-right" style={{ display: "flex", alignItems: "center", gap: "1rem", color: "#8a8a8a" }}>
                    <button type="button" className="leetcode-nav-btn" onClick={handleFormatCode} title="Format code" style={{ background: "none", border: "none", padding: 0, color: "inherit", cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="7" y2="18" /></svg>
                    </button>
                    <button type="button" className="leetcode-nav-btn" onClick={handleSaveCode} title="Save code" style={{ background: "none", border: "none", padding: 0, color: "inherit", cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                    </button>
                    <button type="button" className="leetcode-nav-btn" onClick={handleShowTemplates} title="Show templates" style={{ background: "none", border: "none", padding: 0, color: "inherit", cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6L2 12l6 6" /></svg>
                    </button>
                    <button type="button" className="leetcode-nav-btn" onClick={handleResetCode} title="Reset code" style={{ background: "none", border: "none", padding: 0, color: "inherit", cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><polyline points="3 3 3 8 8 8" /></svg>
                    </button>
                  </div>
                </div>

                <form className="auth-form editor-form" id="problem-editor-form" onSubmit={handleSubmit}>
                  <div className="editor-surface">
                    <div
                      className="code-editor-shell"
                      style={{ fontSize: `${editorFontSize}px` }}
                      onClick={(event) => {
                        if (event.target === event.currentTarget || event.target === highlightRef.current) {
                          editorRef.current?.focus();
                        }
                      }}
                    >
                      <div className="code-editor-gutter" ref={lineNumbersRef} aria-hidden="true">
                        {editorLineNumbers.map((lineNumber) => (
                          <span key={lineNumber}>{lineNumber}</span>
                        ))}
                      </div>
                      <div className="code-editor-stage">
                        {/* <pre
                        ref={highlightRef}
                        className="code-editor-highlight"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{
                          __html: `${highlightedCode}${editor.sourceCode.endsWith("\n") ? "\n " : " "}`
                        }}
                      /> */}
                        <pre
                          ref={highlightRef}
                          className={`code-editor-highlight language-${editor.language}`}
                          aria-hidden="true"
                          dangerouslySetInnerHTML={{
                            __html: `${highlightedCode}${editor.sourceCode.endsWith("\n") ? "\n " : " "}`
                          }}
                        />
                        <textarea
                          ref={editorRef}
                          id="sourceCode"
                          name="sourceCode"
                          rows="18"
                          className="code-editor-input"
                          placeholder="Write your solution here..."
                          value={editor.sourceCode}
                          onChange={handleEditorChange}
                          onKeyDown={handleEditorKeyDown}
                          onScroll={handleEditorScroll}
                          onKeyUp={(event) => {
                            updateCursorPos(event.currentTarget);
                          }}
                          onSelect={(event) => {
                            updateCursorPos(event.currentTarget);
                          }}
                          onClick={(event) => {
                            updateSuggestionState(
                              event.currentTarget.value,
                              event.currentTarget.selectionStart,
                              editor.language
                            );
                            updateCursorPos(event.currentTarget);
                          }}
                          spellCheck="false"
                          autoCapitalize="off"
                          autoComplete="off"
                          autoCorrect="off"
                          onBlur={() => {
                            window.setTimeout(() => {
                              setSuggestionState((current) => ({
                                ...current,
                                visible: false
                              }));
                            }, 120);
                          }}
                          required
                        />
                      </div>
                    </div>
                    {suggestionState.visible ? (
                      <div
                        className="editor-suggestion-panel"
                        style={{
                          top: `${suggestionState.popupTop}px`,
                          left: `${suggestionState.popupLeft}px`
                        }}
                      >
                        {suggestionState.suggestions.map((entry, index) => (
                          <button
                            className={`editor-suggestion-item ${index === suggestionState.selectedIndex ? "active" : ""}`}
                            key={`${entry.label}-${index}`}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              acceptSuggestion(index);
                            }}
                          >
                            <strong>{entry.label}</strong>
                            <span>{entry.insertText.replace(/\n/g, " ").slice(0, 42)}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </form>


              </article>
            </section>
          </>
        ) : null}
      </section>

      {/* Mobile Footer Action Bar */}
      <footer className={`mobile-editor-footer ${workspaceTab === "code" ? "show" : ""}`}>
        <button
          className="leetcode-action-btn mobile-console-btn"
          type="button"
          onClick={() => {
            setLeftActiveTab("testResult");
            setWorkspaceTab("description");
          }}
        >
          Console
        </button>
        <div className="mobile-footer-actions-right" style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="leetcode-action-btn mobile-run-btn"
            type="button"
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting}
            title="Run code against sample test cases"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            Run
          </button>
          <button
            className="leetcode-action-btn leetcode-submit-btn mobile-submit-btn"
            type="submit"
            form="problem-editor-form"
            disabled={isSubmitting || isRunning}
            title="Submit solution for full evaluation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            Submit
          </button>
        </div>
        {/* Submitted Code Preview Modal */}
        {selectedSubmissionModal ? (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }} onClick={() => setSelectedSubmissionModal(null)}>
            <div style={{
              background: "#1e293b",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "720px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "1.5rem",
              color: "#f8fafc",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: selectedSubmissionModal.status === "accepted" ? "#22c55e" : "#ef4444"
                  }}>
                    {selectedSubmissionModal.status === "accepted" ? "Accepted" : "Wrong Answer"}
                  </span>
                  <span style={{
                    padding: "0.2rem 0.6rem",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.08)",
                    fontSize: "0.8rem",
                    color: "#cbd5e1"
                  }}>
                    {selectedSubmissionModal.language === "python" ? "Python3" : selectedSubmissionModal.language.toUpperCase()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubmissionModal(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    fontSize: "1.25rem",
                    cursor: "pointer"
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1rem", flexWrap: "wrap" }}>
                <div>Submitted: <strong style={{ color: "#e2e8f0" }}>{new Date(selectedSubmissionModal.submitted_at).toLocaleString()}</strong></div>
                <div>Runtime: <strong style={{ color: "#e2e8f0" }}>{selectedSubmissionModal.execution_time_ms ?? 0} ms</strong></div>
                <div>Test Cases: <strong style={{ color: "#e2e8f0" }}>{selectedSubmissionModal.passed_test_cases}/{selectedSubmissionModal.total_test_cases}</strong></div>
              </div>

              {selectedSubmissionModal.compiler_output ? (
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#f87171", marginBottom: "0.35rem", fontWeight: 600 }}>Compiler / Execution Log</label>
                  <pre style={{ padding: "0.75rem", background: "rgba(239, 68, 68, 0.08)", borderRadius: "8px", color: "#fca5a5", fontSize: "0.8rem", whiteSpace: "pre-wrap" }}>
                    {selectedSubmissionModal.compiler_output}
                  </pre>
                </div>
              ) : null}

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.5rem", fontWeight: 600 }}>Submitted Source Code</label>
                <pre style={{
                  background: "#0f172a",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "10px",
                  padding: "1rem",
                  fontFamily: "'Consolas', monospace",
                  fontSize: "0.875rem",
                  color: "#38bdf8",
                  overflowX: "auto",
                  maxHeight: "350px",
                  margin: 0
                }}>
                  {selectedSubmissionModal.source_code}
                </pre>
              </div>
            </div>
          </div>
        ) : null}
      </footer>
    </main>
  );
}
