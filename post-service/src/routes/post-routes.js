const express=require("express")
const {authenticateUser}=require("../middleware/auth-middleware.js")

const {createPost,getAllPosts,getPost,deletePost}=require("../controllers/post-Controller.js")

//middleware for verifying for valid user


const router=express.Router()

router.use(authenticateUser)

router.post("/create-post",createPost)
router.get("/posts",getAllPosts)
router.get("/:id",getPost)
router.delete("/:id",deletePost)
module.exports=router

