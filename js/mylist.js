
//添加到我的歌单
function addMylist(i){
    isloading();    //加载中动画
    $.ajax({
        type: "POST", 
        url: BASEURL + '/users/addlist',
        xhrFields: {
            withCredentials: true
        },
        crossDomain: true,
        data: {
            musicrid: playlist[i].musicrid,
            name: playlist[i].name,
            artist: playlist[i].artist,
            album: playlist[i].album,
            pic: playlist[i].pic,
            source: playlist[i].source,
            mvid: playlist[i].mvid,
            token: playerReaddata('logintoken')
        },
        timeout: 15000,
        complete: function(XMLHttpRequest, textStatus) {
            closeload();    //关闭加载中动画
            console.log('提交成功！');
        },
        success: function(jsonData){
            
            if(jsonData.code == 1){
                //成功
                layer.msg(jsonData.status);
                return true;
            }else if(jsonData.code == 0){
                layer.msg(jsonData.status);
                loginBox();
                return false;
            }
        }   //success
    });//ajax
}


//获取我的歌单
function getMylist(){
    isloading();    //加载中动画
    $.ajax({
        type: "POST", 
        url: BASEURL + '/users/mylist',
        xhrFields: {
            withCredentials: true
        },
        crossDomain: true,
        timeout: 15000,
        data:{token: playerReaddata('logintoken')},
        complete:function(){
            closeload();    //关闭加载中动画
        },
        success: function(jsonData){
            if(jsonData.code == 1){
                //成功
                layer.msg(jsonData.status);
                playlist=[];
                initProgress();  //初始化进度条
                for(let j=0;j<jsonData.songinfo.length;j++){
                    playlist.push({
                    'musicrid':jsonData.songinfo[j].musicrid,
                    'name':jsonData.songinfo[j].name,
                    'artist':jsonData.songinfo[j].artist,
                    'album':jsonData.songinfo[j].album,
                    'pic':jsonData.songinfo[j].pic,
                    'source':jsonData.songinfo[j].source,
                    'mvid':jsonData.songinfo[j].mvid
                });
                }
                rem.mainList.html('');   // 清空列表中原有的元素
                addListhead();      // 向列表中加入列表头
                var newlist = '';
                for(let i=0;i<playlist.length;i++){
                    let s=i+1;
                    if(playlist[i].mvid&&!rem.isMobile){
                        newlist+='<div class="list-item" data-no="'+i+'">'+
                                    '<span class="list-num">'+s+'</span>'+
                                    '<span class="list-mobile-menu"></span>'+
                                    '<span class="music-album">'+playlist[i].album+'</span>'+
                                    '<span class="auth-name">'+playlist[i].artist+'</span>'+
                                    '<span class="music-name">'+
                                        '<span class="music-name-cult">'+playlist[i].name+'<span class="songlist__icon songlist__icon_mv sprite" data-function="share" title="MV" onclick="playmv('+i+')"></span></span>'+
                                        '<div class="list-menu" data-no="'+i+'">'+
                                            '<span class="list-icon icon-play" onclick="playList('+i+')" data-function="play" title="点击播放这首歌"></span>'+
                                            '<span class="list-icon icon-delete" onclick="delMylist('+i+')" data-function="share" title="点击从我的歌单删除"></span>'+
                                        '</div>'+
                                    '</span>'+
                                '</div>'
                        }else{
                        newlist+='<div class="list-item" data-no="'+i+'">'+
                                '<span class="list-num">'+s+'</span>'+
                                '<span class="list-mobile-del"></span>'+
                                '<span class="list-mobile-menu"></span>'+
                                '<span class="music-album">'+playlist[i].album+'</span>'+
                                '<span class="auth-name">'+playlist[i].artist+'</span>'+
                                '<span class="music-name">'+
                                    '<span class="music-name-cult">'+playlist[i].name+'</span>'+
                                    '<div class="list-menu" data-no="'+i+'">'+
                                        '<span class="list-icon icon-play" onclick="playList('+i+')" data-function="play" title="点击播放这首歌"></span>'+
                                        '<span class="list-icon icon-delete" onclick="delMylist('+i+')" data-function="share" title="点击从我的歌单删除"></span>'+
                                    '</div>'+
                                '</span>'+
                            '</div>'
                        }
                }
                rem.mainList.append(newlist);
                jumplist();
                return true;
            }else if(jsonData.code == -1){
                layer.msg(jsonData.status);
                return false;
            }else if(jsonData.code == 0){
                layer.msg(jsonData.status);
                loginBox();
                return false;
            }
        }   //success
    });//ajax
}

