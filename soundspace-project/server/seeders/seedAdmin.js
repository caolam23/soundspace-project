const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("❌ Vui lòng cấu hình ADMIN_EMAIL và ADMIN_PASSWORD trong .env");
    process.exit(1);
  }

  // Check nếu đã có admin
  const exists = await User.findOne({ email });
  if (exists) {
    console.log("⚠️ Admin đã tồn tại:", exists.email);
    process.exit(0);
  }

  // Tạo admin mới
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    email,
    username: "admin",
    password: hashed,
    role: "admin",
  });

  console.log("✅ Admin đã được seed:", user.email);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed thất bại:", err);
  process.exit(1);
});
