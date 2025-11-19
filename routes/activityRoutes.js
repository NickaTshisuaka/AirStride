// server/routes/activityRoutes.js
import express from 'express';
const router = express.Router();
import Activity from '../models/Activity.js'; // Import the Activity model
// import { requireAdmin } from '../server.js'; 

// POST /api/activity - Save a new activity log (public for tracking, no auth required)
router.post('/', async (req, res) => {
  try {
    const { userId, eventType, details } = req.body;
    // Create a new activity document
    const newActivity = new Activity({ userId, eventType, details });
    await newActivity.save(); // Save to MongoDB
    res.status(201).json({ message: 'Activity logged successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// GET /api/activity - Fetch all activities (admin only)
router.get('/', async (req, res) => {
  try {
    const activities = await Activity.find().sort({ timestamp: -1 }); // Sort by newest first
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// GET /api/activity/stats - Fetch aggregated stats (admin only)
router.get('/stats', async (req, res) => {
  try {
    // Aggregate total activities per event type
    const totalPerType = await Activity.aggregate([
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Most visited pages (assuming details.page for PAGE_VISIT)
    const mostVisitedPages = await Activity.aggregate([
      { $match: { eventType: 'PAGE_VISIT' } },
      { $group: { _id: '$details.page', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }, // Top 5 pages
    ]);

    // Daily activity trends (group by date)
    const dailyTrends = await Activity.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } }, // Sort by date ascending
    ]);

    // Send the aggregated data
    res.json({
      totalPerType,
      mostVisitedPages,
      dailyTrends,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;