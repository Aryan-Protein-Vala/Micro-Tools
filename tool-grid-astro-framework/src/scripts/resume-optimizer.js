// Dictionary of weak verbs to strong action verbs by category/industry
const weakToStrong = {
  // Common general verbs
  "helped": ["facilitated", "collaborated with", "partnered with", "championed", "supported"],
  "made": ["engineered", "formulated", "constructed", "pioneered", "implemented"],
  "fixed": ["rectified", "resolved", "debugged", "restructured", "optimized"],
  "worked on": ["spearheaded", "executed", "driven", "architected", "conducted"],
  "looked after": ["managed", "overlooked", "administered", "supervised", "stewarded"],
  "did": ["executed", "implemented", "orchestrated", "engineered", "completed"],
  "wrote": ["authored", "drafted", "constructed", "compiled", "composed"],
  "ran": ["orchestrated", "administered", "steered", "directed", "executed"],
  "changed": ["transformed", "modernized", "overhauled", "revamped", "restructured"],
  "improved": ["enhanced", "optimized", "amplified", "boosted", "maximised"],
  "led": ["spearheaded", "orchestrated", "guided", "directed", "piloted"],
  "used": ["leveraged", "utilized", "deployed", "implemented", "harnessed"],
  "kept": ["maintained", "safeguarded", "sustained", "monitored", "preserved"],
  "saved": ["curtailed", "conserved", "reclaimed", "economized", "mitigated"],
  "showed": ["demonstrated", "illustrated", "projected", "exhibited", "revealed"],
  "talked to": ["consulted with", "liaised with", "negotiated with", "collaborated with", "served as liaison for"],
  "thought of": ["conceived", "formulated", "devised", "conceptualized", "originated"]
};

// Industry specific buzzwords & outcome phrases
const industryBuzz = {
  tech: {
    verbs: ["architected", "refactored", "engineered", "containerized", "deployed", "scaled"],
    metrics: [
      "reducing latency by 35% and improving API throughput",
      "maximizing system availability to 99.9% uptime",
      "decreasing bug density by 40% across major product releases",
      "optimizing database query performance and database indexing",
      "modernizing legacy codebases into highly modular architectures",
      "improving page load speed by 2.4s to enhance user engagement"
    ],
    context: ["leveraging modern cloud-native architectures", "utilizing microservices and CI/CD pipelines", "deploying cross-functional agile methodologies", "following industry-standard clean code principles"]
  },
  finance: {
    verbs: ["forecasted", "analyzed", "leveraged", "structured", "modeled", "audited"],
    metrics: [
      "driving a 15% improvement in portfolio yields",
      "mitigating market risk exposure through quantitative analysis",
      "saving $45K in annual operational overhead",
      "identifying cost-saving opportunities worth 12% of total budget",
      "ensuring 100% compliance with SEC and regional regulatory guidelines",
      "streamlining accounting ledger reconciliation cycles by 4 days"
    ],
    context: ["utilizing advanced valuation models", "conducting comprehensive risk audits", "presenting data-driven findings to executive steering committees", "leveraging predictive financial modeling frameworks"]
  },
  marketing: {
    verbs: ["spearheaded", "optimized", "capitalized", "cultivated", "campaigned", "monetized"],
    metrics: [
      "boosting customer acquisition rates by 28% year-over-year",
      "driving an average of 4.2x ROI on paid advertising spend",
      "increasing organic traffic by 85% through SEO optimization",
      "reclaiming lost pipeline leads and reducing churn by 8%",
      "expanding social media presence and brand engagement by 50%",
      "scaling high-value inbound B2B lead generation funnels"
    ],
    context: ["deploying targeted multi-channel campaigns", "running data-driven A/B testing frameworks", "segmenting audience bases for hyper-personalized messaging", "analyzing user behaviors via analytics suites"]
  },
  ops: {
    verbs: ["orchestrated", "streamlined", "overhauled", "standardized", "implemented", "negotiated"],
    metrics: [
      "improving supply chain logistics throughput by 18%",
      "cutting project delivery lead times by 2 weeks",
      "optimizing resource utilization across multiple departments",
      "reducing supply chain vendor costs by 12% through contract renegotiation",
      "boosting employee productivity scores by 25%",
      "reducing customer response times by 30% via new ticketing workflows"
    ],
    context: ["establishing robust Standard Operating Procedures (SOPs)", "leading cross-departmental operations initiatives", "implementing Six Sigma lean process design", "overseeing lifecycle management of operational assets"]
  },
  healthcare: {
    verbs: ["administered", "coordinated", "optimized", "implemented", "evaluated", "facilitated"],
    metrics: [
      "reducing patient wait times by 20% while maintaining care quality",
      "ensuring strict adherence to HIPAA compliance guidelines",
      "improving patient satisfaction scores by 15%",
      "optimizing clinical resource allocation across wards",
      "streamlining electronic health records (EHR) entry procedures",
      "enhancing accuracy rates in clinical diagnostics documentation"
    ],
    context: ["collaborating with multidisciplinary healthcare teams", "prioritizing evidence-based clinical protocols", "adhering to rigorous safety and quality standards", "providing patient-centric operational support"]
  },
  general: {
    verbs: ["orchestrated", "managed", "spearheaded", "transformed", "engineered", "facilitated"],
    metrics: [
      "resulting in a significant increase in overall productivity",
      "enhancing workflow efficiency and output consistency",
      "driving project completion 10% ahead of schedule",
      "saving internal teams hours of repetitive manual efforts",
      "strengthening business infrastructure and operational standards",
      "achieving key performance indicators (KPIs) set by management"
    ],
    context: ["utilizing collaborative cross-functional strategies", "implementing structured action frameworks", "aligning business goals with execution excellence", "leveraging feedback loops for continuous improvement"]
  }
};

