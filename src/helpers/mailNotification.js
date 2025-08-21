const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendMail = async (to, subject, html) => {
  return new Promise((resolve, reject) => {
    const mailConfigurations = {
      from: `B-Way Logistic <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    };
    transporter.sendMail(mailConfigurations, function (error, info) {
      if (error) return reject(error);
      return resolve(info);
    });
  });
};

module.exports = {
  inviteUser: async (name, email, token) => {
    try {
      console.log("Sending invitation email to:", email);

      const html = `
      <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; padding: 20px; border: 1px solid #e0e0e0;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #F38529;">Welcome to B-Way Logistic!</h2>
            <p style="color: #777; font-size: 14px;">We're glad to have you on board</p>
          </div>

          <p>Dear ${name},</p>

          <p>You are invited to join <strong>B-Way Logistic</strong>. We’re excited to be your trusted destination for quality service.</p>

          <a href="${process.env.FRONTEND_URL}/register?token=${token}">Register Yourself</a>

          <p>If you have any questions, feel free to reach out to us. We're here to help!</p>

          <p style="margin-top: 20px;">Best regards,<br/><strong style="color: #F38529;">The B-Way Logistic Team</strong></p>

          <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #777; text-align: center;">
            <p>This is a system-generated email. Please do not reply to this message.</p>
          </div>
        </div>
      </div>
    `;

      await sendMail(email, "Welcome to B-Way Logistic!", html);
    } catch (err) {
      console.error("Error sending welcome email:", err);
      throw new Error("Failed to send welcome email");
    }
  },
};
