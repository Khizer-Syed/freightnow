const ClaimDocument = require('../models/ClaimDocument');

// Scaffolding only — no real file storage/upload service exists yet, so this is not called
// from claim.service.js or any route. `storageKey` is accepted as a plain string the caller
// provides; there's no upload middleware or signed-URL generation here.
async function addDocumentRecord(claimId, uploadedBy, meta) {
  return ClaimDocument.create({
    claim: claimId,
    uploadedBy,
    documentType: meta.documentType,
    fileName: meta.fileName,
    mimeType: meta.mimeType,
    fileSizeBytes: meta.fileSizeBytes,
    storageKey: meta.storageKey,
  });
}

async function listDocumentsForClaim(claimId) {
  return ClaimDocument.find({ claim: claimId }).sort({ uploadedAt: -1 });
}

module.exports = { addDocumentRecord, listDocumentsForClaim };
