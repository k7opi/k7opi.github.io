// 通用工具函数

// 判断是否为移动设备
export const isMobile = {
	Android: function () {
		return navigator.userAgent.match(/Android/i) ? true : false;
	},
	BlackBerry: function () {
		return navigator.userAgent.match(/BlackBerry/i) ? true : false;
	},
	iOS: function () {
		return navigator.userAgent.match(/iPhone|iPad|iPod/i) ? true : false;
	},
	Windows: function () {
		return navigator.userAgent.match(/IEMobile/i) ? true : false;
	},
	any: function () {
		return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Windows());
	}
};

// 转义 HTML 特殊字符，防止歌曲名/歌手等外部数据注入 DOM
export function escapeHtml(str) {
	if (str === null || str === undefined) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// 将时间格式化为 00:00 / 00:00:00
export function formatTime(time) {
	var hour, minute, second;
	hour = String(parseInt(time / 3600, 10));
	if (hour.length == 1) hour = '0' + hour;

	minute = String(parseInt((time % 3600) / 60, 10));
	if (minute.length == 1) minute = '0' + minute;

	second = String(parseInt(time % 60, 10));
	if (second.length == 1) second = '0' + second;

	if (hour > 0) {
		return hour + ':' + minute + ':' + second;
	}
	return minute + ':' + second;
}

// 邮箱格式校验（注册页使用，规则与原有实现保持一致）
export function testEmail(mail) {
	var reg = /^([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,3}$/;
	return reg.test(mail);
}
