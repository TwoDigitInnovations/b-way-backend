const express = require('express');
const router = express.Router();
const { login, register, changePassword, updateProfile, getUserDetails, getUserByType, getUserList, sendInvitation, validateInvitation, getUserById } = require('@controllers/authController');
const auth = require('@middlewares/authMiddleware');

router.post('/login', login);
router.post('/register', register);
router.put('/change-password', auth("ADMIN", "CLIENT", "HOSPITAL", "CLINIC", "DRIVER", "DISPATCHER"), changePassword);
router.put('/update-profile', auth("ADMIN", "CLIENT", "HOSPITAL", "CLINIC", "DRIVER", "DISPATCHER"), updateProfile);
router.get('/user-details', auth("ADMIN", "CLIENT", "HOSPITAL", "CLINIC", "DRIVER", "DISPATCHER"), getUserDetails);
router.get('/user/:id', auth("ADMIN", "CLIENT", "HOSPITAL", "CLINIC", "DRIVER", "DISPATCHER"), getUserById);
router.post("/send-invitation", auth("ADMIN"), sendInvitation);
router.post("/validate-invitation", auth("ADMIN"), validateInvitation);
router.get('/:role', auth(), getUserByType);
router.get('/all/:role', auth(), getUserList);

module.exports = router;
