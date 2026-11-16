// Rule-based ATS resume analyzer.
// Pure functions only: no I/O, so it is easy to test and reuse.
//
// Score (100 points):
//   Contact information ........ 10
//   Resume sections ............ 20
//   Content quality ............ 20
//   Skills & keywords .......... 30
//   Length & formatting ........ 20

// ---------------------------------------------------------------------------
// Skill dictionary: [display name, ...aliases]
// ---------------------------------------------------------------------------
const SKILL_GROUPS = {
  'Programming Languages': [
    ['JavaScript', 'javascript', 'js', 'ecmascript', 'es6'],
    ['TypeScript', 'typescript'],
    ['Python', 'python'],
    ['Java', 'java'],
    ['C++', 'c++'],
    ['C#', 'c#'],
    ['PHP', 'php'],
    ['Ruby', 'ruby'],
    ['Go', 'golang'],
    ['Rust', 'rust'],
    ['Kotlin', 'kotlin'],
    ['Swift', 'swift'],
    ['Dart', 'dart'],
    ['Scala', 'scala'],
    ['SQL', 'sql', 'pl/sql'],
    ['HTML', 'html', 'html5'],
    ['CSS', 'css', 'css3']
  ],
  'Frontend': [
    ['React', 'react', 'reactjs', 'react.js'],
    ['Next.js', 'next.js', 'nextjs'],
    ['Vue.js', 'vue', 'vue.js', 'vuejs'],
    ['Angular', 'angular', 'angularjs'],
    ['Redux', 'redux'],
    ['Tailwind CSS', 'tailwind', 'tailwindcss', 'tailwind css'],
    ['Bootstrap', 'bootstrap'],
    ['jQuery', 'jquery'],
    ['Sass', 'sass', 'scss'],
    ['Responsive Design', 'responsive design', 'responsive web design']
  ],
  'Backend': [
    ['Node.js', 'node.js', 'nodejs', 'node'],
    ['Express', 'express', 'express.js', 'expressjs'],
    ['Django', 'django'],
    ['Flask', 'flask'],
    ['FastAPI', 'fastapi'],
    ['Spring Boot', 'spring boot', 'springboot', 'spring'],
    ['.NET', '.net', 'asp.net', 'dotnet'],
    ['REST APIs', 'rest', 'restful', 'rest api', 'rest apis', 'restful api', 'restful apis'],
    ['GraphQL', 'graphql'],
    ['Microservices', 'microservices', 'microservice'],
    ['Authentication', 'jwt', 'oauth', 'authentication']
  ],
  'Databases': [
    ['MongoDB', 'mongodb', 'mongo', 'mongoose'],
    ['MySQL', 'mysql'],
    ['PostgreSQL', 'postgresql', 'postgres'],
    ['SQLite', 'sqlite'],
    ['Redis', 'redis'],
    ['Firebase', 'firebase', 'firestore'],
    ['DynamoDB', 'dynamodb'],
    ['Elasticsearch', 'elasticsearch'],
    ['Oracle', 'oracle']
  ],
  'Cloud & DevOps': [
    ['AWS', 'aws', 'amazon web services'],
    ['Azure', 'azure'],
    ['Google Cloud', 'gcp', 'google cloud'],
    ['Docker', 'docker'],
    ['Kubernetes', 'kubernetes', 'k8s'],
    ['CI/CD', 'ci/cd', 'cicd', 'continuous integration', 'continuous deployment'],
    ['Jenkins', 'jenkins'],
    ['GitHub Actions', 'github actions'],
    ['Terraform', 'terraform'],
    ['Linux', 'linux', 'unix'],
    ['Nginx', 'nginx']
  ],
  'Data & AI': [
    ['Machine Learning', 'machine learning', 'ml'],
    ['Deep Learning', 'deep learning'],
    ['NLP', 'nlp', 'natural language processing'],
    ['TensorFlow', 'tensorflow'],
    ['PyTorch', 'pytorch'],
    ['Pandas', 'pandas'],
    ['NumPy', 'numpy'],
    ['scikit-learn', 'scikit-learn', 'sklearn'],
    ['Data Analysis', 'data analysis', 'data analytics'],
    ['Power BI', 'power bi', 'powerbi'],
    ['Tableau', 'tableau'],
    ['Excel', 'excel', 'ms excel', 'microsoft excel'],
    ['Statistics', 'statistics', 'statistical analysis']
  ],
  'Tools & Practices': [
    ['Git', 'git'],
    ['GitHub', 'github'],
    ['Jira', 'jira'],
    ['Agile', 'agile'],
    ['Scrum', 'scrum'],
    ['Postman', 'postman'],
    ['Figma', 'figma'],
    ['Unit Testing', 'unit testing', 'jest', 'mocha', 'junit', 'pytest', 'unit tests'],
    ['TDD', 'tdd', 'test driven development'],
    ['Webpack', 'webpack'],
    ['Vite', 'vite'],
    ['Data Structures & Algorithms', 'data structures', 'algorithms', 'dsa'],
    ['OOP', 'oop', 'object oriented', 'object-oriented']
  ],
  'Soft Skills': [
    ['Communication', 'communication', 'communicator'],
    ['Leadership', 'leadership', 'led a team', 'team lead'],
    ['Teamwork', 'teamwork', 'team player', 'collaboration', 'collaborative'],
    ['Problem Solving', 'problem solving', 'problem-solving'],
    ['Time Management', 'time management'],
    ['Critical Thinking', 'critical thinking', 'analytical'],
    ['Adaptability', 'adaptability', 'adaptable', 'quick learner'],
    ['Project Management', 'project management']
  ]
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

// Matches a term only when it is not glued to other word characters
// (so "java" does not match "javascript" and "go" does not match "google").
const termRegex = (terms) =>
  new RegExp(
    `(?<![a-z0-9+#.])(?:${terms.map(escapeRegex).join('|')})(?![a-z0-9+#])`,
    'i'
  )

const SKILLS = []
const ALIAS_SET = new Set()

for (const [category, entries] of Object.entries(SKILL_GROUPS)) {
  for (const [name, ...aliases] of entries) {
    aliases.forEach((a) => ALIAS_SET.add(a.toLowerCase()))
    SKILLS.push({
      name,
      category,
      soft: category === 'Soft Skills',
      regex: termRegex(aliases)
    })
  }
}

// ---------------------------------------------------------------------------
// Resume sections
// ---------------------------------------------------------------------------
const SECTION_PATTERNS = {
  summary: /^(?:(?:professional|career|executive) )?(?:summary|profile|objective)(?: statement)?$|^about(?: me)?$/,
  experience: /^(?:(?:work|professional|relevant|industry|internship) )?experience$|^employment(?: history)?$|^work history$|^internships?$/,
  education: /^education(?:al)?(?: background| qualifications?| details)?$|^academic(?: background| qualifications?| details)?$|^qualifications?$/,
  skills: /^(?:(?:technical|core|key|professional) )?(?:skills|competencies)(?: summary)?$|^technologies$|^tech stack$|^skills (?:and|&) (?:tools|technologies)$|^technical expertise$|^tools (?:and|&) technologies$/,
  projects: /^(?:(?:academic|personal|key|major|side) )?projects?$/,
  certifications: /^(?:certifications?|licenses (?:and|&) certifications?|courses|training|achievements|awards|awards (?:and|&) achievements|honou?rs (?:and|&) awards)$/
}

const detectSections = (lines) => {
  const found = {}
  for (const line of lines) {
    if (line.length > 45) continue
    const normalized = line
      .toLowerCase()
      .replace(/^[^a-z]+|[^a-z]+$/g, '')
      .replace(/\s+/g, ' ')
    if (!normalized) continue
    for (const [key, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (!found[key] && pattern.test(normalized)) found[key] = true
    }
  }
  return found
}

// ---------------------------------------------------------------------------
// Language helpers
// ---------------------------------------------------------------------------
const ACTION_VERBS = new Set([
  'achieved', 'accelerated', 'administered', 'analyzed', 'analysed', 'architected', 'automated',
  'boosted', 'built', 'collaborated', 'configured', 'constructed', 'coordinated', 'created',
  'debugged', 'delivered', 'deployed', 'designed', 'developed', 'directed', 'documented', 'drove',
  'engineered', 'enhanced', 'established', 'evaluated', 'executed', 'generated', 'implemented',
  'improved', 'increased', 'initiated', 'integrated', 'launched', 'led', 'maintained', 'managed',
  'mentored', 'migrated', 'modernized', 'monitored', 'optimized', 'optimised', 'orchestrated',
  'organized', 'organised', 'owned', 'planned', 'presented', 'produced', 'published', 'reduced',
  'refactored', 'researched', 'resolved', 'scaled', 'secured', 'spearheaded', 'streamlined',
  'supervised', 'tested', 'trained', 'transformed', 'upgraded', 'wrote'
])

const WEAK_PHRASES = [
  'responsible for', 'worked on', 'helped with', 'duties included', 'tasked with', 'assisted in'
]

const STOPWORDS = new Set((
  'about above after again also among and any are around because been before being below between both ' +
  'but can could did does doing down during each either else ensure even every few for from further had ' +
  'has have having her here him his how into its itself just keep like made make many may more most much ' +
  'must need needs not now off once one only other our out over own per same shall should since some such ' +
  'than that the their them then there these they this those through too under until upon use used using ' +
  'very want was were what when where which while who whom why will with within without would you your ' +
  'ability able across additional apply applicants applicant bonus candidate candidates company ' +
  'competitive degree description duties environment equivalent excellent experience experienced ' +
  'good great including job join knowledge looking opportunity opportunities passionate plus position ' +
  'preferred qualifications related relevant required requirements responsibilities responsible role ' +
  'skills solid strong team teams understanding work working years year ideal familiarity proven ' +
  'demonstrated etc well based high new best help support provide providing'
).split(' '))

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const PHONE_RE = /\+?\d[\d\s().-]{8,}\d/g
const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?'
const DATE_RANGE_RE = new RegExp(
  `(?:19|20)\\d{2}\\s*(?:-|–|—|to)\\s*(?:${MONTH}\\s*)?(?:(?:19|20)\\d{2}|present|current|ongoing|now)`,
  'i'
)
const QUANTIFIED_RE =
  /\d+(?:\.\d+)?\s?%|[$₹€£]\s?\d|\b\d{1,3}(?:,\d{2,3})+\b|\b\d+\s?(?:\+|x|k|m)\b|\b\d{2,}\s+(?:users|customers|clients|projects|members|requests|records|students|applications|engineers|developers)/i
const BULLET_RE = /^[•●▪◦‣▫■·*\-–—]\s*\S/

const containsTerm = (lowerText, term) => termRegex([term]).test(lowerText)

const normalizeText = (text) =>
  String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

// ---------------------------------------------------------------------------
// Check / category builders
// ---------------------------------------------------------------------------
const makeCheck = (label, points, max, note, tip) => ({
  label,
  points,
  max,
  status: points >= max ? 'pass' : points <= 0 ? 'fail' : 'partial',
  note,
  tip: points >= max ? null : tip
})

const makeCategory = (key, label, checks) => ({
  key,
  label,
  score: checks.reduce((sum, c) => sum + c.points, 0),
  max: checks.reduce((sum, c) => sum + c.max, 0),
  checks
})

const ratioPoints = (value, target, max) =>
  Math.round(Math.min(1, Math.max(0, value / target)) * max)

// ---------------------------------------------------------------------------
// Job description keyword extraction
// ---------------------------------------------------------------------------
const extractJobKeywords = (jobDescription) => {
  const jdLower = jobDescription.toLowerCase()

  const skills = SKILLS.filter((s) => !s.soft && s.regex.test(jdLower)).map((s) => s.name)

  const tokens = jdLower.match(/[a-z][a-z0-9+#]*(?:[.\-][a-z0-9+#]+)*/g) || []
  const freq = new Map()
  for (const token of tokens) {
    if (token.length < 4 || STOPWORDS.has(token) || ALIAS_SET.has(token)) continue
    freq.set(token, (freq.get(token) || 0) + 1)
  }

  const keywords = [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word)

  return { skills, keywords }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export const analyzeResume = ({ text, pages = null, jobDescription = '' }) => {
  const clean = normalizeText(text)
  const lower = clean.toLowerCase()
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean)
  const wordCount = clean.split(/\s+/).filter(Boolean).length
  const jd = normalizeText(jobDescription)

  // ---- 1. Contact information (10) --------------------------------------
  const hasEmail = EMAIL_RE.test(clean)
  const hasPhone = (clean.match(PHONE_RE) || []).some((m) => {
    const digits = m.replace(/\D/g, '')
    const onlyYears = /^(?:(?:19|20)\d{2}[\s.-]*)+$/.test(m.trim())
    return !onlyYears && digits.length >= 10 && digits.length <= 13
  })
  const hasLinkedIn = /linkedin/i.test(clean)
  const hasGithubOrSite = /github|portfolio|https?:\/\/|www\./i.test(clean)

  const contact = makeCategory('contact', 'Contact Information', [
    makeCheck(
      'Email address',
      hasEmail ? 4 : 0, 4,
      hasEmail ? 'Email found.' : 'No email address detected.',
      'Add a professional email address at the top of your resume.'
    ),
    makeCheck(
      'Phone number',
      hasPhone ? 3 : 0, 3,
      hasPhone ? 'Phone number found.' : 'No phone number detected.',
      'Add a phone number so recruiters can reach you quickly.'
    ),
    makeCheck(
      'Online profiles',
      (hasLinkedIn ? 2 : 0) + (hasGithubOrSite ? 1 : 0), 3,
      hasLinkedIn || hasGithubOrSite
        ? `Found: ${[hasLinkedIn && 'LinkedIn', hasGithubOrSite && 'GitHub/portfolio'].filter(Boolean).join(', ')}.`
        : 'No LinkedIn, GitHub or portfolio link detected.',
      'Add your LinkedIn and GitHub/portfolio links (write the visible URL, not just a hyperlink).'
    )
  ])

  // ---- 2. Sections (20) --------------------------------------------------
  const sections = detectSections(lines)
  const hasProjectsOrCerts = Boolean(sections.projects || sections.certifications)

  const sectionsCategory = makeCategory('sections', 'Resume Sections', [
    makeCheck(
      'Work experience section',
      sections.experience ? 6 : sections.projects ? 3 : 0, 6,
      sections.experience
        ? 'Experience section found.'
        : sections.projects
          ? 'No experience heading, but a projects section was found.'
          : 'No experience section detected.',
      'Add a clearly labelled "Experience" section (internships and freelance work count).'
    ),
    makeCheck(
      'Education section',
      sections.education ? 5 : 0, 5,
      sections.education ? 'Education section found.' : 'No education section detected.',
      'Add an "Education" section with your degree, institution and years.'
    ),
    makeCheck(
      'Skills section',
      sections.skills ? 5 : 0, 5,
      sections.skills ? 'Skills section found.' : 'No dedicated skills section detected.',
      'Add a "Skills" section listing your tools and technologies. ATS software scans it first.'
    ),
    makeCheck(
      'Summary / objective',
      sections.summary ? 2 : 0, 2,
      sections.summary ? 'Summary found.' : 'No summary section detected.',
      'Add a 2-3 line "Summary" at the top that targets the role you want.'
    ),
    makeCheck(
      'Projects or certifications',
      hasProjectsOrCerts ? 2 : 0, 2,
      hasProjectsOrCerts ? 'Projects/certifications found.' : 'No projects or certifications section detected.',
      'Add a "Projects" or "Certifications" section to show hands-on proof of your skills.'
    )
  ])

  // ---- 3. Content quality (20) ------------------------------------------
  const words = lower.match(/[a-z]+/g) || []
  const verbsUsed = [...new Set(words.filter((w) => ACTION_VERBS.has(w)))]
  const quantifiedLines = lines.filter((l) => QUANTIFIED_RE.test(l)).length
  const bulletLines = lines.filter((l) => BULLET_RE.test(l)).length
  const weakFound = WEAK_PHRASES.filter((p) => lower.includes(p))

  const content = makeCategory('content', 'Content Quality', [
    makeCheck(
      'Strong action verbs',
      ratioPoints(verbsUsed.length, 8, 8), 8,
      `${verbsUsed.length} different action verbs used${weakFound.length ? `; weak phrases found: "${weakFound.join('", "')}"` : ''}.`,
      'Start bullet points with action verbs like "Built", "Led", "Optimized", "Reduced" instead of "Responsible for" or "Worked on".'
    ),
    makeCheck(
      'Quantified achievements',
      ratioPoints(quantifiedLines, 4, 8), 8,
      `${quantifiedLines} line${quantifiedLines === 1 ? '' : 's'} with measurable results.`,
      'Add numbers to your achievements, e.g. "Reduced load time by 40%" or "Built an app used by 2,000+ students".'
    ),
    makeCheck(
      'Bullet-point formatting',
      bulletLines >= 5 ? 4 : bulletLines >= 2 ? 2 : 0, 4,
      `${bulletLines} bullet point${bulletLines === 1 ? '' : 's'} detected.`,
      'Describe your experience and projects in short bullet points (3-5 per role) instead of long paragraphs.'
    )
  ])

  // ---- 4. Skills & keywords (30) ----------------------------------------
  const skillsFound = SKILLS.filter((s) => s.regex.test(lower))
  const hardSkills = skillsFound.filter((s) => !s.soft)
  const softSkills = skillsFound.filter((s) => s.soft)

  let keywordMatch
  let skillChecks

  const jdTerms = jd ? extractJobKeywords(jd) : { skills: [], keywords: [] }
  const useJobDescription = jdTerms.skills.length + jdTerms.keywords.length >= 3

  if (useJobDescription) {
    const resumeSkillNames = new Set(hardSkills.map((s) => s.name))
    const matchedSkills = jdTerms.skills.filter((s) => resumeSkillNames.has(s))
    const missingSkills = jdTerms.skills.filter((s) => !resumeSkillNames.has(s))
    const matchedWords = jdTerms.keywords.filter((k) => containsTerm(lower, k))
    const missingWords = jdTerms.keywords.filter((k) => !containsTerm(lower, k))

    const totalWeight = 2 * jdTerms.skills.length + jdTerms.keywords.length
    const matchedWeight = 2 * matchedSkills.length + matchedWords.length
    const ratio = totalWeight ? matchedWeight / totalWeight : 0
    const matchPercent = Math.round(ratio * 100)

    keywordMatch = {
      mode: 'job-description',
      matchPercent,
      matched: [...matchedSkills, ...matchedWords],
      missing: [...missingSkills, ...missingWords]
    }

    skillChecks = [
      makeCheck(
        'Job description keyword match',
        Math.round(ratio * 24), 24,
        `${matchPercent}% of the important keywords in the job description appear in your resume.`,
        missingSkills.length || missingWords.length
          ? `Work these missing keywords into your resume where they honestly apply: ${[...missingSkills, ...missingWords].slice(0, 8).join(', ')}.`
          : 'Add more keywords from the job description.'
      ),
      makeCheck(
        'Technical skills listed',
        ratioPoints(hardSkills.length, 6, 6), 6,
        `${hardSkills.length} recognised technical skill${hardSkills.length === 1 ? '' : 's'}.`,
        'List more of your technical skills in a dedicated Skills section.'
      )
    ]
  } else {
    keywordMatch = { mode: 'general', matchPercent: null, matched: [], missing: [] }

    skillChecks = [
      makeCheck(
        'Technical skills listed',
        ratioPoints(hardSkills.length, 10, 24), 24,
        `${hardSkills.length} recognised technical skill${hardSkills.length === 1 ? '' : 's'}.`,
        'List more of your relevant technical skills (languages, frameworks, databases, tools). Paste a job description to check against a specific role.'
      ),
      makeCheck(
        'Soft skills mentioned',
        ratioPoints(softSkills.length, 3, 6), 6,
        `${softSkills.length} soft skill${softSkills.length === 1 ? '' : 's'} mentioned.`,
        'Mention soft skills like teamwork, communication or leadership, ideally backed by an example.'
      )
    ]
  }

  const skillsCategory = makeCategory('skills', 'Skills & Keywords', skillChecks)

  // ---- 5. Length & formatting (20) --------------------------------------
  let wordPoints = 3
  if (wordCount >= 300 && wordCount <= 900) wordPoints = 8
  else if ((wordCount >= 200 && wordCount < 300) || (wordCount > 900 && wordCount <= 1200)) wordPoints = 5
  else if (wordCount < 150) wordPoints = 1

  let pagePoints = 4
  if (pages !== null) pagePoints = pages <= 2 ? 4 : pages === 3 ? 2 : 0

  const oddChars = (clean.match(/[^\x20-\x7E\n\t•–—‘’“”₹€£·●▪◦]/g) || []).length
  const oddRatio = clean.length ? oddChars / clean.length : 0
  const symbolPoints = oddRatio < 0.03 ? 3 : oddRatio < 0.08 ? 1 : 0

  const hasDates = DATE_RANGE_RE.test(clean)
  const pronounCount = (lower.match(/\b(?:i|my|me|myself)\b/g) || []).length

  const format = makeCategory('format', 'Length & Formatting', [
    makeCheck(
      'Resume length',
      wordPoints, 8,
      `${wordCount} words.`,
      wordCount < 300
        ? 'Your resume looks thin. Aim for roughly 300-900 words with details on your projects and experience.'
        : 'Your resume is long. Keep it focused on the most relevant 300-900 words.'
    ),
    makeCheck(
      'Page count',
      pagePoints, 4,
      pages === null ? 'Page count not available for this file type.' : `${pages} page${pages === 1 ? '' : 's'}.`,
      'Keep your resume to 1-2 pages. Recruiters spend only a few seconds on a first scan.'
    ),
    makeCheck(
      'Clean, readable text',
      symbolPoints, 3,
      oddRatio < 0.03 ? 'Text extracted cleanly.' : 'Many special characters or icons were found.',
      'Avoid icons, graphics, tables and multi-column layouts. ATS parsers often turn them into garbled text.'
    ),
    makeCheck(
      'Dates on experience / education',
      hasDates ? 3 : 0, 3,
      hasDates ? 'Date ranges found.' : 'No clear date ranges (e.g. "Jan 2023 - Present") detected.',
      'Add date ranges like "Jan 2023 - Present" to every role, project and degree so the ATS can build your timeline.'
    ),
    makeCheck(
      'Professional tone',
      pronounCount > 5 ? 0 : 2, 2,
      pronounCount > 5 ? `Personal pronouns used ${pronounCount} times.` : 'No excessive personal pronouns.',
      'Remove "I" and "my" from your bullet points. Write in an implied first person, e.g. "Built a REST API".'
    )
  ])

  // ---- Combine ----------------------------------------------------------
  const breakdown = [contact, sectionsCategory, content, skillsCategory, format]
  const score = breakdown.reduce((sum, c) => sum + c.score, 0)

  const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs work' : 'Poor'

  const critical = new Set(['Email address', 'Work experience section', 'Education section', 'Skills section'])
  const suggestions = breakdown
    .flatMap((c) => c.checks)
    .filter((c) => c.status !== 'pass' && c.tip)
    .sort((a, b) => b.max - b.points - (a.max - a.points))
    .slice(0, 8)
    .map((c) => ({
      severity: critical.has(c.label) ? 'critical' : c.status === 'fail' ? 'important' : 'tip',
      title: c.label,
      message: c.tip
    }))

  const groupedSkills = Object.keys(SKILL_GROUPS)
    .map((category) => ({
      category,
      skills: skillsFound.filter((s) => s.category === category).map((s) => s.name)
    }))
    .filter((g) => g.skills.length > 0)

  return {
    score,
    label,
    breakdown,
    suggestions,
    skillsFound: groupedSkills,
    keywordMatch,
    sectionsDetected: {
      summary: Boolean(sections.summary),
      experience: Boolean(sections.experience),
      education: Boolean(sections.education),
      skills: Boolean(sections.skills),
      projects: Boolean(sections.projects),
      certifications: Boolean(sections.certifications)
    },
    stats: {
      wordCount,
      pages,
      actionVerbs: verbsUsed.length,
      quantifiedAchievements: quantifiedLines,
      bulletPoints: bulletLines
    }
  }
}