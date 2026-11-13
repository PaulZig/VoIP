module.exports = app => {
    var call = require('../controller/call.controller');
    var router = require("express").Router();
    const auth = require('../middleware/auth.middleware');
    const twilioWebhook = require('../middleware/twilio-webhook.middleware');
    const telnyxWebhook = require('../middleware/telnyx-webhook.middleware');

    router.post("/setting", auth, call.create);
    router.post("/setting/delete", auth, call.delete);
    router.post("/setting/get", auth, call.get);
    router.post("/token", auth, call.getToken);

    //calling route
    router.post("/make-call", twilioWebhook, call.makeCall);
    router.post("/status", twilioWebhook, call.status);
    router.post("/incomming", twilioWebhook, call.incomming);
    // numbers are configured with this spelling
    router.post("/incoming", twilioWebhook, call.incomming);
    router.post("/telnyx", telnyxWebhook, call.telnyx);
    router.post("/status/telnyx", telnyxWebhook, call.statusTelnyx);
    
    app.use('/api/call', router);
};