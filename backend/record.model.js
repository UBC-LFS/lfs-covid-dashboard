const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const Record = new Schema({
    _id: String,
    date: Date,
    firstName: String,
    lastName: String,
    areas: [String],
    comments: String
});
const FobData = new Schema({
    week: String,
    data: {
        type: Map,
        of: String
    }
})

const CheckInRecord = mongoose.model('Record', Record, 'CheckInRecords');
const CheckOutRecord = mongoose.model('Record', Record, 'CheckOutRecords');
const FobRecord = mongoose.model('FobData', FobData, 'FobData');

module.exports = { CheckInRecord, CheckOutRecord, FobRecord };