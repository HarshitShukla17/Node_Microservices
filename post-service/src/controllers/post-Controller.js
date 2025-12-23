const logger=require("../utils/logger.js")
const Post=require("../models/post.js")
const {validateCreatePost}=require("../utils/validation.js")


async function invalidatePostCache(req,input){

    const cachedKey=`post:${input}`
    await req.redisClient.del(cachedKey)

    const keys=await req.redisClient.keys("posts:*")
    if(keys.length>0){
        await req.redisClient.del(keys)
    }
}

const createPost=async(req,res)=>{
    logger.info("create post endpoint hit")

    try {
        const {content,mediaIds}=req.body;
        const {error}=validateCreatePost(req.body)
        if(error){
            logger.warn(`Validation error: ${error.details[0].message}`)
            return res.status(400).json({
                success:false,
                message:error.details[0].message,
                
            })
        }
        const newlyCreatedPost=await Post.create({
            content,
            mediaIds:mediaIds?mediaIds:[],
            user:req.user.userId
        })
        await invalidatePostCache(req,newlyCreatedPost._id.toString())
        logger.info(`Post created successfully`,newlyCreatedPost)
        res.status(201).json({
            success:true,
            message:"Post created successfully",
            newlyCreatedPost
        })
        
    } catch (error) {
        logger.error(`Error creating post: ${error.message}`)
        return res.status(500).json({
            success:false,
            message:"Error in Creating the post"
        })
    }
};


const getAllPosts=async(req,res)=>{
    logger.info("getAllPosts endpoint hit")
    try {
        //pagination...
        const page=parseInt(req.query.page)||1;
        const limit=parseInt(req.query.limit)||10;
        const startIndex=(page-1)*limit;
        
        const cacheKey=`posts:${page}:${limit}`;
        const cachedPosts=await req.redisClient.get(cacheKey);
        if(cachedPosts){
            return res.json(JSON.parse(cachedPosts))
        }

        const posts=await Post.find().sort({createdAt:-1}).skip(startIndex).limit(limit)
        const totalNoOfPosts=await Post.countDocuments();

        const result={
            posts,
            currentPage:page,
            totalPages:Math.ceil(totalNoOfPosts/limit),
            totalPosts:totalNoOfPosts,
            limit

        }

        //save the data to the cache when returning the data from the database
        await req.redisClient.setex(cacheKey,300,JSON.stringify(result));
        logger.info(`Posts fetched successfully`,result)
        return res.json(result)


    } catch (error) {
        logger.error(`Error fetching posts: ${error.message}`)
        return res.status(500).json({
            success:false,
            message:"Error in fetching the posts"
        })
    }
};


const getPost=async(req,res)=>{
    try {
        const postId=req.params.id;
        const cacheKey=`post:${postId}`;

        const cachePost=await req.redisClient.get(cacheKey);
        if(cachePost){
            return res.json(JSON.parse(cachePost));
        }

        const singlePostDetailsById=await Post.findById(postId)

        if(!singlePostDetailsById){
            return res.status(404).json({
                success:false,
                message:"Post not found"
            })
        }

        await req.redisClient.setex(cacheKey,3600,JSON.stringify(singlePostDetailsById))

        
        logger.info(`Post fetched successfully`,singlePostDetailsById)
        return res.json(singlePostDetailsById)

    } catch (error) {
        logger.error(`Error fetching post: ${error.message}`)
        return res.status(500).json({
            success:false,
            message:"Error in fetching the post"
        })
    }
};

const deletePost=async(req,res)=>{
    try {
        const postId=req.params.id;
        const deletedPost=await Post.findByIdAndDelete({
            _id:postId,
            user:req.user.userId
        })
        if(!deletedPost){
            return res.status(404).json({
                success:false,
                message:"Post not found"
            })
        }
        logger.info(`Post deleted successfully`,deletedPost)
        await invalidatePostCache(req,postId);
        return res.status(200).json({
            success:true,
            message:"Post deleted successfully",
            
        })
        
        
    } catch (error) {
        logger.error(`Error deleting post: ${error.message}`)
        return res.status(500).json({
            success:false,
            message:"Error in deleting the post"
        })
    }
}


module.exports={
    createPost,
    getAllPosts,
    getPost,
    deletePost
}

