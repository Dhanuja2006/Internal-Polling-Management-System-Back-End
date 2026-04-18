import mongoose from 'mongoose';
import env from '../Config/env.js';

const connectDB = async () => {
    const conn = await mongoose.connect(env.mongoUri, {
        dbName: 'poll'
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);
};

export default connectDB;
