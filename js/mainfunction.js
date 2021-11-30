//判断是否为移动设备
    var isMobile = {  
        Android: function() {  
            return navigator.userAgent.match(/Android/i) ? true : false;  
        },  
        BlackBerry: function() {  
            return navigator.userAgent.match(/BlackBerry/i) ? true : false;  
        },  
        iOS: function() {  
            return navigator.userAgent.match(/iPhone|iPad|iPod/i) ? true : false;  
        },  
        Windows: function() {  
            return navigator.userAgent.match(/IEMobile/i) ? true : false;  
        },  
        any: function() {
            return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Windows());  
        }
    };
//初始化变量
    var mkPlayer = {
        volume: 0.6,        // 默认音量值(0~1之间)
        coverbg: true,      //电脑端封面背景模糊效果
        mcoverbg: false      //手机端封面背景模糊效果
    };
    const BASEURL = "https://www.gameclub.ltd/api";
    var rem = [];
    var mymusiclist = {};
    var islogin = false;
    var listfoot = document.getElementById("list-foot");
    var audio = document.getElementsByTagName("audio")[0];
    var playlist=[];//播放列表
    var lrcobj={};//歌词
    var userloginbox = document.getElementById("user-login");
    rem.isMobile = isMobile.any();      // 判断是否是移动设备
    rem.webTitle = document.title;      // 记录页面原本的标题
    rem.errCount = 0;                   // 连续播放失败的歌曲数归零
    
    $(function(){
        //初始化滚动条
        if(rem.isMobile) {  // 加了滚动条插件和没加滚动条插件所操作的对象是不一样的
            rem.sheetList = $("#sheet");
            rem.mainList = $("#main-list");
        } else {
            // 滚动条初始化(只在非移动端启用滚动条控件)
            $("#main-list,#sheet").mCustomScrollbar({
                theme:"minimal",
                advanced:{
                    updateOnContentResize: true // 数据更新后自动刷新滚动条
                }
            });
            
            rem.sheetList = $("#sheet .mCSB_container");
            rem.mainList = $("#main-list .mCSB_container");  
        }
        //初始化背景模糊
        if((mkPlayer.coverbg === true && !rem.isMobile) || (mkPlayer.mcoverbg === true && rem.isMobile)) { // 开启了封面背景

            if(rem.isMobile) {  // 移动端采用另一种模糊方案
                $('#blur-img').html('<div class="blured-img" id="mobile-blur"></div><div class="blur-mask mobile-mask"></div>');
            } else {
                // 背景图片初始化
                $('#blur-img').backgroundBlur({
                    // imageURL : '', // URL to the image that will be used for blurring
                    blurAmount : 50, // 模糊度
                    imageClass : 'blured-img', // 背景区应用样式
                    overlayClass : 'blur-mask', // 覆盖背景区class，可用于遮罩或额外的效果
                    // duration: 0, // 图片淡出时间
                    endOpacity : 1 // 图像最终的不透明度
                });
            }
            
            $('.blur-mask').fadeIn(1000);   // 遮罩层淡出
        }
        addListhead();       //添加列表头
        addListbar('nodata');//添加列表尾
        audio.onended = function(){
            autoNextMusic(); //自动播放下一首
        }
    });

    // 顶部按钮点击处理
    $(".btn").click(function(){
        switch($(this).data("action")) {
            case "search":  // 搜索
                searchBox();
            break;
            case "playing": // 正在播放
                dataBox("list");
            break;
            case "sheet":   // 播放列表
                Getloginstatus();//更新登录状态
                dataBox("sheet");
            break;
            case "player":  // 显示播放器
                dataBox("player");
            break;
            case "app":  // 显示app下载二维码
                appcode();
            break;
        }
    });  

    //歌曲信息按钮点击
    $("#music-info").click(function(){
        if(rem.playid !=undefined){
            musicInfo(rem.playid, rem.playid);
        }
    });

    // 静音按钮点击事件
    $(".btn-quiet").click(function(){
        var oldVol;     // 之前的音量值
        if($(this).is('.btn-state-quiet')) {
            oldVol = $(this).data("volume");
            oldVol = oldVol? oldVol: (rem.isMobile? 1: mkPlayer.volume);  // 没找到记录的音量，则重置为默认音量
            $(this).removeClass("btn-state-quiet");     // 取消静音
        } else {
            oldVol = volume_bar.percent;
            $(this).addClass("btn-state-quiet");        // 开启静音
            $(this).data("volume", oldVol); // 记录当前音量值
            oldVol = 0;
        }
        playerSavedata('volume', oldVol); // 存储音量信息
        volume_bar.goto(oldVol);    // 刷新音量显示
        if(audio !== undefined) audio.volume = oldVol;  // 应用音量
    });

    // 图片加载失败处理
    $('img').error(function(){
        $(this).attr('src', 'images/player_cover.png');
    });

    // 小屏幕点击右侧小点查看歌曲详细信息
    $(".music-list").on("click",".list-mobile-menu", function() {
        var num = parseInt($(this).parent().data("no"));
        musicInfo(rem.playid,num);
        return false;
    });

    // 小屏幕点击右侧加号添加歌曲到我的歌单
    $(".music-list").on("click",".list-mobile-love", function() {
        var num = parseInt($(this).parent().data("no"));
        addMylist(num);
        return false;
    });

    // 小屏幕点击右侧删除按钮
    $(".music-list").on("click",".list-mobile-del", function() {
        var num = parseInt($(this).parent().data("no"));
        delMylist(num);
        return false;
    });

    // 列表项双击播放
    $(".music-list").on("dblclick",".list-item", function() {
        var num = parseInt($(this).data("no"));
        if(isNaN(num)) return false;
        playList(num);
    });
    
    // 移动端列表项单击播放
    $(".music-list").on("click",".list-item", function() {
        if(rem.isMobile) {
            var num = parseInt($(this).data("no"));
            if(isNaN(num)) return false;
            playList(num);
        }
    });