//从歌单中删除
function delMylist(i){
    var str = '<div>确认删除吗？</div>'
    layer.confirm(str, {btn: ['确定', '取消'], title: "提示"}, function () {
        layer.close(layer.index);
        isloading();    //加载中动画
        var data = {
            musicrid: playlist[i].musicrid,
            source: playlist[i].source,
            token: playerReaddata('logintoken')
        }
        delete playlist[i];
        $(".list-item[data-no="+i+"]").remove();
         $.ajax({
             type: "POST", 
             url: BASEURL + '/users/delete',
             xhrFields: {
                withCredentials: true
            },
            crossDomain: true,
             data: data,
             timeout: 15000,
             complete: function(){
                closeload();    //关闭加载中动画
             },
             success: function(jsonData){
                
                if(jsonData.code == 1){
                    //成功
                    layer.msg(jsonData.status);
                }else if(jsonData.code == 0){
                    layer.msg(jsonData.status);
                    return false;
                }
             }   //success
         });//ajax
        //console.log('true');
    });
}

//弹出登录框
function loginBox(){
    
    var tmpHtml = '<ul class="glist">'+
        '<li class="gu">'+
            '<input id="text_username" class="inputstyle" name="username" autocomplete="off" placeholder="请输入用户名或邮箱"" autofocus="">'+
        '</li>'+
        '<li class="gu">'+
            '<input id="text_password" class="inputstyle" maxlength="16" type="password" name="password1" autocorrect="off" placeholder="请输入你的密码">'+
        '</li>'+
        '<li class="gp">'+
            '<input id="text_captcha" class="inputstyle" maxlength="16" name="captcha" autocorrect="off" placeholder="请输入验证码" style="width: 173px;" autocomplete="off">'+
            '<div id="capt" class="img-captcha" onclick="reloadcapt()"></div>'+
        '</li>'+
        '</ul>'+
    '<input id="go" type="submit" value="登 录" class="search-submit" onclick="LoginAction() ">'+
    '<div class="regword">没有账号？<a href="/register.html">点击这里</a>注册！</div>'
    layer.open({
        type: 1,
        shade: false,
        title: "登录", // 不显示标题
        shade: 0.5,    // 遮罩颜色深度
        shadeClose: true,
        content: tmpHtml,
        cancel: function(){
        }
    });
    reloadcapt();
}

//刷新验证码
function reloadcapt(){
    $("#capt").val("");
    $.ajax({
        type: "GET", 
        url: BASEURL + '/users/captcha',
        xhrFields: {
            withCredentials: true
        },
        crossDomain: true,
        timeout: 15000,
        success: function(jsonData){
            if(jsonData){
                let imgdata = jsonData.data
                $("#capt").html(imgdata);
                rem.captoken = jsonData.token
                return true;
            }else{
                layer.msg("错误");
                return false;
            }
        }   //success
    });//ajax
}

//登录按钮点击事件
function LoginAction(){
    var username = $("#text_username").val();
    var password = $("#text_password").val();
    var captcha = $("#text_captcha").val();
    if(username.length < 5){
        alert("用户名小于5位！");
        return false;
    }else if(password.length < 6){
        alert("密码小于6位！");
        return false;
    }else if(captcha == ""){
        alert("请输入验证码！");
        return false;
    }else{
        LoginAjax(username,password,captcha);
        return true;
    }
}

//登录信息提交
function LoginAjax(n,p,c){
    isloading();    //加载中动画
    $.ajax({
    type: "POST", 
    url: BASEURL + '/users/loginpost',
    xhrFields: {
        withCredentials: true
    },
    crossDomain: true,
    data: {username:n,password:p,captcha:c,token:rem.captoken},
    timeout: 15000,
    complete: function(XMLHttpRequest, textStatus) {
        closeload();    //关闭加载中动画
    },
    success: function(jsonData){
        
        if(jsonData.code == 1){
            //成功
            layer.msg(jsonData.status);
            playerSavedata('logintoken', jsonData.token)
            Getloginstatus();
            layer.closeAll('page');
            return true;
        }else if(jsonData.code == 0){
            $("#text_captcha").val("");
            layer.msg(jsonData.status);
            reloadcapt();
            return false;
        }
    }   //success
});//ajax
}

//获取登陆状态及用户名
function Getloginstatus(){
    $.ajax({
        type: "POST", 
        url: BASEURL + '/users/loginstatus',
        xhrFields: {
            withCredentials: true
        },
        data: {token:playerReaddata('logintoken')},
        crossDomain: true,
        timeout: 15000,
        success: function(jsonData){
            if(jsonData.code == 1){
                var username = jsonData.username;
                userloginbox.innerHTML = '你好！&nbsp;'+username+'&nbsp;<span class="login-btn login-out" onclick="loginout();">[点击退出]</span>'
                //成功
                //layer.msg(jsonData.status);
                return true;
            }else if(jsonData.code == 0){
                userloginbox.innerHTML = '登录Gameclub账号以同步我的歌单<span class="login-btn login-in" onclick="loginBox();">[点击登录]</span>';
                //layer.msg(jsonData.status);
                return false;
            }
        }   //success
    });//ajax
}

//退出登录
function loginout(){
    playerRemovedata('logintoken');
    layer.msg('退出成功！');
    userloginbox.innerHTML = '登录Gameclub账号以同步我的歌单<span class="login-btn login-in" onclick="loginBox();">[点击登录]</span>';
}