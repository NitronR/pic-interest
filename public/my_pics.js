$("#desc").keyup(function(e){
  if(e.keyCode==13)
    $("#bt_add").click();
});

$("#bt_add").click(function(){
  var url=$("#url").val().trim();
  var desc=$("#desc").val().trim();
  $("#url").val("");
  $("#desc").val("");
  if(url!="" && desc!=""){
    $("#loader").css("display","block");
    if(url.startsWith("http://") || url.startsWith("https://")){
    $("#loader").css("display","none");
      $.post("/add_pic",{url:url,desc:desc},function(res){
        if(res.error){
          alert(res.error);
        }else{
          var elem=$(`
    <div class="grid-item">
        <a target="_blank" href="`+url+`"><div class="dimg" style="overflow:hidden;position:relative">
            <img class="img" src="`+url+`" style="width:100%;" onerror="this.className='';this.onerror=null;this.src='https://cdn.glitch.com/12ed5856-8290-40a1-9471-fab802586cc7%2Fno_image.png?1499520504544';"/></div></a><br>
        <div class="well">
          `+desc+`
        </div>
        <img class="u_pic" src="`+res.user_pic+`">        
        <button url="`+url+`" style="float:right" class="delete btn btn-default"><i class="fa fa-trash"></i></button>
        <button url="`+url+`" style="float:right" class="like btn btn-default"><i class="fa fa-star-o"></i> 
        <span class="likes">0</span></button>
    </div>`);
          $(".grid").append(elem).imagesLoaded(function(){
            $(".grid").masonry("prepended",elem);
          });
        }
      });
    }else{
      alert("Invalid URL.");
    }
  }else{
    alert("Both fields are mandatory.");
  }
});

$(document).on('click',".delete",function(){
  var url=$(this).attr("url").trim();
  var p=$(this).parent();
  if(url!=""){
    $.post("/delete",{url:url},function(res){
      if(res.error){
        alert(res.error);
      }else{
        p.remove();
        $(".grid").masonry();
      }
    })
  }
});