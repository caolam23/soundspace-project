const express = require('express');
const { auth, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

router.get('/users', auth, isAdmin, async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

router.delete('/users/:id', auth, isAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ msg: 'Xóa thành công' });
});

router.post('/users/:id/promote', auth, isAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if(!user) return res.status(404).json({ msg: 'Không tìm thấy user' });
  user.role = 'admin';
  await user.save();
  res.json({ msg: 'Promoted to admin' });
});

module.exports = router;
