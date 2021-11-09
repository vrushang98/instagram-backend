const express=require('express');

const app = express();
const mongoose=require('mongoose');
var cors = require('cors')
const {MONGOURI}=require('./config/keys');

let PORT=process.env.PORT || 5000;
require('./models/user');
require('./models/post');
app.use(express.json());
app.use(require('./routes/auth'));
app.use(require('./routes/post'));
app.use(require('./routes/user'));

mongoose.connect(MONGOURI,{
    useNewUrlParser:true,
    useUnifiedTopology:true
});

mongoose.connection.on('connected',()=>{
    console.log("Connected to mongodb");
});

mongoose.connection.on('error',()=>{
    console.log("Error in mongodb");
});

app.use(cors())
if(process.env.NODE_ENV == "production")
{
    app.use(express.static('client/build'));
    const path =require('path');
    app.get("*",(req,res)=>{
        res.sendFile(path.resolve(__dirname,'client','build','index.html'));
    })
}


app.listen(PORT,()=>{
    console.log(`Server running on ${PORT}`);
});