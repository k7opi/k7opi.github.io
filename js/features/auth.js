// 登录 / 退出 / 验证码 / 登录状态
/* global $, layer, XMLHttpRequest, URL */
import { state } from '../core/state.js';
import { isloading, closeload } from '../core/loading.js';
import { escapeHtml } from '../core/utils.js';
import { on, EVENTS } from '../core/events.js';
import { playerReaddata, playerSavedata, playerRemovedata } from '../core/storage.js';
import * as authApi from '../api/auth.js';

var LOGIN_PROMPT = '登录Gameclub账号以同步我的歌单<span class="login-btn login-in" onclick="loginBox();">[点击登录]</span>';

// 登录状态栏 DOM
function userBox() {
	if (!state.userloginbox) state.userloginbox = document.getElementById('user-login');
	return state.userloginbox;
}

// 弹出登录框
export function loginBox() {
	// 验证码区域先渲染占位元素，等图片真正取回再换成 <img>，
	// 避免 <img src=""> 在加载完成前显示浏览器的破图/加载失败样式
	var tmpHtml = '<ul class="glist">' +
		'<li class="gu">' +
			'<input id="text_username" class="inputstyle" name="username" autocomplete="off" placeholder="请输入用户名或邮箱" autofocus>' +
		'</li>' +
		'<li class="gu">' +
			'<input id="text_password" class="inputstyle" maxlength="16" type="password" name="password1" autocorrect="off" placeholder="请输入你的密码">' +
		'</li>' +
		'<li class="gp">' +
			'<input id="text_captcha" class="inputstyle" maxlength="16" name="captcha" autocorrect="off" placeholder="请输入验证码" style="width: 173px;">' +
			'<span id="capt-box" class="img-captcha"><span class="capt-tip">加载中…</span></span>' +
		'</li>' +
		'</ul>' +
		'<input id="go" type="submit" value="登 录" class="search-submit" onclick="LoginAction() ">' +
		'<div class="regword">没有账号？<a href="/register.html">点击这里</a>注册！</div>';
	layer.open({
		type: 1,
		shade: 0.5,
		title: '登录',
		shadeClose: true,
		content: tmpHtml
	});
	reloadcapt();
}

// 刷新验证码
export function reloadcapt() {
	var box = document.getElementById('capt-box');
	if (!box) return Promise.resolve();
	// 加载期间只显示提示文字，不渲染 img
	box.innerHTML = '<span class="capt-tip">加载中…</span>';
	return authApi.fetchCaptchaImage()
		.then(function (url) {
			box = document.getElementById('capt-box');
			if (!box) {
				URL.revokeObjectURL(url);
				return;
			}
			// 释放上一次的 objectURL，避免内存泄漏
			if (box.dataset.objectUrl) {
				URL.revokeObjectURL(box.dataset.objectUrl);
			}
			box.dataset.objectUrl = url;
			var img = document.createElement('img');
			img.className = 'capt-img';
			img.title = '点击刷新验证码';
			img.onclick = reloadcapt;
			img.src = url;
			box.innerHTML = '';
			box.appendChild(img);
		})
		.catch(function (err) {
			console.warn('[captcha] load failed:', err);
			box = document.getElementById('capt-box');
			if (box) box.innerHTML = '<span class="capt-tip capt-tip-fail" onclick="reloadcapt()">加载失败，点击重试</span>';
		});
}

// 获取验证码 token（页面初始化时调用）
export function getcaptoken() {
	return authApi.getCaptchaToken()
		.then(function (jsonData) {
			if (jsonData && jsonData.code == 1) {
				playerSavedata('captoken', jsonData.token);
				return true;
			}
			return false;
		})
		.catch(function (err) {
			console.warn('[captcha] token failed:', err);
			return false;
		});
}

// 登录按钮点击事件
export function LoginAction() {
	var username = $('#text_username').val();
	var password = $('#text_password').val();
	var captcha = $('#text_captcha').val();
	if (username.length < 5) {
		alert('用户名小于5位！');
		return false;
	} else if (password.length < 6) {
		alert('密码小于6位！');
		return false;
	} else if (captcha == '') {
		alert('请输入验证码！');
		return false;
	}
	LoginAjax(username, password, captcha);
	return true;
}

// 登录信息提交
function LoginAjax(n, p, c) {
	isloading();
	return authApi.login(n, p, c)
		.then(function (jsonData) {
			if (jsonData && jsonData.code == 1) {
				layer.msg(jsonData.status);
				playerSavedata('logintoken', jsonData.token);
				Getloginstatus();
				return true;
			}
			layer.msg((jsonData && jsonData.status) || '登录失败');
			// 验证码已失效，刷新一张新的
			reloadcapt();
			return false;
		})
		.catch(function (err) {
			console.error('[auth] login error:', err);
			layer.msg('登录失败，请稍后重试');
			return false;
		})
		.then(function (result) {
			closeload();
			if (result) layer.closeAll('page');
			return result;
		});
}

// 获取登录状态及用户名
export function Getloginstatus() {
	var box = userBox();
	return authApi.fetchLoginStatus()
		.then(function (jsonData) {
			if (!box) return;
			if (jsonData && jsonData.code == 1) {
				box.innerHTML = '你好！&nbsp;' + escapeHtml(jsonData.username) +
					'&nbsp;<span class="login-btn login-out" onclick="loginout();">[点击退出]</span>';
			} else {
				box.innerHTML = LOGIN_PROMPT;
			}
		})
		.catch(function (err) {
			console.warn('[auth] status error:', err);
			if (box) box.innerHTML = LOGIN_PROMPT;
		});
}

// 退出登录
export function loginout() {
	playerRemovedata('logintoken');
	layer.msg('退出成功！');
	var box = userBox();
	if (box) box.innerHTML = LOGIN_PROMPT;
	// 退出后原验证码 token 已被消费，重新申请一个
	getcaptoken();
}

export function init() {
	userBox();
	// 切到播放列表页时刷新登录状态（原 tab 点击里直接调用 Getloginstatus）
	on(EVENTS.SHOW_SHEET, Getloginstatus);
}
