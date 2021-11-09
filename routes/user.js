const express=require('express');
const router=express.Router();
const mongoose=require('mongoose');
const requireLogin=require('../middleware/requireLogin');
const Post=mongoose.model("Post");
const User=mongoose.model("User");



router.get('/user/:id',requireLogin,(req,res)=>{
    User.findOne({_id:req.params.id})
    .select("-password")
    .then(user=>{
        Post.find({postedBy:req.params.id})
        .populate("postedBy","_id name")
        .exec((err,posts)=>{
            if(err)
            {
                return res.status(422).json({error:err})
            }
            res.json({user,posts});
        })
    })
    .catch(err=>{
        return res.status(404).json({error:"User not found"});
    });
});
router.get('/user-new/:id',requireLogin,(req,res)=>{
    User.findOne({_id:req.params.id})
    .select("-password")
    .then(user=>{
        if(user.private==true)
        {
            User.findOne({_id:req.user._id,following:req.params.id}).then(data=>{
                if(data==null)
                {
                    const {_id,username,name,pic}=user;
                    Post.count({postedBy:req.params.id})
                    .then(count=>{
                        return res.json({private:true,user,message:"This account is private click to follow",posts:[],length:count});
                    })
                    .catch(err=>{
                        console.log(err);
                    })
                    
                }
                else
                {
                    User.findById({_id:req.params.id,followers:{$nin:req.user._id}})
                    .then(user=>{
                        if(user)
                        {
                            Post.find({postedBy:req.params.id})
                            .populate("postedBy","_id name")
                            .exec((err,posts)=>{
                                res.json({user,posts});
                    })
                        }
                    })
                    .catch(err=>{
                        console.log(err);
                    })
                   
                }
            })

        }
        else
        {
            Post.find({postedBy:req.params.id})
                    .populate("postedBy","_id name")
                    .exec((err,posts)=>{
                       
                        res.json({user,posts});
                    })
        }
      
     
    })
    .catch(err=>{
        return res.status(404).json({error:"User not found"});
    });
});


router.put('/follow',requireLogin,(req,res)=>{
        User.findById({_id:req.body.followId}).then(user=>{
            if(user.private==true)
            {
                user.pending_request.push(req.user._id);
                user.save().then(result=>{
                    User.findByIdAndUpdate({_id:req.user._id},{
                        $push:{pending_sent:req.body.followId}
                    },{
                        new:true
                    })
                    .select("-password -private")
                    .then(user=>{
                        res.json(user);
                    })
                    .catch(err=>{
                        console.log(err);
                        return res.json(422).json({error:err});
                    })
                });
            }
            else
            {
                User.findByIdAndUpdate(req.body.followId,{
                    $push:{followers:req.user._id}
                },{
            new:true},(err,result)=>{
                    if(err)
                    {
                        return res.status(422).json({error:err});
                    }
                    User.findByIdAndUpdate(req.user._id,{
                        $push:{following:req.body.followId}
                    },
                    {
                        new:true
                    })
                    .select("-password")
                    .then(result=>{
                        res.json(result);
                    })
                    .catch(err=>{
                        console.log(err);
                        return res.status(422).json({error:err})
                    })
                }
                );
            }
        });
});
router.put('/unfollow',requireLogin,(req,res)=>{
    User.findByIdAndUpdate(req.body.unfollowId,{
        $pull:{followers:req.user._id}
    },{
new:true},(err,result)=>{
        if(err)
        {
            return res.status(422).json({error:err});
        }
        User.findByIdAndUpdate(req.user._id,{
            $pull:{following:req.body.unfollowId}
        },
        {
            new:true
        })
        .select("-password")
        .then(result=>{
            res.json(result);
        })
        .catch(err=>{
            console.log(err);
            return res.status(422).json({error:err})
        })
    }
    );

});
router.post('/remove',requireLogin,(req,res)=>{

  
    var followerId=req.body.followerId;
  
    User.findByIdAndUpdate({_id:req.user._id},{
        $pull:{followers:followerId,pending_request:followerId}
    },{new:true})
    .then(result=>{
  
        if(result)
        {
            User.findByIdAndUpdate({_id:followerId},{
                $pull:{following:req.user._id,pending_sent:req.user._id}
            },{new:true})
            .then(docs=>{
                if(docs)
                {
                    res.json(result);
                }
            });
            
        }
    });
    
});

