
const {Cache} = require("./cache");
const {S3Cache} = require("./s3");
const {NullCache} = require("./null");

module.exports = {Cache, S3Cache, NullCache};
