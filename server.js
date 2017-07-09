var express = require('express'),
 expressws = require('express-ws')(express());
var ejs=require("ejs");
var app = expressws.app;
var mongodb=require('mongodb').MongoClient;
var session=require('express-session');

var twitterAPI = require('node-twitter-api');
var twitter = new twitterAPI({
    consumerKey: process.env.CONSUMER_KEY,
    consumerSecret: process.env.CONSUMER_SECRET,
    callback: 'https://pic-interest.glitch.me/sign_in'
});
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

app.set('view engine', 'ejs'); 
app.use(express.static('public'));
app.use(session({
    resave: true,
    saveUninitialized: true,secret: process.env.SECRET}));

app.get("/", function (req, res) {
  var ip=req.headers["x-forwarded-for"].toString().split(",")[0];
  var user=req.session.user;
  if(!user && loggedin[ip])
    user=loggedin[ip];
  
  mongodb.connect(process.env.DB_URL,function(err,db){
    var pics=[];
    var id=-1;
    if(user) id=user.id_str;
    db.collection("pic_interest").find().sort({'photos.date':-1}).each((err,doc)=>{
      if(doc && doc.photos){
          doc.photos.forEach(e=>{
            pics.push({date:e.date,uid:doc.user,user_pic:doc.user_pic,url:e.url,likes:e.likers.length,desc:e.desc,likesq:(e.likers.indexOf(id)!=-1)});
          });
      }else{
        pics.sort(function(a,b){
          return b.date-a.date;
        });
        res.render(__dirname + '/views/all.ejs',{user:user,pics:pics});
      }
    });
  });
});

app.get("/my_pics",function(req,res){
  var user=req.session.user;
  if(user){
    mongodb.connect(process.env.DB_URL,function(err,db){
      var pics=[];
      db.collection("pic_interest").find({user:user.id_str}).each((err,doc)=>{
        if(doc){
          if(doc.photos)
            doc.photos.forEach(e=>{
              pics.push({date:e.date,user_pic:doc.user_pic,url:e.url,likes:e.likers.length,desc:e.desc,likesq:(e.likers.indexOf(user.id_str)!=-1)});
            });
        }else{
          pics.sort(function(a,b){
            return b.date-a.date;
          });
          res.render(__dirname + '/views/my_pics.ejs',{user:user,pics:pics});
        }
      });
    });
  }else{
    res.send({user:null});
  }
});

app.post("/get_pics",(req,res)=>{
  var uid=req.body.uid;
  var id=-1;
  var user=req.session.user;
  if(user) id=user.id_str;
  mongodb.connect(process.env.DB_URL,function(err,db){
      var pics=[];
      db.collection("pic_interest").find({user:uid}).sort({'photos.date':-1}).each((err,doc)=>{
        if(doc){
          if(doc.photos)
            doc.photos.forEach(e=>{
              pics.push({date:e.date,user_pic:doc.user_pic,url:e.url,likes:e.likers.length,desc:e.desc,likesq:(e.likers.indexOf(id)!=-1)});
            });
        }else{
          pics.sort(function(a,b){
            return b.date-a.date;
          });
          res.send(pics);
        }
      });
    });
});

app.post("/add_pic",(req,res)=>{
  var user=req.session.user;
  if(user){
    mongodb.connect(process.env.DB_URL,(err,db)=>{
      var clt=db.collection("pic_interest");
      clt.findOne({user:user.id_str,'photos.url':req.body.url},(err,doc)=>{
        if(doc){
          res.send({error:"Pic already added by you."});
        }else{
          req.body.likers=[];
          req.body.date=Date.now();
          clt.updateOne({user:user.id_str,user_pic:user.profile_image_url_https},{$push:{photos:req.body}},{upsert:true},(err,results)=>{
            res.send({user_pic:user.profile_image_url_https});
          });
        }
      });
    });
  }else{
    res.send({error:"Sign in"});
  }
});

app.post("/delete",(req,res)=>{
  var user=req.session.user;
  if(user){
    mongodb.connect(process.env.DB_URL,function(err,db){
      db.collection("pic_interest").updateOne({user:user.id_str},{$pull:{photos:{url:req.body.url}}},function(err,results){
        console.log(results);
        res.send("mod");
      });
    });
  }else{
    res.send({error:"Sign in"});
  }
});

app.post("/like",(req,res)=>{
  var user=req.session.user;
  if(user){
    var uid=req.body.uid;
    if(uid=="me") uid=user.id_str;
    mongodb.connect(process.env.DB_URL,(err,db)=>{
      var clt=db.collection("pic_interest");
      clt.findOne({user:uid,"photos.url":req.body.url},{photos: {$elemMatch:{url:req.body.url}} },(err,doc)=>{
        if(doc){
          var p;
          console.log(doc.photos);
          if(doc.photos[0].likers.indexOf(user.id_str)==-1){
            p="$push";
          }else{
            p="$pull";
          }
          var q={};
          q[p]={'photos.$.likers':user.id_str};
          clt.updateOne({user:uid,photos: {$elemMatch:{url:req.body.url}} },q,(err,results)=>{
            res.send({status:(p=="$push")?("inc"):("dec")});
          });
        }else{
          res.send({error:"Invalid request."})
        }
      });
    });
  }else{
    res.send({error:"Sign in"})
  }
});

var loggedin={};
var reqs={};

app.post("/sign_in_request",function(req,response){
  var ip=req.headers["x-forwarded-for"].toString().split(",")[0];
  if(loggedin[ip]){
    response.send(loggedin[ip]);
  }else{
    twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results){
        if (error) {
          response.send({"error":error})
        } else {
          reqs[requestToken]={secret:requestTokenSecret,response:response};
          response.send(requestToken);
        }
    });
  }
});

app.get("/sign_in",function(request,response){
  var requestToken = request.query.oauth_token,
  verifier = request.query.oauth_verifier;
  if(requestToken){
    var secret=reqs[requestToken].secret;
    var ws=reqs[requestToken].ws;
    var reqq=reqs[requestToken].request;
    var res=reqs[requestToken].response;
    twitter.getAccessToken(requestToken, secret, verifier, function(err, accessToken, accessSecret) {
      if (err){
        response.send("<html><body>"+err+"</body></html>");
        ws.send("error");
      }else{
        response.send("<html><body><script language='javascript'>window.close();</script></body></html>");
        twitter.verifyCredentials(accessToken, accessSecret, function(err, user) {
            if (err){
              ws.send("error");
            }else{
              reqq.session.user=user;
              res.send("s");
              ws.send("signed in");
              loggedin[reqq.headers["x-forwarded-for"].toString().split(",")[0]]=user;
            }
        });
      }
    });
  }
});

app.post("/get_user",function(request,response){
  reqs[request.body.tok].response=response;
  reqs[request.body.tok].request=request;
});

app.ws("/get_user",function(ws,res){
  ws.on('message', function(tok) {
    reqs[tok].ws=ws;
  });
});

app.post("/sign_out",function(req,res){
  var ip=req.headers["x-forwarded-for"].toString().split(",")[0];
  var sessionv=req.session;
  sessionv.user=null;
  req.session.destroy();
  req.session=sessionv;
  delete loggedin[ip];
  res.send(true);
});


var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
