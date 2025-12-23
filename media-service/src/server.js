require("dotenv").config()
const RedisStore=require("rate-limit-redis")
const {rateLimit}=require("express-rate-limit")


const express=require("express")
const mongoose=require("mongoose")
const cors=require("cors")
const helmet=require("helmet")

const mediaRoutes=require("./routes/media-routes")

const errorHandler=require("./middleware/errorHandler")
const logger=require("./utils/logger.js")

const app=express()
const PORT=process.env.PORT || 3003

//connect to mongoDB

mongoose.connect(process.env.MONGODB_URI)
.then(()=>{
    logger.info("Connected to MongoDB Successfully")
})
.catch((error)=>{
    logger.error(`Failed to connect to MongoDB: ${error.message}`)
})

app.use(cors())
app.use(express.json())
app.use(helmet())


//implement rate limiting for sensitive endpoints...

// const sensitiveRateLimiter=rateLimit({
//     windowMs:15*60*1000,
//     max:50,
//     standardHeaders:true,
//     legacyHeaders:false,
//     handler:(req,res)=>{
//         logger.warn("Rate limit exceeded for IP: ",req.ip)
//         res.status(429).json({success:false,message:"Too many requests"})
//     },
//     store:new RedisStore({
//         sendCommand:(...args)=>redisClient.call(...args),
//     })
// })

// app.use('/api/media',sensitiveRateLimiter)

app.use("/api/media",mediaRoutes);
app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`Media service is running on port ${PORT}`);
}).on("error",(error)=>{
    logger.error(`Failed to start media service: ${error.message}`)
    process.exit(1)
})
    