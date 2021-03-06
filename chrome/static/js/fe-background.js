/**
 * FE-Helper后台运行程序
 * @author zhaoxianlie@baidu.com
 */
var BgPageInstance = (function(){

	//各种元素的就绪情况	
	var _readyState = {
		css : false,
		js : false,
		html : true,
		allDone : false
	};
	
	//侦测的interval
	var _detectInterval = null;
	
	//侦测就绪情况
	var _detectReadyState = function(){
		_detectInterval = window.setInterval(function(){
			if(_readyState.css && _readyState.js && _readyState.html) {
				_readyState.allDone = true;
				window.clearInterval(_detectInterval);
			}
		},100);
	};
	
	
	/**
	 * 执行前端FCPHelper检测
	 */
	var _doFcpDetect = function(tab){
		//所有元素都准备就绪
		if(_readyState.allDone) {
            chrome.tabs.sendMessage(tab.id, {
                type: MSG_TYPE.BROWSER_CLICKED,
				event : MSG_TYPE.FCP_HELPER_DETECT
            });
		} else {
			//正在准备数据，请稍等...
			//显示桌面提醒
			baidu.feNotification.notifyText({
				message : "正在准备数据，请稍等..."
			});	
		}
	};
	
	/**
	 * 执行栅格检测
	 */
	var _doGridDetect = function(tab){
        chrome.tabs.sendMessage(tab.id, {
            type: MSG_TYPE.BROWSER_CLICKED,
			event : MSG_TYPE.GRID_DETECT
        });
	};

    var notId=0;
	/**
	 * 提醒层 缓存
	 * @type {Array}
	 */
	var _notificationCache = [];
	
	/**
	 * 查看页面wpo信息
	 */
	var _showPageWpoInfo = function(wpoInfo){
		chrome.tabs.getSelected(null,function(tab){
            try{
                _notificationCache[tab.id].cancel();
            }catch (e){}
            if(!wpoInfo) {
				baidu.feNotification.notifyText({
					message : "对不起，检测失败"
				});	
			}else{
                if(window.webkitNotifications && webkitNotifications.createHTMLNotification) {
                    baidu.feNotification.notifyHtml("template/fehelper_wpo.html?" + JSON.stringify(wpoInfo));
                } else {
                    chrome.tabs.create({
                        url : "template/fehelper_wpo.html?" + JSON.stringify(wpoInfo),
                        selected : true
                    });
                }
			}
		});
	};

	/**
	 * 获取页面wpo信息
	 * @return {[type]}
	 */
	var _getPageWpoInfo = function(){
		chrome.tabs.getSelected(null,function(tab){	
			//显示桌面提醒
			_notificationCache[tab.id] = baidu.feNotification.notifyText({
					message : "正在统计，请稍后...",
					autoClose : false
				});	
	        chrome.tabs.sendMessage(tab.id,{
				type : MSG_TYPE.GET_PAGE_WPO_INFO
			});
		});
	};

    /**
     * 执行JS Tracker
     * @private
     */
    var _doJsTracker = function(){
        chrome.tabs.getSelected(null,function(tab){
            chrome.tabs.executeScript(tab.id,{
                code : "void function(t,r,a,c,k){t.tracker_type='bm';t.tracker_uid='fehelper';"
                    + "(k=t.TrackerGlobalEvent)?k.f(r):[(k=t[a]('script')).charset='utf-8',"
                    + "k.src='http://www.ucren.com/'+c+'/'+c+'.js?'+Math.random(),"
                    + "t.documentElement.appendChild(k)]}(document,'TrackerJSLoad','createElement','tracker') ",
                allFrames : false,
                runAt : 'document_end'
            });
        });
    };

    /**
     * 代码压缩工具
     * @private
     */
    var _goCompressTool = function(){
        var url = "http://www.baidufe.com/fehelper/codecompress.html";
        chrome.tabs.getAllInWindow(null,function(tabs){
            var isOpened = false;
            var tabId ;
            var reg = new RegExp("fehelper.*codecompress.html$","i");
            for(var i = 0,len = tabs.length;i < len;i++){
                if(reg.test(tabs[i].url)) {
                    isOpened = true;
                    tabId = tabs[i].id;
                    break;
                }
            }
            if(!isOpened) {
                chrome.tabs.create({
                    url : url,
                    selected : true
                });
            } else {
                chrome.tabs.update(tabId,{selected : true});
            }
        });
    };

    /**
     * 打开对应文件，运行该Helper
     * @param tab
     * @param file
     * @private
     */
    var _openFileAndRun = function(tab,file){
        chrome.tabs.getAllInWindow(null,function(tabs){
            var isOpened = false;
            var tabId ;
            var reg = new RegExp("^chrome.*" + file + ".html$","i");
            for(var i = 0,len = tabs.length;i < len;i++){
                if(reg.test(tabs[i].url)) {
                    isOpened = true;
                    tabId = tabs[i].id;
                    break;
                }
            }
            if(!isOpened) {
                chrome.tabs.create({
                    url : 'template/fehelper_' + file + '.html',
                    selected : true
                });
            } else {
                chrome.tabs.update(tabId,{selected : true});
            }
        });
    };

    /**
     * 根据给定参数，运行对应的Helper
     */
    var _runHelper = function(config){
        chrome.tabs.getSelected(null,function(tab){
            // 如果是采用独立文件方式访问，直接打开该页面即可
            if(config.useFile == '1') {
                _openFileAndRun(tab,config.msgType);
            }else{
                switch(config.msgType) {
                    //fcphelper检测
                    case MSG_TYPE.FCP_HELPER_DETECT:
                        _doFcpDetect(tab);
                        break;
                    //栅格检测
                    case MSG_TYPE.GRID_DETECT:
                        _doGridDetect(tab);
                        break;
                    //查看网页加载时间
                    case MSG_TYPE.SHOW_PAGE_LOAD_TIME:
                        _getPageWpoInfo();
                        break;
                    //js tracker
                    case MSG_TYPE.JS_TRACKER:
                        _doJsTracker();
                        break;
                    //代码压缩
                    case MSG_TYPE.CODE_COMPRESS:
                        _goCompressTool();
                        break;
                }
            }
        });
    };
	
	/**
	 * 创建扩展专属的右键菜单
	 */
	var _createContextMenu = function(){
		_removeContextMenu();
		baidu.contextMenuId = chrome.contextMenus.create({
			title : "FeHelper-FE助手"
		});
		chrome.contextMenus.create({
			title : "编码检测",
			parentId : baidu.contextMenuId,
			onclick : function(info,tab) {
				//编码检测
				_doFcpDetect(tab);
			}
		});
		chrome.contextMenus.create({
			title : "栅格检测",
			parentId : baidu.contextMenuId,
			onclick : function(info,tab) {
				//执行栅格检测
				_doGridDetect(tab);
			}
		});
		chrome.contextMenus.create({
			title : "网页加载耗时",
			parentId : baidu.contextMenuId,
			onclick : function(info,tab) {
				//网页加载耗时
				_getPageWpoInfo();
			}
		});
	};
	
	/**
	 * 移除扩展专属的右键菜单
	 */
	var _removeContextMenu = function(){
		if(!baidu.contextMenuId) return;
		chrome.contextMenus.remove(baidu.contextMenuId);
		baidu.contextMenuId = null;
	};
	
	/**
	 * 创建或移除扩展专属的右键菜单
	 */
	var _createOrRemoveContextMenu = function(){

		//管理右键菜单
		if(baidu.feOption.getOptionItem('opt_item_contextMenus') === 'true') {
			_createContextMenu();
		} else {
			_removeContextMenu();
		}
	};
	
	/**
	 * 接收来自content_scripts发来的消息
	 */
	var _addExtensionListener = function(){
		chrome.extension.onMessage.addListener(function(request,sender,callback){
			//处理CSS的请求
			if(request.type == MSG_TYPE.GET_CSS) {
				//直接AJAX获取CSS文件内容
				baidu.network.readFileContent(request.link,callback);
			}
			//处理JS的请求
			else if(request.type == MSG_TYPE.GET_JS) {
				//直接AJAX获取JS文件内容
				baidu.network.readFileContent(request.link,callback);
			}
			//处理HTML的请求
			else if(request.type == MSG_TYPE.GET_HTML) {
				//直接AJAX获取JS文件内容
				baidu.network.readFileContent(request.link,callback);
			}
			//处理cookie
			else if(request.type == MSG_TYPE.GET_COOKIE) {
				baidu.network.getCookies(request,callback);
			}
			//移除cookie
			else if(request.type == MSG_TYPE.REMOVE_COOKIE) {
				baidu.network.removeCookie(request,callback);
			}
			//设置cookie
			else if(request.type == MSG_TYPE.SET_COOKIE) {
				baidu.network.setCookie(request,callback);
			}
			//CSS准备就绪
			else if(request.type == MSG_TYPE.CSS_READY) {
				_readyState.css = true;
			}
			//JS准备就绪
			else if(request.type == MSG_TYPE.JS_READY) {
				_readyState.js = true;
			}
			//HTML准备就绪
			else if(request.type == MSG_TYPE.HTML_READY) {
				_readyState.html = true;
			}
			//提取配置项
			else if(request.type == MSG_TYPE.GET_OPTIONS){
				baidu.feOption.doGetOptions(request.items,callback);
			}
			//保存配置项
			else if(request.type == MSG_TYPE.SET_OPTIONS){
				baidu.feOption.doSetOptions(request.items,callback);
				//管理右键菜单
				_createOrRemoveContextMenu();
			}
			//保存当前网页加载时间
			else if(request.type == MSG_TYPE.CALC_PAGE_LOAD_TIME){
				_showPageWpoInfo(request.wpo);
			}

            return true;
		});
	};
	
	/**
	 * 初始化
	 */
	var _init = function(){
		_addExtensionListener();
		_detectReadyState();
		_createOrRemoveContextMenu();
	};
	
	return {
		init		: _init,
        runHelper	: _runHelper
	};
})();	

//初始化
BgPageInstance.init();
