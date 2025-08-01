const express = require('express');
const router = express.Router();
const { login, register, changePassword, updateProfile, getUserDetails, getUserByType } = require('@controllers/authController');
const auth = require('@middlewares/authMiddleware');

router.post('/login', login);
router.post('/register', register);
router.put('/change-password', auth("ADMIN", "USER", "DRIVER", "DISPATCHER"), changePassword);
router.put('/update-profile', auth("ADMIN", "USER", "DRIVER", "DISPATCHER"), updateProfile);
router.get('/user-details', auth("ADMIN", "USER", "DRIVER", "DISPATCHER"), getUserDetails);
router.get('/:role', auth("ADMIN"), getUserByType);

module.exports = router;
