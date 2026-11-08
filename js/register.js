// 注册页入口（ES Module）
// 复用主站的请求封装、加载动画、弹窗与工具函数
/* global $, layer */
import { isloading, closeload } from './core/loading.js';
import { testEmail } from './core/utils.js';
import { sendMailCode, register } from './api/auth.js';
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
		.then(function (jsonData) {
			if (jsonData && jsonData.code == 1) {
				msg(jsonData.status);
				count = 60;
				loop();
			} else {
				msg((jsonData && jsonData.status) || '发送失败');
			}
		})
		.catch(function (err) {
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
		.then(function (jsonData) {
			if (jsonData && jsonData.code == 1) {
				alert(jsonData.status, function () {
					window.location.replace('/');
				});
				return;
			}
			el.u.value = '';
			el.p1.value = '';
			el.p2.value = '';
			el.p3.value = '';
			el.p4.value = '';
			errortip((jsonData && jsonData.status) || '注册失败');
		})
		.catch(function (err) {
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
