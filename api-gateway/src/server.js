require("dotenv").config()

const express=require("express")
const cors=require("cors")
const Redis=require("ioredis")
const helmet=require("helmet")
const {rateLimit}=require("express-rate-limit")
const {RedisStore}=require("rate-limit-redis")
const logger=require("./utils/logger.js")
const errorHandler=require("./middleware/errorHandler.js")
const validateToken=require("./middleware/authMiddleware.js")

const proxy=require("express-http-proxy")

const app=express()
const port=process.env.PORT || 3000

//redis client
const redisClient=new Redis(process.env.REDIS_URL)

//middleware
app.use(helmet())
app.use(cors())
app.use(express.json())


//rate limiting


const ratelimit=rateLimit({
    windowMs:15*60*1000,  //15 minutes this is the time for which the rate limiting is applied
    max:100,  //50 requests per 15 minutes
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

app.use(ratelimit)

app.use((req,res,next)=>{
    logger.info(`Recieved ${req.method} request to ${req.url}`)
    logger.info(`Request Body: ${req.body}`)
    next()
})



//Proxy

const proxyOptions={
    proxyReqPathResolver:(req)=>{
        return req.originalUrl.replace(/^\/v1/,"/api") //replace /v1 with /api
    },
    proxyErrorHandler:(err,res,next)=>{
        logger.error(`Proxy error for ${err.message}`)
        res.status(500).json({success:false,message:"Proxy error",error:err.message})
        
    }
}

//settng up proxy for identity service
app.use("/v1/auth",proxy(process.env.IDENTITY_SERVICE_URL,{
    ...proxyOptions,
    proxyReqOptDecorator:(proxyReqOpts,srcReq)=>{
        proxyReqOpts.headers["Content-Type"]="application/json"
        return proxyReqOpts
    },
    userResDecorator:(proxyRes,proxyResData,userReq,userRes)=>{
        logger.info(`Response recieved form Identity-service: ${proxyRes.statusCode}`)
        return proxyResData;
    }
}));

//setting up proxy for the post service....

app.use("/v1/posts",validateToken,proxy(process.env.POST_SERVICE_URL,{
    ...proxyOptions,
    proxyReqOptDecorator:(proxyReqOpts,srcReq)=>{
        proxyReqOpts.headers["Content-Type"]="application/json"
        proxyReqOpts.headers["x-user-id"]=srcReq.user.userId
        return proxyReqOpts
    },
    userResDecorator:(proxyRes,proxyResData,userReq,userRes)=>{
        logger.info(`Response recieved form Post-service: ${proxyRes.statusCode}`)
        return proxyResData;
    }
}))


//settng up proxy for Media service

app.use("/v1/media",validateToken,proxy(
    process.env.MEDIA_SERVICE_URL,{
        ...proxyOptions,
        proxyReqOptDecorator:(proxyReqOpts,srcReq)=>{
            proxyReqOpts.headers["x-user-id"]=srcReq.user.userId
            if(srcReq.headers["Content-Type"] && !srcReq.headers["Content-Type"].startsWith("multipart/form-data")){
                proxyReqOpts.headers["Content-Type"]="application/json"
            }
            return proxyReqOpts;
        
        },
        userResDecorator:(proxyRes,proxyResData,userReq,userRes)=>{
            logger.info(`Response recieved form Media-service: ${proxyRes.statusCode}`)
            return proxyResData;
        },
        parseReqBody:false,
        
    }
))


app.use(errorHandler)


app.listen(port,()=>{
    logger.info(`Api-gateway is running on port ${port}`)
    logger.info(`Identity-service is running on port: ${process.env.IDENTITY_SERVICE_URL}`)
    logger.info(`Post-service is running on port: ${process.env.POST_SERVICE_URL}`)
    logger.info(`Media-service is running on port: ${process.env.MEDIA_SERVICE_URL}`)
    logger.info(`Redis is running on port: ${process.env.REDIS_URL}`)
})







