(function(){
	var utils = {};
	utils.getDataFileByID = function(dataID) {
		var file = dataStat[dataID].file;
	    file = "data/" + file;
	    return file;
	}


	utils.log = function(d,lev){
		if(lev){
			if(Array.isArray(d)){
				console.log.apply(console,d);
			}
			else{
				console.log(d);
			}
		}
	};
	utils.warn = function(d,lev){
		if(Array.isArray(d)){
			console.warn.apply(console,d);
		}
		else{
			console.warn(d);
		}
	};
	utils.error = function(d,lev){
		if(Array.isArray(d)){
			console.error.apply(console,d);
		}
		else{
			console.error(d);
		}
	};
	/*
	 * change elements' pos and size
	 */
	utils.update_element= function(sel, pos, style){
		var selection = sel.selectAll(type);
		if(style){
			selection.attr("class", style);
		}
		selection.each(function(d,i){
			var _pos = typeof pos ==  'function'?pos.call(sel, d, i):pos;
			var dx = _pos && _pos.left?_pos.left:0,
					dy = _pos && _pos.top?_pos.top:0,
					width, height;
			if(dx || dy){
				d3.select(this).attr("transform","translate("+dx+","+dy+")");
			}
			if(_pos && (width = _pos.width)){
				d3.select(this).attr("width",width);
			}
			if(_pos && (height = _pos.height)){
				d3.select(this).attr("height",height);
			}
		});
		return selection;
	};
	/*
	 * append an element to selection
	 */
	utils.append_element = function(sel, pos, type, style){
		type = type?type:"g";
		return sel.append(type).attr("class",style).each(function(d,i){
			var _pos = typeof pos ==  'function'?pos.call(sel, d, i):pos;
			var dx = _pos && _pos.left?_pos.left:0,
					dy = _pos && _pos.top?_pos.top:0,
					width, height;
			if(dx || dy){
				d3.select(this).attr("transform","translate("+dx+","+dy+")");
			}
			if(_pos && (width = _pos.width)){
				d3.select(this).attr("width",width);
			}
			if(_pos && (height = _pos.height)){
				d3.select(this).attr("height",height);
			}
		});
	};
	/*
	 * compare function for number and string
	 */
	utils.compare = function(a,b){
		if(typeof a == 'string'){
			return a.localeCompare(b);
		}
		if(typeof a == 'number'){
			return a - b;
		}
		utils.log(a);
		utils.error("unknown type to compare:");
	};
	/*
	 * get the size for some obj
	 */
	utils.get_size = function(id){
		var tc = $("#"+id);
		return {
			width:tc.width(),
			height:tc.height(),
			reload: function(){
				this.width = tc.width();
				this.height = tc.height();
				return this;
			}
		};
	};
	/*
	 * add parent field to every children
	 */
	utils.child_to_parent = function(nodes){
		var nexts, curs = nodes;

		while(curs && curs.length){
			nexts = [];
			curs.forEach(function(n){
				n.path = (n.parent?n.parent.path:[]).concat(n.name);
				if(n.children){
					n.children.forEach(function(child){child.parent = n});
					nexts = nexts.concat(n.children);
				}
			});
			curs = nexts;
		}

		return nodes;
	};
	/*
	 * rollup data for data items with date attr
	 * assume that data per date have same hierarchies
	 */
	utils.rollup = function(dt){
		var keys = [];
		var child_to_parent = utils.child_to_parent;
		keys.push(function(d){return d.atm});
		keys.push(function(d){return d.aal});
		keys.push(function(d){return d.vpi});
		keys.push(function(d){return d.cid | d.tcp | d.udp | d.icmp | d.other});

		var nodes = map(dt, 0).sort(compare);
		child_to_parent(nodes);
		return nodes;

		var compare = function(a,b){
			return utils.compare(a.name, b.name);
		};
		/*
		 * for an item array, rollup by the depth value defined above
		 */
		function map(array, depth){
			if(!array){
				utils.error("depth "+ depth + "error, we assume that all data has same hierarchies");
			}
			var i = -1,
			n = array.length,
				key = keys[depth++],
				keyValue,
					object,
					valuesByKey = new Map(),
						values;
			while(++i < n){
				object = array[i];
				keyValue = 	key(object);
				if(!keyValue){
					utils.error("no key value");
				}
				if(values = valuesByKey.get(keyValue)){
					values.push(object);
				}
				else{
					valuesByKey.set(keyValue,[object]);
				}
			}

			function nest_value_by_time(values){
				var objs = d3.nest().key(function(d){
					return d.time;
				}).entries(values);
				var res = d3.map();
				objs.forEach(function(d){
					res.set(d.key,d.values);
				});
				return res;
			}
			var resArray = [];
			if(valuesByKey.size){
				valuesByKey.forEach(function(values, key){
					var obj = {
						name:key,
						depth:depth,
					};
					if(depth != keys.length
							&& values.every(function(d){return keys[depth](d)})){
						obj.children = map(values, depth).sort(compare);
					}
					obj.dataByTime = nest_value_by_time(values);
					resArray.push(obj);
				});
			}
			return resArray;
		}
	};
	/*
	 * check whether rectangel r1 is in r2
	 */
	utils.printRectInfo = function(rect){
		var s = [].concat(rect.x,rect.y,rect.dx,rect.dy).join(",");
		console.log(s);
	};
	utils.interleaveRect = function(r){
		return r.x >= this.x && r.y >= this.y
			&& (r.x+r.dx) <= (this.x+this.dx) && (r.y+r.dy)<=(this.y+this.dy);
	};
	utils.enlargeRelative = function(r, ratio){
		var c = {x:this.x+this.dx/2, y:this.y+this.dy/2};
		var rect = {};
		rect.x = c.x + ratio*(r.x-c.x);
		rect.y = c.y + ratio*(r.y-c.y);
		rect.dx = ratio * r.dx;
		rect.dy = ratio * r.dy;
		return rect;
	};
	this.utils = utils;
})();
