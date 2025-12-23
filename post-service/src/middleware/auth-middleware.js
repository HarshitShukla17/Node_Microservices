const {logger}=require("../utils/logger.js")

const authenticateUser=(req,res,next)=>{
     const userId=req.headers['x-user-id']

     if(!userId)
     {
        logger.warn("access atttempted without user id")
        return res.status(401).json({
            success:false,
            message:"Authentication required! please login to continue"
        })
     }
     req.user={userId}
     next()
    
}

module.exports={authenticateUser}