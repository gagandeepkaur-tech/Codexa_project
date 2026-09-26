/**
 * Robust CSV parser and generator for MCQ and Coding Questions.
 */

/**
 * Parses raw CSV text into an array of rows (each row is an array of cell strings),
 * correctly handling commas inside double quotes, escaped quotes (""), and newlines.
 */
export function parseRawCsv(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let insideQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i += 2;
        continue;
      }
      insideQuotes = !insideQuotes;
      i++;
      continue;
    }

    if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      i++;
      continue;
    }

    if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      i++;
      continue;
    }

    currentCell += char;
    i++;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalizes a header string (e.g., "Question Text", "Option A", "sample_input" -> "questiontext", "optiona", "sampleinput")
 */
function cleanKey(header) {
  return String(header || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Parses a CSV string containing MCQ or Coding questions.
 */
export function parseQuestionsCsv(csvText) {
  const rows = parseRawCsv(csvText);
  if (!rows || rows.length < 2) {
    return {
      questions: [],
      errors: ["CSV must contain a header row and at least one data row."],
      total: 0
    };
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map(cleanKey);
  const questions = [];
  const errors = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const rowObj = {};

    headers.forEach((key, colIndex) => {
      rowObj[key] = row[colIndex] ?? "";
    });

    const getVal = (...keys) => {
      for (const k of keys) {
        const cleaned = cleanKey(k);
        if (rowObj[cleaned] !== undefined && rowObj[cleaned] !== "") {
          return rowObj[cleaned];
        }
      }
      return "";
    };

    const rawType = getVal("type", "questiontype", "qtype").toLowerCase();
    const titleOrQuestion = getVal("title", "question", "questiontext", "problemtitle", "prompt");
    const statement = getVal("statement", "description", "problemstatement", "details");

    // Check if options are present to determine if it's MCQ
    const optA = getVal("optiona", "option1", "opt1", "opta");
    const optB = getVal("optionb", "option2", "opt2", "optb");
    const optC = getVal("optionc", "option3", "opt3", "optc");
    const optD = getVal("optiond", "option4", "opt4", "optd");
    const optE = getVal("optione", "option5", "opt5", "opte");
    const optionsRaw = getVal("options", "choices");

    let isMcq = false;
    if (rawType === "mcq" || rawType === "multiplechoice") {
      isMcq = true;
    } else if (rawType === "coding" || rawType === "code") {
      isMcq = false;
    } else {
      // Auto-detect based on fields
      if (optA || optB || optionsRaw || getVal("correctoption", "correctanswer", "answer")) {
        isMcq = true;
      } else {
        isMcq = false;
      }
    }

    if (!titleOrQuestion && !statement) {
      errors.push(`Row ${rowIndex + 1}: Missing question title or text. Skipped.`);
      continue;
    }

    if (isMcq) {
      let optionsList = [];
      if (optionsRaw) {
        optionsList = optionsRaw
          .split(/[|;]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (optionsList.length === 0) {
        optionsList = [optA, optB, optC, optD, optE].map((s) => s.trim()).filter(Boolean);
      }
      if (optionsList.length < 2) {
        optionsList = ["Option A", "Option B", "Option C", "Option D"];
      }

      const rawCorrect = getVal("correctoption", "correctanswer", "correct", "answer").trim();
      let correctIndex = 0;
      if (/^[a-eA-E]$/.test(rawCorrect)) {
        correctIndex = rawCorrect.toUpperCase().charCodeAt(0) - 65;
      } else if (/^[1-9]$/.test(rawCorrect)) {
        correctIndex = parseInt(rawCorrect, 10) - 1;
      } else if (/^[0-9]+$/.test(rawCorrect)) {
        correctIndex = parseInt(rawCorrect, 10);
      } else if (rawCorrect) {
        const found = optionsList.findIndex((opt) => opt.toLowerCase() === rawCorrect.toLowerCase());
        if (found !== -1) correctIndex = found;
      }

      if (correctIndex < 0 || correctIndex >= optionsList.length) {
        correctIndex = 0;
      }

      const marks = parseInt(getVal("marks", "score", "points"), 10) || 1;
      const negativeMarks = parseInt(getVal("negativemarks", "negmarks", "penalty"), 10) || 0;

      questions.push({
        id: Date.now() + rowIndex,
        type: "mcq",
        title: titleOrQuestion || "MCQ Question",
        questionText: titleOrQuestion || "MCQ Question",
        statement: statement || "",
        options: optionsList,
        correctOptionIndex: correctIndex,
        marks,
        negativeMarks
      });
    } else {
      // Coding Question
      const title = titleOrQuestion || "Coding Problem";
      const problemStatement = statement || titleOrQuestion || "Solve the problem according to specification.";
      const difficultyRaw = getVal("difficulty", "level").toLowerCase();
      const difficulty = ["easy", "medium", "hard"].includes(difficultyRaw) ? difficultyRaw : "medium";
      const marks = parseInt(getVal("marks", "score", "points"), 10) || 10;
      const inputFormat = getVal("inputformat", "input_format", "input");
      const outputFormat = getVal("outputformat", "output_format", "output");
      const constraintsText = getVal("constraints", "constraintstext", "constraints_text");
      const examplesText = getVal("examples", "examplestext", "examples_text", "walkthrough");

      const sampleInput = getVal("sampleinput", "sample_input", "samplein");
      const sampleOutput = getVal("sampleoutput", "sample_output", "sampleout");
      const hiddenInput = getVal("hiddeninput", "hidden_input", "hiddenin");
      const hiddenOutput = getVal("hiddenoutput", "hidden_output", "hiddenout");

      const sampleTestCases = sampleInput
        ? [{ input_data: sampleInput, expected_output: sampleOutput || "", is_sample: true }]
        : [];
      const hiddenTestCases = hiddenInput
        ? [{ input_data: hiddenInput, expected_output: hiddenOutput || "", is_sample: false }]
        : [];

      questions.push({
        id: Date.now() + rowIndex,
        type: "coding",
        title,
        statement: problemStatement,
        difficulty,
        marks,
        inputFormat,
        outputFormat,
        constraintsText,
        examplesText,
        sampleInput,
        sampleOutput,
        hiddenInput,
        hiddenOutput,
        sampleTestCases,
        hiddenTestCases
      });
    }
  }

  return {
    questions,
    errors,
    total: questions.length,
    mcqCount: questions.filter((q) => q.type === "mcq").length,
    codingCount: questions.filter((q) => q.type === "coding").length
  };
}

/**
 * Generates and triggers browser download of a sample CSV file
 */
export function downloadSampleCsv(type = "mixed") {
  let filename = "sample_questions.csv";
  let content = "";

  if (type === "mcq") {
    filename = "sample_mcq_questions.csv";
    content = [
      "type,question,option_a,option_b,option_c,option_d,correct_option,marks,negative_marks",
      '"mcq","What is the average time complexity of searching in a Hash Table?","O(1)","O(n)","O(log n)","O(n^2)","A",1,0',
      '"mcq","Which data structure follows the LIFO (Last In First Out) principle?","Queue","Stack","Array","Linked List","B",2,1',
      '"mcq","Which sorting algorithm has best-case time complexity of O(n)?","Quick Sort","Merge Sort","Bubble Sort with flag","Selection Sort","C",1,0',
      '"mcq","In C++, what is a pointer that points to nothing called?","Void pointer","Dangling pointer","Null pointer","Wild pointer","C",1,0'
    ].join("\n");
  } else if (type === "coding") {
    filename = "sample_coding_questions.csv";
    content = [
      "type,title,statement,difficulty,marks,input_format,output_format,constraints,sample_input,sample_output,hidden_input,hidden_output",
      '"coding","Two Sum","Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.","easy",10,"First line contains N and Target. Second line contains N integers.","Print the two space-separated indices.","2 <= N <= 10^4, -10^9 <= nums[i] <= 10^9","4 9\n2 7 11 15","0 1","5 20\n3 5 8 12 17","2 3"',
      '"coding","Reverse a String","Write a function that reverses a given string in-place without using built-in reverse helpers.","easy",10,"A single string S without spaces.","Reversed string S.","1 <= length(S) <= 10^5","hello","olleh","codexa","axedoc"',
      '"coding","Valid Parentheses","Given a string containing just the characters (), {}, [], determine if the input string is valid.","medium",15,"Single line with bracket string.","true or false","1 <= S.length <= 10^4","()[]{}","true","(]","false"'
    ].join("\n");
  } else {
    // Mixed
    filename = "sample_mixed_assessment_questions.csv";
    content = [
      "type,title,statement,difficulty,marks,option_a,option_b,option_c,option_d,correct_option,input_format,output_format,sample_input,sample_output,hidden_input,hidden_output",
      '"mcq","Time Complexity of Binary Search","What is the worst-case time complexity of Binary Search?","easy",1,"O(1)","O(n)","O(log n)","O(n log n)","C","","","","","",""',
      '"mcq","HTTP Status Code 404","What does HTTP status code 404 signify?","easy",1,"Internal Server Error","Not Found","Unauthorized","Bad Request","B","","","","","",""',
      '"coding","Palindrome Check","Determine whether an input string reads the same forwards and backwards.","easy",10,"","","","","","Single string S","true or false","racecar","true","python","false"',
      '"coding","Max Subarray Sum","Find the maximum sum of a contiguous subarray using Kadane\'s Algorithm.","medium",15,"","","","","","N followed by array elements","Maximum sum integer","5\n-2 1 -3 4 -1","4","4\n1 2 3 4","10"'
    ].join("\n");
  }

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
