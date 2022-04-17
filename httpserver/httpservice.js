//NOT SEND
/**
 * @Author          : lihugang
 * @Date            : 2022-02-09 09:27:06
 * @LastEditTime    : 2022-04-11 06:11:47
 * @LastEditors     : lihugang
 * @Description     : HttpService
 * @FilePath        : d:\PigOnlineJudge\server\httpservice.js
 * @Copyright (c) lihugang
 * @长风破浪会有时 直挂云帆济沧海
 * @There will be times when the wind and waves break, and the sails will be hung straight to the sea.
 * @ * * * 
 * @是非成败转头空 青山依旧在 几度夕阳红
 * @Whether it's right or wrong, success or failure, it's all empty now, and it's all gone with the passage of time. The green hills of the year still exist, and the sun still rises and sets.
 */
console.log("\n\n\n");
console.log(`==================================\nNODE JS START ${getTime()} `);

const http = require("http");
const fs = require("fs");
const exec = require('child_process').execFile;
const fork = require('child_process').fork;
const querystring = require('querystring');
const crypto = require("crypto");

var MIME_suffix_table = {
    ".txt": "text/plain;charset=utf-8",
    ".js": "application/javascript",
    ".jsx": "application/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".htm": "text/html",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/vnd.microsoft.icon",
    ".icox": "image/x-icon",
    ".bmp": "image/bmp",
    ".jfif": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".json": "application/json",
    ".xml": "application/xml",
    ".mp4": "video/mp4",
    ".ogg": "audio/ogg",
    ".mp3": "audio/mpeg",
    ".mpeg": "audio/mpeg",
    ".wav": "audio/wav",
    ".gif": "image/gif",
    ".c": "application/c",
    ".cpp": "application/cpp",
    ".java": "application/java",
    ".pas": "application/pascal",
    ".xml": "application/xml",
    ".pdf": "application/pdf",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".csv": "text/csv",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".jar": "application/java-archive",
    ".json": "application/json",
    ".rar": "application/x-rar-compressed",
    ".sh": "application/x-sh",
    ".tar": "application/x-tar",
    ".weba": "audio/weba",
    ".webv": "video/webv",
    ".woff": "fonts/woff",
    ".woff2": "fonts/woff2",
    ".xhtml": "application/xhtml+xml",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".zip": "application/zip",
    ".3gp": "video/3gpp",
    ".3g2": "video/3gpp2",
    ".7z": "application/x-7z-compressed"

};

var static_file_cache = new Map();
var etag_cache = new Map();

var cache_time = 1000 * 60 * 30; //缓存有效期：30mins

const banned_ip = new Map();

var request_map = new Map(); //记录用户请求时间,防止同一个IP大量攻击 仅针对与GET/CGI 和 POST 请求

function readFile(path, func) {
    var cache = JSON.parse(static_file_cache.get(path) || '{"time":0,"data":"null"}');
    var current_time = new Date().getTime();
    if ((current_time - cache.time) >= cache_time) {
        //缓存失效
        fs.readFile(path, function (err, data) {
            if (!err) {
                //无错误
                //写入缓存
                static_file_cache.set(path, JSON.stringify({
                    "time": new Date().getTime(),
                    "data": data.toString()
                }));
                etag_cache.set(path, crypto.createHash("md5").update(data).digest("hex"));
            };
            func(err, data);
        });
    } else {
        func(0, cache.data);
    };
};

const request_limit_time = 2 * 1000; //限制用户请求最多2s一次
function wait_for_limit_time(ip, func) {
    var t = request_map.get(ip);
    var ct = new Date().getTime();
    console.log(`PROCESS TIME ${ip} ${t} ${ct}`);
    if (t && (ct - t) <= request_limit_time) {
        //在限制内
        console.log(`WAIT TIME ${ip} ${ct} ${t}`);
        setTimeout(function () {
            //延时执行
            //1.2倍

            request_map.set(ip, new Date().getTime());
            func();
        }, parseInt(request_limit_time * (Math.random() + 1)));
    } else {
        console.log(`SET TIME ${ip}`);
        request_map.set(ip, new Date().getTime());
        func();
    };
};