/* 函数部分 */

//显示关于窗口
function showabout() {
    var tmpHtml = '<p style="padding: 20px 20px;display: block;line-height: 25px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Gameclub全网音乐在线播放器，'+
    '一款开源的基于网易云音乐、酷我音乐、QQ音乐api的在线音乐播放器。具有音乐搜索、播放、下载、歌词同步显示、MV视频播放、个人音乐播放列表等功能，本项目已开源。<br>github链接:<a href="https://gitee.com/k7opi/MusicPlayerOL_tencent">https://gitee.com/k7opi/MusicPlayerOL_tencent</a>'+
    '<br>有问题请联系站长，QQ：2026314667<br>Tips:感谢孟坤<a href="https://mkblog.cn/">https://mkblog.cn/</a>提供的前端样式源码。</p>'
    layer.open({
        type: 1,
        shade: false,
        title: "关于本站", // 不显示标题
        shade: 0.5,    // 遮罩颜色深度
        shadeClose: true,
        content: tmpHtml,
        cancel: function(){
        }
    });
}

// 选择要显示哪个数据区
// 参数：要显示的数据区（list、sheet、player）
function dataBox(choose) {
    $('.btn-box .active').removeClass('active');
    switch(choose) {
        case "list":    // 显示播放列表
            if($(".btn[data-action='player']").css('display') !== 'none') {
                $("#player").hide();
            } else if ($("#player").css('display') == 'none') {
                $("#player").fadeIn();
            }
            $("#main-list").fadeIn();
            $("#sheet").fadeOut();
            $(".btn[data-action='playing']").addClass('active');
        break;
        
        case "sheet":   // 显示专辑
            if($(".btn[data-action='player']").css('display') !== 'none') {
                $("#player").hide();
            } else if ($("#player").css('display') == 'none') {
                $("#player").fadeIn();
            }
            $("#sheet").fadeIn();
            $("#main-list").fadeOut();
            $(".btn[data-action='sheet']").addClass('active');
        break;
        
        case "player":  // 显示播放器
            $("#player").fadeIn();
            $("#sheet").fadeOut();
            $("#main-list").fadeOut();
            $(".btn[data-action='player']").addClass('active');
        break;
    }
}

//搜索音乐按钮点击事件
function searchSubmit() {
    var wd = $("#search-wd").val();
    if(!wd) {
        $("#search-wd").focus();
        return false;
    }
    rem.keyword = wd; //存储关键词
    var source = $("#music-source input[name='source']:checked").val();
    layer.closeAll('page');     // 关闭搜索框
    rem.mainList.html('');   // 清空列表中原有的元素
    ajaxSearch(wd,source);// 加载搜索结果
    return false;
}

//跳转正在播放
function jumplist(){
    $('.btn-box .active').removeClass('active');
    if($(".btn[data-action='player']").css('display') !== 'none') {
        $("#player").hide();
    } else if ($("#player").css('display') == 'none') {
        $("#player").fadeIn();
    }
    $("#main-list").fadeIn();
    $("#sheet").fadeOut();
    $(".btn[data-action='playing']").addClass('active');
}

