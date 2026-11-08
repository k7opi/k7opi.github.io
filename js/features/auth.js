// 登录 / 退出 / 验证码 / 登录状态
/* global $, layer, XMLHttpRequest, URL */
import { state } from '../core/state.js';
import { isloading, closeload } from '../core/loading.js';
import { escapeHtml } from '../core/utils.js';
import { on, EVENTS } from '../core/events.js';
import { playerReaddata, playerSavedata, playerRemovedata } from '../core/storage.js';
import * as authApi from '../api/auth.js';
import { CODE } from '../api/request.js';

var LOGIN_PROMPT = '登录Gameclub账号以同步我的歌单<span class="login-btn login-in" onclick="loginBox();">[点击登录]</span>';

// 凭证失效时多个并发请求会同时触发事件，这里节流，避免连弹多个登录框
var lastAuthPromptAt = 0;
var AUTH_PROMPT_GAP = 3000;

// 登录状态栏 DOM
function userBox() {
	if (!state.userloginbox) state.userloginbox = document.getElementById('user-login');
	return state.userloginbox;
}

// 渲染未登录态
function showLoginPrompt() {
	var box = userBox();
	if (box) box.innerHTML = LOGIN_PROMPT;
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
			'<input id="text_password" class="inputstyle" maxlength="64" type="password" name="password" autocorrect="off" placeholder="请输入你的密码">' +
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
// 新契约下「沿用旧 token」也是 code:0 + data.token，不再需要特判
export function getcaptoken() {
	return authApi.getCaptchaToken()
		.then(function (data) {
			if (data && data.token) playerSavedata('captoken', data.token);
			return true;
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
		.then(function (data) {
			layer.msg('登录成功');
			playerSavedata('logintoken', data.token);
			Getloginstatus();
			return true;
		})
		.catch(function (err) {
			if (err && err.kind === 'business') {
				// 4001 是字段级校验（账号密码错/验证码错），4011/4012 由 request.js 统一处理
				if (err.code === CODE.RATE_LIMIT) {
					layer.msg(err.message || '尝试过于频繁，请稍后再试');
					reloadcapt();
					return false;
				}
				if (err.field === 'captcha' || err.field === 'token') {
					$('#text_captcha').val('');
				}
				layer.msg(err.message || '登录失败');
				// 验证码一次性使用，失败后必须刷新
				reloadcapt();
				return false;
			}
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
		.then(function (data) {
			if (!box) return;
			box.innerHTML = '你好！&nbsp;' + escapeHtml(data && data.username) +
				'&nbsp;<span class="login-btn login-out" onclick="loginout();">[点击退出]</span>';
		})
		.catch(function (err) {
			// 4010 未登录 / 4011 过期 / 4012 无效 都按未登录处理
			if (!(err && (err.code === CODE.UNAUTHORIZED || err.code === CODE.TOKEN_EXPIRED || err.code === CODE.TOKEN_INVALID))) {
				console.warn('[auth] status error:', err);
			}
			showLoginPrompt();
		});
}

// 退出登录：先让服务端作废旧凭证，再清本地（接口失败也清，避免卡在已登录态）
export function loginout() {
	return authApi.logout()
		.catch(function (err) {
			console.warn('[auth] logout failed:', err);
		})
		.then(function () {
			playerRemovedata('logintoken');
			layer.msg('退出成功！');
			showLoginPrompt();
			// 退出后原验证码 token 已被消费，重新申请一个
			getcaptoken();
		});
}

// 凭证过期/无效：清 UI 后弹登录框（request.js 只负责清本地凭证并广播）
function onAuthExpired() {
	var now = Date.now();
	showLoginPrompt();
	if (now - lastAuthPromptAt < AUTH_PROMPT_GAP) return;
	lastAuthPromptAt = now;
	layer.msg('登录已过期，请重新登录');
	loginBox();
}

export function init() {
	userBox();
	// 切到播放列表页时刷新登录状态（原 tab 点击里直接调用 Getloginstatus）
	on(EVENTS.SHOW_SHEET, Getloginstatus);
	on(EVENTS.AUTH_EXPIRED, onAuthExpired);
}
