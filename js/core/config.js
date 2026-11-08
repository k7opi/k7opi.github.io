// 全局配置常量
// BASEURL 为空串，等价于原来的 "."：/ 与 /index.html 两种访问路径下都能正确请求接口
export const BASEURL = 'https://musicplayer-261259-9-1300751866.sh.run.tcloudbase.com';

// 播放器默认参数
export const mkPlayer = {
	volume: 0.6,     // 默认音量值(0~1之间)
	coverbg: true,   // 电脑端封面背景模糊效果
	mcoverbg: false  // 手机端封面背景模糊效果
};

// 接口请求默认超时时间（毫秒）
export const REQUEST_TIMEOUT = 15000;

// 本地存储键前缀，防止与其它站点/应用串用
export const STORAGE_PREFIX = 'mkPlayer2_';