//获取搜索音乐结果
function ajaxSearch(wd,type){
    var ajaxurl = '';
    switch (type){
        case "kuwo":
            ajaxurl = BASEURL + '/kuworesult';
            rem.source = 'kuwo';
            break;
        case "netease":
            ajaxurl = BASEURL + '/neteaseresult';
            rem.source = 'netease';
            break;
        case "qq":
            ajaxurl = BASEURL + '/qqresult';
            rem.source = 'qq';
            break;
    }
    //layer.msg('搜索中，请稍后');
    rem.page = 1;  //初始化页数为1
    rem.type = type;  //记录搜索音乐源
    isloading();    //加载中动画
$.ajax({
        type: "GET", 
        url: ajaxurl, 
        data: {
            keyword:wd,
            page:rem.page
        },
        timeout: 15000,
        complete: function(XMLHttpRequest, textStatus) {
            closeload();    //关闭加载中动画
            jumplist();
        },
        success: function(jsonData){
            if(jsonData.code == -1){
                addListhead();      // 向列表中加入列表头
                addListbar('nodata');    //加入列表尾
                layer.msg('无搜索结果');
                return true;
            }
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
            for(let i=0;i<playlist.length;i++){
                addItem(i, playlist[i].name, playlist[i].artist, playlist[i].album, playlist[i].mvid);
            }
            if(jsonData.total>rem.page*30){
                addListbar('more');    //加入列表尾
            }else{
                addListbar('nomore');    //加入列表尾(没有更多了)
            }
            layer.msg('搜索成功！');
            rem.page++; //页数加一
        }   //success
    });//ajax
}

//获取更多搜索音乐结果
function ajaxMore(){
    removeListfoot();  //清除列表尾
    //layer.msg('加载中...');
    var tap = playlist.length;
    var ajaxurl = '';
    switch (rem.source){
        case "kuwo":
            ajaxurl = BASEURL + '/kuworesult';
            break;
        case "netease":
            ajaxurl = BASEURL + '/neteaseresult';
            break;
        case "qq":
            ajaxurl = BASEURL + '/qqresult';
            break;
    }
    isloading();    //加载中动画
    $.ajax({
        type: "GET", 
        url: ajaxurl, 
        data: {
            keyword:rem.keyword,
            page:rem.page
        },
        timeout: 15000,
        complete: function(XMLHttpRequest, textStatus) {
            closeload();    //关闭加载中动画
        },
        success: function(jsonData){
            if(jsonData.code == -1){
                layer.msg('没有更多了！');
                return false;
            }
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
            for(let i=tap;i<playlist.length;i++){
                addItem(i, playlist[i].name, playlist[i].artist, playlist[i].album, playlist[i].mvid);
            }
            if(jsonData.total>rem.page*30){
                addListbar('more');    //加入列表尾(还能加载更多)
            }else{
                addListbar('nomore');    //加入列表尾(没有更多了)
            }
            
            layer.msg('加载成功！');
            rem.page++; //页数加一
        }   //success
    });//ajax
}

//获取播放列表中的歌曲
function ajaxList(listdata){
    if(listdata.bangid != undefined){
        ajaxdata = "type="+listdata.bangid;
    }
    //layer.msg('搜索中，请稍后');
    isloading();    //加载中动画
$.ajax({
        type: "GET", 
        url: BASEURL + '/list', 
        data: ajaxdata,
        timeout: 15000,
        complete: function(XMLHttpRequest, textStatus) {
            closeload();    //关闭加载中动画
            jumplist();
        },
        success: function(jsonData){
            if(jsonData.code == -1){
                layer.msg('无结果');
                listfoot.innerHTML = "可能是个假列表，什么也没有";
                return true;
            }
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
                  'mvid':null
              });
            }
            rem.mainList.html('');   // 清空列表中原有的元素
            addListhead();      // 向列表中加入列表头
            for(let i=0;i<playlist.length;i++){
                addItem(i, playlist[i].name, playlist[i].artist, playlist[i].album, playlist[i].mvid);
            }
            
            layer.msg('搜索成功！');
        }   //success
    });//ajax
}

// 列表中新增一项
// 参数：编号、名字、歌手、专辑、mvid
function addItem(no, name, auth, album, mvid) {
    var html = '';
    if(mvid&&!rem.isMobile){
        html = '<div class="list-item" data-no="'+no+'">'+
        '<span class="list-num">'+(no +1)+'</span>'+
        '<span class="list-mobile-menu"></span>'+
        '<span class="music-album">'+album+'</span>'+
        '<span class="auth-name">'+auth+'</span>'+
        '<span class="music-name">'+
            '<span class="music-name-cult">'+name+'<span class="songlist__icon songlist__icon_mv sprite" data-function="share" title="MV" onclick="playmv('+no+')"></span></span>'+
            '<div class="list-menu" data-no="'+no+'">'+
                '<span class="list-icon icon-play" onclick="playList('+no+')" data-function="play" title="点击播放这首歌"></span>'+
                '<span class="list-icon icon-share" onclick="addMylist('+no+')" data-function="share" title="点击添加到我的歌单"></span>'+
            '</div>'+
        '</span>'+
    '</div>'
    }else{
        html = '<div class="list-item" data-no="'+no+'">'+
        '<span class="list-num">'+(no +1)+'</span>'+
        '<span class="list-mobile-love"></span>'+
        '<span class="list-mobile-menu"></span>'+
        '<span class="music-album">'+album+'</span>'+
        '<span class="auth-name">'+auth+'</span>'+
        '<span class="music-name">'+
            '<span class="music-name-cult">'+name+'</span>'+
            '<div class="list-menu" data-no="'+no+'">'+
                '<span class="list-icon icon-play" onclick="playList('+no+')" data-function="play" title="点击播放这首歌"></span>'+
                '<span class="list-icon icon-share" onclick="addMylist('+no+')" data-function="share" title="点击添加到我的歌单"></span>'+
            '</div>'+
        '</span>'+
    '</div>'
    }
    rem.mainList.append(html);
}

