// server/src/services/emailService.js
require('dotenv').config();
const nodemailer = require('nodemailer');

// Tạo transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service error:', error);
  } else {
    console.log('✅ Email service is ready');
  }
});

/**
 * Gửi email chào mừng cho user mới
 */
const sendWelcomeEmail = async (email, username, password, role = 'user') => {
  try {
    const isAdmin = role === 'admin';
    const roleDisplay = isAdmin ? 'Admin' : 'User';
    const roleColor = isAdmin ? '#f59e0b' : '#667eea';
    
    const mailOptions = {
      from: `"SoundSpace" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: `${isAdmin ? '👑' : '🎵'} Chào mừng đến SoundSpace`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, ${roleColor}, ${isAdmin ? '#dc2626' : '#764ba2'});
              padding: 40px 30px;
              text-align: center;
              color: white;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .badge {
              display: inline-block;
              background: rgba(255,255,255,0.2);
              padding: 6px 16px;
              border-radius: 20px;
              font-size: 13px;
              margin-top: 10px;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              color: #333;
              margin-bottom: 20px;
            }
            .info-box {
              background: #f9fafb;
              border-radius: 8px;
              padding: 20px;
              margin: 25px 0;
            }
            .info-row {
              display: flex;
              padding: 12px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              width: 100px;
              color: #6b7280;
              font-size: 14px;
            }
            .info-value {
              flex: 1;
              color: #1f2937;
              font-weight: 500;
              font-size: 14px;
            }
            .button {
              display: block;
              background: ${roleColor};
              color: white;
              text-align: center;
              padding: 14px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 500;
              margin: 25px 0;
            }
            .warning {
              background: #fef3c7;
              border-left: 3px solid #f59e0b;
              padding: 15px;
              border-radius: 6px;
              font-size: 14px;
              color: #92400e;
            }
            .footer {
              background: #f9fafb;
              padding: 20px;
              text-align: center;
              color: #6b7280;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isAdmin ? '👑' : '🎵'} Chào mừng đến SoundSpace</h1>
              <div class="badge">${isAdmin ? '👑' : '👤'} ${roleDisplay}</div>
            </div>
            
            <div class="content">
              <div class="greeting">
                Xin chào <strong>${username}</strong>!
              </div>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
                Tài khoản của bạn đã được tạo thành công. Dưới đây là thông tin đăng nhập:
              </p>

              <div class="info-box">
                <div class="info-row">
                  <div class="info-label">Email</div>
                  <div class="info-value">${email}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Username</div>
                  <div class="info-value">${username}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Password</div>
                  <div class="info-value">${password}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Vai trò</div>
                  <div class="info-value">${roleDisplay}</div>
                </div>
              </div>

              <a href="${process.env.CLIENT_URL}/login" class="button">
                Đăng nhập ngay →
              </a>

              <div class="warning">
                <strong>⚠️ Quan trọng:</strong> Vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên.
              </div>
            </div>

            <div class="footer">
              Email tự động • Không trả lời<br>
              © 2025 SoundSpace
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    throw error;
  }
};

/**
 * Gửi email thông báo reset password
 */
const sendPasswordResetEmail = async (email, username, resetToken) => {
  try {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"SoundSpace Security" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: '🔐 Đặt lại mật khẩu - SoundSpace',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #ef4444, #dc2626);
              padding: 40px 30px;
              text-align: center;
              color: white;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              color: #333;
              margin-bottom: 20px;
            }
            .info-box {
              background: #fef2f2;
              border-left: 3px solid #ef4444;
              border-radius: 6px;
              padding: 15px;
              margin: 20px 0;
              font-size: 14px;
              color: #991b1b;
            }
            .button {
              display: block;
              background: #ef4444;
              color: white;
              text-align: center;
              padding: 14px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 500;
              margin: 25px 0;
            }
            .timer {
              text-align: center;
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .timer-value {
              font-size: 36px;
              font-weight: 700;
              color: #ef4444;
              margin: 10px 0;
            }
            .timer-label {
              font-size: 13px;
              color: #6b7280;
            }
            .link-box {
              background: #f9fafb;
              border: 1px dashed #d1d5db;
              border-radius: 6px;
              padding: 15px;
              margin: 20px 0;
              text-align: center;
            }
            .link-box a {
              color: #ef4444;
              word-break: break-all;
              font-size: 12px;
            }
            .warning {
              background: #fef3c7;
              border-left: 3px solid #f59e0b;
              padding: 15px;
              border-radius: 6px;
              font-size: 14px;
              color: #92400e;
            }
            .footer {
              background: #f9fafb;
              padding: 20px;
              text-align: center;
              color: #6b7280;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Đặt lại mật khẩu</h1>
            </div>
            
            <div class="content">
              <div class="greeting">
                Xin chào <strong>${username}</strong>!
              </div>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
              </p>

              <div class="info-box">
                <strong>📧 Tài khoản:</strong> ${email}<br>
                <strong>🕐 Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}
              </div>

              <div class="timer">
                <div class="timer-label">Link có hiệu lực trong</div>
                <div class="timer-value">60 phút</div>
              </div>

              <a href="${resetUrl}" class="button">
                Đặt lại mật khẩu →
              </a>

              <div class="link-box">
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280;">Không click được? Copy link này:</p>
                <a href="${resetUrl}">${resetUrl}</a>
              </div>

              <div class="warning">
                <strong>⚠️ Lưu ý:</strong> Nếu không phải bạn yêu cầu, vui lòng bỏ qua email này.
              </div>
            </div>

            <div class="footer">
              Email tự động • Không trả lời<br>
              © 2025 SoundSpace Security
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw error;
  }
};

// Export hàm
module.exports = { sendWelcomeEmail, sendPasswordResetEmail };