const { MongoClient } = require("mongodb");


const uri = process.env.MONGO_URI;
const options = {};


if (!uri) {
  throw new Error("Please define the MONGO_URI environment variable inside .env");
}

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

async function connectDB() {
  const client = await clientPromise;
  return client.db(process.env.DB_NAME);
}

module.exports = connectDB;