// 向列表中加入列表头
function addListhead() {
    var html = '<div class="list-item list-head">' +
    '    <span class="music-album">' +
    '        专辑' +
    '    </span>' +
    '    <span class="auth-name">' +
    '        歌手' +
    '    </span>' +
    '    <span class="music-name">' +
    '        歌曲' +
    '    </span>' +
    '</div>';
    rem.mainList.append(html);
}

// 加载列表中的提示条
// 参数：类型（more、nomore、loading、nodata、clear）
function addListbar(types) {
    var html
    switch(types) {
        case "more":    // 还可以加载更多
            html = '<div class="list-item text-center list-loadmore list-clickable" title="点击加载更多数据" id="list-foot" onclick="ajaxMore();">点击加载更多...</div>';
        break;
        
        case "nomore":  // 数据加载完了
            html = '<div class="list-item text-center" id="list-foot">全都加载完了</div>';
        break;

        case "nodata":  // 列表中没有内容
            html = '<div class="list-item text-center" id="list-foot">可能是个假列表，什么也没有</div>';
        break;
    }
    rem.mainList.append(html);
}

//移除列表尾
function removeListfoot(){
    $('#list-foot').remove();
}

function playList(id) {
    // 没有歌曲，跳出
    if(playlist.length <= 0) return true;
    
    // ID 范围限定
    if(id >= playlist.length) id = 0;
    if(id < 0) id = playlist.length - 1;
    
    // 记录正在播放的歌曲在正在播放列表中的 id
    rem.playid = id;
    
    //ajax 获取播放链接
    getmusicurl(id);
    var msg = " 正在播放: " + playlist[rem.playid].name + " - " + playlist[rem.playid].artist;  // 改变浏览器标题
    // 清除定时器
    if (rem.titflash !== undefined ) 
    {
        clearInterval(rem.titflash);
    }
    // 标题滚动
    titleFlash(msg);
    refreshList();  //更新列表样式
    getlrc(rem.playid); //更新歌词
    audio.addEventListener('timeupdate', updateProgress);   // 更新进度
    audio.addEventListener('error', audioErr);   // 播放器错误处理
    audio.volume = volume_bar.percent;  //初始化音量
}

// 音频错误处理函数
function audioErr() {
    // 没播放过，直接跳过
    if(rem.playid === undefined) return true;
    if(rem.errCount >= 5){
        rem.errCount = 0;
        layer.msg('似乎出了点问题~播放已停止');
        return;
    }
    setTimeout(function(){
        rem.errCount++;     // 记录连续播放失败的歌曲数目
        layer.msg('当前歌曲播放失败，自动播放下一首');
        autoNextMusic();    // 切换下一首歌
    },500)
}

function getmusicurl(id){
    //判断该数组元素是否被删除
    if(!playlist[id]){
        autoNextMusic();    // 切换下一首歌
        return;
    }
    var geturl = '';
    switch (playlist[id].source){
        case "kuwo":
            geturl = BASEURL + '/kuwourl';
            break;
        case "netease":
            geturl = BASEURL + '/neteaseurl';
            break;
        case "qq":
            geturl = BASEURL + '/qqurl';
            break;    
    }
    isloading();    //加载中动画
    $.ajax({
        type: "GET", 
        url: geturl, 
        data: "id="+playlist[id].musicrid,
        timeout: 15000,
        complete:function(){
            closeload();    //关闭加载中动画
        },
        success: function(jsonData){
            playlist[id].musicurl = jsonData; 
            audio.src = playlist[id].musicurl;
            changeCover(id);
            audio.play();
            rem.paused = false;
            $(".btn-play").addClass("btn-state-paused");
            // if(playlist[id].source == 'netease'){//获取网易云音乐的歌曲封面图片
            //     $.ajax({
            //         type: "GET",
            //         url: BASEURL + '/neteasepic?id=' + playlist[id].musicrid,
            //         timeout: 15000,
            //         success: function(jsonData){
            //             if(jsonData){
            //                 playlist[id].pic = jsonData;
            //                 changeCover(id);
            //             }
            //         }
            //     });
            // }
        }   //success
    });//ajax
}