var static_connections = 0;
var dynamic_connections = 0; //记录静态动态连接数量

const max_static_connections = 300; //最多允许同时300个静态连接
const max_dynamic_connections = 20; //最多允许同时20个动态连接

const max_time_limit = 1000 * 5; //请求5s内未能完成自动拒绝

var time_record_map = new Object(); //记录请求时间

function tickTimeLimit() {
    for (var key in time_record_map) {
        var t = time_record_map[key].time;
        var ct = new Date().getTime();
        if ((ct - t) > max_time_limit) {
            //超时
            closeRequest({
                res:time_record_map[key].res,
                req_id: key,
                status:503,
                headers:{
                    "Retry-After": parseInt(ct - t) + 1
                },
                data:`{"status":"error","data":"Request timeout.","code":000005,"more_info":"https://pigoj-wiki.github.io/code/000005"}`
            });
            delete time_record_map[key];
        };
    };
};

setInterval(function () {
    tickTimeLimit();
    //每500ms检查一次time limit
}, 500);

const cgi_cache = new Map(); //记录CGI文件的path 防止多次多谢硬盘

const requestListener = function (req, res) {
    if (static_connections >= max_static_connections) {
        return refuseConnection(res, 0);
    };

    var request_id = Math.random().toString(16).substring(3);
    console.log(`${getTime()} Receive an HTTP request: ${req.method || "GET "} ${req.url} ID ${request_id} IP ${req.connection.remoteAddress}`);
    var ip = req.connection.remoteAddress;
    var url = req.url.substring(1);
    var path = url.split("?")[0];
    if (path === "") {
        path = "index.html";
    };
    var method = req.method || "GET";

    time_record_map[request_id] = {
        time: new Date().getTime(),
        res: res
    }

    if (banned_ip.get(req.connection.remoteAddress)) {
        console.log(`${getTime()} RESPONSE ID ${request_id} STATUS 403 CONTENT-TYPE text/plain IP BANNED`);
        closeRequest(res, 403, {}, "Your ip address has been blocked.", true, path);
        closeRequest({
            res:res,
            status:403,
            data:`{"status":"error","data":"Your ip address has been blocked.","code":000006,"more_info":"https://pigoj-wiki.github.io/code/000006"}`,
            cache:true,
            path:path
        });
        
    }

    if (req.headers["if-none-match"] && req.headers["if-none-match"] === etag_cache.get(path)) {
        //console.log(`${getTime()} REQUEST ID ${request_id} ETAG-HEADER ${req.headers["if-none-match"]} ETAG-CACHE ${etag_cache.get(path)}`);
        console.log(`${getTime()} RESPONSE ID ${request_id} STATUS 304 CONTENT-TYPE text/plain ETAG-CACHE`);
        closeRequest({
            res:res,
            status:304,
            cache:true,
            path:path
        });
        return;
    };

    if (method === "GET") {
        static_connections++;
        //GET请求

        if (cgi_cache.get(path)) {
            //CGI 动态脚本
            return execute_cgi(method, "", path, url, request_id, ip, req, res);
        };

        readFile(path, function (err, data) {
            if (err) {
                static_connections--;
                console.log(`${getTime()} RESPONSE ID ${request_id} STATUS 404 CONTENT-TYPE text/plain NOT FOUND`);
                closeRequest(res, 404, null, `Cannot get /${path}`);
                return;
            };
            var data_s = data.toString();
            if (data_s.substring(0, 10) === "//NOT SEND" || data_s.substring(0, 20).indexOf("NOT SEND") !== -1) {
                //不能发送
                static_connections--;
                closeRequest(res, 403, null, "403:Forbidden");
                console.log(`${getTime()} RESPONSE ID ${request_id} STATUS 403 CONTENT-TYPE text/plain FORBIDDEN`);
                return;
            };
            if (data_s[0] == "@" || path.substring(0, 5).indexOf("cgi/") !== -1) {
                static_connections--;
                //动态脚本标注符号
                if (dynamic_connections >= max_dynamic_connections) {
                    return refuseConnection(res, 1);
                };
                dynamic_connections++;
                wait_for_limit_time(ip, function () {
                    var cgi_id = request_id;
                    try {
                        /*
                        data_s = data_s.substring(1);
                        var index = data_s.indexOf("\n");
                        if (index == -1) //Not match '\n'
                            index = data_s.length;
                        var command = data_s.substring(0, index);
                        command = JSON.parse(command);
                        var cgi = command.cgi;
                        var arg = command.arg;
                        arg = stringReplaceAll(arg, "${content}", data_s.substring(index));
                        arg = stringReplaceAll(arg, "${url}", req.url);
                        var args_index = req.url.indexOf("?");
                        var urlArgs = req.url.substring(args_index + 1);
                        arg = stringReplaceAll(arg, "${urlArgs}", urlArgs);
                        arg = stringReplaceAll(arg, "${method}", "GET");
                        console.log(`${getTime()} CGI ID ${cgi_id} COMMAND ${cgi} ${arg}`);
                        arg = arg.split(" ") || []; //Parse arg
                        exec(cgi, arg, function (err, data) {
                            var status = parseInt(data,10);
                            if (!isNaN(status)){
                                data = data.substring(status.toString().length+1);
                            };
                            if (err) {
                                //console.error(err);
                                status = status || 500;
                                console.log(`${getTime()} CGI ERROR ID:` + cgi_id);
                                dynamic_connections--;
                                closeRequest(res, status, null, `${getTime()} CGI ERROR ID: ${cgi_id} MESSAGE: ${err || err.message}`);
                                console.log(`${getTime()} RESPONSE ID ${request_id} STATUS ${status} CONTENT-TYPE text/plain ${err || err.message}`);
                            } else {
                                status = status || 200;
                                console.log(`${getTime()} CGI TASK FINISHED ID ${cgi_id}`);
                                dynamic_connections--;
                                closeRequest(res, status, null, data);
                                console.log(`${getTime()} RESPONSE ID ${request_id} STATUS ${status} CONTENT-TYPE text/plain`);
                            };
                        });
                        */
                        cgi_cache.set(path, 1);
                        execute_cgi(method, "", path, url, request_id, ip, req, res);
                    } catch (e) {
                        console.error(e);
                        console.log(`${getTime()} CGI ERROR ID:` + cgi_id);
                        dynamic_connections--;
                        closeRequest(res, 500, null, `${getTime()} CGI ERROR ID: ${cgi_id} MESSAGE: ${e || e.message}`);
                        console.log(`${getTime()} RESPONSE ID ${request_id} STATUS 500 CONTENT-TYPE text/plain ${e || e.message}`);
                    };

                });
            } else {

                //静态页面
                var suffix_index = path.lastIndexOf(".");
                var suffix = path.substring(suffix_index);
                var mime = MIME_suffix_table[suffix] || "application/octet-stream";
                console.log(`${getTime()} RESPONSE ID ${request_id} STATUS 200 CONTENT-TYPE ${mime}`);
                closeRequest(res, 200, {
                    "Content-Type": `${mime};charset=utf-8`
                }, data.toString(), true, path);
            };

        });
    } else if (method === "POST") {
        //POST 请求
        if (dynamic_connections >= max_dynamic_connections) {
            return refuseConnection(res, 1);
        };
        dynamic_connections++;

        var data = "";
        req.on("data", function (chunk) {
            data += chunk;
        });
        //交给专门处理post的请求去处理
        req.on("end", function () {
            //数据合并完毕
            execute_cgi(method, data, path, url, request_id, ip, req, res);
        });


    } else if (req.method === "OPTIONS") {
        //预检请求
        if (dynamic_connections >= max_dynamic_connections) {
            return refuseConnection(res, 1);
        };
        dynamic_connections++;
        if (path.substring(0, 12) === "/cgi/public/") {
            //Public API 公共api
            //允许跨域请求
            console.log(`${getTime()} RESPONSE ID ${request_id} STATUS 200 CONTENT-TYPE text/plain`);
            closeRequest(res, 200, {
                "Access-Control-Allow-Origin": req.headers["referer"] || "*",
                "Access-Control-Allow-Methods": "GET,OPTIONS",
                "Access-Control-Allow-Headers": "Content-type,Authorization",
                "Access-Control-Request-Max-Age:": 1000 * 60 * 60 * 8, //8小时内不再发送预检请求
                "Access-Control-Allow-Credentials": true
            }, "");
        };
    }
    else {
        if (dynamic_connections >= max_dynamic_connections) {
            return refuseConnection(res, 1);
        };
        dynamic_connections++;
        console.log(`${getTime()} RESPONSE ID ${request_id} STATUS 400 CONTENT-TYPE text/plain METHOD NOT SUPPORT`);

        closeRequest(res, 405, null, `Method ${req.method} not support`);
    };
};

