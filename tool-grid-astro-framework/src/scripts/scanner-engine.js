// ResumeRadar — ATS Keyword Matching Engine
// 100% client-side, zero server dependencies

const COMMON_STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','shall',
  'can','need','must','this','that','these','those','i','me','my','we','our',
  'you','your','he','she','it','they','them','their','its','not','no','so',
  'if','then','than','too','very','just','about','above','after','again','all',
  'also','am','any','as','because','before','between','both','each','few',
  'get','got','here','how','into','more','most','new','now','only','other',
  'out','over','own','same','some','such','up','us','what','when','where',
  'which','while','who','whom','why','work','working','worked','experience',
  'responsible','ability','able','etc','via','per','using','used','use',
  'looking','senior','junior','strong','required','preferred','knowledge',
  'including','requirements','qualifications','skills','required.',
  'preferred.','years','minimum','plus','like','well','within',
  'across','role','position','team','company','join','great',
  'help','ensure','build','create','develop','manage','lead',
  'support','provide','maintain','implement','design','expertise',
  'understanding','familiarity','proficiency','hands-on','proven',
  'excellent','good','key','based','related','relevant','degree',
  'bachelor','master','computing','engineering','science','technology'
]);

const SKILL_SYNONYMS = {
  'javascript': ['js', 'ecmascript', 'es6', 'es2015', 'node.js', 'nodejs'],
  'typescript': ['ts'],
  'python': ['py', 'python3'],
  'machine learning': ['ml', 'deep learning', 'neural networks'],
  'artificial intelligence': ['ai'],
  'amazon web services': ['aws'],
  'google cloud platform': ['gcp', 'google cloud'],
  'microsoft azure': ['azure'],
  'continuous integration': ['ci', 'ci/cd', 'cicd'],
  'continuous deployment': ['cd', 'ci/cd', 'cicd'],
  'kubernetes': ['k8s'],
  'docker': ['containerization', 'containers'],
  'react': ['reactjs', 'react.js'],
  'angular': ['angularjs', 'angular.js'],
  'vue': ['vuejs', 'vue.js'],
  'next.js': ['nextjs', 'next'],
  'postgresql': ['postgres', 'psql'],
  'mongodb': ['mongo'],
  'sql': ['mysql', 'mssql', 'tsql', 'plsql'],
  'rest api': ['restful', 'rest apis', 'restful api'],
  'graphql': ['gql'],
  'agile': ['scrum', 'kanban', 'sprint'],
  'project management': ['pm', 'program management'],
  'team lead': ['team leader', 'led team', 'leading team', 'team leadership'],
  'data analysis': ['data analytics', 'data analyst'],
  'user experience': ['ux', 'ux design'],
  'user interface': ['ui', 'ui design'],
  'search engine optimization': ['seo'],
  'content management': ['cms'],
  'customer relationship management': ['crm'],
  'devops': ['dev ops', 'development operations'],
};

function extractKeywords(text) {
  const lower = text.toLowerCase();
  const multiWord = [];
  const sortedKeys = Object.keys(SKILL_SYNONYMS).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const allTerms = [key, ...SKILL_SYNONYMS[key]];
    for (const term of allTerms) {
      if (lower.includes(term)) {
        multiWord.push(key);
        break;
      }
    }
  }
  const cleaned = lower.replace(/[^a-z0-9\s\+\#\.\/-]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(/\s+/)
    .map(w => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))  // strip trailing punctuation
    .filter(w => w.length > 1 && !COMMON_STOP_WORDS.has(w));
  const freq = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }
  // Only create meaningful bigrams (both words 3+ chars, not stop words)
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i].length >= 3 && words[i+1].length >= 3) {
      const bi = words[i] + ' ' + words[i + 1];
      freq[bi] = (freq[bi] || 0) + 1;
    }
  }
  const allKeywords = [...new Set([...multiWord, ...Object.keys(freq)])];
  return { keywords: allKeywords, freq };
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function findSynonymKey(term) {
  const lower = term.toLowerCase();
  for (const [key, syns] of Object.entries(SKILL_SYNONYMS)) {
    if (key === lower || syns.includes(lower)) return key;
  }
  return null;
}

export function analyzeMatch(resumeText, jobText) {
  if (!resumeText.trim() || !jobText.trim()) return null;
  const resume = extractKeywords(resumeText);
  const job = extractKeywords(jobText);
  const resumeLower = resumeText.toLowerCase();
  const matched = [];
  const missing = [];
  const partial = [];
  const jobImportant = job.keywords.filter(k => {
    if (COMMON_STOP_WORDS.has(k)) return false;
    return (job.freq[k] || 0) >= 1;
  });
  // Prioritize single-word skills and known multi-word terms, limit bigrams
  const singleWords = jobImportant.filter(k => !k.includes(' '));
  const multiWords = jobImportant.filter(k => k.includes(' '));
  const meaningfulMulti = multiWords.filter(k => {
    // Keep known skill synonyms and high-frequency bigrams
    return findSynonymKey(k) || (job.freq[k] || 0) >= 2;
  });
  const topKeywords = [...singleWords, ...meaningfulMulti]
    .sort((a, b) => (job.freq[b] || 0) - (job.freq[a] || 0))
    .slice(0, 30);

  for (const kw of topKeywords) {
    const kwLower = kw.toLowerCase();
    if (resumeLower.includes(kwLower)) {
      matched.push({ keyword: kw, count: job.freq[kw] || 1, type: 'exact' });
      continue;
    }
    const synKey = findSynonymKey(kw);
    if (synKey) {
      const allTerms = [synKey, ...(SKILL_SYNONYMS[synKey] || [])];
      const found = allTerms.find(t => resumeLower.includes(t));
      if (found) {
        partial.push({ keyword: kw, count: job.freq[kw] || 1, matchedAs: found, type: 'synonym' });
        continue;
      }
    }
    let fuzzyMatch = null;
    for (const rk of resume.keywords) {
      if (rk.length > 2 && kw.length > 2) {
        const dist = levenshtein(kw.toLowerCase(), rk.toLowerCase());
        const maxLen = Math.max(kw.length, rk.length);
        if (dist / maxLen < 0.25) {
          fuzzyMatch = rk;
          break;
        }
      }
    }
    if (fuzzyMatch) {
      partial.push({ keyword: kw, count: job.freq[kw] || 1, matchedAs: fuzzyMatch, type: 'fuzzy' });
    } else {
      missing.push({ keyword: kw, count: job.freq[kw] || 1 });
    }
  }
  const total = matched.length + missing.length + partial.length;
  const score = total > 0 ? Math.round(((matched.length + partial.length * 0.5) / total) * 100) : 0;
  const suggestions = missing
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((m, i) => ({
      text: `Add "${m.keyword}" — mentioned ${m.count}x in job description`,
      priority: m.count >= 3 ? 'HIGH' : m.count >= 2 ? 'MEDIUM' : 'LOW'
    }));
  partial.forEach(p => {
    if (p.type === 'synonym') {
      suggestions.push({
        text: `Replace "${p.matchedAs}" with "${p.keyword}" for exact ATS match`,
        priority: 'MEDIUM'
      });
    }
  });

  return {
    score,
    matched: matched.sort((a, b) => b.count - a.count),
    missing: missing.sort((a, b) => b.count - a.count),
    partial: partial.sort((a, b) => b.count - a.count),
    suggestions: suggestions.slice(0, 10),
    totalKeywords: total,
    resumeWordCount: resumeText.split(/\s+/).length,
    jobWordCount: jobText.split(/\s+/).length,
  };
}
