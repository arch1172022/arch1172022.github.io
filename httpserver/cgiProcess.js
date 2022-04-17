//NOT SEND
/**
 * @Author          : lihugang
 * @Date            : 2022-02-10 19:39:54
 * @LastEditTime    : 2022-02-16 19:13:14
 * @LastEditors     : lihugang
 * @Description     : Processing POST request
 * @FilePath        : \server\cgiProcess.js
 * @Copyright (c) lihugang
 * @长风破浪会有时 直挂云帆济沧海
 * @There will be times when the wind and waves break, and the sails will be hung straight to the sea.
 * @ * * * 
 * @是非成败转头空 青山依旧在 几度夕阳红
 * @Whether it's right or wrong, success or failure, it's all empty now, and it's all gone with the passage of time. The green hills of the year still exist, and the sun still rises and sets.
 */

const exec = require('child_process').execFile;
const fs = require("fs");
const sqlite3 = require("sqlite3");
const crypto = require("crypto");
const querystring = require('querystring');

queue = [];
process.on("message", function (msg) {
    queue.push(msg);
});

const user_token = new Map();
//用户的token

const user_token_expires = 3 * 60 * 60 * 1000;
//用户的token有3h有效期

function getUsernameByToken(token) {
    var obj = user_token.get(token) || {time:0,username:null};
    var current_time = new Date().getTime();
    if ((current_time - obj.time) >= user_token_expires) {
        //过期
        user_token.delete(token);
        return -1;
    } else return obj.username;
};
function makeToken(username){
    //根据用户名生成Token
    var ts = username + "@PigOnlineJudge.117" + new Date().getTime();
    //加时间戳
    var token = crypto.createHash("md5").update(ts).digest("hex");
    //计算md5作为token    
    //取md5后29位
    token = token.substring(3) + new Date().getTime().toString().substring(10);
    //再加一轮时间戳
    user_token.set(token,{
        time: new Date().getTime(),
        username:username
    });
    return token;
};

process_free = true;

function processQueue() {
    if (queue.length == 0) {
        return;
    };
    process_free = false;


    var obj = queue.shift();
    var return_data = null;
    var return_status = null;
    var return_header = {};
    //从硬盘上读取文件然后eval执行

    //由于代码都是自己写的，可以信任

    readFile(obj.path, function (err, data) {
        if (err) {
            //无法读文件
            process.send({
                req_id: obj.req_id,
                status: "err",
                data: "Cannot get /" + obj.path
            });
            process_free = true;
            //释放锁
            clearInterval(process_sti);
        } else {
            var start_time = new Date().getTime(); //计算开始时间

            var process_sti = setInterval(function () {
                //返回值写在return_data处 每50ms检查是否已写入，写入则返回
                if (typeof return_data !== "undefined" && return_data !== null) {
                    clearInterval(process_sti);
                    process.send({
                        req_id: obj.req_id,
                        status: "ok",
                        data: return_data.toString(),
                        header: return_header
                    });
                    process_free = true;
                    //释放锁
                };
                var current_time = new Date().getTime();
                var max_process_time = 2 * 1000; //2secs
                if ((current_time - start_time) > (max_process_time)) {
                    //已执行2s+
                    //强制释放锁，关闭进程
                    clearInterval(process_sti);
                    process.send({
                        req_id: obj.req_id,
                        status: "err",
                        data: `Timeout: Maximum Processing Time:${max_process_time}ms`
                    });
                    process_free = true;
                };
            }, 50);

            try {
                if (obj.method === "GET"){
                    eval(data.toString().substring(1));
                } else eval(data.toString());
            } catch (err) {
                console.error(err);
                process.send({
                    req_id: obj.req_id,
                    status: "err",
                    data: err.message
                });
            };
        };
    });
};

var cgi_file_cache = new Map();
//TODO: DEBUG状态不设置服务器端缓存
var cache_time = 1000 * 60 * 30 * 0; //缓存有效期：30mins
function readFile(path, func) {
    var cache = JSON.parse(cgi_file_cache.get(path) || '{"time":0,"data":"null"}');
    var current_time = new Date().getTime();
    if ((current_time - cache.time) >= cache_time) {
        //缓存失效
        fs.readFile(path, function (err, data) {
            if (!err) {
                //无错误
                //写入缓存
                cgi_file_cache.set(path, JSON.stringify({
                    "time": new Date().getTime(),
                    "data": data
                }));
            };
            func(err, data);
        });
    } else {
        func(0, cache.data);
    };
};

setInterval(function () {
    if (process_free) {
        //锁未被捕获
        //处理数据
        processQueue();
    };
    //每200ms tick一次
}, 200);

const match_exp = /create\s|drop\s|table\s|primary\s|key\s|insert\s|into\s|values\s|select\s|and\s|between\s|exists\s|in\s|like\s|glob\s|not\s|or\s|is\s|null\s|not\s|unique\s|where\s|update\s|limit\s|order\s|group\s|having\s|distinct\s|pragma\s|\s by|and'|or'|and\d|or\d|\sfrom|from\s|\swhere/gim;
function scanSQL(s) {
    if (s.match(match_exp) == null) return false;
    else return true;
};
String.prototype.scanSQL = function () {
    if (this.match(match_exp) == null) return false;
    else return true;
}