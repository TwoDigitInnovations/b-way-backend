const { LocationClient } = require("@aws-sdk/client-location");

const locationClient = new LocationClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY || "AKIASXERICTOUTT32WW7",
    secretAccessKey: process.env.AWS_SECRET_KEY || "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"
  }
});

module.exports = locationClient;
