const User = require('@models/User');
const response = require('@responses');

module.exports = {
    dashboard: async (req, res) => {
        try {
            const user = await User.findById(req.user._id).select('-password');
            if (!user) {
                return response.notFound(res, { message: 'User not found' });
            }

            response.ok(res, { user });
        } catch (error) {
            console.error(error);
            response.error(res, error);
        }
    },
}