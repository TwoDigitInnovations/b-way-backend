const { LocationClient } = require("@aws-sdk/client-location");

const locationClient = new LocationClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
});

module.exports = locationClient;
