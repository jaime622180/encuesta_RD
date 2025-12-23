const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "jaimejunior622@gmail.com", // tu correo
    pass: "illrvqfztirsolct",         // contraseña de aplicación
  },
});

async function sendSurveyEmail(email) {

  // 🔥 LINK CORRECTO
  const surveyLink = `http://localhost:3000/?email=${encodeURIComponent(email)}`;

  const mailOptions = {
    from: '"Encuesta RD" <jaimejunior622@gmail.com>',
    to: email,
    subject: "Invitación a la encuesta",
    html: `
      <h2>📋 Invitación a encuesta</h2>
      <p>Has sido invitado a participar en una encuesta.</p>
      <p>
        👉 <a href="${surveyLink}">Haz clic aquí para responder</a>
      </p>
      <p style="font-size:12px;color:#666">
        Este enlace es personal y solo puede usarse una vez.
      </p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendSurveyEmail };
