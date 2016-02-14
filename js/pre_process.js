
sigtree.preProcess = function(){
	var result = {};

	this.preProcess(filePath) {
		d3.csv(filePath, function(dt){
			var grepNumber = function(str){
				var reg = /(\d+)/;
				if(reg.test(str)){
					return RegExp.$1;
				}
			}
			var ext = d3.extent(dt, function(d){
				var str = d["比例"];
				return grepNumber(str);
			});
			var color = d3.scale.linear()
				.range(['yellow', 'lightblue', 'blue', 'darkblue', 'black'])
				.domain(ext);
			// duplicated items have been removed
			root = preProcess(dt);
			update(root);
		});		
	}

	var istreefy = true;

	function preProcess(data){)
		var d = change_attr(data);
		if(!istreefy) return d;
		return treefy_(d);
	}
	
	pre_process.treefy = function(t){
		istreefy = t;
		return pre_process;
	};

	pre_process.treefy_ = treefy_;

	function treefy_(dts){
		var nested = d3.nest()
			.key(function(d){return d.atm})
			.key(function(d){return d.aal})
			.key(function(d){return d.vpi})
			.key(function(d){
				if(d.cid) return d.cid;
				if(d.tcp) return d.tcp;
				if(d.udp) return d.udp;
				if(d.icmp) return d.icmp;
				if(d.other) return d.other;
				//return d.percent;
			})
		.rollup(function(d){
			if(d[0]) return d[0].percent;
		})
		.entries(dts);
		root = {key:"root", values:nested};
		translate(root);
		return root;
	}

	function change_attr(dts){
		var arr = [];
		var id = 0;
		dts.forEach(function(raw){
			raw.atm = raw["SPE号"];
			delete raw["SPE号"];
			raw.aal = raw["适配层/百分比例"];
			delete raw["适配层/百分比例"];
			raw.vpi = raw["VPI/VCI"];
			delete raw["VPI/VCI"];
			var reg = /(\d{4}:\s*[0-9A-F]{4});[^0-9]*(\d+)/;
			if(reg.test(raw.vpi)){
				//	    raw.cid = "CID:" + RegExp.$2;
				raw.cid = RegExp.$2;
				raw.vpi = RegExp.$1;				
			}
			raw.percent = raw["比例"];
			delete raw["比例"];
			var f = 0;
			var regTcp = /TCP[^\d]*(\d+)/;
			var regUdp = /UDP[^\d]*(\d+)/;
			var regIcmp = /ICMP[^\d]*(\d+)/;
			var regOther = /其他[^\d]*(\d+)/;
			if (regTcp.test(raw.percent)){
				var newObj = jQuery.extend(true,{},raw);
				newObj.tcp = "TCP";
				newObj.percent = RegExp.$1;
				arr.push(newObj);
				f = 1;
			}
			if (regUdp.test(raw.percent)){
				var newObj = jQuery.extend(true,{},raw);
				newObj.udp = "UDP";
				newObj.percent = RegExp.$1;
				arr.push(newObj);
				f = 1;
			}
			if (regIcmp.test(raw.percent)){
				var newObj = jQuery.extend(true,{},raw);
				newObj.icmp = "ICMP";
				newObj.percent = RegExp.$1;
				arr.push(newObj);
				f = 1;
			}
			if (regOther.test(raw.percent)){
				var newObj = jQuery.extend(true,{},raw);
				newObj.other = "Other";
				newObj.percent = RegExp.$1;
				arr.push(newObj);
				f = 1;
			}
			console.log(change_arrt);			
			if(!f){

				raw.flowSize = 0;
				raw.flowSize = raw.percent.split("，")[0].replace("数量：","").replace("字节","").trim();
				console.log(raw.flowSize)
				raw.id = id++;
				arr.push(raw);
			}
		});
		return arr;
	}

	function translate(obj){
		if(!(obj.values instanceof Array)){
			return;
		}
		if(obj.values.length == 1 && obj.values[0].key === "undefined"){
			obj.values = obj.values[0].values;
		}
		else{
			obj.values.forEach(translate);
		}
	}

	return pre_process;
};
