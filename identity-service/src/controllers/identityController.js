//user registration
//user login
//user logout

const logger=require("../utils/logger.js")
const User=require("../models/user.model.js")
const RefreshToken=require("../models/refreshToken.model.js")
const  {validateRegistration,validateLogin}=require("../utils/validation.js")
const generateToken=require("../utils/generateToken.js")


const registerUser=async(req,res)=>{
    logger.info("Registration endpoint hit... ")
    try {
        const {error,value}=validateRegistration(req.body)
        if(error){
            logger.warn("Validation error: ",error.details[0].message)
            return res.status(400).json({success:false,message:error.details[0].message})
        }

        const {username,email,password}=req.body;
        let user=await User.findOne({$or:[{email},{username}]})
        if(user){
            logger.warn("user already exists")
            return res.status(400).json({success:false,message:"User already exists"})
        }

        user=await User.create({
            username,
            email,
            password
        })

        logger.warn("User created Successfully");
        const {accessToken,refreshToken}=await generateToken(user);

        res.status(201).json({
            success:true,
            message:"User created Succesfully",
            accessToken,
            refreshToken
        })


        
    } catch (error) {
        logger.error("Error in registration: ",error)
        return res.status(500).json({success:false,message:"Internal Server Error"})
    }
}



const loginUser=async(req,res,next)=>{
    logger.info("Login endpoint hit... ")

    try {
        const {error,value}=validateLogin(req.body)
        if(error){
            logger.warn("Validation error: ",error.details[0].message)
            return res.status(400).json({success:false,message:error.details[0].message})
        }

        const {email,password}=req.body;
        const user=await User.findOne({email});
        if(!user)
        {
            logger.warn("User not found")
            return res.status(404).json({success:false,message:"Invalid Credentials"})
        }

        const isValidPassword=await user.comparePassword(password)
        if(!isValidPassword)
        {
            logger.warn("Invalid Password")
            return res.status(401).json({success:false,message:"Invalid Credentials"})
        }

        const {accessToken,refreshToken}=await generateToken(user);
        res.status(200).json({
            accessToken,
            refreshToken,
            userId:user._id
        })
    } catch (error) {
        logger.error("Error in login: ",error)
        return res.status(500).json({success:false,message:"Internal Server Error"})
    }
}


const refreshTokenUser=async(req,res)=>{
    logger.info("Refresh token endpoint hit... ")
    try {
        const {refreshToken}=req.body;
        if(!refreshToken){
            logger.warn("Refresh token missing")
            return res.status(400).json({success:false,message:"Invalid credentials"})
        }

        const storedToken=await RefreshToken.findOne({token:refreshToken})

        if(!storedToken||storedToken.expiresAt<Date.now())
        {
            logger.warn("Invalid Refresh Token")
            return res.status(401).json({success:false,message:"Invalid or Expired Refresh token"})
        }

        const user=await User.findById(storedToken.user)
        if(!user)
        {
            logger.warn("User not found")
            return res.status(404).json({success:false,message:"Invalid Credentials"})
        }

        const {accessToken,refreshToken:newRefreshToken}=await generateToken(user);

        //delete old refresh token
        await RefreshToken.deleteOne({_id:storedToken._id})
        res.json({
            accessToken,
            refreshToken:newRefreshToken,
            userId:user._id
        })
    } catch (error) {
        logger.error("Error in refresh token: ",error)
        return res.status(500).json({success:false,message:"Internal Server Error"})
    }
}


//logout

const logoutUser=async(req,res)=>{
    logger.info("Logout endpoint hit... ")
    try {
        const {refreshToken}=req.body;
        if(!refreshToken){
            logger.warn("Refresh token missing")
            return res.status(400).json({success:false,message:"Invalid credentials"})
        }


        await RefreshToken.deleteOne({token:refreshToken})

        logger.info("Refresh Token deleted for logout")
        return res.json({success:true,message:"User logged out successfully"})
    } catch (error) {
        logger.error("Error in logout: ",error)
        return res.status(500).json({success:false,message:"Internal Server Error"})
    }
}









module.exports={
    registerUser,
    loginUser,
    refreshTokenUser,
    logoutUser,
}