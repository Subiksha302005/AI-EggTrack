// ---------- Helper: get flock id from URL ----------
function getFlockIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// ---------- Registration Form (index.html) ----------
const flockForm = document.getElementById('flockForm');

if (flockForm) {
  flockForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const flockData = {
      flock_name: document.getElementById('flock_name').value,
      breed: document.getElementById('breed').value,
      bird_count: document.getElementById('bird_count').value,
      hatch_date: document.getElementById('hatch_date').value,
      housing_type: document.getElementById('housing_type').value
    };

    try {
      const response = await fetch('/api/flocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flockData)
      });
      const result = await response.json();
      window.location.href = `flock.html?id=${result.id}`;
    } catch (err) {
      alert('Error registering flock: ' + err.message);
    }
  });
}

// ---------- Flock Detail Page (flock.html) ----------
const flockInfoDiv = document.getElementById('flockInfo');

if (flockInfoDiv) {
  const flockId = getFlockIdFromUrl();

  // Load flock info
  async function loadFlockInfo() {
    const res = await fetch(`/api/flocks/${flockId}`);
    const flock = await res.json();

    flockInfoDiv.innerHTML = `
      <h2>${flock.flock_name}</h2>
      <p><strong>Breed:</strong> ${flock.breed}</p>
      <p><strong>Birds:</strong> ${flock.bird_count}</p>
      <p><strong>Housing:</strong> ${flock.housing_type}</p>
      <p><strong>Age:</strong> ${flock.ageInWeeks} weeks</p>
      <p><strong>Current Stage:</strong> <span class="badge badge-low">${flock.stage}</span></p>
    `;
  }
  loadFlockInfo();

  // Generate Advisory (LLM Call 1)
  const generateBtn = document.getElementById('generateAdvisoryBtn');
  const advisoryResult = document.getElementById('advisoryResult');

  generateBtn.addEventListener('click', async () => {
    advisoryResult.innerHTML = '<p>Generating advisory... please wait</p>';
    generateBtn.disabled = true;

    try {
      const res = await fetch(`/api/flocks/${flockId}/advisory`, { method: 'POST' });
      const data = await res.json();

      if (data.error) {
        advisoryResult.innerHTML = `<p style="color:red">Error: ${data.error}</p>`;
      } else {
        advisoryResult.innerHTML = `
          <p><strong>Feed Recommendation:</strong> ${data.feedRecommendation}</p>
          <p><strong>Lighting Schedule:</strong> ${data.lightingSchedule}</p>
          <p><strong>Vaccinations Due:</strong> ${(data.vaccinationDue || []).join(', ')}</p>
          <p><strong>Risk Alerts:</strong> ${(data.riskAlerts || []).join(', ')}</p>
        `;
      }
    } catch (err) {
      advisoryResult.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
    }
    generateBtn.disabled = false;
  });

  // Log Production
  const productionForm = document.getElementById('productionForm');
  productionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productionData = {
      log_date: document.getElementById('log_date').value,
      eggs_collected: document.getElementById('eggs_collected').value,
      mortality_count: document.getElementById('mortality_count').value,
      feed_consumed_kg: document.getElementById('feed_consumed_kg').value
    };

    await fetch(`/api/flocks/${flockId}/production`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productionData)
    });

    alert('Production logged successfully!');
    productionForm.reset();
  });

  // Diagnose Symptom (LLM Call 2)
  const diagnoseForm = document.getElementById('diagnoseForm');
  const diagnosisResult = document.getElementById('diagnosisResult');

  diagnoseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const symptoms = document.getElementById('symptoms').value;

    diagnosisResult.innerHTML = '<p>Analyzing symptoms... please wait</p>';

    try {
      const res = await fetch(`/api/flocks/${flockId}/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms })
      });
      const data = await res.json();

      if (data.error) {
        diagnosisResult.innerHTML = `<p style="color:red">Error: ${data.error}</p>`;
      } else {
        const badgeClass = data.confidence === 'high' ? 'badge-high' :
                            data.confidence === 'medium' ? 'badge-medium' : 'badge-low';
        diagnosisResult.innerHTML = `
          <p><strong>Likely Cause:</strong> ${data.likelyCause}</p>
          <p><strong>Confidence:</strong> <span class="badge ${badgeClass}">${data.confidence}</span></p>
          <p><strong>Recommended Action:</strong> ${data.recommendedAction}</p>
          <p><em>${data.note}</em></p>
        `;
      }
    } catch (err) {
      diagnosisResult.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
    }
  });
}
// ---------- Dashboard Page (dashboard.html) ----------
const flockListDiv = document.getElementById('flockList');

if (flockListDiv) {
  async function loadDashboard() {
    const res = await fetch('/api/flocks');
    const flocks = await res.json();

    if (flocks.length === 0) {
      flockListDiv.innerHTML = '<p>No flocks registered yet.</p>';
      return;
    }

    flockListDiv.innerHTML = flocks.map(flock => `
      <div style="padding:14px 0; border-bottom:1px solid #eee;">
        <a href="flock.html?id=${flock.id}" style="font-weight:600; font-size:16px; color:#2e7d32; text-decoration:none;">
          ${flock.flock_name}
        </a>
        <p style="color:#666; font-size:14px; margin-top:4px;">
          ${flock.breed} • ${flock.bird_count} birds • ${flock.housing_type}
        </p>
      </div>
    `).join('');
  }
  loadDashboard();
}