const http = require("http");
const fs = require("fs");
const ws = require("nodejs-websocket");
const exec = require('child_process').execFile;

var MIME_suffix_table = {
    ".txt": "text/plain",
    ".js": "application/javascript",
    ".jsx": "application/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".htm": "text/html",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/ico",
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
    ".wav": "audio/wav",
    ".gif": "image/gif",
};

const requestListener = function(req, res) {
    var request_id = Math.random().toString(16).substring(3);
    console.log(`${getTime()} Receive an HTTP request: ${req.url}`);
    var url = req.url.substring(1);
    var path = url.split("?")[0];

    fs.readFile(path, function(err, data) {
        if (err) {
            if (path.indexOf(".html") == -1) {
                  res.setHeader("Location","/" + path + "index.html?" + url.split("?")[1]);
	  res.writeHead(302);
	  res.end();
	  return;
            };
            console.log(`${getTime()} REQUEST ID ${request_id} STATUS 404`);
            res.writeHead(404);
            res.end("Cannot get /" + path);
            return;
        };
        var data_s = data.toString();
        if (data_s[0] == "@") {
            //动态脚本标注符号
            var cgi_id = request_id;
            try {
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
                console.log(`${getTime()} CGI ID ${cgi_id} COMMAND ${cgi} ${arg}`);
                arg = arg.split(" ") || []; //Parse arg
                exec(cgi, arg, function(err, data) {
                    if (err) {
                        //console.error(err);
                        res.writeHead(500);
                        console.error(`${getTime()} CGI ERROR ID:` + cgi_id + "\nMESSAGE: " + err || err.message);
                        res.end(`${getTime()} CGI ERROR ID:` + cgi_id + " MESSAGE: " + err || err.message);
                    } else {
                        console.log(`${getTime()} CGI TASK FINISHED ID ${cgi_id} \nDATA ${data}`);
                        res.writeHead(200, { "Content-Type": "text/plain" });
                        res.end(data);
                    };
                });
            } catch (e) {
                console.error(e);
                res.writeHead(500);
                console.error(`${getTime()} CGI ERROR ID:` + cgi_id + "\nMESSAGE: " + err || err.message);
                res.end(`${getTime()} CGI ERROR ID:` + cgi_id + " MESSAGE: " + err || err.message);
            };
        } else {
            //静态页面
            if (path.substring(path.length, path.length - 5) == ".html" || path.substring(path.length, path.length - 4) == ".htm") {
                //文件是html
                //注入js脚本
                fs.readFile("httpserver/injection", function(err, injection) {
                    if (err) {
                        //注入失败
                        res.writeHead(500);
                        console.error(`${getTime()} HTML INJECTION ERROR ID ${request_id}\nPATH ${path} \nMESSAGE ${err || err.message}`);
                        res.end(`${getTime()} Cannot inject HTML file`);
                        return;
                    };
                    injection = injection.toString();
                    console.log(`${getTime()} RESPONSE ID ${request_id} STATUS 200 CONTENT-TYPE text/html`);
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end(data + "\n" + injection);
                });
            } else {
                var suffix_index = path.lastIndexOf(".");
                var suffix = path.substring(suffix_index);
                var mime = MIME_suffix_table[suffix] || "application/octet-stream";
                console.log(`${getTime()} RESPONSE ID ${request_id} STATUS 200 CONTENT-TYPE ${mime}`);
                res.writeHead(200, { "Content-Type": mime });
                res.end(data);
            };
        };


    })
};

const server = http.createServer(requestListener);
var port = 80;
try {
    var data = fs.readFileSync("httpserver/steupPort");
    port = parseInt(data.toString());
} catch (err) {
    console.error(err);
    console.error("${getTime()} Cannot find HTTP server port.");
    port = parseInt(50000 + Math.random() * 10000);
} finally {
    server.listen(port, function() {
        console.log(`${getTime()} HTTP service started on port ${port}`);
    });

};
var count = 0;
const websocket_server = ws.createServer(function(connection) {
    connection.on("text", function(data) {
        console.log(`${getTime()} WebSocket: Received data: ` + data);
        //接受到数据
        //console.error("Text:" + data);
        try {
            data = JSON.parse(data);
            if (data.type == "SetUpConnection") {
                console.log(`${getTime()} Websocket: Connection was established ` + (count + 1));
                count++;
                //console.error("Websocket: Set up connection " + count);
            }
        } catch (err) {

        };
    });
    connection.on("close", function() {
        console.log(`${getTime()} Websocket: Connection closed ` + (count - 1));
        setTimeout(function() {
            count--;
            // console.error("Websocket: Close connection " + count);
            if (count <= 0) {
                //计数小于等于0
                //无连接
                //退出进程
                console.error(`${getTime()} Count ${count} <= 0`);
                console.error("${getTime()} No connection.\nServer exit.");
                process.exit(0);
            };
        }, 2000);
    });
    connection.on("error", function(err) {
        console.error(err);
        console.error("${getTime()} Websocket: Connection error");
        //console.error(err, "WebSocket Connection error");
    });
    /*
    connection.on("connect", function() {
        console.log("Websocket: Connection was established");
        //console.error("Websocket: New Connction " + count);
        count++;
    });
    */
});
websocket_server.listen((port + 1), function() {
    console.log(`${getTime()} Websocket service started on port ${port+1}`);
});

function stringReplaceAll(s1, s2, s3) {
    while (s1.indexOf(s2) != -1) {
        s1 = s1.replace(s2, s3);
    };
    return s1;
};

function getTime() {
    var d = new Date();
    var s = `${(d.getMonth()+1)}/${d.getDate()}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()}`;
    return s;
}