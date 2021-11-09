const express=require('express');
const router=express.Router();
const mongoose=require('mongoose');
const requireLogin=require('../middleware/requireLogin');
const Post=mongoose.model("Post");
const User=mongoose.model("User");


router.get('/allpost',requireLogin,(req,res)=>{
    Post.find()
    .populate("postedBy comments.postedBy","_id username pic")
    .sort('-createdAt')
    .then((posts)=>{
        
        return res.json({posts});
    }).catch(err=>{
        console.log("allpost:",err);
    })
});
router.get('/getsubpost',requireLogin,(req,res)=>{
    Post.find({
        "$or": [
            { "postedBy": req.user._id },
            { "postedBy": req.user.following }
        ]
    })
    .populate("postedBy comments.postedBy","_id username pic")
    .sort('-createdAt')
    .then((posts)=>{
        
        return res.json({posts});
    }).catch(err=>{
        console.log("allpost:",err);
    })
});

router.post('/createpost',requireLogin,(req,res)=>{
    const {title,body,pic}=req.body;

    if(!title || !body || !pic)
    {
        return res.status(422).json({error:"Please add all the fields"});
    }

    const post=new Post({
        title,
        body,
        photo:pic,
        postedBy:req.user
    })
    post.save().then((result)=>{
        res.json({post:result});
    }).catch(err=>{
        console.log(err);
    })
});

router.get('/mypost',requireLogin,(req,res)=>{
    Post.find({postedBy:req.user._id})
    .populate("postedBy","id username name")
    .then(mypost=>{
        return res.json({mypost});
    })
    .catch(err=>{
        console.log(err);
    });
});



router.put('/like',requireLogin,(req,res)=>{
    Post.findByIdAndUpdate({_id:req.body.postId},{
        $push:{likes:req.user._id}
    },{new:true})
    .populate("postedBy comments.postedBy","_id username pic")
    .exec((err,result)=>{
        if(err)
        {
            console.log(err);
            return res.status(422).json({error:err});
        }
        else
        {
            return res.json(result);
        }
    });
});
router.put('/unlike',requireLogin,(req,res)=>{


    Post.findByIdAndUpdate({_id:req.body.postId},{
        $pull:{likes:req.user._id}
    },{new:true})
    .populate("postedBy comments.postedBy","_id username pic")
    .exec((err,result)=>{
        if(err)
        {
            return res.status(422).json({error:err});
        }
        else
        {
            return res.json(result);
        }
    });
});



router.put('/comment',requireLogin,(req,res)=>{
    const comment={
        text:req.body.text,
        postedBy:req.user._id
    }
    Post.findByIdAndUpdate({_id:req.body.postId},
        {$push:{comments:comment}
    },{new:true})
    .populate("postedBy comments.postedBy","_id username pic")
    .then((result)=>{
      
            return res.json(result);
      
    })
    .catch(err=>{
        console.log(err);
        return res.status(422).json({error:err});
    });
});

router.delete('/deletepost/:postId',requireLogin,(req,res)=>{
    Post.findOne({_id:req.params.postId})
    .populate("postedBy","_id")
    .exec((err,post)=>{
        
        if(err || !post)
        {
        
            return res.json(422).json({error:err});
        }
        else
        {
            if(post.postedBy._id.toString() === req.user._id.toString())
            {
                post.remove()
                .then(result=>{
                    res.json(result);
                })
                .catch(err=>{
                    console.log(err);
                })
            }
        }
       
    })
});
router.delete('/deletecomment/:postId&:commentId',requireLogin,(req,res)=>{
  
    
    Post.findOneAndUpdate({_id:req.params.postId},{$pull:{comments:{_id:req.params.commentId}}},{new:true})
    .populate("postedBy comments.postedBy","_id username pic")
    .then(result=>{
  
        return res.json(result);
    })
    .catch(err=>{
        console.log(err);
    });
    

});
router.post('/getPost',(req,res)=>{
    Post.findOne({_id:req.body.postId})
    .populate("postedBy comments.postedBy","_id username pic")
    .then((result)=>{

        res.json(result);
    });
});

module.exports=router;