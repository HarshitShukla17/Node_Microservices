const express=require("express")
const router=express.Router()
const multer=require("multer")

const { uploadMedia } = require("../controllers/media-controller")
const { authenticateUser } = require("../middleware/auth-middleware")

const logger  = require("../utils/logger.js")
const { MulterError } = require("multer")

//configure multer for file upload

const upload=multer({
    storage:multer.memoryStorage(),
    limits:{fileSize:5*1024*1024}
}).single("file")


router.post("/upload",authenticateUser,(req,res,next)=>{
    upload(req,res,function(err){
        if(err instanceof multer.MulterError){
            logger.error(`Multer error while uploading the file: ${err.message}`)
            return res.status(400).json({
                success:false,
                message:"Failed to upload file",
                stack:err.stack
            })
        }
        else if(err){
            logger.error(`Error while uploading the file: ${err.message}`)
            return res.status(400).json({
                success:false,
                message:"Failed to upload file",
                stack:err.stack
            })
        }
        if(!req.file)
        {
            return res.status(400).json({
                message:"No file Found!"
            })
        }
        next()
    })
}, uploadMedia)

module.exports = router
