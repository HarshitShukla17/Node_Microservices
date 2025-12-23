const logger=require("../utils/logger.js")
const jwt=require("jsonwebtoken")

const validateToken=async(req,res,next)=>{
    const authHeader=req.headers['authorization'];
    const token=authHeader&&authHeader.split(" ")[1];   //"format looks like bearer token"
    if(!token){
        logger.warn("Access attemp without valid token")
        return res.status(401).json({success:false,message:"Authentication failed"})
    }

    jwt.verify(token,process.env.JWT_SECRET,(err,user)=>{
        if(err)
        {
            logger.warn("Invalid token")
            return res.status(401).json({success:false,message:"Invalid token!"})
        }
        req.user=user;
        next();
    })
}

module.exports=validateToken
