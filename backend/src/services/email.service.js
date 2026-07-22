// No SMTP provider is configured in this repo yet, so delivery is mocked —
// same convention as the carrier adapters and the FedEx PIN flow.
function sendOtpEmail(user, code) {
  console.log(`[DEV EMAIL] To: ${user.email} — Your IFF Cargo verification code is: ${code} (expires in 10 min)`);
}

module.exports = { sendOtpEmail };
