const Hostel = require('../models/Hostel');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Admission = require('../models/Admission');

const pad = (n, len = 3) => String(n).padStart(len, '0');

const getCounter = async (hostelId, kind, session = null) => {
  const hostel = await Hostel.findById(hostelId).select('settings name').session(session);
  if (!hostel) throw new Error('Hostel not found');
  const prefixMap = {
    invoice: (hostel.settings && hostel.settings.invoicePrefix) || 'INV',
    receipt: (hostel.settings && hostel.settings.receiptPrefix) || 'RCP',
    admission: 'ADM'
  };
  const prefix = prefixMap[kind] || 'DOC';
  const modelMap = {
    invoice: Invoice,
    receipt: Payment,
    admission: Admission
  };
  const model = modelMap[kind];
  const year = new Date().getFullYear();
  const regex = new RegExp(`^${prefix}-${year}-`);
  const last = await model.findOne({ hostel: hostelId, [kind === 'admission' ? 'admissionNumber' : kind + 'Number']: regex })
    .session(session)
    .sort({ [kind === 'admission' ? 'admissionNumber' : kind + 'Number']: -1 });
  let seq = 1;
  if (last) {
    const raw = last[kind === 'admission' ? 'admissionNumber' : kind + 'Number'] || '';
    const tail = raw.split('-').pop();
    const n = parseInt(tail, 10);
    if (!isNaN(n)) seq = n + 1;
  }
  return `${prefix}-${year}-${pad(seq)}`;
};

module.exports = { getCounter };