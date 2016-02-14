// dataList
// treeRoot
// treeNodeList

sigtree.dataProcessor = function() {
    var DataProcessor = {};

    var result = {};
    DataProcessor.result = result;

    var index = 0;

    DataProcessor.loadData = function(filePath) {
        var dtd = new $.Deferred();
        d3.csv(filePath, function(data){
            result.dataList = changeAttr(data);
            result.treeRoot = treefy(result.dataList);
            dtd.resolve();
        });     
        return dtd;
    }

    DataProcessor.getResult = function() {
        return result;
    }

    function treefy(dts){
        var nested = d3.nest()
            .key(function(d){
                return d.atm
            })
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
                if(d[0]) {
                    return {
                        "flow": d[0].flowSize,
                        "data": d[0]
                    }
                }
            })
            .entries(dts);
        root = {key:"root", values:nested};
        translate(root, "");
        sumUp(root, "flow");
        sumUp(root, "allChilldrenCount");
        return root;
    }

    function changeAttr(dts){
        var arr = [];
        var id = 0; 
        var dupMap = {};  //用于去重
        dts.forEach(function(raw){
            raw.atm = raw["SPE号"];
            delete raw["SPE号"];
            raw.aal = raw["适配层/百分比例"];
            delete raw["适配层/百分比例"];
            raw.vpi = raw["VPI/VCI"];
            delete raw["VPI/VCI"];
            var reg = /(\d{4}:\s*[0-9A-F]{4});[^0-9]*(\d+)/;
            if(reg.test(raw.vpi)){
                raw.cid = RegExp.$2;
                raw.vpi = RegExp.$1;                
            }
            reg = /(AAL\d)/
            if(reg.test(raw.aal)){
                raw.aal = RegExp.$1;
            } else
                raw.aal = null;
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

            raw.index = raw.atm + "-" + raw.aal + "-" + raw.vpi + "-" + raw.cid;
            var dupID = raw.atm + "-" + raw.aal + "-" + raw.vpi + "-" + raw.cid + "-" + raw.percent;
            if (dupMap[dupID] == true)
                return;
            dupMap[dupID] = true;
            if(!f){
                // raw.percent = raw.percent.replace(/数量:/,"").replace(/字节/,"").trim();
                raw.flowSize = +raw.percent.split(", ")[0].replace("数量：","").replace("字节","").trim();
                arr.push(raw);
            }
        });
        return arr;
    }

    function sumUp(root, field) {
        var node = root;
        if (!Array.isArray(root.values))
            return;
        for (var i = 0; i < root.values.length; i++) {
            sumUp(root.values[i], field);
        }
        var sum = 0;
        for (var i = 0; i < root.values.length; i++) {
            sum += root.values[i][field];
        }
        // if (field == "allChilldrenCount")
            // console.log(root.id, sum);
        root[field] = sum;
    }

    function translate(obj, prefix){
        obj.id = prefix + "-" + obj.key;
        obj.index = prefix + "-" + obj.key;

        obj.id = DataProcessor.cleanID(obj.id);

        obj.children = obj.values;

        if(!(obj.values instanceof Array)){
            obj.data = obj.values.data;
            obj.allChilldrenCount = 1;
            obj.values = obj.values.flow;
            obj.flow = obj.values;
            return;
        }
        if(obj.values.length == 1 && obj.values[0].key === "undefined"){
            obj.values = obj.values[0].values;
            obj.isLeaf = true;
        }
        else{
            obj.values.forEach(function(d) {
                translate(d, prefix + "-" + obj.key)
            });
        }

    }

    function copyAttrs(source, target) {
        for (var key in source) {
            target[key] = source[key];
        }
    }

    DataProcessor.mergeTwoListAsTree = function(nodeList1, nodeList2) {
        var list1 = nodeList1, list2 = nodeList2;
        // console.log(list1, list2);
        var idHashmap = {};
        for (var i = 0; i < list1.length; i++) {
            var node = list1[i];
            idHashmap[node.index] = {obj1: node};
        }
        for (var i = 0; i < list2.length; i++) {
            var node = list2[i];
            if (idHashmap[node.index] != null) {
                idHashmap[node.index].obj2 = node;
            }
            else {
                idHashmap[node.index] = {obj2: node};
            }

        }

        var nodes = [];
        // console.log("idHashmap", idHashmap)
        for (var id in idHashmap) {
            var node = idHashmap[id];
            // console.log(node.obj1 != null, node.obj2 != null)
            if (node.obj1 != null)
                copyAttrs(node.obj1, node);
            else
                copyAttrs(node.obj2, node);
            // console.log(node)
            nodes.push(node);
        }
        // console.log("before merge", nodes)

        return treefy(nodes);
    }

    DataProcessor.cleanID = function(id) {
        id = id.replace(new RegExp(/\s|\(|\)/g),'')
        id = id.replace(new RegExp(/:/g),'_')        
        return id;
    }

    return DataProcessor;    
}