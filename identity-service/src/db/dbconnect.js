const mongoose=require("mongoose")
const logger=require("../utils/logger.js")

const connectDB=async()=>{
    console.log("hello connection")
    try {
        await mongoose.connect(process.env.MONGODB_URI).then(()=>{
            logger.info("MongoDB connected")
        }).catch((error)=>{
            logger.error("MongoDB connection error",error.details[0].message)
        })
    } catch (error) {
        logger.error("MongoDB connection error",error.details[0].message)
    }


}

module.exports={connectDB}
