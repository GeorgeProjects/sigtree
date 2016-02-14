sigtree.combinator = function(){
	var key= sigtree_combinatorKey,
	compare = sigtree_combinatorCompare,
	combine_by_index = sigtree_combinatorCombineByIndex;
	by_index = false;

	// lst1 and lst2 are both array;
	function combinator(lst1, lst2){
		//
		console.log("combinator", console.trace());
		console.log("lst1", lst1);
		console.log("lst2", lst2);
		var children = [];

		lst1.sort(compare);
		lst2.sort(compare);
		console.log("after sort lst1", lst1);
		console.log("after sort lst2", lst2);		
		var p1 = 0, p2 = 0;
		while(p1 < lst1.length || p2 < lst2.length){
			var o1 = lst1[p1], o2 = lst2[p2];
			if(!o1 && !o2){
				p1++;p2++;
				continue;
			}
			if(o1 && !o2){
				children.push({obj1:o1});
				p1++;
				continue;
			}
			if(!o1 && o2){
				children.push({obj2:o2});
				p2++;
				continue;
			}
			var c = compare(o1,o2,p1,p2);
			if(!c){
				children.push({obj1:o1, obj2:o2});
				p1++;p2++;
			}
			else if(c < 0){
				children.push({obj1:o1});
				p1 ++;
			}
			else{
				children.push({obj2:o2});
				p2++;
			}
		}
		console.log("children", children);
		return children;
	}
	// interfaces
	combinator.by_index = function(b){
		by_index = b;
		return combinator;
	};
	combinator.key = function(x){
		if(!arguments.length) return key;
		key = x;
		return combinator;
	};
	combinator.compare = function(x){
		if(!arguments.length) return compare;
		compare = x;
		return combinator; 
	};
	// return closure
	return combinator;
};

function sigtree_combinatorKey(d){
	return d.key;
}
// used to judge whether two node are equal
function sigtree_combinatorCompare(d1, d2, p1, p2){
	return +p1 - +p2;
}

function sigtree_combinatorCombineByIndex(lst1, lst2){
	console.log("sigtree_combinatorCombineByIndex");
	var lst = [];
	var len = lst1.length < lst2.length? lst1.length:lst2.length;
	for(var i = 0; i < len; i++){
		lst.push({obj1:lst1[i], obj2:lst2[i]});
	}
	if(lst1.length > lst2.length){
		lst1.slice(len).forEach(function(obj){
			lst.push({obj1:obj});
		});
	}
	else{
		lst2.slice(len).forEach(function(obj){
			lst.push({obj2:obj});
		});
	}
	return lst;
}


sigtree.merge_tree = function(combinator){
	function merge(node){
		// console.log("merge", console.trace());
		function hasChild(obj){
			return obj && Array.isArray(obj.values) && obj.values.length;
		}
		var o1 = node.obj1,
		o2 = node.obj2;
		if(o1 && o2 && !hasChild(o1) && !hasChild(o2)){
			//node.children = [{obj1:o1},{obj2:o2}];
			return;
		}
		if(o1 && o2 && hasChild(o1) && !hasChild(o2)){
			node.children = o1.values.map(function(d){
				return {obj1:o1};
			});
			node.children.forEach(merge);
			node.children.push({obj2:o2, partial:true});
		}
		if(o1 && o2 && !hasChild(o1) && hasChild(o2)){
			node.children = o2.values.map(function(d){
				return {obj2:o2};
			});
			node.children.forEach(merge);
			node.children.push({obj1:o1, partial:true});
		}
		if(hasChild(o1) && hasChild(o2)){
			node.children =  combinator(o1.values, o2.values);
			node.children.forEach(merge);
			return;
		}
		if(!o1){
			if(hasChild(o2)){
				node.children = o2.values.map(function(d){
					return {obj2:d};
				});
				node.children.forEach(merge);
			}
			else{
				node.children = [{obj2:o2}];
			}
			return;
		}
		if(!o2){
			if(hasChild(o1)){
				node.children = o1.values.map(function(d){
					return {obj1:d};
				});
				node.children.forEach(merge);
			}
			else{
				node.children = [{obj1:o1}];
			}
			return;
		}
	}
	return merge;
};
