const crypto = require('crypto');

// DER header that turns a raw 32 byte Ed25519 public key into an SPKI key
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const TOLERANCE_SECONDS = 300;

var cachedKeys = null;
const publicKeys = () => {
    if (cachedKeys === null) {
        cachedKeys = (process.env.TELNYX_PUBLIC_KEY || '')
            .split(',')
            .map((key) => key.trim().replace(/^['"]|['"]$/g, ''))
            .filter(Boolean)
            .map((key) => crypto.createPublicKey({
                key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(key, 'base64')]),
                format: 'der',
                type: 'spki'
            }));
        if (cachedKeys.length === 0) {
            console.log('TELNYX_PUBLIC_KEY is not set, all Telnyx webhooks will be rejected');
        }
    }
    return cachedKeys;
};

// Rejects Telnyx webhooks that are not signed with the account's Ed25519 key.
// Telnyx signs "<telnyx-timestamp>|<raw body>".
// Routes with a :type param (sms routes) are left to the Twilio check when type is twilio.
module.exports = (req, res, next) => {
    if (req.params.type === 'twilio') {
        return next();
    }
    try {
        const signature = req.header('telnyx-signature-ed25519');
        const timestamp = req.header('telnyx-timestamp');
        const age = Math.abs(Date.now() / 1000 - Number(timestamp));
        if (signature && timestamp && req.rawBody && age <= TOLERANCE_SECONDS) {
            const message = Buffer.concat([Buffer.from(`${timestamp}|`), req.rawBody]);
            const signatureBytes = Buffer.from(signature, 'base64');
            const valid = publicKeys().some((key) => crypto.verify(null, message, key, signatureBytes));
            if (valid) {
                return next();
            }
        }
    } catch (error) {
        console.log(error);
    }
    console.log(`rejected Telnyx webhook with missing or invalid signature: ${req.originalUrl}`);
    res.status(403).send('Invalid signature');
};
