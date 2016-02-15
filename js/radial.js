var shown_depth=4;

var radial = function(){
	var svg = d3.select("svg.radial")
		.attr("id","radial")
		.attr("width", 13002)
		.attr("height", 627);	

	var Radial = {};
	ObserverManager.addListener(Radial);

	var dataProcessor = dataCenter.datasets[0].processor;
	var dataset = dataCenter.datasets[0].processor.result;

	console.log("dataset",dataset)

	//注意：JS中函数参数传递不是按引用传的
	//函数内部如果直接给传入的对象赋值，效果是对内部的拷贝赋值；如果修改传入的对象的成员，那么修改能够影响到传入的对象

	//用树结构存储公共树
	var target_root={
		//因为mark=0有特殊含义，所以输入的树的标号不能取0
		mark:0,//mark为0表示这个结点至少在两棵树中出现，mark不为0时，用于标记这个结点出现过的那棵树
		_depth:0,//结点所在的深度，在数据转换时d3的预处理函数已经用过depth了，所以这里要用_depth防止被覆盖
		name:"root",
		description:"root",
		//_children在下面自己会生成
		children:new Array(),//最底层结点没有children这个维度
		//size:...//只有最底层的结点有size：...
		//如果用sunburst的layout，上层的size会自己算出来，否则需要手动算才有
		_father: undefined
	}

	//用数组存储公共树
	var linear_tree=[];

	merge_preprocess_rawdata(dataset.dataList,target_root,1);

	console.log(target_root);

	//把traverse和需要使用的局部静态变量包起来
	function linearlize(root,target_linear_tree)
	{
		//traverse递归中要保持的static变量
		var cur_index=0;
		//传入树根和用于存储线性化的树的数组
		//traverse中按深度优先进行线性化以及标记每个结点的linear_index
		function traverse(root,target_linear_tree)
		{
			if (typeof(root)=="undefined")
				return;

			root.linear_index=cur_index;//记录每个结点在数组中的index
			target_linear_tree[cur_index]=root;

			if (typeof(root.children)=="undefined")
				return;

			var cur_root_children_num=root.children.length;
			for (var i=0;i<cur_root_children_num;++i)
			{
				cur_index=cur_index+1;
				traverse(root.children[i],target_linear_tree);
			}
		}

		traverse(target_root,linear_tree);
	}
	linearlize(target_root,linear_tree);

	cal_trees_colors(linear_tree,1);

	console.log(target_root);

	draw_barcoded_tree(linear_tree,1,100);

	//将data合并到init_root中
	//如果init_root不是空树，merge的过程就是在做两棵树的合并
	//curtreeindex表示当前合并的树的编号
	function merge_preprocess_rawdata(data,init_root,curtreeindex){
		//第一步检查SPE
		for (var i=0;i<data.length;++i)//循环一遍所有数据，建完所有SPE层节点再看下面的节点
		{
			//不是有效数据的暂时丢掉
			if (data[i]["ATM数据"]=="有效数据")
			{
				//传的是地址而不是内容
				//所以修改cur_SPE_group时init_root.children也会变
				var cur_SPE_group=init_root.children;//当前考虑的那组SPE
				var flag_new_SPE=1;

				var cur_SPE=data[i].atm;
				//var cur_SPE=data[i]["SPE号"];

				for (var j=0;j<cur_SPE_group.length;++j)//检查一遍当前已经创建出来的SPE层节点
				{
					if (cur_SPE_group[j].name==data[i].atm)//如果已经创建过了，那么就不是新的了
					//if (cur_SPE_group[j].name==data[i]["SPE号"])//如果已经创建过了，那么就不是新的了
					{
						//如果是对其他树调用merge时创建过的SPE，那么这个SPE至少在两棵树里面出现过的	
						if (cur_SPE_group[j].mark !=curtreeindex)
						{
							cur_SPE_group[j].mark=0;
						}
						
						flag_new_SPE=0;
						break;
					}
				}
						
				//原来没有创建过的SPE号
				if (flag_new_SPE==1)
				{
					var new_SPE_group_length=cur_SPE_group.length+1;

					cur_SPE_group[new_SPE_group_length-1]={
						mark:curtreeindex,
						_depth:1,
						name:cur_SPE,
						description:cur_SPE,
						children:new Array(),//最底层结点没有children这个维度
						//只有最底层的结点有size
						_father:init_root
					}
				}
			}
		}
		
			
			
		//第二步检查AAL
		for (var i=0;i<data.length;++i)//对于每个数据
		{
			//不是有效数据的暂时丢掉
			if (data[i]["ATM数据"]=="有效数据")
			{
				var cur_SPE=data[i].atm;
				//var cur_SPE=data[i]["SPE号"];
				var cur_AAL=data[i].aal;//可能为AAL1/AAL2/AAL5
				//var cur_AAL=data[i]["适配层/百分比例"].substr(0,4);//可能为AAL1/AAL2/AAL5
				
				//循环寻找当前的SPE在树中位置
				for (var j=0;j<init_root.children.length;++j)
				{
					if (init_root.children[j].name==cur_SPE)
					{
						//当前的SPE在树中的位置
						var cur_SPE_position=init_root.children[j];
					}
				}

				var cur_AAL_group=cur_SPE_position.children;
				//当前的SPE的children数
				var cur_AAL_group_length=cur_AAL_group.length;
					
				var flag_new_AAL=1;
				var cur_AAL_index=0;//这个AAL在当前的SPE中的下标位置
				var cur_AAL_position;//当前的AAL在树中的位置

				//循环寻找当前的AAL在树中位置
				for (var j=0;j<cur_AAL_group_length;++j)
				{
					if (cur_AAL_group[j].name==cur_AAL)
					{
						cur_AAL_index=j;
						cur_AAL_position=cur_AAL_group[j];
						flag_new_AAL=0;

						if (cur_AAL_position.mark !=curtreeindex)
						{
							cur_AAL_position.mark=0;
						}
						break;
					}
				}

				//原来没有创建过的AAL
				if (flag_new_AAL==1)
				{
					var new_length_AAL=cur_AAL_group_length+1;
						
					cur_AAL_group[new_length_AAL-1]={
						mark:curtreeindex,
						_depth:2,
						name:cur_AAL,
						description:cur_AAL,
						children:new Array(),//最底层结点没有children这个维度
						//只有最底层的结点有size
						_father:cur_SPE_position
					}
					cur_AAL_index=new_length_AAL-1;
					cur_AAL_position=cur_AAL_group[new_length_AAL-1];
				}
					
					
				//第三步检查VPI_VCI，创建VPI
				var cur_VPI=data[i].vpi;
				//var cur_VPI=data[i]["VPI/VCI"].substr(0,10);
				var cur_VPI_group=cur_AAL_position.children;
				//当前AAL的children数
				var cur_VPI_group_length=cur_VPI_group.length;
					
				var flag_new_VPI=1;
				var cur_VPI_index=0;//这个VPI在当前的AAL中的下标位置
				var cur_VPI_position;//当前的VPI在树中的位置

				for (var j=0;j<cur_VPI_group_length;++j)
				{
					if (cur_VPI_group[j].name==cur_VPI)
					{
						cur_VPI_index=j;
						cur_VPI_position=cur_VPI_group[j];
						flag_new_VPI=0;

						if (cur_VPI_group[j].mark !=curtreeindex)
						{
							cur_VPI_group[j].mark=0;
						}
						break;
					}
				}

					
				//原来没有创建过的VPI
				if (flag_new_VPI==1)
				{
					var new_length_VPI=cur_VPI_group_length+1;

					cur_VPI_group[new_length_VPI-1]={
						mark:curtreeindex,
						//depth:3,
						_depth:3,
						name:cur_VPI,
						description:cur_VPI,
						children:new Array(),//最底层结点没有children这个维度
						//只有最底层的结点有size：...

						_father:cur_AAL_position
					}
					cur_VPI_index=new_length_VPI-1;
					cur_VPI_position=cur_VPI_group[new_length_VPI-1];
				}
					
					
				//第四步检查VPI_VCI，创建cid
				var cur_CID=data[i].cid;
				//var cur_CID=data[i]["VPI/VCI"].substr(19,2);

				//需要检查是否是undefined，因为data数组中有的元素不存在cid分量
				if (cur_CID=="" || typeof(cur_CID)=="undefined")//检查是否有cid
				{
					cur_CID="none";
				}

				var cur_CID_group=cur_VPI_position.children;
				//当前VPI的children分量的length
				var cur_CID_group_length=cur_CID_group.length;
					
				var flag_new_CID=1;
				var cur_CID_index=0;//这个CID在当前的VPI中的下标位置
				var cur_CID_position;//当前的CID在树中的位置

				for (var j=0;j<cur_CID_group_length;++j)
				{
					if (cur_CID_group[j].name==cur_CID)
					{
						cur_CID_index=j;
						cur_CID_position=cur_CID_group[j];
							
						flag_new_CID=0;

						//原来在别的树的这个结点创建过的CID						
						if (cur_CID_group[j].mark !=curtreeindex)
						{
							var new_length_CID=cur_CID_group_length;
							
							cur_CID_group[j].mark=0;

							var cur_CID_numvalue=+data[i].flowSize;
							//var cur_CID_numvalue=data[i]["比例"];
							//cur_CID_numvalue=cur_CID_numvalue.substring(cur_CID_numvalue.indexOf('：')+1, cur_CID_numvalue.indexOf('字'));
							//cur_CID_numvalue=+cur_CID_numvalue;

							cur_CID_group[j].trees_values[curtreeindex]=cur_CID_numvalue;

							//size统计该节点在所有树上的值的总和
							cur_CID_group[j].size=0;
							for (var k=0;k<cur_CID_group[j].trees_values.length;++k)
							{
								if (typeof(cur_CID_group[j].trees_values[k])!="undefined")
								{
									cur_CID_group[j].size=(+cur_CID_group[j].size)+(+cur_CID_group[j].trees_values[k]);
								}
							}
						}					
						break;
					}
				}

				//原来没有创建过的CID
				if (flag_new_CID==1)
				{
					var new_length_CID=cur_CID_group_length+1;

					var cur_CID_numvalue=+data[i].flowSize;
					//var cur_CID_numvalue=data[i]["比例"];
					//cur_CID_numvalue=cur_CID_numvalue.substring(cur_CID_numvalue.indexOf('：')+1, cur_CID_numvalue.indexOf('字'));
					//cur_CID_numvalue=+cur_CID_numvalue;
						
					cur_CID_group[new_length_CID-1]={
						mark:curtreeindex,
						_depth:4,
						name:cur_CID,
						description:cur_CID,
						//children:new Array(),//最底层的CID层结点没有children这个维度
						//size统计该节点在所有树上的值的总和
						size:cur_CID_numvalue,//只有最底层的CID层结点有size：...

						_father:cur_VPI_position
					}
					cur_CID_group[new_length_CID-1].trees_values=[];
					cur_CID_group[new_length_CID-1].trees_values[curtreeindex]=cur_CID_numvalue;
					
					cur_CID_index=new_length_CID-1;
					cur_CID_position=cur_VPI_group[new_length_CID-1];
				}			
			}
		}
			
		aggregate_separate_tree_value(init_root);

		
	}

	//在并集树只有cid层的结点记录了每个结点在每个tree上的val的情况下，向上导出所有节点的在每个tree上的val的情况
	//并且给每个结点记录上其route
	function aggregate_separate_tree_value(init_root)
	{
		//cur_node_layer0是人为添加的结点
		var cur_node_layer0=init_root;

		//记录所有的tree在该结点处的值
		var layer0_trees_values=[];

		for (var i=0;i<cur_node_layer0.children.length;++i)
		{
			//cur_node_layer1是一个SPE层节点
			var cur_node_layer1=cur_node_layer0.children[i];
			cur_node_layer1.route="route"+String(i);

			//记录所有的tree在该结点处的值
			var layer1_trees_values=[];

			for (var j=0;j<cur_node_layer1.children.length;++j)
			{
				//cur_node_layer2是一个AAL层节点
				var cur_node_layer2=cur_node_layer1.children[j];
				cur_node_layer2.route="route"+String(i)+"_"+String(j);

				//记录所有的tree在该结点处的值
				var layer2_trees_values=[];
				
				for (var k=0;k<cur_node_layer2.children.length;++k)
				{
					//cur_node_layer3是一个VPI层节点
					var cur_node_layer3=cur_node_layer2.children[k];
					cur_node_layer3.route="route"+String(i)+"_"+String(j)+"_"+String(k);

					//记录所有的tree在该结点处的值
					var layer3_trees_values=[];

					for (var l=0;l<cur_node_layer3.children.length;++l)
					{
						//cur_node_layer4是一个CID层节点
						//CID层是叶子层
						var cur_node_layer4=cur_node_layer3.children[l];
						cur_node_layer4.route="route"+String(i)+"_"+String(j)+"_"+String(k)+"_"+String(l);

						//对每个被合并的树提供的值进行循环
						//cur_node_layer4.trees_values.length是被合并的树的数量上限
						for (var m=0;m<cur_node_layer4.trees_values.length;++m)//往上层聚集
						{
							//如果原来累计过
							if (isInt(layer3_trees_values[m]))
								layer3_trees_values[m]=layer3_trees_values[m]+cur_node_layer4.trees_values[m];
							else//没有累计过
								layer3_trees_values[m]=cur_node_layer4.trees_values[m];
						}
					}


					cur_node_layer3.trees_values=[];//先开数组之后才能对数组元素赋值
					//cur_node_layer4.trees_values.length是被合并的树的数量上限
					for (var m=0;m<cur_node_layer4.trees_values.length;++m)
					{
						cur_node_layer3.trees_values[m]=layer3_trees_values[m];
						if (! isInt(cur_node_layer3.trees_values[m]))
						{
							cur_node_layer3.trees_values[m]=0;
						}
					}
					for (var m=0;m<cur_node_layer3.trees_values.length;++m)
					{
						if (isInt(layer2_trees_values[m]))
							layer2_trees_values[m]=layer2_trees_values[m]+cur_node_layer3.trees_values[m];
						else
							layer2_trees_values[m]=cur_node_layer3.trees_values[m];
					}
					
				}


				cur_node_layer2.trees_values=[];//先开数组之后才能对数组元素赋值
				//cur_node_layer3.trees_values.length也是被合并的树的数量上限
				for (var m=0;m<cur_node_layer3.trees_values.length;++m)
				{
					cur_node_layer2.trees_values[m]=layer2_trees_values[m];
					if (! isInt(cur_node_layer2.trees_values[m]))
					{
						cur_node_layer2.trees_values[m]=0;
					}
				}
				for (var m=0;m<cur_node_layer2.trees_values.length;++m)
				{
					if (isInt(layer1_trees_values[m]))
						layer1_trees_values[m]=layer1_trees_values[m]+cur_node_layer2.trees_values[m];
					else
						layer1_trees_values[m]=cur_node_layer2.trees_values[m];
				}
			}


			cur_node_layer1.trees_values=[];//先开数组之后才能对数组元素赋值
			//cur_node_layer2.trees_values.length也是被合并的树的数量上限
			for (var m=0;m<cur_node_layer2.trees_values.length;++m)
			{
				cur_node_layer1.trees_values[m]=layer1_trees_values[m];
				if (! isInt(cur_node_layer1.trees_values[m]))
				{
					cur_node_layer1.trees_values[m]=0;
				}
			}
			for (var m=0;m<cur_node_layer1.trees_values.length;++m)
			{
				if (isInt(layer0_trees_values[m]))
					layer0_trees_values[m]=layer0_trees_values[m]+cur_node_layer1.trees_values[m];
				else
					layer0_trees_values[m]=cur_node_layer1.trees_values[m];
			}
		}


		cur_node_layer0.trees_values=[];//先开数组之后才能对数组元素赋值
		//cur_node_layer1.trees_values.length也是被合并的树的数量上限
		for (var m=0;m<cur_node_layer1.trees_values.length;++m)
		{
			cur_node_layer0.trees_values[m]=layer0_trees_values[m];
			if (! isInt(cur_node_layer0.trees_values[m]))
			{
				cur_node_layer0.trees_values[m]=0;
			}
		}
		
	}

	//输入线性化以后的树，以及需要计算所有节点对应颜色的那棵树的编号后，计算所有节点的颜色
	function cal_trees_colors(linear_tree,cur_tree_index)
	{
		//结点的亮度映射
		//用于给不存在的结点赋的，能使得这个结点看不见的，最最高的亮度
		var luminance_max=0;
		var luminance = d3.scale.sqrt()//linear()//.sqrt()//配色的亮度
						    .domain([0, 1])//定义域
						    .clamp(true)
						    .range([luminance_max, 0]);//值域


		for (var i=0;i<linear_tree.length;++i)//对于线性化的并集树中每个元素循环
		{
			var cur_element=linear_tree[i];

			//如果原来这棵树没有这个结点，那么补出一个none
			if (typeof(cur_element.trees_values[cur_tree_index])=="undefined")
			{
				cur_element.trees_values[cur_tree_index]="none";
			}
			
			var cur_element_value=cur_element.trees_values[cur_tree_index];
			if (cur_element_value=="none")//none对应数值0
				cur_element_value=0;
			

			//计算在cur_tree_index对应的树中，当前结点应有的亮度
			if (cur_element._depth==0)//对于根节点，直接赋予luminance(1)
			{
				var cur_color_lum=luminance(1);
			}
			else//非根节点
			{
				//如果原来这棵树没有这个结点的父节点（即这个结点和其父都不在这棵树出现），那么补出一个none
				if (typeof(cur_element._father.trees_values[cur_tree_index])=="undefined")
				{
					cur_element._father.trees_values[cur_tree_index]="none";
				}

				var cur_element_father_value=cur_element._father.trees_values[cur_tree_index];
				if (cur_element_father_value=="none")//none对应数值0
					cur_element_father_value=0;

				//用一个结点的数值除以其父的数值来决定其亮度，由此能够比较一个结点与其兄弟之间的数值
				//相对数值越大的结点，传入luminance的值越大，映射出的值越小，画出来的颜色越深
				//当相对数值趋向0时，结点变为无色
				if (cur_element_father_value!=0)
					var cur_color_lum=luminance(cur_element_value/cur_element_father_value);
				else
					var cur_color_lum=luminance_max;//如果father_value等于0，意味着这个点的父不在这棵树中出现，这个点本身也不在这棵树出现，那么这样的点应该为无色，所以赋最高的luminance

				//console.log(cur_element_value,cur_element_father_value,cur_color_lum)
			}


			//基础颜色是steelblue
			var cur_index_default_color="black";
			var cur_element_cur_index_default_color=d3.lab(cur_index_default_color)

			//console.log(cur_color_lum)
			cur_element_cur_index_default_color.l=cur_color_lum;

			if (typeof(cur_element.trees_default_colors)=="undefined")//原来没有开过数组的话要撑开来
			{
				cur_element.trees_default_colors=[];
			}
			//记录当前元素的默认color
			cur_element.trees_default_colors[cur_tree_index]=cur_element_cur_index_default_color;
		}
	}


	//判断一个数字或者字符串里面有没有数字以外的值
	function isInt(str){
		var reg = /^(-|\+)?\d+$/ ;
		return reg.test(str);
	}

	var g;
	//给定合并后的并集树linear_tree，当前要画的树的编号cur_tree_index，要画的高度位置cur_biasy
	function draw_barcoded_tree(linear_tree,cur_tree_index,cur_biasy)
	{
		d3.select("svg.radial").select("g").remove();
		g=svg.append("g");

		var tooltip = d3.select("body")
					    .append("div")
					    .attr("class", "tooltip")
					    .style("position", "absolute")
					    .style("z-index", "10")
					    .style("opacity", 0);
					    

		//记录每个条带的横坐标
		//linear_tree和mem_biasx_byindex的同一下标对应的是相同的元素的属性
		var mem_biasx_byindex=[];

		//并集树中含有的结点总数
		var linear_tree_length=linear_tree.length;

		//控制每个柱的横向位置
		var cur_biasx=100;

		var acc_depth_node_num=[];//记录各个深度的结点数
		for (var i=0;i<=4;++i)
			acc_depth_node_num[i]=0;

		//先画条码
		for (var i=0;i<linear_tree_length;++i)//对于线性化的并集树中每个元素循环
		{
			mem_biasx_byindex[i]=cur_biasx;

			var cur_element=linear_tree[i];

			//记录cur_element._depth深度的结点发现一个
			acc_depth_node_num[cur_element._depth]=acc_depth_node_num[cur_element._depth]+1;

			if (cur_element._depth > shown_depth)
				continue;
			
			if (+cur_element._depth==0)
				var cur_width=24;
			else if (+cur_element._depth==1)
				var cur_width=18;
			else if (+cur_element._depth==2)
				var cur_width=12;
			else if (+cur_element._depth==3)
				var cur_width=6;
			else if (+cur_element._depth==4)
				var cur_width=2;
			
			//相邻两个条之间的间隔
			//使用固定的周期间隔
			//var cur_biasx=25*i+100;

			//给定一个结点cur_this,修改其children；自身；父；兄弟，的颜色
			//若option="defualt"，使用对应节点的原始颜色；否则使用传入的配色

			function color_transfer(cur_this,children_color,this_color,father_color,sibling_color,option)
			{
				var this_id=cur_this.id;

				//获取当前mouseover的元素在并集数组中的下标
				var index_str_start_pos=+this_id.indexOf("linear_index_")+"linear_index_".length;
				var index_str_end_pos=+this_id.indexOf("_tree_depth_");
				//当前mouseover的元素在数组中的下标
				var this_linear_index=+this_id.substring(index_str_start_pos,index_str_end_pos);
					
				//当前mouseover的结点对应的原始的树中结点
				var cur_element=linear_tree[this_linear_index];

				//获取当前mouseover的元素是对应哪一棵树
				var tree_index_str_start_pos=+this_id.indexOf("_tree_index_")+"_tree_index_".length;
				//按照id中最后一个信息就是tree_index的约定，整个字符串的结尾就是index的结尾
				var tree_index_str_end_pos=+this_id.length;
				//当前mouseover的元素是对应哪一棵树
				var this_tree_index=+this_id.substring(tree_index_str_start_pos,tree_index_str_end_pos);
	
				//1.修改所有子节点颜色
				var cur_element_depth=cur_element._depth;
				var cur_element_children_group=cur_element.children;
				if (typeof(cur_element_children_group)!="undefined")
				{
					for (var i=0;i<cur_element_children_group.length;++i)
					{
						var cur_child=cur_element_children_group[i];
						//注意：rect本身没有边框

						if (option =="default")
						{
							d3.selectAll("#"+	"linear_index_"+cur_child.linear_index+
												"_tree_depth_"+cur_child._depth+
												"_tree_index_"+this_tree_index)

								//在body上直接append的rect只能通过style控制
								//在svg上append的rect只能通过attr控制
								.attr("fill",function(d,i){  
									//d就是cur_child
							        return d.trees_default_colors[this_tree_index];  
							    }) 
							    //.style("background",cur_child.trees_default_colors[this_tree_index]);

						}
						else
						{
							d3.selectAll("#"+	"linear_index_"+cur_child.linear_index+
												"_tree_depth_"+cur_child._depth+
												"_tree_index_"+this_tree_index)

								.attr("fill",function(d,i){  
									//d就是cur_child
							        return children_color;  
							    }) 
								//.style("background",children_color);
						}
					}
				}

				

				//2.修改自己颜色
				if (option =="default")
				{
					d3.selectAll("#"+this_id)

						.attr("fill",function(d,i){  
							
							return d.trees_default_colors[this_tree_index];  
						}) 
						//.style("background",cur_element.trees_default_colors[this_tree_index]);
				}
				else
				{
					d3.selectAll("#"+this_id)

						.attr("fill",function(d,i){  
							
							return this_color;  
						}) 
						//.style("background",this_color);
				}

				//3.修改父颜色
				var cur_element_father=cur_element._father;
				if (typeof(cur_element_father)!="undefined")
				{
					if (option =="default")
					{
						d3.selectAll("#"+	"linear_index_"+cur_element_father.linear_index+
											"_tree_depth_"+cur_element_father._depth+
											"_tree_index_"+this_tree_index)

							.attr("fill",function(d,i){  
								
								return d.trees_default_colors[this_tree_index];  
							}) 
							//.style("background",cur_element_father.trees_default_colors[this_tree_index]);	
					}
					else
					{
						d3.selectAll("#"+	"linear_index_"+cur_element_father.linear_index+
											"_tree_depth_"+cur_element_father._depth+
											"_tree_index_"+this_tree_index)

							.attr("fill",function(d,i){  
								
								return father_color;  
							}) 
							//.style("background",father_color);	
					}
				}

				//4.修改兄弟颜色
				if (typeof(cur_element_father)!="undefined")
				{
					var cur_element_siblings_group=cur_element_father.children;
					for (var i=0;i<cur_element_siblings_group.length;++i)
					{
						var cur_sibling=cur_element_siblings_group[i];
							
						var cur_sibling_id=	"linear_index_"+cur_sibling.linear_index+
											"_tree_depth_"+cur_sibling._depth+
											"_tree_index_"+this_tree_index;
						if (cur_sibling_id!=this_id)
						{
							if (option =="default")
							{
								d3.selectAll("#"+	"linear_index_"+cur_sibling.linear_index+
													"_tree_depth_"+cur_sibling._depth+
													"_tree_index_"+this_tree_index)

									.attr("fill",function(d,i){  
								
										return d.trees_default_colors[this_tree_index];  
									}) 
									//.style("background",cur_sibling.trees_default_colors[this_tree_index]);		
							}
							else
							{
								d3.selectAll("#"+	"linear_index_"+cur_sibling.linear_index+
													"_tree_depth_"+cur_sibling._depth+
													"_tree_index_"+this_tree_index)

									.attr("fill",function(d,i){  
									
										return sibling_color;  
									}) 
									//.style("background",sibling_color);
							}
						}
					} 
				}	
			}
			
			var rect_attribute_button={
				width:cur_width,
				height:50,
				biasx:cur_biasx,
				biasy:cur_biasy,
				background_color:cur_element.trees_default_colors[cur_tree_index],
				mouseover_function:function(d){//当鼠标移动到结点上时
					//console.log(this);//this是mouseover的那个rect
					//console.log(d);//d是绑定的数据

					function format_description(d)
					{

						return  '<b>' + d.name + '</b></br>'+ 
										d.description + '</b></br>'+
								"cur_tree:"+cur_tree_index + "</b></br>"+
								"cur_treeval:"+d.trees_values[cur_tree_index] + 
								"(量级："+Math.floor(Math.log10(d.trees_values[cur_tree_index]))+")"+ "</b></br>"+
								"father_cur_treeval:" + (typeof(d._father)!="undefined" ? 
															d._father.trees_values[cur_tree_index] : 
															"father doesn't exist");
					}

					
					//tooltip.html(format_description(d))
					//		.style("left", (d3.event.pageX) + "px")
					//		.style("top", (d3.event.pageY + 20) + "px")
					//		.style("opacity",1.0);


					//高亮，黄色高亮孩子；橙色高亮自己；红色高亮父；棕色高亮兄弟
					//黄色太亮，换成土黄色
					color_transfer(this,"#CCCC00"/*"yellow"*/,"orange","red","brown","transfer");		
							
				},
				mouseout_function:function(cur_this)
				{
					//颜色退回
					color_transfer(cur_this,"","","","","default");
				},
				cur_id:("linear_index_"+i+"_tree_depth_"+cur_element._depth+"_tree_index_"+cur_tree_index),
				cur_data:cur_element
			};			
			creat_button(rect_attribute_button);

			//每两个柱之间间隔1px
			var interval=1;
			
			cur_biasx=cur_biasx+cur_width+interval;
		}

		//再画上面连接的弦
		
		for (var i=linear_tree_length-1;i>=0;--i)
		{
			var cur_element=linear_tree[i];

			if (cur_element._depth > shown_depth)
				continue;

			var cur_element_father=cur_element._father;
			if (typeof(cur_element_father)=="undefined")
			{
				continue;
			}

			//start of draw arc
			//console.log(cur_element);
			if (cur_element_father._depth==0)
				var coord_jump_height=40;//弧的高度
			else if (cur_element_father._depth==1)
				var coord_jump_height=30;//弧的高度
			else if (cur_element_father._depth==2)
				var coord_jump_height=20;//弧的高度
			else if (cur_element_father._depth==3)
				var coord_jump_height=10;//弧的高度
			else
				var coord_jump_height=5;//弧的高度


			var y_coord=cur_biasy;
			var start_x_coord=mem_biasx_byindex[cur_element_father.linear_index];
			var end_x_coord=mem_biasx_byindex[cur_element.linear_index];
			var curve_path = 	"M" + start_x_coord + "," + y_coord + 
								"T" + (start_x_coord+end_x_coord)/2 + ","+ (y_coord-coord_jump_height) + 
								"T" + end_x_coord + ","+ y_coord;
			var curve = g.append("path")
						 .attr("d",curve_path)
						 .attr("fill","black")
						 //.attr("fill-opacity",1)//fill的内容的透明度
						 .attr("fill-opacity",0)//fill的内容的透明度
						 .attr("stroke","red")
						 .attr("stroke-width",1);
			//end of draw arc
		}
		

		draw_text_description();
		//给出text标注每个深度的结点分别有多少个
		function draw_text_description()
		{

			var str = 	"L0 node number:"+acc_depth_node_num[0]+"，" +
						"L1 node number:"+acc_depth_node_num[1]+"，" +
						"L2 node number:"+acc_depth_node_num[2]+"，" +
						"L3 node number:"+acc_depth_node_num[3]+"，" +
						"L4 node number:"+acc_depth_node_num[4];			
				
			var text = g.append("text")
							.attr("x",30)
							.attr("y",100)
							.attr("font-size",20)
							.attr("font-family","simsun")
							.attr("position","absolute")
					.attr("transform",function(d,i){  
					        return "translate(" + (100) + "," + (100) + ")";  
					    }) 
						;
							
			var strs = str.split("，") ;
			
			console.log(strs);
								
			text.selectAll("tspan")
					.data(strs)
					.enter()
					.append("tspan")
					.attr("x",text.attr("x"))
					.attr("dy","1em")
					.text(function(d){
						return d;
					})
					;
		}

	}



		

	function creat_button(rect_attribute_button){
		var width = rect_attribute_button.width;  //画布的宽度
		var height = rect_attribute_button.height;   //画布的高度
		var biasx=rect_attribute_button.biasx;
		var biasy=rect_attribute_button.biasy;
		var background_color=rect_attribute_button.background_color;
		var mouseover_function=rect_attribute_button.mouseover_function;
		var mouseout_function=rect_attribute_button.mouseout_function;
		var mouseclick_function=rect_attribute_button.mouseclick_function;
		var shown_string=rect_attribute_button.button_string;
		var font_color=rect_attribute_button.font_color;
		var font_size=rect_attribute_button.font_size;
		var cur_id=rect_attribute_button.cur_id;
		var cur_class=rect_attribute_button.cur_class;
		var cur_data=rect_attribute_button.cur_data;
 
 		var tooltip=d3.selectAll("#tooltip");

		

		g.append("rect")
					.datum(cur_data)//绑定数据以后，后面的function才能接到d，否则只能接到this
					
					.on("mouseover",mouseover_function)
					.on("click",mouseclick_function)

					.on("mouseout",function(){
						if (typeof(mouseout_function)!="undefined")
							mouseout_function(this);
						tooltip.style("opacity",0.0);
					})
					.on("mousemove",function(){
						// 鼠标移动时，更改样式 left 和 top 来改变提示框的位置 
						tooltip.style("left", (d3.event.pageX) + "px")
							.style("top", (d3.event.pageY + 20) + "px");
					})
					.attr("class","rect_button")
					.attr("id",cur_id)
					
					.attr("style",
								"width:"+width+"px;"+
								"height:"+height+"px;"+
								"color:"+font_color+";"+
								"font-size:"+font_size
								)
					.attr("transform",function(d,i){  
				        return "translate(" + (biasx) + "," + (biasy) + ")";  
				    }) 
				    .attr("fill",function(d,i){  
				        return background_color;  
				    }) 

				    
					;


	}


/*
	var padding = 10;
	var width = $("#leftTopWrapper").width() - padding * 5;
	var height = $("#leftTopWrapper").height() - padding * 2;
	var diameter = d3.min([width,height]) + 5 * padding;
	var move_x = height + width * 0.1;
	var eachTypeIdArray = new Array();
	var eachTypeIndexArray = new Array();
	var errorChange = 10;
	var moveHeight = height - 4 * padding;
	var duration = 750;

	var root = dataset.treeRoot;
	var tree = d3.layout.tree()
		.size([360, diameter / 2 - 40])
		.children(function(d){
			if(Array.isArray(d.values)) return d.values;
			return undefined;
		})
		.separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });
	var treeNodeList = tree.nodes(root).reverse();
	var index = 0;
	// treeNodeList.reverse().forEach(function(d) { d.id = index++; })
	
	
	var diagonal = d3.svg.diagonal.radial()
		.projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });
	var svg = d3.select("svg.radial")
		.attr("id","radial");	
	var histogramView = svg.append("g")
		.attr("id","histogramView")
		.attr("transform","translate(" + (move_x * 1.1) + ","+ errorChange +")");

	var margin = 60;
	var lineWidth = width - height - margin;
	var lineHeight = height;
	var StatNum = 6;
	var countArray = new Array();
	var objArray = new Array();
	var lineX = d3.scale.linear();
	var lineY = d3.scale.linear()
		.range([moveHeight ,0]);
	var yAxisTicks = new Array();
	var xAxisTicks = new Array();
	var yAxisNum = 6;
	var changScale = 10000000;
	var clickColor = "blue";
	var brush = d3.svg.brush();
	var AllArray = new Array();
	var AllIndexArray = new Array();
	var timeData;
	var tip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d,i) {
	    return "<span style='font-size:12px;'>"  + d.key + "</span>";
	  });
	 var his_width = 0;
	 var dataSizeArray = new Array();
	 var originalDataSizeArray = new Array();
	 var timeDataSum = 0;
	 changeHis();
*/
	$("#default").attr("checked",true);
	$("#radial-depth-controller").on("click", ".level-btn", function(){

		// $("#radial-depth-controller .level-btn").removeClass("active");
		var dep = $(this).attr("level");

		shown_depth=dep;
		

		$("#radial-depth-controller .level-btn").removeClass("active");		
		
		for (var i = 0; i <= dep; i++)
			$("#radial-depth-controller .level-btn[level=" + i + "]").addClass("active");


		draw_barcoded_tree(linear_tree,1,100);

		/*
		// $(this).addClass("active");
		draw_depth(dep);
		*/
	});
/*
	// draw the histogram of the distribution
	function changeHis(){
		var multi = 4;
		for(var countIndex = 0;countIndex<countArray.length;countIndex++){
			countArray[countIndex] = 0;
		}
		timeData = _.filter(treeNodeList, function(d) {
			return !Array.isArray(d.values);
		});
		for(var i=0;i<timeData.length;i++){
			var eachData = + timeData[i].values;
			timeDataSum = timeDataSum + eachData;
		}
		// console.log("timeData",timeData);
		var count = 0;
		var sumCount = 0;
		var ddata = treeNodeList;
		for(var i = 0; i < timeData.length; i++){
			var d = timeData[i];
			dataSizeArray[i] = + d.values;
			originalDataSizeArray[i] = + d.values;
			if(dataSizeArray[i] != 0){
				dataSizeArray[i] = Math.round(Math.log(dataSizeArray[i]) * multi);
			}
		}
		// console.log("originalDataSizeArray",originalDataSizeArray);
		var maxLogData = d3.max(dataSizeArray);
		for(var i=0;i<=maxLogData;i++){
			countArray[i] = 0;
			eachTypeIdArray[i] = new Array();
			eachTypeIndexArray[i] = new Array();
		}
		for(var i=0;i<dataSizeArray.length;i++){
			countArray[dataSizeArray[i]]++;
			eachTypeIdArray[dataSizeArray[i]].push(timeData[i].id);
			eachTypeIndexArray[dataSizeArray[i]].push(i);
		}
		var sumNode = 0;
		for(var i=0;i<countArray.length;i++){
			sumNode = sumNode + countArray[i];
		}
		for(var i=0;i<countArray.length;i++){
			if(countArray[i] != 0 ){
				countArray[i] = Math.log(countArray[i] + 1);
			}
		}
		lineX.range([0,width - move_x * 1.2]);
		lineX.domain([0,(d3.max(dataSizeArray) + 1)/multi]);
		var xAxis = d3.svg.axis()
		.scale(lineX)
		.orient("bottom");
		brush.x(lineX)
			.on("brushend",brushed);

		for(var i=0;i<(d3.max(dataSizeArray)+1)/multi;i=i+1){
			xAxisTicks.push(i);
		}
		his_width = (width - 1.2 * move_x)/(d3.max(dataSizeArray) + 1);
		xAxis.tickValues(xAxisTicks);
		lineY.domain(d3.extent(countArray));
		for(var i=0;i<countArray.length;i++){
			objArray[i] = new Object();
			objArray[i].num = i;
			objArray[i].count = countArray[i];
		}
		var yAxis = d3.svg.axis()
			.scale(lineY)
			.orient("left");
		var line = d3.svg.line()
			.x(function(d){return (lineX(d.num));})
			.y(function(d){return (lineY(d.count));})

		d3.select("#histogramView")
			.selectAll(".his")
			.data(objArray)
			.enter()
			.append("rect")
			.attr("id",function(d,i){
				return "his" + i; 
			})
			.attr("class","his")
			.attr("width",his_width - 2)
			.attr("height",function(d,i){
				return moveHeight - lineY(objArray[i].count);
			})
			.attr("x",function(d,i){
				return his_width * i;
			})
			.attr("y",function(d,i){
				return lineY(objArray[i].count); 
			})
			.attr("fill","#1F77B4");
		d3.select("#histogramView")
		.append("g")
		.attr("class","y axis")
		.attr("transform","translate(" + 0 + ","+ 0 +")")
		.call(yAxis)
		.append("text")
		.attr("transform","rotate(-90)")
		.attr("class","label")
		.attr("x",5)
		.attr("y",16)
		.style("text-anchor","end")
		.text("log(Number)");

		d3.select("#histogramView")
		.append("g")
		.attr("class","x axis")
		.attr("transform","translate(" + 0 + ","+ (moveHeight) +")")
		.call(xAxis)
		.append("text")
		.attr("class","label")
		.attr("x",width - move_x * 1.2 + 30)
		.attr("y",14)
		.style("text-anchor","end")
		.text("log(bytes)");

		d3.select("#histogramView")
		.append("g")
		.attr("class","x brush")
		.call(brush)
		.selectAll("rect")
		.attr("y",0)
		.attr("height",moveHeight);
	}

	function setSvgAttr(svg,width,height){
	  	svg.attr("width", width + "px");
	  	svg.attr("height", height + "px");
	  	svg.style("transform", "translate(" + padding + "px," + padding + "px)");
	}
	setSvgAttr(svg,width,height)

	// svg = svg.append("g")

	if(!svg){
		svg = d3.select("body").append("svg");
	}
	// svg.attr("width", diameter)
	// 	.attr("height", diameter - 40)
	svg = svg.append("g")
		.attr("transform", "translate(" + diameter / 2 + "," + (diameter / 2 - 3 * padding) + ")");

	svg.call(tip);

	update(root);

	function update(source){
		var nodes = treeNodeList;
			links = tree.links(nodes);
		var treeNodeNum = 0;
		for(var i=0;i<treeNodeList.length;i++){
			if(treeNodeList[i].depth==4){
				treeNodeNum++;
			}
		}
		var node = svg.selectAll(".node")
			.data(nodes, function(d) {return d.id});
		var max_depth = 0;
		var nodeEnter = node.enter().append("g")
			.attr("class", "node")
			.attr("fill","#CCC29C")
			.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
			.attr("id", function(d) {
				return "radial-node-" + d.id;
			})
			.on("click",click)
			.on("mouseover", function(d) {
				ObserverManager.post("mouse-over", [d.id]);
				tip.html(function() {
					var text = d.key;
					if (Array.isArray(d.values))
						text += "<br>子节点数:" +  d.values.length;
					text += "<br>流量:" + d.flow
					return text;
				})
				.show();
			})
			.on("mouseout", function(d) {
				ObserverManager.post("mouse-out", [d.id]);
				tip.hide()
			});

		nodeEnter.append("circle")
			.attr("r", function(d,i){
				if(((d.values)&&(!Array.isArray(d.values)))||
					((d._values)&&(!Array.isArray(d._values)))){
					return 1;
				}
				return (4.5 - d.depth) * 2;
			});

		var nodeUpdate = node.transition().duration(duration)
						.attr("transform",function(d){
							return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
						});

		node.exit()
			.transition().duration(duration)
			.attr("transform",function(d){
				return "rotate(" + (source.x - 90) + ")translate(" + source.y + ")";
			})
			.remove();
		var link = svg.selectAll("path.link")
			.data(links,function(d) { return d.target.id; });

		link.enter().insert("path", "g")
		  .attr("class", "link")
		  .attr("d", diagonal);

		link.transition().duration(duration)
			.attr("class", "link")
			.attr("d", diagonal);

		link.exit().remove();
	}
	function brushed() {
	  var extentX = d3.select(".extent").attr("x");
	  var extentWidth = d3.select(".extent").attr("width");
	    if(extentWidth > his_width/3){
	  	  var beginIndexX = Math.floor(extentX / his_width);
		  var includeNum = Math.round(extentWidth / his_width);
		  // d3.select("#histogramView").selectAll(".his").attr("fill","steelblue");
		  d3.select("#histogramView").selectAll(".his").classed("highlight", false)
		  for(var i=0;i<=includeNum;i++){
		  	// d3.select("#histogramView").select("#his" + (beginIndexX + i)).attr("fill","#b2df8a");
		  	d3.select("#histogramView").select("#his" + (beginIndexX + i)).classed("highlight", true);
		  }
		  AllIndexArray = new Array();
		  AllArray = new Array();
		  for(var i=0;i<=includeNum;i++){
		  	AllIndexArray = AllIndexArray.concat(eachTypeIndexArray[beginIndexX + i]);
		  	AllArray = AllArray.concat(eachTypeIdArray[beginIndexX + i]);
		  }
		  AllArray = _.uniq(AllArray);
		  AllIndexArray = _.uniq(AllIndexArray);
		  var sum = 0;
		  for(var i=0;i<AllIndexArray.length;i++){
		  	if(AllIndexArray[i] < timeData.length){
		  		sum = sum + timeData[AllIndexArray[i]].values;
		  	}
		  }
		  var percentage = sum/timeDataSum;
		  ObserverManager.post("percentage",percentage);
		  console.log("percentage",ObserverManager.getListeners());
		  ObserverManager.post("highlight", _.uniq(AllArray))

		  lineX.domain(brush.empty() ? lineX.domain() : brush.extent());
		}else{
			d3.select("#histogramView").selectAll(".his").classed("highlight", false)
		  	ObserverManager.post("percentage", 0);
			ObserverManager.post("highlight", [])
			lineX.domain(brush.empty() ? lineX.domain() : brush.extent());
		}
	}
	function click(d, i) {
		if (d.values) {
			d._values = d.values;
			d.values = null;
		} else {
			d.values = d._values;
			d._values = null;
		}
		if(d.depth!=4){
			if(d3.select(this).attr("fill")=="#CCC29C"){
				d3.select(this).attr("fill","steelblue");
			}else if(d3.select(this).attr("fill")=="steelblue"){
				d3.select(this).attr("fill","#CCC29C");
			}
		}
		treeNodeList = tree.nodes(root);
		update(d);
	}
	function draw_depth(hide_depth){
		var iterator = 1;
		for(var i=0;i<treeNodeList.length;i++){
			if(treeNodeList[i]._values){
				treeNodeList[i].values = treeNodeList[i]._values;
				treeNodeList[i]._values = null;
			}
		}
		treeNodeList = tree.nodes(root);
		for(var i=0;i<treeNodeList.length;i++){
			if(treeNodeList[i].depth < hide_depth){
				if(treeNodeList[i]._values){
					treeNodeList[i].values = treeNodeList[i]._values;
					treeNodeList[i]._values = null;
				}
			}else{
				if(treeNodeList[i].values){
					treeNodeList[i]._values = treeNodeList[i].values;
					treeNodeList[i].values = null;
				}
			}
		}
		treeNodeList = tree.nodes(root);
		update(treeNodeList);
	}
*/

    Radial.OMListen = function(message, data) {
		var idPrefix = "#radial-node-";
		if (message == "highlight") {
			svg.selectAll(".highlight").classed("highlight", false)
			svg.selectAll(".half-highlight").classed("half-highlight", false)
			for (var i = 0; i < data.length; i++) {
				svg.select(idPrefix + data[i]).classed("highlight", true);
				svg.select(idPrefix + data[i]).each(function(d) {
					if (d == null) return;
					var node = d.parent;
					while (node != null) {
						svg.select(idPrefix + node.id).classed("half-highlight", true);
						node = node.parent;
					}
				})				
			}
		}
        if(message == "mouse-over"){
        	for (var i = 0; i < data.length; i++) {
				svg.select(idPrefix + data[i]).classed("focus-highlight", true);
				if (svg.select(idPrefix + data[i]).data().length > 0) {
					var nodeData = svg.select(idPrefix + data[i]).data()[0];
				}
			}
        }
        if(message == "mouse-out"){
        	for (var i = 0; i < data.length; i++) {
				svg.select(idPrefix + data[i]).classed("focus-highlight", false);
			}
        }
        if(message == "depth"){
        	draw_depth(data);
        }	
    }

    
    return Radial;
}


