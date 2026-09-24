const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

const logAudit = async ({ req = null, user = null, hostel = null, action, module, recordId = null, recordType = null, description = '', meta = {}, ipAllowPrivate = true }) => {
  try {
    let u = user;
    if (!u && req && req.user) u = req.user;
    let hid = hostel;
    if (!hid && u && u.hostel) hid = u.hostel;
    const entry = {
      user: u ? u._id : undefined,
      userRole: u ? u.role : undefined,
      userName: u ? u.name : undefined,
      hostel: hid || undefined,
      action,
      module,
      recordId: recordId || undefined,
      recordType: recordType || undefined,
      description,
      meta: Object.keys(meta).length ? meta : undefined,
      ip: req ? req.ip : undefined
    };
    Object.keys(entry).forEach((k) => entry[k] === undefined && delete entry[k]);
    await AuditLog.create(entry);
  } catch (err) {
    console.error('[audit] failed to write audit log:', err.message);
  }
};

const register = async () => {};

module.exports = { logAudit, register };