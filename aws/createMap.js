const { CreateMapCommand } = require("@aws-sdk/client-location");
const client = require('./locationClient');

async function createMap() {
  const command = new CreateMapCommand({
    MapName: "MyDeliveryMap",
    Configuration: {
      Style: "VectorEsriStreets"
    }
  });

  const response = await client.send(command);
  console.log("Map created", response);
}
