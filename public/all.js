
var $grid = $('.grid').imagesLoaded( function() {
  $grid.masonry({
    itemSelector: '.grid-item',
    columnWidth:30,
    fitWidth:true,
    gutter:4.5
  });
  $(".grid").css("opacity","1");  
});

$(document).on("mousemove",".dimg",function(e){
  var parentOffset = $(this).offset();
  var width=($(this).width());
  var height=($(this).height());
  
  var relX = (e.pageX - parentOffset.left)*100/width;
  var relY = (e.pageY - parentOffset.top)*100/height;
  $(this).find("img").css("transform-origin",relX+"% "+relY+"%")
});

$(document).ready(function(){
  $("#loader").css("display","none");
  $grid.masonry();
});

$(document).on('click',".like",function(){
  var b=$(this);
  b.attr("disabled",true);
  var url=$(this).attr("url").trim();
  var uid="me";
  if($(this).attr("uid"))
    uid=$(this).attr("uid").trim();
  console.log(uid);
  var c=$(this).find(".likes");
  var s=$(this).find("i");
  if(url!=""){
    $.post("/like",{url:url,uid:uid},function(res){
      b.attr("disabled",false);
      if(res.error){
        alert(res.error)
      }else{
        if(res.status=="inc"){
          c.text(parseInt(c.text())+1);
          s.removeClass("fa-star-o");
          s.addClass("fa-star");
        }else{
          c.text(parseInt(c.text())-1);
          s.removeClass("fa-star");
          s.addClass("fa-star-o");
        }
      }
    });
  }else
    b.attr("disabled",false);
});

$(".u_pic").click(function(){
  $(".grid").html("");
  var uid=$(this).attr("uid");
  if(uid && uid!="")
    $("#loader").css("display","block");
    $.post("/get_pics",{uid:uid},(res)=>{
      $("#loader").css("display","none");
      if(res.error){
        alert(res.error);
      }else{
        if(res.length==0){
          $(".grid").append("No pictures found.");
        }else{
          res.forEach(e=>{
            var likesq=(e.likesq)?(""):("-o");
            var elem=$(`<div class="grid-item"><a target="_blank" href="`
            +e.url+`"><img src="`
            +e.url+`" style="width:100%"></a><br><div class="desc">`
            +e.desc+`</div><img class="u_pic" src="`
            +e.user_pic+`"><button url="`
            +e.url+`" style="float:right" class="like btn btn-default"><i class="fa fa-star`
            +likesq+`"></i> <span class="likes">`
            +e.likes+`</span></button></a></div>`);
            $grid.append( elem ).masonry( 'appended', elem ).masonry();
          });
        }
      }
    });
});