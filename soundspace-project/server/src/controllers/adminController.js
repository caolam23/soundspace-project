// controllers/adminController.js
exports.getDashboard = (req, res) => {
  // req.user được auth middleware gắn
  res.json({
    msg: `Chào mừng Admin ${req.user.username || req.user.email}`,
    userId: req.user._id,
    role: req.user.role
  });
};
