import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const sendEmail = async (recipientEmail, subject, message, company) => {
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

      email = userEmail;
      appPass = userAppPass;
    } catch (error) {}
  }

  const transport = nodemailer.createTransport({
    host: process.env.NODEMAILER_HOST,
    port: process.env.NODEMAILER_PORT,
    secure: true,
    auth: {
      user: email,
      pass: appPass,
    },
    socketTimeout: 60000,
  });

  try {
    const info = await transport.sendMail({
      from: `"${company ? company.name : "Mind Gym Book"}" <${email}>`,
      to: recipientEmail,
      subject: subject,
      html: message,
    });

    return true;
  } catch (error) {
    return false;
  }
};

export default sendEmail;
