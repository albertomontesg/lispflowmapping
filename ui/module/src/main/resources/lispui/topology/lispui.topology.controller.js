define(['app/lispui/lispui.module', 
    'app/lispui/lispui.services', 
    'app/lispui/topology/dest/js/next'], function(lispui) {

    lispui.register.controller('TopologyLispuiCtrl', ['$scope', 'LispuiTopologySvc',
        function ($scope, LispuiTopologySvc) {

            $scope.iids = [];
            $scope.selectedIID = null;
            $scope.maximumIIDvalue = 4294967295;

            // nx.define('MyNodeTooltip', nx.ui.Component, {
            //     properties: {
            //         node: {},
            //         topology: {}
            //     },
            //     view: {
            //         content: [{
            //             tag: 'h1',
            //             content: '{#node.id}'
            //         }, {
            //             tag: 'p',
            //             content: [{
            //                 tag: 'label',
            //                 content: 'Address'
            //             }, {
            //                 tag: 'span',
            //                 content: '{#node.address}'
            //             }]
            //         }]
            //     }
            // });

            var app = new nx.ui.Application();
            app.container(document.getElementById('lispui-topology-view'));
            var topology = new nx.graphic.Topology({
                // set the topology view's with and height
                width: 800,
                height: 600,
                // node config
                nodeConfig: {
                    // label display name from of node's model, could change to 'model.id' to show id
                    label: 'model.name'
                },
                // link config
                linkConfig: {
                    // multiple link type is curve, could change to 'parallel' to use parallel link
                    linkType: 'curve'
                },
                nodeSetConfig: {
                    label: 'model.name',
                    iconType: 'model.iconType'
                },
                // tooltipManagerConfig: {
                //     nodeTooltipContentClass: 'MyNodeTooltip'
                // },
                // show node's icon, could change to false to show dot
                showIcon: true,
                autoLayout: true,
                dataProcessor: 'force',
                enableSmartLabel: false,
                enableGradualScaling: false,
                supportMultipleLink: false
            });
            topology.attach(app);
            topology.data(null);
            console.log('started');

            // The iid input is a number and must be converted to a string which is the format it is stored at the database
            loadTopology = function (iid) {
                LispuiTopologySvc.getTopologyData(iid.toString()).then(function (data) {
                    console.log('TopologyData:', data);
                    topology.data(data);
                })
            }
            $scope.loadTopology = loadTopology;

            LispuiTopologySvc.getIID().then(function (iids) {
                $scope.iids = iids;
                $scope.selectedIID = $scope.iids[0];
                if (iids.length > 0)
                    loadTopology($scope.selectedIID);
                console.log('iids:', $scope.iids);
            })


        }
    ]);
});