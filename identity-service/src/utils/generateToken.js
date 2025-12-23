const jwt=require("jsonwebtoken")
const crypto=require("crypto")
const RefreshToken=require("../models/refreshToken.model.js")


const generateToken=async(user)=>{
    const accessToken=jwt.sign({
        userId:user._id,
        username:user.username
    },process.env.JWT_SECRET,{  //one more logic need to implement means when their is no  curson movement then automatically logout
        expiresIn:"15m"
    })

    const refreshToken=crypto.randomBytes(40).toString("hex")
    const expiresAt=new Date()
    expiresAt.setDate(expiresAt.getDate()+7) // refresh tokens expires in 7 days

    await RefreshToken.create({
        user:user._id,
        token:refreshToken,
        expiresAt
    })

    return {accessToken,refreshToken};
}

module.exports=generateToken

