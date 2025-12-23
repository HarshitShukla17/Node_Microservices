const Joi=require("joi")

const validateRegistration=(data)=>{
    const schema=Joi.object({
        username:Joi.string().min(3).max(50).required(),
        email:Joi.string().email().required(),
        password:Joi.string().min(6).required()    //later set the maximum length of the password
    })
    return schema.validate(data)
}

const validateLogin=(data)=>{
    const schema=Joi.object({
        email:Joi.string().email().required(),
        password:Joi.string().required()
    })

    return schema.validate(data)
}

module.exports={validateRegistration,validateLogin}