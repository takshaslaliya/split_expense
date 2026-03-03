const AchievementsService = require('../services/achievementsService');

const getMyAchievements = async (req, res) => {
    try {
        const userId = req.user.id;
        const achievements = await AchievementsService.getUserAchievements(userId);
        return res.status(200).json({ success: true, data: achievements });
    } catch (error) {
        console.error('Error fetching achievements:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch achievements.' });
    }
};

module.exports = { getMyAchievements };
