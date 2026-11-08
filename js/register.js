// 注册页入口（ES Module）
// 复用主站的请求封装、加载动画、弹窗与工具函数
/* global $, layer */
import { isloading, closeload } from './core/loading.js';
import { testEmail } from './core/utils.js';
import { sendMailCode, register } from './api/auth.js';
import { CODE } from './api/request.js';
import { msg, alert } from './ui/dialog.js';

var count = 59;
var rem = { codestatus: true };

var el = {
	u: document.getElementById('u'),
	p1: document.getElementById('p1'),
	p2: document.getElementById('p2'),
	p3: document.getElementById('p3'),
	p4: document.getElementById('p4'),
	error: document.getElementById('error_tips'),
	errorMessage: document.getElementById('error_message'),
	verbtn: document.getElementById('verbtn'),
	go: document.getElementById('go')
};

// 弹出错误提示
function errortip(text) {
	el.errorMessage.innerHTML = text;
	el.error.style.display = 'block';
	setTimeout(back, 2500);
	return false;
}

// 后端 4001 会带 data.field，据此定位到具体输入框
var FIELD_EL = { username: 'u', password: 'p1', mail: 'p3', code: 'p4' };

function focusField(field) {
	var key = FIELD_EL[field];
	if (!key || !el[key]) return;
	try {
		el[key].focus();
	} catch (e) {
		// 忽略 focus 异常
	}
}

function back() {
	el.error.style.display = 'none';
}

// 表单校验
function checkForm() {
	if (el.u.value == '') {
		return errortip('你还没有输入账号！');
	}
	if (el.p1.value == '') {
		return errortip('你还没有输入密码！');
	}
	if (el.p2.value == '') {
		return errortip('请再次确认密码！');
	}
	if (!testEmail(el.p3.value)) {
		return errortip('邮箱格式不正确！');
	}
	if (el.p4.value == '') {
		return errortip('请输入验证码！');
	}
	if (el.u.value.length < 5) {
		el.u.value = '';
		return errortip('账号不能小于五位！');
	}
	if (el.p1.value.length < 6) {
		el.p1.value = '';
		el.p2.value = '';
		return errortip('密码不能小于6位！');
	}
	if (el.p1.value != el.p2.value) {
		el.p1.value = '';
		el.p2.value = '';
		return errortip('两次输入密码不一致！');
	}
	posttext();
	return true;
}

// 发送验证码
function getmailcode() {
	if (!rem.codestatus) return;
	if (!testEmail(el.p3.value)) {
		return errortip('邮箱格式不正确！');
	}
	isloading();
	sendMailCode(el.p3.value)
		.then(function () {
			msg('验证码已发送');
			count = 60;
			loop();
		})
		.catch(function (err) {
			if (err && err.kind === 'business') {
				msg(err.message || '发送失败');
				if (err.field === 'mail') focusField('mail');
				return;
			}
			console.error('[register] mailcode error:', err);
			msg('发送失败，请稍后重试');
		})
		.then(function () {
			closeload();
			rem.codestatus = false;
		});
}

// 提交注册
function posttext() {
	isloading();
	register({
		username: el.u.value,
		password: el.p1.value,
		mail: el.p3.value,
		code: el.p4.value
	})
		.then(function () {
			alert('注册成功！', function () {
				window.location.replace('/');
			});
		})
		.catch(function (err) {
			if (err && err.kind === 'business') {
				errortip(err.message || '注册失败');
				// 4090 是用户名/邮箱已占用，只清这两项，保留邮箱验证码避免重发
				if (err.code === CODE.CONFLICT) {
					el.u.value = '';
					el.u.focus();
					return;
				}
				focusField(err.field);
				// 邮箱验证码一次性使用，出错后需要重新获取
				if (err.field === 'code') {
					el.p4.value = '';
				}
				return;
			}
			console.error('[register] submit error:', err);
			errortip('注册失败，请稍后重试');
		})
		.then(function () {
			closeload();
		});
}

// 验证码倒计时
function loop() {
	if (count === 0) {
		$('#verbtn').html('发送验证码');
		rem.codestatus = true;
		return;
	}
	count--;
	$('#verbtn').html('重新发送(' + count + ')');
	setTimeout(loop, 1000);
}

// 页面按钮绑定（替代内联 onclick）
el.go.addEventListener('click', checkForm);
el.verbtn.addEventListener('click', getmailcode);
