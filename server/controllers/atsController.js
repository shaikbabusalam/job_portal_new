import zlib from 'zlib';
import mammoth from 'mammoth';
import Job from '../models/Job.js';

const SKILL_GROUPS = {
  Frontend: ['react', 'next.js', 'nextjs', 'vue', 'angular', 'typescript', 'javascript', 'html', 'css', 'tailwind'],
  Backend: ['node.js', 'nodejs', 'express', 'python', 'django', 'flask', 'java', 'spring', 'php', 'go', 'c#', '.net'],
  Database: ['mongodb', 'mongoose', 'sql', 'postgresql', 'mysql', 'redis', 'firebase'],
  'Cloud & DevOps': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'github', 'ci/cd', 'vercel', 'linux'],
  'AI & Data': ['ai', 'llm', 'machine learning', 'data analysis', 'pandas', 'numpy', 'tensorflow', 'pytorch'],
};

const ACTION_VERBS = [
  'built', 'developed', 'designed', 'implemented', 'led', 'created', 'improved',
  'optimized', 'reduced', 'increased', 'launched', 'architected', 'automated',
  'collaborated', 'managed', 'delivered', 'refactored', 'integrated',
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'have', 'will',
  'are', 'you', 'our', 'can', 'all', 'not', 'but', 'work', 'role', 'team',
  'experience', 'skills', 'using', 'used', 'job', 'description', 'ability',
]);

function decodePdfLiteral(str) {
  return str
    .replace(/\\([nrtbf()\\])/g, (_, ch) => {
      if (ch === 'n') return '\n';
      if (ch === 'r') return '\r';
      if (ch === 't') return '\t';
      if (ch === 'b') return '\b';
      if (ch === 'f') return '\f';
      return ch;
    })
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function extractTextFromPdfStream(streamBuf) {
  const raw = streamBuf.toString('latin1');
  const parts = [];

  const tjMatches = raw.matchAll(/\((?:\\.|[^\\()])*\)\s*Tj/g);
  for (const match of tjMatches) {
    const inside = match[0].slice(match[0].indexOf('(') + 1, match[0].lastIndexOf(')'));
    parts.push(decodePdfLiteral(inside));
  }

  const tjArrayMatches = raw.matchAll(/\[(?:\\.|[^\\[\]])*\]\s*TJ/g);
  for (const match of tjArrayMatches) {
    const inside = match[0].slice(match[0].indexOf('[') + 1, match[0].lastIndexOf(']'));
    const strings = inside.matchAll(/\((?:\\.|[^\\()])*\)/g);
    for (const s of strings) {
      parts.push(decodePdfLiteral(s[0].slice(1, -1)));
    }
  }

  return parts.join(' ');
}

function extractPdfTextPureJs(buffer) {
  const latin = buffer.toString('latin1');
  const pageMatches = latin.match(/\/Type\s*\/Page\b/g);
  const pages = pageMatches ? pageMatches.length : null;

  const chunks = [];
  let searchPos = 0;

  while (searchPos < buffer.length) {
    const streamIdx = buffer.indexOf('stream', searchPos);
    if (streamIdx === -1) break;

    let dataStart = streamIdx + 6;
    if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) {
      dataStart += 2;
    } else if (buffer[dataStart] === 0x0a) {
      dataStart += 1;
    }

    const endstreamIdx = buffer.indexOf('endstream', dataStart);
    if (endstreamIdx === -1) break;

    const rawStream = buffer.subarray(dataStart, endstreamIdx);
    let decoded = '';

    try {
      decoded = extractTextFromPdfStream(zlib.inflateSync(rawStream));
    } catch {
      decoded = extractTextFromPdfStream(rawStream);
    }

    if (decoded.trim()) {
      chunks.push(decoded);
    }

    searchPos = endstreamIdx + 9;
  }

  let text = chunks.join('\n').replace(/\s+/g, ' ').trim();

  if (text.length < 20) {
    const printable = latin.replace(/[^\x20-\x7e\r\n]+/g, ' ');
    const words = printable.match(/[A-Za-z][A-Za-z0-9+#./@-]{1,}/g) || [];
    if (words.length >= 10) {
      text = words.join(' ');
    }
  }

  return { text, pages };
}

async function extractResumeText(file) {
  const name = (file.originalname || '').toLowerCase();

  if (name.endsWith('.pdf') || file.mimetype === 'application/pdf') {
    return extractPdfTextPureJs(file.buffer);
  }

  if (
    name.endsWith('.docx') ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return {
      text: parsed.value || '',
      pages: null,
    };
  }

  throw new Error('Unsupported resume format. Please upload a PDF or DOCX file.');
}

function detectSections(text) {
  const lower = text.toLowerCase();
  return {
    summary: /\b(summary|objective|profile|about)\b/.test(lower),
    experience: /\b(experience|work history|employment|internship)\b/.test(lower),
    education: /\b(education|degree|university|college|bachelor|master|b\.?tech)\b/.test(lower),
    skills: /\b(skills|technical skills|technologies|tools|stack)\b/.test(lower),
    projects: /\b(projects|project)\b/.test(lower),
  };
}

function extractSkills(text) {
  const lower = text.toLowerCase();
  const found = [];

  for (const [category, keywords] of Object.entries(SKILL_GROUPS)) {
    const matched = keywords.filter((kw) => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, 'i').test(lower);
    });
    if (matched.length > 0) {
      found.push({ category, skills: matched });
    }
  }

  return found;
}

