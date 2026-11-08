// 我的歌单：添加、获取（分页）、删除
/* global $, layer */
import { state, playlist, resetPlaylist, removeSong } from '../core/state.js';
import { isloading, closeload } from '../core/loading.js';
import { on, EVENTS } from '../core/events.js';
import * as authApi from '../api/auth.js';
import { CODE } from '../api/request.js';
import { addItem, addListhead } from '../ui/list-render.js';
import { jumplist } from './layout.js';
import { initProgress } from './player.js';
import { loginBox } from './auth.js';

var PAGE_SIZE = 50;

// 我的歌单分页游标（与搜索翻页的 state.page 分开，避免互相污染）
var mylistPage = 1;
var mylistHasMore = false;

function isAuthError(err) {
	return !!err && (
		err.code === CODE.UNAUTHORIZED ||
		err.code === CODE.TOKEN_EXPIRED ||
		err.code === CODE.TOKEN_INVALID
	);
}

// 清空列表区并渲染表头
function resetListArea() {
	resetPlaylist();
	state.listMode = 'mylist';
	mylistPage = 1;
	mylistHasMore = false;
	if (state.mainList) state.mainList.html('');
	addListhead();
}

// 渲染空歌单占位
function renderEmpty() {
	if (state.mainList) {
		state.mainList.append('<div class="list-item text-center" id="list-foot">您的歌单暂无音乐</div>');
	}
}

// 把一页歌曲追加到列表
function appendSongs(list) {
	var base = playlist.length;
	for (var i = 0; i < list.length; i++) {
		var song = list[i];
		playlist.push({
			musicrid: song.musicrid,
			name: song.name,
			artist: song.artist,
			album: song.album,
			pic: song.pic,
			source: song.source,
			mvid: song.mvid
		});
		addItem(base + i, song.name, song.artist, song.album, song.mvid, 'mylist', base + i);
	}
}

// 更新列表尾部的「加载更多」提示条
function renderFoot() {
	$('#list-foot').remove();
	if (!state.mainList) return;
	if (mylistHasMore) {
		state.mainList.append('<div class="list-item text-center list-loadmore list-clickable" id="list-foot" onclick="ajaxMylistMore()">点击加载更多...</div>');
	} else {
		state.mainList.append('<div class="list-item text-center" id="list-foot">全都加载完了</div>');
	}
}

// 添加到我的歌单
export function addMylist(i) {
	var song = playlist[i];
	if (!song) return;
	isloading();
	return authApi.addToList(song)
		.then(function () {
			layer.msg('已添加到我的歌单');
			return true;
		})
		.catch(function (err) {
			if (isAuthError(err)) {
				layer.msg(err.message || '请先登录！');
				loginBox();
				return false;
			}
			// 4090：已存在。对用户来说是「已经在里面了」，不算失败
			if (err && err.code === CODE.CONFLICT) {
				layer.msg('该歌曲已在你的歌单中');
				return false;
			}
			console.error('[mylist] add error:', err);
			layer.msg((err && err.message) || '操作失败，请稍后重试');
			return false;
		})
		.then(function (result) {
			closeload();
			return result;
		});
}

// 获取我的歌单（第一页）
export function getMylist() {
	isloading();
	mylistPage = 1;
	return authApi.fetchMyList(1, PAGE_SIZE)
		.then(function (data) {
			resetListArea();
			var list = (data && data.list) || [];
			mylistHasMore = !!(data && data.hasMore);
			appendSongs(list);
			initProgress();  // 初始化进度条
			if (!list.length) {
				renderEmpty();
			} else {
				renderFoot();
			}
			jumplist();
			return true;
		})
		.catch(function (err) {
			if (isAuthError(err)) {
				layer.msg(err.message || '请先登录！');
				loginBox();
				return false;
			}
			console.error('[mylist] fetch error:', err);
			layer.msg((err && err.message) || '获取歌单失败，请稍后重试');
			return false;
		})
		.then(function (result) {
			closeload();
			return result;
		});
}

// 加载我的歌单下一页
export function ajaxMylistMore() {
	if (!mylistHasMore) return;
	isloading();
	var next = mylistPage + 1;
	return authApi.fetchMyList(next, PAGE_SIZE)
		.then(function (data) {
			var list = (data && data.list) || [];
			mylistPage = next;
			mylistHasMore = !!(data && data.hasMore);
			appendSongs(list);
			renderFoot();
			return true;
		})
		.catch(function (err) {
			if (isAuthError(err)) {
				layer.msg(err.message || '请先登录！');
				loginBox();
				return false;
			}
			console.error('[mylist] more error:', err);
			layer.msg((err && err.message) || '加载失败，请稍后重试');
			return false;
		})
		.then(function (result) {
			closeload();
			return result;
		});
}

// 从歌单中删除（带确认框）
export function delMylist(i) {
	var song = playlist[i];
	if (!song) return;
	layer.confirm('<div>确认删除吗？</div>', { btn: ['确定', '取消'], title: '提示' }, function () {
		layer.close(layer.index);
		isloading();
		// 先请求成功再动本地，避免出现「界面已删、服务端还在」的不一致
		authApi.removeFromList(song)
			.then(function () {
				removeSong(i);  // 保持 delete 语义，不移位
				$('.list-item[data-no=' + i + ']').remove();
				layer.msg('已从歌单删除');
			})
			.catch(function (err) {
				if (isAuthError(err)) {
					layer.msg(err.message || '请先登录！');
					loginBox();
					return;
				}
				console.error('[mylist] delete error:', err);
				layer.msg((err && err.message) || '删除失败，请稍后重试');
			})
			.then(function () {
				closeload();
			});
	});
}

export function init() {
	on(EVENTS.ADD_MYLIST, addMylist);
	on(EVENTS.DEL_MYLIST, delMylist);
}
