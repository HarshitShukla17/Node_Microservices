const logger=require("../utils/logger")
const {uploadMediaToCloudinary}=require("../utils/cloudinary")
const Media=require("../models/media")


const uploadMedia=async(req,res)=>{
    logger.info(`Uploading media to cloudinary`)

    try {
        if(!req.file){
            logger.error(`No file found,please add the file and try again`)
            return res.status(400).json({message:"No file found,please add the file and try again"})
        }

        const {originalname,mimetype,buffer}=req.file
        const userId=req.user.userId;
        logger.info(`File Details: ${originalname},${mimetype},${buffer}`);
        logger.info(`file uploading to cloudinary started`)

        //upload to cloudinary....
        const cloudinaryUploadResult=await uploadMediaToCloudinary(req.file)

        logger.info(`file uploaded to cloudinary successfully Public ID: ${cloudinaryUploadResult.public_id}`)

        const newlyCreatedMedia=await Media.create({
            publicId:cloudinaryUploadResult.public_id,
            originalName:originalname,
            mimeType:mimetype,
            url:cloudinaryUploadResult.secure_url,
            userId:userId
        })

        res.status(201).json({
            message:"File uploaded successfully",
            mediaId:newlyCreatedMedia._id,
            url:newlyCreatedMedia.url,
            success:true
        })

    } catch (error) {
        logger.error(`Error uploading media to cloudinary`,error)
        res.status(500).json({message:"Error uploading media to cloudinary"})
    }
    
   
}

module.exports={uploadMedia}