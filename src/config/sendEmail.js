import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const sendEmail = async (recipientEmail, subject, message, company) => {
    let email = process.env.EMAIL_ID;
    let appPass = process.env.APP_PASS;

    console.log("email company", company)

    let userEmail;
    let userAppPass;

    if (company?.nodemailerCredential?.email && company?.nodemailerCredential?.appPassword) {
        const decryptData = await company?.decryptCredentials()
        userEmail = decryptData.email
        userAppPass = decryptData.appPassword
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
            console.log("User-provided email and app password verified.");
            email = userEmail;
            appPass = userAppPass;
        } catch (error) {
            console.log("Invalid user credentials, falling back to .env credentials.");
        }
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
        console.log("Sending email to:", recipientEmail);
        const info = await transport.sendMail({
            from: `"${(company) ? company.name : 'Mind Gym Book'}" <${email}>`,
            to: recipientEmail,
            subject: subject,
            html: message,
        });
        console.log("Message sent: ", info.messageId);
        return true;
    } catch (error) {
        console.log("Error sending email:", error);
        return false;
    }
};

export default sendEmail;
