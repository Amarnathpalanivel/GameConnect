import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

// Create transporter
const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
};

export const sendOTPEmail = async (email, otp) => {
  // Always log OTP to server console for testing/debugging
  console.log("\n=======================================================");
  console.log(`🎮 [GameConnect OTP Verification]`);
  console.log(`✉️  Recipient: ${email}`);
  console.log(`🔢 Verification Code: \x1b[33m\x1b[1m${otp}\x1b[0m  ← USE THIS CODE`);
  console.log("=======================================================\n");

  const transporter = createTransporter();

  if (!transporter) {
    console.log("ℹ️ EMAIL_USER and EMAIL_PASS not configured in .env. OTP printed to terminal above.");
    return { success: true, simulated: true };
  }

  const mailOptions = {
    from: `"GameConnect" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `🎮 Your GameConnect Verification Code: ${otp}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #070e1f; color: #f1f5f9; padding: 32px; border-radius: 16px; border: 1px solid #1e3a8a;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 48px; margin-bottom: 8px;">🎮</div>
          <h1 style="color: #38bdf8; margin: 0; font-size: 28px; letter-spacing: 1px;">GameConnect</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 6px;">Find Your Squad. Dominate Together.</p>
        </div>

        <div style="background-color: #0c1f3a; border-radius: 12px; padding: 24px; border: 1px solid #0284c7; text-align: center;">
          <h2 style="color: #f8fafc; margin-top: 0; font-size: 18px;">Verify Your Email Address</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
            Welcome to GameConnect! Please use the verification code below to activate your account and start finding your squad:
          </p>

          <div style="margin: 28px 0; display: inline-block; background: linear-gradient(135deg, #0284c7, #38bdf8); padding: 2px; border-radius: 12px;">
            <div style="background-color: #070e1f; border-radius: 10px; padding: 16px 36px;">
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace;">${otp}</span>
            </div>
          </div>

          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
            This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.
          </p>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            If you did not sign up for GameConnect, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending OTP email:", error.message);
    // Return true anyway so user can still enter OTP from console in development
    return { success: true, error: error.message };
  }
};
