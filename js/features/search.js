// 歌曲搜索：搜索弹窗、首屏结果、加载更多
/* global $, layer */
import { state, resetPlaylist, playlist } from '../core/state.js';
import { isloading, closeload } from '../core/loading.js';
import { on, EVENTS } from '../core/events.js';
import { searchMusic, loadChart } from '../api/song.js';
import { addItem, addListhead, addListbar, removeListfoot } from '../ui/list-render.js';
import { jumplist } from './layout.js';

// 每页条数，与后端保持一致
var PAGE_SIZE = 30;

// 音乐源选项，顺序即弹窗中的显示顺序
var SOURCES = [
	{ value: 'kuwo', label: '酷我音乐(可听付费)' },
	{ value: 'netease', label: '网易云音乐(可听无损)' },
	{ value: 'qq', label: 'QQ音乐(可看MV)' }
];

// 音乐源单选项：默认选中上次点选过的源，首次打开为酷我
// 注意这里读 searchSource，而不是 source：
// source 是当前列表的实际来源，翻页（ajaxMore）依赖它，不能被尚未生效的选择污染
function sourceRadios() {
	var current = state.searchSource || 'kuwo';
	var html = '';
	for (var i = 0; i < SOURCES.length; i++) {
		var item = SOURCES[i];
		html += '<label><input type="radio" name="source" value="' + item.value + '"' +
			(item.value === current ? ' checked=""' : '') + '>' + item.label + '</label>';
		if (i === 1) html += '<br>';   // 保持原有换行布局
	}
	return html;
}

// 展现搜索弹窗
export function searchBox() {
	var tmpHtml = '<form onSubmit="return searchSubmit()"><div id="search-area">' +
		'    <div class="search-group">' +
		'        <input type="text" name="wd" id="search-wd" placeholder="搜索歌手、歌名、专辑" autofocus required>' +
		'        <button class="search-submit" type="submit">搜 索</button>' +
		'    </div>' +
		'    <div class="radio-group" id="music-source">' +
		sourceRadios() +
		'   </div>' +
		'</div></form>';
	layer.open({
		type: 1,
		shade: 0.5,
		title: false,
		shadeClose: true,
		content: tmpHtml
	});

	// 每次打开都是新的输入框，不带上次的搜索词，仅聚焦等待输入
	$('#search-wd').val('').focus();

	// 选中即记住：即使不点搜索就关掉弹窗，下次打开仍是这个源
	$('#music-source').on('change', "input[name='source']", function () {
		state.searchSource = $(this).val();
	});
}

// 搜索按钮点击事件
export function searchSubmit() {
	var wd = $('#search-wd').val();
	if (!wd) {
		$('#search-wd').focus();
		return false;
	}
	state.keyword = wd;     // 存储关键词
	var source = $("#music-source input[name='source']:checked").val();
	layer.closeAll('page'); // 关闭搜索框
	if (state.mainList) state.mainList.html(''); // 清空列表中原有的元素
	ajaxSearch(wd, source); // 加载搜索结果
	return false;
}

// 组装接口返回的歌曲字段
function toSong(item) {
	return {
		musicrid: item.musicrid,
		name: item.name,
		artist: item.artist,
		album: item.album,
		pic: item.pic,
		source: item.source,
		mvid: item.mvid
	};
}

// 搜索成功后渲染整张列表
function renderSearchResult(res) {
	resetPlaylist();
	state.listMode = 'sheet';
	var songs = res.songinfo || [];
	for (var j = 0; j < songs.length; j++) {
		playlist.push(toSong(songs[j]));
	}
	if (state.mainList) state.mainList.html('');
	addListhead();
	for (var i = 0; i < playlist.length; i++) {
		addItem(i, playlist[i].name, playlist[i].artist, playlist[i].album, playlist[i].mvid);
	}
	return res;
}

// 获取搜索音乐结果
export function ajaxSearch(wd, type) {
	if (!type) {
		layer.msg('请选择音乐来源');
		return Promise.resolve();
	}
	state.page = 1;     // 初始化页数为 1
	state.type = type;  // 记录搜索音乐源
	state.source = type;
	state.searchSource = type;  // 弹窗回显用，与 source 保持一致
	isloading();
	return searchMusic(type, wd, state.page)
		.then(function (res) {
			if (!res || res.code == -1) {
				addListhead();
				addListbar('nodata');
				layer.msg('无搜索结果');
				return;
			}
			renderSearchResult(res);
			var total = res.total !== undefined ? res.total : res.totol;
			if (total > state.page * PAGE_SIZE) {
				addListbar('more');
			} else {
				addListbar('nomore');
			}
			layer.msg('搜索成功！');
			state.page++; // 页数加一
		})
		.catch(function (err) {
			console.error('[search] error:', err);
			layer.msg('搜索失败，请稍后重试');
		})
		.then(function () {
			closeload();
			jumplist();
		});
}

// 获取更多搜索音乐结果
export function ajaxMore() {
	removeListfoot();   // 清除列表尾
	var tap = playlist.length;
	isloading();
	return searchMusic(state.source, state.keyword, state.page)
		.then(function (res) {
			if (!res || res.code == -1) {
				layer.msg('没有更多了！');
				return;
			}
			var songs = res.songinfo || [];
			for (var j = 0; j < songs.length; j++) {
				playlist.push(toSong(songs[j]));
			}
			for (var i = tap; i < playlist.length; i++) {
				addItem(i, playlist[i].name, playlist[i].artist, playlist[i].album, playlist[i].mvid);
			}
			var total = res.total !== undefined ? res.total : res.totol;
			if (total > state.page * PAGE_SIZE) {
				addListbar('more');
			} else {
				addListbar('nomore');
			}
			layer.msg('加载成功！');
			state.page++; // 页数加一
		})
		.catch(function (err) {
			console.error('[search] more error:', err);
			layer.msg('加载失败，请稍后重试');
		})
		.then(function () {
			closeload();
		});
}

// 榜单
// 参数：{ bangid } 1 热歌榜 2 飙升榜 3 新歌榜 4 抖音热榜
export function ajaxList(listdata) {
	var type = listdata && listdata.bangid;
	if (!type) return Promise.resolve();
	isloading();
	return loadChart(type)
		.then(function (res) {
			if (!res || res.code == -1) {
				layer.msg('无结果');
				if (state.mainList) state.mainList.append('<div class="list-item text-center" id="list-foot">可能是个假列表，什么也没有</div>');
				return;
			}
			renderSearchResult(res);
			layer.msg('搜索成功！');
		})
		.catch(function (err) {
			console.error('[chart] error:', err);
			layer.msg('榜单加载失败');
		})
		.then(function () {
			closeload();
			jumplist();
		});
}

export function init() {
	on(EVENTS.SEARCH_BOX, searchBox);
}
