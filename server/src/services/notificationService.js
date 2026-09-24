const Notification = require('../models/Notification');

const notify = async ({ hostel = null, user = null, student = null, type = 'info', title, message, link = null }) => {
  try {
    const data = {
      hostel: hostel || undefined,
      user: user || undefined,
      student: student || undefined,
      type,
      title,
      message: message || title,
      link: link || undefined
    };
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    return await Notification.create(data);
  } catch (err) {
    console.error('[notify] failed:', err.message);
    return null;
  }
};

module.exports = { notify };