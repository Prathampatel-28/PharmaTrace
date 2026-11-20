const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
    try {
        const query = {
            $or: [
                { userId: req.user._id },
                { role: req.user.role },
                { role: 'all' }
            ]
        };

        const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(30);
        const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

        res.json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ message: 'Could not load notifications.' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ message: 'Notification marked as read.' });
    } catch (error) {
        res.status(500).json({ message: 'Could not update notification.' });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const query = {
            $or: [
                { userId: req.user._id },
                { role: req.user.role },
                { role: 'all' }
            ]
        };
        await Notification.updateMany(query, { isRead: true });
        res.json({ message: 'All notifications marked as read.' });
    } catch (error) {
        res.status(500).json({ message: 'Could not update notifications.' });
    }
};