function playmv(id){
    if(!playlist[id].mvid){
        layer.msg('该歌曲无MV');
        return;
    }
    var geturl = '';
    switch (playlist[id].source){
        case "kuwo":
            geturl = BASEURL + '/kuwomv';
            break;
        case "netease":
            geturl = BASEURL + '/neteasemv';
            break;
        case "qq":
            geturl = BASEURL + '/qqmv';
            break;    
    }
    $.ajax({
        type: "GET",
        url: geturl,
        data: {
            id:playlist[id].mvid,
            name:playlist[id].name,
            artist:playlist[id].artist,
        },
        timeout: 15000,
        success: function(jsonData){
            layer.open({
                title: playlist[id].name+' - '+playlist[id].artist,
                type: 1,
                skin: 'layui-layer-rim', //加上边框
                area: ['80%', 'auto'], //宽高
                content: jsonData
              });
              setTimeout(function(){
                  document.getElementsByTagName('video')[0].play();
              },1000)
              rem.paused == true;
                $(".list-playing").removeClass("list-playing");        // 移除其它的正在播放
                $(".btn-play").removeClass("btn-state-paused");     // 取消暂停
                $("#music-progress .dot-move").removeClass("dot-move");   // 小点闪烁效果
              audio.pause();
        }   //success
    });
}

function audiocontrol(){
    if(rem.paused == false) audioPause();
    else audioPlay();
}


function audioPause() {
    rem.paused = true;      // 更新状态（已暂停）
    $(".list-playing").removeClass("list-playing");        // 移除其它的正在播放
    
    $(".btn-play").removeClass("btn-state-paused");     // 取消暂停
    
    $("#music-progress .dot-move").removeClass("dot-move");   // 小点闪烁效果

    layer.msg('暂停');
    if (rem.titflash !== undefined ) 
    {
        clearInterval(rem.titflash);
    }
    document.title = rem.webTitle;    // 改变浏览器标题
    if(isMobile.iOS() != true){
        rem.interval_volume_down = setInterval("VolumeDown()",30); //音量递减计时器
    }else{
        audio.pause();
    }
}

function audioPlay() {
    if(playlist.length<=0){
        layer.msg('列表中无音乐');
        return;
    }
    if(rem.playid==undefined){
        layer.msg('请从列表中选择要播放的音乐');
        return;
    }
    rem.paused = false;     // 更新状态（未暂停）
    $(".btn-play").addClass("btn-state-paused");        // 恢复暂停
    refreshList();  //更新列表样式
    var msg = " 正在播放: " + playlist[rem.playid].name + " - " + playlist[rem.playid].artist;  // 改变浏览器标题
    // 清除定时器
    layer.msg('播放');
    if (rem.titflash !== undefined ) 
    {
        clearInterval(rem.titflash);
    }
    // 标题滚动
    titleFlash(msg);
    if(isMobile.iOS() != true){
        audio.play();
        rem.interval_volume_up = setInterval("VolumeUp()",30); //音量递增计时器
    }else{
        audio.play();
    }
}

//音量递减到0然后暂停
function VolumeDown(){
    if(audio !== undefined) {
        var num = audio.volume
        var tmp_vol = volume_bar.percent;
        num = num - tmp_vol/30
        if(num <= 0){
            audio.volume = 0
            clearInterval(rem.interval_volume_down)
            audio.pause();
        }else{
            audio.volume = num
        }
    }
}
//开始播放然后音量递增
function VolumeUp(){
    if(audio !== undefined) {
        var tmp_vol = volume_bar.percent;
        var num = audio.volume
        num = num + tmp_vol/30
        if(num >= tmp_vol){
            audio.volume = tmp_vol
            clearInterval(rem.interval_volume_up)
        }else{
            audio.volume = num
        }
    }
}

//播放模式按钮
// 循环顺序
function orderChange() {
    var orderDiv = $(".btn-order");
    orderDiv.removeClass();
    switch(rem.order) {
        case 1:     // 单曲循环 -> 列表循环
            orderDiv.addClass("player-btn btn-order btn-order-list");
            orderDiv.attr("title", "列表循环");
            layer.msg("列表循环");
            rem.order = 2;
            break;
            
        case 3:     // 随机播放 -> 单曲循环
            orderDiv.addClass("player-btn btn-order btn-order-single");
            orderDiv.attr("title", "单曲循环");
            layer.msg("单曲循环");
            rem.order = 1;
            break;
            
        // case 2:
        default:    // 列表循环(其它) -> 随机播放
            orderDiv.addClass("player-btn btn-order btn-order-random");
            orderDiv.attr("title", "随机播放");
            layer.msg("随机播放");
            rem.order = 3;
    }
}

// 自动播放时的下一首歌
function autoNextMusic() {
    if(rem.order && rem.order === 1) {
        playList(rem.playid);
    } else {
        nextMusic();
    }
}

