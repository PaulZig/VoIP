module.exports = app => {
    var user = require('../controller/user.controller');
    var router = require("express").Router();
    const auth = require('../middleware/auth.middleware');
    const rateLimit = require('express-rate-limit');
    //router.post("/register",auth, user.login);
    // stricter limit on credential and code guessing
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        skipSuccessfulRequests: true,
        message: { status: 'false', message: 'Too many attempts, please try again later.' },
        standardHeaders: true,
        legacyHeaders: false
    });
    router.post("/login", authLimiter, user.login);
    //router.get("/me", user.getUser); 
    router.post("/register", user.register);
    router.post("/otp-verify", authLimiter, user.otpVerify);
    router.post("/get-signup", user.getSignUpOption);
    router.post("/get-version", user.getVersionOption);
    router.get("/get-update-version", user.getUpdateVersion);
    router.post("/check-directoryname", user.checkDirectoryName);
    

    router.post('/username/update', auth, user.updateUserName);
    router.post('/password/update', auth, user.updatePassword);
    router.post('/password/check', auth, user.checkPassword);
    router.post('/user/get', auth, user.getUser);
    router.post('/mfa/save', auth, user.saveMfa); 
    router.post('/password/verify', auth, user.passwordVerify); 

    app.use('/api/auth', router);
};