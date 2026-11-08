// $.ajax 的 Promise 封装：统一信封解包 + 错误分类 + GET 退避重试 + 请求取消
// jQuery 仍以全局 <script> 引入，这里直接使用全局 $，不打包、不引入依赖
import { BASEURL, REQUEST_TIMEOUT } from '../core/config.js';
import { playerRemovedata } from '../core/storage.js';
import { emit, EVENTS } from '../core/events.js';

// 与后端 utils/response.js 的错误码保持一致（两端各一份，改动需同步）
export const CODE = {
	OK: 0,
	PARAM: 4000,
	FIELD_INVALID: 4001,
	NOT_FOUND: 4004,
	UNAUTHORIZED: 4010,
	TOKEN_EXPIRED: 4011,
	TOKEN_INVALID: 4012,
	RATE_LIMIT: 4029,
	FORBIDDEN: 4030,
	CONFLICT: 4090,
	UPSTREAM: 5000,
	BAD_BODY: 5020
};

// 需要「清本地凭证 + 弹登录框」的鉴权失败码：没带凭证不算
var AUTH_CODES = [CODE.TOKEN_EXPIRED, CODE.TOKEN_INVALID];

// 可自动重试的错误码：上游频控。参数错误/无数据/无版权重试没有意义
var RETRYABLE_CODES = [CODE.RATE_LIMIT, CODE.UPSTREAM];
// 幂等 GET 的最多尝试次数（含首次）
var MAX_ATTEMPTS = 3;
// 退避基数，第 n 次重试间隔 = 700 * n 毫秒
var RETRY_DELAY = 700;

/**
 * 统一错误对象
 * kind 说明：
 *   business - HTTP 200 但 code !== 0，code/message 来自后端
 *   network  - 请求未到达/被中断（status 0）
 *   timeout  - 超时
 *   http     - 收到了非 200 状态码
 *   abort    - 被调用方主动取消（不应提示用户）
 */
function makeError(kind, detail) {
	var err = new Error(detail && (detail.message || detail.error) || kind);
	err.kind = kind;
	if (detail) {
		if (detail.code !== undefined) err.code = detail.code;
		if (detail.message !== undefined) err.message = detail.message;
		if (detail.status !== undefined) err.status = detail.status;
		if (detail.field !== undefined) err.field = detail.field;
	}
	return err;
}

/**
 * 鉴权失效统一处理：清掉本地凭证并广播事件，由 features/auth.js 负责弹登录框。
 * 这里不直接 import features 模块，避免循环依赖。
 */
function handleAuthFailure(code) {
	if (AUTH_CODES.indexOf(code) === -1) return;
	playerRemovedata('logintoken');
	emit(EVENTS.AUTH_EXPIRED, { code: code });
}

/**
 * 解包信封：成功返回 data，失败抛结构化错误
 *
 * 全站只有一种语义（音乐接口与账号接口一致）：
 *   成功 { code: 0, message, data }
 *   失败 { code: 非0, message, data: null | { field, reason } }
 */
function unwrap(body) {
	if (!body || typeof body !== 'object') {
		throw makeError('business', { code: CODE.BAD_BODY, message: '接口返回格式异常' });
	}

	if (body.code === CODE.OK) return body.data === undefined ? null : body.data;

	// 字段级校验失败会带 data.field，透传出去供表单定位输入框
	var field = body.data && body.data.field;
	handleAuthFailure(body.code);
	throw makeError('business', {
		code: body.code,
		message: body.message || '请求失败',
		field: field
	});
}

/**
 * 基础请求
 * @param {Object} opts
 *   - url        {String} 相对路径（不含 BASEURL），如 '/api/music/search'
 *   - type       {String} 'GET' | 'POST'
 *   - data       {Object|String} 请求参数
 *   - timeout    {Number} 超时毫秒
 *   - crossDomain{Boolean} 是否跨域（需配合 withCredentials）
 *   - dataType   {String} 默认 'json'
 *   - retry      {Boolean} 是否允许退避重试，默认 GET 为 true、POST 为 false
 *   - signal     {Object} { aborted: Boolean } 由调用方持有，置 aborted 后
 *                        未完成的请求会被 abort，且 reject 一个 kind='abort' 的错误
 * @returns {Promise<any>} 已解包的 data
 */
