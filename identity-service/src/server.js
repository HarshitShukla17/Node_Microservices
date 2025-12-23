require("dotenv").config()
const mongoose=require("mongoose")
const express=require("express")
const {connectDB}=require("./db/dbconnect.js")
const helmet=require("helmet")
const cors=require("cors")
const {RateLimiterRedis}=require("rate-limiter-flexible")
const Redis=require("ioredis")
const logger=require("./utils/logger.js")
const {rateLimit}=require("express-rate-limit")
const {RedisStore}=require("rate-limit-redis")
const routes=require("./routes/identity-service.js")
const errorHandler=require("./middleware/errorHandler.js")


//initialize app
const app=express()

//connect to db
connectDB();



//redis client
    const redisClient=new Redis(process.env.REDIS_URL)
    

    // redisClient.on("error",(e)=>{
    //     logger.error("Redis connection error",e)
    // })

    // redisClient.on("connect",()=>{
    //     logger.info("Connected to redis")
    // })



//middlewares

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use((req,res,next)=>{
    logger.info(`Recieved ${req.method} request to ${req.url}`)
    logger.info(`Request Body: ${req.body}`)
    next()
})

    //DDos protection and rate limiting
    const rateLimiter=new RateLimiterRedis({
        storeClient:redisClient,
        keyPrefix:"middleware",
        points:10, 
        duration:2      //10 requests per second
    })

app.use((req,res,next)=>{
    rateLimiter.consume(req.ip).then(()=>{
        next()
    }).catch(()=>{
        logger.warn("Rate limit exceeded for IP: ",req.ip)
        res.status(429).json({success:false,message:"Too many requests"}) //429 is error code for the rate limiting
    })
})


//Ip based rate limiting for sensitive endpoint

const sensitiveEndpointsLimiter=rateLimit({
    windowMs:15*60*1000,  //15 minutes this is the time for which the rate limiting is applied
    max:50,  //50 requests per 15 minutes
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

app.use("/api/auth/register",sensitiveEndpointsLimiter)

//routes
app.use("/api/auth",routes)


//error handler
app.use(errorHandler)


app.listen(process.env.PORT||3001,()=>{
    logger.info(`Identity-Service is running on port ${process.env.PORT}`)
})


//unhandled promise rejections handler


process.on("unhandledRejection",(reason,promise)=>{   
    logger.error("Unhandled Promise Rejection",promise,"reason",reason)
})