const server = http.createServer(requestListener);
var port = 52117;

function execute_cgi(method, data, path, url, request_id, ip, req, res) {
    wait_for_limit_time(ip, function () {
        console.log(`${getTime()} CGI ID ${request_id} COMMAND [tellPostProcess:fork] {{data}}`);
        postProcess.send({
            method: method,
            data: data,
            path: path,
            url: url,
            req_id: request_id,
            req: {
                headers: req.headers
            }
        });
    });

    var callback_id = bind(postProcess, "message", function (msg) {
        if (msg.req_id === request_id) {
            //console.log(msg);
            //消息不是对应当前请求
            //不予处理
            if (typeof msg.header === "undefined") msg.header = {};
            if (msg.status === "err") {
                //错误
                var err = msg.data;
                console.log(`${getTime()} CGI ERROR ID:` + request_id);

                var obj = {
                    "Content-Type": "text/plain;charset=utf-8"
                };
                for (var key in msg.header) {
                    obj[key] = msg.header[key];
                };
                console.log(`${getTime()} RESPONSE ID ${request_id} STATUS ${msg.header.status || 500} CONTENT-TYPE ${obj["Content-Type"]} ${err || err.message}`);
                dynamic_connections--;
                closeRequest(res, msg.header.status || 500, obj, err || err.message);
                unbind(postProcess, "message", callback_id);
            } else if (msg.status === "ok") {
                //成功
                console.log(`${getTime()} CGI TASK FINISHED ID ${request_id}`);
                var obj = {
                    "Content-Type": "text/plain;charset=utf-8"
                };
                for (var key in msg.header) {
                    obj[key] = msg.header[key];
                };
                console.log(`${getTime()} RESPONSE ID ${request_id} STATUS ${msg.header.status || 200} CONTENT-TYPE ${obj["Content-Type"]}`);
                dynamic_connections--;
                closeRequest(res, msg.header.status, obj, msg.data);
                unbind(postProcess, "message", callback_id);
            } else {
                //其它信息
                //写入日志
                console.log(`${getTime()} CGI INVALID MESSAGE ${msg}`);
            };
        };
    });
};


