const mongoose = require('mongoose')
const {ObjectId} = mongoose.Schema.Types
const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true
    }
    ,name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    private:{
        type:Boolean,
        default:false
    },
    resetToken:String,
    expireToken:Date,
    pic:{
     type:String,
      default:"<default_img_url>",
       
    },
    followers:[{type:ObjectId,ref:"User"}],
    following:[{type:ObjectId,ref:"User"}],
    pending_sent:[{type:ObjectId,ref:"User"}],
    pending_request:[{type:ObjectId,ref:"User"}]

})

mongoose.model("User",userSchema)