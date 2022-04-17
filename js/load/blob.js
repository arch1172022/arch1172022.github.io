/**
 * @Author          : lihugang
 * @Date            : 2022-04-16 18:08:08
 * @LastEditTime    : 2022-04-17 15:17:09
 * @LastEditors     : lihugang
 * @Description     : 
 * @FilePath        : e:\arch117\vpn\js\load\blob.js
 * @Copyright (c) lihugang
 * @长风破浪会有时 直挂云帆济沧海
 * @There will be times when the wind and waves break, and the sails will be hung straight to the sea.
 * @ * * * 
 * @是非成败转头空 青山依旧在 几度夕阳红
 * @Whether it's right or wrong, success or failure, it's all empty now, and it's all gone with the passage of time. The green hills of the year still exist, and the sun still rises and sets.
 */
rate_limit();
if (window.db.password){
	if (window.db.username)
		EL(function(){
			document.querySelector("#userinfo").innerHTML = "<b><a onclick=javascript:window.open('/settings/','_blank');><img id=avatar height=64px width=64px src=" + localStorage.avatar_url + "><br>" + window.db.username + "</a></b><br>------<br><button onclick=javascript:logout();>Logout</button><br><a href=# onclick=javascript:back();>Back</a>";
			
			if (window.db.repos) {
				var args = ParseURLArgs();
				console.log(args);
				var repo_id = args.repo_id; 
				var repo_data = window.db["repos_" + repo_id];
				if (typeof(repo_data) == "undefined") {
					document.querySelector("#workspace").innerHTML = "<font color=red>The project is not in the local database.</font><br><a href=# onclick=javascript:getrepodata(" + repo_id + ");>Fetch</a>";
					return -1;
				} else repo_data = JSON.parse(repo_data);
				document.querySelector("#workspace").innerHTML = "<b>" + repo_data.name + "</b>/<a href=# onclick=javascript:TomasterBranch();>main</a>/<span id=path>" + args.path + "</span><p id=tools style='text-align:right'><input type=button value='Edit' onclick=javascript:go_edit_file(); id=edit_button><input type=button value='Open it on GitHub' onclick=javascript:open_github(); id=edit_button><input type=button value='Download' id=download_button disabled><input type=button value='Delete' onclick=javascript:go_delete_file();></p><hr><div id=content>Fetching your file from <font color=red>api.github.com</font>.<br>Please wait a moment.</div>";
				buildPathLink();
				var req_url = args.url;
				req_url = req_url.substring(23).split("?")[0];
				window.current_file = req_url;
				getfile(req_url).then(function(res){
					var info = JSON.parse(res.response);
					console.log(res,info);
					if (typeof(info.content) == "undefined"){
						var dat = location.href.substring(location.origin.length + 6);
						location.href = "/tree/" + dat;
					};
					if (info.encoding == "base64") {
						var content = utf8to16(atob(info.content));
						console.log(content);
						var link = req_url.split("?")[0].split(".");	
						var suffix = link[link.length - 1];

						if (suffix == "jpg" || suffix == "png" || suffix == "webp" || suffix == "bmp" || suffix == "jpeg" || suffix == "ico" || suffix == "gif" || suffix == "svg") {
							document.querySelector("#edit_button").disabled = true;
							var dataurl = "data:image/" + suffix + ";base64," + info.content;
							document.querySelector("#content").innerHTML = "<img src=" + dataurl + ">";
						} else if (suffix == "mp4" || suffix == "wmv" || suffix == "mov" || suffix == "mpeg") {
							document.querySelector("#edit_button").disabled = true;
							var dataurl = "data:video/" + suffix + ";base64," + info.content;
							document.querySelector("#content").innerHTML = "<video src=" + dataurl + " controls>";
						} else if (suffix == "mp3" || suffix == "wmv" || suffix == "ogg") {
							document.querySelector("#edit_button").disabled = true;
							var dataurl = "data:audio/" + suffix + ";base64," + info.content;
							document.querySelector("#content").innerHTML = "<audio src=" + dataurl + " controls>";
						} else {
							if (isBinaryFile(content)){
								document.querySelector("#edit_button").disabled = true;
								document.querySelector("#content").innerHTML = "<p style='text-align:center'>Binary File</p>";
								window.current_file = req_url;
							} else {
								document.querySelector("#content").innerHTML = "<textarea id=code readonly cols=200 rows=120></textarea>";
								document.querySelector("#code").value = content;
							};
						};			
					};
				}).catch(function(err){
					console.error(err);
					if (err.status == 401 || err.status == 404) {
						document.querySelector("#workspace").innerHTML = "<font color=red>Failed to load data.</font><br><a href=# onclick=javascript:location.reload();>Reload</a>";
						document.querySelector("#edit_button").disabled = true;
						document.querySelector("#delete_button").disabled = true;
						document.querySelector("#download_button").disabled = true;
					} else if (err.status == 403) {
						//File is too large
						document.querySelector("#edit_button").disabled = true;
						if (window.XMLHttpRequest){
							var xhr = new XMLHttpRequest();
						} else {
							var xhr = new ActiveXObject("Microsoft.XMLHTTP");
						};
						var args = ParseURLArgs();
						var url = args.url.split("?")[0].split("/");
						var i = 4;
						var link = "https://raw.githubusercontent.com/";
						while (i < url.length){
							if (i == 4 || i > 6)	
								link += url[i] + "/";
							if (i == 5)
								link += url[i] + "/master/";
							i++;
						};
						link = link.substring(link.length-1,-1);
						var suffix = url[url.length-1].split(".");
						suffix = suffix[suffix.length - 1];							
						document.querySelector("#content").innerHTML = "<font color=red>File is too large. (More than 1MB)</font><br>Fetching your file from <font color=red>raw.githubusercontent.com</font>......<br>Please wait a moment.";
						console.log(link);
						xhr.open("GET",link,true);
						xhr.send();
						xhr.onload = function(){
							if (xhr.status >= 200 && xhr.status < 400){
								var content = xhr.response.toutf().toBuffer().decode().toString();
								if (suffix == "jpg" || suffix == "png" || suffix == "webp" || suffix == "bmp" || suffix == "jpeg" || suffix == "ico" || suffix == "gif" || suffix == "svg") {
									document.querySelector("#edit_button").disabled = true;
									var dataurl = "data:image/" + suffix + ";base64," + info.content;
									document.querySelector("#content").innerHTML = "<img src=" + dataurl + ">";
								} else if (suffix == "mp4" || suffix == "wmv" || suffix == "mov" || suffix == "mpeg") {
									document.querySelector("#edit_button").disabled = true;
									var dataurl = "data:video/" + suffix + ";base64," + info.content;
									document.querySelector("#content").innerHTML = "<video src=" + dataurl + " controls>";
								} else if (suffix == "mp3" || suffix == "wmv" || suffix == "ogg") {
									document.querySelector("#edit_button").disabled = true;
									var dataurl = "data:audio/" + suffix + ";base64," + info.content;
									document.querySelector("#content").innerHTML = "<audio src=" + dataurl + " controls>";
								} else {
									if (isBinaryFile(content)){
										document.querySelector("#edit_button").disabled = true;
										document.querySelector("#content").innerHTML = "<p style='text-align:center'>Binary File</p>";
										window.current_file = req_url;
									} else {
										document.querySelector("#content").innerHTML = "<textarea id=code readonly cols=200 rows=120></textarea>";
										document.querySelector("#code").value = content;
									};
								};			
		
							} else {
								document.querySelector("#workspace").innerHTML = "<font color=red>Failed to load data.</font><br><a href=# onclick=javascript:location.reload();>Reload</a>";
								document.querySelector("#delete_button").disabled = true;
								document.querySelector("#download_button").disabled = true;
							};
						};
					};
				});
			} else {
				localStorage.repos = "[]";
				location.reload();
			};
		});
	 else EL(function(){
			document.querySelector("#userinfo").innerHTML = "<button onclick=javascript:logout();>Logout</button>";
			getfile("user").then(function(res){
				var dat = JSON.parse(res.response);
				console.log(res,dat);
				localStorage.username = dat.login;
				localStorage.userid = dat.id;
				localStorage.avatar_url = dat.avatar_url;
				location.reload();
			}).catch(function(err){
				console.error(err);
				alert("Failed to load your user data.");
			});
		});
	;
} else {
	EL(function(){
		document.querySelector("#userinfo").innerHTML = "Please login first.";
		document.querySelector("#workspace").innerHTML = "<center><p style='font-size:1.5em'>117 Archives Verification System<br>Please input your Key<br><input type=text id=github_access_token placeholder=xxxxxxx style='width:400px'></p><br><button onclick=login();>Confirm</button></center>";
	});
};
function back(){
	var args = buildBackURL(ParseURLArgs());
	if (typeof(args) == "string")
		location.href = args;
	else
		location.href = "/tree/?repo_id=" + args.repo_id + "&path=" + args.path + "&url=" + args.url;
};
function buildBackURL(args){
	if (args.path.indexOf("/") == -1)
		return "/repo/?id=" + args.repo_id;
	else {
		var last_dict_position = args.path.lastIndexOf("/");
		var current_path = args.path.substring(0,last_dict_position);
		var cau = args.url.split("?")[0];
		var cau_ldp = cau.lastIndexOf("/");
		cau = cau.substring(0,cau_ldp);
		return {repo_id:args.repo_id,path:current_path,url:cau};
	};	
};
function TomasterBranch(){
	var args = ParseURLArgs();
	location.href = "/repo/?id=" + args.repo_id;
};
function buildPathLink(){
	var path = document.querySelector("#path").innerHTML;
	path = path.split("/");
	var current_path = "";
	var str = "";
	var i = 0;
	while (i < path.length){
		current_path += path[i] + "/";
		str += "<a class=path_link data-link=" + current_path.substring(current_path.length-1,-1) + ">" + path[i] + "</a>/";
		i++;
	};
	document.querySelector("#path").innerHTML = str.substring(str.length-1,-1);
	var eles = document.querySelectorAll(".path_link");
	i = eles.length - 1;
	var args = ParseURLArgs();
	while (i >= 0){
		eles[i].href = "/tree/?repo_id=" + args.repo_id + "&path=" + args.path + "&url=" + args.url;
		args = buildBackURL(args);
		i--;
	};
	eles[eles.length-1].href = "/blob/" + eles[eles.length-1].href.substring(6 + location.origin.length);
	
};
function download_file(){
	var blob_url = geturl();
	var suffix = blob_url.split("/");
	suffix = suffix[suffix.length-1].split(".");
	suffix = suffix[suffix.length - 1];
	if (suffix == "jpg" || suffix == "png" || suffix == "webp" || suffix == "bmp" || suffix == "jpeg" || suffix == "ico" || suffix == "gif" || suffix == "svg" || suffix == "mp3" || suffix == "wmv" || suffix == "mp4" || suffix == "pdf") {
		blob_url = replaceURL(blob_url);
		window.open(blob_url,"_blank");
	} else {
		var ele = document.createElement("a");
		ele.href = blob_url;
		var args = ParseURLArgs();
		var url = args.url.split("?")[0];
		url = url.split("/");
		ele.download = url[url.length - 1]
		ele.click();
	};
};
function geturl(){
	if (typeof(window.current_file) == "string") {
		var url = "https://api.github.com/" + window.current_file;
		url = url.split("?")[0].split("/");
		var i = 4;
		var link = "https://raw.githubusercontent.com/";
		while (i < url.length){
			if (i == 4 || i > 6)	
				link += url[i] + "/";
			if (i == 5)
				link += url[i] + "/master/";
			i++;
		};
		link = link.substring(link.length-1,-1);
		console.log(url,link,window.current_file);
		return link;
	} else return window.URL.createObjectURL(window.current_file);
	
};
function isBinaryFile(content){
	var len = content.length;
	var bin_char = 0;
	var i = 0;
	while (i < content.length){
		var ascii_code = content.charCodeAt(i);
		if ((ascii_code < 32) && (content[i] != "\n" && content[i] != "\r" && content[i] != "\t" && content[i] != "\b"))
			bin_char++;
		i++;
	};
	var ratio = bin_char / len;
	console.log(bin_char,len,ratio);
	return (ratio > 0.15);
};
function go_edit_file(){
	var dat = location.href.substring(location.origin.length + 6);
	location.href = "/edit/" + dat;
};
function go_delete_file(){
	var dat = location.href.substring(location.origin.length + 6);
	location.href = "/delete/" + dat;
};
function open_github(){
	var path = "https://www.github.com/";
	var args = ParseURLArgs();
	path += JSON.parse(window.db["repos_" + args.repo_id]).fullname;
	path += "/blob/master/";
	path += args.path;
	window.open(path,"_blank");
};