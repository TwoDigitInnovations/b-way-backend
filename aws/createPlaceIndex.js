const { CreatePlaceIndexCommand } = require("@aws-sdk/client-location");

async function createPlaceIndex() {
  const command = new CreatePlaceIndexCommand({
    IndexName: "MyPlaceIndex",
    DataSource: "Esri",
    PricingPlan: "RequestBasedUsage"
  });

  const response = await client.send(command);
  console.log("Place index created", response);
}