var postProcess;
function makePostProcess() {
    console.log("START POST PROCESS::FORK");
    postProcess = fork("server/cgiProcess.js");
    postProcess._bindfunc = {
        message: []
    };
    postProcess.on("message", function (data) {
        for (var i = 0; i < postProcess._bindfunc.message.length; i++) {
            postProcess._bindfunc.message[i](data);
        };
    });
    postProcess.on("end", function (err, data) {
        console.log(data);
        console.error(err);
        //处理Post进程意外终止
        //重新启动
        makePostProcess();
    });
    postProcess.on("closed", function (err, data) {
        console.log(data);
        console.error(err);
        //处理Post进程意外终止
        //重新启动
        makePostProcess();
    });
};
makePostProcess();


server.listen(port, function () {
    console.log(`${getTime()} HTTP service started on port ${port}`);
});

//Websocket服务由第二个nodeJS服务启动
exec("node", ["server/websocket.js", port.toString()], function (err, data) {
    if (err) {
        console.error(`${getTime()} Cannot start websocket service`);
    };
});


function stringReplaceAll(s1, s2, s3) {
    while (s1.indexOf(s2) != -1) {
        s1 = s1.replace(s2, s3);
    };
    return s1;
};

function getTime() {
    var d = new Date();
    var s = `${(d.getMonth() + 1)}/${d.getDate()}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()}`;
    return s;
};

