const { LocationClient } = require("@aws-sdk/client-location");
require("dotenv").config();

const locationClient = new LocationClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

module.exports = locationClient;