function computeKeywordMatch(resumeText, jobDescription) {
  const cleanJd = (jobDescription || '').trim();
  if (!cleanJd) {
    return { mode: 'none', matchPercent: 0, matched: [], missing: [] };
  }

  const jdTokens = [
    ...new Set(
      (cleanJd.toLowerCase().match(/[a-z0-9+#.]{2,}/g) || []).filter(
        (token) => !STOP_WORDS.has(token) && !/^\d+$/.test(token)
      )
    ),
  ].slice(0, 35);

  const resumeLower = resumeText.toLowerCase();
  const matched = jdTokens.filter((token) => resumeLower.includes(token));
  const missing = jdTokens.filter((token) => !resumeLower.includes(token));
  const matchPercent =
    jdTokens.length > 0 ? Math.round((matched.length / jdTokens.length) * 100) : 0;

  return {
    mode: 'job-description',
    matchPercent,
    matched,
    missing,
  };
}

function buildSuggestions(stats, sectionsDetected, keywordMatch, skillsFound) {
  const suggestions = [];

  if (!sectionsDetected.summary) {
    suggestions.push({
      severity: 'important',
      title: 'Add a professional summary',
      message: 'Include a 2–3 line summary at the top highlighting your core role, stack, and experience.',
    });
  }

  if (stats.quantifiedAchievements === 0) {
    suggestions.push({
      severity: 'critical',
      title: 'Add measurable impact numbers',
      message: 'Include percentages, time saved, revenue/user impact, or scale metrics in your experience bullets.',
    });
  }

  if (stats.actionVerbs < 3) {
    suggestions.push({
      severity: 'important',
      title: 'Use stronger action verbs',
      message: 'Start bullet points with verbs like Built, Developed, Implemented, Led, or Optimized.',
    });
  }

  if (skillsFound.length === 0) {
    suggestions.push({
      severity: 'critical',
      title: 'List technical skills clearly',
      message: 'Add a dedicated Skills section with relevant languages, frameworks, databases, and tools.',
    });
  }

  if (keywordMatch.mode === 'job-description' && keywordMatch.missing.length > 0) {
    suggestions.push({
      severity: 'tip',
      title: 'Cover missing job keywords',
      message: `Consider weaving accurate terms from the job description into your resume: ${keywordMatch.missing
        .slice(0, 8)
        .join(', ')}.`,
    });
  }

  return suggestions;
}

async function buildAiFeedback(resumeText, jobDescription, keywordMatch) {
  const openJobs = await Job.find({ visible: { $ne: false } })
    .populate('companyId', 'name')
    .limit(5)
    .lean();

  const recommendedJobs = openJobs.map((job) => ({
    jobId: String(job._id),
    title: job.title,
    company: job.companyId?.name || '',
    location: job.location || '',
    reason:
      keywordMatch.matched.length > 0
        ? `Matches skills/keywords such as ${keywordMatch.matched.slice(0, 3).join(', ')}.`
        : 'Open role available on Jobaora that aligns with general software/technical profiles.',
  }));

  const bulletCandidates = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 25 && line.length < 180)
    .slice(0, 2);

  const rewrittenBullets = bulletCandidates.map((line) => ({
    original: line,
    improved: `${line.replace(/^[•\-*]\s*/, '')} — improving efficiency by [X%] and reducing manual effort.`,
  }));

  const strengths = [];
  if (keywordMatch.matched.length > 0) {
    strengths.push(`Matched target keywords: ${keywordMatch.matched.slice(0, 6).join(', ')}.`);
  }
  if (resumeText.length > 200) {
    strengths.push('Resume contains extractable text and substantive content for ATS parsing.');
  }

  const improvements = [];
  if (keywordMatch.missing.length > 0) {
    improvements.push(`Address missing keywords where truthful: ${keywordMatch.missing.slice(0, 6).join(', ')}.`);
  }
  improvements.push('Quantify outcomes in your project and work experience bullets with concrete metrics.');

  return {
    summary: jobDescription
      ? 'Initial tailored feedback generated against the provided job description.'
      : 'Initial resume feedback generated from your uploaded document.',
    strengths,
    improvements,
    rewrittenBullets,
    recommendedJobs,
  };
}

export const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF or DOCX resume file.',
      });
    }

    const { text, pages } = await extractResumeText(req.file);
    const cleanedText = (text || '').replace(/\s+/g, ' ').trim();

    if (!cleanedText || cleanedText.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract readable text from the resume. Please upload a text-based PDF or DOCX.',
      });
    }

    const words = cleanedText.match(/\b[\w+#.]+\b/g) || [];
    const wordCount = words.length;

    const actionVerbs = ACTION_VERBS.reduce((count, verb) => {
      const matches = cleanedText.match(new RegExp(`\\b${verb}\\b`, 'gi'));
      return count + (matches ? matches.length : 0);
    }, 0);

    const quantifiedMatches = cleanedText.match(/\b\d+(\.\d+)?(%|\+|x|k|m)?\b/gi) || [];
    const quantifiedAchievements = quantifiedMatches.length;

    const sectionsDetected = detectSections(text);
    const skillsFound = extractSkills(text);
    const keywordMatch = computeKeywordMatch(text, req.body?.jobDescription || '');

    const sectionCount = Object.values(sectionsDetected).filter(Boolean).length;
    const sectionScore = Math.min(25, sectionCount * 5);
    const contentScore = Math.min(25, Math.round((wordCount / 400) * 25));
    const impactScore = Math.min(25, actionVerbs * 3 + quantifiedAchievements * 3);
    const skillOrKeywordScore =
      keywordMatch.mode === 'job-description'
        ? Math.min(25, Math.round((keywordMatch.matchPercent / 100) * 25))
        : Math.min(25, skillsFound.reduce((sum, g) => sum + g.skills.length * 4, 0));

    const score = Math.min(
      100,
      Math.max(10, sectionScore + contentScore + impactScore + skillOrKeywordScore)
    );

    const label =
      score >= 85
        ? 'Excellent ATS Readiness'
        : score >= 70
        ? 'Good ATS Readiness'
        : score >= 50
        ? 'Fair — Needs Optimization'
        : 'Needs Significant Improvement';

    const breakdown = [
      {
        key: 'sections',
        label: 'Sections & Structure',
        score: sectionScore,
        max: 25,
        checks: [
          {
            label: 'Core resume sections present',
            points: sectionScore,
            max: 25,
            status: sectionScore >= 20 ? 'pass' : sectionScore >= 10 ? 'partial' : 'fail',
            note: `Detected ${sectionCount} of 5 standard sections.`,
          },
        ],
      },
      {
        key: 'impact',
        label: 'Action Verbs & Quantified Impact',
        score: impactScore,
        max: 25,
        checks: [
          {
            label: 'Action verbs & measurable metrics',
            points: impactScore,
            max: 25,
            status: impactScore >= 18 ? 'pass' : impactScore >= 9 ? 'partial' : 'fail',
            note: `${actionVerbs} action verbs and ${quantifiedAchievements} numeric metrics detected.`,
          },
        ],
      },
      {
        key: 'keywords',
        label: keywordMatch.mode === 'job-description' ? 'Job Keyword Alignment' : 'Skills Coverage',
        score: skillOrKeywordScore,
        max: 25,
        checks: [
          {
            label:
              keywordMatch.mode === 'job-description'
                ? 'Job description keyword match'
                : 'Recognized technical skills',
            points: skillOrKeywordScore,
            max: 25,
            status: skillOrKeywordScore >= 18 ? 'pass' : skillOrKeywordScore >= 9 ? 'partial' : 'fail',
            note:
              keywordMatch.mode === 'job-description'
                ? `${keywordMatch.matchPercent}% of target job terms found.`
                : `${skillsFound.reduce((sum, g) => sum + g.skills.length, 0)} skills found across categories.`,
          },
        ],
      },
      {
        key: 'length',
        label: 'Content Depth & Readability',
        score: contentScore,
        max: 25,
        checks: [
          {
            label: 'Resume word count',
            points: contentScore,
            max: 25,
            status: wordCount >= 250 && wordCount <= 1200 ? 'pass' : wordCount >= 100 ? 'partial' : 'fail',
            note: `${wordCount} words extracted.`,
          },
        ],
      },
    ];

    const suggestions = buildSuggestions(
      { wordCount, pages, actionVerbs, quantifiedAchievements },
      sectionsDetected,
      keywordMatch,
      skillsFound
    );

    const analysis = {
      score,
      label,
      stats: {
        wordCount,
        pages,
        actionVerbs,
        quantifiedAchievements,
      },
      sectionsDetected,
      skillsFound,
      keywordMatch,
      suggestions,
      breakdown,
    };

    const wantsAi = String(req.body?.ai || '').toLowerCase() === 'true';
    const aiFeedback = wantsAi
      ? await buildAiFeedback(text, req.body?.jobDescription || '', keywordMatch)
      : null;

    return res.json({
      success: true,
      analysis,
      aiFeedback,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to analyze resume.',
    });
  }
};