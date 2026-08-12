const mongoose = require('mongoose');
const { Schema } = mongoose;

// The evidence attached to a claim — photos, invoices, packing lists, inspection reports.
// The file itself lives in file storage (not built yet); this only holds a pointer to it.
const claimDocumentSchema = new Schema({
  claim: { type: Schema.Types.ObjectId, ref: 'Claim', required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  documentType: { type: String, required: true }, // photo | invoice | packing_list | inspection_report
  fileName: String,
  mimeType: String,
  fileSizeBytes: Number,
  storageKey: { type: String, required: true },
}, { timestamps: { createdAt: 'uploadedAt', updatedAt: false } });

module.exports = mongoose.model('ClaimDocument', claimDocumentSchema);
