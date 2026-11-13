const nodemailer = require("nodemailer")
const openpgp = require('openpgp');
const twilio = require('twilio')

const sendEmail = (setting, email) => {
    return new Promise(async (resolve) => {
        try {
            const transporter = nodemailer.createTransport({
                host: setting.host, // "smtp.gmail.com",
                port: setting.port, // 587,
                secure: setting.secure, // true for 465, false for other ports
                auth: {
                    user:  setting.email, // process.env.EMAIL, // generated ethereal user
                    pass: setting.password, // process.env.PASSWORD, // generated ethereal password
                },
            });

            const mailOptions = {
                from: setting.sender_email, // sender address
                to: setting.to_email, // list of receivers
                subject: email.subject, // Subject line
                text:  email.email, // plain text body
                html: email.html
            };

            if (setting.pgpEncryptEnabled === true) {
                const publicKey = await openpgp.readKey({ armoredKey: setting.pgpPublicKey });
                if (mailOptions.text) {
                    const encrypted = await openpgp.encrypt({
                        message: await openpgp.createMessage({ text: mailOptions.text }),
                        encryptionKeys: publicKey,
                    });
                    mailOptions.text = encrypted;
                }
                if (mailOptions.html) {
                    const encryptedHtml = await openpgp.encrypt({
                        message: await openpgp.createMessage({ text: mailOptions.html }),
                        encryptionKeys: publicKey,
                    });
                    mailOptions.html = encryptedHtml;
                }
            }

            transporter.sendMail(mailOptions);
            resolve(true);
        }catch (e){
            console.log(e);
            resolve(false);
        }
    });
}

const creatTwiml = (sid, token) => {
    return new Promise(async (resolve) => {
        try {
            const client = twilio(sid, token);
            var twiml = await client.applications.create({
                voiceMethod: 'POST',
                voiceUrl: '',
                friendlyName: 'Operation Privacy VoIPSuite'
            })
            resolve(twiml.sid)
        }catch (e){
            console.log(e);
            resolve(false);
        }
    });
}

const combineURLs = (...urls)  => {
    let output = urls[0];
    for (let i = 1; i < urls.length; i++) {
        output = output.replace(/\/+$/, '') + '/' + urls[i].replace(/^\/+/, '');
    }
    return output;
}

module.exports = {
    sendEmail, creatTwiml, combineURLs
}