function bind(aim, e, func) {
    if (typeof aim._bindfunc === "undefined") {
        aim._bindfunc = {};
    };
    if (typeof aim._bindfunc[e] === "undefined") {
        aim._bindfunc[e] = [];
    };
    var len = aim._bindfunc[e].length;
    aim._bindfunc[e][len] = func;
    return len;
};

function unbind(aim, e, id) {
    try {
        aim._bindfunc[e].splice(id, 1);
    } catch (err) {
        console.error(err);
        return -1;
    };
};

function closeRequest(arg) {
    var res = arg.res;
    var status = arg.status || 200;
    var headers = arg.headers || headers;
    var data = arg.data || data;
    var cache = arg.cache || false;
    var path = arg.path || path;
    var req_id = arg.req_id || false;
    if (req_id[0] == 'd') dynamic_connections--;
    else if (req_id[0] == 's') static_connections--;
    try {
        if (typeof headers !== "object" || headers === null || headers === 0) headers = {};
        headers["Content-Type"] = headers["Content-Type"] || "text/plain;charset=utf-8";
        res.removeHeader("Connection");
        res.removeHeader("Keep-Alive");
        res.setHeader("Content-Language", "zh-CN");
        if (cache) {
            var etag = etag_cache.get(path);
            if (etag)
                res.setHeader("ETag", etag);
            res.setHeader("Cache-Control", "max-age=31536000");
        } else {
            res.setHeader("Cache-Control", "no-store");
        };
        res.setHeader("Server", "Node.js v14.17.6");
        res.setHeader("X-MAX-STATIC-CONNECTIONS", max_static_connections);
        res.setHeader("X-CURRENT-STATIC-CONNECTIONS", static_connections);
        res.setHeader("X-MAX-DYNAMIC-CONNECTIONS", max_dynamic_connections);
        res.setHeader("X-CURRENT-DYNAMIC-CONNECTIONS", dynamic_connections);
        for (var key in headers) {
            res.setHeader(key, headers[key]);
        };
        if (typeof data === "object") {
            if (data.buffer) {
                //buffer数据？
                //告诉客户端尝试重新加载
                res.writeHead(302);
                res.setHeader("location", path || "/");
                res.end();
            };
        } else {
            res.writeHead(status);
            res.end(data);
        };
    } catch (err) {
        console.error(err);
    };
};

function refuseConnection(res, req_id) {
    var isDynamic = (req_id[0] == 'd')?1:0
    if (isDynamic) {
        return closeRequest({
            req_id:req_id,
            res: res,
            status: 503,
            headers: {
                "Retry-After": parseInt(6 * (Math.random() + 1))
            },
            data: `{"status":"error","data":"The connection was rejected due to too many connections. Config: Max dynamic connections:${max_dynamic_connections} ; Current dynamic connections:${dynamic_connections}","code":000003,"more_info":"https://pigoj-wiki.github.io/code/000003"}`
        });
    } else {
        return closeRequest({
            req_id:req_id,
            res: res,
            status: 503,
            headers: {
                "Retry-After": parseInt(4 * (Math.random() + 1))
            },
            data: `{"status":"error","data":"The connection was rejected due to too many connections. Config: Max dynamic connections:${max_dynamic_connections} ; Current dynamic connections:${dynamic_connections}","code":000004,"more_info":"https://pigoj-wiki.github.io/code/000004"}`
        });    };
}