const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

const getTransporter = () => {
  if (!config.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.password }
    });
  }
  return transporter;
};

const templates = {
  welcome: (data) => ({
    subject: 'Welcome to HostelHub',
    html: `<h2>Welcome, ${data.name}!</h2><p>Your ${data.hostel || 'hostel'} account is ready on HostelHub.</p><p>Sign in at ${config.clientUrl}</p>`
  }),
  admission: (data) => ({
    subject: 'Admission Confirmed',
    html: `<h2>Admission Confirmed</h2><p>Hi ${data.name}, your admission to <b>${data.hostel}</b> is confirmed.</p><p>Room: ${data.room} • Bed: ${data.bed}<br/>Admission date: ${data.date}</p>`
  }),
  invoice: (data) => ({
    subject: `Invoice ${data.number}`,
    html: `<h2>Invoice ${data.number}</h2><p>Hi ${data.name}, your invoice of <b>${data.amount}</b> is due on ${data.dueDate}.</p>`
  }),
  receipt: (data) => ({
    subject: `Payment Receipt ${data.number}`,
    html: `<h2>Payment Received</h2><p>Hi ${data.name}, we received <b>${data.amount}</b> on ${data.date}.</p><p>Balance remaining: ${data.balance}</p>`
  }),
  rentReminder: (data) => ({
    subject: 'Rent Reminder',
    html: `<h2>Rent Due</h2><p>Hi ${data.name}, your rent of <b>${data.amount}</b> is due. Please make payment by ${data.dueDate}.</p>`
  }),
  passwordReset: (data) => ({
    subject: 'Password Reset',
    html: `<h2>Reset your password</h2><p>Click the link to reset your password (valid 1 hour):</p><p><a href="${data.resetUrl}">${data.resetUrl}</a></p>`
  }),
  complaintUpdate: (data) => ({
    subject: `Complaint Update: ${data.title}`,
    html: `<h2>Complaint ${data.status}</h2><p>${data.message}</p>`
  }),
  leaveApproval: (data) => ({
    subject: `Leave ${data.status}`,
    html: `<h2>Leave ${data.status}</h2><p>Your leave request from ${data.startDate} to ${data.endDate} has been <b>${data.status}.</b></p>`
  }),
  notice: (data) => ({
    subject: `Notice: ${data.title}`,
    html: `<h2>${data.title}</h2><p>${data.description}</p>`
  })
};

const sendMail = async (to, templateName, data) => {
  const t = getTransporter();
  if (!t) {
    console.warn(`[mail] SMTP not configured; skipping "${templateName}" email to ${to}`);
    return null;
  }
  const template = templates[templateName];
  if (!template) throw new Error(`Unknown email template: ${templateName}`);
  const { subject, html } = template(data);
  try {
    await t.sendMail({ from: config.smtp.from, to, subject, html });
    return true;
  } catch (err) {
    console.error(`[mail] Failed to send "${templateName}":`, err.message);
    return null;
  }
};

module.exports = { sendMail, templates };