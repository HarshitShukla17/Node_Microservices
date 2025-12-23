require("dotenv").config()
const express=require("express")
const mongoose=require("mongoose")
const Redis=require("ioredis")
const cors=require("cors")
const helmet=require("helmet")
const postRoutes=require("./routes/post-routes.js")
const errorHandler=require("./middleware/errorHandler.js")
const logger=require("./utils/logger.js")
const {rateLimit}=require("express-rate-limit")
const {RedisStore}=require("rate-limit-redis")
const {RateLimiterRedis}=require("rate-limiter-flexible")


const PORT=process.env.PORT || 3002

mongoose.connect(process.env.MONGODB_URI).then(()=>{
    logger.info("Connected to MongoDB")
}).catch((error)=>{
    logger.error("Failed to connect to MongoDB",error)
})

const redisClient=new Redis(process.env.REDIS_URL)

const app=express()

app.use(cors())
app.use(helmet())
app.use(express.json())

app.use((req,res,next)=>{
    logger.info(`Request: ${req.method} ${req.url}`)
    logger.info(`Request Headers: ${JSON.stringify(req.headers)}`)
    
    next()
})




//***home work ...implement the rate limiting  for the sensitive endpoints
//DDos protection and rate limiting

const rateLimiter=new RateLimiterRedis({
    storeClient:redisClient,
    keyPrefix:"post-service",
    points:30,
    duration:1
})

const sensitiveEndpointsLimiter=rateLimit({
    windowMs:15*60*1000,
    max:200,
    standardHeaders:true,
    legacyHeaders:false,
    handler:(req,res)=>{
        logger.warn("Rate limit exceeded for IP: ",req.ip)
        res.status(429).json({success:false,message:"Too many requests"}) //429 is error code for the rate limiting
    },
    store:new RedisStore({
        sendCommand:(...args)=>redisClient.call(...args),
    })
})

//apply rate limiter to sensitive endpoints
app.use("/api/posts/get-all-posts",sensitiveEndpointsLimiter)

//middleware to pass redis client to routes for the cashing purpose...
app.use("/api/posts",(req,res,next)=>{
    req.redisClient=redisClient
    next();
}, postRoutes)

//error handler
app.use(errorHandler)



app.listen(PORT,()=>{
    logger.info(`Post-Service is running on port ${PORT}`)
})

//we use this to handle the unhandled promise rejections

process.on("unhandledRejection",(reason,promise)=>{
    logger.error("Unhandled Promise Rejection",promise,"reason",reason)
})

