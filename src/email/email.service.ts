
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendResetPasswordEmail(to: string, link: string) {
    // HTML DESIGN "FDVP THEMED" - Improved Dark Mode Support
    const htmlObj = `
<!DOCTYPE html>
<html>
<head>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #09090b; color: #e4e4e7; padding: 40px 20px; margin: 0; }
    .container { max-width: 480px; margin: 0 auto; background-color: #18181b; border-radius: 24px; border: 1px solid #27272a; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; text-align: center; }
    .btn { display: inline-block; background-color: #14B8A6; color: #ffffff !important; font-weight: 600; padding: 16px 32px; border-radius: 16px; text-decoration: none; font-size: 16px; margin: 24px 0; transition: all 0.2s; box-shadow: 0 10px 15px -3px rgba(20, 184, 166, 0.2); }
    .btn:hover { background-color: #0d9488; transform: translateY(-1px); }
    .footer { padding: 30px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #27272a; background-color: #18181b; }
    .link { word-break: break-all; color: #2dd4bf; font-size: 12px; text-decoration: none; }
    h1 { margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; }
    h2 { margin-top: 0; font-size: 22px; margin-bottom: 12px; color: #ffffff; font-weight: 700; }
    p { margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #d4d4d8; }
    .logo-container { background: rgba(255, 255, 255, 0.1); width: 64px; height: 64px; border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); }
  </style>
</head>
<body style="background-color: #09090b; color: #e4e4e7;">
  <div class="container">
    <div class="header">
       <div class="logo-container">
         <span style="font-size: 32px;">🔒</span>
       </div>
      <h1>FDVP</h1>
    </div>
    <div class="content">
      <h2>Reset Password</h2>
      <p>
        Hello! We received a request to reset your password. <br/>
        Click the button below to proceed.
      </p>
      
      <a href="${link}" class="btn" style="color: #ffffff !important;">Reset Password</a>

      <p style="font-size: 13px; color: #a1a1aa; margin-top: 32px;">
        If the button doesn't work, copy this link:<br/>
        <a href="${link}" class="link">${link}</a>
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} FDVP Community.<br/>
      Secure Password Reset System
    </div>
  </div>
</body>
</html>
    `;

    await this.transporter.sendMail({
      from: `"FDVP Security" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Reset Your Password - FDVP',
      html: htmlObj,
    });
  }

  async sendVerificationEmail(to: string, code: string) {
    const htmlObj = `
<!DOCTYPE html>
<html>
<head>
  <meta name="color-scheme" content="light dark">
  <style>
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #09090b; color: #e4e4e7; padding: 40px 20px; margin: 0; }
    .container { max-width: 480px; margin: 0 auto; background-color: #18181b; border-radius: 24px; border: 1px solid #27272a; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; text-align: center; }
    .code-box { background: rgba(20, 184, 166, 0.1); border: 1px solid rgba(20, 184, 166, 0.3); color: #2dd4bf; font-size: 32px; font-weight: 800; letter-spacing: 4px; padding: 24px; border-radius: 16px; margin: 24px 0; text-align: center; }
    .footer { padding: 30px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #27272a; background-color: #18181b; }
    h1 { margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; }
    h2 { margin-top: 0; font-size: 22px; margin-bottom: 12px; color: #ffffff; font-weight: 700; }
    p { margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #d4d4d8; }
    .logo-container { background: rgba(255, 255, 255, 0.1); width: 64px; height: 64px; border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
       <div class="logo-container"><span style="font-size: 32px;">🛡️</span></div>
      <h1>FDVP</h1>
    </div>
    <div class="content">
      <h2>Verify Your Email</h2>
      <p>Your verification code is:</p>
      <div class="code-box">${code}</div>
      <p style="font-size: 13px; color: #a1a1aa;">This code expires in 10 minutes.</p>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} FDVP Community.</div>
  </div>
</body>
</html>
    `;

    await this.transporter.sendMail({
      from: `"FDVP Security" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Your Verification Code - FDVP',
      html: htmlObj,
    });
  }
}
