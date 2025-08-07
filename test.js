const { MongoClient } = require('mongodb');

async function renameField() {
  const client = new MongoClient(
    'mongodb+srv://bwaylogistics1:QCMzJAQGtsVAenvs@cluster0.hfo9pew.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  );
  await client.connect();
  const db = client.db('test');
  const collection = db.collection('routes');

  //   await collection.updateMany(
  //     { zipCode: { $exists: true } },
  //     { $rename: { "zipCode": "zipcode" } }
  //   );
  const result = await collection.updateMany(
    { 'startLocation.zipCode': { $exists: true } },
    { $rename: { 'startLocation.zipCode': 'startLocation.zipcode' } },
  );

  console.log('Field renamed.');
  await client.close();
}

renameField();
