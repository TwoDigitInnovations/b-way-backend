const User = require('@models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const response = require('@responses');

module.exports = {
  register: async (req, res) => {
    try {
      const { name, email, password, phone, role } = req.body;

      if (!name || !email || !password) {
        return response.badReq(res, {
          message: 'Name, email, and password are required',
        });
      }

      if (role === 'ADMIN') {
        return response.forbidden(res, {
          message: 'Only admins can create admin users',
        });
      }

      if (password.length < 6) {
        return response.badReq(res, {
          message: 'Password must be at least 6 characters long',
        });
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
        user: userResponse,
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
        return response.badReq(res, {
          message: 'Email and password are required',
        });
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
        { expiresIn },
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
  changePassword: async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!oldPassword || !newPassword) {
        return response.badReq(res, {
          message: 'Old and new passwords are required',
        });
      }

      if (newPassword.length < 6) {
        return response.badReq(res, {
          message: 'New password must be at least 6 characters long',
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return response.notFound(res, { message: 'User not found' });
      }

      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return response.unAuthorize(res, {
          message: 'Old password is incorrect',
        });
      }

      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();

      response.ok(res, { message: 'Password changed successfully' });
    } catch (error) {
      console.error(error);
      response.error(res, error);
    }
  },
  updateProfile: async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        primaryContact,
        address,
        city,
        state,
        zipcode,
      } = req.body;
      const userId = req.user._id;

      // if (!name || !email) {
      //   return response.badReq(res, { message: 'Name and email are required' });
      // }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          name,
          email,
          phone,
          primaryContact,
          address,
          city,
          state,
          zipcode,
        },
        { new: true, runValidators: true },
      ).select('-password');

      if (!updatedUser) {
        return response.notFound(res, { message: 'User not found' });
      }

      response.ok(res, {
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error(error);
      response.error(res, error);
    }
  },
  getUserDetails: async (req, res) => {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId).select('-password');
      if (!user) {
        return response.notFound(res, { message: 'User not found' });
      }

      response.ok(res, { user });
    } catch (error) {
      console.error(error);
      response.error(res, error);
    }
  },
  getUserByType: async (req, res) => {
    try {
      const { role } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      if (!role) {
        return response.badReq(res, { message: 'Role is required' });
      }

      const [users, total] = await Promise.all([
              User.find({ role })
                .select('-__v -password')
                .skip(skip)
                .limit(limitNum)
                .lean(),
              User.countDocuments({ role }),
            ]);

            const data = users.map((user, index) => ({
              ...user,
              index: skip + index + 1,
            }));
      
            const totalPages = Math.ceil(total / limitNum);
      
            res.status(200).json({
              status: true,
              total,
              page: pageNum,
              limit: limitNum,
              totalPages,
              data,
            });

      // const users = await User.find({ role })
      //   .select('-password')
      //   .skip(skip)
      //   .limit(limitNum)
      //   .lean();

      // if (users.length === 0) {
      //   return response.notFound(res, {
      //     message: 'No users found for this role',
      //   });
      // }

      // response.ok(res, { users });
    } catch (error) {
      console.error(error);
      response.error(res, error);
    }
  },
};