// 播放下一首歌
function nextMusic() {
    switch (rem.order ? rem.order : 1) {
        case 1,2: 
            playList(rem.playid + 1);
        break;
        case 3: 
            if (playlist && playlist.length) {
                var id = parseInt(Math.random() * playlist.length);
                playList(id);
            }
        break;
        default:
            playList(rem.playid + 1); 
        break;
    }
}

function prevMusic() {
    playList(rem.playid - 1);
}

// 标题滚动
function titleFlash(msg) {

    // 截取字符
    var tit = function() {
        msg = msg.substring(1,msg.length)+ msg.substring(0,1);
        document.title = msg;
    };
    // 设置定时间 300ms滚动
    rem.titflash = setInterval(function(){tit()}, 300);
}

// 刷新当前显示的列表，如果有正在播放则添加样式
function refreshList() {
    // 还没播放过，不用对比了
    if(rem.playid === undefined) return true;
    
    $(".list-playing").removeClass("list-playing");        // 移除其它的正在播放
    
    if(rem.paused !== true) {   // 没有暂停
        for(var i=0; i<playlist.length; i++) {
            // 与正在播放的歌曲 id 相同
            if(playlist[rem.playid] !== undefined&&rem.playid == i){
                $(".list-item[data-no='" + i + "']").addClass("list-playing");  // 添加正在播放样式
                return true;    // 一般列表中只有一首，找到了赶紧跳出
            }
        }
    }
    
}

// 歌曲时间变动回调函数
function updateProgress(){
    // 暂停状态不管
    if(rem.paused !== false) return true;
    // 同步进度条
    music_bar.goto(audio.currentTime / audio.duration);
    scrollLyric(audio.currentTime);//同步歌曲显示
}

// 音量条变动回调函数
// 参数：新的值
function vBcallback(newVal) {
    if(audio !== undefined) {   // 音频对象已加载则立即改变音量
        audio.volume = newVal;
    }
    
    if($(".btn-quiet").is('.btn-state-quiet')) {
        $(".btn-quiet").removeClass("btn-state-quiet");     // 取消静音
    }
    
    if(newVal === 0) $(".btn-quiet").addClass("btn-state-quiet");
    
    playerSavedata('volume', newVal); // 存储音量信息
}

// 下面是进度条处理
var initProgress = function(){  
    // 初始化播放进度条
    music_bar = new mkpgb("#music-progress", 0, mBcallback);
    music_bar.lock(false);   // 未播放时锁定不让拖动
    // 初始化音量设定
    var tmp_vol = playerReaddata('volume');
    tmp_vol = (tmp_vol != null)? tmp_vol: (rem.isMobile? 1: mkPlayer.volume);
    if(tmp_vol < 0) tmp_vol = 0;    // 范围限定
    if(tmp_vol > 1) tmp_vol = 1;
    if(tmp_vol == 0) $(".btn-quiet").addClass("btn-state-quiet"); // 添加静音样式
    volume_bar = new mkpgb("#volume-progress", tmp_vol, vBcallback);
};  

// 音乐进度条拖动回调函数
function mBcallback(newVal) {
    var newTime = audio.duration * newVal;
    // 应用新的进度
    audio.currentTime = newTime;
    refreshLyric(newTime);  // 强制滚动歌词到当前进度
}

// mk进度条插件
// 进度条框 id，初始量，回调函数
mkpgb = function(bar, percent, callback){  
    this.bar = bar;
    this.percent = percent;
    this.callback = callback;
    this.locked = false;
    this.init();  
};

mkpgb.prototype = {
    // 进度条初始化
    init : function(){  
        var mk = this,mdown = false;
        // 加载进度条html元素
        $(mk.bar).html('<div class="mkpgb-bar"></div><div class="mkpgb-cur"></div><div class="mkpgb-dot"></div>');
        // 获取偏移量
        mk.minLength = $(mk.bar).offset().left; 
        mk.maxLength = $(mk.bar).width() + mk.minLength;
        // 窗口大小改变偏移量重置
        $(window).resize(function(){
            mk.minLength = $(mk.bar).offset().left; 
            mk.maxLength = $(mk.bar).width() + mk.minLength;
        });
        // 监听小点的鼠标按下事件
        $(mk.bar + " .mkpgb-dot").mousedown(function(e){
            e.preventDefault();    // 取消原有事件的默认动作
        });
        // 监听进度条整体的鼠标按下事件
        $(mk.bar).mousedown(function(e){
            if(!mk.locked) mdown = true;
            barMove(e);
        });
        // 监听鼠标移动事件，用于拖动
        $("html").mousemove(function(e){
            barMove(e);
        });
        // 监听鼠标弹起事件，用于释放拖动
        $("html").mouseup(function(e){
            mdown = false;
        });
        
        function barMove(e) {
            if(!mdown) return;
            var percent = 0;
            if(e.clientX < mk.minLength){ 
                percent = 0; 
            }else if(e.clientX > mk.maxLength){ 
                percent = 1;
            }else{  
                percent = (e.clientX - mk.minLength) / (mk.maxLength - mk.minLength);
            }
            mk.callback(percent);
            mk.goto(percent);
            return true;
        }
        
        mk.goto(mk.percent);
        
        return true;
    },
    // 跳转至某处
    goto : function(percent) {
        if(percent > 1) percent = 1;
        if(percent < 0) percent = 0;
        this.percent = percent;
        $(this.bar + " .mkpgb-dot").css("left", (percent*100) +"%"); 
        $(this.bar + " .mkpgb-cur").css("width", (percent*100)+"%");
        return true;
    },
    // 锁定进度条
    lock : function(islock) {
        if(islock) {
            this.locked = true;
            $(this.bar).addClass("mkpgb-locked");
        } else {
            this.locked = false;
            $(this.bar).removeClass("mkpgb-locked");
        }
        return true;
    }
};  



