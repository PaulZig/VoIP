const twilio = require('twilio');
var Setting = require('../model/setting.model');
const { combineURLs } = require('../helper/common.helper');

// Rejects Twilio webhooks that are not signed by the account they claim to come from.
// Routes with a :type param (sms routes) are only checked when type is twilio.
module.exports = async (req, res, next) => {
    if (req.params.type !== undefined && req.params.type !== 'twilio') {
        return next();
    }
    try {
        const signature = req.header('x-twilio-signature');
        const accountSid = req.body && req.body.AccountSid;
        if (signature && accountSid) {
            var setting = await Setting.findOne({ twilio_sid: { $eq: accountSid }, twilio_token: { $ne: null } });
            if (setting) {
                // Twilio signs the exact URL it called, which behind a proxy may differ
                // from what express sees, so accept either form.
                const urls = [
                    `${req.protocol}://${req.get('host')}${req.originalUrl}`,
                    combineURLs(process.env.BASE_URL.trim(), req.originalUrl)
                ];
                const valid = urls.some((url) => twilio.validateRequest(setting.twilio_token, signature, url, req.body));
                if (valid) {
                    return next();
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
    res.status(403).send('Invalid signature');
};
