import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not set in environment variables.");
}

// Connect once at boot
await mongoose.connect(MONGODB_URI);

export const mongoConnection = mongoose.connection;
// Handy helper for connect-mongo store:
export const getMongoClient = () => mongoose.connection.getClient();

mongoConnection.on("connected", () => {
  console.log("MongoDB connected successfully");
});

mongoConnection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoConnection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

// shutdown the connection
const shutdown = async (signal) => {
  try {
    console.log(`\n${signal} received. Closing MongoDB connection...`);
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
    process.exit(0);
  } catch (err) {
    console.error("Error during MongoDB disconnect:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));