// 展现系统列表中任意首歌的歌曲信息
function musicInfo(id, index, ismylist) {
    var tempStr = '<span class="info-title">歌名：</span>' + playlist[index].name + 
    '<br><span class="info-title">歌手：</span>' + playlist[index].artist + 
    '<br><span class="info-title">专辑：</span>' + playlist[index].album + 
    '<br><span class="info-title">来源：</span>' + getsource(playlist[index].source);
    
    if(index == id) {   // 当前正在播放这首歌，那么还可以顺便获取一下时长。。
        tempStr += '<br><span class="info-title">时长：</span>' + formatTime(audio.duration);
    }
    tempStr += '<br><span class="info-btn" onclick="thisDownload('+index+')">下载</span>';
    if(playlist[index].mvid){
        tempStr +='<span onclick="playmv('+index+')" class="info-btn" style="margin-left: 10px">播放MV</span>';
    }
    layer.open({
        type: 0,
        shade: false,
        title: false, //不显示标题
        btn: false,
        content: tempStr
    });
}

//获取歌曲来源信息
//参数：歌曲来源代号 eg: kuwo, netease, qq
function getsource(a){
    var source;
    switch(a){
        case 'kuwo': 
        source = '酷我音乐';
        break;
        case 'netease': 
        source = '网易云音乐';
        break;
        case 'qq': 
        source = 'QQ音乐';
        break;
    }
    return source;
}

// 展现搜索弹窗
function searchBox() {
    var tmpHtml = '<form onSubmit="return searchSubmit()"><div id="search-area">' + 
    '    <div class="search-group">' + 
    '        <input type="text" name="wd" id="search-wd" placeholder="搜索歌手、歌名、专辑" autofocus required>' + 
    '        <button class="search-submit" type="submit">搜 索</button>' + 
    '    </div>' + 
    '    <div class="radio-group" id="music-source">' + 
    '       <label><input type="radio" name="source" value="qq" checked="">播放源1</label>' + 
    '       <label><input type="radio" name="source" value="netease">播放源2</label>' + 
    '        <br>'+
    '       <label><input type="radio" name="source" value="kuwo">播放源3</label>' +
    '   </div>' + 
    '</div></form>';
    layer.open({
        type: 1,
        shade: false,
        title: false, // 不显示标题
        shade: 0.5,    // 遮罩颜色深度
        shadeClose: true,
        content: tmpHtml,
        cancel: function(){
        }
    });
    
    // 恢复上一次的输入
    $("#search-wd").focus().val(rem.wd);
}

// 展现app下载二维码
function appcode() {
    var tmpHtml = '<div style="padding: 25px 30px;display: block;text-align: center;">'+
                  '<p style="margin-bottom: 10px;">全网音乐播放器安卓客户端</p>'+
                  '<img src="images/download.png" style="width:190px;height:190px;" draggable="false">'+
                  '</div>';
    layer.open({
        type: 1,
        shade: false,
        title: false, // 不显示标题
        shade: 0.5,    // 遮罩颜色深度
        shadeClose: true,
        //title: "全网音乐播放器安卓客户端",
        content: tmpHtml,
        cancel: function(){
        }
    });
}    

    // 改变右侧封面图像
    // 新的图像地址
function changeCover(id) {
    var img = playlist[id].pic;
    
    var animate = false,imgload = false;

    if(img == "") {
        img = "images/player_cover.png";
    } else {
        if(rem.isMobile)      // 移动端封面
        {    
            $("#music-cover").load(function(){
                $("#mobile-blur").css('background-image', 'url("' + img + '")');
            });
        } 
        else if(!rem.isMobile)     // PC端封面
        { 
            $("#music-cover").load(function(){
                if(animate) {   // 渐变动画也已完成
                    $("#blur-img").backgroundBlur(img);    // 替换图像并淡出
                    $("#blur-img").animate({opacity:"1"}, 2000); // 背景更换特效
                } else {
                    imgload = true;     // 告诉下面的函数，图片已准备好
                }
                
            });
            
            // 渐变动画
            $("#blur-img").animate({opacity: "0.1"}, 1000, function(){
                if(imgload) {   // 如果图片已经加载好了
                    $("#blur-img").backgroundBlur(img);    // 替换图像并淡出
                    $("#blur-img").animate({opacity:"0.6"}, 2000); // 背景更换特效
                } else {
                    animate = true;     // 等待图像加载完
                }
            });
        }
    }
    
    $("#music-cover").attr("src", img);     // 改变右侧封面
    $(".sheet-item[data-no='1'] .sheet-cover").attr('src', img);    // 改变正在播放列表的图像
}

