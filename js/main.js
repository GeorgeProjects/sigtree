// dataCenter:
//     stats: 各个数据文件的统计
//     datasets: [   //各个数据集
//         id: 
//         processor:         
//     ]
    

(function() {
    this.dataCenter = {};

})()

var mainController = function(){
    var treeSelectView, radialView, treeCompareView, parsetView;
    var datasetID = [];
    function loadStatData() {
        var dtd = $.Deferred();
        d3.json("stat.json", function(error, data){
            if (error) {
                dtd.reject();
                throw error;
            }
            else {
                dataCenter.stats = data;
            }
            dtd.resolve();
        });
        return dtd.promise();
    }

    function initInteractionHandler() {
        ObserverManager.addListener(this);
    }

    this.OMListen = function(message, data) {
        if (message == "changeData") {
            var justChangeDataA = false;
            if (data[1] == datasetID[1])
                justChangeDataA = true;
            datasetID = _.clone(data);
            dataCenter.datasets = [];
            var defers = [];
            for (var i = data.length - 1; i >= 0; i--) {
                var id = data[i];
                var processor = new sigtree.dataProcessor();
                var dataset = {
                    id: id,
                    processor: processor
                }
                dataCenter.datasets.push(dataset)
                var file = dataCenter.stats[id].file;
                file = "data/" + file;
                defers.push(dataset.processor.loadData(file));
            }


            $.when(defers[0], defers[1])
                .done(function() {
                    if (justChangeDataA == false) {
                        $("svg[class=radial]").html("");
                        $("svg[class=parset]").html("");
                        $("#treemap").html("");

                        var listeners = _.without(ObserverManager.getListeners(), radialView, treeCompareView, parsetView); //remove old views in listeners
                        ObserverManager.setListeners(listeners);

                        
                        radialView = radial();   

                        //start of change
                        //treeCompareView = treeCompare();     
                        //parsetView = parset();    
                        //end of change




                    } else {
                        $("#treemap").html(""); 
                        var listeners = _.without(ObserverManager.getListeners(), treeCompareView); //remove old views in listeners
                       
                        //start of change
                        //treeCompareView = treeCompare();
                        //end of change

                    }

                })
        }

    }

    initInteractionHandler();
    $.when(loadStatData())
        .done(function() {
            treeSelectView = treeSelect();         
        })

}

$(document).ready(function() {
    mainController();
})


