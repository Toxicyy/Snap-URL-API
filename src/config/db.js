import mongoose from "mongoose";
import "dotenv/config";

const connectDB = async () => {
  if (process.env.NODE_ENV === "test") {
    console.log("Test environment - skipping real DB connection");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅MongoDB connected successfully");
    console.log("- Database name:", mongoose.connection.name);
    console.log("- Host:", mongoose.connection.host);
  } catch (error) {
    console.error("X - DB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
