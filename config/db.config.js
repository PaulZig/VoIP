const db_uri = process.env.DB;
const mongoose = require('mongoose');
mongoose.connect(db_uri);
module.exports = mongoose;