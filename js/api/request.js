// $.ajax 的 Promise 薄封装
// 注意：jQuery 仍以全局 <script> 引入，这里直接使用全局 $，不打包、不引入依赖
import { BASEURL, REQUEST_TIMEOUT } from '../core/config.js';

/**
 * 基础请求
 * @param {Object} opts
 *   - url        {String} 相对路径（不含 BASEURL），如 '/users/mylist'
 *   - type       {String} 'GET' | 'POST'
 *   - data       {Object|String} 请求参数
 *   - timeout    {Number} 超时毫秒
 *   - crossDomain{Boolean} 是否跨域（需配合 withCredentials）
 *   - dataType   {String} 默认 'json'；MV 接口需要 'html'
 * @returns {Promise<any>}
 */
export function request(opts) {
	var options = {
		type: opts.type || 'GET',
		url: BASEURL + opts.url,
		data: opts.data,
		timeout: opts.timeout || REQUEST_TIMEOUT,
		crossDomain: !!opts.crossDomain,
		dataType: opts.dataType || 'json'
	};
	if (opts.crossDomain) {
		options.xhrFields = { withCredentials: true };
	}
	return new Promise(function (resolve, reject) {
		$.ajax(options)
			.done(function (data) {
				resolve(data);
			})
			.fail(function (xhr, textStatus, errorThrown) {
				reject({
					status: xhr && xhr.status,
					textStatus: textStatus,
					error: errorThrown
				});
			});
	});
}

// GET 请求
export function get(url, data, opts) {
	return request(Object.assign({ url: url, type: 'GET', data: data }, opts));
}

// POST 请求（带 cookie，用于登录相关接口）
export function post(url, data, opts) {
	return request(Object.assign({ url: url, type: 'POST', data: data, crossDomain: true }, opts));
}