export function request(opts) {
	var type = (opts.type || 'GET').toUpperCase();
	var allowRetry = opts.retry !== undefined ? !!opts.retry : type === 'GET';

	return new Promise(function (resolve, reject) {
		var attempt = 0;

		function run() {
			attempt++;
			var xhr = $.ajax({
				type: type,
				url: BASEURL + opts.url,
				data: opts.data,
				timeout: opts.timeout || REQUEST_TIMEOUT,
				crossDomain: !!opts.crossDomain,
				dataType: opts.dataType || 'json',
				xhrFields: opts.crossDomain ? { withCredentials: true } : undefined,
				// 交给 jQuery 的 xhr 实例，供取消时 abort
				beforeSend: function (x) {
					if (opts.signal) opts.signal.xhr = x;
				}
			});

			xhr
				.done(function (body, textStatus, jqXHR) {
					// 注意：参数里不能再叫 jqXHR/xhr，否则会遮蔽外层变量
					var envelope = body;
					// dataType 被覆盖成非 json（如取文本）时 body 是原始字符串，手动解析一次
					if (typeof envelope === 'string') {
						if (opts.raw) {
							resolve(envelope);
							return;
						}
						try {
							envelope = JSON.parse(envelope);
						} catch (parseErr) {
							reject(makeError('business', {
								code: CODE.BAD_BODY,
								message: '接口返回格式异常'
							}));
							return;
						}
					}
					var data;
					try {
						data = unwrap(envelope);
					} catch (e) {
						// 业务错误：频控/上游异常可重试，其它直接失败
						if (allowRetry && attempt < MAX_ATTEMPTS &&
							RETRYABLE_CODES.indexOf(e.code) !== -1) {
							setTimeout(run, RETRY_DELAY * attempt);
							return;
						}
						reject(e);
						return;
					}
					resolve(data);
				})
				.fail(function (jqXHR, textStatus, errorThrown) {
					// 主动取消：静默失败，由调用方忽略
					if (textStatus === 'abort') {
						reject(makeError('abort', { status: 0 }));
						return;
					}
					if (textStatus === 'timeout') {
						if (allowRetry && attempt < MAX_ATTEMPTS) {
							setTimeout(run, RETRY_DELAY * attempt);
							return;
						}
						reject(makeError('timeout', { status: 0 }));
						return;
					}
					// 网络层失败（status 0）可重试；4xx/5xx 不重试
					var status = (jqXHR && jqXHR.status) || 0;
					if (allowRetry && status === 0 && attempt < MAX_ATTEMPTS) {
						setTimeout(run, RETRY_DELAY * attempt);
						return;
					}
					if (status === 0) {
						reject(makeError('network', { status: 0 }));
						return;
					}
					// 非 200 时后端仍返回信封，尽量取出其中的 code/message
					var body = jqXHR.responseJSON;
					if (body && body.code !== undefined) {
						reject(makeError('http', {
							status: status,
							code: body.code,
							message: body.message || body.status
						}));
						return;
					}
					reject(makeError('http', { status: status, message: 'HTTP ' + status }));
				});
		}

		// 请求发起前若已被取消（如快速重复触发），直接结束
		if (opts.signal && opts.signal.aborted) {
			reject(makeError('abort', { status: 0 }));
			return;
		}
		run();
	});
}

/**
 * 创建取消令牌
 * 用法：state.searchSignal = createSignal(); 传入请求；下次请求前 cancel 旧的
 */
export function createSignal() {
	var signal = {
		aborted: false,
		xhr: null,
		cancel: function () {
			signal.aborted = true;
			if (signal.xhr && signal.xhr.abort) {
				try {
					signal.xhr.abort();
				} catch (e) {
					// 忽略 abort 异常
				}
			}
		}
	};
	return signal;
}

// 判断错误是否来自主动取消，调用方据此静默忽略
export function isAbort(err) {
	return !!err && err.kind === 'abort';
}

// GET 请求
export function get(url, data, opts) {
	return request(Object.assign({ url: url, type: 'GET', data: data }, opts));
}

// POST 请求（带 cookie，用于登录相关接口）
export function post(url, data, opts) {
	return request(Object.assign({ url: url, type: 'POST', data: data, crossDomain: true }, opts));
}

// 原生 XHR 场景（如取验证码 blob）不经过这里，见 api/auth.js