/*
var radial = function(){


	var Radial = {};
	ObserverManager.addListener(Radial);	
	var dataProcessor = dataCenter.datasets[0].processor;
	var dataset = dataCenter.datasets[0].processor.result;
	var padding = 10;
	var width = $("#leftTopWrapper").width() - padding * 5;
	var height = $("#leftTopWrapper").height() - padding * 2;
	var diameter = d3.min([width,height]) + 5 * padding;
	var move_x = height + width * 0.1;
	var eachTypeIdArray = new Array();
	var eachTypeIndexArray = new Array();
	var errorChange = 10;
	var moveHeight = height - 4 * padding;
	var duration = 750;

	var root = dataset.treeRoot;
	var tree = d3.layout.tree()
		.size([360, diameter / 2 - 40])
		.children(function(d){
			if(Array.isArray(d.values)) return d.values;
			return undefined;
		})
		.separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });
	var treeNodeList = tree.nodes(root).reverse();
	var index = 0;
	// treeNodeList.reverse().forEach(function(d) { d.id = index++; })
	
	

	var diagonal = d3.svg.diagonal.radial()
		.projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });
	var svg = d3.select("svg.radial")
		.attr("id","radial");	
	var histogramView = svg.append("g")
		.attr("id","histogramView")
		.attr("transform","translate(" + (move_x * 1.1) + ","+ errorChange +")");

	var margin = 60;
	var lineWidth = width - height - margin;
	var lineHeight = height;
	var StatNum = 6;
	var countArray = new Array();
	var objArray = new Array();
	var lineX = d3.scale.linear();
	var lineY = d3.scale.linear()
		.range([moveHeight ,0]);
	var yAxisTicks = new Array();
	var xAxisTicks = new Array();
	var yAxisNum = 6;
	var changScale = 10000000;
	var clickColor = "blue";
	var brush = d3.svg.brush();
	var AllArray = new Array();
	var AllIndexArray = new Array();
	var timeData;
	var tip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d,i) {
	    return "<span style='font-size:12px;'>"  + d.key + "</span>";
	  });
	 var his_width = 0;
	 var dataSizeArray = new Array();
	 var originalDataSizeArray = new Array();
	 var timeDataSum = 0;
	 changeHis();
	 $("#default").attr("checked",true);
	 $("#radial-depth-controller").on("click", ".level-btn", function(){
		// $("#radial-depth-controller .level-btn").removeClass("active");
		var dep = $(this).attr("level");
		$("#radial-depth-controller .level-btn").removeClass("active");		
		for (var i = 0; i <= dep; i++)
			$("#radial-depth-controller .level-btn[level=" + i + "]").addClass("active");		
		// $(this).addClass("active");
		draw_depth(dep);
	});
	// draw the histogram of the distribution
	function changeHis(){
		var multi = 4;
		for(var countIndex = 0;countIndex<countArray.length;countIndex++){
			countArray[countIndex] = 0;
		}
		timeData = _.filter(treeNodeList, function(d) {
			return !Array.isArray(d.values);
		});
		for(var i=0;i<timeData.length;i++){
			var eachData = + timeData[i].values;
			timeDataSum = timeDataSum + eachData;
		}
		// console.log("timeData",timeData);
		var count = 0;
		var sumCount = 0;
		var ddata = treeNodeList;
		for(var i = 0; i < timeData.length; i++){
			var d = timeData[i];
			dataSizeArray[i] = + d.values;
			originalDataSizeArray[i] = + d.values;
			if(dataSizeArray[i] != 0){
				dataSizeArray[i] = Math.round(Math.log(dataSizeArray[i]) * multi);
			}
		}
		// console.log("originalDataSizeArray",originalDataSizeArray);
		var maxLogData = d3.max(dataSizeArray);
		for(var i=0;i<=maxLogData;i++){
			countArray[i] = 0;
			eachTypeIdArray[i] = new Array();
			eachTypeIndexArray[i] = new Array();
		}
		for(var i=0;i<dataSizeArray.length;i++){
			countArray[dataSizeArray[i]]++;
			eachTypeIdArray[dataSizeArray[i]].push(timeData[i].id);
			eachTypeIndexArray[dataSizeArray[i]].push(i);
		}
		var sumNode = 0;
		for(var i=0;i<countArray.length;i++){
			sumNode = sumNode + countArray[i];
		}
		for(var i=0;i<countArray.length;i++){
			if(countArray[i] != 0 ){
				countArray[i] = Math.log(countArray[i] + 1);
			}
		}
		lineX.range([0,width - move_x * 1.2]);
		lineX.domain([0,(d3.max(dataSizeArray) + 1)/multi]);
		var xAxis = d3.svg.axis()
		.scale(lineX)
		.orient("bottom");
		brush.x(lineX)
			.on("brushend",brushed);

		for(var i=0;i<(d3.max(dataSizeArray)+1)/multi;i=i+1){
			xAxisTicks.push(i);
		}
		his_width = (width - 1.2 * move_x)/(d3.max(dataSizeArray) + 1);
		xAxis.tickValues(xAxisTicks);
		lineY.domain(d3.extent(countArray));
		for(var i=0;i<countArray.length;i++){
			objArray[i] = new Object();
			objArray[i].num = i;
			objArray[i].count = countArray[i];
		}
		var yAxis = d3.svg.axis()
			.scale(lineY)
			.orient("left");
		var line = d3.svg.line()
			.x(function(d){return (lineX(d.num));})
			.y(function(d){return (lineY(d.count));})

		d3.select("#histogramView")
			.selectAll(".his")
			.data(objArray)
			.enter()
			.append("rect")
			.attr("id",function(d,i){
				return "his" + i; 
			})
			.attr("class","his")
			.attr("width",his_width - 2)
			.attr("height",function(d,i){
				return moveHeight - lineY(objArray[i].count);
			})
			.attr("x",function(d,i){
				return his_width * i;
			})
			.attr("y",function(d,i){
				return lineY(objArray[i].count); 
			})
			.attr("fill","#1F77B4");
		d3.select("#histogramView")
		.append("g")
		.attr("class","y axis")
		.attr("transform","translate(" + 0 + ","+ 0 +")")
		.call(yAxis)
		.append("text")
		.attr("transform","rotate(-90)")
		.attr("class","label")
		.attr("x",5)
		.attr("y",16)
		.style("text-anchor","end")
		.text("log(Number)");

		d3.select("#histogramView")
		.append("g")
		.attr("class","x axis")
		.attr("transform","translate(" + 0 + ","+ (moveHeight) +")")
		.call(xAxis)
		.append("text")
		.attr("class","label")
		.attr("x",width - move_x * 1.2 + 30)
		.attr("y",14)
		.style("text-anchor","end")
		.text("log(bytes)");

		d3.select("#histogramView")
		.append("g")
		.attr("class","x brush")
		.call(brush)
		.selectAll("rect")
		.attr("y",0)
		.attr("height",moveHeight);
	}

	function setSvgAttr(svg,width,height){
	  	svg.attr("width", width + "px");
	  	svg.attr("height", height + "px");
	  	svg.style("transform", "translate(" + padding + "px," + padding + "px)");
	}
	setSvgAttr(svg,width,height)

	// svg = svg.append("g")

	if(!svg){
		svg = d3.select("body").append("svg");
	}
	// svg.attr("width", diameter)
	// 	.attr("height", diameter - 40)
	svg = svg.append("g")
		.attr("transform", "translate(" + diameter / 2 + "," + (diameter / 2 - 3 * padding) + ")");

	svg.call(tip);

	update(root);

	function update(source){
		var nodes = treeNodeList;
			links = tree.links(nodes);
		var treeNodeNum = 0;
		for(var i=0;i<treeNodeList.length;i++){
			if(treeNodeList[i].depth==4){
				treeNodeNum++;
			}
		}
		var node = svg.selectAll(".node")
			.data(nodes, function(d) {return d.id});
		var max_depth = 0;
		var nodeEnter = node.enter().append("g")
			.attr("class", "node")
			.attr("fill","#CCC29C")
			.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
			.attr("id", function(d) {
				return "radial-node-" + d.id;
			})
			.on("click",click)
			.on("mouseover", function(d) {
				ObserverManager.post("mouse-over", [d.id]);
				tip.html(function() {
					var text = d.key;
					if (Array.isArray(d.values))
						text += "<br>子节点数:" +  d.values.length;
					text += "<br>流量:" + d.flow
					return text;
				})
				.show();
			})
			.on("mouseout", function(d) {
				ObserverManager.post("mouse-out", [d.id]);
				tip.hide()
			});

		nodeEnter.append("circle")
			.attr("r", function(d,i){
				if(((d.values)&&(!Array.isArray(d.values)))||
					((d._values)&&(!Array.isArray(d._values)))){
					return 1;
				}
				return (4.5 - d.depth) * 2;
			});

		var nodeUpdate = node.transition().duration(duration)
						.attr("transform",function(d){
							return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
						});

		node.exit()
			.transition().duration(duration)
			.attr("transform",function(d){
				return "rotate(" + (source.x - 90) + ")translate(" + source.y + ")";
			})
			.remove();
		var link = svg.selectAll("path.link")
			.data(links,function(d) { return d.target.id; });

		link.enter().insert("path", "g")
		  .attr("class", "link")
		  .attr("d", diagonal);

		link.transition().duration(duration)
			.attr("class", "link")
			.attr("d", diagonal);

		link.exit().remove();
	}
	function brushed() {
	  var extentX = d3.select(".extent").attr("x");
	  var extentWidth = d3.select(".extent").attr("width");
	    if(extentWidth > his_width/3){
	  	  var beginIndexX = Math.floor(extentX / his_width);
		  var includeNum = Math.round(extentWidth / his_width);
		  // d3.select("#histogramView").selectAll(".his").attr("fill","steelblue");
		  d3.select("#histogramView").selectAll(".his").classed("highlight", false)
		  for(var i=0;i<=includeNum;i++){
		  	// d3.select("#histogramView").select("#his" + (beginIndexX + i)).attr("fill","#b2df8a");
		  	d3.select("#histogramView").select("#his" + (beginIndexX + i)).classed("highlight", true);
		  }
		  AllIndexArray = new Array();
		  AllArray = new Array();
		  for(var i=0;i<=includeNum;i++){
		  	AllIndexArray = AllIndexArray.concat(eachTypeIndexArray[beginIndexX + i]);
		  	AllArray = AllArray.concat(eachTypeIdArray[beginIndexX + i]);
		  }
		  AllArray = _.uniq(AllArray);
		  AllIndexArray = _.uniq(AllIndexArray);
		  var sum = 0;
		  for(var i=0;i<AllIndexArray.length;i++){
		  	if(AllIndexArray[i] < timeData.length){
		  		sum = sum + timeData[AllIndexArray[i]].values;
		  	}
		  }
		  var percentage = sum/timeDataSum;
		  ObserverManager.post("percentage",percentage);
		  console.log("percentage",ObserverManager.getListeners());
		  ObserverManager.post("highlight", _.uniq(AllArray))

		  lineX.domain(brush.empty() ? lineX.domain() : brush.extent());
		}else{
			d3.select("#histogramView").selectAll(".his").classed("highlight", false)
		  	ObserverManager.post("percentage", 0);
			ObserverManager.post("highlight", [])
			lineX.domain(brush.empty() ? lineX.domain() : brush.extent());
		}
	}
	function click(d, i) {
		if (d.values) {
			d._values = d.values;
			d.values = null;
		} else {
			d.values = d._values;
			d._values = null;
		}
		if(d.depth!=4){
			if(d3.select(this).attr("fill")=="#CCC29C"){
				d3.select(this).attr("fill","steelblue");
			}else if(d3.select(this).attr("fill")=="steelblue"){
				d3.select(this).attr("fill","#CCC29C");
			}
		}
		treeNodeList = tree.nodes(root);
		update(d);
	}
	function draw_depth(hide_depth){
		var iterator = 1;
		for(var i=0;i<treeNodeList.length;i++){
			if(treeNodeList[i]._values){
				treeNodeList[i].values = treeNodeList[i]._values;
				treeNodeList[i]._values = null;
			}
		}
		treeNodeList = tree.nodes(root);
		for(var i=0;i<treeNodeList.length;i++){
			if(treeNodeList[i].depth < hide_depth){
				if(treeNodeList[i]._values){
					treeNodeList[i].values = treeNodeList[i]._values;
					treeNodeList[i]._values = null;
				}
			}else{
				if(treeNodeList[i].values){
					treeNodeList[i]._values = treeNodeList[i].values;
					treeNodeList[i].values = null;
				}
			}
		}
		treeNodeList = tree.nodes(root);
		update(treeNodeList);
	}
    Radial.OMListen = function(message, data) {
		var idPrefix = "#radial-node-";
		if (message == "highlight") {
			svg.selectAll(".highlight").classed("highlight", false)
			svg.selectAll(".half-highlight").classed("half-highlight", false)
			for (var i = 0; i < data.length; i++) {
				svg.select(idPrefix + data[i]).classed("highlight", true);
				svg.select(idPrefix + data[i]).each(function(d) {
					if (d == null) return;
					var node = d.parent;
					while (node != null) {
						svg.select(idPrefix + node.id).classed("half-highlight", true);
						node = node.parent;
					}
				})				
			}
		}
        if(message == "mouse-over"){
        	for (var i = 0; i < data.length; i++) {
				svg.select(idPrefix + data[i]).classed("focus-highlight", true);
				if (svg.select(idPrefix + data[i]).data().length > 0) {
					var nodeData = svg.select(idPrefix + data[i]).data()[0];
				}
			}
        }
        if(message == "mouse-out"){
        	for (var i = 0; i < data.length; i++) {
				svg.select(idPrefix + data[i]).classed("focus-highlight", false);
			}
        }
        if(message == "depth"){
        	draw_depth(data);
        }	
    }


    return Radial;
}
*/
