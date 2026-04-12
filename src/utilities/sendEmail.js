const nodemailer = require("nodemailer");

const adminEmailTemplate = (name, email, password) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
      <div style="background-color: #4F46E5; padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Meal Management System</h1>
      </div>
      
      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #4F46E5; margin-top: 0;">স্বাগতম, ${name}!</h2>
        <p>আপনাকে আমাদের সিস্টেমের <strong>Admin</strong> হিসেবে নিযুক্ত করা হয়েছে। এখন থেকে আপনি ড্যাশবোর্ড পরিচালনা করতে পারবেন।</p>
        
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px dashed #4F46E5;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">আপনার লগইন তথ্য নিচে দেওয়া হলো:</p>
          <p style="margin: 10px 0; font-size: 16px;"><strong>Email:</strong> <span style="color: #111827;">${email}</span></p>
          <p style="margin: 10px 0; font-size: 16px;"><strong>Password:</strong> <span style="color: #111827;">${password}</span></p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/login" style="background-color: #4F46E5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">লগইন করুন</a>
        </div>

        <p style="font-size: 13px; color: #ef4444; margin-top: 25px;">
          * নিরাপত্তা রক্ষার্থে লগইন করার পর পাসওয়ার্ডটি পরিবর্তন করে নিন।
        </p>
      </div>

      <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
        <p style="margin: 0;">এটি একটি অটো-জেনারেটেড ইমেইল। দয়া করে এখানে রিপ্লাই করবেন না।</p>
        <p style="margin: 5px 0;">&copy; 2026 Meal Management System. All Rights Reserved.</p>
      </div>
    </div>
  `;
};

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  let htmlBody = options.html;
  if (options.data) {
    const { name, email, password } = options.data;
    htmlBody = adminEmailTemplate(name, email, password);
  }

  const mailOptions = {
    from: `"Meal Management System" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: htmlBody,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to: ${options.email}`);
  } catch (error) {
    console.error("Nodemailer Error: ", error);
    throw error;
  }
};

module.exports = sendEmail;