router.put('/updatepic',requireLogin,(req,res)=>{
    User.findByIdAndUpdate(req.user._id,{$set:{pic:req.body.pic}},{new:true}).then((result,err)=>{
        if(err)
        {
            console.log(err);
            return res.status(422).json({error:"cannot be uploaded"});
        }
        res.json(result);
    });
});

router.post('/search-users',(req,res)=>{

    if(req.body.query!=null || req.body.query!="")
    {
        let userPattern = new RegExp("^"+req.body.query);

    User.find({username:{$regex:userPattern}})
    .select("_id username pic")
    .then(user=>{
        res.json({user});
    })
    .catch(err=>{
        console.log(err);
    });
    }
    
});

router.post('/editprofile',requireLogin,(req,res)=>{
  
    User.findById({_id:req.user._id})
    .then(user=>{
        user.name=req.body.name;
        user.username=req.body.username;
        user.save({})
        .then(result=>{
            res.json(result);
        });
    });
});
router.get('/requests',requireLogin,(req,res)=>{
    User.findById({_id:req.user._id})
    .select("pending_request")
    .populate("pending_request","_id username name pic")
    .then(docs=>{
      
        res.json(docs);
    })
    .catch(err=>{
        console.log(err);
    });
});

router.post('/accept-request',requireLogin,(req,res)=>{

    
    User.findByIdAndUpdate({_id:req.body.requesterId},{
        $pull:{pending_sent:req.user._id},
        $push:{following:req.user._id}
    },{
        new:true
    })
    .then((docs)=>{
        
        User.findByIdAndUpdate({_id:req.user._id},{
            $pull:{pending_request:req.body.requesterId},
            $push:{followers:req.body.requesterId}
        },{
            new:true
        })
        .then(result=>{
            return res.json(result);
        });
    });

    
});
router.post('/reject-request',requireLogin,(req,res)=>{

  
    User.findByIdAndUpdate({_id:req.body.requesterId},{
        $pull:{pending_sent:req.user._id}
    },{
        new:true
    })
    .then((docs)=>{
        
        User.findByIdAndUpdate({_id:req.user._id},{
            $pull:{pending_request:req.body.requesterId}
            
        },{
            new:true
        })
        .then(result=>{
          
            return res.json(result);
        });
    });

    
});

router.get('/followers',requireLogin,(req,res)=>{
    User.findById({_id:req.user._id})
    .select("followers")
    .populate("followers","_id username name pic")
    .then(docs=>{
        res.json(docs);
    })
    .catch(err=>{
        console.log(err);
    });
});
router.get('/following',requireLogin,(req,res)=>{
    User.findById({_id:req.user._id})
    .select("following")
    .populate("following","_id username name pic")
    .then(docs=>{
        res.json(docs);
    })
    .catch(err=>{
        console.log(err);
    });
});

router.get("/myprofile",requireLogin,(req,res)=>{
    User.findById(req.user._id)
    .select("-password")
    .then(docs=>{
        if(docs)
        {
            const {_id,name,username,email,followers,following,pic,pending_request,pending_sent}=docs
                res.json({message:"Successfully signed in",user:{_id,name,username,email,followers,following,pic,pending_request,pending_sent}});
        }
    });
});
router.get('/profile_followers/:id',requireLogin,(req,res)=>{
    User.findById({_id:req.params.id})
    .select("followers")
    .populate("followers","_id username name pic")
    .then(docs=>{
        res.json(docs);
    })
    .catch(err=>{
        console.log(err);
    });
});
router.get('/profile_following/:id',requireLogin,(req,res)=>{
    User.findById({_id:req.params.id})
    .select("following")
    .populate("following","_id username name pic")
    .then(docs=>{
        res.json(docs);
    })
    .catch(err=>{
        console.log(err);
    });
});
module.exports=router;