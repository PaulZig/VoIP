module.exports = app => {
    var hardwarekey = require('../controller/hardwarekey.controller');
    var router = require("express").Router();
    const auth = require('../middleware/auth.middleware');
    // Hardware keys are disabled: the controller never verifies the key's signature
    // and keeps its challenge state in one variable shared by all users, so it gives
    // no protection. Existing keys can still be listed and deleted.
    const disabled = (req, res) => {
        res.status(403).json({status:'false', message:'Hardware keys are disabled!'});
    };
    router.post("/register-key", auth, disabled);
    router.post("/register",auth, disabled);
    router.post("/verify",auth, disabled);

    router.post("/login-key", disabled);
    router.post("/login", disabled);

    router.post("/get",auth, hardwarekey.getKey);
    router.post("/delete",auth, hardwarekey.delete);

    app.use('/api/hardwarekey', router);
};