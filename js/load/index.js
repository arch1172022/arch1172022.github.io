/**
 * @Author          : lihugang
 * @Date            : 2022-04-16 18:08:08
 * @LastEditTime    : 2022-04-16 18:35:14
 * @LastEditors     : lihugang
 * @Description     : 
 * @FilePath        : \js\load\index.js
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
			document.querySelector("#userinfo").innerHTML = "<b><a onclick=javascript:window.open('/settings/','_blank');><img id=avatar height=64px width=64px src=" + localStorage.avatar_url + "><br>" + window.db.username + "</a></b><br>------<br><button onclick=javascript:logout();>Logout</button>";
			document.querySelector("#workspace").innerHTML = "Your repositories:<br><span id=repos></span>";
			if (window.db.repos && window.db.repos != "[]"){
				var repos = JSON.parse(window.db.repos);
				var i = 0;
				var str = "<ul>";
				while (i < repos.length){
					var is_private = repos[i].private;
					var repos_id = repos[i].id;
					var repos_name = repos[i].name;
					localStorage.setItem("repos_" + repos_id,JSON.stringify({name:repos_name,is_private:is_private,id:repos_id,fullname:repos[i].full_name}));
					var color = (is_private)?"red":"green";
					str += "<li><font color=" + color + ">" + repos_id + " " + "<a onclick=javascript:location.href='/repo/?id=" + repos_id + "' target=_blank>" + repos[i].full_name + "</a></font></li>";
					i++;
				};
				str += "</ul>";
				document.querySelector("#repos").innerHTML = str;
			} else {
				getfile("user/repos").then(function(res){
					console.log(res);
					localStorage.repos = res.response;
					location.reload();
				}).catch(function(err){
					console.error(err);
					document.querySelector("#repos").innerHTML = "Failed to load data.<br><a href=# onclick=javascript:location.reload();>Reload</a>";
				});
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