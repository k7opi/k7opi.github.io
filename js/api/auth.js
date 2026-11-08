// 账号相关接口：登录、注册、验证码、我的歌单
// 后端 /users/* 已统一为 { code, message, data } 信封，这里的函数一律返回 data
import { BASEURL, REQUEST_TIMEOUT } from '../core/config.js';
import { post } from './request.js';
import { playerReaddata, playerSavedata } from '../core/storage.js';

// 新增歌曲到我的歌单：data = { musicrid, source }
export function addToList(song) {
	return post('/users/addlist', {
		musicrid: song.musicrid,
		name: song.name,
		artist: song.artist,
		album: song.album,
		pic: song.pic,
		source: song.source,
		mvid: song.mvid,
		token: playerReaddata('logintoken')
	});
}

// 从我的歌单删除：data = { musicrid }
export function removeFromList(song) {
	return post('/users/delete', {
		musicrid: song.musicrid,
		source: song.source,
		token: playerReaddata('logintoken')
	});
}

// 获取我的歌单：data = { page, pageSize, total, hasMore, list }
export function fetchMyList(page, pageSize) {
	return post('/users/mylist', {
		token: playerReaddata('logintoken'),
		page: page || 1,
		pageSize: pageSize || 50
	});
}

// 登录：data = { token, username }
export function login(username, password, captcha) {
	return post('/users/loginpost', {
		username: username,
		password: password,
		captcha: captcha,
		token: playerReaddata('captoken')
	});
}

// 校验登录态：data = { username }；凭证失效会返回 4010/4011/4012
export function fetchLoginStatus() {
	return post('/users/loginstatus', { token: playerReaddata('logintoken') });
}

// 退出登录：服务端 tokenVersion +1，旧凭证立即失效
export function logout() {
	return post('/users/logout', { token: playerReaddata('logintoken') });
}

// 申请验证码 token：data = { token, reused }
export function getCaptchaToken() {
	return post('/users/captoken', {
		token: playerReaddata('captoken') || '0000000000000000'
	});
}

// 发送注册邮箱验证码：data = { mail, expireAt }
export function sendMailCode(mail) {
	return post('/users/getMailCode', { mail: mail });
}

// 提交注册：data = { username }
export function register(data) {
	return post('/users/registerpost', {
		username: data.username,
		password: data.password,
		mail: data.mail,
		code: data.code
	});
}

/**
 * 拉取验证码图片
 * 这个接口返回 SVG 图片本身（不是 JSON 信封），所以不走 request()，用 XHR 取 blob。
 * token 可能已在登录时被服务端消费（退出后再次登录就是这种情况），
 * 若服务端补发了新 token（X-Captcha-Token 响应头）则同步到本地。
 * 返回 blob URL，调用方负责 revokeObjectURL。
 */
export function fetchCaptchaImage() {
	var token = playerReaddata('captoken');
	var timer = (new Date()).getTime();
	return new Promise(function (resolve, reject) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', BASEURL + '/users/captcha?token=' + encodeURIComponent(token) + '&timer=' + timer, true);
		xhr.responseType = 'blob';
		xhr.timeout = REQUEST_TIMEOUT;
		xhr.onload = function () {
			var newToken = xhr.getResponseHeader('X-Captcha-Token');
			if (newToken && newToken !== token) {
				playerSavedata('captoken', newToken);
			}
			if (xhr.status !== 200 || !xhr.response) {
				reject({ status: xhr.status });
				return;
			}
			var type = xhr.response.type || '';
			if (type.indexOf('svg') < 0 && type.indexOf('image') < 0) {
				reject({ status: xhr.status, reason: 'not-image' });
				return;
			}
			resolve(URL.createObjectURL(xhr.response));
		};
		xhr.onerror = function () {
			reject({ status: 0 });
		};
		xhr.ontimeout = function () {
			reject({ status: 0, timeout: true });
		};
		xhr.send();
	});
}
