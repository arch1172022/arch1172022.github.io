/**
 * @Author          : lihugang
 * @Date            : 2022-04-16 18:08:08
 * @LastEditTime    : 2022-04-17 14:57:46
 * @LastEditors     : lihugang
 * @Description     : 
 * @FilePath        : e:\arch117\vpn\js\github_api.js
 * @Copyright (c) lihugang
 * @长风破浪会有时 直挂云帆济沧海
 * @There will be times when the wind and waves break, and the sails will be hung straight to the sea.
 * @ * * * 
 * @是非成败转头空 青山依旧在 几度夕阳红
 * @Whether it's right or wrong, success or failure, it's all empty now, and it's all gone with the passage of time. The green hills of the year still exist, and the sun still rises and sets.
 */
function getfile(url) {
    if (window.XMLHttpRequest)
        var xhr = new XMLHttpRequest();
    else
        var xhr = new ActiveXObject("Microsoft.XMLHTTP");
    return new Promise(function(resolve, reject) {
        //xhr.open("GET", "https://api.github.com/" + url + "?access_token=" + window.db.token + "&random=" + Math.random().toString(), true);
        xhr.open("GET", "https://api.github.com/" + url + "?random=" + Math.random().toString(), true);
        xhr.setRequestHeader("Authorization", "token " + window.db.token);
        xhr.send();
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 400) {
                var response = JSON.parse(xhr.responseText);
                try {
                    if (response.content)
                        response.content = response.content.toPlain().toutf().toBuffer().decode().toString().toBase64();
                    if (response.contents)
                        response.contents = response.contents.toPlain().toutf().toBuffer().decode().toString().toBase64();
                } catch (e) {};
                response = JSON.stringify(response);
                resolve({ status: xhr.status, response: response, url: url, async: true });
            }
            else
                reject({ status: xhr.status, response: xhr.response, url: url, async: true });
        };
    });
};

function logout() {
    var key = ["password", "username", "userid", "token", "avatar_url", "repos"];
    var i = 0;
    while (i < key.length) {
        localStorage.removeItem(key[i]);
        i++;
    };
    location.reload();
};

function login() {
    var access_token = document.querySelector("#github_access_token").value;
    window.db.password = access_token;
    window.db.token = window.db.encodeToken.toBuffer().decode().toString();
    getfile("user").then(function(){
        localStorage.setItem("password",access_token);
        location.reload();
    }).catch(function(){
        alert("The key is wrong.");
    });
};

function deletefile(url) {
    if (window.XMLHttpRequest)
        var xhr = new XMLHttpRequest();
    else
        var xhr = new ActiveXObject("Microsoft.XMLHTTP");
    return new Promise(function(resolve, reject) {
        //xhr.open("DELETE", "https://api.github.com/" + url + "?access_token=" + window.db.token + "&random=" + Math.random().toString(), true);
        xhr.open("DELETE", "https://api.github.com/" + url + "?random=" + Math.random().toString(), true);
        xhr.setRequestHeader("Authorization", "token " + window.db.token);
        xhr.send(JSON.stringify({ message: "Delete file (GitHubAPI)", sha: window.current_file_sha }));

        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 400)
                resolve({ status: xhr.status, response: xhr.response, url: url, async: true });
            else
                reject({ status: xhr.status, response: xhr.response, url: url, async: true });
        };
    });
};

function putfile(url, content, sha) {
    if (window.XMLHttpRequest)
        var xhr = new XMLHttpRequest();
    else
        var xhr = new ActiveXObject("Microsoft.XMLHTTP");
    return new Promise(function(resolve, reject) {
        //xhr.open("PUT", "https://api.github.com/" + url + "?access_token=" + window.db.token + "&random=" + Math.random().toString(), true);
        xhr.open("PUT", "https://api.github.com/" + url + "?random=" + Math.random().toString(), true);
        xhr.setRequestHeader("Authorization", "token " + window.db.token);
        xhr.send(JSON.stringify({ message: "Put file (GitHubAPI)", sha: sha, content: content.toPlain().toBuffer().encode().toString().toascii().toBase64() }));
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 400)
                resolve({ status: xhr.status, response: xhr.response, url: url, async: true });
            else
                reject({ status: xhr.status, response: xhr.response, url: url, async: true });
        };
    });
};
var dataProcess = {
    map: {
        0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, a: 10, b: 11, c: 12, d: 13, e: 14, f: 15
    },
    encode: function (buf) {
        var key = window.db.password;
        if (!key)
            return -1;
        var md5_obj = new SparkMD5();
        md5_obj.append(key);
        var md5_key = md5_obj.end();

        for (var i = 0; i < buf.length; i++) {
            buf[i] += dataProcess.map[md5_key[i % 32]];
            buf[i] %= 256;
        };
        buf.toString = function(){
            return dataProcess.bufferToString(buf);
        };
        return buf;
    },
    decode: function (buf) {
        var key = window.db.password;
        if (!key)
            return -1;
        var md5_obj = new SparkMD5();
        md5_obj.append(key);
        var md5_key = md5_obj.end();

        for (var i = 0; i < buf.length; i++) {
            buf[i] -= dataProcess.map[md5_key[i % 32]];
            if (buf[i] <= 0) buf[i] += 256;
            buf[i] %= 256;
        };
        buf.toString = function(){
            return dataProcess.bufferToString(buf);
        };
        return buf;
    },
    stringToBuffer: function (str) {
        var buf = new Uint16Array(str.length);
        for (var i = 0; i < str.length; i++) buf[i] = str[i].charCodeAt();
        buf.encode = function(){
            return dataProcess.encode(buf);
        };
        buf.decode = function(){
            return dataProcess.decode(buf);
        };
        return buf;
    },
    bufferToString: function (buf) {
        var str = "";
        for (var i = 0; i < buf.length; i++) str += String.fromCharCode(buf[i]);
        buf.encode = function(){
            return dataProcess.encode(buf);
        };
        buf.decode = function(){
            return dataProcess.decode(buf);
        };
        return str;
    }

};
String.prototype.toBuffer = function(){
    var s = dataProcess.stringToBuffer(this);
    s.encode = function(){
        return dataProcess.encode(s);
    };
    s.decode = function(){
        return dataProcess.decode(s);
    };
    return s;
};
String.prototype.toBase64 = function(){
    return btoa(this);
};
String.prototype.toPlain = function(){
    return atob(this);
};
String.prototype.toascii = function(){
    return encodeURI(this);
};
String.prototype.toutf = function(){
    try {
        return decodeURI(this);
    } catch (e) {console.log(e);}
    return this;
};
String.prototype.encode = function(){
    return dataProcess.encode(this);
};
String.prototype.decode = function(){
    return dataProcess.decode(this);
};