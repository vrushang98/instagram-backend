const express=require('express');

const router=express.Router();
const mongoose=require('mongoose');

const User=mongoose.model("User");
const crypto = require('crypto');
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const {JWT_SECRET}=require('../config/keys');
const requiredLogin =require('../middleware/requireLogin');
const nodemailer=require('nodemailer');
const sendGridTransport = require('nodemailer-sendgrid-transport');
const {SENDGRID_API,EMAIL,EMAIL_FROM}=require('../config/keys');



const transporter =nodemailer.createTransport(sendGridTransport({

    auth:{
        api_key:SENDGRID_API
    }
}));



router.post('/check-username',(req,res)=>{
    if(req.body.username!=null || req.body.username!="")
    {
        let userPattern = new RegExp("^"+req.body.username+"$");
        User.find({username:{$regex:userPattern}})
        .select("username")
        .then(user=>{
            if(user.length>0)
            {   

                res.json({error:"false"});    
            }
           
            
        })
        .catch(err=>{
            console.log(err);
        }); 

      
    }

});
router.post('/signup',(req,res)=>{
    const {username,name,email,private,password,pic}=req.body;
   
    if(!email || !password || !name || !username)
    {
        return res.status(422).json({error:"Please add all the fields"});
    }

    let userPattern = new RegExp("^"+req.body.username+"$");
    User.find({username:{$regex:userPattern}})
    .select("username")
    .then(user=>{
        if(user.length>0)
        {   

            return res.status(422).json({error:"Invalid Username"});    
        }
        else
        {
            User.findOne({email:email}).then((savedUser)=>{
                if(savedUser)
                {
                    return res.status(422).json({error:"User already exist"});
                }
                bcrypt.hash(password,12)
                      .then(hashedpassword=>{
                        
                        const user=new User({
                            email,password:hashedpassword,name,pic:pic,username,private:private=="checked"?true:false
                        });
                        user.save().then((user)=>{
                            transporter.sendMail({
                                to:user.email,
                                from:EMAIL_FROM,
                                subject:"signup success",
                                html:"<h1>Welcome to insta</h1>"
                            });
                            return res.json({message:"User saved successfully"});
                        })
                        .catch(err=>{
                            console.log(err);
                        });
                      });
        
                
            }).catch(err=>{
                console.log(err);
            });
        }
       
        
    })
    .catch(err=>{
        console.log(err);
    }); 


   
});


router.post('/signin',(req,res)=>{


    const {email,password}=req.body;
    if(!email || !password)
    {
        res.status(422).json({error:"Please add all the fields"});
    }
    User.findOne({email:email}).then((savedUser)=>{
        if(!savedUser)
        {
            return res.status(422).json({error:"Invalid"});
        }
        bcrypt.compare(password,savedUser.password).then(doMatch=>{
            if(doMatch)
            {
                const token=jwt.sign({_id:savedUser._id},JWT_SECRET);
                const {_id,name,username,email,followers,following,pic,pending_request,pending_sent}=savedUser
                res.json({message:"Successfully signed in",token,user:{_id,name,username,email,followers,following,pic,pending_request,pending_sent}});
            }
            else{
                return res.status(422).json({error:"Invalid Email or Password"});
            }
        })
        .catch(err=>{
            console.log(err);
        });
    })
    .catch(err=>{
        console.log(err);
    });
});



router.post('/resetpassword',(req,res)=>{

    crypto.randomBytes(32,(err,buffer)=>{
        if(err)
        {
            console.log(err);
        }
        const token = buffer.toString("hex")
        User.findOne({email:req.body.email})
        .then(user=>{
            if(!user)
            {
                return res.status(422).json({error:"User dont exist with that email"});
            }
            user.resetToken=token;
            user.expireToken= Date.now() + 3600000;
            user.save().then((result)=>{
                transporter.sendMail({
                    to:user.email,
                    from:EMAIL_FROM,
                    subject:"password reset",
                    html:`
                        <p>You requested for password reset</p>
                        <h5>Click on this link <a href="${EMAIL}/reset/${token}">Link</a> to reset password</h5>
                    `
                })

                res.json({message:"Check your email"})
            })
        })

    })
});




router.post('/newpassword',(req,res)=>{
    const newPassword=req.body.password;

    const sentToken = req.body.token;

    User.findOne({resetToken:sentToken,expireToken:{$gt:Date.now()}})
    .then((user)=>{
        if(!user)
        {
            return res.status(422).json({error:"Try again session expires"});
        }
        bcrypt.hash(newPassword,12).then(hashedPassword=>{
            user.password=hashedPassword;
            user.resetToken=undefined;
            user.expireToken=undefined;
            user.save().then(saveduser=>{
                res.json({message:"Password updated"});
            })
            .catch(err=>{
                console.log(err);
            });
        })
        .catch(err=>{
            console.log(err);
        });
    });
});
module.exports=router;