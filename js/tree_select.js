var treeSelect = function(){
	var SelectTree = {};
	ObserverManager.addListener(SelectTree);	
	console.log("Listeners",ObserverManager.getListeners().length);
	var svgWidth = $("#innerTopLeft").width();
	var svgHeight = $("#innerTopLeft").height() * 19/20;
	var compareArray = [0, 1];
	var statData = dataCenter.stats;
	var propotionArray = [];
	var timeSortArray = []
	var dataList = timeSortArray;
	var sortMode = "time";
	var svg = d3.select("#innerTopLeft")
		.append("svg")
		.attr("id", "mainTimeline")
		.attr("width", svgWidth)
		.attr("height", svgHeight);
	var tip = d3.tip()
		.attr('class', 'd3-tip')
		.offset([-10, 0])
		.html(function(d, i) {
			var time = d.time;
			var aTime = time.replace("XX.csv","");
			var aValue = d.value;
		return "<span style='font-size:12px;'>date:" + aTime +"  values:" + aValue +"</span>";
		});
	var hisWidth = 0;
	var changeA = true;
	svg.call(tip);
	processStatData();
	drawHistogram(timeSortArray)
	var chart;

	var scrollWidth = $("#srocllDiv").width();
	var topWrapperWidth = $("#topWrapper").width();
	var widthPercentage = Math.round(scrollWidth * 2 / topWrapperWidth * 100);
	// $("#innerTopRight").css("width", widthPercentage+"%");  
	// $("#innerTopLeft").css("width", (100 - widthPercentage)+"%");  
	//document.getElementById('srocllDiv').style.height = svgHeight * 2/3 + "px";
	// click on sort buttons
	$("#innerTopLeft .sort-btn").click(function() {
		$("#innerTopLeft .sort-btn").removeClass("active");
		$(this).addClass("active");
		sortMode = $(this).attr("sort-type");
		if (sortMode == "time") {
			drawHistogram(timeSortArray);
		} else if (sortMode == "size") {
			drawHistogram(propotionArray);
		}
	});
	$("#innerTopLeft .data-btn").click(function() {
		var command = $(this).attr("data-type");
		if (command == "switch") {
			if(changeA){
				changeA = false;
			}else{
				changeA = true;
			}
		}
		if (sortMode == "time") {
			drawHistogram(timeSortArray);
		} else if (sortMode == "size") {
			drawHistogram(propotionArray);
		}
	});
	var viewWidth = +(d3.select("#srocllDiv").style("width").replace("px",""));
	var fontSize = Math.round(viewWidth / 18);
	$("#innerTopRight").css("font-size", 12 + "px");  
	function processStatData() {
		for (var i = 0; i < statData.length; i++) {
		 	timeSortArray[i] = new Object();
		 	timeSortArray[i].value = + statData[i].sumProportion;
		 	timeSortArray[i].time = statData[i].file.replace("XX.csv","");
		 	timeSortArray[i].index = i;
		 	timeSortArray[i].position = i;

		 	propotionArray[i] = new Object();
		 	propotionArray[i].value =+ statData[i].sumProportion;
		 	propotionArray[i].time = statData[i].file.replace("XX.csv","");
		 	propotionArray[i].index = i;		 	

		}
	 	propotionArray.sort(function(a, b) {
	 		return a.value - b.value;
	 	})

	 	for (var i = 0; i < propotionArray.length; i++) {
	 		propotionArray[i].position = i;
	 	}
	}

	function drawHistogram(dataArray){
		svg.selectAll("*").remove();
	 	var margin = {top: 10, right: 40, bottom: 30, left: 40},
    		width = svgWidth - margin.left - margin.right,
    		height = svgHeight - margin.top - margin.bottom;
		chart = svg.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
				.attr("id","append-rect");
		var maxNum = _.max(dataArray, function(d) {return d.value}).value;
		// var minNum = _.min(dataArray, function(d) {return d.value}).value;
		var minNum = 0;
		// draw x-axis
		var xAxisScale = d3.scale.identity()
			.range([0, width]);

		var xAxis = d3.svg.axis()
			.scale(xAxisScale)
			.orient("bottom")
			.ticks(0)
			
		var xAxisGroup = chart.append("g")
		   .attr("class","x axis")
		   .attr("transform","translate(" + 0 + "," + height + ")")
		   .call(xAxis)

		xAxisGroup.append("text")
		   .attr("class","label")
		   .attr("x",width)
		   .attr("y",15)
		   .style("text-anchor","end")
		   .text("Date");
		// draw y-axis
		var yAxisMin = 0;
		var yAxisMax = Math.round(Math.log(1899375543148));
		var yAxisScale = d3.scale.linear()
			.domain([yAxisMax, yAxisMin])
			.range([0, height]);
		var yAxisTicks = [];
		yAxisTicks[0] = 0;
		for(var i = 1; ; i = i + 1){
			yAxisTicks[i] = yAxisTicks[i-1] + 2;
			if(yAxisTicks[i] > yAxisMax - 2){
				break;
			}
		}
		var yAxis = d3.svg.axis()
			.scale(yAxisScale)
			.orient("left")
			.tickValues(yAxisTicks);
		chart.append("g")
			.attr("class","y axis")
			.call(yAxis)
			.append("text")
			.attr("transform","rotate(-90)")
			//.attr("transform","translate(" + -10 + "," + 0 + ")")
			.attr("class","label")
			.attr("x",10)
			.attr("y",-25)
			.style("text-anchor","end")
			.text("log(Number\n(bytes))");

		//draw chart bars
		var xScale = d3.scale.linear()
					.domain([0, dataArray.length])
					.range([0, width]);
		var yScale = d3.scale.linear()
					.domain([0, Math.log(maxNum)])
					.range([height, 0]);

		hisWidth = xScale(1) - 1;

	 	chart.selectAll(".bar")
	 		.data(dataArray)
	 		.enter()
	 		.append("rect")
	 		.attr("id",function(d, i){
				return "his-" + d.index;
			})
			.attr("index", function(d, i) {
				return d.index;
			})
			.attr("class", function(d, i) {
				var className = "bar";
				var selectIndex = compareArray.indexOf(d.index);
				if(changeA){
					if (selectIndex == 1){
						className += " previous";
					}
					else if (selectIndex == 0){
						className += " current";
					}
				}else{
					if (selectIndex == 0){
						className += " change-previous";
					}
					else if (selectIndex == 1){
						className += " change-current";
					}
				}
				return className;
			})
			.attr("width", function() {
				return xScale(1) - 1;
			})
			.attr("height",function(d,i){
				return height - yScale(Math.log(d.value)) - 1;
			})
			.attr("x",function(d){ 
				return xScale(d.position) + 1;
			})
			.attr("y",function(d){
				return yScale(Math.log(d.value));
			})
			.on("mouseover",tip.show)
			.on("mouseout",tip.hide)
			.on('click',function(d,i){
				var selectedID = +d.index;
				if (compareArray.indexOf(selectedID) < 0){
					//compareArray[0] = compareArray[1];
					if(changeA){
						compareArray[1] = selectedID; 
					}else{
						compareArray[0] = selectedID; 
					}
				} 
				else {
					var index = compareArray.indexOf(selectId);
					compareArray.splice(index,1);
				}
				changeComparedData();
				d3.select("#append-rect").select("#percen-rect").remove();
			});

		// draw x-axis ticks
		if (sortMode == "time") {
			var xBegin = 0;
			for (var i = 0; i < dataArray.length; i++) {
				if (dataArray[i].time.substring(0, 4) != xBegin) {
					xBegin = dataArray[i].time.substring(0, 4);
					xAxisGroup.append("text")
						.attr("class", "tick-label")
						.attr("y", 15)
						.attr("x", chart.select("#his-" + i).attr("x"))
						.text(xBegin);
					
				}
			}			
		}
		changeComparedData();
		function changeComparedData() {
			chart.selectAll(".previous").classed("previous", false);
			chart.selectAll(".current").classed("current", false);
			chart.selectAll(".change-previous").classed("change-previous", false);
			chart.selectAll(".change-current").classed("change-current", false);
			if(changeA){
				chart.select("#his-" + compareArray[0]).classed("previous", true);
				chart.select("#his-" + compareArray[1]).classed("current", true);
			}else{
				chart.select("#his-" + compareArray[0]).classed("change-previous", true);
				chart.select("#his-" + compareArray[1]).classed("change-current", true);
			}
			
			chart.selectAll(".labelAB").remove();

			for(var l = 0; l < compareArray.length; l++){
				var id = compareArray[l];
				var x = chart.select("#his-" + id).attr("x");
				var y = chart.select("#his-" + id).attr("y") - 3;
				chart
					.append("text")
					.attr("class","labelAB")
					.attr("x", x)
					.attr("y", y)
					.text(function() {
						return l == 0 ? "B" : "A";
					});
			}

			$("#innerTopRight #label-A .date_description").html(function() {
				if (compareArray.length > 0) 
					var timeArray = dataList[compareArray[1]].time.split("-");
					return timeArray[0];
				return "";
			});
			$("#innerTopRight #label-B .date_description").html(function() {
				if (compareArray.length > 1) 
					var timeArray = dataList[compareArray[0]].time.split("-");
					return timeArray[0];
				return "";
			});

			$("#innerTopRight #label-A .value_description").text(function() {
				if (compareArray.length > 0)  
					return  d3.format(".3s")(dataList[compareArray[1]].value) + "bytes" ;
				return "";
			});
			$("#innerTopRight #label-B .value_description").text(function() {
				if (compareArray.length > 1) 
					return d3.format(".3s")(dataList[compareArray[0]].value) + "bytes";
				return "";
			});
			ObserverManager.post("changeData", compareArray);
		}


	}

	function changePercentage(percentage){
		var rectX = + chart.select("#his-" + compareArray[1]).attr("x");
		var rectY = + chart.select("#his-" + compareArray[1]).attr("y");
		var rectWidth = + chart.select("#his-" + compareArray[1]).attr("width");
		var rectHeight = + chart.select("#his-" + compareArray[1]).attr("height");
		var newY = rectY + rectHeight * (1 - percentage);
		d3.select("#append-rect").select("#percen-rect").remove();
		d3.select("#append-rect")
		.append("rect")
		.attr("id","percen-rect")
		.attr("x",rectX)
		.attr("y",(newY))
		.attr("height",rectHeight * percentage)
		.attr("width",hisWidth)
		// .attr("fill","#b2df8a");
		.classed("highlight", true);
	}
	changeLabelC("-", 0, 0, 0, 0);
	function changeLabelC(dataset, nodeID, levelText, flowLevel, treeNodeNum, sumNodeNum){
		$("#innerTopRight #label-C #node-type").text(dataset)
		$("#innerTopRight #label-C #node-type").removeClass("background-A");
		$("#innerTopRight #label-C #node-type").removeClass("background-B");
		$("#innerTopRight #label-C #node-type").addClass("background-" + dataset);

		$("#innerTopRight #label-C #node-description").html(nodeID);
		$("#innerTopRight #label-C #level-description").html(levelText);
		$("#innerTopRight #label-C #flow-description").text(flowLevel);
		$("#innerTopRight #label-C #tree-num-description").text(treeNodeNum);
		$("#innerTopRight #label-C #sum-num-description").text(sumNodeNum);
	}
	SelectTree.OMListen = function(message, data) {
	    if (message == "percentage") {
			changePercentage(data);
	    }
	    if (message == "show-detail-info") {
	    	var dataset = data.dataset;
	    	var node = data.node;
	    	var nodeID = node.key;
	    	var levelText = node.id.split("-").length-1;
	    	var flowLevel = node.flow;
	    	var treeNodeNum = Array.isArray(node.values) ? node.values.length : 0;
	    	var sumNodeNum = node.allChilldrenCount;
	    	changeLabelC(dataset, nodeID, levelText, flowLevel, treeNodeNum, sumNodeNum)

	    }
    }
	return SelectTree;
}