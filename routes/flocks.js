const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getStageAdvisory, diagnoseSymptom } = require('../services/llmService');

// Helper: calculate age in weeks and map to stage
function calculateStage(hatchDate) {
  const hatch = new Date(hatchDate);
  const today = new Date();
  const diffMs = today - hatch;
  const ageInWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));

  let stage;
  if (ageInWeeks <= 6) stage = 'chick';
  else if (ageInWeeks <= 18) stage = 'grower';
  else if (ageInWeeks <= 20) stage = 'pre-lay';
  else if (ageInWeeks <= 40) stage = 'peak-lay';
  else if (ageInWeeks <= 72) stage = 'late-lay';
  else stage = 'molting';

  return { ageInWeeks, stage };
}

// 1. Register a new flock
router.post('/', (req, res) => {
  const { flock_name, breed, bird_count, hatch_date, housing_type } = req.body;
  const stmt = db.prepare(`
    INSERT INTO flocks (flock_name, breed, bird_count, hatch_date, housing_type)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(flock_name, breed, bird_count, hatch_date, housing_type);
  res.json({ id: result.lastInsertRowid });
});

// 2. List all flocks
router.get('/', (req, res) => {
  const flocks = db.prepare('SELECT * FROM flocks ORDER BY created_at DESC').all();
  res.json(flocks);
});

// 3. Get one flock with calculated stage
router.get('/:id', (req, res) => {
  const flock = db.prepare('SELECT * FROM flocks WHERE id = ?').get(req.params.id);
  if (!flock) return res.status(404).json({ error: 'Flock not found' });

  const { ageInWeeks, stage } = calculateStage(flock.hatch_date);
  res.json({ ...flock, ageInWeeks, stage });
});

// 4. Generate stage advisory (LLM Call 1)
router.post('/:id/advisory', async (req, res) => {
  try {
    const flock = db.prepare('SELECT * FROM flocks WHERE id = ?').get(req.params.id);
    if (!flock) return res.status(404).json({ error: 'Flock not found' });

    const { ageInWeeks, stage } = calculateStage(flock.hatch_date);
    const advice = await getStageAdvisory(flock.breed, ageInWeeks, flock.housing_type, stage);

    const stmt = db.prepare(`
      INSERT INTO stage_advisories (flock_id, current_stage, feed_recommendation, lighting_schedule, vaccination_due, risk_alerts)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      flock.id, stage, advice.feedRecommendation, advice.lightingSchedule,
      JSON.stringify(advice.vaccinationDue), JSON.stringify(advice.riskAlerts)
    );

    res.json({ stage, ageInWeeks, ...advice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Log daily production
router.post('/:id/production', (req, res) => {
  const { log_date, eggs_collected, mortality_count, feed_consumed_kg } = req.body;
  const stmt = db.prepare(`
    INSERT INTO production_logs (flock_id, log_date, eggs_collected, mortality_count, feed_consumed_kg)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(req.params.id, log_date, eggs_collected, mortality_count || 0, feed_consumed_kg);
  res.json({ success: true });
});

// 6. Get production history
router.get('/:id/production', (req, res) => {
  const logs = db.prepare('SELECT * FROM production_logs WHERE flock_id = ? ORDER BY log_date').all(req.params.id);
  res.json(logs);
});

// 7. Diagnose a symptom (LLM Call 2)
router.post('/:id/diagnose', async (req, res) => {
  try {
    const { symptoms } = req.body;
    const flock = db.prepare('SELECT * FROM flocks WHERE id = ?').get(req.params.id);
    if (!flock) return res.status(404).json({ error: 'Flock not found' });

    const { ageInWeeks, stage } = calculateStage(flock.hatch_date);
    const diagnosis = await diagnoseSymptom(ageInWeeks, stage, symptoms);

    const stmt = db.prepare(`
      INSERT INTO diagnoses (flock_id, symptoms, likely_cause, confidence, recommended_action)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(flock.id, symptoms, diagnosis.likelyCause, diagnosis.confidence, diagnosis.recommendedAction);

    res.json(diagnosis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Full history: advisories + diagnoses
router.get('/:id/history', (req, res) => {
  const advisories = db.prepare('SELECT * FROM stage_advisories WHERE flock_id = ? ORDER BY logged_at DESC').all(req.params.id);
  const diagnoses = db.prepare('SELECT * FROM diagnoses WHERE flock_id = ? ORDER BY logged_at DESC').all(req.params.id);
  res.json({ advisories, diagnoses });
});

module.exports = router;