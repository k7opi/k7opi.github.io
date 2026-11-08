// 账号相关接口：登录、注册、验证码、我的歌单
import { BASEURL, REQUEST_TIMEOUT } from '../core/config.js';
import { post } from './request.js';
import { playerReaddata, playerSavedata } from '../core/storage.js';

// 新增歌曲到我的歌单：{ code: 1, status }
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

// 从我的歌单删除：{ code: 1, status }
export function removeFromList(song) {
	return post('/users/delete', {
		musicrid: song.musicrid,
		source: song.source,
		token: playerReaddata('logintoken')
	});
}

// 获取我的歌单：{ code: 1, status, songinfo }
export function fetchMyList() {
	return post('/users/mylist', { token: playerReaddata('logintoken') });
}

// 登录：{ code: 1, status, token }
export function login(username, password, captcha) {
	return post('/users/loginpost', {
		username: username,
		password: password,
		captcha: captcha,
		token: playerReaddata('captoken')
	});
}

// 获取登录状态：{ code: 1, username }
export function fetchLoginStatus() {
	return post('/users/loginstatus', { token: playerReaddata('logintoken') });
}

// 申请验证码 token：{ code: 1, token }
export function getCaptchaToken() {
	return post('/users/captoken', {
		token: playerReaddata('captoken') || '0000000000000000'
	});
}

// 发送注册邮箱验证码
export function sendMailCode(mail) {
	return post('/users/getMailCode', { mail: mail });
}

// 提交注册
export function register(data) {
	return post('/users/registerpost', {
		username: data.username,
		password1: data.password,
		mail: data.mail,
		code: data.code
	});
}

/**
 * 拉取验证码图片
 * token 可能已在登录时被服务端消费（退出后再次登录就是这种情况），
 * 因此用 XHR 请求，若服务端补发了新 token（X-Captcha-Token 响应头）则同步到本地。
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
