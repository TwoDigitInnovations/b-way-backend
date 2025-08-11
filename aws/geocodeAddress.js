const locationClient = require("./locationClient");
const {
  SearchPlaceIndexForTextCommand
} = require("@aws-sdk/client-location");

async function geocodeAddress(address) {
  try {
    const command = new SearchPlaceIndexForTextCommand({
      IndexName: process.env.AWS_PLACE_INDEX,
      Text: address,
      MaxResults: 1
    });

    const response = await locationClient.send(command);
    
    if (!response.Results || response.Results.length === 0) {
      throw new Error(`No coordinates found for address: ${address}`);
    }
    
    return response.Results[0].Place.Geometry.Point; // [lng, lat]
  } catch (error) {
    console.error(`Error geocoding address "${address}":`, error);
    throw error;
  }
}

module.exports = geocodeAddress;
