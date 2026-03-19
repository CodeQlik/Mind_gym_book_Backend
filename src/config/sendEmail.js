import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const sendEmail = async (
  recipientEmail,
  subject,
  message,
  company,
  attachments,
) => {
  console.log("Sending email to:", recipientEmail);
  let email = process.env.EMAIL_ID;
  let appPass = process.env.APP_PASS;

  let userEmail;
  let userAppPass;

  if (
    company?.nodemailerCredential?.email &&
    company?.nodemailerCredential?.appPassword
  ) {
    const decryptData = await company?.decryptCredentials();
    userEmail = decryptData.email;
    userAppPass = decryptData.appPassword;
  }

  if (userEmail && userAppPass) {
    const testTransport = nodemailer.createTransport({
      host: process.env.NODEMAILER_HOST,
      port: process.env.NODEMAILER_PORT,
      secure: true,
      auth: {
        user: userEmail,
        pass: userAppPass,
      },
    });
    try {
      await testTransport.verify();
      console.log("Custom SMTP working");
      email = userEmail;
      appPass = userAppPass;
    } catch (error) {
      console.log("Custom SMTP Error:", error.message);
    }
  }

  const transport = nodemailer.createTransport({
    host: process.env.NODEMAILER_HOST,
    port: parseInt(process.env.NODEMAILER_PORT), // Convert to number
    secure: parseInt(process.env.NODEMAILER_PORT) === 465, // True for 465, false for 587
    auth: {
      user: email,
      pass: appPass,
    },
    tls: {
      rejectUnauthorized: false, // Avoid SSL verification issues on some servers
    },
    socketTimeout: 60000,
  });

  try {
    const info = await transport.sendMail({
      from: `"${company ? company.name : "Mind Gym Book"}" <${email}>`,
      to: recipientEmail,
      subject: subject,
      html: message,
      attachments: attachments || [],
    });

    return true;
  } catch (error) {
    console.error(`[NODEMAILER ERROR]: ${error.message}`);
    return false;
  }
};

export default sendEmail;
