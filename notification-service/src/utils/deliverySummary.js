const summarizeResults = (results) => ({
  total: results.length,
  sent: results.filter(({ status }) => status === "sent").length,
  alreadySent: results.filter(({ status }) => status === "already_sent").length,
  processing: results.filter(({ status }) => status === "already_processing").length,
  failed: results.filter(({ status }) => status === "failed").length,
});

module.exports = { summarizeResults };
