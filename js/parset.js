var parset = function(){

	var Parset = {};
	ObserverManager.addListener(Parset);	

	var dataProcessor = dataCenter.datasets[0].processor;
	var dataset = dataCenter.datasets[0].processor.result;

	var width = $("#leftBottomWrapper").width();
	var height = $("#leftBottomWrapper").height();

	function setSvgAttr(svg, width, height){
	  svg.attr("width", (width - 20) + "px")
	  	.attr("height", (height - 20) + "px")
	  	.attr("style", "transform: translate(8px,10px)");

	}
	var svg = d3.select("svg.parset")

	setSvgAttr(svg,width,height)

	var chart = d3.parsets()
			.dimensions(["root", "atm", "aal", "vpi", "cid"])
			.value(function(d){
				var strs = d.percent.split(",");
				if (strs.length == 0)
					return 0;
				var value = strs[0].replace("数量：", "").replace("字节", "");
				value = +value;
				return value;
			})
			.width(width - 20)
			.height(height-20)
			.mouseoverCallback(mouseoverCallback)
			.mouseoutCallback(mouseoutCallback)

			// .attr("width", chart.width())
			// .attr("height", chart.height());

	var data = [];
	var dt = dataset.dataList;
	
	dt.forEach(function(d){
		d.root = "root";
		if(d.tcp){
			d.cid = d.tcp;
			delete d.tcp;
		}
		else if(d.udp){
			d.cid = d.udp;
			delete d.udp;
		}
		else if(d.icmp){
			d.cid = d.icmp;
			delete d.icmp;
		}
		else if(d.other){
			d.cid = d.other;
			delete d.other;
		}
		if(!d.cid){
			d.cid = "none";
		}
		data.push(d);
		// if(!d.atm || !d.aal || !d.vpi || !d.cid){
		// 	// console.log("error", d)
		// } else {
		// 	data.push(d);
		// }
	});
		
	svg.datum(data).call(chart);

	function mouseoverCallback(data) {
		ObserverManager.post("mouse-over", [data.id])
	}

	function mouseoutCallback(data) {
		ObserverManager.post("mouse-out", [data.id])
	}	

    Parset.OMListen = function(message, data) {
		var idPrefix = "#parset-ribbon-";
		if (message == "highlight") {
			svg.selectAll(".highlight").classed("highlight", false);
			for (var i = 0; i < data.length; i++) {
				svg.selectAll("#parset-ribbon-" + data[i]).classed("highlight", true);

				// var node = svg.select("#parset-ribbon-" + data[i]);
				// while (node.size() > 0) {
				// 	var parentID = idPrefix + svg.select("#parset-ribbon-" + data[i]).attr("parent");
				// 	node = svg.select(parentID);
				// 	console.log(node.size(), parentID);
				// 	if (node.size() == 0)
				// 		break;
				// 	node.classed("highlight", true);
				// }
			}
		}
        if (message == "mouse-over") {
			for (var i = 0; i < data.length; i++) {
				svg.selectAll("#parset-ribbon-" + data[i]).classed("focus-highlight", true);
				svg.selectAll("#parset-mouse-" + data[i]).classed("focus-highlight", true);
				
			}
        }
        if (message == "mouse-out") {
			for (var i = 0; i < data.length; i++) {
				svg.selectAll("#parset-ribbon-" + data[i]).classed("focus-highlight", false);
				svg.selectAll("#parset-mouse-" + data[i]).classed("focus-highlight", false);
			}        	
        }
    }	

	return Parset;
	
};