export function setupUI() {
  const btnOptimize = document.getElementById('btn-optimize');
  const bulletInput = document.getElementById('bullet-input');
  const industrySelect = document.getElementById('industry-select');
  const resultsContainer = document.getElementById('results-container');
  const resultsList = document.getElementById('results-list');
  const examplesDiv = document.getElementById('examples');

  if (!btnOptimize || !bulletInput) return;

  // Handle Example buttons
  examplesDiv?.addEventListener('click', (e) => {
    const btn = e.target.closest('.example-btn');
    if (btn) {
      bulletInput.value = btn.textContent;
      bulletInput.focus();
    }
  });

  btnOptimize.addEventListener('click', () => {
    const rawText = bulletInput.value.trim();
    if (!rawText) {
      alert("Please enter a resume bullet first.");
      return;
    }

    const industry = industrySelect?.value || 'general';
    const variations = generateVariations(rawText, industry);

    if (resultsList) {
      resultsList.innerHTML = '';
      variations.forEach((v, index) => {
        const item = document.createElement('div');
        item.className = "p-4 bg-black/40 border border-border rounded-lg flex items-start justify-between gap-4 group hover:border-accent/50 transition-colors";
        item.innerHTML = `
          <div class="flex-1 text-sm text-foreground leading-relaxed font-medium">
            ${v}
          </div>
          <button class="copy-btn p-2 bg-muted hover:bg-accent hover:text-accent-foreground rounded text-xs transition-colors shrink-0 flex items-center gap-1" data-text="${v.replace(/"/g, '&quot;')}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
            Copy
          </button>
        `;
        resultsList.appendChild(item);
      });
    }

    resultsContainer?.classList.remove('hidden');
    resultsContainer?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Handle Copy buttons inside results
  resultsList?.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn) {
      const text = copyBtn.getAttribute('data-text');
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = `
            <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            Copied!
          `;
          copyBtn.classList.remove('bg-muted');
          copyBtn.classList.add('bg-green-500/20', 'text-green-500');
          setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.classList.add('bg-muted');
            copyBtn.classList.remove('bg-green-500/20', 'text-green-500');
          }, 2000);
        });
      }
    }
  });
}

function generateVariations(text, industry) {
  // Clean up input
  let cleaned = text.replace(/^[\s•\-\*]+/, '').trim();
  
  // Extract verbs and core statement details
  const words = cleaned.toLowerCase().split(/\s+/);
  let detectedWeakVerb = null;
  let detectedWeakVerbKey = null;

  // Scan input for weak verbs
  for (const key in weakToStrong) {
    const regex = new RegExp(`\\b${key}(?:ed|d|ing|s)?\\b`, 'i');
    const match = cleaned.match(regex);
    if (match) {
      detectedWeakVerb = match[0];
      detectedWeakVerbKey = key;
      break;
    }
  }

  // Fallback to random strong verbs for the industry if none detected
  const indVerbs = industryBuzz[industry]?.verbs || industryBuzz['general'].verbs;
  const indMetrics = industryBuzz[industry]?.metrics || industryBuzz['general'].metrics;
  const indContext = industryBuzz[industry]?.context || industryBuzz['general'].context;

  // Extract what comes after the verb (the "what")
  let remainder = cleaned;
  if (detectedWeakVerb) {
    const idx = cleaned.toLowerCase().indexOf(detectedWeakVerb.toLowerCase());
    if (idx !== -1) {
      remainder = cleaned.slice(idx + detectedWeakVerb.length).trim();
      // clean leading connector words like "to", "the", "on", "with"
      remainder = remainder.replace(/^(to\s+|the\s+|on\s+|with\s+|about\s+|a\s+|an\s+)/i, '').trim();
    }
  }

  // Capitalize remainder nicely
  remainder = remainder.charAt(0).toLowerCase() + remainder.slice(1);

  // Generate 5 distinct variation strategies
  const variations = [];

  // Strategy 1: The Strong Action Verb Replacement
  const strongVerbs1 = detectedWeakVerbKey ? weakToStrong[detectedWeakVerbKey] : indVerbs;
  const verb1 = capitalize(strongVerbs1[0 % strongVerbs1.length]);
  variations.push(`${verb1} ${remainder}, leading to improved team outcomes and operational workflow enhancements.`);

  // Strategy 2: Value/Metric Outcome Focus
  const verb2 = capitalize(strongVerbs1[1 % strongVerbs1.length] || indVerbs[1]);
  variations.push(`${verb2} ${remainder}, ${indMetrics[0 % indMetrics.length]}.`);

  // Strategy 3: Context-Rich Enterprise Restructure
  const verb3 = capitalize(strongVerbs1[2 % strongVerbs1.length] || indVerbs[2]);
  variations.push(`${verb3} ${remainder} by ${indContext[0 % indContext.length]}, ${indMetrics[1 % indMetrics.length]}.`);

  // Strategy 4: High-impact Ownership Framework
  const verb4 = capitalize(indVerbs[3 % indVerbs.length]);
  variations.push(`${verb4} and optimized the execution of ${remainder}, ${indMetrics[2 % indMetrics.length]}.`);

  // Strategy 5: Strategic Methodological Implementation
  const verb5 = capitalize(strongVerbs1[3 % strongVerbs1.length] || indVerbs[4 % indVerbs.length]);
  variations.push(`${verb5} high-performance strategies targeting ${remainder} while ${indContext[1 % indContext.length]}, ${indMetrics[3 % indMetrics.length]}.`);

  return variations;
}

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
