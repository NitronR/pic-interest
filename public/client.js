$("#sign-in").click(function(){
  var twitterWindow=window.open("","Sign in with twitter","width=500,height=500");
  $.post("/sign_in_request",function(res){
    if(res.error){
      alert(res.error);
      console.log(res.error);
    }else if(res.id){
      twitterWindow.close();
      window.location.reload(false);
    }else{
      $.post("/get_user",{tok:res},function(response){
        console.log("r");
      });
      twitterWindow.location.href="https://api.twitter.com/oauth/authenticate?oauth_token="+res;
      var clientSocket = new WebSocket('wss://pic-interest.glitch.me/get_user');
      clientSocket.onopen=function(){
        clientSocket.send(res);
      }
      clientSocket.onmessage=function(msg){
        msg=msg.data;
        console.log(msg);
        if(msg=="signed in")
          window.location.reload(false);
        else if(msg=="error")
          alert("Error signing in, please try again.")
      }
    }
  });
});

$(".navbar-right").on("click","#sign-out",sign_out);

function sign_out(){
  $.post("/sign_out",function(res){
      window.location="/"; 
  });
}