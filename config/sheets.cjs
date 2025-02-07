// config/sheets.cjs
module.exports = {
  spreadsheetId: process.env.TIMESHEET_SPREADSHEET_ID,
  range: 'XpertBuild!A:F',
  syncSchedule: '0 21 * * *',
  batchSize: 100,
}
