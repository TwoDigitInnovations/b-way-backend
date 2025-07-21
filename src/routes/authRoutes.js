const express = require('express');
const router = express.Router();
const { login, register } = require('@controllers/authController');
const auth = require('@middlewares/authMiddleware');

router.post('/login', login);
router.post('/register', register);

router.get('/admin-only', auth('admin'), (req, res) => {
  res.json({ message: 'Welcome, admin user!' });
});

router.get('/admin-seller', auth('admin', 'seller'), (req, res) => {
  res.json({ message: 'Welcome, admin or seller!' });
});

router.get('/protected', auth(), (req, res) => {
  res.json({ message: 'Welcome, authenticated user!', user: req.user });
});

module.exports = router;
