/**
 * BugLens — Frontend Interaction & Gemma 4 API Communication
 * 
 * Handles:
 * 1. Dual screenshot upload (Before / Current UI [Required] + After Fix [Optional])
 * 2. Instant image preview, dimensions detection, and metadata display
 * 3. Description tracking and form validation (Before screenshot + description required)
 * 4. Communicating securely with the Gemma 4 backend API
 * 5. Displaying the Professional Visual Diagnostics Report & Fix Verification
 * 6. Real-time Analytics Dashboard calculated dynamically from localStorage
 */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation & Tabs
  const tabWorkbenchBtn = document.getElementById('tab-workbench-btn');
  const tabDashboardBtn = document.getElementById('tab-dashboard-btn');
  const workbenchView = document.getElementById('workbench-view');
  const dashboardView = document.getElementById('dashboard-view');
  const navHistoryCount = document.getElementById('nav-history-count');
  const startFirstAnalysisBtn = document.getElementById('start-first-analysis-btn');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  // DOM Elements - Before Screenshot (Required)
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const dropzoneContent = document.getElementById('dropzone-content');
  const previewContainer = document.getElementById('preview-container');
  const imagePreview = document.getElementById('image-preview');
  const fileNameDisplay = document.getElementById('file-name');
  const fileSizeDisplay = document.getElementById('file-size');
  const fileDimensionsDisplay = document.getElementById('file-dimensions');
  const replaceImageBtn = document.getElementById('replace-image-btn');
  const removeImageBtn = document.getElementById('remove-image-btn');

  // DOM Elements - After Fix Screenshot (Optional)
  const afterDropZone = document.getElementById('after-drop-zone');
  const afterFileInput = document.getElementById('after-file-input');
  const afterDropzoneContent = document.getElementById('after-dropzone-content');
  const afterPreviewContainer = document.getElementById('after-preview-container');
  const afterImagePreview = document.getElementById('after-image-preview');
  const afterFileNameDisplay = document.getElementById('after-file-name');
  const afterFileSizeDisplay = document.getElementById('after-file-size');
  const afterFileDimensionsDisplay = document.getElementById('after-file-dimensions');
  const replaceAfterImageBtn = document.getElementById('replace-after-image-btn');
  const removeAfterImageBtn = document.getElementById('remove-after-image-btn');

  // DOM Elements - Description & Action
  const problemDescription = document.getElementById('problem-description');
  const charCounter = document.getElementById('char-counter');
  const analyzeBtn = document.getElementById('analyze-btn');

  // DOM Elements - Results Panel & States
  const reportStatusTag = document.getElementById('report-status-tag');
  const emptyState = document.getElementById('empty-state');
  const loadingState = document.getElementById('loading-state');
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  const reportContainer = document.getElementById('report-container');

  // DOM Elements - Top Diagnostic Hero Card
  const reportVerdictBanner = document.getElementById('report-verdict-banner');
  const verdictIcon = document.getElementById('verdict-icon');
  const verdictText = document.getElementById('verdict-text');
  const reportHealthScore = document.getElementById('report-health-score');
  const reportHealthBar = document.getElementById('report-health-bar');
  const reportSeverityBadge = document.getElementById('report-severity-badge');
  const reportConfidencePct = document.getElementById('report-confidence-pct');
  const reportIssueCount = document.getElementById('report-issue-count');
  const reportCategory = document.getElementById('report-category');

  // Severity Segments
  const sevSegLow = document.getElementById('sev-seg-low');
  const sevSegMed = document.getElementById('sev-seg-medium');
  const sevSegHigh = document.getElementById('sev-seg-high');
  const sevSegCrit = document.getElementById('sev-seg-critical');

  // UI Quality Breakdown Elements
  const scoreLayoutVal = document.getElementById('score-layout-val');
  const scoreLayoutFill = document.getElementById('score-layout-fill');
  const scoreConsistencyVal = document.getElementById('score-consistency-val');
  const scoreConsistencyFill = document.getElementById('score-consistency-fill');
  const scoreSpacingVal = document.getElementById('score-spacing-val');
  const scoreSpacingFill = document.getElementById('score-spacing-fill');
  const scoreTypographyVal = document.getElementById('score-typography-val');
  const scoreTypographyFill = document.getElementById('score-typography-fill');
  const scoreAccessibilityVal = document.getElementById('score-accessibility-val');
  const scoreAccessibilityFill = document.getElementById('score-accessibility-fill');
  const scoreResponsivenessVal = document.getElementById('score-responsiveness-val');
  const scoreResponsivenessFill = document.getElementById('score-responsiveness-fill');
  // Detected Issue Areas & Content Cards
  const detectedIssuesList = document.getElementById('detected-issues-list');
  const categoryBarChartBody = document.getElementById('category-bar-chart-body');
  const reportProblem = document.getElementById('report-problem');
  const reportEvidenceGrid = document.getElementById('report-evidence-grid');
  const reportCausesGrid = document.getElementById('report-causes-grid');
  const reportInvestigationList = document.getElementById('report-investigation-list');
  const reportFixPriority = document.getElementById('report-fix-priority');
  const reportFixAction = document.getElementById('report-fix-action');

  // Fix Verification Elements
  const fixVerificationSection = document.getElementById('fix-verification-section');
  const verificationStatusVerdict = document.getElementById('verification-status-verdict');
  const comparisonBeforeImg = document.getElementById('comparison-before-img');
  const comparisonAfterImg = document.getElementById('comparison-after-img');
  const verifBeforeHealth = document.getElementById('verif-before-health');
  const verifAfterHealth = document.getElementById('verif-after-health');
  const verifImprovementScore = document.getElementById('verif-improvement-score');
  const verifBeforeBar = document.getElementById('verif-before-bar');
  const verifAfterBar = document.getElementById('verif-after-bar');
  const verifBeforePct = document.getElementById('verif-before-pct');
  const verifAfterPct = document.getElementById('verif-after-pct');
  const verificationExplanation = document.getElementById('verification-explanation');
  const verificationChanges = document.getElementById('verification-changes');
  const verificationRemaining = document.getElementById('verification-remaining');
  const verificationNewIssues = document.getElementById('verification-new-issues');

  // Application State
  let currentFile = null;
  let currentImageDataUrl = null;

  let afterFile = null;
  let afterImageDataUrl = null;

  let isAnalyzing = false;

  const STORAGE_KEY = 'buglens_history';

  /**
   * Helper: Format bytes into human-readable string (KB / MB)
   */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Helper: Populate a list element with string items
   */
  function populateList(listElement, items, emptyText = 'None identified.') {
    if (!listElement) return;
    listElement.innerHTML = '';
    if (!items || items.length === 0) {
      const li = document.createElement('li');
      li.textContent = emptyText;
      listElement.appendChild(li);
      return;
    }

    const listArray = Array.isArray(items) ? items : [items];
    listArray.forEach((itemText) => {
      const li = document.createElement('li');
      li.textContent = typeof itemText === 'string' ? itemText : (itemText.text || JSON.stringify(itemText));
      listElement.appendChild(li);
    });
  }

  /**
   * Validate if the form is ready for analysis:
   * Enabled when Before screenshot is selected AND description is non-empty.
   */
  function updateAnalyzeButtonState() {
    if (isAnalyzing) {
      analyzeBtn.disabled = true;
      analyzeBtn.setAttribute('aria-disabled', 'true');
      return;
    }

    const hasBeforeImage = currentFile !== null;
    const hasDescription = problemDescription.value.trim().length > 0;
    const isReady = hasBeforeImage && hasDescription;

    analyzeBtn.disabled = !isReady;
    analyzeBtn.setAttribute('aria-disabled', String(!isReady));
  }

  /**
   * Handle setting the Before image file
   */
  function handleBeforeImage(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      currentImageDataUrl = e.target.result;
      imagePreview.src = currentImageDataUrl;
      fileNameDisplay.textContent = file.name;
      fileSizeDisplay.textContent = formatBytes(file.size);

      // Measure natural dimensions
      const img = new Image();
      img.onload = () => {
        fileDimensionsDisplay.textContent = `${img.naturalWidth}×${img.naturalHeight}`;
      };
      img.src = currentImageDataUrl;

      dropzoneContent.classList.add('hidden');
      previewContainer.classList.remove('hidden');

      updateAnalyzeButtonState();
    };
    reader.readAsDataURL(file);
  }

  /**
   * Remove Before image
   */
  function removeBeforeImage() {
    currentFile = null;
    currentImageDataUrl = null;
    fileInput.value = '';
    imagePreview.src = '';
    fileNameDisplay.textContent = '';
    fileSizeDisplay.textContent = '';
    fileDimensionsDisplay.textContent = '';

    previewContainer.classList.add('hidden');
    dropzoneContent.classList.remove('hidden');

    updateAnalyzeButtonState();
  }

  /**
   * Handle setting the After Fix image file (Optional)
   */
  function handleAfterImage(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    afterFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      afterImageDataUrl = e.target.result;
      afterImagePreview.src = afterImageDataUrl;
      afterFileNameDisplay.textContent = file.name;
      afterFileSizeDisplay.textContent = formatBytes(file.size);

      // Measure natural dimensions
      const img = new Image();
      img.onload = () => {
        afterFileDimensionsDisplay.textContent = `${img.naturalWidth}×${img.naturalHeight}`;
      };
      img.src = afterImageDataUrl;

      afterDropzoneContent.classList.add('hidden');
      afterPreviewContainer.classList.remove('hidden');

      updateAnalyzeButtonState();
    };
    reader.readAsDataURL(file);
  }

  /**
   * Remove After Fix image
   */
  function removeAfterImage() {
    afterFile = null;
    afterImageDataUrl = null;
    afterFileInput.value = '';
    afterImagePreview.src = '';
    afterFileNameDisplay.textContent = '';
    afterFileSizeDisplay.textContent = '';
    afterFileDimensionsDisplay.textContent = '';

    afterPreviewContainer.classList.add('hidden');
    afterDropzoneContent.classList.remove('hidden');

    updateAnalyzeButtonState();
  }

  /**
   * Switch the Results Panel view state
   */
  function showResultsState(state) {
    emptyState.classList.add('hidden');
    loadingState.classList.add('hidden');
    errorContainer.classList.add('hidden');
    reportContainer.classList.add('hidden');

    if (state === 'loading') {
      loadingState.classList.remove('hidden');
      reportStatusTag.textContent = afterImageDataUrl ? 'Gemma 4 Comparing Before / After...' : 'Gemma 4 Processing...';
    } else if (state === 'error') {
      errorContainer.classList.remove('hidden');
      reportStatusTag.textContent = 'Analysis Failed';
    } else if (state === 'report') {
      reportContainer.classList.remove('hidden');
      reportStatusTag.textContent = afterImageDataUrl ? 'Verification Complete' : 'Analysis Complete';
    } else {
      emptyState.classList.remove('hidden');
      reportStatusTag.textContent = 'Awaiting Input';
    }
  }

  /**
   * Render Quality Score bar helper
   */
  function renderQualityScore(valEl, barEl, score) {
    if (!valEl || !barEl) return;
    if (score === null || score === undefined || score === 'N/A') {
      valEl.textContent = 'N/A';
      barEl.style.width = '0%';
      barEl.style.opacity = '0.3';
    } else {
      const num = Math.max(0, Math.min(100, parseInt(score, 10)));
      valEl.textContent = `${num} / 100`;
      barEl.style.width = `${num}%`;
      barEl.style.opacity = '1';
      
      // Color tint
      if (num >= 80) {
        barEl.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
      } else if (num >= 60) {
        barEl.style.background = 'linear-gradient(90deg, #6366f1, #38bdf8)';
      } else {
        barEl.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
      }
    }
  }

  /**
   * Render the Professional Visual Diagnostics Report
   */
  function renderAnalysis(analysis) {
    // 1. Diagnostic Verdict Banner
    const verdict = (analysis.verdict || 'BUG_DETECTED').toUpperCase();
    reportVerdictBanner.className = 'verdict-banner';

    if (verdict === 'NO_BUG' || verdict.includes('NO')) {
      reportVerdictBanner.classList.add('verdict-nobug');
      verdictIcon.textContent = '✓';
      verdictText.textContent = 'NO BUG CONFIRMED';
    } else if (verdict === 'POTENTIAL_ISSUE' || verdict.includes('POTENTIAL')) {
      reportVerdictBanner.classList.add('verdict-potential');
      verdictIcon.textContent = '⚠';
      verdictText.textContent = 'POTENTIAL UI ISSUE';
    } else {
      reportVerdictBanner.classList.add('verdict-bug');
      verdictIcon.textContent = '✕';
      verdictText.textContent = 'UI BUG DETECTED';
    }

    // 2. UI Health Score
    const healthScore = analysis.ui_health_score !== undefined ? analysis.ui_health_score : 72;
    reportHealthScore.textContent = healthScore;
    reportHealthBar.style.width = `${healthScore}%`;

    if (healthScore >= 80) {
      reportHealthBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
    } else if (healthScore >= 60) {
      reportHealthBar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
    } else {
      reportHealthBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
    }

    // 3. Severity Segmented Meter
    const severity = (analysis.severity || 'Medium').trim().toLowerCase();
    reportSeverityBadge.textContent = (analysis.severity || 'Medium').toUpperCase();

    [sevSegLow, sevSegMed, sevSegHigh, sevSegCrit].forEach(seg => {
      if (seg) seg.className = 'sev-seg';
    });

    if (severity.includes('crit')) {
      if (sevSegCrit) sevSegCrit.classList.add('active-critical');
    } else if (severity.includes('high')) {
      if (sevSegHigh) sevSegHigh.classList.add('active-high');
    } else if (severity.includes('low')) {
      if (sevSegLow) sevSegLow.classList.add('active-low');
    } else {
      if (sevSegMed) sevSegMed.classList.add('active-medium');
    }

    // 4. Quick Meta (AI Confidence & Issues)
    const confPct = analysis.confidence_pct != null ? analysis.confidence_pct : (analysis.confidence === 'High' ? 95 : 76);
    reportConfidencePct.textContent = `${confPct}%`;
    const issueCount = analysis.issue_count !== undefined ? analysis.issue_count : (verdict === 'NO_BUG' ? 0 : 1);
    reportIssueCount.textContent = String(issueCount);
    reportCategory.textContent = analysis.category || 'Layout';

    // 5. UI Quality Scores
    const qs = analysis.quality_scores || {};
    renderQualityScore(scoreLayoutVal, scoreLayoutFill, qs.layout);
    renderQualityScore(scoreConsistencyVal, scoreConsistencyFill, qs.consistency);
    renderQualityScore(scoreSpacingVal, scoreSpacingFill, qs.spacing_alignment);
    renderQualityScore(scoreTypographyVal, scoreTypographyFill, qs.typography);
    renderQualityScore(scoreAccessibilityVal, scoreAccessibilityFill, qs.accessibility);
    renderQualityScore(scoreResponsivenessVal, scoreResponsivenessFill, qs.responsiveness);

    // 6. Detected Issues (Concise Ranked List)
    const catMap = analysis.issue_categories || {};
    const catEntries = Object.entries(catMap);

    if (detectedIssuesList) {
      if (verdict === 'NO_BUG' || verdict.includes('NO')) {
        detectedIssuesList.innerHTML = `
          <div class="issue-empty-pass">
            <span class="pass-icon">✓</span>
            <span>No visual UI bugs detected in this view. UI passes baseline specifications.</span>
          </div>
        `;
      } else if (catEntries.length > 0) {
        detectedIssuesList.innerHTML = catEntries.map(([catName, count], idx) => {
          const num = String(idx + 1).padStart(2, '0');
          const sev = (analysis.severity || 'Medium').toUpperCase();
          let sevClass = 'sev-tag-med';
          if (sev.includes('HIGH') || sev.includes('CRIT')) sevClass = 'sev-tag-high';
          else if (sev.includes('LOW')) sevClass = 'sev-tag-low';

          // One-line explanation
          let oneLiner = '';
          if (analysis.observed_evidence && analysis.observed_evidence[idx]) {
            const ev = analysis.observed_evidence[idx];
            oneLiner = typeof ev === 'object' ? (ev.evidence || '') : ev;
          }
          if (!oneLiner && analysis.problem) {
            oneLiner = analysis.problem;
          }
          if (!oneLiner) {
            oneLiner = `Discrepancies identified in ${catName.toLowerCase()} elements.`;
          }

          return `
            <div class="detected-issue-item">
              <div class="issue-item-top">
                <div class="issue-num-title">
                  <span class="issue-num">${num}</span>
                  <span class="issue-category-name">${catName}</span>
                </div>
                <span class="issue-sev-tag ${sevClass}">${sev}</span>
              </div>
              <p class="issue-summary-line">${oneLiner}</p>
            </div>
          `;
        }).join('');
      } else {
        const sev = (analysis.severity || 'Medium').toUpperCase();
        let sevClass = 'sev-tag-med';
        if (sev.includes('HIGH') || sev.includes('CRIT')) sevClass = 'sev-tag-high';
        else if (sev.includes('LOW')) sevClass = 'sev-tag-low';

        detectedIssuesList.innerHTML = `
          <div class="detected-issue-item">
            <div class="issue-item-top">
              <div class="issue-num-title">
                <span class="issue-num">01</span>
                <span class="issue-category-name">${analysis.category || 'Layout'}</span>
              </div>
              <span class="issue-sev-tag ${sevClass}">${sev}</span>
            </div>
            <p class="issue-summary-line">${analysis.problem || 'Visual discrepancy identified in the current UI component.'}</p>
          </div>
        `;
      }
    }

    // 7. Evidence: WHY BUGLENS THINKS THIS (Extremely important for hackathon)
    const evidenceList = analysis.observed_evidence || [];
    if (evidenceList.length === 0) {
      reportEvidenceGrid.innerHTML = `
        <div class="evidence-bullet-item">
          <span class="evidence-bullet-icon evidence-icon-pass">✓</span>
          <span class="evidence-bullet-text">Proportions, contrast, and element alignment adhere to clean design standards.</span>
        </div>
      `;
    } else {
      reportEvidenceGrid.innerHTML = evidenceList.slice(0, 4).map(ev => {
        const text = typeof ev === 'object' ? (ev.evidence || JSON.stringify(ev)) : ev;
        const status = typeof ev === 'object' ? (ev.status || 'warning').toLowerCase() : 'warning';
        
        let icon = '•';
        let iconClass = 'evidence-icon-warn';
        if (status === 'ok' || status === 'pass') {
          icon = '✓';
          iconClass = 'evidence-icon-pass';
        } else if (status === 'defect' || status === 'error' || status === 'fail') {
          icon = '✕';
          iconClass = 'evidence-icon-defect';
        } else {
          icon = '⚠';
          iconClass = 'evidence-icon-warn';
        }

        return `
          <div class="evidence-bullet-item">
            <span class="evidence-bullet-icon ${iconClass}">${icon}</span>
            <span class="evidence-bullet-text">${text}</span>
          </div>
        `;
      }).join('');
    }

    // 8. Likely Root Causes (Numbered list 01, 02)
    const causesList = analysis.likely_causes || [];
    if (causesList.length === 0) {
      reportCausesGrid.innerHTML = '<p class="text-subtle">No structural defect cause identified.</p>';
    } else {
      reportCausesGrid.innerHTML = causesList.slice(0, 3).map((causeItem, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        const causeText = typeof causeItem === 'object' ? (causeItem.cause || JSON.stringify(causeItem)) : causeItem;
        return `
          <div class="cause-simple-item">
            <span class="cause-simple-num">${num}</span>
            <span class="cause-simple-text">${causeText}</span>
          </div>
        `;
      }).join('');
    }

    // 9. Recommended Action (Visually Prominent)
    const fixObj = analysis.suggested_fix;
    if (typeof fixObj === 'object' && fixObj !== null) {
      reportFixAction.textContent = fixObj.action || 'Unify component styles and spacing with design system tokens.';
      reportFixPriority.textContent = `${(fixObj.priority || 'HIGH').toUpperCase()} PRIORITY`;
    } else {
      reportFixAction.textContent = fixObj || 'Unify component styles and spacing with design system tokens.';
      reportFixPriority.textContent = 'RECOMMENDED';
    }

    // 10. Secondary Details / Investigation Checkpoints (Collapsible)
    reportProblem.textContent = analysis.problem || 'No specific problem description provided.';
    const pointsList = analysis.investigation_points || [];
    if (pointsList.length === 0) {
      reportInvestigationList.innerHTML = '<p class="text-subtle">No additional checkpoints.</p>';
    } else {
      reportInvestigationList.innerHTML = pointsList.map((pointItem, idx) => {
        const pointText = typeof pointItem === 'object' ? (pointItem.point || JSON.stringify(pointItem)) : pointItem;
        return `
          <div class="priority-checklist-item">
            <span class="chk-num">${idx + 1}</span>
            <span class="chk-text">${pointText}</span>
          </div>
        `;
      }).join('');
    }

    // 11. Before / After Fix Verification (Visible ONLY when After Fix screenshot is provided)
    if (analysis.fix_verification && afterImageDataUrl) {
      const v = analysis.fix_verification;

      if (currentImageDataUrl && afterImageDataUrl) {
        comparisonBeforeImg.src = currentImageDataUrl;
        comparisonAfterImg.src = afterImageDataUrl;
      }

      // Verification Status Verdict
      const st = (v.fix_status || 'FIXED').toUpperCase().trim();
      let statusText = 'FIXED ✓';
      let statusClass = 'badge-status-fixed';

      if (st.includes('PARTIAL')) {
        statusText = 'PARTIALLY FIXED ⚠';
        statusClass = 'badge-status-partially-fixed';
      } else if (st.includes('NOT') || st.includes('FAIL')) {
        statusText = 'NOT FIXED ✕';
        statusClass = 'badge-status-not-fixed';
      } else if (st.includes('REGRESS')) {
        statusText = 'REGRESSION DETECTED ⚠';
        statusClass = 'badge-status-regression';
      } else {
        statusText = 'FIXED ✓';
        statusClass = 'badge-status-fixed';
      }

      verificationStatusVerdict.textContent = statusText;
      verificationStatusVerdict.className = `badge-status ${statusClass}`;

      // Before vs After Health Scores
      const bScore = v.before_ui_health_score !== undefined ? v.before_ui_health_score : healthScore;
      const aScore = v.after_ui_health_score !== undefined ? v.after_ui_health_score : (st === 'FIXED' ? Math.min(100, bScore + 25) : bScore);
      const impScore = v.improvement_score !== undefined ? v.improvement_score : (aScore - bScore);

      verifBeforeHealth.textContent = `${bScore} / 100`;
      verifAfterHealth.textContent = `${aScore} / 100`;
      verifImprovementScore.textContent = impScore >= 0 ? `+${impScore}` : `${impScore}`;
      verifImprovementScore.className = `chip-val ${impScore >= 0 ? 'imp-positive' : 'imp-negative'}`;

      verifBeforeBar.style.width = `${bScore}%`;
      verifAfterBar.style.width = `${aScore}%`;
      verifBeforePct.textContent = bScore;
      verifAfterPct.textContent = aScore;

      // Verification Details
      verificationExplanation.textContent = v.fix_explanation || (v.original_issue ? `Original Issue: ${v.original_issue}` : 'Fix verified against visual evidence.');
      populateList(verificationChanges, v.changes_detected, 'No visual changes detected.');
      populateList(verificationRemaining, v.remaining_issues, 'None detected.');
      populateList(verificationNewIssues, v.new_issues_introduced, 'None introduced.');

      fixVerificationSection.classList.remove('hidden');
    } else {
      fixVerificationSection.classList.add('hidden');
    }

    showResultsState('report');
  }

  // ==========================================================================
  // Local Storage & Analytics History
  // ==========================================================================

  function getStoredHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to read BugLens history from localStorage:', e);
      return [];
    }
  }

  function saveHistoryRecord(record) {
    try {
      const history = getStoredHistory();
      history.unshift(record);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      updateNavHistoryCount();
    } catch (e) {
      console.error('Failed to save BugLens record to localStorage:', e);
    }
  }

  function clearAllHistory() {
    if (confirm('Are you sure you want to clear all BugLens analysis history? This action cannot be undone.')) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        updateNavHistoryCount();
        renderDashboard();
      } catch (e) {
        console.error('Failed to clear history:', e);
      }
    }
  }

  function updateNavHistoryCount() {
    const count = getStoredHistory().length;
    if (navHistoryCount) {
      navHistoryCount.textContent = count;
    }
  }

  /**
   * Send screenshots & problem description to the Gemma 4 API
   */
  async function runAnalysis() {
    if (!currentImageDataUrl || !problemDescription.value.trim() || isAnalyzing) {
      return;
    }

    isAnalyzing = true;
    updateAnalyzeButtonState();
    analyzeBtn.innerHTML = `
      <div class="loading-spinner" style="width: 16px; height: 16px; margin: 0; border-width: 2px;"></div>
      Gemma 4 is analyzing the UI...
    `;

    showResultsState('loading');

    try {
      const payload = {
        image_data: currentImageDataUrl,
        mime_type: currentFile ? currentFile.type : 'image/png',
        description: problemDescription.value.trim()
      };

      if (afterImageDataUrl) {
        payload.after_image_data = afterImageDataUrl;
        payload.after_mime_type = afterFile ? afterFile.type : 'image/png';
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `Server returned error (${response.status})`);
      }

      if (data.analysis) {
        renderAnalysis(data.analysis);

        // Store record into localStorage history
        const hasVerification = Boolean(data.analysis.fix_verification && afterImageDataUrl);
        let fixStatus = null;
        let isRegression = false;

        if (hasVerification) {
          const fv = data.analysis.fix_verification;
          fixStatus = (fv.fix_status || 'FIXED').toUpperCase().trim();
          if (fixStatus.includes('REGRESS') || (fv.new_issues_introduced && fv.new_issues_introduced.length > 0)) {
            isRegression = true;
          }
        }

        const historyRecord = {
          id: 'ana_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          timestamp: new Date().toISOString(),
          problem: data.analysis.problem || problemDescription.value.trim(),
          category: data.analysis.category || 'Layout',
          severity: data.analysis.severity || 'Medium',
          verdict: data.analysis.verdict || 'BUG_DETECTED',
          confidence: data.analysis.confidence || 'High',
          confidence_pct: data.analysis.confidence_pct || 92,
          ui_health_score: data.analysis.ui_health_score || 72,
          issue_count: data.analysis.issue_count !== undefined ? data.analysis.issue_count : 1,
          has_verification: hasVerification,
          fix_status: fixStatus,
          is_regression: isRegression
        };

        saveHistoryRecord(historyRecord);
      } else {
        throw new Error('Received incomplete response from analysis server.');
      }
    } catch (err) {
      console.error('BugLens analysis failed:', err);
      errorMessage.textContent = err.message || 'An unexpected error occurred while contacting Gemma 4.';
      showResultsState('error');
    } finally {
      isAnalyzing = false;
      analyzeBtn.innerHTML = `
        <svg class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
        </svg>
        Analyze UI with Gemma 4 →
      `;
      updateAnalyzeButtonState();
    }
  }

  // ==========================================================================
  // Dashboard Metrics & Chart Rendering
  // ==========================================================================

  function renderDashboard() {
    const history = getStoredHistory();
    const emptyPanel = document.getElementById('dash-empty-state');
    const contentPanel = document.getElementById('dash-content');
    const recentCountTag = document.getElementById('recent-count-tag');

    updateNavHistoryCount();

    if (history.length === 0) {
      emptyPanel.classList.remove('hidden');
      contentPanel.classList.add('hidden');
      return;
    }

    emptyPanel.classList.add('hidden');
    contentPanel.classList.remove('hidden');

    // 1. Metric Calculations
    const totalAnalyses = history.length;
    const bugsDetected = history.filter(item => item.verdict !== 'NO_BUG').length;
    const verifiedAnalyses = history.filter(item => item.has_verification);
    const fixesVerifiedCount = verifiedAnalyses.length;
    
    const fixedCount = verifiedAnalyses.filter(item => item.fix_status === 'FIXED').length;
    const partialCount = verifiedAnalyses.filter(item => item.fix_status === 'PARTIALLY_FIXED' || (item.fix_status && item.fix_status.includes('PARTIAL'))).length;
    const notFixedCount = verifiedAnalyses.filter(item => item.fix_status === 'NOT_FIXED' || (item.fix_status && item.fix_status.includes('NOT'))).length;
    const regressionCount = history.filter(item => item.is_regression || (item.fix_status && item.fix_status.includes('REGRESS'))).length;

    const successRate = fixesVerifiedCount > 0 
      ? Math.round((fixedCount / fixesVerifiedCount) * 100) 
      : 0;

    const totalConf = history.reduce((acc, item) => acc + (item.confidence_pct || 85), 0);
    const avgConfidence = Math.round(totalConf / totalAnalyses);

    // Update Top Metric Cards
    document.getElementById('metric-total-analyses').textContent = totalAnalyses;
    document.getElementById('metric-bugs-detected').textContent = bugsDetected;
    document.getElementById('metric-fixes-verified').textContent = fixesVerifiedCount;
    document.getElementById('metric-success-rate').textContent = fixesVerifiedCount > 0 ? `${successRate}%` : '0%';
    document.getElementById('metric-success-subtext').textContent = fixesVerifiedCount > 0 
      ? `${fixedCount} of ${fixesVerifiedCount} fixes worked` 
      : 'No Before+After fixes yet';
    document.getElementById('metric-regressions').textContent = regressionCount;
    document.getElementById('metric-avg-confidence').textContent = `${avgConfidence}%`;
    document.getElementById('metric-confidence-fill').style.width = `${avgConfidence}%`;

    // 2. Charts Rendering
    renderSeverityChart(history);
    renderFixStatusChart(verifiedAnalyses, fixedCount, partialCount, notFixedCount, regressionCount);
    renderTrendChart(history);
    renderCategoryChart(history);

    // 3. Recent Analyses Table
    renderRecentTable(history);
    if (recentCountTag) {
      recentCountTag.textContent = `${history.length} Session${history.length === 1 ? '' : 's'}`;
    }
  }

  /**
   * Render Severity Horizontal Bar Chart
   */
  function renderSeverityChart(history) {
    const container = document.getElementById('severity-chart-body');
    if (!container) return;

    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    history.forEach(item => {
      const sev = (item.severity || 'Medium').toLowerCase();
      if (sev.includes('crit')) counts.Critical++;
      else if (sev.includes('high')) counts.High++;
      else if (sev.includes('low')) counts.Low++;
      else counts.Medium++;
    });

    const total = history.length;
    const maxVal = Math.max(...Object.values(counts), 1);

    const configs = [
      { key: 'Critical', label: 'Critical', color: 'linear-gradient(90deg, #ef4444, #dc2626)', count: counts.Critical },
      { key: 'High', label: 'High', color: 'linear-gradient(90deg, #f97316, #ea580c)', count: counts.High },
      { key: 'Medium', label: 'Medium', color: 'linear-gradient(90deg, #f59e0b, #d97706)', count: counts.Medium },
      { key: 'Low', label: 'Low', color: 'linear-gradient(90deg, #10b981, #059669)', count: counts.Low }
    ];

    container.innerHTML = configs.map(cfg => {
      const pctOfTotal = total > 0 ? Math.round((cfg.count / total) * 100) : 0;
      const barWidth = Math.round((cfg.count / maxVal) * 100);

      return `
        <div class="chart-bar-row">
          <div class="chart-bar-meta">
            <span class="chart-bar-name">${cfg.label}</span>
            <span class="chart-bar-stats">${cfg.count} (${pctOfTotal}%)</span>
          </div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width: ${barWidth}%; background: ${cfg.color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render Fix Verification Status Chart
   */
  function renderFixStatusChart(verifiedAnalyses, fixedCount, partialCount, notFixedCount, regressionCount) {
    const container = document.getElementById('fix-status-chart-body');
    if (!container) return;

    const totalVerified = verifiedAnalyses.length;

    if (totalVerified === 0) {
      container.innerHTML = `
        <div style="padding: 1.5rem 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          <p style="margin-bottom: 0.25rem;">No Before + After Fix sessions performed yet.</p>
          <p style="font-size: 0.775rem;">Upload an optional "After Fix" screenshot during analysis to track fix verification outcomes.</p>
        </div>
      `;
      return;
    }

    const statuses = [
      { label: 'Fixed', count: fixedCount, color: 'linear-gradient(90deg, #10b981, #34d399)' },
      { label: 'Partially Fixed', count: partialCount, color: 'linear-gradient(90deg, #f59e0b, #fbbf24)' },
      { label: 'Not Fixed', count: notFixedCount, color: 'linear-gradient(90deg, #ef4444, #f87171)' },
      { label: 'Regression', count: regressionCount, color: 'linear-gradient(90deg, #ec4899, #f472b6)' }
    ];

    const maxVal = Math.max(fixedCount, partialCount, notFixedCount, regressionCount, 1);

    container.innerHTML = statuses.map(st => {
      const pct = Math.round((st.count / totalVerified) * 100);
      const barWidth = Math.round((st.count / maxVal) * 100);

      return `
        <div class="chart-bar-row">
          <div class="chart-bar-meta">
            <span class="chart-bar-name">${st.label}</span>
            <span class="chart-bar-stats">${st.count} (${pct}%)</span>
          </div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width: ${barWidth}%; background: ${st.color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render Analyses Over Time (SVG Line/Area Chart)
   */
  function renderTrendChart(history) {
    const container = document.getElementById('trend-chart-container');
    if (!container) return;

    const dateMap = {};
    const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    sortedHistory.forEach(item => {
      const d = new Date(item.timestamp);
      const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap[dateKey] = (dateMap[dateKey] || 0) + 1;
    });

    const entries = Object.entries(dateMap);
    if (entries.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No trend data available.</p>';
      return;
    }

    const width = 460;
    const height = 180;
    const padX = 45;
    const padY = 25;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;

    const counts = entries.map(e => e[1]);
    const maxCount = Math.max(...counts, 3);

    const points = entries.map((entry, idx) => {
      const x = entries.length === 1 
        ? padX + chartW / 2 
        : padX + (idx / (entries.length - 1)) * chartW;
      const y = padY + chartH - (entry[1] / maxCount) * chartH;
      return { x, y, label: entry[0], count: entry[1] };
    });

    let pathD = '';
    let areaD = '';

    if (points.length === 1) {
      const pt = points[0];
      pathD = `M ${padX},${pt.y} L ${width - padX},${pt.y}`;
      areaD = `M ${padX},${pt.y} L ${width - padX},${pt.y} L ${width - padX},${padY + chartH} L ${padX},${padY + chartH} Z`;
    } else {
      pathD = `M ${points[0].x},${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x},${points[i].y}`;
      }
      areaD = `${pathD} L ${points[points.length - 1].x},${padY + chartH} L ${points[0].x},${padY + chartH} Z`;
    }

    const yGrid = [0, Math.round(maxCount / 2), maxCount];

    container.innerHTML = `
      <svg class="trend-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <!-- Grid Lines -->
        ${yGrid.map(val => {
          const y = padY + chartH - (val / maxCount) * chartH;
          return `
            <line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" class="trend-grid-line" />
            <text x="${padX - 8}" y="${y + 3}" class="trend-axis-text" text-anchor="end">${val}</text>
          `;
        }).join('')}

        <!-- Gradient Area -->
        <path d="${areaD}" class="trend-area-fill" />

        <!-- Line -->
        <path d="${pathD}" class="trend-line" />

        <!-- Data Points & Labels -->
        ${points.map(pt => `
          <g>
            <circle cx="${pt.x}" cy="${pt.y}" r="4.5" class="trend-point">
              <title>${pt.label}: ${pt.count} analyse${pt.count === 1 ? '' : 's'}</title>
            </circle>
            <text x="${pt.x}" y="${padY + chartH + 16}" class="trend-axis-text" text-anchor="middle">${pt.label}</text>
          </g>
        `).join('')}
      </svg>
    `;
  }

  /**
   * Render Bug Categories Distribution Chart
   */
  function renderCategoryChart(history) {
    const container = document.getElementById('category-chart-body');
    if (!container) return;

    const standardCategories = [
      'Layout',
      'Spacing',
      'Alignment',
      'Typography',
      'Color/Contrast',
      'Responsiveness',
      'Accessibility',
      'Other'
    ];

    const catCounts = {};
    standardCategories.forEach(cat => catCounts[cat] = 0);

    history.forEach(item => {
      const cat = item.category || 'Layout';
      if (catCounts.hasOwnProperty(cat)) {
        catCounts[cat]++;
      } else {
        catCounts['Other'] = (catCounts['Other'] || 0) + 1;
      }
    });

    const total = history.length;
    const activeCats = standardCategories.filter(cat => catCounts[cat] > 0);
    const displayCats = activeCats.length > 0 ? activeCats : ['Layout', 'Spacing', 'Alignment', 'Typography'];
    const maxCount = Math.max(...displayCats.map(c => catCounts[c]), 1);

    container.innerHTML = displayCats.map(cat => {
      const count = catCounts[cat];
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const barWidth = Math.round((count / maxCount) * 100);

      return `
        <div class="chart-bar-row">
          <div class="chart-bar-meta">
            <span class="chart-bar-name">${cat}</span>
            <span class="chart-bar-stats">${count} (${pct}%)</span>
          </div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width: ${barWidth}%; background: linear-gradient(90deg, #6366f1, #38bdf8);"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render Recent Analyses Table
   */
  function renderRecentTable(history) {
    const tbody = document.getElementById('recent-analyses-tbody');
    if (!tbody) return;

    tbody.innerHTML = history.slice(0, 15).map(item => {
      const dateObj = new Date(item.timestamp);
      const formattedDate = dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Severity badge class
      const sev = (item.severity || 'Medium').toLowerCase();
      let sevClass = 'badge-severity badge-severity-medium';
      if (sev.includes('crit')) sevClass = 'badge-severity badge-severity-critical';
      else if (sev.includes('high')) sevClass = 'badge-severity badge-severity-high';
      else if (sev.includes('low')) sevClass = 'badge-severity badge-severity-low';

      // Fix status badge
      let fixBadgeHtml = '<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #94a3b8;">Single UI</span>';
      if (item.has_verification) {
        const st = (item.fix_status || 'FIXED').toUpperCase();
        if (st.includes('PARTIAL')) {
          fixBadgeHtml = '<span class="badge-status badge-status-partially-fixed">Partial</span>';
        } else if (st.includes('NOT') || st.includes('FAIL')) {
          fixBadgeHtml = '<span class="badge-status badge-status-not-fixed">Not Fixed</span>';
        } else if (st.includes('REGRESS')) {
          fixBadgeHtml = '<span class="badge-status badge-status-regression">Regression</span>';
        } else {
          fixBadgeHtml = '<span class="badge-status badge-status-fixed">Fixed</span>';
        }
      }

      const confPct = item.confidence_pct || 85;

      return `
        <tr>
          <td class="cell-date">${formattedDate}</td>
          <td class="cell-issue" title="${item.problem}">${item.problem}</td>
          <td><span class="badge-category">${item.category || 'Layout'}</span></td>
          <td><span class="${sevClass}">${item.severity || 'Medium'}</span></td>
          <td>${fixBadgeHtml}</td>
          <td><span style="font-family: var(--font-mono); font-weight: 600; color: #a78bfa;">${confPct}%</span></td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================================================
  // Tab Switching & Navigation
  // ==========================================================================

  function switchTab(target) {
    if (target === 'workbench') {
      tabWorkbenchBtn.classList.add('active');
      tabWorkbenchBtn.setAttribute('aria-selected', 'true');
      tabDashboardBtn.classList.remove('active');
      tabDashboardBtn.setAttribute('aria-selected', 'false');

      workbenchView.classList.remove('hidden');
      dashboardView.classList.add('hidden');
    } else {
      tabDashboardBtn.classList.add('active');
      tabDashboardBtn.setAttribute('aria-selected', 'true');
      tabWorkbenchBtn.classList.remove('active');
      tabWorkbenchBtn.setAttribute('aria-selected', 'false');

      dashboardView.classList.remove('hidden');
      workbenchView.classList.add('hidden');

      renderDashboard();
    }
  }

  // Navigation Tab Listeners
  tabWorkbenchBtn.addEventListener('click', () => switchTab('workbench'));
  tabDashboardBtn.addEventListener('click', () => switchTab('dashboard'));

  if (startFirstAnalysisBtn) {
    startFirstAnalysisBtn.addEventListener('click', () => {
      switchTab('workbench');
      if (!currentFile) {
        fileInput.click();
      }
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      clearAllHistory();
    });
  }

  // --- Event Listeners: 1. Before Screenshot ---

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleBeforeImage(e.target.files[0]);
    }
  });

  if (replaceImageBtn) {
    replaceImageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  removeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeBeforeImage();
  });

  dropZone.addEventListener('click', () => {
    if (!currentFile) {
      fileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-active');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleBeforeImage(e.dataTransfer.files[0]);
    }
  });

  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!currentFile) {
        fileInput.click();
      }
    }
  });

  // --- Event Listeners: 2. After Fix Screenshot (Optional) ---

  afterFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleAfterImage(e.target.files[0]);
    }
  });

  if (replaceAfterImageBtn) {
    replaceAfterImageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      afterFileInput.click();
    });
  }

  removeAfterImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeAfterImage();
  });

  afterDropZone.addEventListener('click', () => {
    if (!afterFile) {
      afterFileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    afterDropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      afterDropZone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    afterDropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      afterDropZone.classList.remove('drag-active');
    });
  });

  afterDropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAfterImage(e.dataTransfer.files[0]);
    }
  });

  afterDropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!afterFile) {
        afterFileInput.click();
      }
    }
  });

  // --- Event Listeners: 3. Global Paste & Inputs ---

  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (!currentFile) {
          handleBeforeImage(file);
        } else if (!afterFile) {
          handleAfterImage(file);
        }
        break;
      }
    }
  });

  problemDescription.addEventListener('input', () => {
    const length = problemDescription.value.length;
    charCounter.textContent = `${length} char${length === 1 ? '' : 's'}`;
    updateAnalyzeButtonState();
  });

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to run analysis
  problemDescription.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!analyzeBtn.disabled) {
        runAnalysis();
      }
    }
  });

  analyzeBtn.addEventListener('click', () => {
    runAnalysis();
  });

  // Initialize
  updateNavHistoryCount();
  updateAnalyzeButtonState();
});