//加载圆圈动画
function isloading(){
    rem.isload = layer.load(1, {
        shade: [0.1,'transparent'] //0.1透明度的白色背景
    });
}
//关闭加载圆圈动画
function closeload(){
    layer.close(rem.isload);
    rem.isload = null;
}

// 下载歌曲
// 参数：包含歌曲信息的数组
function thisDownload(id) {
    if(playlist[id].musicurl) {
        openDownloadDialog(playlist[id].musicurl, playlist[id].name + ' - ' + playlist[id].artist);
        return;
    }
    var geturl = '';
    switch (playlist[id].source){
        case "kuwo":
            geturl = BASEURL + '/kuwourl';
            break;
        case "netease":
            geturl = BASEURL + '/neteaseurl';
            break;
        case "qq":
            geturl = BASEURL + '/qqurl';
            break;    
    }
    $.ajax({
        type: "GET", 
        url: geturl, 
        data: "id="+playlist[id].musicrid,
        timeout: 15000,
        success: function(jsonData){
            if(!jsonData){
                layer.msg('无法获取下载链接！');
                return;
            }
            playlist[id].musicurl = jsonData; 
            openDownloadDialog(jsonData, playlist[id].name + ' - ' + playlist[id].artist);
        }   //success
    });//ajax
}

/**
 * 通用的打开下载对话框方法，没有测试过具体兼容性
 * @param url 下载地址，也可以是一个blob对象，必选
 * @param saveName 保存文件名，可选
 * http://www.cnblogs.com/liuxianan/p/js-download.html
 */
function openDownloadDialog(url, saveName)
{
    if(typeof url == 'object' && url instanceof Blob)
    {
        url = URL.createObjectURL(url); // 创建blob地址
    }
    var aLink = document.createElement('a');
    aLink.href = url;
    aLink.target = "_blank";
    aLink.download = saveName || ''; // HTML5新增的属性，指定保存文件名，可以不要后缀，注意，file:///模式下不会生效
    var event;
    if(window.MouseEvent) event = new MouseEvent('click');
    else
    {
        event = document.createEvent('MouseEvents');
        event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    }
    aLink.dispatchEvent(event);
}

// 将时间格式化为 00:00 的格式
// 参数：原始时间
function formatTime(time){    
    var hour,minute,second;
    hour = String(parseInt(time/3600,10));
    if(hour.length == 1) hour='0' + hour;
    
    minute=String(parseInt((time%3600)/60,10));
    if(minute.length == 1) minute='0'+minute;
    
    second=String(parseInt(time%60,10));
    if(second.length == 1) second='0'+second;
    
    if(hour > 0) {
        return hour + ":" + minute + ":" + second;
    } else {
        return minute + ":" + second;
    }
}


// 播放器本地存储信息
// 参数：键值、数据
function playerSavedata(key, data) {
    key = 'mkPlayer2_' + key;    // 添加前缀，防止串用
    data = JSON.stringify(data);
    // 存储，IE6~7 不支持HTML5本地存储
    if (window.localStorage) {
        localStorage.setItem(key, data);	
    }
}

// 播放器读取本地存储信息
// 参数：键值
// 返回：数据
function playerReaddata(key) {
    if(!window.localStorage) return '';
    key = 'mkPlayer2_' + key;
    return JSON.parse(localStorage.getItem(key));
}

// 播放器删除本地存储信息
// 参数：键值
// 返回：数据
function playerRemovedata(key) {
    if(!window.localStorage) return '';
    key = 'mkPlayer2_' + key;
    return localStorage.removeItem(key);
}

    // 快捷键切歌，代码来自 @茗血(https://www.52benxi.cn/)
document.onkeydown = function showkey(e) {
    var key = e.keyCode || e.which || e.charCode;
    var ctrl = e.ctrlKey || e.metaKey;
    var isFocus = $('input').is(":focus");  
    if (ctrl && key == 37) playList(rem.playid - 1);    // Ctrl+左方向键 切换上一首歌
    if (ctrl && key == 39) playList(rem.playid + 1);    // Ctrl+右方向键 切换下一首歌
    if (key == 32 && isFocus == false) audiocontrol();         // 空格键 播放/暂停歌曲
}
