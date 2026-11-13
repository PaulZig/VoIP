var Media = require('../model/media.model');
const multer = require("multer")
const path = require("path")
const crypto = require('crypto')
const moment = require('moment')
const fs = require("fs")
const { combineURLs } = require("../helper/common.helper")

var storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        var date = moment(new Date()).format('MMDDYYYY');
        try {
            await fs.promises.mkdir('./uploads/' + date, { recursive: true });
        } catch (e) {
            // report through multer, a rejection here would take the process down
            return cb(e);
        }
        // Uploads is the Upload_folder_name
        cb(null, `./uploads/${date}/`)
        // cb(null, combineURLs(__dirname, '../../../uploads/'));
    },
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname).toLowerCase();
        var filename = crypto.randomBytes(24).toString('hex');
        cb(null, filename + ext);
        // cb(null, new Date().toISOString().replace(/:/g, '-')+".jpg")
    }
})

const maxSize = 25 * 1000 * 1000;

var upload = multer({
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: function (req, file, cb) {

        // Set the filetypes, it is optional
        var filetypes = /jpeg|jpg|gif|png/;
        var mimetype = filetypes.test(file.mimetype);

        var extname = filetypes.test(path.extname(
            file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }

        cb("Error: File upload only supports the "
            + "following filetypes - " + filetypes);
    }

    // mypic is the name of file attribute
}).single("file");


exports.fileUpload = async (req, res) => {
    try {
        upload(req, res, async function (err) {
            if (err) {
                res.send(err)
            }
            else {
                var date = moment(new Date()).format('MMDDYYYY');
                var mediaData = { media: `uploads/${date}/${req.file.filename}`, user: req.user.id };

                var media = await Media.create(mediaData);
                if (media) {
                    media.media = combineURLs(
                      process.env.BASE_URL.trim(),
                      media.media
                    );
                    res.send({ status: true, message: 'Media upload!', data: media });
                } else {
                    res.status(400).json({ status: 'false', message: 'Media not uploaded!' });
                }
            }
        })
    } catch (error) {
        res.status(400).json({ status: 'false', message: 'something is wrong' });
    }
};

var cron = require('node-cron');

// remove dated upload folders (MMDDYYYY) older than 7 days
const removeOldUploads = () => {
    var cutoff = moment().subtract(7, "days").startOf("day");
    for (const dir of fs.readdirSync("./uploads")) {
        var date = moment(dir, "MMDDYYYY", true);
        if (date.isValid() && date.isBefore(cutoff)) {
            fs.rmSync("./uploads/" + dir, { recursive: true, force: true });
        }
    }
}

// cron job runs every day at 01:00
cron.schedule('0 1 * * *', () => {
    console.log('running a cron job daily at 01:00 to delete mms folders older than 7 days');
    try {
        removeOldUploads();
    } catch (e) {
        console.log(e)
    }
});
exports.deleteMedia = async (req, res) => {
    try {
        removeOldUploads();
        res.send({ status: true, message: 'Old media deleted!', data: [] });
    } catch (error) {
        res.status(400).json({ status: 'false', message: 'something is wrong' });
    }
};
