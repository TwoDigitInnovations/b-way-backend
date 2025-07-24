const User = require('@models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const response = require('@responses');

module.exports = {
  register: async (req, res) => {
    try {
      const { name, email, password, phone, role } = req.body;

      if (!name || !email || !password) {
        return response.badReq(res, { message: 'Name, email, and password are required' });
      }

      if (role === 'ADMIN') {
        return response.forbidden(res, { message: 'Only admins can create admin users' });
      }

      if (password.length < 6) {
        return response.badReq(res, { message: 'Password must be at least 6 characters long' });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return response.conflict(res, { message: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        phone,
        role: role || 'USER',
      });

      await newUser.save();

      const userResponse = await User.findById(newUser._id).select('-password');

      response.created(res, { 
        message: 'User registered successfully', 
        user: userResponse 
      });
    } catch (error) {
      console.error(error);
      response.error(res, error);
    }
  },
  login: async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;

      if (!email || !password) {
        return response.badReq(res, { message: 'Email and password are required' });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return response.unAuthorize(res, { message: 'Invalid email address' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return response.unAuthorize(res, { message: 'Invalid password' });
      }

      const expiresIn = rememberMe ? '7d' : '1h';

      const token = jwt.sign(
        { id: user._id, email: user.email }, 
        process.env.JWT_SECRET, 
        { expiresIn }
      );

      response.ok(res, {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error(error);
      response.error(res, error);
    }
  },

};
