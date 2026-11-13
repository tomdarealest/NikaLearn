type EmailProvider = 'resend' | 'nodemailer' | 'smtp' | 'gmail' | 'sendgrid' | 'console';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const provider = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();

  if (provider === 'resend') {
    return sendEmailViaResend(options);
  } else if (provider === 'nodemailer' || provider === 'smtp' || provider === 'gmail') {
    return sendEmailViaNodemailer(options);
  } else if (provider === 'sendgrid') {
    const { sendEmailViaSendGrid } = await import('./email-sendgrid');
    return sendEmailViaSendGrid(options);
  } else {
    return sendEmailViaConsole(options);
  }
}

async function sendEmailViaResend(options: SendEmailOptions): Promise<void> {
  try {
    let Resend: any;
    try {
      const resendModule = require('resend');
      Resend = resendModule.Resend || resendModule.default?.Resend || resendModule.default;
    } catch (importError: any) {
      if (importError.code === 'MODULE_NOT_FOUND' || importError.message?.includes('Cannot find module')) {
        throw new Error('Resend package not installed. Run: npm install resend');
      }
      throw importError;
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const resend = new Resend(apiKey);
    let fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });

    if (error) {
      if (error.message?.includes('domain is not verified') || error.message?.includes('testing emails')) {
        console.warn('⚠️ Resend test domain limitation detected');
        fromEmail = 'onboarding@resend.dev';
        const retry = await resend.emails.send({
          from: fromEmail,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>/g, ''),
        });
        if (retry.error) {
          if (retry.error.message?.includes('testing emails')) {
            throw new Error(`Resend: Chỉ có thể gửi đến email đã verify. Giải pháp: 1) Thêm email vào Resend, hoặc 2) Dùng Gmail SMTP (xem EMAIL_SETUP_NO_DOMAIN.md)`);
          }
          throw new Error(`Resend error: ${retry.error.message}`);
        }
        console.log('✅ Email sent via Resend (test domain):', retry.data?.id);
        return;
      }
      throw new Error(`Resend error: ${error.message}`);
    }

    console.log('✅ Email sent via Resend:', data?.id);
  } catch (error: any) {
    console.error('❌ Resend email error:', error);
    throw error;
  }
}

async function sendEmailViaNodemailer(options: SendEmailOptions): Promise<void> {
  try {
    let nodemailer: any;
    try {
      nodemailer = require('nodemailer');
    } catch (importError: any) {
      if (importError.code === 'MODULE_NOT_FOUND' || importError.message?.includes('Cannot find module')) {
        throw new Error('Nodemailer package not installed. Run: npm install nodemailer @types/nodemailer');
      }
      throw importError;
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

    if (!smtpUser || !smtpPass || smtpUser.includes('your_') || smtpPass.includes('your_')) {
      console.warn('⚠️ [Gmail SMTP] SMTP_USER/PASS chưa cấu hình. Đang chạy fallback Console.');
      return sendEmailViaConsole(options);
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || `NikaLearn <${smtpUser}>`;
    const mailOptions = {
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    };

    await transporter.verify();
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent via Nodemailer (Gmail SMTP):', info.messageId);
  } catch (error: any) {
    console.error('❌ Nodemailer email error:', error);
    if (error.code === 'EAUTH') {
      throw new Error('Xác thực SMTP thất bại. Kiểm tra SMTP_USER và SMTP_PASS (App Password). Xem GMAIL_APP_PASSWORD_GUIDE.md');
    }
    if (error.code === 'ECONNECTION') {
      throw new Error('Không thể kết nối đến SMTP server. Kiểm tra SMTP_HOST và SMTP_PORT.');
    }
    throw error;
  }
}


async function sendEmailViaConsole(options: SendEmailOptions): Promise<void> {
  console.log('\n📧 ===== EMAIL (CONSOLE MODE) =====');
  console.log('To:', options.to);
  console.log('Subject:', options.subject);
  console.log('Body:', options.text || options.html.replace(/<[^>]*>/g, ''));
  console.log('===================================\n');
}

export function generateOTPEmailHTML(otp: string, userName?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã xác thực OTP</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #9333ea 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">NikaLearn</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #111827; font-size: 20px; font-weight: 600;">
                ${userName ? `Xin chào ${userName},` : 'Xin chào,'}
              </h2>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã OTP sau để xác thực:
              </p>
              <div style="background-color: #f3f4f6; border: 2px dashed #6366f1; border-radius: 8px; padding: 24px; text-align: center; margin: 30px 0;">
                <div style="font-size: 36px; font-weight: 700; color: #6366f1; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${otp}
                </div>
              </div>
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong>Lưu ý:</strong>
              </p>
              <ul style="margin: 10px 0 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                <li>Mã OTP có hiệu lực trong <strong>10 phút</strong></li>
                <li>Không chia sẻ mã này với bất kỳ ai</li>
                <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Email này được gửi tự động, vui lòng không trả lời.<br>
                © ${new Date().getFullYear()} NikaLearn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateOTPEmailText(otp: string, userName?: string): string {
  return `
NikaLearn - Mã xác thực OTP

${userName ? `Xin chào ${userName},` : 'Xin chào,'}

Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã OTP sau để xác thực:

${otp}

Lưu ý:
- Mã OTP có hiệu lực trong 10 phút
- Không chia sẻ mã này với bất kỳ ai
- Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này

© ${new Date().getFullYear()} NikaLearn. All rights reserved.
  `.trim();
}


export function generateActivationEmailHTML(otp: string, userName?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kích hoạt tài khoản NikaLearn</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1A2616 0%, #6B8045 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">NikaLearn</h1>
              <p style="margin: 6px 0 0; color: #FFD23F; font-size: 13px; font-weight: 600;">Chào mừng bạn đến với NikaLearn!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 700;">
                ${userName ? `Xin chào ${userName},` : 'Xin chào,'}
              </h2>
              <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.6;">
                Cảm ơn bạn đã đăng ký tài khoản tại <strong>NikaLearn</strong>. Vui lòng nhập mã OTP 6 số bên dưới để xác thực và kích hoạt tài khoản của bạn:
              </p>
              <div style="background-color: #F7F4EB; border: 2px dashed #6B8045; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
                <div style="font-size: 38px; font-weight: 900; color: #1A2616; letter-spacing: 10px; font-family: 'Courier New', monospace;">
                  ${otp}
                </div>
              </div>
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong>Lưu ý bảo mật:</strong>
              </p>
              <ul style="margin: 10px 0 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                <li>Mã kích hoạt có hiệu lực trong vòng <strong>10 phút</strong>.</li>
                <li>Tuyệt đối không chia sẻ mã này với bất kỳ ai để bảo vệ tài khoản.</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Email này được gửi tự động từ hệ thống NikaLearn.<br>
                © ${new Date().getFullYear()} NikaLearn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateActivationEmailText(otp: string, userName?: string): string {
  return `
NikaLearn - Kích hoạt tài khoản

${userName ? `Xin chào ${userName},` : 'Xin chào,'}

Cảm ơn bạn đã đăng ký tài khoản tại NikaLearn. Vui lòng sử dụng mã OTP sau để kích hoạt tài khoản:

${otp}

Lưu ý:
- Mã xác thực có hiệu lực trong 10 phút.
- Không chia sẻ mã này với bất kỳ ai.

© ${new Date().getFullYear()} NikaLearn. All rights reserved.
  `.trim();
}
