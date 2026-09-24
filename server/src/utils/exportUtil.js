const XLSX = require('xlsx');

const csvString = (rows, columns) => {
  const headers = columns.map((c) => c.label);
  const lines = rows.map((r) =>
    columns
      .map((c) => {
        let v = c.value(r);
        if (v === null || v === undefined) v = '';
        v = String(v);
        return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      })
      .join(',')
  );
  return [headers.join(','), ...lines].join('\r\n');
};

const sendCSV = (res, rows, columns, filename) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  const buf = Buffer.from('\uFEFF' + csvString(rows, columns), 'utf8');
  res.send(buf);
};

const sendXLSX = (res, rows, columns, filename) => {
  const data = rows.map((r) => {
    const obj = {};
    columns.forEach((c) => {
      obj[c.label] = c.value(r);
    });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  res.send(buf);
};

module.exports = { csvString, sendCSV, sendXLSX };