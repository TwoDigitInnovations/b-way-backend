const { CreateRouteCalculatorCommand } = require("@aws-sdk/client-location");

async function createRouteCalculator() {
  const command = new CreateRouteCalculatorCommand({
    CalculatorName: "BWayRouteCalculator",
    DataSource: "Esri"
  });

  const response = await client.send(command);
  console.log("Route calculator created", response);
}
